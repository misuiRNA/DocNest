/**
 * API Client
 */

// API base URL
const API_BASE_URL = '/api';

// API endpoints
const API_ENDPOINTS = {
    // Auth
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    VERIFY_TOKEN: '/auth/verify',
    CHANGE_PASSWORD: '/auth/change-password',
    
    // Users
    USERS: '/users',
    USER: (id) => `/users/${id}`,
    
    // Groups
    GROUPS: '/groups',
    GROUP: (id) => `/groups/${id}`,
    
    // Documents
    DOCUMENTS: '/documents',
    DOCUMENT: (id) => `/documents/${id}`,
    DOCUMENT_VIEW: (id) => `/documents/${id}/view`,
    DOCUMENT_QRCODE: (id) => `/documents/${id}/qrcode`,
    DOCUMENT_QUERY: '/documents/query'
};

// API client
const api = {
    // Token storage
    _token: null,
    
    // Set token
    setToken(token) {
        this._token = token;
        localStorage.setItem('auth_token', token);
    },
    
    // Get token
    getToken() {
        if (!this._token) {
            this._token = localStorage.getItem('auth_token');
        }
        return this._token;
    },
    
    // Clear token
    clearToken() {
        this._token = null;
        localStorage.removeItem('auth_token');
    },
    
    // Get headers
    getHeaders(includeContentType = true) {
        const headers = {};
        
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    },
    
    // Handle response
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    },
    
    // API methods
    
    // Auth
    async login(username, password) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.LOGIN, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ username, password })
        });
        
        return this.handleResponse(response);
    },
    
    async logout() {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.LOGOUT, {
            method: 'POST',
            headers: this.getHeaders()
        });
        
        this.clearToken();
        return this.handleResponse(response);
    },
    
    async verifyToken() {
        const token = this.getToken();
        if (!token) {
            return { valid: false };
        }
        
        try {
            const response = await fetch(API_BASE_URL + API_ENDPOINTS.VERIFY_TOKEN, {
                method: 'GET',
                headers: this.getHeaders()
            });
            
            return this.handleResponse(response);
        } catch (error) {
            this.clearToken();
            return { valid: false };
        }
    },
    
    async changePassword(currentPassword, newPassword) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.CHANGE_PASSWORD, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        });
        
        return this.handleResponse(response);
    },
    
    // Users
    async getUsers() {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.USERS, {
            method: 'GET',
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    },
    
    async getUser(id) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.USER(id), {
            method: 'GET',
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    },
    
    async createUser(userData) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.USERS, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(userData)
        });
        
        return this.handleResponse(response);
    },
    
    async updateUser(id, userData) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.USER(id), {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(userData)
        });
        
        return this.handleResponse(response);
    },
    
    async deleteUser(id) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.USER(id), {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    },
    
    // Groups
    async getGroups() {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.GROUPS, {
            method: 'GET',
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    },
    
    async getGroup(id) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.GROUP(id), {
            method: 'GET',
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    },
    
    async createGroup(groupData) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.GROUPS, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(groupData)
        });
        
        return this.handleResponse(response);
    },
    
    async updateGroup(id, groupData) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.GROUP(id), {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(groupData)
        });
        
        return this.handleResponse(response);
    },
    
    async deleteGroup(id) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.GROUP(id), {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    },
    
    // Documents
    async getDocuments() {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.DOCUMENTS, {
            method: 'GET',
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    },
    
    async getDocument(id) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.DOCUMENT(id), {
            method: 'GET',
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    },
    
    async uploadDocument(formData) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.DOCUMENTS, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: formData
        });
        
        return this.handleResponse(response);
    },
    
    async deleteDocument(id) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.DOCUMENT(id), {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    },
    
    async toggleDocumentVisibility(id) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.DOCUMENT(id) + '/visibility', {
            method: 'PUT',
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    },
    
    async queryDocument(fileNumber, inspectionDate) {
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.DOCUMENT_QUERY, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ file_number: fileNumber, inspection_date: inspectionDate })
        });
        
        return this.handleResponse(response);
    },

    // Generate QR code
    async generateQRCode(text) {
        try {
            const response = await fetch('/api/qrcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate QR code');
            }
            
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error('QR code generation error:', error);
            throw error;
        }
    }
};
