/* ===================================
   口语任务管理模块 - speaking.js
   =================================== */

// 口语模块状态
const SpeakingState = {
    tasks: [],
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    filters: {
        exam_type: '',
        level: '',
        prueba: '',
        search: '',
    },
    editingTaskId: null,
    initialized: false,
    
    // 图片相关状态
    pendingImages: [],
    existingImages: [],
    deletedImageIds: [],
    
    // 音频相关状态
    pendingAudios: [],
    existingAudios: [],
    deletedAudioIds: [],
    processingAudios: new Map(),
    
    // 音频角色选择临时状态
    pendingAudioFile: null,
};

// 音频角色配置
const AUDIO_ROLES = {
    instruction: { label: '指令音频', color: '#3498db' },
    question: { label: '问题音频', color: '#e74c3c' },
    example: { label: '示例音频', color: '#27ae60' },
    prompt: { label: '提示音频', color: '#f39c12' },
    dialogue: { label: '对话音频', color: '#9b59b6' },
    beep: { label: '提示音', color: '#95a5a6' },
};

/**
 * 初始化口语模块
 */
function initSpeakingModule() {
    if (SpeakingState.initialized) {
        loadSpeakingTasks();
        return;
    }
    
    bindSpeakingEvents();
    loadSpeakingTasks();
    SpeakingState.initialized = true;
}

/**
 * 绑定口语模块事件
 */
function bindSpeakingEvents() {
    // 新建任务按钮
    const btnAdd = document.getElementById('btnAddSpeakingTask');
    if (btnAdd) {
        btnAdd.addEventListener('click', () => showSpeakingTaskModal());
    }
    
    // 筛选按钮
    const btnFilter = document.getElementById('btnApplySpeakingFilter');
    if (btnFilter) {
        btnFilter.addEventListener('click', applySpeakingFilters);
    }
    
    // 搜索框回车
    const searchInput = document.getElementById('speakingFilterSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applySpeakingFilters();
        });
    }
    
    // 保存按钮
    const btnSave = document.getElementById('btnSaveSpeakingTask');
    if (btnSave) {
        btnSave.addEventListener('click', saveSpeakingTask);
    }
    
    // 表单提交
    const form = document.getElementById('speakingTaskForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSpeakingTask();
        });
    }
    
    // 图片上传
    initSpeakingImageUpload();
    
    // 音频上传
    initSpeakingAudioUpload();
    
    // 音频角色确认
    const btnConfirmRole = document.getElementById('btnConfirmAudioRole');
    if (btnConfirmRole) {
        btnConfirmRole.addEventListener('click', confirmAudioRole);
    }
    // SIELE T4/T5 组合题模块（自动生成 structure_json）
    initSiele45Builder();
}

// ==================== 图片上传 ====================

function initSpeakingImageUpload() {
    const imageInput = document.getElementById('speakingImageInput');
    const uploadArea = document.getElementById('speakingImageUploadArea');
    
    if (!imageInput || !uploadArea) return;
    
    imageInput.addEventListener('change', (e) => {
        handleSpeakingImageSelect(e.target.files);
        e.target.value = '';
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleSpeakingImageSelect(e.dataTransfer.files);
    });
}

function handleSpeakingImageSelect(files) {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    Array.from(files).forEach(file => {
        if (!allowedTypes.includes(file.type)) {
            Utils.showToast(`${file.name} 格式不支持`, 'warning');
            return;
        }
        if (file.size > maxSize) {
            Utils.showToast(`${file.name} 超过10MB限制`, 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const order = SpeakingState.existingImages.length + SpeakingState.pendingImages.length + 1;
            SpeakingState.pendingImages.push({
                file: file,
                preview: e.target.result,
                caption: '',
                order: order,
            });
            renderSpeakingImagePreviews();
        };
        reader.readAsDataURL(file);
    });
}

function renderSpeakingImagePreviews() {
    const container = document.getElementById('speakingImagePreviewList');
    const countHint = document.getElementById('speakingImageCountHint');
    if (!container) return;
    
    let html = '';
    
    // 已存在的图片
    SpeakingState.existingImages.forEach((img, index) => {
        const imgUrl = img.image_url.startsWith('/') ? Utils.getApiUrl(img.image_url) : img.image_url;
        html += `
            <div class="image-preview-item existing" data-type="existing" data-id="${img.id}">
                <span class="image-order">${index + 1}</span>
                <span class="image-status existing">已保存</span>
                <img src="${imgUrl}" alt="图片${index + 1}">
                <div class="image-overlay">
                    <button type="button" class="btn-remove-image" onclick="removeSpeakingExistingImage(${img.id})" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <input type="text" class="image-caption-input" placeholder="图片说明..." 
                       value="${Utils.escapeHtml(img.caption || '')}"
                       onchange="updateSpeakingExistingImageCaption(${img.id}, this.value)">
            </div>
        `;
    });
    
    // 待上传的图片
    SpeakingState.pendingImages.forEach((img, index) => {
        const orderNum = SpeakingState.existingImages.length + index + 1;
        html += `
            <div class="image-preview-item" data-type="pending" data-index="${index}">
                <span class="image-order">${orderNum}</span>
                <span class="image-status new">待上传</span>
                <img src="${img.preview}" alt="新图片${index + 1}">
                <div class="image-overlay">
                    <button type="button" class="btn-remove-image" onclick="removeSpeakingPendingImage(${index})" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <input type="text" class="image-caption-input" placeholder="图片说明..." 
                       value="${Utils.escapeHtml(img.caption || '')}"
                       onchange="updateSpeakingPendingImageCaption(${index}, this.value)">
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    if (countHint) {
        const total = SpeakingState.existingImages.length + SpeakingState.pendingImages.length;
        const pending = SpeakingState.pendingImages.length;
        countHint.textContent = `已选择 ${total} 张图片` + (pending > 0 ? ` (${pending} 张待上传)` : '');
    }
}

function removeSpeakingPendingImage(index) {
    SpeakingState.pendingImages.splice(index, 1);
    renderSpeakingImagePreviews();
}

function removeSpeakingExistingImage(imageId) {
    const index = SpeakingState.existingImages.findIndex(i => i.id === imageId);
    if (index > -1) {
        SpeakingState.existingImages.splice(index, 1);
        SpeakingState.deletedImageIds.push(imageId);
        renderSpeakingImagePreviews();
    }
}

function updateSpeakingPendingImageCaption(index, caption) {
    if (SpeakingState.pendingImages[index]) {
        SpeakingState.pendingImages[index].caption = caption;
    }
}

function updateSpeakingExistingImageCaption(imageId, caption) {
    const img = SpeakingState.existingImages.find(i => i.id === imageId);
    if (img) {
        img.caption = caption;
        img.modified = true;
    }
}

// ==================== 音频上传 ====================

function initSpeakingAudioUpload() {
    const audioInput = document.getElementById('speakingAudioInput');
    const uploadArea = document.getElementById('speakingAudioUploadArea');
    
    if (!audioInput || !uploadArea) return;
    
    audioInput.addEventListener('change', (e) => {
        handleSpeakingAudioSelect(e.target.files);
        e.target.value = '';
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleSpeakingAudioSelect(e.dataTransfer.files);
    });
}

function handleSpeakingAudioSelect(files) {
    const maxSize = 50 * 1024 * 1024;
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'];
    
    Array.from(files).forEach(file => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            Utils.showToast(`${file.name} 格式不支持`, 'warning');
            return;
        }
        if (file.size > maxSize) {
            Utils.showToast(`${file.name} 超过50MB限制`, 'warning');
            return;
        }
        
        // 显示角色选择模态框
        SpeakingState.pendingAudioFile = file;
        showSpeakingAudioRoleModal(file.name);
    });
}

function showSpeakingAudioRoleModal(filename) {
    const modal = document.getElementById('speakingAudioRoleModal');
    const titleInput = document.getElementById('speakingAudioTitleInput');
    
    if (titleInput) {
        titleInput.value = filename.replace(/\.[^/.]+$/, '');
    }
    
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeSpeakingAudioRoleModal() {
    const modal = document.getElementById('speakingAudioRoleModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    SpeakingState.pendingAudioFile = null;
}

function confirmAudioRole() {
    const file = SpeakingState.pendingAudioFile;
    if (!file) return;
    
    const role = document.getElementById('speakingAudioRoleSelect').value;
    const title = document.getElementById('speakingAudioTitleInput').value || file.name;
    
    const order = SpeakingState.existingAudios.length + SpeakingState.pendingAudios.length + 1;
    
    SpeakingState.pendingAudios.push({
        file: file,
        title: title,
        role: role,
        description: '',
        sort_order: order,
    });
    
    closeSpeakingAudioRoleModal();
    renderSpeakingAudioPreviews();
}

function renderSpeakingAudioPreviews() {
    const container = document.getElementById('speakingAudioPreviewList');
    const countHint = document.getElementById('speakingAudioCountHint');
    if (!container) return;
    
    let html = '';
    
    // 已存在的音频
    SpeakingState.existingAudios.forEach((audio, index) => {
        const roleConfig = AUDIO_ROLES[audio.role] || { label: audio.role, color: '#666' };
        const statusClass = audio.status === 'completed' ? 'status-completed' : 
                           audio.status === 'pending' ? 'status-pending' : 'status-failed';
        const statusText = audio.status === 'completed' ? '已完成' : 
                          audio.status === 'pending' ? '处理中...' : '失败';
        
        html += `
            <div class="audio-preview-item existing ${statusClass}" data-type="existing" data-id="${audio.id}">
                <div class="audio-info">
                    <span class="audio-order">${index + 1}</span>
                    <div class="audio-icon" style="background: ${roleConfig.color}">
                        ${audio.status === 'pending' ? '<div class="audio-spinner"></div>' : `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        </svg>`}
                    </div>
                    <div class="audio-details">
                        <input type="text" class="audio-title-input" placeholder="音频标题" 
                               value="${Utils.escapeHtml(audio.title || '')}"
                               onchange="updateSpeakingExistingAudioTitle(${audio.id}, this.value)"
                               ${audio.status === 'pending' ? 'disabled' : ''}>
                        <div class="audio-meta">
                            <span class="audio-role-badge" style="background: ${roleConfig.color}">${roleConfig.label}</span>
                            <span class="audio-status ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                </div>
                <div class="audio-actions">
                    <button type="button" class="btn-audio-remove" onclick="removeSpeakingExistingAudio(${audio.id})" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    // 待上传的音频
    SpeakingState.pendingAudios.forEach((audio, index) => {
        const roleConfig = AUDIO_ROLES[audio.role] || { label: audio.role, color: '#666' };
        const orderNum = SpeakingState.existingAudios.length + index + 1;
        const fileSize = formatFileSize(audio.file.size);
        
        html += `
            <div class="audio-preview-item pending" data-type="pending" data-index="${index}">
                <div class="audio-info">
                    <span class="audio-order">${orderNum}</span>
                    <div class="audio-icon new" style="background: ${roleConfig.color}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        </svg>
                    </div>
                    <div class="audio-details">
                        <input type="text" class="audio-title-input" placeholder="音频标题" 
                               value="${Utils.escapeHtml(audio.title)}"
                               onchange="updateSpeakingPendingAudioTitle(${index}, this.value)">
                        <div class="audio-meta">
                            <span class="audio-role-badge" style="background: ${roleConfig.color}">${roleConfig.label}</span>
                            <span class="audio-status pending">待上传 (${fileSize})</span>
                        </div>
                    </div>
                </div>
                <div class="audio-actions">
                    <button type="button" class="btn-audio-remove" onclick="removeSpeakingPendingAudio(${index})" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    if (countHint) {
        const existing = SpeakingState.existingAudios.length;
        const pending = SpeakingState.pendingAudios.length;
        countHint.textContent = `已关联 ${existing} 个音频` + (pending > 0 ? ` (${pending} 个待上传)` : '');
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function removeSpeakingPendingAudio(index) {
    SpeakingState.pendingAudios.splice(index, 1);
    renderSpeakingAudioPreviews();
}

function removeSpeakingExistingAudio(audioId) {
    const index = SpeakingState.existingAudios.findIndex(a => a.id === audioId);
    if (index > -1) {
        SpeakingState.existingAudios.splice(index, 1);
        SpeakingState.deletedAudioIds.push(audioId);
        renderSpeakingAudioPreviews();
    }
}

function updateSpeakingPendingAudioTitle(index, title) {
    if (SpeakingState.pendingAudios[index]) {
        SpeakingState.pendingAudios[index].title = title;
    }
}

function updateSpeakingExistingAudioTitle(audioId, title) {
    const audio = SpeakingState.existingAudios.find(a => a.id === audioId);
    if (audio) {
        audio.title = title;
        audio.modified = true;
    }
}

// ==================== 任务列表 ====================

async function loadSpeakingTasks() {
    const tableBody = document.getElementById('speakingTasksBody');
    const emptyState = document.getElementById('speakingTasksEmpty');
    const loadingState = document.getElementById('speakingTasksLoading');
    const table = document.getElementById('speakingTasksTable');
    
    if (!tableBody) return;
    
    table?.classList.add('hidden');
    emptyState?.classList.add('hidden');
    loadingState?.classList.remove('hidden');
    
    try {
        const params = new URLSearchParams({
            page: SpeakingState.currentPage,
            page_size: SpeakingState.pageSize,
        });
        
        if (SpeakingState.filters.exam_type) params.append('exam_type', SpeakingState.filters.exam_type);
        if (SpeakingState.filters.level) params.append('level', SpeakingState.filters.level);
        if (SpeakingState.filters.prueba) params.append('prueba', SpeakingState.filters.prueba);
        if (SpeakingState.filters.search) params.append('search', SpeakingState.filters.search);
        
        const response = await Utils.fetchWithAuth(
            Utils.getApiUrl(CONFIG.API.SPEAKING.TASKS) + '?' + params.toString()
        );
        
        if (!response.ok) throw new Error('Failed to load tasks');
        
        const data = await response.json();
        SpeakingState.tasks = data.items || [];
        SpeakingState.totalPages = data.total_pages || 1;
        
        loadingState?.classList.add('hidden');
        
        if (SpeakingState.tasks.length === 0) {
            emptyState?.classList.remove('hidden');
        } else {
            renderSpeakingTasksTable(SpeakingState.tasks);
            table?.classList.remove('hidden');
            renderSpeakingPagination();
        }
        
    } catch (error) {
        console.error('Error loading speaking tasks:', error);
        loadingState?.classList.add('hidden');
        Utils.showToast('加载口语任务失败', 'error');
    }
}

function renderSpeakingTasksTable(tasks) {
    const tableBody = document.getElementById('speakingTasksBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = tasks.map(task => {
        const audioCount = task.audio_count || 0;
        const imageCount = task.image_count || 0;
        
        return `
            <tr>
                <td>${task.id}</td>
                <td>
                    <span class="text-truncate" title="${Utils.escapeHtml(task.title)}">
                        ${Utils.escapeHtml(task.title)}
                    </span>
                </td>
                <td>
                    <span class="badge badge-${task.exam_type.toLowerCase()}">${task.exam_type}</span>
                </td>
                <td>
                    <span class="badge badge-level">${task.level}</span>
                </td>
                <td>${task.prueba ? 'Prueba ' + task.prueba : '-'}</td>
                <td>${task.task_number || '-'}</td>
                <td>
                    <span class="media-count" title="${audioCount} 音频, ${imageCount} 图片">
                        🎤${audioCount} 🖼️${imageCount}
                    </span>
                </td>
                <td>${Utils.formatDate(task.created_at, 'YYYY-MM-DD')}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-icon btn-sm" onclick="editSpeakingTask(${task.id})" title="编辑">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn btn-icon btn-sm btn-danger" onclick="confirmDeleteSpeakingTask(${task.id})" title="删除">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderSpeakingPagination() {
    const pagination = document.getElementById('speakingTasksPagination');
    if (!pagination) return;
    
    const totalPages = Math.max(1, SpeakingState.totalPages);
    const currentPage = SpeakingState.currentPage;
    
    let html = `
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToSpeakingPage(${currentPage - 1})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToSpeakingPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    html += `
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToSpeakingPage(${currentPage + 1})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
    `;
    
    pagination.innerHTML = html;
}

function goToSpeakingPage(page) {
    SpeakingState.currentPage = page;
    loadSpeakingTasks();
}

function applySpeakingFilters() {
    SpeakingState.filters.exam_type = document.getElementById('speakingFilterExamType')?.value || '';
    SpeakingState.filters.level = document.getElementById('speakingFilterLevel')?.value || '';
    SpeakingState.filters.prueba = document.getElementById('speakingFilterPrueba')?.value || '';
    SpeakingState.filters.search = document.getElementById('speakingFilterSearch')?.value || '';
    SpeakingState.currentPage = 1;
    loadSpeakingTasks();
}

// ==================== 任务模态框 ====================

function showSpeakingTaskModal(task = null) {
    const modal = document.getElementById('speakingTaskModal');
    const form = document.getElementById('speakingTaskForm');
    const title = document.getElementById('speakingModalTitle');
    
    if (!modal || !form) return;
    
    form.reset();
    clearSpeakingMediaState();
    
    if (task) {
        title.textContent = '编辑口语任务';
        SpeakingState.editingTaskId = task.id;
        
        document.getElementById('speakingTaskId').value = task.id;
        document.getElementById('speakingExamType').value = task.exam_type || 'DELE';
        document.getElementById('speakingLevel').value = task.level || 'B1';
        document.getElementById('speakingPrueba').value = task.prueba || '';
        document.getElementById('speakingTaskNumber').value = task.task_number || '';
        document.getElementById('speakingSection').value = task.section || '';
        document.getElementById('speakingTitle').value = task.title || '';
        document.getElementById('speakingDescription').value = task.description_html || '';
        document.getElementById('speakingInstructions').value = task.instructions_html || '';
        document.getElementById('speakingVocabulary').value = task.vocabulary_html || '';
        document.getElementById('speakingStrategy').value = task.strategy_html || '';
        document.getElementById('speakingFlowJson').value = JSON.stringify(task.flow_json || {}, null, 2);
        document.getElementById('speakingStructureJson').value = JSON.stringify(task.structure_json || {}, null, 2);
        fillSiele45BuilderFromTask(task);
        // 加载已有图片
        if (task.images?.length > 0) {
            SpeakingState.existingImages = task.images.map(img => ({
                id: img.id,
                image_url: img.image_url,
                caption: img.caption || '',
                order: img.sort_order || 1,
            }));
            renderSpeakingImagePreviews();
        }
        
        // 加载已有音频
        if (task.audios?.length > 0) {
            SpeakingState.existingAudios = task.audios.map(audio => ({
                id: audio.id,
                material_id: audio.material_id,
                processing_task_id: audio.processing_task_id,
                title: audio.title || '',
                role: audio.role || 'instruction',
                sort_order: audio.sort_order || 1,
                status: audio.status || 'pending',
            }));
            renderSpeakingAudioPreviews();
        }
    } else {
        title.textContent = '新建口语任务';
        SpeakingState.editingTaskId = null;
        document.getElementById('speakingTaskId').value = '';
    }
    
    modal.classList.remove('hidden');
}

function closeSpeakingTaskModal() {
    const modal = document.getElementById('speakingTaskModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    SpeakingState.editingTaskId = null;
    clearSpeakingMediaState();
}

function clearSpeakingMediaState() {
    SpeakingState.pendingImages = [];
    SpeakingState.existingImages = [];
    SpeakingState.deletedImageIds = [];
    SpeakingState.pendingAudios = [];
    SpeakingState.existingAudios = [];
    SpeakingState.deletedAudioIds = [];
    SpeakingState.processingAudios.clear();
    renderSpeakingImagePreviews();
    renderSpeakingAudioPreviews();
}

function toggleAdvancedField(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.toggle('hidden');
    }
}

// ==================== 保存任务 ====================

async function saveSpeakingTask() {
    const form = document.getElementById('speakingTaskForm');
    const saveBtn = document.getElementById('btnSaveSpeakingTask');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
       // 如果启用了 SIELE T4/T5 Builder，则保存前强制生成 structure_json
    const sieleToggle = document.getElementById('enableSiele45Builder');
    if (sieleToggle?.checked) {
        const ok = buildSiele45StructureJson(true);
        if (!ok) return; // 校验不通过就阻止保存
    }


    // 解析 JSON 字段
    let flowJson = {};
    let structureJson = {};
    
    try {
        const flowStr = document.getElementById('speakingFlowJson').value.trim();
        if (flowStr) flowJson = JSON.parse(flowStr);
    } catch (e) {
        Utils.showToast('流程配置 JSON 格式错误', 'error');
        return;
    }
    
    try {
        const structStr = document.getElementById('speakingStructureJson').value.trim();
        if (structStr) structureJson = JSON.parse(structStr);
    } catch (e) {
        Utils.showToast('结构配置 JSON 格式错误', 'error');
        return;
    }
    
    const formData = {
        exam_type: document.getElementById('speakingExamType').value,
        level: document.getElementById('speakingLevel').value,
        prueba: document.getElementById('speakingPrueba').value || null,
        task_number: document.getElementById('speakingTaskNumber').value ? 
            parseInt(document.getElementById('speakingTaskNumber').value) : null,
        section: document.getElementById('speakingSection').value || null,
        title: document.getElementById('speakingTitle').value,
        description_html: document.getElementById('speakingDescription').value || null,
        instructions_html: document.getElementById('speakingInstructions').value || null,
        vocabulary_html: document.getElementById('speakingVocabulary').value || null,
        strategy_html: document.getElementById('speakingStrategy').value || null,
        flow_json: flowJson,
        structure_json: structureJson,
    };
    
    saveBtn.disabled = true;
    saveBtn.classList.add('loading');
    
    try {
        let taskId;
        let response;
        
        if (SpeakingState.editingTaskId) {
            response = await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.SPEAKING.TASK_DETAIL(SpeakingState.editingTaskId)),
                { method: 'PATCH', body: JSON.stringify(formData) }
            );
            taskId = SpeakingState.editingTaskId;
        } else {
            response = await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.SPEAKING.TASKS),
                { method: 'POST', body: JSON.stringify(formData) }
            );
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '保存失败');
        }
        
        const taskData = await response.json();
        taskId = taskData.id;
        
        // 处理图片
        await handleSpeakingImageOperations(taskId);
        
        // 处理音频
        await handleSpeakingAudioOperations(taskId);
        
        Utils.showToast(SpeakingState.editingTaskId ? '任务更新成功' : '任务创建成功', 'success');
        closeSpeakingTaskModal();
        loadSpeakingTasks();
        
    } catch (error) {
        console.error('Error saving task:', error);
        Utils.showToast(error.message || '保存失败', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.classList.remove('loading');
    }
}

async function handleSpeakingImageOperations(taskId) {
    // 删除
    for (const imageId of SpeakingState.deletedImageIds) {
        try {
            await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.SPEAKING.IMAGE_DETAIL(taskId, imageId)),
                { method: 'DELETE' }
            );
        } catch (e) {
            console.error('Failed to delete image:', imageId, e);
        }
    }
    
    // 上传新图片
    for (const img of SpeakingState.pendingImages) {
        try {
            const formData = new FormData();
            formData.append('file', img.file);
            formData.append('caption', img.caption || '');
            formData.append('sort_order', img.order);
            
            await fetch(Utils.getApiUrl(CONFIG.API.SPEAKING.TASK_IMAGES(taskId)), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Utils.getToken()}` },
                body: formData,
            });
        } catch (e) {
            console.error('Failed to upload image:', e);
        }
    }
}

async function handleSpeakingAudioOperations(taskId) {
    // 删除
    for (const audioId of SpeakingState.deletedAudioIds) {
        try {
            await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.SPEAKING.AUDIO_DETAIL(taskId, audioId)),
                { method: 'DELETE' }
            );
        } catch (e) {
            console.error('Failed to delete audio:', audioId, e);
        }
    }
    
    // 上传新音频
    for (const audio of SpeakingState.pendingAudios) {
        try {
            const formData = new FormData();
            formData.append('file', audio.file);
            formData.append('title', audio.title || '口语音频');
            formData.append('role', audio.role || 'instruction');
            formData.append('description', audio.description || '');
            formData.append('sort_order', audio.sort_order || 1);
            
            await fetch(Utils.getApiUrl(CONFIG.API.SPEAKING.AUDIO_UPLOAD(taskId)), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Utils.getToken()}` },
                body: formData,
            });
        } catch (e) {
            console.error('Failed to upload audio:', e);
            Utils.showToast('部分音频上传失败', 'warning');
        }
    }
}

// ==================== 编辑 & 删除 ====================

async function editSpeakingTask(taskId) {
    try {
        const response = await Utils.fetchWithAuth(
            Utils.getApiUrl(CONFIG.API.SPEAKING.TASK_DETAIL(taskId))
        );
        
        if (!response.ok) throw new Error('Failed to load task');
        
        const task = await response.json();
        showSpeakingTaskModal(task);
        
    } catch (error) {
        console.error('Error loading task:', error);
        Utils.showToast('加载任务失败', 'error');
    }
}

function confirmDeleteSpeakingTask(taskId) {
    if (typeof openConfirmDeleteModal === 'function') {
        openConfirmDeleteModal(() => deleteSpeakingTask(taskId), '确定要删除此口语任务吗？此操作无法撤销。');
    } else if (confirm('确定要删除此口语任务吗？')) {
        deleteSpeakingTask(taskId);
    }
}

async function deleteSpeakingTask(taskId) {
    try {
        const response = await Utils.fetchWithAuth(
            Utils.getApiUrl(CONFIG.API.SPEAKING.TASK_DETAIL(taskId)),
            { method: 'DELETE' }
        );
        
        if (!response.ok && response.status !== 204) {
            throw new Error('Delete failed');
        }
        
        Utils.showToast('任务删除成功', 'success');
        loadSpeakingTasks();
        
    } catch (error) {
        console.error('Error deleting task:', error);
        Utils.showToast('删除失败', 'error');
    }
}


// ==================== SIELE T4/T5 Builder（模块化结构配置） ====================

function initSiele45Builder() {
    const toggle = document.getElementById('enableSiele45Builder');
    const panel = document.getElementById('siele45Panel');
    const btn = document.getElementById('btnSiele45BuildJson');

    if (!toggle || !panel || !btn) return;

    toggle.addEventListener('change', () => {
        panel.classList.toggle('hidden', !toggle.checked);
        if (toggle.checked) buildSiele45StructureJson(true); // 勾选就生成一次（静默）
    });

    btn.addEventListener('click', () => buildSiele45StructureJson(false));

    // 输入时实时更新（静默）
    [
        'siele45ReadingTitle', 'siele45Label', 'siele45ReadingText',
        'siele45Option1', 'siele45Option2', 'siele45PrepSec', 'siele45SpeakSec'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => {
            if (toggle.checked) buildSiele45StructureJson(true);
        });
    });
}

/**
 * 将模块表单内容写入 speakingStructureJson textarea
 * silent=true 不弹 Toast
 */
function buildSiele45StructureJson(silent = false) {
    const title = document.getElementById('siele45ReadingTitle')?.value?.trim() || '';
    const label = document.getElementById('siele45Label')?.value?.trim() || 'Tarea 4/5';
    const readingText = document.getElementById('siele45ReadingText')?.value?.trim() || '';
    const op1 = document.getElementById('siele45Option1')?.value?.trim() || '';
    const op2 = document.getElementById('siele45Option2')?.value?.trim() || '';
    const prep = parseInt(document.getElementById('siele45PrepSec')?.value || '120', 10);
    const speak = parseInt(document.getElementById('siele45SpeakSec')?.value || '240', 10);

    // 最小校验：阅读 + 两个选项
    if (!readingText || !op1 || !op2) {
        if (!silent) Utils.showToast('请至少填写：阅读文本 + Opción 1 + Opción 2', 'warning');
        return false;
    }

    const structure = {
        variant: "siele_t4_t5_combo",
        label: label,
        parts: [
            {
                part: "tarea4",
                label: "Tarea 4",
                ui: "reading_with_questions",
                reading_title: title || null,
                reading_text: readingText,
                time_rule: "1min_per_question"
            },
            {
                part: "tarea5",
                label: "Tarea 5",
                ui: "choose_and_argue",
                depends_on: "tarea4",
                prep_time_sec: Number.isFinite(prep) ? prep : 120,
                speak_time_sec: Number.isFinite(speak) ? speak : 240,
                options: [
                    { id: "op1", title: "OPCIÓN 1", text: op1 },
                    { id: "op2", title: "OPCIÓN 2", text: op2 }
                ]
            }
        ]
    };

    const textarea = document.getElementById('speakingStructureJson');
    if (textarea) textarea.value = JSON.stringify(structure, null, 2);

    if (!silent) Utils.showToast('结构 JSON 已生成', 'success');
    return true;
}

/**
 * 编辑任务时：如果结构是 siele_t4_t5_combo，则回填到 Builder
 */
function fillSiele45BuilderFromTask(task) {
    const toggle = document.getElementById('enableSiele45Builder');
    const panel = document.getElementById('siele45Panel');

    if (!toggle || !panel) return;

    const s = task?.structure_json || {};
    if (!s || s.variant !== 'siele_t4_t5_combo') {
        // 不是组合题：关掉面板（避免干扰）
        toggle.checked = false;
        panel.classList.add('hidden');
        return;
    }

    toggle.checked = true;
    panel.classList.remove('hidden');

    const parts = Array.isArray(s.parts) ? s.parts : [];
    const p4 = parts.find(x => x.part === 'tarea4') || {};
    const p5 = parts.find(x => x.part === 'tarea5') || {};
    const opts = Array.isArray(p5.options) ? p5.options : [];

    document.getElementById('siele45ReadingTitle').value = p4.reading_title || '';
    document.getElementById('siele45Label').value = s.label || 'Tarea 4/5';
    document.getElementById('siele45ReadingText').value = p4.reading_text || '';
    document.getElementById('siele45Option1').value = (opts.find(o => o.id === 'op1')?.text) || (opts[0]?.text || '');
    document.getElementById('siele45Option2').value = (opts.find(o => o.id === 'op2')?.text) || (opts[1]?.text || '');
    document.getElementById('siele45PrepSec').value = p5.prep_time_sec ?? 120;
    document.getElementById('siele45SpeakSec').value = p5.speak_time_sec ?? 240;

    // 回填后再生成一次，保证 textarea 同步
    buildSiele45StructureJson(true);
}



// ==================== 暴露到全局 ====================
window.initSpeakingModule = initSpeakingModule;
window.showSpeakingTaskModal = showSpeakingTaskModal;
window.closeSpeakingTaskModal = closeSpeakingTaskModal;
window.editSpeakingTask = editSpeakingTask;
window.confirmDeleteSpeakingTask = confirmDeleteSpeakingTask;
window.goToSpeakingPage = goToSpeakingPage;
window.toggleAdvancedField = toggleAdvancedField;

// 图片
window.removeSpeakingPendingImage = removeSpeakingPendingImage;
window.removeSpeakingExistingImage = removeSpeakingExistingImage;
window.updateSpeakingPendingImageCaption = updateSpeakingPendingImageCaption;
window.updateSpeakingExistingImageCaption = updateSpeakingExistingImageCaption;

// 音频
window.removeSpeakingPendingAudio = removeSpeakingPendingAudio;
window.removeSpeakingExistingAudio = removeSpeakingExistingAudio;
window.updateSpeakingPendingAudioTitle = updateSpeakingPendingAudioTitle;
window.updateSpeakingExistingAudioTitle = updateSpeakingExistingAudioTitle;
window.closeSpeakingAudioRoleModal = closeSpeakingAudioRoleModal;