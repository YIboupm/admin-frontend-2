/* ===================================
   Tarea 题目管理模块 - listening_questions.js
   支持多种题型的可视化编辑器 (v2.0)
   对语言老师友好 - 完全可视化操作
   =================================== */

// ========== 状态管理 ==========
const QuestionsState = {
    tareaId: null,
    versions: [],
    currentVersion: 1,
    currentData: null,
    selectedBlockIndex: -1,
    editMode: 'visual', // 'visual' or 'json'
    isDirty: false,
    initialized: false,
};

// ========== 题型配置 ==========
const BLOCK_TYPES = {
    multiple_choice: {
        label: '单选题',
        labelEs: 'Selección única',
        icon: '☑️',
        description: '传统单选题，一个问题多个选项',
        template: {
            type: 'multiple_choice',
            question_id: null,
            stem: '',
            pista: null,
            options: [
                { label: 'A', content: '', is_correct: false },
                { label: 'B', content: '', is_correct: false },
                { label: 'C', content: '', is_correct: false },
            ],
            audio_timestamp: null,
            explanation: '',
        }
    },
    matrix_single_choice: {
        label: '矩阵单选',
        labelEs: 'Matriz de selección',
        icon: '🧱',
        description: '多行共享同一组选项列（如 Tarea 2）',
        template: {
            type: 'matrix_single_choice',
            prompt: '',
            pista: null,
            columns: [
                { key: 'a', label: '' },
                { key: 'b', label: '' },
                { key: 'c', label: '' },
            ],
            rows: [
                { text: '', correct: null, audio_timestamp: null },
            ],
            start_number: 1,
            explanation: '',
        }
    },
    person_statement_matching: {
        label: '人物陈述匹配',
        labelEs: 'Emparejamiento persona-enunciado',
        icon: '👥',
        description: '多人匹配多陈述（如 Tarea 4）',
        template: {
            type: 'person_statement_matching',
            prompt: '',
            statements: [
                { key: 'a', text: '' },
                { key: 'b', text: '' },
                { key: 'c', text: '' },
            ],
            persons: [
                { name: '', pista: null, correct_statement: null },
            ],
            start_number: 1,
            explanation: '',
        }
    },
    matching: {
        label: '匹配题',
        labelEs: 'Emparejamiento',
        icon: '🔗',
        description: '左右两列一一匹配',
        template: {
            type: 'matching',
            question: '',
            pista: null,
            left_items: ['', '', ''],
            right_items: ['', '', ''],
            correct_matches: {},
            audio_timestamp: null,
            explanation: '',
        }
    },
    ordering: {
        label: '排序题',
        labelEs: 'Ordenar',
        icon: '📋',
        description: '将项目按正确顺序排列',
        template: {
            type: 'ordering',
            question: '',
            pista: null,
            items: ['', '', '', ''],
            correct_order: [0, 1, 2, 3],
            audio_timestamp: null,
            explanation: '',
        }
    },
    fill_in_blank: {
        label: '填空题',
        labelEs: 'Completar espacios',
        icon: '✍️',
        description: '在文本中填写空缺内容',
        template: {
            type: 'fill_in_blank',
            question: '',
            pista: null,
            text_with_blanks: '',
            answers: [''],
            audio_timestamp: null,
            explanation: '',
        }
    },
    true_false: {
        label: '判断题',
        labelEs: 'Verdadero/Falso',
        icon: '✓✗',
        description: '判断陈述正确或错误',
        template: {
            type: 'true_false',
            question: '',
            pista: null,
            correct_answer: null,
            audio_timestamp: null,
            explanation: '',
        }
    }
};

// ========== 初始化 ==========
function initListeningQuestionsModule() {
    if (QuestionsState.initialized) return;
    
    // 绑定工具栏事件
    const btnSave = document.getElementById('btnSaveTareaQuestions');
    const btnDelete = document.getElementById('btnDeleteTareaQuestionsVersion');
    const btnToggleMode = document.getElementById('btnToggleEditMode');
    const select = document.getElementById('tareaQuestionsVersion');
    
    if (btnSave) btnSave.addEventListener('click', saveTareaQuestions);
    if (btnDelete) btnDelete.addEventListener('click', deleteTareaQuestionsVersion);
    if (btnToggleMode) btnToggleMode.addEventListener('click', toggleEditMode);
    
    if (select) {
        select.addEventListener('change', (e) => {
            const v = parseInt(e.target.value) || 1;
            if (QuestionsState.isDirty && !confirm('有未保存的更改，确定切换版本吗？')) {
                e.target.value = QuestionsState.currentVersion;
                return;
            }
            loadTareaQuestions(QuestionsState.tareaId, v);
        });
    }

    QuestionsState.initialized = true;
    console.log('📝 Questions module initialized');
}

// ========== 模态框控制 ==========
async function showTareaQuestionsModal(tareaId) {
    QuestionsState.tareaId = tareaId;
    QuestionsState.selectedBlockIndex = -1;
    QuestionsState.isDirty = false;
    QuestionsState.editMode = 'visual';
    
    const modal = document.getElementById('tareaQuestionsModal');
    const title = document.getElementById('tareaQuestionsTitle');
    
    if (!modal) return;
    title.textContent = `Tarea ${tareaId} - 题目管理`;
    modal.classList.remove('hidden');

    // 重置切换按钮
    updateToggleModeButton();

    // 加载版本列表
    try {
        const url = `${CONFIG.API_BASE_URL}/listening/admin/tareas/${tareaId}/questions/versions`;
        const res = await Utils.fetchWithAuth(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const versions = await res.json();
        QuestionsState.versions = versions;

        const select = document.getElementById('tareaQuestionsVersion');
        if (versions.length === 0) {
            select.innerHTML = '<option value="1">版本 1 (新建)</option>';
            select.value = 1;
            initEmptyData();
        } else {
            select.innerHTML = versions.map(v => 
                `<option value="${v}">版本 ${v}</option>`
            ).join('');
            select.value = versions[versions.length - 1];
            await loadTareaQuestions(tareaId, parseInt(select.value));
        }
    } catch (err) {
        console.error('Load versions failed:', err);
        Utils.showToast('加载版本失败：' + err.message, 'error');
        initEmptyData();
    }
}

function closeTareaQuestionsModal() {
    if (QuestionsState.isDirty && !confirm('有未保存的更改，确定关闭吗？')) {
        return;
    }
    const modal = document.getElementById('tareaQuestionsModal');
    if (modal) modal.classList.add('hidden');
    QuestionsState.currentData = null;
    QuestionsState.isDirty = false;
}

// ========== 数据加载 ==========
function initEmptyData() {
    QuestionsState.currentData = {
        version: 1,
        instructions: { es: '', zh: '' },
        questions: []
    };
    QuestionsState.currentVersion = 1;
    QuestionsState.selectedBlockIndex = -1;
    renderVisualEditor();
}

async function loadTareaQuestions(tareaId, version = 1) {
    try {
        const url = `${CONFIG.API_BASE_URL}/listening/admin/tareas/${tareaId}/questions?version=${version}`;
        const res = await Utils.fetchWithAuth(url);
        
        if (res.status === 404) {
            initEmptyData();
            return;
        }
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const doc = await res.json();

        QuestionsState.currentData = {
            version: doc.version || version,
            instructions: doc.instructions || { es: '', zh: '' },
            questions: doc.questions || []
        };
        QuestionsState.currentVersion = version;
        QuestionsState.selectedBlockIndex = -1;
        QuestionsState.isDirty = false;

        if (QuestionsState.editMode === 'visual') {
            renderVisualEditor();
        } else {
            renderJsonEditor();
        }

        Utils.showToast(`已加载版本 ${version}`, 'success');
    } catch (err) {
        console.error('Load questions failed:', err);
        Utils.showToast('加载失败：' + err.message, 'error');
        initEmptyData();
    }
}

// ========== 编辑模式切换 ==========
function toggleEditMode() {
    if (QuestionsState.editMode === 'visual') {
        // 切换到 JSON 模式
        collectInstructionsData();
        QuestionsState.editMode = 'json';
        renderJsonEditor();
    } else {
        // 切换到可视化模式
        try {
            const editor = document.getElementById('tareaQuestionsJsonEditor');
            const data = JSON.parse(editor.value);
            QuestionsState.currentData = data;
            QuestionsState.editMode = 'visual';
            QuestionsState.selectedBlockIndex = -1;
            renderVisualEditor();
        } catch (err) {
            Utils.showToast('JSON 格式错误，无法切换：' + err.message, 'error');
            return;
        }
    }
    updateToggleModeButton();
}

function updateToggleModeButton() {
    const btn = document.getElementById('btnToggleEditMode');
    if (!btn) return;
    
    if (QuestionsState.editMode === 'visual') {
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
            </svg>
            <span>JSON 模式</span>
        `;
    } else {
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="9" x2="15" y2="9"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <span>可视化模式</span>
        `;
    }
}

// ========== 可视化编辑器渲染 ==========
function renderVisualEditor() {
    const container = document.getElementById('tareaQuestionsVisualEditor');
    const jsonEditor = document.getElementById('tareaQuestionsJsonEditor');
    
    container.classList.remove('hidden');
    jsonEditor.classList.add('hidden');
    
    const data = QuestionsState.currentData;
    if (!data) return;

    container.innerHTML = `
        <!-- Instructions 编辑区 -->
        <div class="instructions-editor">
            <h5>📋 题目说明</h5>
            <div class="instructions-tabs">
                <button class="instructions-tab active" onclick="switchInstructionsLang('es')">西班牙语 (ES)</button>
                <button class="instructions-tab" onclick="switchInstructionsLang('zh')">中文 (ZH)</button>
            </div>
            <div id="instructionsContent">
                <textarea id="instructionsEs" rows="3" 
                    placeholder="Ejemplo: A continuación va a escuchar..."
                    oninput="markDirty()">${escapeHtml(data.instructions?.es || '')}</textarea>
            </div>
            <input type="hidden" id="instructionsZh" value="${escapeHtml(data.instructions?.zh || '')}">
        </div>
        
        <!-- 主编辑器布局 -->
        <div class="questions-editor-layout">
            <!-- 左侧 Block 列表 -->
            <div class="blocks-sidebar">
                <div class="blocks-header">
                    <h4>题目列表</h4>
                    <span class="blocks-count">${data.questions.length} 题</span>
                </div>
                <div class="blocks-list" id="blocksList">
                    ${renderBlocksList(data.questions)}
                </div>
                <div class="blocks-footer">
                    <button class="btn-add-block" onclick="showBlockTypeSelector()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        添加题目
                    </button>
                </div>
            </div>
            
            <!-- 右侧编辑器面板 -->
            <div class="block-editor-panel" id="blockEditorPanel">
                ${renderBlockEditor()}
            </div>
        </div>
    `;

    // 初始化拖拽排序
    initBlocksSortable();
}

function renderBlocksList(questions) {
    if (!questions || questions.length === 0) {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p>暂无题目</p>
                <small>点击下方按钮添加</small>
            </div>
        `;
    }

    return questions.map((q, idx) => {
        const typeConfig = BLOCK_TYPES[q.type] || { icon: '❓', label: '未知', labelEs: 'Desconocido' };
        const isActive = idx === QuestionsState.selectedBlockIndex;
        const preview = getBlockPreview(q);
        
        return `
            <div class="block-item ${isActive ? 'active' : ''}" 
                 data-index="${idx}" 
                 draggable="true"
                 onclick="selectBlock(${idx})">
                <div class="block-item-header">
                    <span class="drag-handle">⋮⋮</span>
                    <span class="type-badge ${q.type}">${typeConfig.icon} ${typeConfig.label}</span>
                </div>
                <div class="block-item-preview">${escapeHtml(preview)}</div>
                <div class="block-item-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); duplicateBlock(${idx})" title="复制">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-danger" onclick="event.stopPropagation(); deleteBlock(${idx})" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getBlockPreview(block) {
    switch (block.type) {
        case 'multiple_choice':
            return block.stem || block.question || '(未填写题目)';
        case 'matrix_single_choice':
            return block.prompt || `矩阵题 (${block.rows?.length || 0} 行)`;
        case 'person_statement_matching':
            return block.prompt || `人物匹配 (${block.persons?.length || 0} 人)`;
        case 'matching':
            return block.question || '(未填写题目)';
        case 'ordering':
            return block.question || '(未填写题目)';
        case 'fill_in_blank':
            return block.text_with_blanks || block.question || '(未填写题目)';
        case 'true_false':
            return block.question || '(未填写题目)';
        default:
            return '未知题型';
    }
}

function renderBlockEditor() {
    const idx = QuestionsState.selectedBlockIndex;
    
    if (idx < 0 || !QuestionsState.currentData?.questions?.[idx]) {
        return `
            <div class="editor-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
                </svg>
                <p>选择左侧题目进行编辑</p>
                <small>或点击"添加题目"创建新题</small>
            </div>
        `;
    }

    const block = QuestionsState.currentData.questions[idx];
    const typeConfig = BLOCK_TYPES[block.type] || { label: '未知', icon: '❓' };

    return `
        <div class="block-editor-form">
            <div class="editor-section">
                <div class="editor-section-header">
                    <h5>${typeConfig.icon} ${typeConfig.label} - 题目 ${idx + 1}</h5>
                </div>
                ${renderBlockSpecificEditor(block, idx)}
            </div>
        </div>
    `;
}

// ========== 通用解析编辑器 ==========
function renderExplanationEditor(block, idx) {
    return `
        <div class="editor-section explanation-section">
            <div class="editor-section-header">
                <h5>💡 题目解析</h5>
            </div>
            <div class="form-group">
                <label>解析说明 <small style="color: var(--color-text-light);">（支持 HTML 格式）</small></label>
                <div class="explanation-editor-wrapper">
                    <div class="explanation-toolbar">
                        <button type="button" class="toolbar-btn" onclick="insertExplanationTag(${idx}, 'b')" title="加粗">
                            <strong>B</strong>
                        </button>
                        <button type="button" class="toolbar-btn" onclick="insertExplanationTag(${idx}, 'i')" title="斜体">
                            <em>I</em>
                        </button>
                        <button type="button" class="toolbar-btn" onclick="insertExplanationTag(${idx}, 'u')" title="下划线">
                            <u>U</u>
                        </button>
                        <span class="toolbar-divider"></span>
                        <button type="button" class="toolbar-btn" onclick="insertExplanationTag(${idx}, 'mark')" title="高亮">
                            🖍️
                        </button>
                        <button type="button" class="toolbar-btn" onclick="insertExplanationList(${idx}, 'ul')" title="无序列表">
                            • 列表
                        </button>
                        <button type="button" class="toolbar-btn" onclick="insertExplanationList(${idx}, 'ol')" title="有序列表">
                            1. 列表
                        </button>
                        <span class="toolbar-divider"></span>
                        <button type="button" class="toolbar-btn" onclick="toggleExplanationPreview(${idx})" title="预览">
                            👁️ 预览
                        </button>
                    </div>
                    <textarea id="explanationText_${idx}" 
                        class="explanation-textarea" 
                        rows="5" 
                        placeholder="在此输入题目解析...&#10;&#10;可以使用 HTML 标签，例如：&#10;<b>重点内容</b>&#10;<mark>高亮文字</mark>&#10;<ul><li>要点一</li><li>要点二</li></ul>"
                        onchange="updateBlockField(${idx}, 'explanation', this.value)"
                        oninput="markDirty()">${escapeHtml(block.explanation || '')}</textarea>
                    <div id="explanationPreview_${idx}" class="explanation-preview" style="display: none;">
                        <!-- 预览内容 -->
                    </div>
                </div>
                <small>可自由填写解析内容，支持 HTML 格式（如加粗、列表、高亮等）</small>
            </div>
        </div>
    `;
}

// 解析编辑器工具函数
function insertExplanationTag(idx, tag) {
    const textarea = document.getElementById(`explanationText_${idx}`);
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    const wrappedText = `<${tag}>${selectedText}</${tag}>`;
    textarea.value = beforeText + wrappedText + afterText;
    
    // 更新状态
    updateBlockField(idx, 'explanation', textarea.value);
    
    // 恢复焦点和选择
    textarea.focus();
    textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + selectedText.length);
}

function insertExplanationList(idx, listType) {
    const textarea = document.getElementById(`explanationText_${idx}`);
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(textarea.selectionEnd);
    
    let listHtml;
    if (selectedText) {
        // 将选中的每行转为列表项
        const lines = selectedText.split('\n').filter(line => line.trim());
        const items = lines.map(line => `  <li>${line.trim()}</li>`).join('\n');
        listHtml = `<${listType}>\n${items}\n</${listType}>`;
    } else {
        listHtml = `<${listType}>\n  <li></li>\n</${listType}>`;
    }
    
    textarea.value = beforeText + listHtml + afterText;
    updateBlockField(idx, 'explanation', textarea.value);
    textarea.focus();
}

function toggleExplanationPreview(idx) {
    const textarea = document.getElementById(`explanationText_${idx}`);
    const preview = document.getElementById(`explanationPreview_${idx}`);
    if (!textarea || !preview) return;
    
    if (preview.style.display === 'none') {
        preview.innerHTML = textarea.value || '<span style="color: #999;">暂无内容</span>';
        preview.style.display = 'block';
        textarea.style.display = 'none';
    } else {
        preview.style.display = 'none';
        textarea.style.display = 'block';
    }
}

// ========== 各题型编辑器 ==========
function renderBlockSpecificEditor(block, idx) {
    switch (block.type) {
        case 'multiple_choice':
            return renderMultipleChoiceEditor(block, idx);
        case 'matrix_single_choice':
            return renderMatrixSingleChoiceEditor(block, idx);
        case 'person_statement_matching':
            return renderPersonStatementMatchingEditor(block, idx);
        case 'matching':
            return renderMatchingEditor(block, idx);
        case 'ordering':
            return renderOrderingEditor(block, idx);
        case 'fill_in_blank':
            return renderFillBlankEditor(block, idx);
        case 'true_false':
            return renderTrueFalseEditor(block, idx);
        default:
            return `<p>不支持的题型: ${block.type}</p>`;
    }
}

// 单选题编辑器
function renderMultipleChoiceEditor(block, idx) {
    const correctIdx = block.options?.findIndex(opt => opt.is_correct) ?? -1;
    
    return `
        <div class="form-group">
            <label>题干 <span class="required">*</span></label>
            <textarea rows="2" placeholder="例如: En esta conversación..."
                onchange="updateBlockField(${idx}, 'stem', this.value)">${escapeHtml(block.stem || '')}</textarea>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>题号</label>
                <input type="number" value="${block.question_id || ''}" min="1"
                    onchange="updateBlockField(${idx}, 'question_id', parseInt(this.value) || null)">
            </div>
            <div class="form-group">
                <label>音频轨道 (Pista)</label>
                <input type="number" value="${block.pista || ''}" min="1"
                    onchange="updateBlockField(${idx}, 'pista', parseInt(this.value) || null)">
            </div>
        </div>
        
        <div class="form-group">
            <label>选项</label>
            <div class="options-editor" id="optionsEditor_${idx}">
                ${(block.options || []).map((opt, i) => `
                    <div class="option-row ${opt.is_correct ? 'correct' : ''}">
                        <input type="radio" name="correct_${idx}" value="${i}" 
                            ${opt.is_correct ? 'checked' : ''}
                            onchange="setCorrectOption(${idx}, ${i})">
                        <span class="option-label">${opt.label || String.fromCharCode(65 + i)}.</span>
                        <input type="text" class="option-input" value="${escapeHtml(opt.content || '')}"
                            placeholder="选项内容"
                            onchange="updateOptionContent(${idx}, ${i}, this.value)">
                        ${(block.options?.length || 0) > 2 ? `
                            <button class="btn-icon btn-danger" onclick="removeOption(${idx}, ${i})" title="删除">×</button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-sm btn-secondary" style="margin-top: 10px" onclick="addOption(${idx})">
                + 添加选项
            </button>
        </div>
        
        <div class="form-group">
            <label>音频时间戳（秒）</label>
            <input type="number" step="0.1" value="${block.audio_timestamp || ''}"
                placeholder="例如: 15.5"
                onchange="updateBlockField(${idx}, 'audio_timestamp', parseFloat(this.value) || null)">
        </div>
        
        ${renderExplanationEditor(block, idx)}
    `;
}

// 矩阵单选题编辑器 (Tarea 2 类型)
function renderMatrixSingleChoiceEditor(block, idx) {
    const columns = block.columns || [];
    const rows = block.rows || [];
    
    return `
        <div class="form-group">
            <label>题目说明</label>
            <textarea rows="2" placeholder="例如: Indique si los enunciados se refieren a..."
                onchange="updateBlockField(${idx}, 'prompt', this.value)">${escapeHtml(block.prompt || '')}</textarea>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>起始题号</label>
                <input type="number" value="${block.start_number || 1}" min="1"
                    onchange="updateBlockField(${idx}, 'start_number', parseInt(this.value) || 1)">
            </div>
            <div class="form-group">
                <label>音频轨道 (Pista)</label>
                <input type="number" value="${block.pista || ''}" min="1"
                    onchange="updateBlockField(${idx}, 'pista', parseInt(this.value) || null)">
            </div>
        </div>
        
        <div class="matrix-editor">
            <div class="matrix-columns-editor">
                <h6>选项列（表头）</h6>
                <div class="columns-list" id="matrixColumns_${idx}">
                    ${columns.map((col, i) => `
                        <div class="column-item">
                            <span class="column-key">${col.key})</span>
                            <input type="text" value="${escapeHtml(col.label || '')}" 
                                placeholder="列标题"
                                onchange="updateMatrixColumn(${idx}, ${i}, this.value)">
                            ${columns.length > 2 ? `
                                <button class="btn-icon btn-danger" onclick="removeMatrixColumn(${idx}, ${i})">×</button>
                            ` : ''}
                        </div>
                    `).join('')}
                    <button class="btn btn-sm btn-secondary" onclick="addMatrixColumn(${idx})">+ 添加列</button>
                </div>
            </div>
            
            <div class="matrix-rows-editor">
                <h6>
                    <span>陈述行</span>
                    <button class="btn btn-sm btn-secondary" onclick="toggleBatchPaste(${idx})">📋 批量粘贴</button>
                </h6>
                
                <div id="batchPasteArea_${idx}" class="batch-paste-mode" style="display: none;">
                    <h6>批量粘贴模式</h6>
                    <textarea id="batchPasteText_${idx}" rows="5" 
                        placeholder="每行一个陈述，例如：&#10;Internet es la causa primordial...&#10;El número de horas de trabajo..."></textarea>
                    <small>每行一个陈述，自动生成多行</small>
                    <button class="btn btn-sm btn-primary" onclick="applyBatchPaste(${idx})">应用</button>
                </div>
                
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th style="width: 50px">#</th>
                            <th>陈述内容</th>
                            ${columns.map(col => `<th class="col-header">${col.key}) ${escapeHtml(col.label)}</th>`).join('')}
                            <th style="width: 40px"></th>
                        </tr>
                    </thead>
                    <tbody id="matrixRows_${idx}">
                        ${rows.map((row, ri) => `
                            <tr data-row="${ri}">
                                <td class="row-number">${(block.start_number || 1) + ri}.</td>
                                <td class="row-text">
                                    <textarea rows="2" 
                                        onchange="updateMatrixRow(${idx}, ${ri}, 'text', this.value)">${escapeHtml(row.text || '')}</textarea>
                                </td>
                                ${columns.map((col, ci) => `
                                    <td class="col-option">
                                        <input type="radio" name="matrix_${idx}_${ri}" value="${col.key}"
                                            ${row.correct === col.key ? 'checked' : ''}
                                            onchange="updateMatrixRow(${idx}, ${ri}, 'correct', '${col.key}')">
                                    </td>
                                `).join('')}
                                <td class="row-actions">
                                    <button class="btn-icon btn-danger" onclick="removeMatrixRow(${idx}, ${ri})">×</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <button class="add-row-btn" onclick="addMatrixRow(${idx})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    添加行
                </button>
            </div>
        </div>
        
        ${renderExplanationEditor(block, idx)}
    `;
}

// 人物陈述匹配编辑器 (Tarea 4 类型)
function renderPersonStatementMatchingEditor(block, idx) {
    const statements = block.statements || [];
    const persons = block.persons || [];
    
    return `
        <div class="form-group">
            <label>题目说明</label>
            <textarea rows="2" placeholder="例如: Seleccione el enunciado que corresponde..."
                onchange="updateBlockField(${idx}, 'prompt', this.value)">${escapeHtml(block.prompt || '')}</textarea>
        </div>
        
        <div class="form-group">
            <label>起始题号</label>
            <input type="number" value="${block.start_number || 1}" min="1"
                onchange="updateBlockField(${idx}, 'start_number', parseInt(this.value) || 1)">
        </div>
        
        <div class="editor-section">
            <div class="editor-section-header">
                <h5>📝 陈述列表 (Enunciados)</h5>
            </div>
            <div id="statementsList_${idx}">
                ${statements.map((s, i) => `
                    <div class="matching-item">
                        <span class="item-label">${s.key})</span>
                        <input type="text" value="${escapeHtml(s.text || '')}"
                            placeholder="陈述内容"
                            onchange="updateStatement(${idx}, ${i}, this.value)">
                        ${statements.length > 2 ? `
                            <button class="btn-icon btn-danger" onclick="removeStatement(${idx}, ${i})">×</button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-sm btn-secondary" style="margin-top: 10px" onclick="addStatement(${idx})">
                + 添加陈述
            </button>
        </div>
        
        <div class="editor-section">
            <div class="editor-section-header">
                <h5>👥 人物列表</h5>
            </div>
            <table class="matrix-table">
                <thead>
                    <tr>
                        <th style="width: 50px">#</th>
                        <th>人物名称</th>
                        <th style="width: 80px">Pista</th>
                        <th style="width: 120px">正确陈述</th>
                        <th style="width: 40px"></th>
                    </tr>
                </thead>
                <tbody id="personsList_${idx}">
                    ${persons.map((p, i) => `
                        <tr>
                            <td class="row-number">${(block.start_number || 1) + i}.</td>
                            <td>
                                <input type="text" value="${escapeHtml(p.name || '')}"
                                    placeholder="例如: Persona 1"
                                    onchange="updatePerson(${idx}, ${i}, 'name', this.value)">
                            </td>
                            <td>
                                <input type="number" value="${p.pista || ''}" min="1" style="width: 60px"
                                    onchange="updatePerson(${idx}, ${i}, 'pista', parseInt(this.value) || null)">
                            </td>
                            <td>
                                <select onchange="updatePerson(${idx}, ${i}, 'correct_statement', this.value)">
                                    <option value="">-- 选择 --</option>
                                    ${statements.map(s => `
                                        <option value="${s.key}" ${p.correct_statement === s.key ? 'selected' : ''}>
                                            ${s.key})
                                        </option>
                                    `).join('')}
                                </select>
                            </td>
                            <td>
                                ${persons.length > 1 ? `
                                    <button class="btn-icon btn-danger" onclick="removePerson(${idx}, ${i})">×</button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <button class="add-row-btn" onclick="addPerson(${idx})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                添加人物
            </button>
        </div>
        
        ${renderExplanationEditor(block, idx)}
    `;
}

// 匹配题编辑器
function renderMatchingEditor(block, idx) {
    const leftItems = block.left_items || [];
    const rightItems = block.right_items || [];
    const matches = block.correct_matches || {};
    
    return `
        <div class="form-group">
            <label>题目说明</label>
            <textarea rows="2" placeholder="匹配左右两列对应项"
                onchange="updateBlockField(${idx}, 'question', this.value)">${escapeHtml(block.question || '')}</textarea>
        </div>
        
        <div class="form-group">
            <label>音频轨道 (Pista)</label>
            <input type="number" value="${block.pista || ''}" min="1"
                onchange="updateBlockField(${idx}, 'pista', parseInt(this.value) || null)">
        </div>
        
        <div class="matching-editor">
            <div class="matching-column">
                <h6>左侧项目</h6>
                <div class="matching-items" id="leftItems_${idx}">
                    ${leftItems.map((item, i) => `
                        <div class="matching-item">
                            <span class="item-label">${i + 1}.</span>
                            <input type="text" value="${escapeHtml(item)}"
                                onchange="updateMatchingItem(${idx}, 'left', ${i}, this.value)">
                            ${leftItems.length > 2 ? `
                                <button class="btn-icon btn-danger" onclick="removeMatchingItem(${idx}, 'left', ${i})">×</button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-sm btn-secondary" style="margin-top: 8px" 
                    onclick="addMatchingItem(${idx}, 'left')">+ 添加</button>
            </div>
            
            <div class="matching-column">
                <h6>右侧项目</h6>
                <div class="matching-items" id="rightItems_${idx}">
                    ${rightItems.map((item, i) => `
                        <div class="matching-item">
                            <span class="item-label">${String.fromCharCode(65 + i)}.</span>
                            <input type="text" value="${escapeHtml(item)}"
                                onchange="updateMatchingItem(${idx}, 'right', ${i}, this.value)">
                            ${rightItems.length > 2 ? `
                                <button class="btn-icon btn-danger" onclick="removeMatchingItem(${idx}, 'right', ${i})">×</button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-sm btn-secondary" style="margin-top: 8px"
                    onclick="addMatchingItem(${idx}, 'right')">+ 添加</button>
            </div>
        </div>
        
        <div class="matching-pairs">
            <h6>正确匹配关系</h6>
            ${leftItems.map((_, i) => `
                <div class="pair-row">
                    <span>${i + 1} →</span>
                    <select onchange="updateMatchingPair(${idx}, ${i}, this.value)">
                        <option value="">-- 选择 --</option>
                        ${rightItems.map((_, j) => `
                            <option value="${j}" ${matches[i] === j ? 'selected' : ''}>
                                ${String.fromCharCode(65 + j)}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `).join('')}
        </div>
        
        ${renderExplanationEditor(block, idx)}
    `;
}

// 排序题编辑器
function renderOrderingEditor(block, idx) {
    const items = block.items || [];
    
    return `
        <div class="form-group">
            <label>题目说明</label>
            <textarea rows="2" placeholder="将以下项目按正确顺序排列"
                onchange="updateBlockField(${idx}, 'question', this.value)">${escapeHtml(block.question || '')}</textarea>
        </div>
        
        <div class="form-group">
            <label>音频轨道 (Pista)</label>
            <input type="number" value="${block.pista || ''}" min="1"
                onchange="updateBlockField(${idx}, 'pista', parseInt(this.value) || null)">
        </div>
        
        <div class="form-group">
            <label>排序项目（当前顺序即为正确顺序，可拖拽调整）</label>
            <div class="ordering-editor" id="orderingItems_${idx}">
                ${items.map((item, i) => `
                    <div class="order-item" data-index="${i}" draggable="true">
                        <span class="drag-handle">⋮⋮</span>
                        <span class="order-number">${i + 1}</span>
                        <input type="text" value="${escapeHtml(item)}"
                            onchange="updateOrderingItem(${idx}, ${i}, this.value)">
                        ${items.length > 2 ? `
                            <button class="btn-icon btn-danger" onclick="removeOrderingItem(${idx}, ${i})">×</button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-sm btn-secondary" style="margin-top: 10px"
                onclick="addOrderingItem(${idx})">+ 添加项目</button>
        </div>
        
        ${renderExplanationEditor(block, idx)}
    `;
}

// 填空题编辑器
function renderFillBlankEditor(block, idx) {
    const answers = block.answers || [];
    
    return `
        <div class="form-group">
            <label>题目说明</label>
            <textarea rows="2" placeholder="根据听力内容填空"
                onchange="updateBlockField(${idx}, 'question', this.value)">${escapeHtml(block.question || '')}</textarea>
        </div>
        
        <div class="form-group">
            <label>音频轨道 (Pista)</label>
            <input type="number" value="${block.pista || ''}" min="1"
                onchange="updateBlockField(${idx}, 'pista', parseInt(this.value) || null)">
        </div>
        
        <div class="form-group fill-blank-editor">
            <label>带空白的文本（使用 ___ 表示填空位置）</label>
            <textarea rows="4" placeholder="例如：在 ___ 年，哥伦布 ___ 了美洲"
                onchange="updateBlockField(${idx}, 'text_with_blanks', this.value)">${escapeHtml(block.text_with_blanks || '')}</textarea>
            <small>用三个下划线 ___ 表示每个填空位置</small>
        </div>
        
        <div class="answers-list">
            <h6>答案列表（按空白顺序）</h6>
            <div id="answersList_${idx}">
                ${answers.map((ans, i) => `
                    <div class="answer-item">
                        <span class="answer-label">空白 ${i + 1}:</span>
                        <input type="text" value="${escapeHtml(ans)}"
                            onchange="updateFillBlankAnswer(${idx}, ${i}, this.value)">
                        ${answers.length > 1 ? `
                            <button class="btn-icon btn-danger" onclick="removeFillBlankAnswer(${idx}, ${i})">×</button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-sm btn-secondary" style="margin-top: 8px"
                onclick="addFillBlankAnswer(${idx})">+ 添加答案</button>
        </div>
        
        ${renderExplanationEditor(block, idx)}
    `;
}

// 判断题编辑器
function renderTrueFalseEditor(block, idx) {
    return `
        <div class="form-group">
            <label>陈述内容 <span class="required">*</span></label>
            <textarea rows="3" placeholder="需要判断对错的陈述"
                onchange="updateBlockField(${idx}, 'question', this.value)">${escapeHtml(block.question || '')}</textarea>
        </div>
        
        <div class="form-group">
            <label>音频轨道 (Pista)</label>
            <input type="number" value="${block.pista || ''}" min="1"
                onchange="updateBlockField(${idx}, 'pista', parseInt(this.value) || null)">
        </div>
        
        <div class="form-group">
            <label>正确答案</label>
            <div class="true-false-editor">
                <label class="tf-option ${block.correct_answer === true ? 'selected' : ''}" 
                    onclick="updateBlockField(${idx}, 'correct_answer', true); this.classList.add('selected'); this.nextElementSibling.classList.remove('selected');">
                    <input type="radio" name="tf_${idx}" value="true" ${block.correct_answer === true ? 'checked' : ''}>
                    <span class="tf-icon">✓</span>
                    <span class="tf-label">Verdadero / 对</span>
                </label>
                <label class="tf-option ${block.correct_answer === false ? 'selected' : ''}"
                    onclick="updateBlockField(${idx}, 'correct_answer', false); this.classList.add('selected'); this.previousElementSibling.classList.remove('selected');">
                    <input type="radio" name="tf_${idx}" value="false" ${block.correct_answer === false ? 'checked' : ''}>
                    <span class="tf-icon">✗</span>
                    <span class="tf-label">Falso / 错</span>
                </label>
            </div>
        </div>
        
        <div class="form-group">
            <label>音频时间戳（秒）</label>
            <input type="number" step="0.1" value="${block.audio_timestamp || ''}"
                placeholder="例如: 15.5"
                onchange="updateBlockField(${idx}, 'audio_timestamp', parseFloat(this.value) || null)">
        </div>
        
        ${renderExplanationEditor(block, idx)}
    `;
}

// ========== JSON 编辑器 ==========
function renderJsonEditor() {
    const container = document.getElementById('tareaQuestionsVisualEditor');
    const jsonEditor = document.getElementById('tareaQuestionsJsonEditor');
    
    container.classList.add('hidden');
    jsonEditor.classList.remove('hidden');

    const data = QuestionsState.currentData;
    jsonEditor.value = JSON.stringify(data, null, 2);
}

// ========== Block 选择和管理 ==========
function selectBlock(idx) {
    QuestionsState.selectedBlockIndex = idx;
    
    // 更新左侧列表的选中状态
    document.querySelectorAll('.block-item').forEach((item, i) => {
        item.classList.toggle('active', i === idx);
    });
    
    // 渲染右侧编辑器
    const panel = document.getElementById('blockEditorPanel');
    if (panel) {
        panel.innerHTML = renderBlockEditor();
    }
}

function showBlockTypeSelector() {
    const panel = document.getElementById('blockEditorPanel');
    if (!panel) return;
    
    QuestionsState.selectedBlockIndex = -1;
    document.querySelectorAll('.block-item').forEach(item => {
        item.classList.remove('active');
    });
    
    panel.innerHTML = `
        <div class="question-type-selector">
            <h4>选择题型</h4>
            <div class="type-grid">
                ${Object.entries(BLOCK_TYPES).map(([key, config]) => `
                    <button class="type-card" onclick="addBlock('${key}')">
                        <div class="type-icon-large">${config.icon}</div>
                        <div class="type-label">${config.label}</div>
                        <div class="type-desc">${config.description}</div>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function addBlock(type) {
    const template = BLOCK_TYPES[type]?.template;
    if (!template) {
        Utils.showToast('未知题型', 'error');
        return;
    }
    
    const newBlock = JSON.parse(JSON.stringify(template));
    QuestionsState.currentData.questions.push(newBlock);
    
    const newIndex = QuestionsState.currentData.questions.length - 1;
    QuestionsState.selectedBlockIndex = newIndex;
    QuestionsState.isDirty = true;
    
    // 重新渲染
    renderVisualEditor();
    
    Utils.showToast('题目已添加', 'success');
}

function deleteBlock(idx) {
    if (!confirm('确定删除此题目吗？')) return;
    
    QuestionsState.currentData.questions.splice(idx, 1);
    
    if (QuestionsState.selectedBlockIndex === idx) {
        QuestionsState.selectedBlockIndex = -1;
    } else if (QuestionsState.selectedBlockIndex > idx) {
        QuestionsState.selectedBlockIndex--;
    }
    
    QuestionsState.isDirty = true;
    renderVisualEditor();
    Utils.showToast('题目已删除', 'success');
}

function duplicateBlock(idx) {
    const original = QuestionsState.currentData.questions[idx];
    const duplicate = JSON.parse(JSON.stringify(original));
    
    QuestionsState.currentData.questions.splice(idx + 1, 0, duplicate);
    QuestionsState.selectedBlockIndex = idx + 1;
    QuestionsState.isDirty = true;
    
    renderVisualEditor();
    Utils.showToast('题目已复制', 'success');
}

// ========== 通用字段更新 ==========
function updateBlockField(idx, field, value) {
    if (!QuestionsState.currentData?.questions?.[idx]) return;
    QuestionsState.currentData.questions[idx][field] = value;
    QuestionsState.isDirty = true;
}

function markDirty() {
    QuestionsState.isDirty = true;
}

// ========== 单选题操作 ==========
function setCorrectOption(blockIdx, optionIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.options) return;
    
    block.options.forEach((opt, i) => {
        opt.is_correct = (i === optionIdx);
    });
    
    QuestionsState.isDirty = true;
    
    // 更新UI样式
    const container = document.getElementById(`optionsEditor_${blockIdx}`);
    if (container) {
        container.querySelectorAll('.option-row').forEach((row, i) => {
            row.classList.toggle('correct', i === optionIdx);
        });
    }
}

function updateOptionContent(blockIdx, optionIdx, value) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.options?.[optionIdx]) return;
    block.options[optionIdx].content = value;
    QuestionsState.isDirty = true;
}

function addOption(blockIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.options) return;
    
    const newLabel = String.fromCharCode(65 + block.options.length);
    block.options.push({ label: newLabel, content: '', is_correct: false });
    
    QuestionsState.isDirty = true;
    selectBlock(blockIdx); // 重新渲染编辑器
}

function removeOption(blockIdx, optionIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.options || block.options.length <= 2) return;
    
    block.options.splice(optionIdx, 1);
    // 重新生成标签
    block.options.forEach((opt, i) => {
        opt.label = String.fromCharCode(65 + i);
    });
    
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

// ========== 矩阵单选题操作 ==========
function updateMatrixColumn(blockIdx, colIdx, value) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.columns?.[colIdx]) return;
    block.columns[colIdx].label = value;
    QuestionsState.isDirty = true;
}

function addMatrixColumn(blockIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.columns) return;
    
    const newKey = String.fromCharCode(97 + block.columns.length); // a, b, c, d...
    block.columns.push({ key: newKey, label: '' });
    
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function removeMatrixColumn(blockIdx, colIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.columns || block.columns.length <= 2) return;
    
    const removedKey = block.columns[colIdx].key;
    block.columns.splice(colIdx, 1);
    
    // 清除引用此列的正确答案
    block.rows?.forEach(row => {
        if (row.correct === removedKey) {
            row.correct = null;
        }
    });
    
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function updateMatrixRow(blockIdx, rowIdx, field, value) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.rows?.[rowIdx]) return;
    block.rows[rowIdx][field] = value;
    QuestionsState.isDirty = true;
}

function addMatrixRow(blockIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.rows) return;
    
    block.rows.push({ text: '', correct: null, audio_timestamp: null });
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function removeMatrixRow(blockIdx, rowIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.rows || block.rows.length <= 1) return;
    
    block.rows.splice(rowIdx, 1);
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function toggleBatchPaste(blockIdx) {
    const area = document.getElementById(`batchPasteArea_${blockIdx}`);
    if (area) {
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
    }
}

function applyBatchPaste(blockIdx) {
    const textarea = document.getElementById(`batchPasteText_${blockIdx}`);
    if (!textarea) return;
    
    const lines = textarea.value.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        Utils.showToast('请输入至少一行内容', 'error');
        return;
    }
    
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block) return;
    
    // 添加新行
    lines.forEach(line => {
        block.rows.push({ text: line.trim(), correct: null, audio_timestamp: null });
    });
    
    QuestionsState.isDirty = true;
    textarea.value = '';
    document.getElementById(`batchPasteArea_${blockIdx}`).style.display = 'none';
    
    selectBlock(blockIdx);
    Utils.showToast(`已添加 ${lines.length} 行`, 'success');
}

// ========== 人物陈述匹配题操作 ==========
function updateStatement(blockIdx, stmtIdx, value) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.statements?.[stmtIdx]) return;
    block.statements[stmtIdx].text = value;
    QuestionsState.isDirty = true;
}

function addStatement(blockIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.statements) return;
    
    const newKey = String.fromCharCode(97 + block.statements.length);
    block.statements.push({ key: newKey, text: '' });
    
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function removeStatement(blockIdx, stmtIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.statements || block.statements.length <= 2) return;
    
    const removedKey = block.statements[stmtIdx].key;
    block.statements.splice(stmtIdx, 1);
    
    // 重新生成key并清除引用
    block.statements.forEach((s, i) => {
        s.key = String.fromCharCode(97 + i);
    });
    
    block.persons?.forEach(p => {
        if (p.correct_statement === removedKey) {
            p.correct_statement = null;
        }
    });
    
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function updatePerson(blockIdx, personIdx, field, value) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.persons?.[personIdx]) return;
    block.persons[personIdx][field] = value;
    QuestionsState.isDirty = true;
}

function addPerson(blockIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.persons) return;
    
    block.persons.push({ name: '', pista: null, correct_statement: null });
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function removePerson(blockIdx, personIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.persons || block.persons.length <= 1) return;
    
    block.persons.splice(personIdx, 1);
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

// ========== 匹配题操作 ==========
function updateMatchingItem(blockIdx, side, itemIdx, value) {
    const block = QuestionsState.currentData.questions[blockIdx];
    const key = side === 'left' ? 'left_items' : 'right_items';
    if (!block?.[key]?.[itemIdx] === undefined) return;
    block[key][itemIdx] = value;
    QuestionsState.isDirty = true;
}

function addMatchingItem(blockIdx, side) {
    const block = QuestionsState.currentData.questions[blockIdx];
    const key = side === 'left' ? 'left_items' : 'right_items';
    if (!block?.[key]) return;
    
    block[key].push('');
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function removeMatchingItem(blockIdx, side, itemIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    const key = side === 'left' ? 'left_items' : 'right_items';
    if (!block?.[key] || block[key].length <= 2) return;
    
    block[key].splice(itemIdx, 1);
    
    // 清除受影响的匹配关系
    if (side === 'left') {
        delete block.correct_matches[itemIdx];
        // 重新索引
        const newMatches = {};
        Object.entries(block.correct_matches).forEach(([k, v]) => {
            const idx = parseInt(k);
            if (idx > itemIdx) {
                newMatches[idx - 1] = v;
            } else {
                newMatches[idx] = v;
            }
        });
        block.correct_matches = newMatches;
    } else {
        // 清除指向被删除右侧项的匹配
        Object.entries(block.correct_matches).forEach(([k, v]) => {
            if (v === itemIdx) {
                delete block.correct_matches[k];
            } else if (v > itemIdx) {
                block.correct_matches[k] = v - 1;
            }
        });
    }
    
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function updateMatchingPair(blockIdx, leftIdx, rightValue) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.correct_matches) block.correct_matches = {};
    
    if (rightValue === '') {
        delete block.correct_matches[leftIdx];
    } else {
        block.correct_matches[leftIdx] = parseInt(rightValue);
    }
    
    QuestionsState.isDirty = true;
}

// ========== 排序题操作 ==========
function updateOrderingItem(blockIdx, itemIdx, value) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.items) return;
    block.items[itemIdx] = value;
    QuestionsState.isDirty = true;
}

function addOrderingItem(blockIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.items) return;
    
    block.items.push('');
    block.correct_order = block.items.map((_, i) => i);
    
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function removeOrderingItem(blockIdx, itemIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.items || block.items.length <= 2) return;
    
    block.items.splice(itemIdx, 1);
    block.correct_order = block.items.map((_, i) => i);
    
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

// ========== 填空题操作 ==========
function updateFillBlankAnswer(blockIdx, answerIdx, value) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.answers) return;
    block.answers[answerIdx] = value;
    QuestionsState.isDirty = true;
}

function addFillBlankAnswer(blockIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.answers) return;
    
    block.answers.push('');
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

function removeFillBlankAnswer(blockIdx, answerIdx) {
    const block = QuestionsState.currentData.questions[blockIdx];
    if (!block?.answers || block.answers.length <= 1) return;
    
    block.answers.splice(answerIdx, 1);
    QuestionsState.isDirty = true;
    selectBlock(blockIdx);
}

// ========== Instructions 操作 ==========
function switchInstructionsLang(lang) {
    // 保存当前语言的内容
    collectInstructionsData();
    
    // 切换标签样式
    document.querySelectorAll('.instructions-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.toLowerCase().includes(lang));
    });
    
    // 切换内容
    const content = document.getElementById('instructionsContent');
    const data = QuestionsState.currentData?.instructions || {};
    
    if (lang === 'es') {
        content.innerHTML = `
            <textarea id="instructionsEs" rows="3" 
                placeholder="Ejemplo: A continuación va a escuchar..."
                oninput="markDirty()">${escapeHtml(data.es || '')}</textarea>
        `;
    } else {
        content.innerHTML = `
            <textarea id="instructionsZh" rows="3" 
                placeholder="例如：接下来你将听到..."
                oninput="markDirty()">${escapeHtml(data.zh || '')}</textarea>
        `;
    }
}

function collectInstructionsData() {
    if (!QuestionsState.currentData) return;
    
    const esInput = document.getElementById('instructionsEs');
    const zhInput = document.getElementById('instructionsZh');
    
    if (esInput) {
        QuestionsState.currentData.instructions.es = esInput.value.trim();
    }
    if (zhInput) {
        QuestionsState.currentData.instructions.zh = zhInput.value.trim();
    }
}

// ========== 拖拽排序 ==========
function initBlocksSortable() {
    const list = document.getElementById('blocksList');
    if (!list) return;

    let draggedElement = null;
    let draggedIndex = -1;

    list.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.block-item');
        if (item) {
            draggedElement = item;
            draggedIndex = parseInt(item.dataset.index);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    list.addEventListener('dragend', (e) => {
        const item = e.target.closest('.block-item');
        if (item) {
            item.classList.remove('dragging');
            updateBlocksOrder();
        }
    });

    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(list, e.clientY);
        if (draggedElement) {
            if (afterElement == null) {
                list.appendChild(draggedElement);
            } else {
                list.insertBefore(draggedElement, afterElement);
            }
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.block-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateBlocksOrder() {
    const items = document.querySelectorAll('.block-item');
    const newOrder = Array.from(items).map(item => parseInt(item.dataset.index));
    
    const reorderedQuestions = newOrder.map(idx => QuestionsState.currentData.questions[idx]);
    QuestionsState.currentData.questions = reorderedQuestions;
    
    QuestionsState.isDirty = true;
    
    // 更新选中索引
    if (QuestionsState.selectedBlockIndex >= 0) {
        const newIdx = newOrder.indexOf(QuestionsState.selectedBlockIndex);
        QuestionsState.selectedBlockIndex = Array.from(items).findIndex(
            item => parseInt(item.dataset.index) === QuestionsState.selectedBlockIndex
        );
    }
    
    renderVisualEditor();
}

// ========== 保存和删除 ==========
async function saveTareaQuestions() {
    const tareaId = QuestionsState.tareaId;
    if (!tareaId) {
        Utils.showToast('未选择 Tarea', 'error');
        return;
    }

    let payload;
    
    if (QuestionsState.editMode === 'visual') {
        collectInstructionsData();
        payload = QuestionsState.currentData;
    } else {
        try {
            const editor = document.getElementById('tareaQuestionsJsonEditor');
            payload = JSON.parse(editor.value);
        } catch (err) {
            Utils.showToast('JSON 格式错误：' + err.message, 'error');
            return;
        }
    }

    // 验证数据
    if (!validateQuestionsData(payload)) {
        return;
    }

    try {
        const url = `${CONFIG.API_BASE_URL}/listening/admin/tareas/${tareaId}/questions`;
        const res = await Utils.fetchWithAuth(url, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }

        QuestionsState.isDirty = false;
        Utils.showToast('保存成功！', 'success');
        
        // 刷新版本列表
        await showTareaQuestionsModal(tareaId);
    } catch (err) {
        console.error('Save questions failed:', err);
        Utils.showToast('保存失败：' + err.message, 'error');
    }
}

function validateQuestionsData(data) {
    if (!data.questions || !Array.isArray(data.questions)) {
        Utils.showToast('题目数据格式错误', 'error');
        return false;
    }
    
    for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        if (!q.type) {
            Utils.showToast(`题目 ${i + 1} 缺少类型`, 'error');
            return false;
        }
        
        // 根据题型进行特定验证
        switch (q.type) {
            case 'multiple_choice':
                if (!q.stem && !q.question) {
                    Utils.showToast(`单选题 ${i + 1} 缺少题干`, 'error');
                    return false;
                }
                if (!q.options || q.options.length < 2) {
                    Utils.showToast(`单选题 ${i + 1} 至少需要2个选项`, 'error');
                    return false;
                }
                break;
            case 'matrix_single_choice':
                if (!q.columns || q.columns.length < 2) {
                    Utils.showToast(`矩阵题 ${i + 1} 至少需要2列`, 'error');
                    return false;
                }
                if (!q.rows || q.rows.length < 1) {
                    Utils.showToast(`矩阵题 ${i + 1} 至少需要1行`, 'error');
                    return false;
                }
                break;
        }
    }
    
    return true;
}

async function deleteTareaQuestionsVersion() {
    const tareaId = QuestionsState.tareaId;
    const version = parseInt(document.getElementById('tareaQuestionsVersion').value) || 1;

    if (!confirm(`确定删除 Tarea ${tareaId} 的版本 ${version} 吗？此操作无法撤销。`)) return;

    try {
        const url = `${CONFIG.API_BASE_URL}/listening/admin/tareas/${tareaId}/questions?version=${version}`;
        const res = await Utils.fetchWithAuth(url, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        QuestionsState.isDirty = false;
        Utils.showToast('删除成功', 'success');
        await showTareaQuestionsModal(tareaId);
    } catch (err) {
        console.error('Delete questions version failed:', err);
        Utils.showToast('删除失败：' + err.message, 'error');
    }
}

// ========== 工具函数 ==========
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 导出到全局 ==========
window.initListeningQuestionsModule = initListeningQuestionsModule;
window.showTareaQuestionsModal = showTareaQuestionsModal;
window.closeTareaQuestionsModal = closeTareaQuestionsModal;

// Block 操作
window.selectBlock = selectBlock;
window.showBlockTypeSelector = showBlockTypeSelector;
window.addBlock = addBlock;
window.deleteBlock = deleteBlock;
window.duplicateBlock = duplicateBlock;

// 字段更新
window.updateBlockField = updateBlockField;
window.markDirty = markDirty;

// 单选题
window.setCorrectOption = setCorrectOption;
window.updateOptionContent = updateOptionContent;
window.addOption = addOption;
window.removeOption = removeOption;

// 矩阵题
window.updateMatrixColumn = updateMatrixColumn;
window.addMatrixColumn = addMatrixColumn;
window.removeMatrixColumn = removeMatrixColumn;
window.updateMatrixRow = updateMatrixRow;
window.addMatrixRow = addMatrixRow;
window.removeMatrixRow = removeMatrixRow;
window.toggleBatchPaste = toggleBatchPaste;
window.applyBatchPaste = applyBatchPaste;

// 人物匹配题
window.updateStatement = updateStatement;
window.addStatement = addStatement;
window.removeStatement = removeStatement;
window.updatePerson = updatePerson;
window.addPerson = addPerson;
window.removePerson = removePerson;

// 匹配题
window.updateMatchingItem = updateMatchingItem;
window.addMatchingItem = addMatchingItem;
window.removeMatchingItem = removeMatchingItem;
window.updateMatchingPair = updateMatchingPair;

// 排序题
window.updateOrderingItem = updateOrderingItem;
window.addOrderingItem = addOrderingItem;
window.removeOrderingItem = removeOrderingItem;

// 填空题
window.updateFillBlankAnswer = updateFillBlankAnswer;
window.addFillBlankAnswer = addFillBlankAnswer;
window.removeFillBlankAnswer = removeFillBlankAnswer;

// 解析编辑器
window.insertExplanationTag = insertExplanationTag;
window.insertExplanationList = insertExplanationList;
window.toggleExplanationPreview = toggleExplanationPreview;

// Instructions
window.switchInstructionsLang = switchInstructionsLang;

// 保存
window.saveTareaQuestions = saveTareaQuestions;
window.deleteTareaQuestionsVersion = deleteTareaQuestionsVersion;

console.log('📝 Questions module loaded (v2.0)');