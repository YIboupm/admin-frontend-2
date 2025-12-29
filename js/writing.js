/* ===================================
   写作任务管理模块 - writing.js
   =================================== */

// 写作模块状态
const WritingState = {
    tasks: [],
    currentPage: 1,
    pageSize: CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
    totalPages: 1,
    filters: {
        exam_type: '',
        level: '',
        search: '',
    },
    editingTaskId: null,
    initialized: false,
    
    // 图片相关状态
    pendingImages: [],      // 待上传的新图片 [{file, preview, caption, order}]
    existingImages: [],     // 已存在的图片（编辑模式）[{id, image_url, caption, order}]
    deletedImageIds: [],    // 待删除的图片ID
    
    // ✅ [新增] 音频相关状态
    pendingAudios: [],      // 待上传的新音频 [{file, title, description, sort_order}]
    existingAudios: [],     // 已存在的音频关联 [{id, material_id, title, status, processing_task_id, ...}]
    deletedAudioIds: [],    // 待删除的音频关联ID
    processingAudios: new Map(), // processing_task_id -> {link_id, interval}
};

/**
 * 初始化写作模块
 */
function initWritingModule() {
    if (WritingState.initialized) {
        return;
    }
    
    // 绑定事件
    bindWritingEvents();
    
    // 加载数据
    loadWritingTasks();
    
    WritingState.initialized = true;
}

/**
 * 绑定写作模块事件
 */
function bindWritingEvents() {
    // 新建任务按钮
    document.getElementById('btnAddWritingTask').addEventListener('click', function() {
        showWritingTaskModal();
    });
    
    // 应用筛选按钮
    document.getElementById('btnApplyFilter').addEventListener('click', function() {
        applyWritingFilters();
    });
    
    // 筛选输入框回车
    document.getElementById('filterSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyWritingFilters();
        }
    });
    
    // 保存任务按钮
    document.getElementById('btnSaveWritingTask').addEventListener('click', function() {
        saveWritingTask();
    });
    
    // 表单提交
    document.getElementById('writingTaskForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveWritingTask();
    });
    
    // 图片上传相关事件
    initImageUploadEvents();
    
    // ✅ [新增] 音频上传相关事件
    initAudioUploadEvents();
}

/**
 * 初始化图片上传事件
 */
function initImageUploadEvents() {
    const imageInput = document.getElementById('taskImageInput');
    const uploadArea = document.getElementById('imageUploadArea');
    
    if (!imageInput || !uploadArea) return;
    
    // 文件选择事件
    imageInput.addEventListener('change', function(e) {
        handleImageSelect(e.target.files);
        e.target.value = ''; // 清空以便重复选择同一文件
    });
    
    // 拖拽事件
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        handleImageSelect(files);
    });
}

// ==================== ✅ [新增] 音频管理功能 ====================

/**
 * 初始化音频上传事件
 */
function initAudioUploadEvents() {
    const audioInput = document.getElementById('taskAudioInput');
    const uploadArea = document.getElementById('audioUploadArea');
    
    if (!audioInput || !uploadArea) return;
    
    // 文件选择事件
    audioInput.addEventListener('change', function(e) {
        handleAudioSelect(e.target.files);
        e.target.value = '';
    });
    
    // 拖拽事件
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        handleAudioSelect(files);
    });
}

/**
 * 处理音频文件选择
 */
function handleAudioSelect(files) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/x-m4a'];
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'];
    
    Array.from(files).forEach(file => {
        // 验证文件类型（通过扩展名和 MIME 类型）
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(ext);
        
        if (!isValidType) {
            Utils.showToast(`${file.name} 格式不支持，请上传 MP3/WAV/M4A/OGG/FLAC/AAC`, 'warning');
            return;
        }
        
        // 验证文件大小
        if (file.size > maxSize) {
            Utils.showToast(`${file.name} 超过50MB限制`, 'warning');
            return;
        }
        
        // 添加到待上传列表
        const order = WritingState.existingAudios.length + WritingState.pendingAudios.length + 1;
        WritingState.pendingAudios.push({
            file: file,
            title: file.name.replace(/\.[^/.]+$/, ''), // 去掉扩展名作为默认标题
            description: '',
            sort_order: order,
        });
        
        renderAudioPreviews();
    });
}

/**
 * 渲染音频预览列表
 */
function renderAudioPreviews() {
    const container = document.getElementById('audioPreviewList');
    const countHint = document.getElementById('audioCountHint');
    
    if (!container) return;
    
    let html = '';
    
    // 渲染已存在的音频（编辑模式）
    WritingState.existingAudios.forEach((audio, index) => {
        const statusClass = getAudioStatusClass(audio.status);
        const statusText = getAudioStatusText(audio.status);
        const isProcessing = audio.status === 'pending';
        
        html += `
            <div class="audio-preview-item existing ${statusClass}" data-type="existing" data-id="${audio.id}">
                <div class="audio-info">
                    <span class="audio-order">${index + 1}</span>
                    <div class="audio-icon">
                        ${isProcessing ? `
                            <div class="audio-spinner"></div>
                        ` : `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 18V5l12-2v13"/>
                                <circle cx="6" cy="18" r="3"/>
                                <circle cx="18" cy="16" r="3"/>
                            </svg>
                        `}
                    </div>
                    <div class="audio-details">
                        <input type="text" class="audio-title-input" 
                               placeholder="音频标题" 
                               value="${Utils.escapeHtml(audio.title || '')}"
                               onchange="updateExistingAudioTitle(${audio.id}, this.value)"
                               ${isProcessing ? 'disabled' : ''}>
                        <span class="audio-status ${statusClass}">${statusText}</span>
                        ${audio.material_id ? `<span class="audio-material-id">ID: ${audio.material_id.slice(0, 8)}...</span>` : ''}
                    </div>
                </div>
                <div class="audio-actions">
                    ${!isProcessing && audio.material_id ? `
                        <button type="button" class="btn-audio-play" onclick="playAudioPreview('${audio.material_id}')" title="播放">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                        </button>
                    ` : ''}
                    <button type="button" class="btn-audio-remove" onclick="removeExistingAudio(${audio.id})" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    // 渲染待上传的新音频
    WritingState.pendingAudios.forEach((audio, index) => {
        const orderNum = WritingState.existingAudios.length + index + 1;
        const fileSize = formatFileSize(audio.file.size);
        
        html += `
            <div class="audio-preview-item pending" data-type="pending" data-index="${index}">
                <div class="audio-info">
                    <span class="audio-order">${orderNum}</span>
                    <div class="audio-icon new">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18V5l12-2v13"/>
                            <circle cx="6" cy="18" r="3"/>
                            <circle cx="18" cy="16" r="3"/>
                        </svg>
                    </div>
                    <div class="audio-details">
                        <input type="text" class="audio-title-input" 
                               placeholder="音频标题" 
                               value="${Utils.escapeHtml(audio.title)}"
                               onchange="updatePendingAudioTitle(${index}, this.value)">
                        <span class="audio-status pending">待上传 (${fileSize})</span>
                    </div>
                </div>
                <div class="audio-actions">
                    <button type="button" class="btn-audio-remove" onclick="removePendingAudio(${index})" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // 更新计数
    if (countHint) {
        const existingCount = WritingState.existingAudios.length;
        const pendingCount = WritingState.pendingAudios.length;
        const totalCount = existingCount + pendingCount;
        
        let text = `已关联 ${existingCount} 个音频`;
        if (pendingCount > 0) {
            text += ` (${pendingCount} 个待上传)`;
        }
        countHint.textContent = text;
    }
}

/**
 * 获取音频状态样式类
 */
function getAudioStatusClass(status) {
    const classes = {
        'pending': 'status-pending',
        'completed': 'status-completed',
        'failed': 'status-failed',
    };
    return classes[status] || 'status-pending';
}

/**
 * 获取音频状态文本
 */
function getAudioStatusText(status) {
    const texts = {
        'pending': '处理中...',
        'completed': '已完成',
        'failed': '处理失败',
    };
    return texts[status] || status;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 移除待上传的音频
 */
function removePendingAudio(index) {
    WritingState.pendingAudios.splice(index, 1);
    // 重新排序
    WritingState.pendingAudios.forEach((audio, i) => {
        audio.sort_order = WritingState.existingAudios.length + i + 1;
    });
    renderAudioPreviews();
}

/**
 * 移除已存在的音频（标记为待删除）
 */
function removeExistingAudio(audioId) {
    const index = WritingState.existingAudios.findIndex(a => a.id === audioId);
    if (index > -1) {
        WritingState.existingAudios.splice(index, 1);
        WritingState.deletedAudioIds.push(audioId);
        // 重新排序
        WritingState.pendingAudios.forEach((audio, i) => {
            audio.sort_order = WritingState.existingAudios.length + i + 1;
        });
        renderAudioPreviews();
    }
}

/**
 * 更新待上传音频的标题
 */
function updatePendingAudioTitle(index, title) {
    if (WritingState.pendingAudios[index]) {
        WritingState.pendingAudios[index].title = title;
    }
}

/**
 * 更新已存在音频的标题
 */
function updateExistingAudioTitle(audioId, title) {
    const audio = WritingState.existingAudios.find(a => a.id === audioId);
    if (audio) {
        audio.title = title;
        audio.modified = true;
    }
}

/**
 * 播放音频预览
 */
function playAudioPreview(materialId) {
    // 这里可以实现一个简单的音频播放器弹窗
    // 暂时用简单的方式
    const audioUrl = Utils.getApiUrl(`/files/audio/${materialId}.mp3`);
    window.open(audioUrl, '_blank');
}

/**
 * 清空音频状态
 */
function clearAudioState() {
    // 停止所有轮询
    WritingState.processingAudios.forEach((data, taskId) => {
        if (data.interval) {
            clearInterval(data.interval);
        }
    });
    
    WritingState.pendingAudios = [];
    WritingState.existingAudios = [];
    WritingState.deletedAudioIds = [];
    WritingState.processingAudios.clear();
    renderAudioPreviews();
}

/**
 * 上传单个音频文件
 */
async function uploadSingleAudio(taskId, audioData) {
    const formData = new FormData();
    formData.append('file', audioData.file);
    formData.append('title', audioData.title || '听力材料');
    formData.append('description', audioData.description || '');
    formData.append('sort_order', audioData.sort_order || 1);
    
    const response = await fetch(
        Utils.getApiUrl(`/writing/admin/tasks/${taskId}/audio/upload`),
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`,
            },
            body: formData,
        }
    );
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Audio upload failed');
    }
    
    return response.json();
}

/**
 * 处理音频上传操作
 */
async function handleAudioOperations(taskId) {
    // 1. 删除标记为删除的音频关联
    for (const audioId of WritingState.deletedAudioIds) {
        try {
            await Utils.fetchWithAuth(
                Utils.getApiUrl(`/writing/admin/tasks/${taskId}/audio/${audioId}`),
                { method: 'DELETE' }
            );
        } catch (e) {
            console.error('Failed to delete audio link:', audioId, e);
        }
    }
    
    // 2. 上传新音频
    const uploadResults = [];
    for (const audio of WritingState.pendingAudios) {
        try {
            const result = await uploadSingleAudio(taskId, audio);
            uploadResults.push(result);
            
            // 开始轮询处理状态
            if (result.processing_task_id) {
                startPollingAudioStatus(result.processing_task_id, result.link_id);
            }
        } catch (e) {
            console.error('Failed to upload audio:', e);
            Utils.showToast('部分音频上传失败: ' + e.message, 'warning');
        }
    }
    
    return uploadResults;
}

/**
 * 开始轮询音频处理状态
 */
function startPollingAudioStatus(processingTaskId, linkId) {
    const interval = setInterval(async () => {
        try {
            const response = await Utils.fetchWithAuth(
                Utils.getApiUrl(`/writing/admin/audio/processing/${processingTaskId}`)
            );
            
            if (!response.ok) {
                clearInterval(interval);
                WritingState.processingAudios.delete(processingTaskId);
                return;
            }
            
            const status = await response.json();
            
            // 更新 UI 中的状态显示
            updateAudioStatusInUI(linkId, status);
            
            // 如果处理完成或失败，停止轮询
            if (status.status === 'completed' || status.status === 'failed') {
                clearInterval(interval);
                WritingState.processingAudios.delete(processingTaskId);
                
                if (status.status === 'completed') {
                    Utils.showToast('音频处理完成', 'success');
                } else {
                    Utils.showToast('音频处理失败: ' + (status.error || '未知错误'), 'error');
                }
                
                // 刷新任务详情
                if (WritingState.editingTaskId) {
                    refreshTaskAudios(WritingState.editingTaskId);
                }
            }
        } catch (e) {
            console.error('Failed to poll audio status:', e);
        }
    }, 3000); // 每3秒轮询一次
    
    WritingState.processingAudios.set(processingTaskId, { linkId, interval });
}

/**
 * 更新 UI 中的音频状态
 */
function updateAudioStatusInUI(linkId, status) {
    const audioItem = document.querySelector(`.audio-preview-item[data-id="${linkId}"]`);
    if (!audioItem) return;
    
    const statusSpan = audioItem.querySelector('.audio-status');
    if (statusSpan) {
        statusSpan.textContent = `${status.progress || 0}% - ${status.message || '处理中...'}`;
    }
}

/**
 * 刷新任务的音频列表
 */
async function refreshTaskAudios(taskId) {
    try {
        const response = await Utils.fetchWithAuth(
            Utils.getApiUrl(`/writing/admin/tasks/${taskId}`)
        );
        
        if (response.ok) {
            const task = await response.json();
            WritingState.existingAudios = (task.audios || []).map(audio => ({
                id: audio.id,
                material_id: audio.material_id,
                processing_task_id: audio.processing_task_id,
                title: audio.title || '',
                sort_order: audio.sort_order || 1,
                start_time: audio.start_time,
                end_time: audio.end_time,
                status: audio.status || 'pending',
                modified: false,
            }));
            renderAudioPreviews();
        }
    } catch (e) {
        console.error('Failed to refresh task audios:', e);
    }
}

// ==================== 图片管理功能 ====================

/**
 * 处理图片选择
 */
function handleImageSelect(files) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    Array.from(files).forEach(file => {
        // 验证文件类型
        if (!allowedTypes.includes(file.type)) {
            Utils.showToast(`${file.name} 格式不支持`, 'warning');
            return;
        }
        
        // 验证文件大小
        if (file.size > maxSize) {
            Utils.showToast(`${file.name} 超过5MB限制`, 'warning');
            return;
        }
        
        // 读取文件预览
        const reader = new FileReader();
        reader.onload = function(e) {
            const order = WritingState.existingImages.length + WritingState.pendingImages.length + 1;
            WritingState.pendingImages.push({
                file: file,
                preview: e.target.result,
                caption: '',
                order: order,
            });
            renderImagePreviews();
        };
        reader.readAsDataURL(file);
    });
}

/**
 * 渲染图片预览
 */
function renderImagePreviews() {
    const container = document.getElementById('imagePreviewList');
    const countHint = document.getElementById('imageCountHint');
    
    if (!container) return;
    
    let html = '';
    
    // 渲染已存在的图片（编辑模式）
    WritingState.existingImages.forEach((img, index) => {
        const imgUrl = Utils.getApiUrl(img.image_url);

        html += `
            <div class="image-preview-item existing" data-type="existing" data-id="${img.id}">
                <span class="image-order">${index + 1}</span>
                <span class="image-status existing">已保存</span>
                <img src="${imgUrl}" alt="图片${index + 1}">
                <div class="image-overlay">
                    <button type="button" class="btn-remove-image" onclick="removeExistingImage(${img.id})" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <input type="text" class="image-caption-input" 
                       placeholder="图片说明..." 
                       value="${img.caption || ''}"
                       onchange="updateExistingImageCaption(${img.id}, this.value)">
            </div>
        `;
    });
    
    // 渲染待上传的新图片
    WritingState.pendingImages.forEach((img, index) => {
        const orderNum = WritingState.existingImages.length + index + 1;
        html += `
            <div class="image-preview-item" data-type="pending" data-index="${index}">
                <span class="image-order">${orderNum}</span>
                <span class="image-status new">待上传</span>
                <img src="${img.preview}" alt="新图片${index + 1}">
                <div class="image-overlay">
                    <button type="button" class="btn-remove-image" onclick="removePendingImage(${index})" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <input type="text" class="image-caption-input" 
                       placeholder="图片说明..." 
                       value="${img.caption || ''}"
                       onchange="updatePendingImageCaption(${index}, this.value)">
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // 更新计数
    if (countHint) {
        const totalCount = WritingState.existingImages.length + WritingState.pendingImages.length;
        countHint.textContent = `已选择 ${totalCount} 张图片` + 
            (WritingState.pendingImages.length > 0 ? ` (${WritingState.pendingImages.length} 张待上传)` : '');
    }
}

/**
 * 移除待上传的图片
 */
function removePendingImage(index) {
    WritingState.pendingImages.splice(index, 1);
    WritingState.pendingImages.forEach((img, i) => {
        img.order = WritingState.existingImages.length + i + 1;
    });
    renderImagePreviews();
}

/**
 * 移除已存在的图片
 */
function removeExistingImage(imageId) {
    const index = WritingState.existingImages.findIndex(img => img.id === imageId);
    if (index > -1) {
        WritingState.existingImages.splice(index, 1);
        WritingState.deletedImageIds.push(imageId);
        WritingState.pendingImages.forEach((img, i) => {
            img.order = WritingState.existingImages.length + i + 1;
        });
        renderImagePreviews();
    }
}

/**
 * 更新待上传图片的说明
 */
function updatePendingImageCaption(index, caption) {
    if (WritingState.pendingImages[index]) {
        WritingState.pendingImages[index].caption = caption;
    }
}

/**
 * 更新已存在图片的说明
 */
function updateExistingImageCaption(imageId, caption) {
    const img = WritingState.existingImages.find(i => i.id === imageId);
    if (img) {
        img.caption = caption;
        img.modified = true;
    }
}

/**
 * 清空图片状态
 */
function clearImageState() {
    WritingState.pendingImages = [];
    WritingState.existingImages = [];
    WritingState.deletedImageIds = [];
    renderImagePreviews();
}

// ==================== 任务管理功能 ====================

/**
 * 加载写作任务列表
 */
async function loadWritingTasks() {
    const tableBody = document.getElementById('writingTasksBody');
    const emptyState = document.getElementById('writingTasksEmpty');
    const loadingState = document.getElementById('writingTasksLoading');
    const table = document.getElementById('writingTasksTable');
    
    // 显示加载状态
    table.classList.add('hidden');
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    
    try {
        // 构建查询参数
        const params = new URLSearchParams({
            page: WritingState.currentPage,
            page_size: WritingState.pageSize,
        });
        
        if (WritingState.filters.exam_type) {
            params.append('exam_type', WritingState.filters.exam_type);
        }
        if (WritingState.filters.level) {
            params.append('level', WritingState.filters.level);
        }
        if (WritingState.filters.search) {
            params.append('search', WritingState.filters.search);
        }
        
        const response = await Utils.fetchWithAuth(
            Utils.getApiUrl('/writing/admin/tasks') + '?' + params.toString()
        );
        
        if (!response.ok) {
            throw new Error('Failed to load tasks');
        }
        
        const tasks = await response.json();
        WritingState.tasks = tasks;
        
        // 隐藏加载状态
        loadingState.classList.add('hidden');
        
        if (tasks.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            renderWritingTasksTable(tasks);
            table.classList.remove('hidden');
            renderWritingPagination();
        }
        
    } catch (error) {
        console.error('Error loading writing tasks:', error);
        loadingState.classList.add('hidden');
        Utils.showToast('加载写作任务失败', 'error');
    }
}

/**
 * 渲染写作任务表格
 */
function renderWritingTasksTable(tasks) {
    const tableBody = document.getElementById('writingTasksBody');
    
    tableBody.innerHTML = tasks.map(task => {
        const audioCount = task.audios ? task.audios.length : 0;
        const imageCount = task.images ? task.images.length : 0;
        
        return `
            <tr>
                <td>${task.id}</td>
                <td>
                    <span class="text-truncate" title="${Utils.escapeHtml(task.title)}">
                        ${Utils.escapeHtml(task.title)}
                    </span>
                </td>
                <td>
                    <span class="badge badge-${task.exam_type.toLowerCase()}">
                        ${task.exam_type}
                    </span>
                </td>
                <td>
                    <span class="badge badge-level">${task.level}</span>
                </td>
                <td>${task.min_words || 0} - ${task.max_words || 0}</td>
                <td>
                    <span class="media-count" title="${audioCount} 音频, ${imageCount} 图片">
                        🎵${audioCount} 🖼️${imageCount}
                    </span>
                </td>
                <td>${Utils.formatDate(task.created_at, 'YYYY-MM-DD')}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-icon btn-sm" onclick="editWritingTask(${task.id})" title="编辑">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn btn-icon btn-sm" onclick="viewWritingTask(${task.id})" title="查看">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="btn btn-icon btn-sm" onclick="confirmDeleteWritingTask(${task.id})" title="删除">
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
 * 渲染分页
 */
function renderWritingPagination() {
    const pagination = document.getElementById('writingTasksPagination');
    const totalPages = Math.max(1, WritingState.totalPages);
    const currentPage = WritingState.currentPage;
    
    let html = '';
    
    // 上一页
    html += `
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} 
                onclick="goToWritingPage(${currentPage - 1})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"/>
            </svg>
        </button>
    `;
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="goToWritingPage(${i})">${i}</button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // 下一页
    html += `
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} 
                onclick="goToWritingPage(${currentPage + 1})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6"/>
            </svg>
        </button>
    `;
    
    pagination.innerHTML = html;
}

/**
 * 跳转到指定页
 */
function goToWritingPage(page) {
    WritingState.currentPage = page;
    loadWritingTasks();
}

/**
 * 应用筛选
 */
function applyWritingFilters() {
    WritingState.filters.exam_type = document.getElementById('filterExamType').value;
    WritingState.filters.level = document.getElementById('filterLevel').value;
    WritingState.filters.search = document.getElementById('filterSearch').value;
    WritingState.currentPage = 1;
    loadWritingTasks();
}

/**
 * 显示写作任务模态框
 */
function showWritingTaskModal(task = null) {
    const modal = document.getElementById('writingTaskModal');
    const form = document.getElementById('writingTaskForm');
    const title = document.getElementById('writingModalTitle');
    
    // 重置表单
    form.reset();
    clearImageState();
    clearAudioState();
    
    if (task) {
        // 编辑模式
        title.textContent = '编辑写作任务';
        WritingState.editingTaskId = task.id;
        
        // 填充表单数据
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskExamType').value = task.exam_type || 'DELE';
        document.getElementById('taskLevel').value = task.level || 'B1';
        document.getElementById('taskTitle').value = task.title || '';
        document.getElementById('taskNumber').value = task.task_number || '';
        document.getElementById('taskSection').value = task.section || '';
        document.getElementById('taskDescription').value = task.description_html || '';
        document.getElementById('taskInstructions').value = task.instructions_html || '';
        document.getElementById('taskVocabulary').value = task.vocabulary_html || '';
        document.getElementById('taskStrategy').value = task.strategy_html || '';
        document.getElementById('taskMinWords').value = task.min_words || 150;
        document.getElementById('taskMaxWords').value = task.max_words || 250;
        
        // 加载已有图片
        if (task.images && task.images.length > 0) {
            WritingState.existingImages = task.images.map(img => ({
                id: img.id,
                image_url: img.image_url,
                caption: img.caption || '',
                order: img.sort_order || 1,
                modified: false,
            }));
            renderImagePreviews();
        }
        
        // ✅ [新增] 加载已有音频
        if (task.audios && task.audios.length > 0) {
            WritingState.existingAudios = task.audios.map(audio => ({
                id: audio.id,
                material_id: audio.material_id,
                processing_task_id: audio.processing_task_id,
                title: audio.title || '',
                sort_order: audio.sort_order || 1,
                start_time: audio.start_time,
                end_time: audio.end_time,
                status: audio.status || 'pending',
                modified: false,
            }));
            renderAudioPreviews();
            
            // 对于处理中的音频，启动轮询
            WritingState.existingAudios.forEach(audio => {
                if (audio.status === 'pending' && audio.processing_task_id) {
                    startPollingAudioStatus(audio.processing_task_id, audio.id);
                }
            });
        }
    } else {
        // 新建模式
        title.textContent = '新建写作任务';
        WritingState.editingTaskId = null;
        document.getElementById('taskId').value = '';
    }
    
    modal.classList.remove('hidden');
}

/**
 * 关闭写作任务模态框
 */
function closeWritingTaskModal() {
    const modal = document.getElementById('writingTaskModal');
    modal.classList.add('hidden');
    WritingState.editingTaskId = null;
    clearImageState();
    clearAudioState();
}

/**
 * 保存写作任务
 */
async function saveWritingTask() {
    const form = document.getElementById('writingTaskForm');
    const saveBtn = document.getElementById('btnSaveWritingTask');
    
    // 验证表单
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // 收集表单数据
    const formData = {
        exam_type: document.getElementById('taskExamType').value,
        level: document.getElementById('taskLevel').value,
        title: document.getElementById('taskTitle').value,
        task_number: document.getElementById('taskNumber').value ? 
            parseInt(document.getElementById('taskNumber').value) : null,
        section: document.getElementById('taskSection').value || null,
        description_html: document.getElementById('taskDescription').value || null,
        instructions_html: document.getElementById('taskInstructions').value || null,
        vocabulary_html: document.getElementById('taskVocabulary').value || null,
        strategy_html: document.getElementById('taskStrategy').value || null,
        min_words: parseInt(document.getElementById('taskMinWords').value) || 150,
        max_words: parseInt(document.getElementById('taskMaxWords').value) || 250,
    };
    
    // 设置加载状态
    saveBtn.disabled = true;
    saveBtn.classList.add('loading');
    
    try {
        let taskId;
        let response;
        
        if (WritingState.editingTaskId) {
            // 更新任务
            response = await Utils.fetchWithAuth(
                Utils.getApiUrl(`/writing/admin/tasks/${WritingState.editingTaskId}`),
                {
                    method: 'PUT',
                    body: JSON.stringify(formData),
                }
            );
            taskId = WritingState.editingTaskId;
        } else {
            // 创建任务
            response = await Utils.fetchWithAuth(
                Utils.getApiUrl('/writing/admin/tasks'),
                {
                    method: 'POST',
                    body: JSON.stringify(formData),
                }
            );
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '保存失败');
        }
        
        const taskData = await response.json();
        taskId = taskData.id;
        
        // 处理图片
        await handleImageOperations(taskId);
        
        // ✅ [新增] 处理音频
        const audioResults = await handleAudioOperations(taskId);
        
        Utils.showToast(
            WritingState.editingTaskId ? '任务更新成功' : '任务创建成功', 
            'success'
        );
        
        // 如果有音频正在处理，不关闭模态框，显示处理状态
        if (audioResults.length > 0 && audioResults.some(r => r.status === 'pending')) {
            Utils.showToast('音频正在后台处理中...', 'info');
            // 刷新音频列表
            await refreshTaskAudios(taskId);
        } else {
            closeWritingTaskModal();
        }
        
        loadWritingTasks();
        
    } catch (error) {
        console.error('Error saving task:', error);
        Utils.showToast(error.message || '保存失败', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.classList.remove('loading');
    }
}

/**
 * 处理图片操作
 */
async function handleImageOperations(taskId) {
    // 1. 删除标记为删除的图片
    for (const imageId of WritingState.deletedImageIds) {
        try {
            await Utils.fetchWithAuth(
                Utils.getApiUrl(`/writing/admin/images/${imageId}`),
                { method: 'DELETE' }
            );
        } catch (e) {
            console.error('Failed to delete image:', imageId, e);
        }
    }
    
    // 2. 上传新图片
    for (const img of WritingState.pendingImages) {
        try {
            await uploadSingleImage(taskId, img);
        } catch (e) {
            console.error('Failed to upload image:', e);
            Utils.showToast('部分图片上传失败', 'warning');
        }
    }
}

/**
 * 上传单张图片
 */
async function uploadSingleImage(taskId, imageData) {
    const formData = new FormData();
    formData.append('file', imageData.file);
    formData.append('caption', imageData.caption || '');
    formData.append('sort_order', imageData.order);
    
    const response = await fetch(
        Utils.getApiUrl(`/writing/admin/tasks/${taskId}/images`),
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`,
            },
            body: formData,
        }
    );
    
    if (!response.ok) {
        throw new Error('Image upload failed');
    }
    
    return response.json();
}

/**
 * 编辑写作任务
 */
async function editWritingTask(taskId) {
    try {
        const response = await Utils.fetchWithAuth(
            Utils.getApiUrl(`/writing/admin/tasks/${taskId}`)
        );
        
        if (!response.ok) {
            throw new Error('Failed to load task');
        }
        
        const task = await response.json();
        showWritingTaskModal(task);
        
    } catch (error) {
        console.error('Error loading task:', error);
        Utils.showToast('加载任务失败', 'error');
    }
}

/**
 * 查看写作任务详情
 */
async function viewWritingTask(taskId) {
    await editWritingTask(taskId);
}

/**
 * 确认删除写作任务
 */
function confirmDeleteWritingTask(taskId) {
    const modal = document.getElementById('confirmDeleteModal');
    const confirmBtn = document.getElementById('btnConfirmDelete');
    
    confirmBtn.onclick = function() {
        deleteWritingTask(taskId);
    };
    
    modal.classList.remove('hidden');
}

/**
 * 关闭确认删除模态框
 */
function closeConfirmDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    modal.classList.add('hidden');
}

/**
 * 删除写作任务
 */
async function deleteWritingTask(taskId) {
    try {
        const response = await Utils.fetchWithAuth(
            Utils.getApiUrl(`/writing/admin/tasks/${taskId}`),
            { method: 'DELETE' }
        );
        
        if (!response.ok && response.status !== 204) {
            throw new Error('Delete failed');
        }
        
        Utils.showToast('任务删除成功', 'success');
        closeConfirmDeleteModal();
        loadWritingTasks();
        
    } catch (error) {
        console.error('Error deleting task:', error);
        Utils.showToast('删除失败', 'error');
    }
}

// 暴露到全局
window.showWritingTaskModal = showWritingTaskModal;
window.closeWritingTaskModal = closeWritingTaskModal;
window.editWritingTask = editWritingTask;
window.viewWritingTask = viewWritingTask;
window.confirmDeleteWritingTask = confirmDeleteWritingTask;
window.closeConfirmDeleteModal = closeConfirmDeleteModal;
window.goToWritingPage = goToWritingPage;
window.initWritingModule = initWritingModule;

// 图片相关
window.removePendingImage = removePendingImage;
window.removeExistingImage = removeExistingImage;
window.updatePendingImageCaption = updatePendingImageCaption;
window.updateExistingImageCaption = updateExistingImageCaption;

// ✅ [新增] 音频相关
window.removePendingAudio = removePendingAudio;
window.removeExistingAudio = removeExistingAudio;
window.updatePendingAudioTitle = updatePendingAudioTitle;
window.updateExistingAudioTitle = updateExistingAudioTitle;
window.playAudioPreview = playAudioPreview;