import sqlite3
from flask import request, jsonify, g
from . import api_bp
from .auth import token_required, admin_required, get_db

# Get groups route
@api_bp.route('/groups', methods=['GET'])
@token_required
def get_groups():
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user is admin
    if g.current_user['is_admin']:
        # Admin can see all groups
        cursor.execute('SELECT * FROM user_groups ORDER BY created_at DESC')
    elif g.current_user['role'] == 'group_admin':
        # Group admin can only see their own group
        cursor.execute('SELECT group_id FROM users WHERE id = ?', (g.current_user['id'],))
        group_id = cursor.fetchone()['group_id']
        
        if not group_id:
            # User doesn't belong to any group
            return jsonify({'groups': []})
        
        cursor.execute('SELECT * FROM user_groups WHERE id = ?', (group_id,))
    else:
        # Regular users cannot see groups
        return jsonify({'error': 'You do not have permission to view groups'}), 403
    
    groups = cursor.fetchall()
    
    # Convert to list of dictionaries
    groups_list = []
    for group in groups:
        groups_list.append({
            'id': group['id'],
            'group_name': group['group_name'],
            'description': group['description'],
            'created_by': group['created_by'],
            'created_at': group['created_at']
        })
    
    return jsonify({'groups': groups_list})

# Get group route
@api_bp.route('/groups/<int:group_id>', methods=['GET'])
@token_required
def get_group(group_id):
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user is admin, group_admin, or in the group
    if not g.current_user['is_admin']:
        cursor.execute('SELECT group_id, role FROM users WHERE id = ?', (g.current_user['id'],))
        user = cursor.fetchone()
        user_group_id = user['group_id']
        user_role = user['role'] if 'role' in user.keys() else 'user'
        
        if user_group_id != group_id:
            return jsonify({'error': 'You do not have permission to view this group'}), 403
        
        if user_role == 'user':
            return jsonify({'error': 'Regular users cannot view group details'}), 403
    
    # Get group
    cursor.execute('SELECT * FROM user_groups WHERE id = ?', (group_id,))
    group = cursor.fetchone()
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    # Get users in group
    cursor.execute('SELECT id, username, created_by, created_at FROM users WHERE group_id = ?', (group_id,))
    users = cursor.fetchall()
    
    # Convert to dictionaries
    group_dict = {
        'id': group['id'],
        'group_name': group['group_name'],
        'description': group['description'],
        'created_by': group['created_by'],
        'created_at': group['created_at']
    }
    
    users_list = []
    for user in users:
        users_list.append({
            'id': user['id'],
            'username': user['username'],
            'created_by': user['created_by'],
            'created_at': user['created_at']
        })
    
    return jsonify({
        'group': group_dict,
        'users': users_list
    })

# Create group route
@api_bp.route('/groups', methods=['POST'])
@token_required
@admin_required
def create_group():
    data = request.get_json()
    
    if not data or not data.get('group_name'):
        return jsonify({'error': 'Group name is required'}), 400
    
    group_name = data.get('group_name')
    description = data.get('description', '')
    
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if group name already exists
    cursor.execute('SELECT COUNT(*) FROM user_groups WHERE group_name = ?', (group_name,))
    if cursor.fetchone()[0] > 0:
        return jsonify({'error': 'Group name already exists'}), 400
    
    # Create group
    try:
        cursor.execute(
            'INSERT INTO user_groups (group_name, description, created_by) VALUES (?, ?, ?)',
            (group_name, description, g.current_user['username'])
        )
        
        group_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({
            'message': 'Group created successfully',
            'group_id': group_id
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500

# Update group route
@api_bp.route('/groups/<int:group_id>', methods=['PUT'])
@token_required
def update_group(group_id):
    # Check if user is admin or group_admin of this group
    if not g.current_user['is_admin']:
        if g.current_user['role'] != 'group_admin':
            return jsonify({'error': 'You do not have permission to update this group'}), 403
        
        # Check if group_admin belongs to this group
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT group_id FROM users WHERE id = ?', (g.current_user['id'],))
        user_group_id = cursor.fetchone()['group_id']
        
        if user_group_id != group_id:
            return jsonify({'error': 'You do not have permission to update this group'}), 403
    # Continue with update
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    group_name = data.get('group_name')
    description = data.get('description')
    
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Get group
    cursor.execute('SELECT * FROM user_groups WHERE id = ?', (group_id,))
    group = cursor.fetchone()
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    # Check if group name already exists
    if group_name and group_name != group['group_name']:
        cursor.execute('SELECT COUNT(*) FROM user_groups WHERE group_name = ? AND id != ?', (group_name, group_id))
        if cursor.fetchone()[0] > 0:
            return jsonify({'error': 'Group name already exists'}), 400
    
    # Update group
    try:
        # Build update query
        update_fields = []
        params = []
        
        if group_name:
            update_fields.append('group_name = ?')
            params.append(group_name)
        
        if description is not None:
            update_fields.append('description = ?')
            params.append(description)
        
        if not update_fields:
            return jsonify({'message': 'No fields to update'}), 200
        
        # Add group_id to params
        params.append(group_id)
        
        # Execute update query
        cursor.execute(
            'UPDATE user_groups SET {} WHERE id = ?'.format(', '.join(update_fields)),
            params
        )
        
        conn.commit()
        
        return jsonify({'message': 'Group updated successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500

# Delete group route
@api_bp.route('/groups/<int:group_id>', methods=['DELETE'])
@token_required
def delete_group(group_id):
    # Check if user is admin (only admin can delete groups)
    if not g.current_user['is_admin']:
        return jsonify({'error': 'Only admin can delete groups'}), 403
    # Continue with delete
    # Connect to database
    conn = get_db()
    cursor = conn.cursor()
    
    # Get group
    cursor.execute('SELECT * FROM user_groups WHERE id = ?', (group_id,))
    group = cursor.fetchone()
    
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    # Check if there are users in the group
    cursor.execute('SELECT COUNT(*) FROM users WHERE group_id = ?', (group_id,))
    if cursor.fetchone()[0] > 0:
        return jsonify({'error': 'Cannot delete group with users. Remove all users from the group first.'}), 400
    
    # Check if there are documents in the group
    cursor.execute('SELECT COUNT(*) FROM documents WHERE group_id = ?', (group_id,))
    if cursor.fetchone()[0] > 0:
        return jsonify({'error': 'Cannot delete group with documents. Remove all documents from the group first.'}), 400
    
    # Delete group
    try:
        cursor.execute('DELETE FROM user_groups WHERE id = ?', (group_id,))
        conn.commit()
        
        return jsonify({'message': 'Group deleted successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
