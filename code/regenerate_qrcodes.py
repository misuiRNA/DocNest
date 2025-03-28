#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sqlite3
import qrcode
from flask import Flask

# Database path
DB_PATH = 'static/documents.db'

# Upload directory
UPLOAD_DIR = 'static/uploads'

# QR code directory
QRCODE_DIR = 'static/qrcodes'

# Create a minimal Flask app for the context
app = Flask(__name__)
app.config['SERVER_NAME'] = 'localhost:5000'

# Generate QR code for a document (copy from documents.py but without request dependency)
def generate_qr_code(document_id, filename):
    # Create QR code with the mobile viewer URL instead of direct view URL
    base_url = f"http://{app.config['SERVER_NAME']}"
    mobile_viewer_url = f"{base_url}/mobile-viewer.html?id={document_id}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(mobile_viewer_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    qr_path = os.path.join(QRCODE_DIR, "{}.png".format(filename.split('.')[0]))
    img.save(qr_path)
    return qr_path

def main():
    print("Regenerating QR codes for all documents...")
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all documents
    cursor.execute('SELECT id, filename FROM documents')
    documents = cursor.fetchall()
    
    # Regenerate QR codes
    for doc in documents:
        document_id = doc['id']
        filename = doc['filename']
        
        # Delete existing QR code if it exists
        qr_filename = "{}.png".format(filename.split('.')[0])
        qr_path = os.path.join(QRCODE_DIR, qr_filename)
        if os.path.exists(qr_path):
            os.remove(qr_path)
        
        # Generate new QR code
        generate_qr_code(document_id, filename)
        print(f"Regenerated QR code for document ID {document_id}")
    
    print(f"Successfully regenerated QR codes for {len(documents)} documents")

if __name__ == '__main__':
    with app.app_context():
        main()
