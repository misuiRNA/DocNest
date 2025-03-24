import os
import random
import string
import sqlite3
import qrcode
from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory, abort

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Change this to a random secret key

# Ensure upload and QR code directories exist
os.makedirs('static/uploads', exist_ok=True)
os.makedirs('static/qrcodes', exist_ok=True)

# Database setup
def init_db():
    conn = sqlite3.connect('documents.db')
    cursor = conn.cursor()
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

# Initialize database
init_db()

# Generate a random 4-digit extraction code
def generate_extraction_code():
    return ''.join(random.choices(string.digits, k=4))

# Generate QR code for a document
def generate_qr_code(document_id, filename):
    # Create QR code with the view URL
    view_url = f"{request.host_url}view/{document_id}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(view_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    qr_path = f"static/qrcodes/{filename.split('.')[0]}.png"
    img.save(qr_path)
    return qr_path

@app.route('/')
def index():
    return render_template('upload.html')

@app.route('/upload', methods=['POST'])
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
        filename = f"{random.randint(10000, 99999)}_{original_filename}"
        file_path = os.path.join('static/uploads', filename)
        
        # Save the file
        file.save(file_path)
        
        # Generate extraction code
        extraction_code = generate_extraction_code()
        
        # Save to database
        conn = sqlite3.connect('documents.db')
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
    conn = sqlite3.connect('documents.db')
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
def query_page():
    return render_template('query.html')

@app.route('/query/document', methods=['POST'])
def query_document():
    extraction_code = request.form.get('extraction_code')
    
    if not extraction_code:
        flash('Please enter an extraction code')
        return redirect(url_for('query_page'))
    
    conn = sqlite3.connect('documents.db')
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

if __name__ == '__main__':
    app.run(debug=True)
