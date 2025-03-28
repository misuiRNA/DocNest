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
                                    <th>提取码</th>
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
                            <td><span class="extraction-code">${doc.extraction_code}</span></td>
                            <td>${doc.uploader || '-'}</td>
                            <td>${ui.formatDate(doc.upload_date)}</td>
                            <td>
                                <div class="table-actions">
                                    <a href="${doc.view_url}" target="_blank" class="btn" title="查看文档">
                                        <i class="fas fa-eye"></i>
                                    </a>
                                    <a href="${doc.qrcode_url}" target="_blank" class="btn" title="查看二维码">
                                        <i class="fas fa-qrcode"></i>
                                    </a>
                                    ${auth.isAdmin() || auth.getUser().role === 'group_admin' ? `
                                    <button class="btn btn-danger" title="删除文档" onclick="documentsPage.deleteDocument(${doc.id})">
                                        <i class="fas fa-trash"></i>
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
    }
};
