/* ===================================
   听力 Tarea 管理模块 - listening_tareas.js (Fixed)
   支持多文件上传、批量处理、拖拽排序
   修复: 函数命名、筛选器ID、内联音频上传
   =================================== */

const ListeningTareasState = {
    tareas: [],
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    filters: {
        level: '',
        exam_type: '',
        search: '',
    },
    selectedTarea: null,
    selectedTareaData: null,
    tareaAudios: [],
    // 多文件上传支持
    pendingAudioFiles: [], // [{file, title, sortOrder}]
    processingTasks: new Map(),
    initialized: false,
};

function initListeningTareasModule() {
    if (ListeningTareasState.initialized) {
        console.log('⚠️ Listening Tareas Module already initialized');
        return;
    }

    console.log('🎵 Initializing Listening Tareas Module...');

    // 多文件选择 - 主模态框
    const fileInput = document.getElementById('tareaAudioFileInput');
    if (fileInput) {
        fileInput.setAttribute('multiple', 'multiple');
        fileInput.addEventListener('change', handleMultipleAudioFilesSelect);
    }

    // 多文件选择 - 内联模态框
    const fileInputInline = document.getElementById('tareaAudioFileInputInline');
    if (fileInputInline) {
        fileInputInline.setAttribute('multiple', 'multiple');
        fileInputInline.addEventListener('change', handleInlineAudioFilesSelect);
    }

    // 初始化拖拽上传
    initDragDropUpload();

    loadTareas(1);
    ListeningTareasState.initialized = true;
    console.log('✅ Listening Tareas Module initialized');
}

function initDragDropUpload() {
    // 主音频上传区域
    const uploadBox = document.getElementById('tareaAudioDropzone');
    if (uploadBox) {
        setupDropzone(uploadBox, false);
    }

    // 内联音频上传区域
    const uploadBoxInline = document.getElementById('tareaAudioDropzoneInline');
    if (uploadBoxInline) {
        setupDropzone(uploadBoxInline, true);
    }
}

function setupDropzone(element, isInline) {
    element.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('drag-over');
    });

    element.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
    });

    element.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
        if (files.length > 0) {
            if (isInline) {
                addFilesToInlineList(files);
            } else {
                addFilesToPendingList(files);
            }
        }
    });
}

// ==================== Tarea 列表 ====================

async function loadTareas(page) {
    page = page || 1;
    
    const tbody = document.getElementById('listeningTareasBody');
    const loading = document.getElementById('listeningTareasLoading');
    const empty = document.getElementById('listeningTareasEmpty');
    const table = document.getElementById('listeningTareasTable');

    if (loading) loading.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');
    if (table) table.style.display = 'none';
    if (tbody) tbody.innerHTML = '';

    try {
        const params = new URLSearchParams({
            page: page,
            page_size: ListeningTareasState.pageSize,
        });
        
        if (ListeningTareasState.filters.level) params.append('level', ListeningTareasState.filters.level);
        if (ListeningTareasState.filters.exam_type) params.append('exam_type', ListeningTareasState.filters.exam_type);
        if (ListeningTareasState.filters.search) params.append('search', ListeningTareasState.filters.search);

        const url = CONFIG.API_BASE_URL + '/listening/admin/tareas?' + params.toString();
        const res = await Utils.fetchWithAuth(url);
        
        if (!res.ok) throw new Error('HTTP ' + res.status);
        
        const data = await res.json();

        ListeningTareasState.tareas = data.items || [];
        ListeningTareasState.currentPage = data.page || page;
        ListeningTareasState.totalPages = data.total_pages || 1;

        if (loading) loading.classList.add('hidden');

        if (ListeningTareasState.tareas.length === 0) {
            if (empty) empty.classList.remove('hidden');
        } else {
            if (table) table.style.display = 'table';
            renderTareasTable();
            renderTareasPagination();
        }
    } catch (err) {
        console.error('Failed to load tareas:', err);
        if (loading) loading.classList.add('hidden');
        Utils.showToast('加载 Tareas 失败：' + err.message, 'error');
    }
}

function renderTareasTable() {
    const tbody = document.getElementById('listeningTareasBody');
    if (!tbody) return;

    const rows = ListeningTareasState.tareas.map(function(t) {
        const audioCount = t.audio_count || 0;
        const hasQuestions = t.has_questions || false;
        const createdAt = t.created_at ? Utils.formatDate(new Date(t.created_at * 1000)) : '-';
        
        // 题目状态显示
        const questionsStatus = hasQuestions 
            ? '<span class="badge badge-success">已配置</span>'
            : '<span class="badge badge-info">待配置</span>';
        
        return '<tr>' +
            '<td>' + t.id + '</td>' +
            '<td>' + Utils.escapeHtml(t.title || '') + '</td>' +
            '<td><span class="badge badge-' + (t.exam_type === 'DELE' ? 'dele' : 'siele') + '">' + t.exam_type + '</span></td>' +
            '<td><span class="badge badge-level">' + t.level + '</span></td>' +
            '<td>' + (t.tarea_number || '-') + '</td>' +
            '<td><span class="audio-count ' + (audioCount > 0 ? 'has-audio' : '') + '">' + audioCount + '</span></td>' +
            '<td>' + questionsStatus + '</td>' +
            '<td>' + createdAt + '</td>' +
            '<td>' +
                '<div class="action-buttons">' +
                    '<button class="btn-icon" onclick="showTareaAudiosModal(' + t.id + ')" title="音频管理">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
                    '</button>' +
                    '<button class="btn-icon" onclick="showTareaModal(' + t.id + ')" title="编辑">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                    '</button>' +
                    '<button class="btn-icon" onclick="showTareaQuestionsModal(' + t.id + ')" title="题目管理">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
                    '</button>' +
                    '<button class="btn-icon btn-danger" onclick="confirmDeleteTarea(' + t.id + ')" title="删除">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                    '</button>' +
                '</div>' +
            '</td>' +
        '</tr>';
    });
    
    tbody.innerHTML = rows.join('');
}

function renderTareasPagination() {
    const container = document.getElementById('listeningTareasPagination');
    if (!container) return;

    if (ListeningTareasState.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const cp = ListeningTareasState.currentPage;
    const tp = ListeningTareasState.totalPages;

    let html = '<div class="pagination-info">第 ' + cp + ' / ' + tp + ' 页</div>';
    html += '<div class="pagination-buttons">';

    if (cp > 1) html += '<button class="btn btn-sm" onclick="loadTareas(' + (cp - 1) + ')">上一页</button>';

    for (let i = 1; i <= tp; i++) {
        if (i === cp) {
            html += '<button class="btn btn-sm btn-primary">' + i + '</button>';
        } else if (i === 1 || i === tp || Math.abs(i - cp) <= 2) {
            html += '<button class="btn btn-sm" onclick="loadTareas(' + i + ')">' + i + '</button>';
        } else if (Math.abs(i - cp) === 3) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }

    if (cp < tp) html += '<button class="btn btn-sm" onclick="loadTareas(' + (cp + 1) + ')">下一页</button>';
    html += '</div>';
    container.innerHTML = html;
}

// 修复：匹配 HTML 中的筛选器 ID
function applyTareaFilters() {
    ListeningTareasState.filters.level = document.getElementById('filterListeningTareaLevel')?.value || '';
    ListeningTareasState.filters.exam_type = document.getElementById('filterListeningExamType')?.value || '';
    ListeningTareasState.filters.search = document.getElementById('filterListeningTareaSearch')?.value || '';
    loadTareas(1);
}

// 兼容旧的函数名
function filterListening() {
    applyTareaFilters();
}

// ==================== Tarea CRUD ====================

function showTareaModal(tareaId) {
    const modal = document.getElementById('listeningTareaModal');
    const titleEl = document.getElementById('listeningTareaModalTitle');
    const audioSection = document.getElementById('tareaAudioUploadSection');
    
    if (!modal) {
        console.error('Modal not found: listeningTareaModal');
        return;
    }

    // 重置表单
    document.getElementById('listeningTareaForm')?.reset();
    
    if (!tareaId) {
        // 新建模式
        document.getElementById('listeningTareaId').value = '';
        document.getElementById('listeningExamType').value = 'DELE';
        document.getElementById('listeningLevel').value = 'B1';
        document.getElementById('listeningTareaNumber').value = '1';
        document.getElementById('listeningTitle').value = '';
        document.getElementById('listeningDuration').value = '';
        document.getElementById('listeningDescription').value = '';
        document.getElementById('listeningInstructions').value = '';
        
        // 隐藏音频上传区域（新建时先保存再上传）
        if (audioSection) audioSection.classList.add('hidden');
        
        if (titleEl) titleEl.textContent = '新建听力 Tarea';
        modal.classList.remove('hidden');
        return;
    }

    // 编辑模式 - 加载数据
    loadTareaForEdit(tareaId, modal, titleEl, audioSection);
}

async function loadTareaForEdit(tareaId, modal, titleEl, audioSection) {
    try {
        const res = await Utils.fetchWithAuth(CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const tarea = await res.json();

        document.getElementById('listeningTareaId').value = tarea.id;
        document.getElementById('listeningExamType').value = tarea.exam_type || 'DELE';
        document.getElementById('listeningLevel').value = tarea.level || 'B1';
        document.getElementById('listeningTareaNumber').value = tarea.tarea_number || '1';
        document.getElementById('listeningTitle').value = tarea.title || '';
        document.getElementById('listeningDuration').value = tarea.duration_minutes || '';
        document.getElementById('listeningDescription').value = tarea.description || '';
        document.getElementById('listeningInstructions').value = tarea.instructions_html || '';
        
        // 显示音频上传区域
        if (audioSection) {
            audioSection.classList.remove('hidden');
            ListeningTareasState.selectedTarea = tareaId;
            loadInlineAudios(tareaId);
        }
        
        if (titleEl) titleEl.textContent = '编辑 Tarea #' + tarea.id;
        modal.classList.remove('hidden');
    } catch (err) {
        Utils.showToast('加载失败：' + err.message, 'error');
    }
}

function closeTareaModal() {
    document.getElementById('listeningTareaModal')?.classList.add('hidden');
    ListeningTareasState.selectedTarea = null;
}

// 兼容别名
function closeListeningTareaModal() {
    closeTareaModal();
}

function saveListeningTarea() {
    saveTarea();
}

async function saveTarea() {
    const tareaId = document.getElementById('listeningTareaId')?.value;
    const btn = document.getElementById('btnSaveTarea');
    const btnText = btn?.querySelector('.btn-text');
    const btnLoader = btn?.querySelector('.btn-loader');
    
    const data = {
        level: document.getElementById('listeningLevel')?.value || 'B1',
        exam_type: document.getElementById('listeningExamType')?.value || 'DELE',
        tarea_number: parseInt(document.getElementById('listeningTareaNumber')?.value) || 1,
        title: document.getElementById('listeningTitle')?.value?.trim() || 'Listening Tarea',
        duration_minutes: parseInt(document.getElementById('listeningDuration')?.value) || null,
        description: document.getElementById('listeningDescription')?.value?.trim() || '',
        instructions_html: document.getElementById('listeningInstructions')?.value?.trim() || '',
    };

    try {
        // 显示加载状态
        if (btn) btn.disabled = true;
        if (btnText) btnText.classList.add('hidden');
        if (btnLoader) btnLoader.classList.remove('hidden');
        
        const url = tareaId 
            ? CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId
            : CONFIG.API_BASE_URL + '/listening/admin/tareas';
        const method = tareaId ? 'PATCH' : 'POST';

        const res = await Utils.fetchWithAuth(url, { method, body: JSON.stringify(data) });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'HTTP ' + res.status);
        }

        const result = await res.json();
        
        Utils.showToast(tareaId ? '保存成功' : '创建成功', 'success');
        
        // 如果是新建，询问是否上传音频
        if (!tareaId && result.id) {
            closeTareaModal();
            loadTareas(ListeningTareasState.currentPage);
            
            if (confirm('Tarea 创建成功！是否现在上传音频？')) {
                showTareaAudiosModal(result.id);
            }
        } else {
            closeTareaModal();
            loadTareas(ListeningTareasState.currentPage);
        }
    } catch (err) {
        Utils.showToast('保存失败：' + err.message, 'error');
    } finally {
        // 恢复按钮状态
        if (btn) btn.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoader) btnLoader.classList.add('hidden');
    }
}

function confirmDeleteTarea(tareaId) {
    if (confirm('确定要删除 Tarea #' + tareaId + ' 吗？关联的音频和题目也会被删除。')) {
        deleteTarea(tareaId);
    }
}

async function deleteTarea(tareaId) {
    try {
        const res = await Utils.fetchWithAuth(CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId, { method: 'DELETE' });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        Utils.showToast('删除成功', 'success');
        loadTareas(1);
    } catch (err) {
        Utils.showToast('删除失败：' + err.message, 'error');
    }
}

// ==================== Tarea 音频管理（独立模态框） ====================

async function showTareaAudiosModal(tareaId) {
    ListeningTareasState.selectedTarea = tareaId;
    ListeningTareasState.pendingAudioFiles = [];
    
    const modal = document.getElementById('tareaAudiosModal');
    const title = document.getElementById('tareaAudiosTitle');
    
    if (!modal) return;

    // 获取 Tarea 信息
    try {
        const res = await Utils.fetchWithAuth(CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId);
        if (res.ok) {
            ListeningTareasState.selectedTareaData = await res.json();
            title.textContent = 'Tarea #' + tareaId + ' - ' + (ListeningTareasState.selectedTareaData.title || '音频管理');
        } else {
            title.textContent = 'Tarea #' + tareaId + ' - 音频管理';
        }
    } catch (e) {
        title.textContent = 'Tarea #' + tareaId + ' - 音频管理';
    }

    modal.classList.remove('hidden');
    clearPendingFilesUI();
    loadTareaAudios(tareaId);
}

function closeTareaAudiosModal() {
    document.getElementById('tareaAudiosModal')?.classList.add('hidden');
    ListeningTareasState.selectedTarea = null;
    ListeningTareasState.selectedTareaData = null;
    ListeningTareasState.tareaAudios = [];
    ListeningTareasState.pendingAudioFiles = [];
    clearPendingFilesUI();
}

async function loadTareaAudios(tareaId) {
    const tbody = document.getElementById('tareaAudiosBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">加载中...</td></tr>';

    try {
        const res = await Utils.fetchWithAuth(CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId + '/audios');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        
        const audios = await res.json();
        ListeningTareasState.tareaAudios = audios;

        if (audios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;">暂无音频，请上传（最多6个）</td></tr>';
            return;
        }

        // 按 sort_order 排序
        audios.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const rows = audios.map(function(a, idx) {
            const statusClass = a.status === 'completed' ? 'badge-success' : 
                               a.status === 'processing' ? 'badge-warning' : 
                               a.status === 'failed' ? 'badge-error' : 'badge-info';
            const statusText = a.status === 'completed' ? '已完成' : 
                              a.status === 'processing' ? '处理中' : 
                              a.status === 'failed' ? '失败' : '待处理';
            const materialId = a.material_id || '';
            const isFirst = idx === 0;
            const isLast = idx === audios.length - 1;

            return '<tr data-audio-id="' + a.id + '" data-sort-order="' + (a.sort_order || idx + 1) + '">' +
                '<td><span class="audio-order-badge">' + (a.sort_order || idx + 1) + '</span></td>' +
                '<td><input type="text" class="audio-title-input" value="' + Utils.escapeHtml(a.title || '') + '" onchange="updateTareaAudioTitle(' + a.id + ', this.value)" placeholder="输入标题..." /></td>' +
                '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
                '<td>' + (materialId ? '<code>' + materialId.substring(0, 8) + '...</code>' : '-') + '</td>' +
                '<td class="sort-cell">' +
                    '<button class="btn-sort" onclick="moveAudioUp(' + a.id + ')" title="上移" ' + (isFirst ? 'disabled' : '') + '>' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>' +
                    '</button>' +
                    '<button class="btn-sort" onclick="moveAudioDown(' + a.id + ')" title="下移" ' + (isLast ? 'disabled' : '') + '>' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
                    '</button>' +
                '</td>' +
                '<td>' +
                    '<div class="action-buttons">' +
                        (materialId ? '<button class="btn-icon" onclick="playMaterial(\'' + materialId + '\')" title="播放"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>' : '') +
                        '<button class="btn-icon btn-danger" onclick="deleteTareaAudio(' + tareaId + ', ' + a.id + ')" title="删除">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                        '</button>' +
                    '</div>' +
                '</td>' +
            '</tr>';
        });
        
        tbody.innerHTML = rows.join('');
    } catch (err) {
        console.error('Load tarea audios failed:', err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#e94560;">加载失败：' + err.message + '</td></tr>';
    }
}

// ==================== 内联音频列表（编辑模态框内） ====================

async function loadInlineAudios(tareaId) {
    const container = document.getElementById('uploadedAudiosInline');
    if (!container) return;

    container.innerHTML = '<div class="loading-inline">加载中...</div>';

    try {
        const res = await Utils.fetchWithAuth(CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId + '/audios');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        
        const audios = await res.json();
        
        if (audios.length === 0) {
            container.innerHTML = '<div class="empty-inline">暂无音频</div>';
            return;
        }

        audios.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        container.innerHTML = audios.map(function(a, idx) {
            const statusClass = a.status === 'completed' ? 'success' : 
                               a.status === 'processing' ? 'warning' : 'info';
            return '<div class="audio-item-inline">' +
                '<span class="audio-num">' + (idx + 1) + '</span>' +
                '<span class="audio-name">' + Utils.escapeHtml(a.title || '音频 ' + (idx + 1)) + '</span>' +
                '<span class="audio-status status-' + statusClass + '"></span>' +
                '<button class="btn-remove" onclick="deleteTareaAudioInline(' + tareaId + ', ' + a.id + ')" title="删除">×</button>' +
            '</div>';
        }).join('');
    } catch (err) {
        container.innerHTML = '<div class="error-inline">加载失败</div>';
    }
}

function handleInlineAudioFilesSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    addFilesToInlineList(files);
    e.target.value = '';
}

async function addFilesToInlineList(files) {
    const tareaId = ListeningTareasState.selectedTarea;
    if (!tareaId) {
        Utils.showToast('请先保存 Tarea', 'error');
        return;
    }

    const maxSize = 50 * 1024 * 1024;
    
    for (const file of files) {
        if (!file.type.startsWith('audio/')) {
            Utils.showToast(file.name + ' 不是音频文件', 'warning');
            continue;
        }
        if (file.size > maxSize) {
            Utils.showToast(file.name + ' 超过 50MB', 'warning');
            continue;
        }

        // 直接上传
        try {
            const title = file.name.replace(/\.[^/.]+$/, '');
            await uploadSingleAudio(file, title, 0);
            Utils.showToast(file.name + ' 上传成功', 'success');
        } catch (err) {
            Utils.showToast(file.name + ' 上传失败: ' + err.message, 'error');
        }
    }

    // 刷新列表
    loadInlineAudios(tareaId);
}

async function deleteTareaAudioInline(tareaId, audioId) {
    if (!confirm('确定删除此音频？')) return;

    try {
        const res = await Utils.fetchWithAuth(
            CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId + '/audios/' + audioId,
            { method: 'DELETE' }
        );
        if (!res.ok) throw new Error('HTTP ' + res.status);

        Utils.showToast('删除成功', 'success');
        loadInlineAudios(tareaId);
    } catch (err) {
        Utils.showToast('删除失败：' + err.message, 'error');
    }
}

// ==================== 多文件上传（独立模态框） ====================

function handleMultipleAudioFilesSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    addFilesToPendingList(files);
    e.target.value = '';
}

function addFilesToPendingList(files) {
    const maxSize = 50 * 1024 * 1024;
    const currentAudioCount = ListeningTareasState.tareaAudios.length;
    const pendingCount = ListeningTareasState.pendingAudioFiles.length;
    const maxAllowed = 6 - currentAudioCount - pendingCount;

    if (maxAllowed <= 0) {
        Utils.showToast('每个 Tarea 最多只能有 6 个音频', 'warning');
        return;
    }

    let addedCount = 0;
    const startOrder = currentAudioCount + pendingCount + 1;

    for (const file of files) {
        if (addedCount >= maxAllowed) {
            Utils.showToast('已达到最大数量限制，部分文件未添加', 'warning');
            break;
        }

        if (!file.type.startsWith('audio/')) {
            Utils.showToast(file.name + ' 不是音频文件，已跳过', 'warning');
            continue;
        }

        if (file.size > maxSize) {
            Utils.showToast(file.name + ' 超过 50MB，已跳过', 'warning');
            continue;
        }

        const title = file.name.replace(/\.[^/.]+$/, '');

        ListeningTareasState.pendingAudioFiles.push({
            file: file,
            title: title,
            sortOrder: startOrder + addedCount,
        });
        addedCount++;
    }

    if (addedCount > 0) {
        renderPendingFilesUI();
        showUploadActions();
        Utils.showToast('已添加 ' + addedCount + ' 个文件到待上传列表', 'success');
    }
}

function showUploadActions() {
    const actions = document.getElementById('uploadActions');
    if (actions && ListeningTareasState.pendingAudioFiles.length > 0) {
        actions.style.display = 'flex';
    }
}

function renderPendingFilesUI() {
    const container = document.getElementById('pendingFilesList');
    if (!container) return;

    if (ListeningTareasState.pendingAudioFiles.length === 0) {
        container.innerHTML = '';
        const actions = document.getElementById('uploadActions');
        if (actions) actions.style.display = 'none';
        return;
    }

    container.innerHTML = ListeningTareasState.pendingAudioFiles.map(function(item, idx) {
        return '<div class="pending-file-item">' +
            '<div class="pending-file-info">' +
                '<span class="pending-order">' + item.sortOrder + '</span>' +
                '<input type="text" class="pending-title" value="' + Utils.escapeHtml(item.title) + '" ' +
                    'onchange="updatePendingTitle(' + idx + ', this.value)" placeholder="标题">' +
                '<span class="pending-size">' + formatFileSize(item.file.size) + '</span>' +
            '</div>' +
            '<div class="pending-file-actions">' +
                '<button class="btn-icon" onclick="movePendingUp(' + idx + ')" title="上移" ' + (idx === 0 ? 'disabled' : '') + '>' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>' +
                '</button>' +
                '<button class="btn-icon" onclick="movePendingDown(' + idx + ')" title="下移" ' + (idx === ListeningTareasState.pendingAudioFiles.length - 1 ? 'disabled' : '') + '>' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
                '</button>' +
                '<button class="btn-icon btn-danger" onclick="removePendingFile(' + idx + ')" title="移除">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function clearPendingFilesUI() {
    const container = document.getElementById('pendingFilesList');
    if (container) container.innerHTML = '';
    
    const actions = document.getElementById('uploadActions');
    if (actions) actions.style.display = 'none';
    
    ListeningTareasState.pendingAudioFiles = [];
}

function clearPendingFiles() {
    clearPendingFilesUI();
}

function removePendingFile(index) {
    ListeningTareasState.pendingAudioFiles.splice(index, 1);
    const baseOrder = ListeningTareasState.tareaAudios.length + 1;
    ListeningTareasState.pendingAudioFiles.forEach((item, idx) => {
        item.sortOrder = baseOrder + idx;
    });
    renderPendingFilesUI();
    showUploadActions();
}

function updatePendingTitle(index, title) {
    if (ListeningTareasState.pendingAudioFiles[index]) {
        ListeningTareasState.pendingAudioFiles[index].title = title;
    }
}

function movePendingUp(index) {
    if (index <= 0) return;
    const arr = ListeningTareasState.pendingAudioFiles;
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    const baseOrder = ListeningTareasState.tareaAudios.length + 1;
    arr.forEach((item, idx) => { item.sortOrder = baseOrder + idx; });
    renderPendingFilesUI();
}

function movePendingDown(index) {
    const arr = ListeningTareasState.pendingAudioFiles;
    if (index >= arr.length - 1) return;
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    const baseOrder = ListeningTareasState.tareaAudios.length + 1;
    arr.forEach((item, idx) => { item.sortOrder = baseOrder + idx; });
    renderPendingFilesUI();
}

// ==================== 批量上传 ====================

async function uploadPendingFiles() {
    if (!ListeningTareasState.selectedTarea) {
        Utils.showToast('未选择 Tarea', 'error');
        return;
    }

    const pending = ListeningTareasState.pendingAudioFiles;
    if (pending.length === 0) {
        Utils.showToast('请先选择音频文件', 'error');
        return;
    }

    const btn = document.querySelector('#uploadActions .btn-primary');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-small"></span> 上传中... (0/' + pending.length + ')';
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        
        if (btn) btn.innerHTML = '<span class="spinner-small"></span> 上传中... (' + (i + 1) + '/' + pending.length + ')';

        try {
            await uploadSingleAudio(item.file, item.title, item.sortOrder);
            successCount++;
        } catch (err) {
            console.error('Upload failed for ' + item.file.name + ':', err);
            failCount++;
        }
    }

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> 开始上传';
    }

    // 清空待上传列表
    clearPendingFilesUI();

    // 刷新音频列表
    loadTareaAudios(ListeningTareasState.selectedTarea);
    loadTareas(ListeningTareasState.currentPage);

    if (failCount === 0) {
        Utils.showToast('全部 ' + successCount + ' 个文件上传成功', 'success');
    } else {
        Utils.showToast('成功 ' + successCount + ' 个，失败 ' + failCount + ' 个', 'warning');
    }
}

async function uploadSingleAudio(file, title, sortOrder) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || '听力音频');
    formData.append('description', '');
    formData.append('sort_order', sortOrder);

    const url = CONFIG.API_BASE_URL + '/listening/admin/tareas/' + ListeningTareasState.selectedTarea + '/audio/upload';
    const token = Utils.getToken();
    
    const res = await fetch(url, {
        method: 'POST',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'HTTP ' + res.status);
    }

    const result = await res.json();
    
    if (result.processing_task_id) {
        startPollingProcessing(result.processing_task_id, result.link_id);
    }

    return result;
}

// ==================== 音频排序 ====================

async function moveAudioUp(audioId) {
    const audios = ListeningTareasState.tareaAudios;
    const idx = audios.findIndex(a => a.id === audioId);
    if (idx <= 0) return;

    await swapAudioOrder(audios[idx], audios[idx - 1]);
}

async function moveAudioDown(audioId) {
    const audios = ListeningTareasState.tareaAudios;
    const idx = audios.findIndex(a => a.id === audioId);
    if (idx < 0 || idx >= audios.length - 1) return;

    await swapAudioOrder(audios[idx], audios[idx + 1]);
}

async function swapAudioOrder(audio1, audio2) {
    const tareaId = ListeningTareasState.selectedTarea;
    if (!tareaId) return;

    const order1 = audio1.sort_order;
    const order2 = audio2.sort_order;

    try {
        await Utils.fetchWithAuth(
            CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId + '/audios/' + audio1.id,
            { method: 'PATCH', body: JSON.stringify({ sort_order: order2 }) }
        );
        await Utils.fetchWithAuth(
            CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId + '/audios/' + audio2.id,
            { method: 'PATCH', body: JSON.stringify({ sort_order: order1 }) }
        );

        loadTareaAudios(tareaId);
        Utils.showToast('排序已更新', 'success');
    } catch (err) {
        console.error('Swap order failed:', err);
        Utils.showToast('排序失败：' + err.message, 'error');
    }
}

// ==================== 处理状态轮询 ====================

function startPollingProcessing(processingTaskId, linkId) {
    if (!processingTaskId) return;
    if (ListeningTareasState.processingTasks.has(processingTaskId)) return;

    const intervalId = setInterval(async function() {
        try {
            const res = await Utils.fetchWithAuth(CONFIG.API_BASE_URL + '/listening/admin/audio/processing/' + processingTaskId);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            
            const status = await res.json();

            if (status.status === 'SUCCESS' || status.status === 'FAILURE') {
                clearInterval(ListeningTareasState.processingTasks.get(processingTaskId));
                ListeningTareasState.processingTasks.delete(processingTaskId);
                
                if (ListeningTareasState.selectedTarea) {
                    loadTareaAudios(ListeningTareasState.selectedTarea);
                }

                if (status.status === 'SUCCESS') {
                    Utils.showToast('音频处理完成', 'success');
                } else {
                    Utils.showToast('音频处理失败：' + (status.error || '未知错误'), 'error');
                }
            }
        } catch (err) {
            console.error('Polling failed:', err);
            if (ListeningTareasState.processingTasks.has(processingTaskId)) {
                clearInterval(ListeningTareasState.processingTasks.get(processingTaskId));
                ListeningTareasState.processingTasks.delete(processingTaskId);
            }
        }
    }, 4000);

    ListeningTareasState.processingTasks.set(processingTaskId, intervalId);
}

// ==================== 其他音频操作 ====================

async function deleteTareaAudio(tareaId, audioId) {
    if (!confirm('确定要删除该音频吗？')) return;

    try {
        const res = await Utils.fetchWithAuth(
            CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId + '/audios/' + audioId,
            { method: 'DELETE' }
        );
        if (!res.ok) throw new Error('HTTP ' + res.status);

        Utils.showToast('删除成功', 'success');
        loadTareaAudios(tareaId);
        loadTareas(ListeningTareasState.currentPage);
    } catch (err) {
        Utils.showToast('删除失败：' + err.message, 'error');
    }
}

async function updateTareaAudioTitle(audioId, title) {
    try {
        const tareaId = ListeningTareasState.selectedTarea;
        const res = await Utils.fetchWithAuth(
            CONFIG.API_BASE_URL + '/listening/admin/tareas/' + tareaId + '/audios/' + audioId,
            { method: 'PATCH', body: JSON.stringify({ title: title }) }
        );
        if (!res.ok) throw new Error('HTTP ' + res.status);
        Utils.showToast('标题已更新', 'success');
    } catch (err) {
        Utils.showToast('更新失败：' + err.message, 'error');
    }
}

function playMaterial(materialId) {
    if (!materialId) {
        Utils.showToast('暂无素材可播放', 'warning');
        return;
    }
    window.open(CONFIG.API_BASE_URL + '/files/' + materialId, '_blank');
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ==================== 全局导出 ====================
window.ListeningTareasState = ListeningTareasState;
window.initListeningTareasModule = initListeningTareasModule;
window.loadTareas = loadTareas;
window.applyTareaFilters = applyTareaFilters;
window.filterListening = filterListening;

// Tarea 模态框
window.showTareaModal = showTareaModal;
window.closeTareaModal = closeTareaModal;
window.saveTarea = saveTarea;
window.confirmDeleteTarea = confirmDeleteTarea;

// 兼容别名（HTML 中可能用到的名字）
window.openListeningModal = showTareaModal;
window.openListeningTareaModal = showTareaModal;
window.closeListeningTareaModal = closeTareaModal;
window.saveListeningTarea = saveTarea;

// 音频管理模态框
window.showTareaAudiosModal = showTareaAudiosModal;
window.closeTareaAudiosModal = closeTareaAudiosModal;
window.loadTareaAudios = loadTareaAudios;
window.deleteTareaAudio = deleteTareaAudio;
window.deleteTareaAudioInline = deleteTareaAudioInline;
window.updateTareaAudioTitle = updateTareaAudioTitle;
window.playMaterial = playMaterial;

// 排序
window.moveAudioUp = moveAudioUp;
window.moveAudioDown = moveAudioDown;

// 待上传列表操作
window.removePendingFile = removePendingFile;
window.updatePendingTitle = updatePendingTitle;
window.movePendingUp = movePendingUp;
window.movePendingDown = movePendingDown;
window.clearPendingFiles = clearPendingFiles;
window.uploadPendingFiles = uploadPendingFiles;

console.log('✅ listening_tareas.js loaded (fixed version)');