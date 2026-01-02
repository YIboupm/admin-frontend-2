/* ===================================
   全局配置文件 - config.js
   =================================== */

const CONFIG = {
    // API 基础地址 - 根据你的后端实际地址修改
    API_BASE_URL: 'http://127.0.0.1:8000',
    
    // 各模块 API 路径
    API: {
        // 认证相关
        AUTH: {
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            GOOGLE_LOGIN: '/auth/auth/google/login',
        },
        
        // 写作任务管理
        WRITING: {
            TASKS: '/writing/tasks',
            TASK_DETAIL: (id) => `/writing/tasks/${id}`,
            TASK_REFERENCES: (id) => `/writing/tasks/${id}/references`,
            TASK_IMAGES: (id) => `/writing/tasks/${id}/images`,
            REFERENCES: (id) => `/writing/references/${id}`,
            IMAGES: (id) => `/writing/images/${id}`,  // 单个图片操作
        },
        SPEAKING: {
            TASKS: '/speaking/admin/tasks',
            TASK_DETAIL: (id) => `/speaking/admin/tasks/${id}`,
            TASK_AUDIOS: (id) => `/speaking/admin/tasks/${id}/audios`,
            AUDIO_UPLOAD: (id) => `/speaking/admin/tasks/${id}/audio/upload`,
            AUDIO_LINK: (id) => `/speaking/admin/tasks/${id}/audio/link`,
            AUDIO_DETAIL: (taskId, audioId) => `/speaking/admin/tasks/${taskId}/audios/${audioId}`,
            AUDIOS_REORDER: (id) => `/speaking/admin/tasks/${id}/audios/reorder`,
            PROCESSING_STATUS: (id) => `/speaking/admin/audio/processing/${id}`,
            TASK_IMAGES: (id) => `/speaking/admin/tasks/${id}/images`,
            IMAGE_DETAIL: (taskId, imgId) => `/speaking/admin/tasks/${taskId}/images/${imgId}`,
            IMAGES_REORDER: (id) => `/speaking/admin/tasks/${id}/images/reorder`,
            MATERIALS: '/speaking/admin/materials',
            STATS: '/speaking/admin/stats',
        },
        // 阅读管理
        READING: {
            PASSAGES: '/siele-reading/passages',
            ADMIN_PREVIEW: '/siele-reading-admin/reading/admin/preview',
            ADMIN_PASSAGES: '/siele-reading-admin/reading/admin/passages',
        },
        
        // 旅游管理
        TOURISM: {
            COUNTRIES: '/tourism/admin/countries',
            CITIES: '/tourism/admin/cities',
        },
        
        // 故事管理
        STORIES: {
            LIST: '/stories/',
            DETAIL: (id) => `/stories/${id}`,
            CHAPTERS: (id) => `/stories/${id}/chapters`,
        },
        
        // 地点管理
        PLACES: {
            LIST: '/places',
            DETAIL: (id) => `/places/${id}`,
            PARAGRAPHS: (id) => `/places/${id}/paragraphs`,
        },
        // 口语管理
        
    },
    
    // 本地存储键名
    STORAGE_KEYS: {
        TOKEN: 'admin_token',
        USER: 'admin_user',
        REMEMBER: 'admin_remember',
    },
    
    // 分页配置
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 10,
        PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    },
    
    // 考试类型
    EXAM_TYPES: [
        { value: 'DELE', label: 'DELE' },
        { value: 'SIELE', label: 'SIELE' },
    ],
    
    // 级别选项
    LEVELS: [
        { value: 'A1', label: 'A1 - 入门' },
        { value: 'A2', label: 'A2 - 初级' },
        { value: 'B1', label: 'B1 - 中级' },
        { value: 'B2', label: 'B2 - 中高级' },
        { value: 'C1', label: 'C1 - 高级' },
        { value: 'C2', label: 'C2 - 精通' },
    ],
    
    // 提交状态
    SUBMISSION_STATUS: {
        pending: { label: '待批改', color: '#f39c12' },
        processing: { label: '批改中', color: '#3498db' },
        graded: { label: '已评分', color: '#27ae60' },
    },
};

// 工具函数
const Utils = {
    /**
     * 获取完整的 API URL
     */
    getApiUrl(path) {
        return CONFIG.API_BASE_URL + path;
    },
    
    /**
     * 获取存储的 Token
     */
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    /**
     * 设置 Token
     */
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    },
    
    /**
     * 移除 Token
     */
    removeToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    /**
     * 获取存储的用户信息
     */
    getUser() {
        const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    },
    
    /**
     * 设置用户信息
     */
    setUser(user) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    },
    
    /**
     * 清除所有认证信息
     */
    clearAuth() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    },
    
    /**
     * 检查是否已登录
     */
    isAuthenticated() {
        return !!this.getToken();
    },
    
    /**
     * 带认证的 fetch 请求
     */
    async fetchWithAuth(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, {
            ...options,
            headers,
        });
        
        // 如果返回 401，清除认证信息并跳转登录页
        if (response.status === 401) {
            this.clearAuth();
            window.location.href = 'login.html';
            throw new Error('认证已过期，请重新登录');
        }
        
        return response;
    },
    
    /**
     * 格式化日期
     */
    formatDate(dateStr, format = 'YYYY-MM-DD HH:mm') {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes);
    },
    
    /**
     * 显示提示消息
     */
    showToast(message, type = 'info', duration = 3000) {
        // 移除已有的 toast
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${this.getToastIcon(type)}</span>
            <span class="toast-text">${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // 触发动画
        setTimeout(() => toast.classList.add('show'), 10);
        
        // 自动移除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
        };
        return icons[type] || icons.info;
    },
    
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * 截断文本
     */
    truncate(str, length = 50) {
        if (!str) return '';
        return str.length > length ? str.substring(0, length) + '...' : str;
    },
    
    /**
     * HTML 转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
};

// 导出到全局
window.CONFIG = CONFIG;
window.Utils = Utils;
