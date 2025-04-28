/**
 * Upload page
 */

const uploadPage = {
    // Render upload page
    render: async function() {
        // Set page title
        ui.setTitle('上传文档');
        
        // Create upload form
        const uploadForm = `
            <div class="card">
                <h2>上传文档</h2>
                <form id="upload-form">
                    <div class="form-group">
                        <label for="file_number" class="form-label">报告编号</label>
                        <input type="text" id="file_number" name="file_number" class="form-input" required>
                        <small style="color: var(--gray-color);">报告编号只能包含字母、数字和 -_+ 符号</small>
                    </div>
                    <div class="form-group">
                        <label for="inspection_date" class="form-label">检测日期</label>
                        <div class="date-input-container">
                            <input type="text" id="inspection_date" name="inspection_date" class="form-input" placeholder="YYYY-MM-DD" required autocomplete="off">
                            <button type="button" class="calendar-toggle-btn">
                                <i class="fas fa-calendar-alt"></i>
                            </button>
                            <div class="calendar-panel" id="calendar-panel"></div>
                        </div>
                    </div>
                    <div class="file-input-container">
                        <label for="file" class="file-input-label">
                            <i class="fas fa-file-pdf"></i>
                            <span>点击或拖拽PDF文件到此处</span>
                            <span class="file-name" id="file-name"></span>
                        </label>
                        <input type="file" name="file" id="file" class="file-input" accept=".pdf">
                    </div>
                    <button type="submit" class="btn">
                        <i class="fas fa-upload"></i> 上传文档
                    </button>
                </form>
            </div>
        `;
        
        // Render upload form
        ui.render(uploadForm);
        
        // Add event listener to upload form
        document.getElementById('upload-form').addEventListener('submit', this.handleUpload.bind(this));
        
        // Add event listener to file input to display file name when selected
        document.getElementById('file').addEventListener('change', function(e) {
            const fileInputContainer = document.querySelector('.file-input-container');
            const fileNameElement = document.getElementById('file-name');
            const fileInputLabel = document.querySelector('.file-input-label');
            
            if (e.target.files[0]) {
                const fileName = e.target.files[0].name;
                fileNameElement.textContent = fileName;
                
                // Add visual indication that file is selected
                fileInputContainer.classList.add('file-selected');
                fileInputLabel.innerHTML = `
                    <i class="fas fa-file-pdf" style="color: var(--primary-color);"></i>
                    <span>已选择文件:</span>
                    <span class="file-name" id="file-name" style="font-weight: bold; color: var(--primary-color);">${fileName}</span>
                `;
            } else {
                fileNameElement.textContent = '';
                fileInputContainer.classList.remove('file-selected');
                fileInputLabel.innerHTML = `
                    <i class="fas fa-file-pdf"></i>
                    <span>点击或拖拽PDF文件到此处</span>
                    <span class="file-name" id="file-name"></span>
                `;
            }
        });
        
        // 优化：自定义日历面板和日期输入
        this.initDatePicker('inspection_date');
        
        // Add CSS for file selection visual feedback and date picker
        const style = document.createElement('style');
        style.textContent = `
            .file-input-container.file-selected .file-input-label {
                background-color: rgba(0, 123, 255, 0.1);
                border: 1px solid var(--primary-color);
                transition: all 0.3s ease;
            }
            
            /* 日期输入框样式 */
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
            
            /* 滚动条样式 */
            .year-selector::-webkit-scrollbar {
                width: 6px;
            }
            
            .year-selector::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            
            .year-selector::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 3px;
            }
            
            .year-selector::-webkit-scrollbar-thumb:hover {
                background: #aaa;
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
    },
    
    // Handle upload form submission
    handleUpload: async function(event) {
        event.preventDefault();
        
        // Get form data
        const fileNumber = document.getElementById('file_number').value;
        const inspectionDate = document.getElementById('inspection_date').value;
        const fileInput = document.getElementById('file');
        const file = fileInput.files[0];
        
        // Validate form data
        if (!fileNumber) {
            showError('请输入报告编号');
            return;
        }
        
        if (!inspectionDate) {
            showError('请选择检测日期');
            return;
        }
        
        if (!file) {
            showError('请选择要上传的文件');
            return;
        }
        
        // Validate file number format
        if (!/^[a-zA-Z0-9\-_+]+$/.test(fileNumber)) {
            showError('报告编号只能包含字母、数字和 -_+ 符号');
            return;
        }
        
        // Validate file type
        if (!file.type.includes('pdf')) {
            showError('只允许上传 PDF 文件');
            return;
        }
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        try {
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...';
            submitButton.disabled = true;
            
            // Create form data
            const formData = new FormData();
            formData.append('file_number', fileNumber);
            formData.append('inspection_date', inspectionDate);
            formData.append('file', file);
            
            // Upload document
            const data = await api.uploadDocument(formData);
            
            // Show success message
            showSuccess('文档上传成功');
            
            // Show document details
            this.showUploadSuccess(data);
        } catch (error) {
            console.error('Upload error:', error);
            showError('上传失败: ' + error.message);
            
            // Reset button
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    },
    
    // Show upload success
    showUploadSuccess: function(data) {
        const document = data.document;
        
        // Create success content
        const successContent = `
            <div class="card">
                <h2>上传成功</h2>
                <p>文档已成功上传，以下是文档详情：</p>
                
                <div style="margin: 2rem 0; padding: 1.5rem; background-color: var(--light-color); border-radius: 4px;">
                    <div style="margin-bottom: 1rem;">
                        <strong>报告编号：</strong> ${document.file_number}
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>文件名：</strong> ${document.original_filename}
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>检测日期：</strong> ${document.inspection_date}
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>上传时间：</strong> ${ui.formatDate(document.upload_date)}
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <a href="${document.view_url}" target="_blank" class="btn">
                        <i class="fas fa-eye"></i> 查看文档
                    </a>
                    <a href="${document.qrcode_url}" target="_blank" class="btn">
                        <i class="fas fa-qrcode"></i> 查看二维码
                    </a>
                    <a href="#documents" class="btn">
                        <i class="fas fa-list"></i> 返回文档列表
                    </a>
                    <button class="btn" onclick="window.location.reload()">
                        <i class="fas fa-plus"></i> 继续上传
                    </button>
                </div>
            </div>
        `;
        
        // Render success content
        ui.render(successContent);
    },
    
    // 初始化日期选择器
    initDatePicker: function(inputId) {
        const dateInput = document.getElementById(inputId);
        const calendarToggleBtn = dateInput.parentElement.querySelector('.calendar-toggle-btn');
        const calendarPanel = document.getElementById('calendar-panel');
        
        // 当前选中的日期
        let currentDate = new Date();
        let selectedDate = null;
        
        // 格式化日期为 YYYY-MM-DD
        const formatDate = function(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        // 解析日期字符串
        const parseDate = function(dateStr) {
            if (!dateStr) return null;
            
            // 尝试解析 YYYY-MM-DD 格式
            const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
            if (match) {
                const year = parseInt(match[1], 10);
                const month = parseInt(match[2], 10) - 1; // 月份从0开始
                const day = parseInt(match[3], 10);
                
                // 验证日期有效性
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
        
        // 渲染日历
        const renderCalendar = function() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // 获取当月第一天和最后一天
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // 获取当月第一天是星期几（0-6，0是星期日）
            const firstDayOfWeek = firstDay.getDay();
            
            // 获取上个月的最后几天
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            
            // 日历头部
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
            
            // 填充日历格子
            let day = 1;
            const today = new Date();
            const todayFormatted = formatDate(today);
            
            // 计算需要显示的行数
            const totalDays = firstDayOfWeek + lastDay.getDate();
            const rows = Math.ceil(totalDays / 7);
            
            for (let i = 0; i < rows * 7; i++) {
                // 上个月的日期
                if (i < firstDayOfWeek) {
                    const prevMonthDay = prevMonthLastDay - (firstDayOfWeek - i - 1);
                    calendarHTML += `<div class="calendar-day other-month">${prevMonthDay}</div>`;
                }
                // 当月的日期
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
                // 下个月的日期
                else {
                    const nextMonthDay = i - (firstDayOfWeek + lastDay.getDate()) + 1;
                    calendarHTML += `<div class="calendar-day other-month">${nextMonthDay}</div>`;
                }
            }
            
            calendarHTML += `</div>`;
            calendarPanel.innerHTML = calendarHTML;
            
            // 添加事件监听器
            // 月份导航按钮
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
            
            // 年份选择事件
            calendarPanel.querySelectorAll('.year-option').forEach(yearOption => {
                yearOption.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const selectedYear = parseInt(this.getAttribute('data-year'), 10);
                    currentDate.setFullYear(selectedYear);
                    renderCalendar();
                });
            });
            
            // 点击月份和年份标题切换年份选择器的显示状态
            const yearSelector = calendarPanel.querySelector('.year-selector');
            const calendarTitle = calendarPanel.querySelector('.calendar-title');
            
            calendarTitle.addEventListener('click', function(e) {
                e.stopPropagation();
                yearSelector.classList.toggle('active');
            });
            
            // 为日期添加点击事件
            calendarPanel.querySelectorAll('.calendar-day:not(.other-month)').forEach(dayElement => {
                dayElement.addEventListener('click', function() {
                    const dateStr = this.getAttribute('data-date');
                    selectedDate = parseDate(dateStr);
                    dateInput.value = dateStr;
                    calendarPanel.classList.remove('active');
                    
                    // 触发change事件
                    const event = new Event('change', { bubbles: true });
                    dateInput.dispatchEvent(event);
                    
                    // 移除错误样式
                    dateInput.style.borderColor = '';
                });
            });
        };
        
        // 显示/隐藏日历面板
        calendarToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (calendarPanel.classList.contains('active')) {
                calendarPanel.classList.remove('active');
            } else {
                // 如果输入框有值，设置日历当前日期为输入的日期
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
        
        // 点击输入框也显示日历
        dateInput.addEventListener('click', function(e) {
            if (!calendarPanel.classList.contains('active')) {
                calendarToggleBtn.click();
            }
        });
        
        // 点击其他地方关闭日历面板
        document.addEventListener('click', function(e) {
            if (!calendarPanel.contains(e.target) && 
                e.target !== calendarToggleBtn && 
                e.target !== dateInput) {
                calendarPanel.classList.remove('active');
            }
        });
        
        // 手动输入日期格式化
        dateInput.addEventListener('input', function(e) {
            let value = dateInput.value;
            
            // 移除非数字和连字符
            value = value.replace(/[^\d-]/g, '');
            
            // 自动添加连字符
            if (value.length === 4 && !value.includes('-')) {
                value += '-';
            } else if (value.length === 7 && value.lastIndexOf('-') === 4) {
                value += '-';
            }
            
            // 限制长度
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            
            // 更新输入框值
            if (value !== dateInput.value) {
                dateInput.value = value;
            }
            
            // 验证格式
            const isValid = /^\d{4}-\d{2}-\d{2}$/.test(value);
            if (!isValid && value.length > 0) {
                dateInput.style.borderColor = 'red';
            } else if (isValid) {
                // 进一步验证日期有效性
                const parsedDate = parseDate(value);
                if (parsedDate) {
                    dateInput.style.borderColor = '';
                    selectedDate = parsedDate;
                    
                    // 如果日历面板是打开的，更新日历显示
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
        
        // 失去焦点时格式化
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
    }
};
