/* ===================================
   管理后台主逻辑 - admin.js
   支持动态加载页面模块
   =================================== */

// 全局状态
const AdminState = {
    currentPage: 'dashboard',
    sidebarOpen: false,
    loadedPages: new Set(),  // 记录已加载的页面
};

// 页面配置
const PAGE_CONFIG = {
    dashboard: {
        title: '仪表盘',
        file: 'pages/dashboard.html',
        init: 'loadDashboardStats'
    },
    writing: {
        title: '写作任务',
        file: 'pages/writing.html',
        init: 'initWritingModule'
    },
    speaking: {
        title: '口语任务',
        file: 'pages/speaking.html',
        init: 'initSpeakingModule'
    },
    listening: {
        title: '听力管理',
        file: 'pages/listening.html',
        init: 'initListeningAdmin'
    },
    reading: {
        title: '阅读材料',
        file: 'pages/reading.html',
        init: 'initReadingModule'
    },
    stories: {
        title: '故事管理',
        file: 'pages/stories.html',
        init: 'initStoriesModule'
    },
    places: {
        title: '旅游地点',
        file: 'pages/places.html',
        init: 'initPlacesModule'
    },
    countries: {
        title: '国家/城市',
        file: 'pages/countries.html',
        init: 'initCountriesModule'
    },
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    if (!Utils.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // 初始化各模块
    initSidebar();
    initNavigation();
    initUserInfo();
    initLogout();
    initMobileMenu();
    
    // 监听 hash 变化
    window.addEventListener('hashchange', handleHashChange);
    
    // 处理初始路由
    handleInitialRoute();
});

/**
 * 初始化侧边栏
 */
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    
    // 点击外部关闭侧边栏（移动端）
    document.addEventListener('click', function(e) {
        if (AdminState.sidebarOpen && 
            !sidebar.contains(e.target) && 
            !e.target.closest('#menuToggle')) {
            closeSidebar();
        }
    });
}

/**
 * 初始化导航
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page) {
                navigateTo(page);
            }
        });
    });
}

/**
 * 导航到指定页面
 */
async function navigateTo(page) {
    if (!PAGE_CONFIG[page]) {
        console.warn('Unknown page:', page);
        return;
    }
    
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    // 更新页面标题
    document.getElementById('pageTitle').textContent = PAGE_CONFIG[page].title;
    
    // 更新 URL hash
    window.location.hash = page;
    
    // 更新状态
    AdminState.currentPage = page;
    
    // 关闭移动端侧边栏
    closeSidebar();
    
    // 加载页面内容
    await loadPageContent(page);
}

/**
 * 动态加载页面内容
 */
async function loadPageContent(page) {
    const contentWrapper = document.getElementById('contentWrapper');
    const pageLoading = document.getElementById('pageLoading');
    const modalsContainer = document.getElementById('modalsContainer');
    
    // 如果页面已加载，直接显示
    if (AdminState.loadedPages.has(page)) {
        showPage(page);
        triggerPageInit(page);
        return;
    }
    
    // 隐藏所有页面，显示加载状态
    hideAllPages();
    if (pageLoading) {
        pageLoading.style.display = 'flex';
    }
    
    try {
        const config = PAGE_CONFIG[page];
        const response = await fetch(config.file);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${config.file}: ${response.status}`);
        }
        
        const html = await response.text();
        
        // 解析 HTML，分离页面内容和模态框
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 提取 section.page-content
        const pageSection = doc.querySelector('section.page-content');
        if (pageSection) {
            contentWrapper.appendChild(pageSection);
        }
        
        // 提取所有模态框
        const modals = doc.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modalsContainer.appendChild(modal);
        });
        
        // 标记为已加载
        AdminState.loadedPages.add(page);
        
        // 隐藏加载状态
        if (pageLoading) {
            pageLoading.style.display = 'none';
        }
        
        // 显示页面
        showPage(page);
        
        // 触发初始化
        triggerPageInit(page);
        
    } catch (error) {
        console.error('Error loading page:', error);
        if (pageLoading) {
            pageLoading.innerHTML = `
                <div class="error-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <p>页面加载失败</p>
                    <button class="btn btn-primary" onclick="location.reload()">刷新重试</button>
                </div>
            `;
        }
    }
}

/**
 * 隐藏所有页面
 */
function hideAllPages() {
    document.querySelectorAll('.page-content').forEach(section => {
        section.classList.remove('active');
    });
}

/**
 * 显示指定页面
 */
function showPage(page) {
    hideAllPages();
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) {
        pageEl.classList.add('active');
    }
}

/**
 * 触发页面初始化函数
 */
function triggerPageInit(page) {
    const config = PAGE_CONFIG[page];
    if (config.init && typeof window[config.init] === 'function') {
        window[config.init]();
    }
}

/**
 * 处理 hash 变化
 */
function handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (hash && PAGE_CONFIG[hash]) {
        navigateTo(hash);
    }
}

/**
 * 处理初始路由
 */
function handleInitialRoute() {
    const hash = window.location.hash.slice(1);
    const validPages = Object.keys(PAGE_CONFIG);
    
    if (hash && validPages.includes(hash)) {
        navigateTo(hash);
    } else {
        navigateTo('dashboard');
    }
}

/**
 * 初始化用户信息
 */
function initUserInfo() {
    const user = Utils.getUser();
    if (user) {
        const userName = document.getElementById('userName');
        const userInitial = document.getElementById('userInitial');
        
        if (userName && user.full_name) {
            userName.textContent = user.full_name;
        }
        
        if (userInitial && user.full_name) {
            userInitial.textContent = user.full_name.charAt(0).toUpperCase();
        }
    }
}

/**
 * 初始化退出登录
 */
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('确定要退出登录吗？')) {
                Utils.clearAuth();
                window.location.href = 'login.html';
            }
        });
    }
}

/**
 * 初始化移动端菜单
 */
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            toggleSidebar();
        });
    }
}

/**
 * 切换侧边栏
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    AdminState.sidebarOpen = !AdminState.sidebarOpen;
    sidebar.classList.toggle('open', AdminState.sidebarOpen);
}

/**
 * 关闭侧边栏
 */
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    AdminState.sidebarOpen = false;
    sidebar.classList.remove('open');
}

/**
 * 加载仪表盘统计数据
 */
async function loadDashboardStats() {
    try {
        // 写作任务数量
        try {
            const writingRes = await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.WRITING.TASKS) + '?page_size=1'
            );
            if (writingRes.ok) {
                const data = await writingRes.json();
                const el = document.getElementById('statWritingTasks');
                if (el) {
                    el.textContent = Array.isArray(data) ? data.length + '+' : '-';
                }
            }
        } catch (e) {
            console.log('Writing stats not available');
        }
        
        // 听力数量
        try {
            const listeningRes = await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.LISTENING?.TAREAS || '/listening/admin/tareas')
            );
            if (listeningRes.ok) {
                const data = await listeningRes.json();
                const el = document.getElementById('statListening');
                if (el) {
                    el.textContent = Array.isArray(data) ? data.length : '-';
                }
            }
        } catch (e) {
            console.log('Listening stats not available');
        }
        
        // 故事数量
        try {
            const storiesRes = await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.STORIES?.LIST || '/stories')
            );
            if (storiesRes.ok) {
                const data = await storiesRes.json();
                const el = document.getElementById('statStories');
                if (el) {
                    el.textContent = Array.isArray(data) ? data.length : '-';
                }
            }
        } catch (e) {
            console.log('Stories stats not available');
        }
        
        // 地点数量
        try {
            const placesRes = await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.PLACES?.LIST || '/places')
            );
            if (placesRes.ok) {
                const data = await placesRes.json();
                const el = document.getElementById('statPlaces');
                if (el) {
                    el.textContent = Array.isArray(data) ? data.length : '-';
                }
            }
        } catch (e) {
            console.log('Places stats not available');
        }
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// ===================================
// 公共模态框函数
// ===================================

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
 * 打开确认删除模态框
 * @param {Function} onConfirm - 确认删除时的回调
 * @param {string} message - 可选的自定义消息
 */
function openConfirmDeleteModal(onConfirm, message) {
    const modal = document.getElementById('confirmDeleteModal');
    const btn = document.getElementById('btnConfirmDelete');
    const msgEl = modal?.querySelector('.confirm-message p');
    
    if (modal) {
        if (message && msgEl) {
            msgEl.textContent = message;
        }
        
        // 移除旧的事件监听器
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // 添加新的事件监听器
        newBtn.addEventListener('click', function() {
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
            closeConfirmDeleteModal();
        });
        
        modal.classList.remove('hidden');
    }
}

// ===================================
// 占位函数（用于未开发的模块）
// ===================================

function initReadingModule() {
    console.log('Reading module placeholder');
}

function initStoriesModule() {
    console.log('Stories module placeholder');
}

function initPlacesModule() {
    console.log('Places module placeholder');
}

function initCountriesModule() {
    console.log('Countries module placeholder');
}

function openReadingModal() {
    const modal = document.getElementById('readingModal');
    if (modal) modal.classList.remove('hidden');
}

function closeReadingModal() {
    const modal = document.getElementById('readingModal');
    if (modal) modal.classList.add('hidden');
}

function openStoryModal() {
    const modal = document.getElementById('storyModal');
    if (modal) modal.classList.remove('hidden');
}

function closeStoryModal() {
    const modal = document.getElementById('storyModal');
    if (modal) modal.classList.add('hidden');
}

function openPlaceModal() {
    const modal = document.getElementById('placeModal');
    if (modal) modal.classList.remove('hidden');
}

function closePlaceModal() {
    const modal = document.getElementById('placeModal');
    if (modal) modal.classList.add('hidden');
}

function openCountryModal() {
    const modal = document.getElementById('countryModal');
    if (modal) modal.classList.remove('hidden');
}

function closeCountryModal() {
    const modal = document.getElementById('countryModal');
    if (modal) modal.classList.add('hidden');
}

function openListeningModal() {
    // 调用 listening_tareas.js 中的函数
    if (typeof openListeningTareaModal === 'function') {
        openListeningTareaModal();
    }
}
