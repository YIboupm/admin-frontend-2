/* ===================================
   听力材料管理模块 - listening.js
   =================================== */

// 听力材料状态
const ListeningState = {
    materials: [],
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    filters: {
        level: '',
        accent: '',
        search: ''
    },
    selectedMaterial: null,
    uploadedFile: null,
    processingTasks: new Map(), // task_id -> material_id
};

/**
 * 初始化听力材料模块
 */
function initListeningModule() {
    console.log('Initializing listening module...');
    
    // 绑定事件监听
    bindListeningEvents();
    
    // 加载材料列表
    loadListeningMaterials();
    
    // 设置定时检查处理状态（每5秒）
    setInterval(checkProcessingStatus, 5000);
}

/**
 * 绑定事件监听
 */
function bindListeningEvents() {
    // 上传按钮
    const btnAdd = document.getElementById('btnAddListening');
    if (btnAdd) {
        btnAdd.addEventListener('click', showListeningUploadModal);
    }
    
    // 上传表单
    const audioFileInput = document.getElementById('listeningAudioFile');
    if (audioFileInput) {
        audioFileInput.addEventListener('change', handleAudioFileSelect);
    }
    
    // 上传按钮
    const btnUpload = document.getElementById('btnUploadListening');
    if (btnUpload) {
        btnUpload.addEventListener('click', handleListeningUpload);
    }
    
    // 筛选按钮
    const btnFilter = document.getElementById('btnApplyListeningFilter');
    if (btnFilter) {
        btnFilter.addEventListener('click', applyListeningFilters);
    }
    
    // 拖拽上传
    const uploadArea = document.getElementById('audioUploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
        uploadArea.addEventListener('dragleave', handleDragLeave);
    }
}

/**
 * 加载听力材料列表
 */
async function loadListeningMaterials(page = 1) {
    const tbody = document.getElementById('listeningMaterialsBody');
    const loading = document.getElementById('listeningMaterialsLoading');
    const empty = document.getElementById('listeningMaterialsEmpty');
    const table = document.getElementById('listeningMaterialsTable');
    
    // 显示加载状态
    if (loading) loading.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');
    if (table) table.style.display = 'none';
    if (tbody) tbody.innerHTML = '';
    
    try {
        // 构建查询参数
        const params = new URLSearchParams({
            page: page,
            page_size: ListeningState.pageSize
        });
        
        if (ListeningState.filters.level) {
            params.append('level', ListeningState.filters.level);
        }
        if (ListeningState.filters.accent) {
            params.append('accent', ListeningState.filters.accent);
        }
        if (ListeningState.filters.search) {
            params.append('search', ListeningState.filters.search);
        }
        
        const url = `${CONFIG.API_BASE_URL}/listening/admin/upload?${params.toString()}`;
        const response = await Utils.fetchWithAuth(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // 更新状态
        ListeningState.materials = data.materials || [];
        ListeningState.currentPage = data.page || page;
        ListeningState.totalPages = data.total_pages || 1;
        
        // 隐藏加载
        if (loading) loading.classList.add('hidden');
        
        // 显示结果
        if (ListeningState.materials.length === 0) {
            if (empty) empty.classList.remove('hidden');
        } else {
            if (table) table.style.display = 'table';
            renderListeningMaterials();
            renderListeningPagination();
        }
        
    } catch (error) {
        console.error('Failed to load listening materials:', error);
        if (loading) loading.classList.add('hidden');
        Utils.showToast('加载失败：' + error.message, 'error');
    }
}

/**
 * 渲染材料列表
 */
function renderListeningMaterials() {
    const tbody = document.getElementById('listeningMaterialsBody');
    if (!tbody) return;
    
    tbody.innerHTML = ListeningState.materials.map(material => {
        const status = getProcessingStatus(material);
        const statusBadge = getStatusBadge(status);
        
        return `
            <tr>
                <td>${escapeHtml(material.id)}</td>
                <td>
                    <div class="file-name-cell">
                        <span class="file-icon">🎵</span>
                        <span>${escapeHtml(getFileName(material.path))}</span>
                    </div>
                </td>
                <td>${material.level ? `<span class="badge badge-level">${material.level}</span>` : '-'}</td>
                <td>${material.accent ? escapeHtml(material.accent) : '-'}</td>
                <td>${formatDuration(material.meta_json?.duration)}</td>
                <td>${statusBadge}</td>
                <td>${formatDate(material.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="viewListeningMaterial('${material.id}')" title="查看详情">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="downloadListeningAudio('${material.id}')" title="下载音频">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </button>
                        ${status === 'completed' ? `
                            <button class="btn-icon" onclick="reprocessListening('${material.id}')" title="重新处理">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"/>
                                    <polyline points="1 20 1 14 7 14"/>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                </svg>
                            </button>
                        ` : ''}
                        <button class="btn-icon btn-danger" onclick="confirmDeleteListening('${material.id}')" title="删除">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 获取处理状态
 */
function getProcessingStatus(material) {
    // 检查是否有正在处理的任务
    for (const [taskId, materialId] of ListeningState.processingTasks) {
        if (materialId === material.id) {
            return 'processing';
        }
    }
    
    // 检查是否有转录文本
    if (material.transcript && material.transcript.trim()) {
        return 'completed';
    }
    
    return 'pending';
}

/**
 * 获取状态徽章
 */
function getStatusBadge(status) {
    const badges = {
        'completed': '<span class="badge badge-success">已完成</span>',
        'processing': '<span class="badge badge-warning">处理中</span>',
        'pending': '<span class="badge badge-info">待处理</span>',
        'failed': '<span class="badge badge-error">失败</span>'
    };
    return badges[status] || badges['pending'];
}

/**
 * 从路径提取文件名
 */
function getFileName(path) {
    if (!path) return '未知文件';
    const parts = path.split('/');
    return parts[parts.length - 1];
}

/**
 * 格式化时长
 */
function formatDuration(seconds) {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 格式化日期
 */
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN');
}

/**
 * 渲染分页
 */
function renderListeningPagination() {
    const container = document.getElementById('listeningMaterialsPagination');
    if (!container) return;
    
    if (ListeningState.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-info">第 ' + ListeningState.currentPage + ' 页，共 ' + ListeningState.totalPages + ' 页</div>';
    html += '<div class="pagination-buttons">';
    
    // 上一页
    if (ListeningState.currentPage > 1) {
        html += `<button class="btn btn-sm" onclick="loadListeningMaterials(${ListeningState.currentPage - 1})">上一页</button>`;
    }
    
    // 页码
    for (let i = 1; i <= ListeningState.totalPages; i++) {
        if (i === ListeningState.currentPage) {
            html += `<button class="btn btn-sm btn-primary">${i}</button>`;
        } else if (i === 1 || i === ListeningState.totalPages || Math.abs(i - ListeningState.currentPage) <= 2) {
            html += `<button class="btn btn-sm" onclick="loadListeningMaterials(${i})">${i}</button>`;
        } else if (Math.abs(i - ListeningState.currentPage) === 3) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    // 下一页
    if (ListeningState.currentPage < ListeningState.totalPages) {
        html += `<button class="btn btn-sm" onclick="loadListeningMaterials(${ListeningState.currentPage + 1})">下一页</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * 应用筛选
 */
function applyListeningFilters() {
    ListeningState.filters.level = document.getElementById('filterListeningLevel').value;
    ListeningState.filters.accent = document.getElementById('filterListeningAccent').value;
    ListeningState.filters.search = document.getElementById('filterListeningSearch').value;
    
    loadListeningMaterials(1);
}

/**
 * 显示上传模态框
 */
function showListeningUploadModal() {
    const modal = document.getElementById('listeningUploadModal');
    if (modal) {
        modal.classList.remove('hidden');
        // 重置表单
        resetUploadForm();
    }
}

/**
 * 关闭上传模态框
 */
function closeListeningUploadModal() {
    const modal = document.getElementById('listeningUploadModal');
    if (modal) {
        modal.classList.add('hidden');
        resetUploadForm();
    }
}

/**
 * 重置上传表单
 */
function resetUploadForm() {
    document.getElementById('listeningUploadForm').reset();
    ListeningState.uploadedFile = null;
    
    const fileInfo = document.getElementById('audioFileInfo');
    if (fileInfo) fileInfo.classList.add('hidden');
    
    const uploadBox = document.querySelector('.file-upload-box');
    if (uploadBox) uploadBox.style.display = 'flex';
}

/**
 * 处理文件选择
 */
function handleAudioFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        displaySelectedFile(file);
    }
}

/**
 * 显示选中的文件
 */
function displaySelectedFile(file) {
    // 验证文件类型
    if (!file.type.startsWith('audio/')) {
        Utils.showToast('请选择音频文件', 'error');
        return;
    }
    
    // 验证文件大小（50MB）
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        Utils.showToast('文件过大，请选择小于50MB的音频文件', 'error');
        return;
    }
    
    ListeningState.uploadedFile = file;
    
    // 显示文件信息
    document.getElementById('audioFileName').textContent = file.name;
    document.getElementById('audioFileSize').textContent = formatFileSize(file.size);
    document.getElementById('audioFileInfo').classList.remove('hidden');
    
    const uploadBox = document.querySelector('.file-upload-box');
    if (uploadBox) uploadBox.style.display = 'none';
}

/**
 * 移除选中的文件
 */
function removeAudioFile() {
    ListeningState.uploadedFile = null;
    document.getElementById('listeningAudioFile').value = '';
    document.getElementById('audioFileInfo').classList.add('hidden');
    
    const uploadBox = document.querySelector('.file-upload-box');
    if (uploadBox) uploadBox.style.display = 'flex';
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * 处理拖拽
 */
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const file = event.dataTransfer.files[0];
    if (file) {
        displaySelectedFile(file);
    }
}

/**
 * 处理上传
 */
async function handleListeningUpload() {
    if (!ListeningState.uploadedFile) {
        Utils.showToast('请选择音频文件', 'error');
        return;
    }
    
    const btn = document.getElementById('btnUploadListening');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    try {
        // 显示加载状态
        btn.disabled = true;
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        
        // 构建 FormData
        const formData = new FormData();
        formData.append('audio_file', ListeningState.uploadedFile);
        
        const transcript = document.getElementById('listeningTranscript').value.trim();
        if (transcript) {
            formData.append('transcript', transcript);
        }
        
        const level = document.getElementById('listeningLevel').value;
        if (level) {
            formData.append('level', level);
        }
        
        const accent = document.getElementById('listeningAccent').value;
        if (accent) {
            formData.append('accent', accent);
        }
        
        // 构建元数据
        const metadata = {};
        const title = document.getElementById('listeningTitle').value.trim();
        if (title) metadata.title = title;
        
        const speaker = document.getElementById('listeningSpeaker').value.trim();
        if (speaker) metadata.speaker = speaker;
        
        if (Object.keys(metadata).length > 0) {
            formData.append('metadata', JSON.stringify(metadata));
        }
        
        // 发送请求
        const url = `${CONFIG.API_BASE_URL}/listening/admin/upload`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        Utils.showToast('上传成功！正在处理音频...', 'success');
        
        // 如果返回了 task_id，记录它
        if (result.task_id) {
            ListeningState.processingTasks.set(result.task_id, result.material_id);
        }
        
        // 关闭模态框
        closeListeningUploadModal();
        
        // 重新加载列表
        loadListeningMaterials(1);
        
    } catch (error) {
        console.error('Upload failed:', error);
        Utils.showToast('上传失败：' + error.message, 'error');
    } finally {
        // 恢复按钮状态
        btn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
}

/**
 * 查看材料详情
 */
async function viewListeningMaterial(materialId) {
    try {
        const url = `${CONFIG.API_BASE_URL}/listening/admin/materials/${materialId}`;
        const response = await Utils.fetchWithAuth(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const material = await response.json();
        
        // 显示详情模态框
        showListeningDetail(material);
        
    } catch (error) {
        console.error('Failed to load material:', error);
        Utils.showToast('加载失败：' + error.message, 'error');
    }
}

/**
 * 显示材料详情
 */
function showListeningDetail(material) {
    const modal = document.getElementById('listeningDetailModal');
    const content = document.getElementById('listeningDetailContent');
    
    if (!modal || !content) return;
    
    // 构建详情HTML
    let html = `
        <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">文件名：</span>
                    <span class="detail-value">${escapeHtml(getFileName(material.path))}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">级别：</span>
                    <span class="detail-value">${material.level || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">口音：</span>
                    <span class="detail-value">${material.accent || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">时长：</span>
                    <span class="detail-value">${formatDuration(material.meta_json?.duration)}</span>
                </div>
            </div>
        </div>
    `;
    
    // 音频播放器
    html += `
        <div class="detail-section">
            <h4>音频播放</h4>
            <audio controls style="width: 100%;">
                <source src="${CONFIG.API_BASE_URL}/files/${material.path}" type="audio/mpeg">
                您的浏览器不支持音频播放
            </audio>
        </div>
    `;
    
    // 转录文本
    if (material.transcript) {
        html += `
            <div class="detail-section">
                <h4>转录文本</h4>
                <div class="transcript-box">
                    ${escapeHtml(material.transcript)}
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="detail-section">
                <h4>转录文本</h4>
                <p class="text-muted">暂无转录文本</p>
            </div>
        `;
    }
    
    // 额外元数据
    if (material.meta_json) {
        html += `
            <div class="detail-section">
                <h4>元数据</h4>
                <pre class="metadata-box">${JSON.stringify(material.meta_json, null, 2)}</pre>
            </div>
        `;
    }
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
    
    // 保存当前材料
    ListeningState.selectedMaterial = material;
}

/**
 * 关闭详情模态框
 */
function closeListeningDetailModal() {
    const modal = document.getElementById('listeningDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        ListeningState.selectedMaterial = null;
    }
}

/**
 * 下载音频
 */
function downloadListeningAudio(materialId) {
    const material = ListeningState.materials.find(m => m.id === materialId);
    if (!material) return;
    
    const url = `${CONFIG.API_BASE_URL}/files/${material.path}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName(material.path);
    link.click();
}

/**
 * 重新处理
 */
async function reprocessListening(materialId) {
    if (!confirm('确定要重新处理这个音频吗？这将覆盖现有的转录结果。')) {
        return;
    }
    
    try {
        const url = `${CONFIG.API_BASE_URL}/listening/admin/materials/${materialId}/reprocess`;
        const response = await Utils.fetchWithAuth(url, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        Utils.showToast('已开始重新处理', 'success');
        
        // 记录任务
        if (result.task_id) {
            ListeningState.processingTasks.set(result.task_id, materialId);
        }
        
        // 刷新列表
        loadListeningMaterials(ListeningState.currentPage);
        
    } catch (error) {
        console.error('Reprocess failed:', error);
        Utils.showToast('操作失败：' + error.message, 'error');
    }
}

/**
 * 确认删除
 */
function confirmDeleteListening(materialId) {
    ListeningState.selectedMaterial = ListeningState.materials.find(m => m.id === materialId);
    
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
        modal.classList.remove('hidden');
        
        const btnConfirm = document.getElementById('btnConfirmDelete');
        btnConfirm.onclick = () => deleteListening(materialId);
    }
}

/**
 * 删除材料
 */
async function deleteListening(materialId) {
    try {
        const url = `${CONFIG.API_BASE_URL}/listening/admin/materials/${materialId}`;
        const response = await Utils.fetchWithAuth(url, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        Utils.showToast('删除成功', 'success');
        
        closeConfirmDeleteModal();
        
        // 重新加载列表
        loadListeningMaterials(ListeningState.currentPage);
        
    } catch (error) {
        console.error('Delete failed:', error);
        Utils.showToast('删除失败：' + error.message, 'error');
    }
}

/**
 * 关闭确认删除模态框
 */
function closeConfirmDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * 检查处理状态
 */
async function checkProcessingStatus() {
    if (ListeningState.processingTasks.size === 0) {
        return;
    }
    
    const taskIds = Array.from(ListeningState.processingTasks.keys());
    
    for (const taskId of taskIds) {
        try {
            const url = `${CONFIG.API_BASE_URL}/listening/admin/processing-status/${taskId}`;
            const response = await Utils.fetchWithAuth(url);
            
            if (!response.ok) {
                ListeningState.processingTasks.delete(taskId);
                continue;
            }
            
            const status = await response.json();
            
            // 如果完成或失败，移除任务并刷新列表
            if (status.status === 'SUCCESS' || status.status === 'FAILURE') {
                ListeningState.processingTasks.delete(taskId);
                
                if (status.status === 'SUCCESS') {
                    Utils.showToast('音频处理完成', 'success');
                } else {
                    Utils.showToast('音频处理失败：' + (status.error || '未知错误'), 'error');
                }
                
                // 刷新列表
                loadListeningMaterials(ListeningState.currentPage);
            }
            
        } catch (error) {
            console.error('Failed to check status:', error);
            ListeningState.processingTasks.delete(taskId);
        }
    }
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 确保全局可访问
window.showListeningUploadModal = showListeningUploadModal;
window.closeListeningUploadModal = closeListeningUploadModal;
window.removeAudioFile = removeAudioFile;
window.viewListeningMaterial = viewListeningMaterial;
window.closeListeningDetailModal = closeListeningDetailModal;
window.downloadListeningAudio = downloadListeningAudio;
window.reprocessListening = reprocessListening;
window.confirmDeleteListening = confirmDeleteListening;
window.closeConfirmDeleteModal = closeConfirmDeleteModal;
window.initListeningModule = initListeningModule;