/**
 * Groups page
 */

const groupsPage = {
    // Render groups page
    render: async function() {
        // Set page title
        ui.setTitle('用户组管理');
        
        try {
            // Check if user has permission to view groups
            if (!auth.isAdmin() && auth.getUser().role !== 'group_admin') {
                ui.render(`
                    <div class="card">
                        <div class="empty-state">
                            <i class="fas fa-lock"></i>
                            <h3>权限不足</h3>
                            <p>您没有权限查看用户组列表</p>
                        </div>
                    </div>
                `);
                return;
            }
            
            // Get groups
            const data = await api.getGroups();
            const groups = data.groups || [];
            
            // Create page content
            let content = `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2>用户组管理</h2>
                        <button class="btn" onclick="groupsPage.showAddGroupForm()">
                            <i class="fas fa-users-cog"></i> 添加用户组
                        </button>
                    </div>
            `;
            
            // Check if there are groups
            if (groups.length === 0) {
                content += `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>暂无用户组</h3>
                        <button class="btn" onclick="groupsPage.showAddGroupForm()">
                            <i class="fas fa-users-cog"></i> 添加用户组
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
                                    <th>用户组名称</th>
                                    <th>描述</th>
                                    <th>创建者</th>
                                    <th>创建时间</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                // Add groups to table
                groups.forEach(group => {
                    content += `
                        <tr>
                            <td>${group.id}</td>
                            <td>${group.group_name}</td>
                            <td>${group.description || '-'}</td>
                            <td>${group.created_by}</td>
                            <td>${ui.formatDate(group.created_at)}</td>
                            <td>
                                <div class="table-actions">
                                    <a href="#groups?id=${group.id}" class="btn" title="查看用户组详情">
                                        <i class="fas fa-eye"></i>
                                    </a>
                                    <button class="btn" title="编辑用户组" onclick="groupsPage.showEditGroupForm(${group.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    ${auth.isAdmin() ? `
                                    <button class="btn btn-danger" title="删除用户组" onclick="groupsPage.deleteGroup(${group.id}, '${group.group_name}')">
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
            console.error('Error loading groups:', error);
            ui.showError('加载用户组列表失败: ' + error.message, () => this.render());
        }
    },
    
    // Show add group form
    showAddGroupForm: function() {
        // Create form content
        const formContent = ui.createElement('div', {}, [
            ui.createFormGroup('用户组名称', ui.createTextInput('group_name', '请输入用户组名称'), 'group_name'),
            ui.createFormGroup('描述', ui.createTextInput('description', '请输入用户组描述（可选）'), 'description')
        ]);
        
        // Show form modal
        formModal('添加用户组', formContent, (formData) => {
            const groupData = {
                group_name: formData.get('group_name'),
                description: formData.get('description') || ''
            };
            
            this.addGroup(groupData);
        }, '添加用户组');
    },
    
    // Add group
    addGroup: async function(groupData) {
        try {
            // Create group
            await api.createGroup(groupData);
            
            // Show success message
            showSuccess('用户组添加成功');
            
            // Reload groups
            this.render();
        } catch (error) {
            console.error('Error adding group:', error);
            showError('添加用户组失败: ' + error.message);
        }
    },
    
    // Show edit group form
    showEditGroupForm: async function(groupId) {
        try {
            // Get group
            const data = await api.getGroup(groupId);
            const group = data.group;
            
            // Create form content
            const formContent = ui.createElement('div', {}, [
                ui.createFormGroup('用户组名称', ui.createTextInput('group_name', '请输入用户组名称', group.group_name), 'group_name'),
                ui.createFormGroup('描述', ui.createTextInput('description', '请输入用户组描述（可选）', group.description || ''), 'description')
            ]);
            
            // Show form modal
            formModal('编辑用户组', formContent, (formData) => {
                const groupData = {
                    group_name: formData.get('group_name'),
                    description: formData.get('description') || ''
                };
                
                this.updateGroup(groupId, groupData);
            }, '保存修改');
        } catch (error) {
            console.error('Error loading group:', error);
            showError('加载用户组信息失败: ' + error.message);
        }
    },
    
    // Update group
    updateGroup: async function(groupId, groupData) {
        try {
            // Update group
            await api.updateGroup(groupId, groupData);
            
            // Show success message
            showSuccess('用户组更新成功');
            
            // Reload groups
            this.render();
        } catch (error) {
            console.error('Error updating group:', error);
            showError('更新用户组失败: ' + error.message);
        }
    },
    
    // Delete group
    deleteGroup: function(groupId, groupName) {
        // Show confirmation modal
        confirmModal(`确定要删除用户组 "${groupName}" 吗？此操作不可撤销。`, async () => {
            try {
                // Delete group
                await api.deleteGroup(groupId);
                
                // Show success message
                showSuccess('用户组删除成功');
                
                // Reload groups
                this.render();
            } catch (error) {
                console.error('Error deleting group:', error);
                showError('删除用户组失败: ' + error.message);
            }
        });
    },
    
    // View group details
    viewGroupDetails: async function(params) {
        // Check if group ID is provided
        if (!params || !params.id) {
            ui.showError('未提供用户组 ID');
            return;
        }
        
        const groupId = params.id;
        
        try {
            // Get group details
            const data = await api.getGroup(groupId);
            const group = data.group;
            const users = data.users || [];
            
            // Create view content
            const viewContent = `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2>${group.group_name}</h2>
                        <div>
                            <button class="btn" onclick="groupsPage.showEditGroupForm(${group.id})">
                                <i class="fas fa-edit"></i> 编辑用户组
                            </button>
                            ${auth.isAdmin() ? `
                            <button class="btn btn-danger" onclick="groupsPage.deleteGroup(${group.id}, '${group.group_name}')">
                                <i class="fas fa-trash"></i> 删除用户组
                            </button>
                            ` : ''}
                            <a href="#groups" class="btn">
                                <i class="fas fa-arrow-left"></i> 返回列表
                            </a>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 2rem;">
                        <h3>用户组信息</h3>
                        <div style="margin: 1rem 0; padding: 1.5rem; background-color: var(--light-color); border-radius: 4px;">
                            <div style="margin-bottom: 1rem;">
                                <strong>ID：</strong> ${group.id}
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <strong>名称：</strong> ${group.group_name}
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <strong>描述：</strong> ${group.description || '-'}
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <strong>创建者：</strong> ${group.created_by}
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <strong>创建时间：</strong> ${ui.formatDate(group.created_at)}
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3>用户组成员</h3>
                            <button class="btn" onclick="usersPage.showAddUserForm([${JSON.stringify(group).replace(/"/g, '&quot;')}])">
                                <i class="fas fa-user-plus"></i> 添加用户
                            </button>
                        </div>
                        
                        ${users.length === 0 ? `
                            <div class="empty-state">
                                <i class="fas fa-users"></i>
                                <h3>暂无用户</h3>
                                <button class="btn" onclick="usersPage.showAddUserForm([${JSON.stringify(group).replace(/"/g, '&quot;')}])">
                                    <i class="fas fa-user-plus"></i> 添加用户
                                </button>
                            </div>
                        ` : `
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>用户名</th>
                                            <th>创建者</th>
                                            <th>创建时间</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${users.map(user => `
                                            <tr>
                                                <td>${user.id}</td>
                                                <td>${user.username}</td>
                                                <td>${user.created_by}</td>
                                                <td>${ui.formatDate(user.created_at)}</td>
                                                <td>
                                                    <div class="table-actions">
                                                        <button class="btn" title="编辑用户" onclick="usersPage.showEditUserForm(${user.id}, [${JSON.stringify(group).replace(/"/g, '&quot;')}])">
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
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>
            `;
            
            // Render view content
            ui.render(viewContent);
        } catch (error) {
            console.error('Error loading group details:', error);
            ui.showError('加载用户组详情失败: ' + error.message);
        }
    }
};
