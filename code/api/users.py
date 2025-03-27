import sqlite3
from flask import request, jsonify, g
from . import api_bp
from .auth import token_required, admin_required, get_db

# Default admin username
DEFAULT_USERNAME = 'admin'

# Get users route
@api_bp.route('/users', methods=['GET'])
@token_required
def get_users():
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user is admin
    if g.current_user['is_admin']:
        # Admin can see all users
        cursor.execute('''
            SELECT u.id, u.username, u.group_id, u.created_by, u.created_at, g.group_name 
            FROM users u 
            LEFT JOIN user_groups g ON u.group_id = g.id 
            ORDER BY u.created_at DESC
        ''')
    else:
        # Non-admin can only see users in their group
        cursor.execute('SELECT group_id FROM users WHERE id = ?', (g.current_user['id'],))
        group_id = cursor.fetchone()['group_id']
        
        if not group_id:
            # User doesn't belong to any group
            return jsonify({'users': []})
        
        cursor.execute('''
            SELECT u.id, u.username, u.group_id, u.created_by, u.created_at, g.group_name 
            FROM users u 
            LEFT JOIN user_groups g ON u.group_id = g.id 
            WHERE u.group_id = ? 
            ORDER BY u.created_at DESC
        ''', (group_id,))
    
    users = cursor.fetchall()
    
    # Convert to list of dictionaries
    users_list = []
    for user in users:
        users_list.append({
            'id': user['id'],
            'username': user['username'],
            'group_id': user['group_id'],
            'group_name': user['group_name'],
            'created_by': user['created_by'],
            'created_at': user['created_at']
        })
    
    return jsonify({'users': users_list})

# Get user route
@api_bp.route('/users/<int:user_id>', methods=['GET'])
@token_required
def get_user(user_id):
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user is admin or getting their own info
    if not g.current_user['is_admin'] and g.current_user['id'] != user_id:
        # Check if user is in the same group
        cursor.execute('SELECT group_id FROM users WHERE id = ?', (g.current_user['id'],))
        current_user_group = cursor.fetchone()['group_id']
        
        cursor.execute('SELECT group_id FROM users WHERE id = ?', (user_id,))
        target_user_group = cursor.fetchone()
        
        if not target_user_group or target_user_group['group_id'] != current_user_group:
            return jsonify({'error': 'You do not have permission to view this user'}), 403
    
    # Get user
    cursor.execute('''
        SELECT u.id, u.username, u.group_id, u.created_by, u.created_at, g.group_name 
        FROM users u 
        LEFT JOIN user_groups g ON u.group_id = g.id 
        WHERE u.id = ?
    ''', (user_id,))
    
    user = cursor.fetchone()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Convert to dictionary
    user_dict = {
        'id': user['id'],
        'username': user['username'],
        'group_id': user['group_id'],
        'group_name': user['group_name'],
        'created_by': user['created_by'],
        'created_at': user['created_at']
    }
    
    return jsonify({'user': user_dict})

# Create user route
@api_bp.route('/users', methods=['POST'])
@token_required
def create_user():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    username = data.get('username')
    password = data.get('password')
    group_id = data.get('group_id')
    
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user is admin or group manager
    if not g.current_user['is_admin']:
        # Non-admin can only create users in their group
        cursor.execute('SELECT group_id FROM users WHERE id = ?', (g.current_user['id'],))
        current_user_group = cursor.fetchone()['group_id']
        
        if not current_user_group:
            return jsonify({'error': 'You do not have permission to create users'}), 403
        
        if int(group_id) != int(current_user_group):
            print(f"error create user with diffrent groupid: {group_id}, {current_user_group}")
            return jsonify({'error': 'You can only create users in your own group'}), 403
    
    # Check if username already exists
    cursor.execute('SELECT COUNT(*) FROM users WHERE username = ?', (username,))
    if cursor.fetchone()[0] > 0:
        return jsonify({'error': 'Username already exists'}), 400
    
    # Create user
    try:
        if group_id:
            cursor.execute(
                'INSERT INTO users (username, password, group_id, created_by) VALUES (?, ?, ?, ?)',
                (username, password, group_id, g.current_user['username'])
            )
        else:
            cursor.execute(
                'INSERT INTO users (username, password, created_by) VALUES (?, ?, ?)',
                (username, password, g.current_user['username'])
            )
        
        user_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user_id': user_id
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500

# Update user route
@api_bp.route('/users/<int:user_id>', methods=['PUT'])
@token_required
def update_user(user_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username')
    password = data.get('password')
    group_id = data.get('group_id')
    
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Get user
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if user is admin or updating their own info
    if not g.current_user['is_admin'] and g.current_user['id'] != user_id:
        # Check if user is in the same group
        cursor.execute('SELECT group_id FROM users WHERE id = ?', (g.current_user['id'],))
        current_user_group = cursor.fetchone()['group_id']
        
        if user['group_id'] != current_user_group:
            return jsonify({'error': 'You do not have permission to update this user'}), 403
    
    # Check if trying to update admin user's group
    if user['username'] == DEFAULT_USERNAME and group_id is not None:
        return jsonify({'error': 'Cannot change admin user\'s group'}), 400
    
    # Check if username already exists
    if username and username != user['username']:
        cursor.execute('SELECT COUNT(*) FROM users WHERE username = ? AND id != ?', (username, user_id))
        if cursor.fetchone()[0] > 0:
            return jsonify({'error': 'Username already exists'}), 400
    
    # Update user
    try:
        # Build update query
        update_fields = []
        params = []
        
        if username:
            update_fields.append('username = ?')
            params.append(username)
        
        if password:
            update_fields.append('password = ?')
            params.append(password)
        
        if group_id is not None:
            update_fields.append('group_id = ?')
            params.append(group_id)
        
        if not update_fields:
            return jsonify({'message': 'No fields to update'}), 200
        
        # Add user_id to params
        params.append(user_id)
        
        # Execute update query
        cursor.execute(
            'UPDATE users SET {} WHERE id = ?'.format(', '.join(update_fields)),
            params
        )
        
        conn.commit()
        
        return jsonify({'message': 'User updated successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500

# Delete user route
@api_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(user_id):
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Get user
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if trying to delete admin user
    if user['username'] == DEFAULT_USERNAME:
        return jsonify({'error': 'Cannot delete admin user'}), 400
    
    # Check if user is admin or deleting a user in their group
    if not g.current_user['is_admin']:
        # Check if user is in the same group
        cursor.execute('SELECT group_id FROM users WHERE id = ?', (g.current_user['id'],))
        current_user_group = cursor.fetchone()['group_id']
        
        if not current_user_group or user['group_id'] != current_user_group:
            return jsonify({'error': 'You do not have permission to delete this user'}), 403
    
    # Delete user
    try:
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        
        return jsonify({'message': 'User deleted successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
