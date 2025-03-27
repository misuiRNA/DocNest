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
            document.getElementById('username-display').textContent = user.username;
            
            // Show admin-only navigation items if user is admin
            const adminNavGroups = document.getElementById('admin-nav-groups');
            if (user.is_admin) {
                adminNavGroups.style.display = 'block';
            } else {
                adminNavGroups.style.display = 'none';
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
    
    // Check if user has permission to access a route
    hasPermission(route) {
        // Public routes
        if (['login', 'query'].includes(route)) {
            return true;
        }
        
        // Authenticated routes
        if (!this.isLoggedIn()) {
            return false;
        }
        
        // Admin-only routes
        if (['groups'].includes(route) && !this.isAdmin()) {
            return false;
        }
        
        return true;
    }
};

// Logout button event listener
document.getElementById('logout-btn').addEventListener('click', (event) => {
    event.preventDefault();
    auth.logout();
});
