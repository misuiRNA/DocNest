/**
 * Authentication utilities
 */

// Current user
let currentUser = null;

// Auth utilities
const auth = {
    // Check if user is logged in
    isLoggedIn() {
        return !!currentUser;
    },
    
    // Get current user
    getCurrentUser() {
        return currentUser;
    },
    
    // Set current user
    setCurrentUser(user) {
        currentUser = user;
        
        // Update UI based on user role
        if (user) {
            // Show navigation
            document.getElementById('main-nav').style.display = 'block';
            
            // Show user dropdown
            const userDropdown = document.getElementById('user-dropdown');
            userDropdown.style.display = 'block';
            
            // Display username with role indicator
            let roleText = '';
            if (user.is_admin) {
                roleText = ' <span class="role-badge admin">管理员</span>';
            } else if (user.role === 'group_admin') {
                roleText = ' <span class="role-badge group-admin">组管理员</span>';
            }
            document.getElementById('username-display').innerHTML = user.username + roleText;
            
            // Show/hide navigation items based on user role
            const adminNavGroups = document.getElementById('admin-nav-groups');
            const adminNav = document.getElementById('admin-nav');
            
            // Groups management (admin only)
            if (user.is_admin) {
                adminNavGroups.style.display = 'block';
            } else {
                adminNavGroups.style.display = 'none';
            }
            
            // Users management (admin and group_admin)
            if (user.is_admin || user.role === 'group_admin') {
                adminNav.style.display = 'block';
            } else {
                adminNav.style.display = 'none';
            }
        } else {
            // Hide navigation and user dropdown
            document.getElementById('main-nav').style.display = 'none';
            document.getElementById('user-dropdown').style.display = 'none';
        }
    },
    
    // Login
    async login(username, password) {
        try {
            const data = await api.login(username, password);
            
            // Set token
            api.setToken(data.token);
            
            // Set current user
            this.setCurrentUser(data.user);
            
            return data;
        } catch (error) {
            throw error;
        }
    },
    
    // Logout
    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        // Clear token and user
        api.clearToken();
        this.setCurrentUser(null);
        
        // Redirect to login page
        window.location.hash = 'login';
    },
    
    // Verify token
    async verifyToken() {
        try {
            const data = await api.verifyToken();
            
            if (data.valid) {
                this.setCurrentUser(data.user);
                return true;
            } else {
                this.setCurrentUser(null);
                return false;
            }
        } catch (error) {
            console.error('Token verification error:', error);
            this.setCurrentUser(null);
            return false;
        }
    },
    
    // Check if user has admin role
    isAdmin() {
        return currentUser && currentUser.is_admin;
    },
    
    // Get user
    getUser() {
        return currentUser;
    },
    
    // Check if user has permission to access a route
    hasPermission(route) {
        // Public routes
        if (['login', 'query', 'mobile-query'].includes(route)) {
            return true;
        }
        
        // Authenticated routes
        if (!this.isLoggedIn()) {
            return false;
        }
        
        // Admin-only routes
        if (route === 'groups') {
            if (!this.isAdmin()) {
                return false;
            }
        }
        
        // Admin and group_admin routes
        if (route === 'users') {
            if (!this.isAdmin() && currentUser.role !== 'group_admin') {
                return false;
            }
        }
        
        return true;
    }
};

// Logout button event listener
document.getElementById('logout-btn').addEventListener('click', (event) => {
    event.preventDefault();
    auth.logout();
});
