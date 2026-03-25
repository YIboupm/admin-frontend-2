/* ===================================
   Daily Sentences 管理模块
   支持拖拽/粘贴/点击上传图片
   =================================== */

const DailySentenceState = {
    sentences: [],
    loading: false,
    currentSentence: null,
    selectedImageFile: null
};

/**
 * 初始化每日一句模块
 */
function initDailySentencesModule() {
    console.log('Initializing daily sentences module...');
    loadDailySentences();
    initImageDropZone();
}

/**
 * 初始化图片拖拽区域
 */
function initImageDropZone() {
    const dropZone = document.getElementById('imageDropZone');
    if (!dropZone) return;

    // 点击选择文件
    dropZone.addEventListener('click', (e) => {
        // 如果点击的是删除按钮，不触发选择
        if (e.target.closest('.btn-remove-image')) return;
        document.getElementById('sentenceImage').click();
    });

    // 拖拽进入
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    // 拖拽悬停
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    // 拖拽离开
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 只有离开 dropZone 本身才移除样式
        if (!dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drag-over');
        }
    });

    // 放置文件
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        const items = e.dataTransfer.items;

        // 优先处理文件
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                processImageFile(file);
                return;
            }
        }

        // 处理从网页拖拽的图片（URL）
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type === 'text/uri-list' || items[i].type === 'text/plain') {
                    items[i].getAsString((url) => {
                        if (isImageUrl(url)) {
                            fetchImageFromUrl(url);
                        }
                    });
                    return;
                }
            }
        }
    });

    // 粘贴图片（Ctrl+V）
    document.addEventListener('paste', (e) => {
        // 只在模态框打开时处理
        const modal = document.getElementById('dailySentenceModal');
        if (modal.classList.contains('hidden')) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                    processImageFile(file);
                    e.preventDefault();
                    return;
                }
            }
        }
    });
}

/**
 * 判断 URL 是否为图片
 */
function isImageUrl(url) {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('image') ||
           lowerUrl.includes('photo') ||
           lowerUrl.includes('img');
}

/**
 * 从 URL 获取图片并转为 File
 */
async function fetchImageFromUrl(url) {
    try {
        // 显示加载状态
        const prompt = document.getElementById('imageUploadPrompt');
        if (prompt) {
            prompt.innerHTML = `
                <svg class="upload-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
                <span class="upload-text">正在下载图片...</span>
            `;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('无法下载图片');

        const blob = await response.blob();
        
        // 检查是否为图片
        if (!blob.type.startsWith('image/')) {
            throw new Error('不是有效的图片文件');
        }

        // 创建 File 对象
        const filename = url.split('/').pop()?.split('?')[0] || 'image.jpg';
        const file = new File([blob], filename, { type: blob.type });
        
        processImageFile(file);
    } catch (error) {
        console.error('下载图片失败:', error);
        alert('无法下载图片: ' + error.message);
        resetImagePrompt();
    }
}

/**
 * 重置上传提示
 */
function resetImagePrompt() {
    const prompt = document.getElementById('imageUploadPrompt');
    if (prompt) {
        prompt.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="upload-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span class="upload-text">拖拽图片到这里，或 <em>点击选择</em></span>
            <small class="upload-hint">支持 JPG, PNG, WebP, GIF（最大 10MB）· 可直接从网页拖图</small>
        `;
    }
}

/**
 * 处理图片文件（从任意来源）
 */
function processImageFile(file) {
    // 验证大小
    if (file.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过 10MB');
        resetImagePrompt();
        return;
    }

    // 验证类型
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        resetImagePrompt();
        return;
    }

    DailySentenceState.selectedImageFile = file;
    document.getElementById('deleteExistingImage').value = 'false';

    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
        showImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
}

/**
 * 文件选择框选择（点击上传）
 */
function handleImageSelect(input) {
    if (input.files && input.files[0]) {
        processImageFile(input.files[0]);
    }
}

/**
 * 显示图片预览
 */
function showImagePreview(src) {
    const previewContainer = document.getElementById('imagePreviewContainer');
    const prompt = document.getElementById('imageUploadPrompt');
    const previewImg = document.getElementById('imagePreview');

    previewImg.src = src;
    previewContainer.classList.remove('hidden');
    prompt.classList.add('hidden');
}

/**
 * 重置图片预览
 */
function resetImagePreview() {
    const previewContainer = document.getElementById('imagePreviewContainer');
    const prompt = document.getElementById('imageUploadPrompt');
    const previewImg = document.getElementById('imagePreview');
    const fileInput = document.getElementById('sentenceImage');

    previewImg.src = '';
    previewContainer.classList.add('hidden');
    prompt.classList.remove('hidden');
    if (fileInput) fileInput.value = '';
    
    resetImagePrompt();
}

/**
 * 移除图片
 */
function removeImage(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    DailySentenceState.selectedImageFile = null;
    document.getElementById('deleteExistingImage').value = 'true';
    resetImagePreview();
}

/**
 * 加载每日一句列表
 */
async function loadDailySentences() {
    const tbody = document.getElementById('dailySentencesList');
    const includeUnpublished = document.getElementById('includeUnpublished')?.checked ?? true;

    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center">加载中...</td></tr>';
    DailySentenceState.loading = true;

    try {
        const baseUrl = Utils.getApiUrl(CONFIG.API.DAILY_SENTENCES.LIST);
        const url = `${baseUrl}?include_unpublished=${includeUnpublished}&limit=50`;

        const response = await Utils.fetchWithAuth(url);
        if (!response.ok) throw new Error('Failed to load sentences');

        const data = await response.json();
        const items = data.items || data || [];

        DailySentenceState.sentences = items;
        renderDailySentencesTable(items);
    } catch (error) {
        console.error('Error loading daily sentences:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">加载失败: ${error.message}</td></tr>`;
    } finally {
        DailySentenceState.loading = false;
    }
}

/**
 * 渲染列表
 */
function renderDailySentencesTable(items) {
    const tbody = document.getElementById('dailySentencesList');
    const tableContainer = document.getElementById('dailySentencesTableContainer');
    const emptyState = document.getElementById('dailySentencesEmpty');

    if (!tbody || !tableContainer || !emptyState) return;

    if (items.length === 0) {
        tableContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    tableContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');

    tbody.innerHTML = items.map(item => {
        const imageUrl = item.image_url || null;
        const thumbnailHtml = imageUrl
            ? `<img src="${imageUrl}" class="thumbnail-cell" alt="配图" onerror="this.outerHTML='<div class=\\'thumbnail-placeholder\\'><svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\' style=\\'width:20px;height:20px\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg></div>'">`
            : `<div class="thumbnail-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 20px; height: 20px;">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
               </div>`;

        return `
        <tr>
            <td>${item.day}</td>
            <td>${thumbnailHtml}</td>
            <td class="text-truncate" style="max-width: 200px;" title="${escapeHtml(item.text_es)}">${escapeHtml(item.text_es)}</td>
            <td class="text-truncate" style="max-width: 200px;" title="${escapeHtml(item.text_zh)}">${escapeHtml(item.text_zh)}</td>
            <td>
                <span class="status-badge ${item.is_published ? 'status-published' : 'status-draft'}">
                    ${item.is_published ? '已发布' : '未发布'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editDailySentence(${item.id})" title="编辑">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon text-danger" onclick="deleteDailySentence(${item.id})" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

/**
 * 打开模态框
 */
function openDailySentenceModal(sentence = null) {
    const modal = document.getElementById('dailySentenceModal');
    const title = document.getElementById('dailySentenceModalTitle');
    const form = document.getElementById('dailySentenceForm');

    form.reset();
    DailySentenceState.currentSentence = sentence;
    DailySentenceState.selectedImageFile = null;
    document.getElementById('dailySentenceId').value = '';
    document.getElementById('existingImageUrl').value = '';
    document.getElementById('deleteExistingImage').value = 'false';

    resetImagePreview();

    if (sentence) {
        title.textContent = '编辑每日一句';
        document.getElementById('dailySentenceId').value = sentence.id;
        document.getElementById('sentenceDay').value = sentence.day;
        document.getElementById('sentenceEs').value = sentence.text_es;
        document.getElementById('sentenceZh').value = sentence.text_zh;
        document.getElementById('sentenceNote').value = sentence.note || '';
        document.getElementById('sentencePublished').checked = sentence.is_published;
        document.getElementById('sentenceKeywords').value = JSON.stringify(sentence.keywords || [], null, 2);

        if (sentence.image_url) {
            document.getElementById('existingImageUrl').value = sentence.image_url;
            showImagePreview(sentence.image_url);
        }
    } else {
        title.textContent = '新建每日一句';
        document.getElementById('sentenceDay').value = new Date().toISOString().split('T')[0];
        document.getElementById('sentenceKeywords').value = '[]';
    }

    modal.classList.remove('hidden');
    
    // 重新初始化拖拽（模态框可能重新渲染）
    setTimeout(() => initImageDropZone(), 100);
}

/**
 * 编辑
 */
function editDailySentence(id) {
    const sentence = DailySentenceState.sentences.find(s => s.id === id);
    if (sentence) {
        openDailySentenceModal(sentence);
    }
}

/**
 * 关闭模态框
 */
function closeDailySentenceModal() {
    document.getElementById('dailySentenceModal').classList.add('hidden');
    DailySentenceState.currentSentence = null;
    DailySentenceState.selectedImageFile = null;
}

/**
 * 保存
 */
async function saveDailySentence() {
    const id = document.getElementById('dailySentenceId').value;
    const day = document.getElementById('sentenceDay').value;
    const text_es = document.getElementById('sentenceEs').value.trim();
    const text_zh = document.getElementById('sentenceZh').value.trim();
    const note = document.getElementById('sentenceNote').value.trim();
    const is_published = document.getElementById('sentencePublished').checked;
    const deleteImage = document.getElementById('deleteExistingImage').value === 'true';

    if (!day || !text_es || !text_zh) {
        alert('请填写必填字段（日期、西班牙语、中文）');
        return;
    }

    let keywords = [];
    try {
        const keywordsStr = document.getElementById('sentenceKeywords').value.trim();
        if (keywordsStr) {
            keywords = JSON.parse(keywordsStr);
        }
    } catch (e) {
        alert('关键词 JSON 格式错误');
        return;
    }

    const formData = new FormData();
    formData.append('day', day);
    formData.append('text_es', text_es);
    formData.append('text_zh', text_zh);
    formData.append('note', note);
    formData.append('is_published', is_published ? 'true' : 'false');
    formData.append('keywords_json', JSON.stringify(keywords));

    if (DailySentenceState.selectedImageFile) {
        formData.append('image', DailySentenceState.selectedImageFile);
    }

    if (id && deleteImage) {
        formData.append('delete_image', 'true');
    }

    const saveBtn = document.getElementById('saveSentenceBtn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
        let url, method;

        if (id) {
            url = Utils.getApiUrl(CONFIG.API.DAILY_SENTENCES.UPDATE(id));
            method = 'PATCH';
        } else {
            url = Utils.getApiUrl(CONFIG.API.DAILY_SENTENCES.CREATE);
            method = 'POST';
        }

        // FormData 需要让浏览器自动设置 Content-Type（包含 boundary）
        // 所以我们不使用 fetchWithAuth，而是手动构建请求
        const token = Utils.getToken();
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // 注意：不设置 Content-Type，让浏览器自动处理 multipart/form-data
        
        const response = await fetch(url, {
            method: method,
            body: formData,
            headers: headers
        });
        
        // 处理 401
        if (response.status === 401) {
            Utils.clearAuth();
            window.location.href = Utils.getPageUrl('login.html');
            throw new Error('认证已过期，请重新登录');
        }

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || '保存失败');
        }

        closeDailySentenceModal();
        loadDailySentences();

    } catch (error) {
        console.error('Save error:', error);
        alert(`保存失败: ${error.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

/**
 * 删除
 */
async function deleteDailySentence(id) {
    if (!confirm('确定要删除这条每日一句吗？\n（关联的图片也会被删除）')) return;

    try {
        const url = Utils.getApiUrl(CONFIG.API.DAILY_SENTENCES.DELETE(id));
        const response = await Utils.fetchWithAuth(url, { method: 'DELETE' });

        if (!response.ok) throw new Error('删除失败');

        loadDailySentences();
    } catch (error) {
        alert(`删除失败: ${error.message}`);
    }
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}