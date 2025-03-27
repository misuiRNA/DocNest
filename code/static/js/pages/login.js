/**
 * Login page
 */

const loginPage = {
    // Render login page
    render: async function() {
        // Set page title
        ui.setTitle('登录');
        
        // Create login form
        const loginForm = `
            <div class="card">
                <h2>登录</h2>
                <form id="login-form" class="login-form">
                    <div class="form-group">
                        <label for="username" class="form-label">用户名</label>
                        <input type="text" id="username" name="username" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="password" class="form-label">密码</label>
                        <input type="password" id="password" name="password" class="form-input" required>
                    </div>
                    <button type="submit" class="btn">
                        <i class="fas fa-sign-in-alt"></i> 登录
                    </button>
                </form>
                <p style="margin-top: 2rem; text-align: center;">
                    <a href="#query" class="nav-link">
                        <i class="fas fa-search"></i> 查询文档
                    </a>
                </p>
            </div>
        `;
        
        // Render login form
        ui.render(loginForm);
        
        // Add event listener to login form
        document.getElementById('login-form').addEventListener('submit', this.handleLogin);
        
        // Focus username input
        document.getElementById('username').focus();
    },
    
    // Handle login form submission
    handleLogin: async function(event) {
        event.preventDefault();
        
        // Get form data
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Validate form data
        if (!username || !password) {
            showError('请输入用户名和密码');
            return;
        }
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        try {
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';
            submitButton.disabled = true;
            
            // Login
            await auth.login(username, password);
            
            // Show success message
            showSuccess('登录成功');
            
            // Redirect to documents page
            window.location.hash = 'documents';
        } catch (error) {
            console.error('Login error:', error);
            showError('登录失败: ' + error.message);
            
            // Reset form
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
            
            // Reset button
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }
};
