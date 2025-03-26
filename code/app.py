#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import random
import string
import sqlite3
import qrcode
import functools
from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory, abort, session

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Change this to a random secret key

# 默认用户名和密码
DEFAULT_USERNAME = 'admin'
DEFAULT_PASSWORD = 'admin'

# 登录验证装饰器
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return view(**kwargs)
    return wrapped_view

# 管理员验证装饰器
def admin_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if not session.get('logged_in') or session.get('username') != DEFAULT_USERNAME:
            flash('需要管理员权限')
            return redirect(url_for('index'))
        return view(**kwargs)
    return wrapped_view

# Ensure upload and QR code directories exist
try:
    os.makedirs('static/uploads')
except OSError:
    if not os.path.isdir('static/uploads'):
        raise

try:
    os.makedirs('static/qrcodes')
except OSError:
    if not os.path.isdir('static/qrcodes'):
        raise

# Define database path
DB_PATH = 'static/documents.db'

# Database setup
def init_db():
    # SQLite will automatically create the database file if it doesn't exist
    
    # Connect to the database (this will create the file if it doesn't exist)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create the user_groups table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create the documents table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_number TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        extraction_code TEXT NOT NULL,
        group_id INTEGER,
        uploaded_by INTEGER,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES user_groups (id),
        FOREIGN KEY (uploaded_by) REFERENCES users (id)
    )
    ''')
    
    # 创建组合索引，确保同一用户组内文件编号唯一
    cursor.execute('''
    CREATE UNIQUE INDEX IF NOT EXISTS idx_group_file_number 
    ON documents (file_number, group_id)
    WHERE group_id IS NOT NULL
    ''')
    
    # 创建索引，确保没有组的用户上传的文件编号唯一
    cursor.execute('''
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_file_number 
    ON documents (file_number, uploaded_by)
    WHERE group_id IS NULL
    ''')
    
    # Create the users table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        group_id INTEGER,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES user_groups (id)
    )
    ''')
    
    # Check if admin user exists, if not create it
    cursor.execute('SELECT COUNT(*) FROM users WHERE username = ?', (DEFAULT_USERNAME,))
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            'INSERT INTO users (username, password, created_by) VALUES (?, ?, ?)',
            (DEFAULT_USERNAME, DEFAULT_PASSWORD, 'system')
        )
    
    conn.commit()
    conn.close()
    
    print("Database initialized at {}".format(os.path.abspath(DB_PATH)))

# Generate a random 4-digit extraction code
def generate_extraction_code():
    return ''.join(random.choice(string.digits) for _ in range(4))

# 数据库迁移函数
def migrate_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 检查是否需要迁移
    cursor.execute("PRAGMA table_info(documents)")
    columns = cursor.fetchall()
    
    # 检查file_number列是否有UNIQUE约束
    needs_migration = False
    for col in columns:
        if col[1] == 'file_number' and 'UNIQUE' in str(col[5]):
            needs_migration = True
            break
    
    if needs_migration:
        print("正在迁移数据库结构...")
        
        # 创建新表结构
        cursor.execute('''
        CREATE TABLE documents_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_number TEXT NOT NULL,
            filename TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            extraction_code TEXT NOT NULL,
            group_id INTEGER,
            uploaded_by INTEGER,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES user_groups (id),
            FOREIGN KEY (uploaded_by) REFERENCES users (id)
        )
        ''')
        
        # 复制数据
        cursor.execute('''
        INSERT INTO documents_new 
        SELECT id, file_number, filename, original_filename, extraction_code, group_id, uploaded_by, upload_date 
        FROM documents
        ''')
        
        # 删除旧表
        cursor.execute('DROP TABLE documents')
        
        # 重命名新表
        cursor.execute('ALTER TABLE documents_new RENAME TO documents')
        
        # 创建组合索引
        cursor.execute('''
        CREATE UNIQUE INDEX IF NOT EXISTS idx_group_file_number 
        ON documents (file_number, group_id)
        WHERE group_id IS NOT NULL
        ''')
        
        cursor.execute('''
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_file_number 
        ON documents (file_number, uploaded_by)
        WHERE group_id IS NULL
        ''')
        
        conn.commit()
        print("数据库迁移完成")
    
    conn.close()

# Initialize database
init_db()
migrate_db()

# Add a test document if none exist
def add_test_document():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM documents')
    count = cursor.fetchone()[0]
    
    if count == 0:
        # Add a test document
        test_filename = "test_document.pdf"
        filename = "{}_{}".format(random.randint(10000, 99999), test_filename)
        extraction_code = generate_extraction_code()
        file_number = "TEST123"
        
        cursor.execute(
            'INSERT INTO documents (file_number, filename, original_filename, extraction_code) VALUES (?, ?, ?, ?)',
            (file_number, filename, test_filename, extraction_code)
        )
        document_id = cursor.lastrowid
        conn.commit()
        
        # Generate QR code for test document
        generate_qr_code(document_id, filename)
        
        print("Added test document with ID: {}".format(document_id))
    
    conn.close()

# Generate QR code for a document
def generate_qr_code(document_id, filename):
    # Create QR code with the view URL
    try:
        # Try to use request.host_url if in a request context
        view_url = "{}view/{}".format(request.host_url, document_id)
    except RuntimeError:
        # If outside request context (e.g., during startup), use a default URL
        view_url = "http://localhost:5001/view/{}".format(document_id)
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(view_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    qr_path = "static/qrcodes/{}.png".format(filename.split('.')[0])
    img.save(qr_path)
    return qr_path
# 检查用户是否为默认用户
def is_default_user():
    return session.get('username') == DEFAULT_USERNAME

# 获取用户所属的组ID
def get_user_group_id():
    if not session.get('logged_in'):
        return None
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT group_id FROM users WHERE id = ?', (session.get('user_id'),))
    result = cursor.fetchone()
    conn.close()
    
    return result[0] if result else None

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE username = ? AND password = ?', (username, password))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            session['logged_in'] = True
            session['username'] = username
            session['user_id'] = user[0]
            return redirect(url_for('index'))
        else:
            flash('用户名或密码错误')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    session.pop('user_id', None)
    return redirect(url_for('login'))

# 用户组管理路由
@app.route('/groups')
@login_required
def list_groups():
    # 只有默认用户可以查看所有用户组
    if not is_default_user():
        # 非默认用户只能查看自己所属的用户组
        group_id = get_user_group_id()
        if not group_id:
            flash('您没有查看用户组的权限')
            return redirect(url_for('index'))
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM user_groups WHERE id = ?', (group_id,))
        groups = cursor.fetchall()
        
        # 获取组内用户
        cursor.execute('SELECT id, username, created_by, created_at FROM users WHERE group_id = ?', (group_id,))
        users = cursor.fetchall()
        conn.close()
        
        return render_template('group_detail.html', group=groups[0], users=users, is_admin=False)
    
    # 默认用户可以查看所有用户组
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM user_groups ORDER BY created_at DESC')
    groups = cursor.fetchall()
    conn.close()
    
    return render_template('groups.html', groups=groups)

@app.route('/groups/add', methods=['GET', 'POST'])
@login_required
def add_group():
    # 只有默认用户可以添加用户组
    if not is_default_user():
        flash('只有默认用户可以管理用户组')
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        group_name = request.form.get('group_name')
        description = request.form.get('description', '')
        
        if not group_name:
            flash('用户组名称不能为空')
            return redirect(url_for('add_group'))
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 检查用户组名称是否已存在
        cursor.execute('SELECT COUNT(*) FROM user_groups WHERE group_name = ?', (group_name,))
        if cursor.fetchone()[0] > 0:
            conn.close()
            flash('用户组名称已存在')
            return redirect(url_for('add_group'))
        
        try:
            cursor.execute(
                'INSERT INTO user_groups (group_name, description, created_by) VALUES (?, ?, ?)',
                (group_name, description, session.get('username'))
            )
            conn.commit()
            flash('用户组添加成功')
            return redirect(url_for('list_groups'))
        except Exception as e:
            conn.rollback()
            flash('添加用户组失败: {}'.format(str(e)))
        finally:
            conn.close()
    
    return render_template('add_group.html')

@app.route('/groups/delete/<int:group_id>', methods=['POST'])
@login_required
def delete_group(group_id):
    # 只有默认用户可以删除用户组
    if not is_default_user():
        flash('只有默认用户可以管理用户组')
        return redirect(url_for('index'))
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 检查是否有用户属于该组
    cursor.execute('SELECT COUNT(*) FROM users WHERE group_id = ?', (group_id,))
    if cursor.fetchone()[0] > 0:
        conn.close()
        flash('该用户组下还有用户，无法删除')
        return redirect(url_for('list_groups'))
    
    # 检查是否有文档属于该组
    cursor.execute('SELECT COUNT(*) FROM documents WHERE group_id = ?', (group_id,))
    if cursor.fetchone()[0] > 0:
        conn.close()
        flash('该用户组下还有文档，无法删除')
        return redirect(url_for('list_groups'))
    
    try:
        cursor.execute('DELETE FROM user_groups WHERE id = ?', (group_id,))
        conn.commit()
        flash('用户组删除成功')
    except Exception as e:
        conn.rollback()
        flash('删除用户组失败: {}'.format(str(e)))
    finally:
        conn.close()
    
    return redirect(url_for('list_groups'))

@app.route('/groups/<int:group_id>')
@login_required
def view_group(group_id):
    # 检查权限
    if not is_default_user():
        user_group_id = get_user_group_id()
        if user_group_id != group_id:
            flash('您没有查看该用户组的权限')
            return redirect(url_for('index'))
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 获取用户组信息
    cursor.execute('SELECT * FROM user_groups WHERE id = ?', (group_id,))
    group = cursor.fetchone()
    
    if not group:
        conn.close()
        flash('用户组不存在')
        return redirect(url_for('list_groups'))
    
    # 获取组内用户
    cursor.execute('SELECT id, username, created_by, created_at FROM users WHERE group_id = ?', (group_id,))
    users = cursor.fetchall()
    conn.close()
    return render_template('group_detail.html', group=group, users=users, is_admin=is_default_user())

@app.route('/users')
@login_required
def list_users():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 默认用户可以查看所有用户
    if is_default_user():
        cursor.execute('''
            SELECT u.id, u.username, u.created_by, u.created_at, g.group_name 
            FROM users u 
            LEFT JOIN user_groups g ON u.group_id = g.id 
            ORDER BY u.created_at DESC
        ''')
        users = cursor.fetchall()
        conn.close()
        
        return render_template('users.html', users=users, is_admin=True)
    
    # 非默认用户只能查看同组用户
    group_id = get_user_group_id()
    if not group_id:
        conn.close()
        flash('您没有查看用户列表的权限')
        return redirect(url_for('index'))
    
    cursor.execute('''
        SELECT u.id, u.username, u.created_by, u.created_at, g.group_name 
        FROM users u 
        LEFT JOIN user_groups g ON u.group_id = g.id 
        WHERE u.group_id = ? 
        ORDER BY u.created_at DESC
    ''', (group_id,))
    users = cursor.fetchall()
    conn.close()
    
    return render_template('users.html', users=users, is_admin=False)

@app.route('/users/add', methods=['GET', 'POST'])
@login_required
def add_user():
    # 获取可用的用户组
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 默认用户可以查看所有用户组
    if is_default_user():
        cursor.execute('SELECT id, group_name FROM user_groups ORDER BY group_name')
    else:
        # 非默认用户只能查看自己所属的用户组
        group_id = get_user_group_id()
        if not group_id:
            conn.close()
            flash('您没有添加用户的权限')
            return redirect(url_for('index'))
        cursor.execute('SELECT id, group_name FROM user_groups WHERE id = ?', (group_id,))
    
    groups = cursor.fetchall()
    conn.close()
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        group_id = request.form.get('group_id')
        
        # 默认用户可以不选择组，其他用户必须选择组
        if not is_default_user() and not group_id:
            flash('必须选择用户组')
            return render_template('add_user.html', groups=groups)
        
        if not username or not password:
            flash('用户名和密码不能为空')
            return render_template('add_user.html', groups=groups)
        
        # 非默认用户只能添加到自己所属的组
        if not is_default_user():
            user_group_id = get_user_group_id()
            if int(group_id) != user_group_id:
                flash('您只能添加用户到自己所属的用户组')
                return render_template('add_user.html', groups=groups)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 检查用户名是否已存在
        cursor.execute('SELECT COUNT(*) FROM users WHERE username = ?', (username,))
        if cursor.fetchone()[0] > 0:
            conn.close()
            flash('用户名已存在')
            return render_template('add_user.html', groups=groups)
        
        try:
            if group_id:
                cursor.execute(
                    'INSERT INTO users (username, password, group_id, created_by) VALUES (?, ?, ?, ?)',
                    (username, password, group_id, session.get('username'))
                )
            else:
                cursor.execute(
                    'INSERT INTO users (username, password, created_by) VALUES (?, ?, ?)',
                    (username, password, session.get('username'))
                )
            conn.commit()
            flash('用户添加成功')
            return redirect(url_for('list_users'))
        except Exception as e:
            conn.rollback()
            flash('添加用户失败: {}'.format(str(e)))
        finally:
            conn.close()
    
    return render_template('add_user.html', groups=groups)

@app.route('/users/edit/<int:user_id>', methods=['GET', 'POST'])
@login_required
def edit_user(user_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 获取用户信息
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    
    # 检查是否有权限编辑
    if not user:
        conn.close()
        flash('用户不存在')
        return redirect(url_for('list_users'))
    
    # 非默认用户只能编辑自己或同组用户
    if not is_default_user():
        if user['username'] != session.get('username'):
            # 检查是否同组
            user_group_id = get_user_group_id()
            if user['group_id'] != user_group_id:
                conn.close()
                flash('没有权限编辑此用户')
                return redirect(url_for('list_users'))
    
    # 获取可用的用户组
    if is_default_user():
        cursor.execute('SELECT id, group_name FROM user_groups ORDER BY group_name')
    else:
        # 非默认用户只能查看自己所属的用户组
        group_id = get_user_group_id()
        cursor.execute('SELECT id, group_name FROM user_groups WHERE id = ?', (group_id,))
    
    groups = cursor.fetchall()
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        group_id = request.form.get('group_id')
        
        # 默认用户可以不选择组，其他用户必须选择组
        if not is_default_user() and not group_id and user['username'] != DEFAULT_USERNAME:
            flash('必须选择用户组')
            return render_template('edit_user.html', user=user, groups=groups)
        
        if not username or not password:
            flash('用户名和密码不能为空')
            return render_template('edit_user.html', user=user, groups=groups)
        
        # 非默认用户只能添加到自己所属的组
        if not is_default_user() and group_id:
            user_group_id = get_user_group_id()
            if int(group_id) != user_group_id:
                flash('您只能将用户分配到自己所属的用户组')
                return render_template('edit_user.html', user=user, groups=groups)
        
        # 如果修改用户名，检查新用户名是否已存在
        if username != user['username']:
            cursor.execute('SELECT COUNT(*) FROM users WHERE username = ? AND id != ?', (username, user_id))
            if cursor.fetchone()[0] > 0:
                flash('用户名已存在')
                return render_template('edit_user.html', user=user, groups=groups)
        
        try:
            # 不允许修改默认用户的组
            if user['username'] == DEFAULT_USERNAME:
                cursor.execute(
                    'UPDATE users SET username = ?, password = ? WHERE id = ?',
                    (username, password, user_id)
                )
            else:
                cursor.execute(
                    'UPDATE users SET username = ?, password = ?, group_id = ? WHERE id = ?',
                    (username, password, group_id, user_id)
                )
            conn.commit()
            flash('用户信息更新成功')
            
            # 如果修改的是当前用户，更新session
            if user_id == session.get('user_id'):
                session['username'] = username
                
            return redirect(url_for('list_users'))
        except Exception as e:
            conn.rollback()
            flash('更新用户失败: {}'.format(str(e)))
        finally:
            conn.close()
    
    return render_template('edit_user.html', user=user, groups=groups)
@app.route('/users/delete/<int:user_id>', methods=['POST'])
@login_required
def delete_user(user_id):
    # 检查权限
    if not is_default_user():
        # 非默认用户只能删除同组用户
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 获取要删除的用户信息
        cursor.execute('SELECT username, group_id FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            flash('用户不存在')
            return redirect(url_for('list_users'))
        
        # 不允许删除默认管理员用户
        if user[0] == DEFAULT_USERNAME:
            conn.close()
            flash('不允许删除默认管理员用户')
            return redirect(url_for('list_users'))
        
        # 检查是否同组
        user_group_id = get_user_group_id()
        if user[1] != user_group_id:
            conn.close()
            flash('没有权限删除此用户')
            return redirect(url_for('list_users'))
        
        try:
            cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
            conn.commit()
            flash('用户删除成功')
        except Exception as e:
            conn.rollback()
            flash('删除用户失败: {}'.format(str(e)))
        finally:
            conn.close()
        
        return redirect(url_for('list_users'))
    
    # 默认用户可以删除任何用户
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 获取用户信息
    cursor.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        flash('用户不存在')
        return redirect(url_for('list_users'))
    
    # 不允许删除默认管理员用户
    if user[0] == DEFAULT_USERNAME:
        conn.close()
        flash('不允许删除默认管理员用户')
        return redirect(url_for('list_users'))
    
    try:
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        flash('用户删除成功')
    except Exception as e:
        conn.rollback()
        flash('删除用户失败: {}'.format(str(e)))
    finally:
        conn.close()
    
    return redirect(url_for('list_users'))

@app.route('/')
@login_required
def index():
    return render_template('upload.html')

@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        flash('No file part')
        return redirect(request.url)
    
    file = request.files['file']
    file_number = request.form.get('file_number', '').strip()
    
    if file.filename == '':
        flash('No selected file')
        return redirect(request.url)
    
    if not file_number:
        flash('File number is required')
        return redirect(request.url)
    
    # Validate file number (only letters and numbers allowed)
    if not file_number.isalnum():
        flash('File number can only contain letters and numbers')
        return redirect(request.url)
    
    if file and file.filename.lower().endswith('.pdf'):
        # Generate a unique filename
        original_filename = file.filename
        filename = "{}_{}".format(random.randint(10000, 99999), original_filename)
        file_path = os.path.join('static/uploads', filename)
        
        # Save the file
        file.save(file_path)
        
        # Generate extraction code
        extraction_code = generate_extraction_code()
        
        # Save to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 获取用户所属组
        group_id = get_user_group_id()
        
        # 检查文件编号是否在同一用户组内已存在
        if group_id:
            # 如果用户属于某个组，检查同组内是否有相同编号
            cursor.execute('SELECT COUNT(*) FROM documents WHERE file_number = ? AND group_id = ?', (file_number, group_id))
        else:
            # 如果用户不属于任何组，检查该用户上传的文档中是否有相同编号
            cursor.execute('SELECT COUNT(*) FROM documents WHERE file_number = ? AND uploaded_by = ? AND group_id IS NULL', 
                          (file_number, session.get('user_id')))
        
        if cursor.fetchone()[0] > 0:
            conn.close()
            # Remove the uploaded file
            if os.path.exists(file_path):
                os.remove(file_path)
            flash('在当前用户组内，文件编号已存在。请使用不同的文件编号。')
            return redirect("/")
        
        try:
            # 插入文档记录，包含组ID和上传者ID
            cursor.execute(
                'INSERT INTO documents (file_number, filename, original_filename, extraction_code, group_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
                (file_number, filename, original_filename, extraction_code, group_id, session.get('user_id'))
            )
            document_id = cursor.lastrowid
            conn.commit()
            conn.close()
        except Exception as e:
            conn.rollback()
            conn.close()
            # Remove the uploaded file
            if os.path.exists(file_path):
                os.remove(file_path)
            flash('Error uploading file: {}'.format(str(e)))
            return redirect(request.url)
        
        # Generate QR code
        qr_path = generate_qr_code(document_id, filename)
        
        return render_template('success.html', 
                              document_id=document_id,
                              extraction_code=extraction_code,
                              qr_path=qr_path,
                              filename=original_filename)
    else:
        flash('Only PDF files are allowed')
        return redirect(request.url)

@app.route('/view/<int:document_id>')
def view_document(document_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 检查文档是否存在
    cursor.execute('SELECT filename, original_filename, group_id FROM documents WHERE id = ?', (document_id,))
    result = cursor.fetchone()
    
    if not result:
        conn.close()
        abort(404)
    
    filename, original_filename, group_id = result
    
    # 如果用户已登录，检查权限
    if session.get('logged_in'):
        # 默认用户可以查看所有文档
        if is_default_user():
            conn.close()
            return render_template('view.html', 
                                  filename=filename, 
                                  original_filename=original_filename)
        
        # 检查用户是否有权限查看该文档
        user_group_id = get_user_group_id()
        cursor.execute('SELECT uploaded_by FROM documents WHERE id = ?', (document_id,))
        uploaded_by = cursor.fetchone()[0]
        
        # 如果文档没有组ID或用户是上传者，或用户组与文档组相同，则允许查看
        if group_id is None or uploaded_by == session.get('user_id') or group_id == user_group_id:
            conn.close()
            return render_template('view.html', 
                                  filename=filename, 
                                  original_filename=original_filename)
        
        conn.close()
        flash('您没有权限查看此文档')
        return redirect(url_for('index'))
    
    # 未登录用户通过链接访问，允许查看
    conn.close()
    return render_template('view.html', 
                          filename=filename, 
                          original_filename=original_filename)

@app.route('/query')
# 注意：这个路由不需要登录验证
def query_page():
    return render_template('query.html')
@app.route('/query/document', methods=['POST'])
# 注意：这个路由不需要登录验证
def query_document():
    file_number = request.form.get('file_number', '').strip()
    extraction_code = request.form.get('extraction_code', '').strip()
    
    if not file_number:
        flash('请输入文件编号')
        return redirect(url_for('query_page'))
    
    if not extraction_code:
        flash('请输入提取码')
        return redirect(url_for('query_page'))
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id, filename, original_filename FROM documents WHERE file_number = ? AND extraction_code = ?', 
                  (file_number, extraction_code))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        document_id, filename, original_filename = result
        return render_template('view.html', 
                              filename=filename, 
                              original_filename=original_filename)
    else:
        flash('文件编号或提取码无效')
        return redirect(url_for('query_page'))

@app.route('/pdf/<filename>')
def serve_pdf(filename):
    return send_from_directory('static/uploads', filename)

@app.route('/qrcode/<int:document_id>')
def get_qrcode(document_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT filename FROM documents WHERE id = ?', (document_id,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        filename = result[0]
        # Generate QR code if it doesn't exist
        qr_filename = "{}.png".format(filename.split('.')[0])
        qr_path = os.path.join('static/qrcodes', qr_filename)
        
        if not os.path.exists(qr_path):
            generate_qr_code(document_id, filename)
        
        return send_from_directory('static/qrcodes', qr_filename)
    else:
        abort(404)

@app.route('/delete/<int:document_id>', methods=['POST'])
@login_required
def delete_document(document_id):
    try:
        # 连接数据库
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 获取文档信息
        cursor.execute('SELECT filename, group_id, uploaded_by FROM documents WHERE id = ?', (document_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return 'Document not found', 404
        
        filename, group_id, uploaded_by = result
        
        # 检查权限
        if not is_default_user():
            # 非默认用户只能删除自己上传的文档或同组文档
            user_group_id = get_user_group_id()
            if uploaded_by != session.get('user_id') and group_id != user_group_id:
                conn.close()
                return '没有权限删除此文档', 403
        
        # 删除文件
        file_path = os.path.join('static/uploads', filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # 删除二维码
        qr_filename = "{}.png".format(filename.split('.')[0])
        qr_path = os.path.join('static/qrcodes', qr_filename)
        if os.path.exists(qr_path):
            os.remove(qr_path)
        
        # 从数据库中删除记录
        cursor.execute('DELETE FROM documents WHERE id = ?', (document_id,))
        conn.commit()
        conn.close()
        
        return '', 204  # 成功，无内容返回
    except Exception as e:
        print("Error deleting document: {}".format(e))
        return str(e), 500

@app.route('/list')
@login_required
def list_documents():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    cursor = conn.cursor()
    
    # 默认用户可以查看所有文档
    if is_default_user():
        cursor.execute('''
            SELECT d.id, d.file_number, d.original_filename, d.extraction_code, d.upload_date, 
                   u.username as uploader, g.group_name
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN user_groups g ON d.group_id = g.id
            ORDER BY d.upload_date DESC
        ''')
    else:
        # 非默认用户只能查看自己组的文档
        group_id = get_user_group_id()
        if not group_id:
            # 如果用户没有组，则只能查看自己上传的文档
            cursor.execute('''
                SELECT d.id, d.file_number, d.original_filename, d.extraction_code, d.upload_date, 
                       u.username as uploader, g.group_name
                FROM documents d
                LEFT JOIN users u ON d.uploaded_by = u.id
                LEFT JOIN user_groups g ON d.group_id = g.id
                WHERE d.uploaded_by = ? OR d.group_id IS NULL
                ORDER BY d.upload_date DESC
            ''', (session.get('user_id'),))
        else:
            cursor.execute('''
                SELECT d.id, d.file_number, d.original_filename, d.extraction_code, d.upload_date, 
                       u.username as uploader, g.group_name
                FROM documents d
                LEFT JOIN users u ON d.uploaded_by = u.id
                LEFT JOIN user_groups g ON d.group_id = g.id
                WHERE d.group_id = ? OR d.uploaded_by = ?
                ORDER BY d.upload_date DESC
            ''', (group_id, session.get('user_id')))
    
    documents = cursor.fetchall()
    conn.close()
    
    return render_template('list.html', documents=documents)

# Add test document after all functions are defined
add_test_document()

if __name__ == '__main__':
    serverHost = 'localhost'
    serverPort = 5000
    if len(sys.argv) >= 2:
        serverHost = sys.argv[1]
    if len(sys.argv) >= 3:
        serverPort = int(sys.argv[2])

    app.run(host=serverHost, port=serverPort)
