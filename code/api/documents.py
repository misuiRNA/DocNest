import os
import re
import random
import string
import sqlite3
import qrcode
from flask import request, jsonify, g, send_from_directory, current_app, url_for
from werkzeug.utils import secure_filename
from . import api_bp
from .auth import token_required, admin_required, get_db

# Database path
DB_PATH = 'static/documents.db'

# Upload directory
UPLOAD_DIR = 'static/uploads'

# QR code directory
QRCODE_DIR = 'static/qrcodes'

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf'}

# Generate a random 4-digit extraction code
def generate_extraction_code():
    return ''.join(random.choice(string.digits) for _ in range(4))

# Generate QR code for a document
def generate_qr_code(document_id, filename):
    # Create QR code with the view URL
    view_url = url_for('api.view_document', document_id=document_id, _external=True)
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(view_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    qr_path = os.path.join(QRCODE_DIR, "{}.png".format(filename.split('.')[0]))
    img.save(qr_path)
    return qr_path

# Check if file extension is allowed
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Get documents route
@api_bp.route('/documents', methods=['GET'])
@token_required
def get_documents():
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user is admin
    if g.current_user['is_admin']:
        # Admin can see all documents
        cursor.execute('''
            SELECT d.id, d.file_number, d.original_filename, d.filename, d.extraction_code, d.upload_date, 
                   u.username as uploader, g.group_name
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN user_groups g ON d.group_id = g.id
            ORDER BY d.upload_date DESC
        ''')
    else:
        # Non-admin can only see documents in their group
        cursor.execute('SELECT group_id FROM users WHERE id = ?', (g.current_user['id'],))
        group_id = cursor.fetchone()['group_id']
        
        if group_id:
            # User belongs to a group
            cursor.execute('''
                SELECT d.id, d.file_number, d.original_filename, d.filename, d.extraction_code, d.upload_date, 
                       u.username as uploader, g.group_name
                FROM documents d
                LEFT JOIN users u ON d.uploaded_by = u.id
                LEFT JOIN user_groups g ON d.group_id = g.id
                WHERE d.group_id = ? OR d.uploaded_by = ?
                ORDER BY d.upload_date DESC
            ''', (group_id, g.current_user['id']))
        else:
            # User doesn't belong to any group
            cursor.execute('''
                SELECT d.id, d.file_number, d.original_filename, d.filename, d.extraction_code, d.upload_date, 
                       u.username as uploader, g.group_name
                FROM documents d
                LEFT JOIN users u ON d.uploaded_by = u.id
                LEFT JOIN user_groups g ON d.group_id = g.id
                WHERE d.uploaded_by = ?
                ORDER BY d.upload_date DESC
            ''', (g.current_user['id'],))
    
    documents = cursor.fetchall()
    
    # Convert to list of dictionaries
    documents_list = []
    for doc in documents:
        documents_list.append({
            'id': doc['id'],
            'file_number': doc['file_number'],
            'original_filename': doc['original_filename'],
            'extraction_code': doc['extraction_code'],
            'upload_date': doc['upload_date'],
            'uploader': doc['uploader'],
            'group_name': doc['group_name'],
            'view_url': url_for('api.view_document', document_id=doc['id'], _external=True),
            'qrcode_url': url_for('api.get_qrcode', document_id=doc['id'], _external=True)
        })
    
    return jsonify({'documents': documents_list})

# Get document route
@api_bp.route('/documents/<int:document_id>', methods=['GET'])
@token_required
def get_document(document_id):
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Get document
    cursor.execute('''
        SELECT d.id, d.file_number, d.original_filename, d.filename, d.extraction_code, d.upload_date, 
               d.group_id, d.uploaded_by, u.username as uploader, g.group_name
        FROM documents d
        LEFT JOIN users u ON d.uploaded_by = u.id
        LEFT JOIN user_groups g ON d.group_id = g.id
        WHERE d.id = ?
    ''', (document_id,))
    
    document = cursor.fetchone()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Check if user has permission to view document
    if not g.current_user['is_admin']:
        # Check if user is the uploader
        if document['uploaded_by'] != g.current_user['id']:
            # Check if user is in the same group
            cursor.execute('SELECT group_id FROM users WHERE id = ?', (g.current_user['id'],))
            user_group_id = cursor.fetchone()['group_id']
            
            if not user_group_id or document['group_id'] != user_group_id:
                return jsonify({'error': 'You do not have permission to view this document'}), 403
    
    # Convert to dictionary
    document_dict = {
        'id': document['id'],
        'file_number': document['file_number'],
        'original_filename': document['original_filename'],
        'filename': document['filename'],
        'extraction_code': document['extraction_code'],
        'upload_date': document['upload_date'],
        'group_id': document['group_id'],
        'group_name': document['group_name'],
        'uploaded_by': document['uploaded_by'],
        'uploader': document['uploader'],
        'view_url': url_for('api.view_document', document_id=document['id'], _external=True),
        'qrcode_url': url_for('api.get_qrcode', document_id=document['id'], _external=True)
    }
    
    return jsonify({'document': document_dict})

# Upload document route
@api_bp.route('/documents', methods=['POST'])
@token_required
def upload_document():
    # Check if file is in request
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    file_number = request.form.get('file_number', '')
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file_number:
        return jsonify({'error': 'File number is required'}), 400
    
    # Validate file number (only letters and numbers allowed)
    if not re.fullmatch(r"[a-zA-Z0-9\-_+]+", file_number):
        return jsonify({'error': 'File number can only contain letters, numbers, and -_+ symbols'}), 400
    
    if file and allowed_file(file.filename):
        # Preserve the original filename with Chinese characters
        original_filename = file.filename
        # Generate a secure filename for storage
        secure_name = secure_filename(file.filename)
        filename = "{}_{}".format(random.randint(10000, 99999), secure_name)
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save the file
        file.save(file_path)
        
        # Generate extraction code
        extraction_code = generate_extraction_code()
        
        # Connect to database
        conn = get_db()
        cursor = conn.cursor()
        
        # Get user's group
        cursor.execute('SELECT group_id FROM users WHERE id = ?', (g.current_user['id'],))
        group_id = cursor.fetchone()['group_id']
        
        # Check if file number already exists in the same group
        if group_id:
            # If user belongs to a group, check if the same file number exists in the group
            cursor.execute('SELECT COUNT(*) FROM documents WHERE file_number = ? AND group_id = ?', (file_number, group_id))
        else:
            # If user doesn't belong to any group, check if the same file number exists for this user
            cursor.execute('SELECT COUNT(*) FROM documents WHERE file_number = ? AND uploaded_by = ? AND group_id IS NULL', 
                          (file_number, g.current_user['id']))
        
        if cursor.fetchone()[0] > 0:
            # Remove the uploaded file
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': 'File number already exists in your group'}), 400
        
        try:
            # Insert document record
            cursor.execute(
                'INSERT INTO documents (file_number, filename, original_filename, extraction_code, group_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
                (file_number, filename, original_filename, extraction_code, group_id, g.current_user['id'])
            )
            
            document_id = cursor.lastrowid
            conn.commit()
            
            # Generate QR code
            qr_path = generate_qr_code(document_id, filename)
            
            # Get document details
            cursor.execute('''
                SELECT d.id, d.file_number, d.original_filename, d.filename, d.extraction_code, d.upload_date, 
                       d.group_id, d.uploaded_by, u.username as uploader, g.group_name
                FROM documents d
                LEFT JOIN users u ON d.uploaded_by = u.id
                LEFT JOIN user_groups g ON d.group_id = g.id
                WHERE d.id = ?
            ''', (document_id,))
            
            document = cursor.fetchone()
            
            # Convert to dictionary
            document_dict = {
                'id': document['id'],
                'file_number': document['file_number'],
                'original_filename': document['original_filename'],
                'filename': document['filename'],
                'upload_date': document['upload_date'],
                'group_id': document['group_id'],
                'group_name': document['group_name'],
                'uploaded_by': document['uploaded_by'],
                'uploader': document['uploader'],
                'view_url': url_for('api.view_document', document_id=document['id'], _external=True),
                'qrcode_url': url_for('api.get_qrcode', document_id=document['id'], _external=True)
            }
            
            return jsonify({
                'message': 'Document uploaded successfully',
                'document': document_dict,
                'extraction_code': extraction_code
            }), 201
        except Exception as e:
            conn.rollback()
            
            # Remove the uploaded file
            if os.path.exists(file_path):
                os.remove(file_path)
            
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Only PDF files are allowed'}), 400

# Delete document route
@api_bp.route('/documents/<int:document_id>', methods=['DELETE'])
@token_required
def delete_document(document_id):
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Get document
    cursor.execute('SELECT * FROM documents WHERE id = ?', (document_id,))
    document = cursor.fetchone()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Check if user has permission to delete document
    if not g.current_user['is_admin']:
        # Check if user is a group admin
        cursor.execute('SELECT role, group_id FROM users WHERE id = ?', (g.current_user['id'],))
        user = cursor.fetchone()
        user_role = user['role'] if 'role' in user.keys() else 'user'
        user_group_id = user['group_id']
        
        # Only admin and group_admin can delete documents
        if user_role != 'group_admin':
            return jsonify({'error': 'Only administrators can delete documents'}), 403
            
        # Group admin can only delete documents in their group
        if not user_group_id or document['group_id'] != user_group_id:
            return jsonify({'error': 'You do not have permission to delete this document'}), 403
    
    # Delete document
    try:
        # Delete file
        file_path = os.path.join(UPLOAD_DIR, document['filename'])
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete QR code
        qr_filename = "{}.png".format(document['filename'].split('.')[0])
        qr_path = os.path.join(QRCODE_DIR, qr_filename)
        if os.path.exists(qr_path):
            os.remove(qr_path)
        
        # Delete database record
        cursor.execute('DELETE FROM documents WHERE id = ?', (document_id,))
        conn.commit()
        
        return jsonify({'message': 'Document deleted successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500

# Query document route
@api_bp.route('/documents/query', methods=['POST'])
def query_document():
    data = request.get_json()
    
    if not data or not data.get('file_number') or not data.get('extraction_code'):
        return jsonify({'error': 'File number and extraction code are required'}), 400
    
    file_number = data.get('file_number')
    extraction_code = data.get('extraction_code')
    
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Get document
    cursor.execute('''
        SELECT d.id, d.file_number, d.original_filename, d.filename, d.upload_date
        FROM documents d
        WHERE d.file_number = ? AND d.extraction_code = ?
    ''', (file_number, extraction_code))
    
    document = cursor.fetchone()
    
    if not document:
        return jsonify({'error': 'Invalid file number or extraction code'}), 404
    
    # Convert to dictionary
    document_dict = {
        'id': document['id'],
        'file_number': document['file_number'],
        'original_filename': document['original_filename'],
        'upload_date': document['upload_date'],
        'view_url': url_for('api.view_document', document_id=document['id'], _external=True)
    }
    
    return jsonify({'document': document_dict})

# View document route
@api_bp.route('/documents/<int:document_id>/view')
def view_document(document_id):
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Get document
    cursor.execute('SELECT filename FROM documents WHERE id = ?', (document_id,))
    document = cursor.fetchone()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Serve PDF file
    return send_from_directory(UPLOAD_DIR, document['filename'])

# Get QR code route
@api_bp.route('/documents/<int:document_id>/qrcode')
def get_qrcode(document_id):
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Get document
    cursor.execute('SELECT filename FROM documents WHERE id = ?', (document_id,))
    document = cursor.fetchone()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Generate QR code if it doesn't exist
    qr_filename = "{}.png".format(document['filename'].split('.')[0])
    qr_path = os.path.join(QRCODE_DIR, qr_filename)
    
    if not os.path.exists(qr_path):
        generate_qr_code(document_id, document['filename'])
    
    # Serve QR code
    return send_from_directory(QRCODE_DIR, qr_filename)
