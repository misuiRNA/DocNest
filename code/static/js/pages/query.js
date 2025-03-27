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
                <p>输入文件编号和提取码查询文档</p>
                <form id="query-form">
                    <div class="form-group">
                        <label for="file_number" class="form-label">文件编号</label>
                        <input type="text" id="file_number" name="file_number" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="extraction_code" class="form-label">提取码</label>
                        <input type="text" id="extraction_code" name="extraction_code" class="form-input" required>
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
        document.getElementById('query-form').addEventListener('submit', this.handleQuery);
        
        // Focus file number input
        document.getElementById('file_number').focus();
    },
    
    // Handle query form submission
    handleQuery: async function(event) {
        event.preventDefault();
        
        // Get form data
        const fileNumber = document.getElementById('file_number').value;
        const extractionCode = document.getElementById('extraction_code').value;
        
        // Validate form data
        if (!fileNumber || !extractionCode) {
            showError('请输入文件编号和提取码');
            return;
        }
        
        try {
            // Show loading state
            const submitButton = event.target.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 查询中...';
            submitButton.disabled = true;
            
            // Query document
            const data = await api.queryDocument(fileNumber, extractionCode);
            
            // Show document details
            queryPage.showQueryResult(data.document);
        } catch (error) {
            console.error('Query error:', error);
            showError('查询失败: ' + error.message);
            
            // Reset button
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    },
    
    // Show query result
    showQueryResult: function(document) {
        // Create result content
        const resultContent = `
            <div class="card">
                <h2>查询结果</h2>
                <p>以下是文档详情：</p>
                
                <div style="margin: 2rem 0; padding: 1.5rem; background-color: var(--light-color); border-radius: 4px;">
                    <div style="margin-bottom: 1rem;">
                        <strong>文件编号：</strong> ${document.file_number}
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>文件名：</strong> ${document.original_filename}
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>上传时间：</strong> ${ui.formatDate(document.upload_date)}
                    </div>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <iframe src="${document.view_url}" width="100%" height="500" style="border: 1px solid var(--border-color); border-radius: 4px;"></iframe>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <a href="${document.view_url}" target="_blank" class="btn">
                        <i class="fas fa-external-link-alt"></i> 在新窗口打开
                    </a>
                    <a href="#query" class="btn">
                        <i class="fas fa-search"></i> 重新查询
                    </a>
                </div>
            </div>
        `;
        
        // Render result content
        ui.render(resultContent);
    }
};
