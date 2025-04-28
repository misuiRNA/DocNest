/**
 * Main application
 */

// Page modules
const pages = {
    login: loginPage,
    documents: documentsPage,
    upload: uploadPage,
    query: queryPage,
    'mobile-query': mobileQueryPage,
    view: viewPage,
    users: usersPage,
    groups: groupsPage,
    'change-password': changePasswordPage
};

// Default route
const DEFAULT_ROUTE = 'documents';
const PUBLIC_ROUTES = ['login', 'query', 'mobile-query'];

// Current route
let currentRoute = '';

// Route to page
async function route(path) {
    // Parse route and params
    let [route, params] = path.split('?');
    
    // Default route
    if (!route) {
        route = DEFAULT_ROUTE;
    }
    
    // Check if page exists
    if (!pages[route]) {
        showError('页面不存在');
        return;
    }
    
    // Skip permission check for public routes
    if (!PUBLIC_ROUTES.includes(route)) {
        // Check if user has permission to access route
        if (!auth.hasPermission(route)) {
            // Redirect to login page if not logged in
            if (!auth.isLoggedIn()) {
                window.location.hash = 'login';
            } else {
                showError('您没有权限访问此页面');
            }
            return;
        }
    }
    
    // Parse query params
    const queryParams = {};
    if (params) {
        params.split('&').forEach(param => {
            const [key, value] = param.split('=');
            queryParams[key] = decodeURIComponent(value);
        });
    }
    
    try {
        // Show loading state
        ui.showLoading();
        
        // Render page
        await pages[route].render(queryParams);
        
        // Update current route
        currentRoute = route;
        
        // Update active navigation link
        ui.setActiveNavLink(route);
    } catch (error) {
        console.error('Error rendering page:', error);
        ui.showError('加载页面时出错: ' + error.message);
    }
}

// Handle hash change
window.addEventListener('hashchange', () => {
    const path = window.location.hash.substring(1);
    route(path);
});

// Initialize app
async function initApp() {
    try {
        // Verify token
        const isLoggedIn = await auth.verifyToken();
        
        // Get initial route
        let initialRoute = window.location.hash.substring(1);
        
        // If not logged in and trying to access protected route, redirect to login
        if (!isLoggedIn && initialRoute && !PUBLIC_ROUTES.includes(initialRoute.split('?')[0])) {
            window.location.hash = 'login';
            return;
        }
        
        // If logged in and on login page, redirect to default route
        if (isLoggedIn && initialRoute === 'login') {
            window.location.hash = DEFAULT_ROUTE;
            return;
        }
        
        // Route to initial path
        if (initialRoute) {
            route(initialRoute);
        } else {
            // Route to default page
            window.location.hash = isLoggedIn ? DEFAULT_ROUTE : 'login';
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        ui.showError('初始化应用程序时出错: ' + error.message);
    }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
