/**
 * Users page
 */

const usersPage = {
    // Render users page
    render: async function() {
        // Set page title
        ui.setTitle('用户管理');
        
        try {
            // Get users
            const data = await api.getUsers();
            const users = data.users || [];
            
            // Get groups for user creation
            const groupsData = await api.getGroups();
            const groups = groupsData.groups || [];
            
            // Create page content
            let content = `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2>用户管理</h2>
                        <button class="btn" onclick="usersPage.showAddUserForm(${JSON.stringify(groups).replace(/"/g, '&quot;')})">
                            <i class="fas fa-user-plus"></i> 添加用户
                        </button>
                    </div>
            `;
            
            // Check if there are users
            if (users.length === 0) {
                content += `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>暂无用户</h3>
                        <button class="btn" onclick="usersPage.showAddUserForm(${JSON.stringify(groups).replace(/"/g, '&quot;')})">
                            <i class="fas fa-user-plus"></i> 添加用户
                        </button>
                    </div>
                `;
            } else {
                // Create table
                content += `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>用户名</th>
                                    <th>角色</th>
                                    <th>用户组</th>
                                    <th>创建者</th>
                                    <th>创建时间</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                // Add users to table
                users.forEach(user => {
                    content += `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.username}</td>
                            <td>${user.role === 'admin' ? '系统管理员' : (user.role === 'group_admin' ? '组管理员' : '普通用户')}</td>
                            <td>${user.group_name || '-'}</td>
                            <td>${user.created_by}</td>
                            <td>${ui.formatDate(user.created_at)}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn" title="编辑用户" onclick="usersPage.showEditUserForm(${user.id}, ${JSON.stringify(groups).replace(/"/g, '&quot;')})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    ${user.username !== 'admin' ? `
                                    <button class="btn btn-danger" title="删除用户" onclick="usersPage.deleteUser(${user.id}, '${user.username}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
                });
                
                content += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            content += `</div>`;
            
            // Render content
            ui.render(content);
        } catch (error) {
            console.error('Error loading users:', error);
            ui.showError('加载用户列表失败: ' + error.message, () => this.render());
        }
    },
    
    // Show add user form
    showAddUserForm: function(groups) {
        // Create form content
        const formContent = ui.createElement('div', {}, [
            ui.createFormGroup('用户名', ui.createTextInput('username', '请输入用户名'), 'username'),
            ui.createFormGroup('密码', ui.createTextInput('password', '请输入密码', '', 'password'), 'password'),
            ui.createFormGroup('角色', ui.createSelectInput('role', [
                { value: 'user', text: '普通用户' },
                { value: 'group_admin', text: '组管理员' },
                ...(auth.isAdmin() ? [{ value: 'admin', text: '系统管理员' }] : [])
            ], 'user'), 'role'),
            ui.createFormGroup('用户组', ui.createSelectInput('group_id', [
                { value: '', text: '-- 选择用户组 --' },
                ...groups.map(group => ({ value: group.id, text: group.group_name }))
            ]), 'group_id')
        ]);
        
        // Show form modal
        formModal('添加用户', formContent, (formData) => {
            const userData = {
                username: formData.get('username'),
                password: formData.get('password'),
                group_id: formData.get('group_id') || null,
                role: formData.get('role')
            };
            
            this.addUser(userData);
        }, '添加用户');
    },
    
    // Add user
    addUser: async function(userData) {
        try {
            // Get the role from the form
            const roleSelect = document.getElementById('role');
            if (roleSelect) {
                userData.role = roleSelect.value;
            }
            
            // Create user
            await api.createUser(userData);
            
            // Show success message
            showSuccess('用户添加成功');
            
            // Reload users
            this.render();
        } catch (error) {
            console.error('Error adding user:', error);
            showError('添加用户失败: ' + error.message);
        }
    },
    
    // Show edit user form
    showEditUserForm: async function(userId, groups) {
        try {
            // Get user
            const data = await api.getUser(userId);
            const user = data.user;
            
            // Create form content
            const formContent = ui.createElement('div', {}, [
                ui.createFormGroup('用户名', ui.createTextInput('username', '请输入用户名', user.username), 'username'),
                ui.createFormGroup('密码', ui.createTextInput('password', '请输入新密码（留空保持不变）', '', 'password'), 'password'),
                user.username !== 'admin' ? ui.createFormGroup('角色', ui.createSelectInput('role', [
                    { value: 'user', text: '普通用户' },
                    { value: 'group_admin', text: '组管理员' },
                    ...(auth.isAdmin() ? [{ value: 'admin', text: '系统管理员' }] : [])
                ], user.role || 'user'), 'role') : null,
                user.username !== 'admin' ? ui.createFormGroup('用户组', ui.createSelectInput('group_id', [
                    { value: '', text: '-- 选择用户组 --' },
                    ...groups.map(group => ({ value: group.id, text: group.group_name }))
                ], user.group_id), 'group_id') : null
            ].filter(Boolean));
            
            // Show form modal
            formModal('编辑用户', formContent, (formData) => {
                const userData = {
                    username: formData.get('username'),
                    password: formData.get('password') || undefined
                };
                
                if (user.username !== 'admin') {
                    userData.group_id = formData.get('group_id') || null;
                    userData.role = formData.get('role') || 'user';
                }
                
                this.updateUser(userId, userData);
            }, '保存修改');
        } catch (error) {
            console.error('Error loading user:', error);
            showError('加载用户信息失败: ' + error.message);
        }
    },
    
    // Update user
    updateUser: async function(userId, userData) {
        try {
            // Update user
            await api.updateUser(userId, userData);
            
            // Show success message
            showSuccess('用户更新成功');
            
            // Reload users
            this.render();
        } catch (error) {
            console.error('Error updating user:', error);
            showError('更新用户失败: ' + error.message);
        }
    },
    
    // Delete user
    deleteUser: function(userId, username) {
        // Show confirmation modal
        confirmModal(`确定要删除用户 "${username}" 吗？此操作不可撤销。`, async () => {
            try {
                // Delete user
                await api.deleteUser(userId);
                
                // Show success message
                showSuccess('用户删除成功');
                
                // Reload users
                this.render();
            } catch (error) {
                console.error('Error deleting user:', error);
                showError('删除用户失败: ' + error.message);
            }
        });
    }
};
