import jwt
import datetime
import sqlite3
from functools import wraps
from flask import request, jsonify, current_app, g
from . import api_bp

# JWT Secret Key
JWT_SECRET = 'your_jwt_secret_key'  # Change this to a random secret key in production

# Default admin credentials
DEFAULT_USERNAME = 'admin'

# Database path
DB_PATH = 'static/documents.db'

# Token expiration time (in minutes)
TOKEN_EXPIRATION = 30

# Connect to database
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        
        # Check if tables exist, if not create them
        cursor = g.db.cursor()
        
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            # Create users table
            cursor.execute('''
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    group_id INTEGER,
                    role TEXT DEFAULT 'user',
                    created_by TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create default admin user
            cursor.execute(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                (DEFAULT_USERNAME, 'admin', 'admin')
            )
        
        # Check if user_groups table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_groups'")
        if not cursor.fetchone():
            # Create user_groups table
            cursor.execute('''
                CREATE TABLE user_groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    group_name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    created_by TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
        
        # Check if documents table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'")
        if not cursor.fetchone():
            # Create documents table
            cursor.execute('''
                CREATE TABLE documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_number TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    extraction_code TEXT NOT NULL,
                    group_id INTEGER,
                    uploaded_by INTEGER,
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
        # Commit changes
        g.db.commit()
        
    return g.db

# Close database connection
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# Generate JWT token
def generate_token(user_id, username, is_admin, role):
    payload = {
        'user_id': user_id,
        'username': username,
        'is_admin': is_admin,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=TOKEN_EXPIRATION)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

# Verify JWT token
def verify_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# Token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        # Verify token
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        # Set current user
        g.current_user = {
            'id': payload['user_id'],
            'username': payload['username'],
            'is_admin': payload['is_admin'],
            'role': payload['role']
        }
        
        return f(*args, **kwargs)
    
    return decorated

# Admin required decorator
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not g.current_user['is_admin']:
            return jsonify({'error': 'Admin privileges required'}), 403
        
        return f(*args, **kwargs)
    
    return decorated

# Group admin required decorator
def group_admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not (g.current_user['is_admin'] or g.current_user['role'] == 'group_admin'):
            return jsonify({'error': 'Group admin privileges required'}), 403
        
        return f(*args, **kwargs)
    
    return decorated

# Login route
@api_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Get user
    cursor.execute('SELECT * FROM users WHERE username = ? AND password = ?', (username, password))
    user = cursor.fetchone()
    
    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Check if user is admin
    is_admin = (username == DEFAULT_USERNAME)
    
    # Get user role
    role = user['role'] if 'role' in user.keys() else 'user'
    
    # Generate token
    token = generate_token(user['id'], username, is_admin, role)
    
    # Return token and user info
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': username,
            'is_admin': is_admin,
            'role': role
        }
    })

# Logout route
@api_bp.route('/auth/logout', methods=['POST'])
@token_required
def logout():
    # JWT tokens are stateless, so we don't need to do anything server-side
    return jsonify({'message': 'Logout successful'})

# Verify token route
@api_bp.route('/auth/verify', methods=['GET'])
def verify():
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'valid': False}), 200
    
    token = auth_header.split(' ')[1]
    
    # Verify token
    payload = verify_token(token)
    if not payload:
        return jsonify({'valid': False}), 200
    
    # Return user info
    return jsonify({
        'valid': True,
        'user': {
            'id': payload['user_id'],
            'username': payload['username'],
            'is_admin': payload['is_admin'],
            'role': payload['role']
        }
    })

# Change password route
@api_bp.route('/auth/change-password', methods=['POST'])
@token_required
def change_password():
    data = request.get_json()
    
    if not data or not data.get('current_password') or not data.get('new_password'):
        return jsonify({'error': 'Current password and new password are required'}), 400
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify current password
    cursor.execute('SELECT password FROM users WHERE id = ?', (g.current_user['id'],))
    result = cursor.fetchone()
    
    if not result or result['password'] != current_password:
        return jsonify({'error': 'Current password is incorrect'}), 401
    
    # Update password
    try:
        cursor.execute('UPDATE users SET password = ? WHERE id = ?', (new_password, g.current_user['id']))
        conn.commit()
        return jsonify({'message': 'Password changed successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
