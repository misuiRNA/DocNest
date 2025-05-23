/**
 * Documents page
 */

const documentsPage = {
    // Render documents page
    render: async function() {
        // Set page title
        ui.setTitle('文档列表');
        
        try {
            // Get documents
            const data = await api.getDocuments();
            const documents = data.documents || [];
            
            // Create page content
            let content = `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2>文档列表</h2>
                        <a href="#upload" class="btn">
                            <i class="fas fa-upload"></i> 上传文档
                        </a>
                    </div>
            `;
            
            // Check if there are documents
            if (documents.length === 0) {
                content += `
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <h3>暂无文档</h3>
                        <a href="#upload" class="btn">
                            <i class="fas fa-upload"></i> 上传文档
                        </a>
                    </div>
                `;
            } else {
                // Create table
                content += `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>文件编号</th>
                                    <th>文件名</th>
                                    <th>检测日期</th>
                                    <th>上传者</th>
                                    <th>上传时间</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                // Add documents to table
                documents.forEach(doc => {
                    content += `
                        <tr>
                            <td>${doc.file_number}</td>
                            <td>${doc.original_filename}</td>
                            <td>${doc.inspection_date}</td>
                            <td>${doc.uploader || '-'}</td>
                            <td>${ui.formatDate(doc.upload_date)}</td>
                            <td>
                                <div class="table-actions">
                                    <a href="${doc.view_url}" target="_blank" class="btn btn-icon" title="查看文档" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; line-height: 36px;">
                                        <i class="fas fa-file-pdf fa-lg" style="margin: 0;"></i>
                                    </a>
                                    <button class="btn" title="查看二维码" onclick="documentsPage.showQRCode('${doc.qrcode_url}', '${doc.file_number}')" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; line-height: 36px;">
                                        <i class="fas fa-qrcode" style="margin: 0;"></i>
                                    </button>
                                    ${auth.isAdmin() || auth.getUser().role === 'group_admin' ? `
                                    <button class="btn ${doc.is_visible ? 'btn-success' : 'btn-warning'}" title="${doc.is_visible ? '隐藏文档' : '显示文档'}" onclick="documentsPage.toggleVisibility(${doc.id}, ${doc.is_visible})" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; line-height: 36px;">
                                        <i class="fas ${doc.is_visible ? 'fa-eye' : 'fa-eye-slash'}" style="margin: 0;"></i>
                                    </button>
                                    ` : ''}
                                    ${auth.isAdmin() || auth.getUser().role === 'group_admin' ? `
                                    <button class="btn btn-danger" title="删除文档" onclick="documentsPage.deleteDocument(${doc.id})" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; line-height: 36px;">
                                        <i class="fas fa-trash" style="margin: 0;"></i>
                                    </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
                });
                
                content += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            content += `</div>`;
            
            // Render content
            ui.render(content);
        } catch (error) {
            console.error('Error loading documents:', error);
            ui.showError('加载文档列表失败: ' + error.message, () => this.render());
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
                
                // Reload documents
                this.render();
            } catch (error) {
                console.error('Error deleting document:', error);
                showError('删除文档失败: ' + error.message);
            }
        });
    },
    
    // Show QR code in modal
    showQRCode: function(qrcodeUrl, fileNumber) {
        // Create modal content
        const modalContent = `
            <h2 style="margin-bottom: 1.5rem;">文件 ${fileNumber} 的二维码</h2>
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <img src="${qrcodeUrl}" alt="二维码" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
            </div>
            <div style="display: flex; justify-content: center; margin-top: 1rem;">
                <a href="${qrcodeUrl}" download="qrcode_${fileNumber}.png" class="btn" style="display: inline-flex; align-items: center;">
                    <i class="fas fa-download" style="margin-right: 8px;"></i>
                    下载二维码
                </a>
            </div>
        `;
        
        // Open modal
        openModal(modalContent);
    },
    
    // Toggle document visibility
    toggleVisibility: function(documentId, currentVisibility) {
        // Show confirmation modal
        confirmModal(`确定要${currentVisibility ? '隐藏' : '显示'}此文档吗？`, async () => {
            try {
                // Toggle visibility
                await api.toggleDocumentVisibility(documentId);
                
                // Show success message
                showSuccess(`文档已${currentVisibility ? '隐藏' : '显示'}`);
                
                // Reload documents
                this.render();
            } catch (error) {
                console.error('Error toggling document visibility:', error);
                showError('切换文档可见性失败: ' + error.message);
            }
        });
    }
};
