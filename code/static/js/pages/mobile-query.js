/**
 * Mobile Query page
 */

const mobileQueryPage = {
    // Render mobile query page
    render: async function() {
        // Set page title
        ui.setTitle('文档查询');
        
        // Create mobile query form
        const queryForm = `
            <div class="mobile-query-container">
                <div class="card">
                    <h2>文档查询</h2>
                    <form id="query-form">
                        <div class="form-group">
                            <label for="file_number" class="form-label">文件编号</label>
                            <input type="text" id="file_number" name="file_number" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="inspection_date" class="form-label">检测日期</label>
                            <div class="date-input-container">
                                <input type="text" id="inspection_date" name="inspection_date" class="form-input" placeholder="YYYY-MM-DD" required>
                                <button type="button" class="calendar-toggle-btn">
                                    <i class="fas fa-calendar-alt"></i>
                                </button>
                                <div class="calendar-panel" id="calendar-panel"></div>
                            </div>
                        </div>
                        <button type="submit" class="btn">
                            <i class="fas fa-search"></i> 查询文档
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        // Render query form
        ui.render(queryForm);
        
        // Add event listener to query form
        document.getElementById('query-form').addEventListener('submit', this.handleQuery.bind(this));
        
        // Focus file number input
        document.getElementById('file_number').focus();

        // Initialize date picker
        this.initDatePicker('inspection_date');
        
        // Add mobile-specific styles
        this.addMobileStyles();
    },
    
    // Handle query form submission
    handleQuery: async function(event) {
        event.preventDefault();
        
        // Get form data
        const fileNumber = document.getElementById('file_number').value;
        const inspectionDate = document.getElementById('inspection_date').value;
        
        // Validate form data
        if (!fileNumber) {
            showError('请输入文件编号');
            return;
        }
        
        if (!inspectionDate) {
            showError('请选择检测日期');
            return;
        }
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        try {
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 查询中...';
            submitButton.disabled = true;
            
            // Query document
            const data = await api.queryDocument(fileNumber, inspectionDate);
            
            // Show document details and PDF
            this.showDocumentDetails(data.document);
        } catch (error) {
            console.error('Query error:', error);
            showError('查询失败: ' + error.message);
            
            // Reset button
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    },
    
    // Show document details
    showDocumentDetails: function(document) {
        // Hide main header
        const header = window.document.querySelector('.header');
        if (header) {
            header.style.display = 'none';
        }
        
        // Create document details content
        const documentDetails = `
            <div class="mobile-document-container">
                <div class="document-header">
                    <div class="header-content">
                        <h1>DocNest 文档查看器</h1>
                        <div class="document-meta">
                            <div class="meta-item">
                                <i class="fas fa-file-alt"></i>
                                <span>${document.original_filename}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-hashtag"></i>
                                <span>${document.file_number}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>${document.inspection_date}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="document-content">
                    <div id="loading" class="loading">
                        <p>正在加载文档...</p>
                    </div>
                    <div id="error-container" class="error-message" style="display: none;">
                        <p id="error-message">加载文档时出错</p>
                    </div>
                    <div id="pdf-container" class="pdf-container" style="display: none;">
                        <div id="pdf-viewer">
                            <div id="canvas-container" class="canvas-container"></div>
                        </div>
                    </div>
                </div>
                
                <div class="document-footer">
                    <button onclick="mobileQueryPage.render()" class="btn">
                        <i class="fas fa-search"></i> 重新查询
                    </button>
                </div>
            </div>
        `;
        
        // Render document details
        ui.render(documentDetails);
        
        // Load and render PDF
        this.loadPDF(document.view_url);
    },

    // Load and render PDF
    loadPDF: function(url) {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('pdf-container').style.display = 'none';
        document.getElementById('error-container').style.display = 'none';

        pdfjsLib.getDocument(url).promise.then(function(pdf) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('pdf-container').style.display = 'flex';

            const canvasContainer = document.getElementById('canvas-container');
            canvasContainer.innerHTML = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const placeholder = document.createElement('div');
                placeholder.className = 'page-placeholder';
                placeholder.id = `placeholder-${i}`;
                placeholder.dataset.page = i;
                placeholder.innerText = `加载页面 ${i}...`;
                canvasContainer.appendChild(placeholder);
            }

            this.setupLazyLoading(pdf);
        }.bind(this)).catch(function(error) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error-container').style.display = 'block';
            document.getElementById('error-message').textContent = `加载PDF时出错: ${error.message}`;
        });
    },

    // Setup lazy loading for PDF pages
    setupLazyLoading: function(pdf) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const pageNum = parseInt(entry.target.dataset.page);
                    this.renderPage(pdf, pageNum);
                }
            });
        }, { root: document.getElementById('pdf-viewer'), threshold: 0.2 });

        document.querySelectorAll('.page-placeholder').forEach(placeholder => {
            observer.observe(placeholder);
        });
    },

    // Render a single PDF page
    renderPage: function(pdf, num) {
        if (document.getElementById(`page-canvas-${num}`)) {
            return;
        }

        pdf.getPage(num).then(function(page) {
            const viewport = page.getViewport({ scale: 1.5 });
            const containerWidth = document.getElementById('pdf-viewer').clientWidth - 40;
            const dpr = window.devicePixelRatio || 1;
            const adjustedScale = Math.max(containerWidth / viewport.width, 1.5);
            const scaledViewport = page.getViewport({ scale: adjustedScale * dpr });

            const canvas = document.createElement('canvas');
            canvas.className = 'page-canvas';
            canvas.id = `page-canvas-${num}`;
            canvas.dataset.page = num;
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            canvas.style.width = `${scaledViewport.width / dpr}px`;
            canvas.style.height = `${scaledViewport.height / dpr}px`;

            const placeholder = document.getElementById(`placeholder-${num}`);
            if (placeholder) {
                placeholder.replaceWith(canvas);
            }

            const context = canvas.getContext('2d');
            page.render({ canvasContext: context, viewport: scaledViewport });
        });
    },

    // Initialize date picker
    initDatePicker: function(inputId) {
        const dateInput = document.getElementById(inputId);
        const calendarToggleBtn = dateInput.parentElement.querySelector('.calendar-toggle-btn');
        const calendarPanel = document.getElementById('calendar-panel');
        
        // Current selected date
        let currentDate = new Date();
        let selectedDate = null;
        
        // Format date as YYYY-MM-DD
        const formatDate = function(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        // Parse date string
        const parseDate = function(dateStr) {
            if (!dateStr) return null;
            
            // Try to parse YYYY-MM-DD format
            const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
            if (match) {
                const year = parseInt(match[1], 10);
                const month = parseInt(match[2], 10) - 1;
                const day = parseInt(match[3], 10);
                
                // Validate date
                const date = new Date(year, month, day);
                if (
                    date.getFullYear() === year &&
                    date.getMonth() === month &&
                    date.getDate() === day
                ) {
                    return date;
                }
            }
            
            return null;
        };
        
        // Render calendar
        const renderCalendar = function() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Get first and last day of month
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Get first day of week (0-6, 0 is Sunday)
            const firstDayOfWeek = firstDay.getDay();
            
            // Get last day of previous month
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            
            // Calendar header
            let calendarHTML = `
                <div class="calendar-header">
                    <div class="calendar-title">
                        <span class="current-month">${month + 1}月</span>
                        <span class="current-year">${year}年</span>
                    </div>
                    <div class="calendar-nav">
                        <button type="button" class="prev-month"><i class="fas fa-chevron-left"></i></button>
                        <button type="button" class="next-month"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
                <div class="year-selector">
                    ${Array.from({length: 30}, (_, i) => {
                        const yearValue = year - 15 + i;
                        return `<span class="year-option ${yearValue === year ? 'selected' : ''}" data-year="${yearValue}">${yearValue}</span>`;
                    }).join('')}
                </div>
                <div class="calendar-grid">
                    <div class="calendar-day-header">日</div>
                    <div class="calendar-day-header">一</div>
                    <div class="calendar-day-header">二</div>
                    <div class="calendar-day-header">三</div>
                    <div class="calendar-day-header">四</div>
                    <div class="calendar-day-header">五</div>
                    <div class="calendar-day-header">六</div>
            `;
            
            // Fill calendar grid
            let day = 1;
            const today = new Date();
            const todayFormatted = formatDate(today);
            
            // Calculate number of rows needed
            const totalDays = firstDayOfWeek + lastDay.getDate();
            const rows = Math.ceil(totalDays / 7);
            
            for (let i = 0; i < rows * 7; i++) {
                // Previous month days
                if (i < firstDayOfWeek) {
                    const prevMonthDay = prevMonthLastDay - (firstDayOfWeek - i - 1);
                    calendarHTML += `<div class="calendar-day other-month">${prevMonthDay}</div>`;
                }
                // Current month days
                else if (day <= lastDay.getDate()) {
                    const date = new Date(year, month, day);
                    const dateFormatted = formatDate(date);
                    
                    let classes = "calendar-day";
                    if (dateFormatted === todayFormatted) {
                        classes += " today";
                    }
                    if (selectedDate && dateFormatted === formatDate(selectedDate)) {
                        classes += " selected";
                    }
                    
                    calendarHTML += `<div class="calendar-day ${classes}" data-date="${dateFormatted}">${day}</div>`;
                    day++;
                }
                // Next month days
                else {
                    const nextMonthDay = i - (firstDayOfWeek + lastDay.getDate()) + 1;
                    calendarHTML += `<div class="calendar-day other-month">${nextMonthDay}</div>`;
                }
            }
            
            calendarHTML += `</div>`;
            calendarPanel.innerHTML = calendarHTML;
            
            // Add event listeners
            // Month navigation buttons
            const prevMonthBtn = calendarPanel.querySelector('.prev-month');
            const nextMonthBtn = calendarPanel.querySelector('.next-month');
            
            prevMonthBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });
            
            nextMonthBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });
            
            // Year selection
            calendarPanel.querySelectorAll('.year-option').forEach(yearOption => {
                yearOption.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const selectedYear = parseInt(this.getAttribute('data-year'), 10);
                    currentDate.setFullYear(selectedYear);
                    renderCalendar();
                });
            });
            
            // Toggle year selector
            const yearSelector = calendarPanel.querySelector('.year-selector');
            const calendarTitle = calendarPanel.querySelector('.calendar-title');
            
            calendarTitle.addEventListener('click', function(e) {
                e.stopPropagation();
                yearSelector.classList.toggle('active');
            });
            
            // Date selection
            calendarPanel.querySelectorAll('.calendar-day:not(.other-month)').forEach(dayElement => {
                dayElement.addEventListener('click', function() {
                    const dateStr = this.getAttribute('data-date');
                    selectedDate = parseDate(dateStr);
                    dateInput.value = dateStr;
                    calendarPanel.classList.remove('active');
                    
                    // Trigger change event
                    const event = new Event('change', { bubbles: true });
                    dateInput.dispatchEvent(event);
                    
                    // Remove error style
                    dateInput.style.borderColor = '';
                });
            });
        };
        
        // Show/hide calendar panel
        calendarToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (calendarPanel.classList.contains('active')) {
                calendarPanel.classList.remove('active');
            } else {
                // Set current date to input value if exists
                if (dateInput.value) {
                    const parsedDate = parseDate(dateInput.value);
                    if (parsedDate) {
                        currentDate = new Date(parsedDate);
                        selectedDate = parsedDate;
                    }
                }
                
                renderCalendar();
                calendarPanel.classList.add('active');
            }
        });
        
        // Show calendar on input click
        dateInput.addEventListener('click', function(e) {
            if (!calendarPanel.classList.contains('active')) {
                calendarToggleBtn.click();
            }
        });
        
        // Close calendar on outside click
        document.addEventListener('click', function(e) {
            if (!calendarPanel.contains(e.target) && 
                e.target !== calendarToggleBtn && 
                e.target !== dateInput) {
                calendarPanel.classList.remove('active');
            }
        });
        
        // Date input formatting
        dateInput.addEventListener('input', function(e) {
            let value = dateInput.value;
            
            // Remove non-digits and hyphens
            value = value.replace(/[^\d-]/g, '');
            
            // Auto-add hyphens
            if (value.length === 4 && !value.includes('-')) {
                value += '-';
            } else if (value.length === 7 && value.lastIndexOf('-') === 4) {
                value += '-';
            }
            
            // Limit length
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            
            // Update input value
            if (value !== dateInput.value) {
                dateInput.value = value;
            }
            
            // Validate format
            const isValid = /^\d{4}-\d{2}-\d{2}$/.test(value);
            if (!isValid && value.length > 0) {
                dateInput.style.borderColor = 'red';
            } else if (isValid) {
                // Validate date
                const parsedDate = parseDate(value);
                if (parsedDate) {
                    dateInput.style.borderColor = '';
                    selectedDate = parsedDate;
                    
                    // Update calendar if open
                    if (calendarPanel.classList.contains('active')) {
                        currentDate = new Date(parsedDate);
                        renderCalendar();
                    }
                } else {
                    dateInput.style.borderColor = 'red';
                }
            } else {
                dateInput.style.borderColor = '';
            }
        });
        
        // Format on blur
        dateInput.addEventListener('blur', function() {
            const value = dateInput.value;
            if (value) {
                const parsedDate = parseDate(value);
                if (parsedDate) {
                    dateInput.value = formatDate(parsedDate);
                    dateInput.style.borderColor = '';
                }
            }
        });
    },

    // Add mobile-specific styles
    addMobileStyles: function() {
        const style = document.createElement('style');
        style.textContent = `
            /* Mobile-specific styles */
            .mobile-document-container {
                display: flex;
                flex-direction: column;
                height: 100vh;
                background-color: #f5f5f5;
            }
            
            .document-header {
                background-color: #2196F3;
                color: white;
                padding: 8px 15px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .header-content {
                max-width: 600px;
                margin: 0 auto;
            }
            
            .header-content h1 {
                font-size: 20px;
                margin: 0 0 8px 0;
                text-align: center;
            }
            
            .document-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                font-size: 12px;
                justify-content: center;
            }
            
            .meta-item {
                display: flex;
                align-items: center;
                gap: 5px;
                background-color: rgba(255, 255, 255, 0.1);
                padding: 4px 8px;
                border-radius: 4px;
            }
            
            .meta-item i {
                font-size: 12px;
            }
            
            .document-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                padding: 5px;
            }
            
            .pdf-container {
                flex: 1;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                padding: 5px;
                overflow: hidden;
            }
            
            #pdf-viewer {
                flex: 1;
                overflow-y: auto;
                background-color: #f9f9f9;
                height: 100%;
                position: relative;
                padding: 0 5px;
            }
            
            .canvas-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                padding: 5px 0;
            }
            
            .page-canvas {
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                background: white;
                width: 100% !important;
                height: auto !important;
            }
            
            .page-placeholder {
                width: 100%;
                height: 800px;
                background: #f0f0f0;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #999;
            }
            
            .document-footer {
                padding: 10px 15px;
                background-color: white;
                box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
            }
            
            .btn {
                width: 100%;
                padding: 10px;
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .loading {
                text-align: center;
                padding: 2rem;
                color: #666;
            }
            
            .error-message {
                text-align: center;
                padding: 2rem;
                color: #f44336;
            }
            
            /* Media Queries for mobile responsiveness */
            @media (max-width: 600px) {
                .document-header {
                    padding: 8px 10px;
                }
                
                .header-content h1 {
                    font-size: 16px;
                }
                
                .document-meta {
                    gap: 8px;
                }
                
                .meta-item {
                    padding: 3px 6px;
                    font-size: 11px;
                }
                
                .document-footer {
                    padding: 8px 10px;
                }
                
                .pdf-container {
                    padding: 2px;
                }
                
                #pdf-viewer {
                    padding: 0 2px;
                }
            }
            
            /* Calendar styles */
            .date-input-container {
                position: relative;
                display: flex;
                align-items: center;
            }
            
            .calendar-toggle-btn {
                position: absolute;
                right: 10px;
                background: none;
                border: none;
                color: var(--primary-color);
                cursor: pointer;
                padding: 0;
                font-size: 1rem;
            }
            
            .calendar-panel {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                z-index: 1000;
                background: white;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                padding: 10px;
                width: 300px;
                margin-top: 5px;
            }
            
            .calendar-panel.active {
                display: block;
            }
            
            .calendar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            }
            
            .calendar-title {
                font-weight: bold;
                cursor: pointer;
                padding: 5px 10px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .calendar-title:hover {
                background-color: rgba(0, 123, 255, 0.1);
            }
            
            .current-month {
                font-size: 1.1rem;
                margin-right: 5px;
            }
            
            .current-year {
                font-size: 1.1rem;
                color: var(--primary-color);
            }
            
            .calendar-nav {
                display: flex;
                gap: 10px;
            }
            
            .calendar-nav button {
                background: none;
                border: none;
                cursor: pointer;
                color: var(--primary-color);
                font-size: 1rem;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s;
            }
            
            .calendar-nav button:hover {
                background-color: rgba(0, 123, 255, 0.1);
            }
            
            .year-selector {
                display: none;
                grid-template-columns: repeat(5, 1fr);
                gap: 5px;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
                max-height: 150px;
                overflow-y: auto;
                scrollbar-width: thin;
            }
            
            .year-selector.active {
                display: grid;
            }
            
            .year-option {
                text-align: center;
                padding: 5px;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
            }
            
            .year-option:hover {
                background-color: rgba(0, 123, 255, 0.1);
            }
            
            .year-option.selected {
                background-color: var(--primary-color);
                color: white;
            }
            
            .calendar-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 5px;
            }
            
            .calendar-day-header {
                text-align: center;
                font-weight: bold;
                font-size: 0.8rem;
                color: var(--gray-color);
            }
            
            .calendar-day {
                text-align: center;
                padding: 5px;
                cursor: pointer;
                border-radius: 4px;
            }
            
            .calendar-day:hover {
                background-color: rgba(0, 123, 255, 0.1);
            }
            
            .calendar-day.today {
                border: 1px solid var(--primary-color);
            }
            
            .calendar-day.selected {
                background-color: var(--primary-color);
                color: white;
            }
            
            .calendar-day.other-month {
                color: #ccc;
            }
        `;
        document.head.appendChild(style);
    }
}; 