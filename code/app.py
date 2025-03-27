#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
from flask import Flask, send_from_directory, send_file

# Create Flask app
app = Flask(__name__, static_folder='static')
app.secret_key = 'your_secret_key'  # Change this to a random secret key

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

# Register API routes
from api import init_app
init_app(app)

# Serve static files
@app.route('/')
def index():
    return send_file('static/index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# Run the app
if __name__ == '__main__':
    serverHost = 'localhost'
    serverPort = 5000
    if len(sys.argv) >= 2:
        serverHost = sys.argv[1]
    if len(sys.argv) >= 3:
        serverPort = int(sys.argv[2])

    app.run(host=serverHost, port=serverPort, debug=True)
