import os
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
    
    # Create the table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        extraction_code TEXT NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    conn.commit()
    conn.close()
    
    print(f"Database initialized at {os.path.abspath(DB_PATH)}")

# Generate a random 4-digit extraction code
def generate_extraction_code():
    return ''.join(random.choice(string.digits) for _ in range(4))

# Initialize database
init_db()

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
        
        cursor.execute(
            'INSERT INTO documents (filename, original_filename, extraction_code) VALUES (?, ?, ?)',
            (filename, test_filename, extraction_code)
        )
        document_id = cursor.lastrowid
        conn.commit()
        
        # Generate QR code for test document
        generate_qr_code(document_id, filename)
        
        print(f"Added test document with ID: {document_id}")
    
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

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == DEFAULT_USERNAME and password == DEFAULT_PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            flash('用户名或密码错误')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

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
    
    if file.filename == '':
        flash('No selected file')
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
        cursor.execute(
            'INSERT INTO documents (filename, original_filename, extraction_code) VALUES (?, ?, ?)',
            (filename, original_filename, extraction_code)
        )
        document_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
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
    cursor.execute('SELECT filename, original_filename FROM documents WHERE id = ?', (document_id,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        filename, original_filename = result
        return render_template('view.html', 
                              filename=filename, 
                              original_filename=original_filename)
    else:
        abort(404)

@app.route('/query')
# 注意：这个路由不需要登录验证
def query_page():
    return render_template('query.html')

@app.route('/list')
@login_required
def list_documents():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    cursor = conn.cursor()
    cursor.execute('SELECT id, original_filename, extraction_code, upload_date FROM documents ORDER BY upload_date DESC')
    documents = cursor.fetchall()
    conn.close()
    
    return render_template('list.html', documents=documents)

@app.route('/query/document', methods=['POST'])
# 注意：这个路由不需要登录验证
def query_document():
    extraction_code = request.form.get('extraction_code')
    
    if not extraction_code:
        flash('Please enter an extraction code')
        return redirect(url_for('query_page'))
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id, filename, original_filename FROM documents WHERE extraction_code = ?', (extraction_code,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        document_id, filename, original_filename = result
        return render_template('view.html', 
                              filename=filename, 
                              original_filename=original_filename)
    else:
        flash('Invalid extraction code')
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
        cursor.execute('SELECT filename FROM documents WHERE id = ?', (document_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return 'Document not found', 404
        
        filename = result[0]
        
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
        print(f"Error deleting document: {e}")
        return str(e), 500

# Add test document after all functions are defined
add_test_document()

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001)
