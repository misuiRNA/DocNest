/**
 * View page
 */

const viewPage = {
    // Render view page
    render: async function(params) {
        // Set page title
        ui.setTitle('查看文档');
        
        // Check if document ID is provided
        if (!params || !params.id) {
            ui.showError('未提供文档 ID');
            return;
        }
        
        const documentId = params.id;
        
        try {
            // Get document
            const data = await api.getDocument(documentId);
            const document = data.document;
            
            // Create view content
            const viewContent = `
                <div class="card">
                    <h2>查看文档</h2>
                    <p>以下是文档详情：</p>
                    
                    <div style="margin: 2rem 0; padding: 1.5rem; background-color: var(--light-color); border-radius: 4px;">
                        <div style="margin-bottom: 1rem;">
                            <strong>文件编号：</strong> ${document.file_number}
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <strong>文件名：</strong> ${document.original_filename}
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <strong>提取码：</strong> <span class="extraction-code">${document.extraction_code}</span>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <strong>上传者：</strong> ${document.uploader || '-'}
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <strong>上传时间：</strong> ${ui.formatDate(document.upload_date)}
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <strong>用户组：</strong> ${document.group_name || '-'}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 2rem;">
                        <iframe src="${document.view_url}" width="100%" height="500" style="border: 1px solid var(--border-color); border-radius: 4px;"></iframe>
                    </div>
                    
                    <div style="display: flex; gap: 1rem;">
                        <a href="${document.view_url}" target="_blank" class="btn">
                            <i class="fas fa-external-link-alt"></i> 在新窗口打开
                        </a>
                        <a href="${document.qrcode_url}" target="_blank" class="btn">
                            <i class="fas fa-qrcode"></i> 查看二维码
                        </a>
                        <a href="#documents" class="btn">
                            <i class="fas fa-list"></i> 返回文档列表
                        </a>
                        <button class="btn btn-danger" onclick="viewPage.deleteDocument(${document.id})">
                            <i class="fas fa-trash"></i> 删除文档
                        </button>
                    </div>
                </div>
            `;
            
            // Render view content
            ui.render(viewContent);
        } catch (error) {
            console.error('Error loading document:', error);
            ui.showError('加载文档失败: ' + error.message);
        }
    },
    
    // Delete document
    deleteDocument: function(documentId) {
        // Show confirmation modal
        confirmModal('确定要删除此文档吗？此操作不可撤销。', async () => {
            try {
                // Delete document
                await api.deleteDocument(documentId);
                
                // Show success message
                showSuccess('文档删除成功');
                
                // Redirect to documents page
                window.location.hash = 'documents';
            } catch (error) {
                console.error('Error deleting document:', error);
                showError('删除文档失败: ' + error.message);
            }
        });
    }
};
