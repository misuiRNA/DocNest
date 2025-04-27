/**
 * Query page
 */

const queryPage = {
    // Render query page
    render: async function() {
        // Set page title
        ui.setTitle('查询文档');
        
        // Create query form
        const queryForm = `
            <div class="card">
                <h2>查询文档</h2>
                <form id="query-form">
                    <div class="form-group">
                        <label for="file_number" class="form-label">文件编号</label>
                        <input type="text" id="file_number" name="file_number" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="inspection_date" class="form-label">检测日期</label>
                        <input type="date" id="inspection_date" name="inspection_date" class="form-input" required>
                    </div>
                    <button type="submit" class="btn">
                        <i class="fas fa-search"></i> 查询文档
                    </button>
                </form>
                <p style="margin-top: 2rem; text-align: center;">
                    <a href="#login" class="nav-link">
                        <i class="fas fa-sign-in-alt"></i> 登录系统
                    </a>
                </p>
            </div>
        `;
        
        // Render query form
        ui.render(queryForm);
        
        // Add event listener to query form
        document.getElementById('query-form').addEventListener('submit', this.handleQuery.bind(this));
        
        // Focus file number input
        document.getElementById('file_number').focus();
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
        // Create document details content
        const documentDetails = `
            <div class="card">
                <h2>文档详情</h2>
                <div style="margin: 2rem 0; padding: 1.5rem; background-color: var(--light-color); border-radius: 4px;">
                    <div style="margin-bottom: 1rem;">
                        <strong>文件编号：</strong> ${document.file_number}
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
                
                <div style="margin-top: 2rem;">
                    <h3>文档内容</h3>
                    <iframe src="${document.view_url}" width="100%" height="600px" frameborder="0"></iframe>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <a href="#documents" class="btn">
                        <i class="fas fa-list"></i> 返回文档列表
                    </a>
                </div>
            </div>
        `;
        
        // Render document details
        ui.render(documentDetails);
    }
};
