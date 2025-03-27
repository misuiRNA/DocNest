/**
 * UI utilities
 */

// UI utilities
const ui = {
    // Main content element
    mainContent: document.getElementById('main-content'),
    
    // Set page title
    setTitle(title) {
        document.title = `${title} - 文档管理系统`;
    },
    
    // Set active navigation link
    setActiveNavLink(route) {
        // Remove active class from all links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current route link
        const activeLink = document.querySelector(`.nav-link[href="#${route}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    },
    
    // Render content
    render(content) {
        this.mainContent.innerHTML = content;
    },
    
    // Format date
    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Create element with attributes and children
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.substring(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Append children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        
        return element;
    },
    
    // Create a card element
    createCard(title, content) {
        return this.createElement('div', { className: 'card' }, [
            this.createElement('h2', { textContent: title }),
            content
        ]);
    },
    
    // Create a form group
    createFormGroup(labelText, inputElement, id) {
        const label = this.createElement('label', {
            className: 'form-label',
            for: id,
            textContent: labelText
        });
        
        return this.createElement('div', { className: 'form-group' }, [
            label,
            inputElement
        ]);
    },
    
    // Create a text input
    createTextInput(id, placeholder = '', value = '', type = 'text') {
        return this.createElement('input', {
            className: 'form-input',
            type,
            id,
            name: id,
            placeholder,
            value
        });
    },
    
    // Create a select input
    createSelectInput(id, options = [], selectedValue = '') {
        const select = this.createElement('select', {
            className: 'form-input',
            id,
            name: id
        });
        
        options.forEach(option => {
            const optionElement = this.createElement('option', {
                value: option.value,
                textContent: option.text
            });
            
            if (option.value === selectedValue) {
                optionElement.selected = true;
            }
            
            select.appendChild(optionElement);
        });
        
        return select;
    },
    
    // Create a button
    createButton(text, onClick, className = 'btn', icon = null) {
        const button = this.createElement('button', {
            className,
            type: 'button',
            onClick
        });
        
        if (icon) {
            button.appendChild(this.createElement('i', { className: icon }));
        }
        
        button.appendChild(document.createTextNode(text));
        
        return button;
    },
    
    // Create a table
    createTable(headers, rows, actions = null) {
        const thead = this.createElement('thead', {}, [
            this.createElement('tr', {}, headers.map(header => 
                this.createElement('th', { textContent: header })
            ))
        ]);
        
        const tbody = this.createElement('tbody');
        
        rows.forEach(row => {
            const tr = this.createElement('tr');
            
            row.forEach(cell => {
                tr.appendChild(this.createElement('td', { innerHTML: cell }));
            });
            
            if (actions) {
                const actionsCell = this.createElement('td');
                const actionsDiv = this.createElement('div', { className: 'table-actions' });
                
                actions.forEach(action => {
                    actionsDiv.appendChild(action);
                });
                
                actionsCell.appendChild(actionsDiv);
                tr.appendChild(actionsCell);
            }
            
            tbody.appendChild(tr);
        });
        
        return this.createElement('div', { className: 'table-container' }, [
            this.createElement('table', {}, [thead, tbody])
        ]);
    },
    
    // Create an empty state
    createEmptyState(icon, message, actionButton = null) {
        const emptyState = this.createElement('div', { className: 'empty-state' }, [
            this.createElement('i', { className: icon }),
            this.createElement('h3', { textContent: message })
        ]);
        
        if (actionButton) {
            emptyState.appendChild(actionButton);
        }
        
        return emptyState;
    },
    
    // Show loading state
    showLoading() {
        this.render(`
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin"></i>
                <h3>加载中...</h3>
            </div>
        `);
    },
    
    // Show error state
    showError(message, retryCallback = null) {
        const errorState = this.createElement('div', { className: 'empty-state' }, [
            this.createElement('i', { className: 'fas fa-exclamation-circle' }),
            this.createElement('h3', { textContent: message })
        ]);
        
        if (retryCallback) {
            errorState.appendChild(this.createButton('重试', retryCallback, 'btn', 'fas fa-redo'));
        }
        
        this.render('');
        this.mainContent.appendChild(errorState);
    }
};
