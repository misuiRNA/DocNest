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
                        <label for="file_number" class="form-label">文件编号</label>
                        <input type="text" id="file_number" name="file_number" class="form-input" required>
                        <small style="color: var(--gray-color);">文件编号只能包含字母、数字和 -_+ 符号</small>
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
        
        // Add CSS for file selection visual feedback
        const style = document.createElement('style');
        style.textContent = `
            .file-input-container.file-selected .file-input-label {
                background-color: rgba(0, 123, 255, 0.1);
                border: 1px solid var(--primary-color);
                transition: all 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    },
    
    // Handle upload form submission
    handleUpload: async function(event) {
        event.preventDefault();
        
        // Get form data
        const fileNumber = document.getElementById('file_number').value;
        const fileInput = document.getElementById('file');
        const file = fileInput.files[0];
        
        // Validate form data
        if (!fileNumber) {
            showError('请输入文件编号');
            return;
        }
        
        if (!file) {
            showError('请选择要上传的文件');
            return;
        }
        
        // Validate file number format
        if (!/^[a-zA-Z0-9\-_+]+$/.test(fileNumber)) {
            showError('文件编号只能包含字母、数字和 -_+ 符号');
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
        const extractionCode = data.extraction_code;
        
        // Create success content
        const successContent = `
            <div class="card">
                <h2>上传成功</h2>
                <p>文档已成功上传，以下是文档详情：</p>
                
                <div style="margin: 2rem 0; padding: 1.5rem; background-color: var(--light-color); border-radius: 4px;">
                    <div style="margin-bottom: 1rem;">
                        <strong>文件编号：</strong> ${document.file_number}
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>文件名：</strong> ${document.original_filename}
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>提取码：</strong> <span class="extraction-code">${extractionCode}</span>
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
                </div>
            </div>
        `;
        
        // Render success content
        ui.render(successContent);
    }
};
