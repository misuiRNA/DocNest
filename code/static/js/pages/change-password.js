/**
 * Change password page
 */

const changePasswordPage = {
    // Render change password page
    render: async function() {
        // Set page title
        ui.setTitle('修改密码');
        
        // Create change password form
        const changePasswordForm = `
            <div class="card">
                <h2>修改密码</h2>
                <form id="change-password-form" class="login-form">
                    <div class="form-group">
                        <label for="current_password" class="form-label">当前密码</label>
                        <input type="password" id="current_password" name="current_password" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="new_password" class="form-label">新密码</label>
                        <input type="password" id="new_password" name="new_password" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="confirm_password" class="form-label">确认新密码</label>
                        <input type="password" id="confirm_password" name="confirm_password" class="form-input" required>
                    </div>
                    <button type="submit" class="btn">
                        <i class="fas fa-key"></i> 修改密码
                    </button>
                </form>
            </div>
        `;
        
        // Render change password form
        ui.render(changePasswordForm);
        
        // Add event listener to change password form
        document.getElementById('change-password-form').addEventListener('submit', this.handleChangePassword);
        
        // Focus current password input
        document.getElementById('current_password').focus();
    },
    
    // Handle change password form submission
    handleChangePassword: async function(event) {
        event.preventDefault();
        
        // Get form data
        const currentPassword = document.getElementById('current_password').value;
        const newPassword = document.getElementById('new_password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        
        // Validate form data
        if (!currentPassword || !newPassword || !confirmPassword) {
            showError('所有字段都是必填的');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showError('新密码和确认密码不匹配');
            return;
        }
        
        if (newPassword.length < 4) {
            showError('新密码长度不能少于 4 个字符');
            return;
        }
        
        try {
            // Show loading state
            const submitButton = event.target.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 修改中...';
            submitButton.disabled = true;
            
            // Change password
            await api.changePassword(currentPassword, newPassword);
            
            // Show success message
            showSuccess('密码修改成功');
            
            // Redirect to documents page
            window.location.hash = 'documents';
        } catch (error) {
            console.error('Change password error:', error);
            showError('修改密码失败: ' + error.message);
            
            // Reset form
            document.getElementById('current_password').value = '';
            document.getElementById('new_password').value = '';
            document.getElementById('confirm_password').value = '';
            document.getElementById('current_password').focus();
            
            // Reset button
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }
};
