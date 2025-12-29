/* ===================================
   管理后台主逻辑 - admin.js
   =================================== */

// 全局状态
const AdminState = {
    currentPage: 'dashboard',
    sidebarOpen: false,
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
    
    // 加载仪表盘数据
    loadDashboardStats();
    
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
function navigateTo(page) {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    // 更新页面显示
    document.querySelectorAll('.page-content').forEach(section => {
        section.classList.toggle('active', section.id === `page-${page}`);
    });
    
    // 更新页面标题
    const titles = {
        dashboard: '仪表盘',
        writing: '写作任务',
        reading: '阅读材料',
        stories: '故事管理',
        places: '旅游地点',
        countries: '国家/城市',
        listening: '听力管理',
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    
    // 更新 URL hash
    window.location.hash = page;
    
    // 更新状态
    AdminState.currentPage = page;
    
    // 关闭移动端侧边栏
    closeSidebar();
    
    // 触发页面加载事件
    onPageLoad(page);
}

/**
 * 处理初始路由
 */
function handleInitialRoute() {
    const hash = window.location.hash.slice(1);
    const validPages = ['dashboard', 'writing', 'reading', 'stories', 'places', 'countries', 'listening'];
    
    if (hash && validPages.includes(hash)) {
        navigateTo(hash);
    } else {
        navigateTo('dashboard');
    }
}

/**
 * 页面加载回调
 */
function onPageLoad(page) {
    switch (page) {
        case 'writing':
            // 初始化写作任务模块（在 writing.js 中定义）
            if (typeof initWritingModule === 'function') {
                initWritingModule();
            }
            break;
        case 'listening':
            // 初始化听力管理模块（分散到多个文件）
            if (typeof initListeningAdmin === 'function') {
                initListeningAdmin();
            }
            break;
        case 'reading':
            // 初始化阅读模块
            break;
        case 'stories':
            // 初始化故事模块
            break;
        case 'places':
            // 初始化地点模块
            break;
        case 'countries':
            // 初始化国家模块
            break;
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
    
    logoutBtn.addEventListener('click', function() {
        if (confirm('确定要退出登录吗？')) {
            Utils.clearAuth();
            window.location.href = 'login.html';
        }
    });
}

/**
 * 初始化移动端菜单
 */
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    
    menuToggle.addEventListener('click', function() {
        toggleSidebar();
    });
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
        // 尝试加载各模块的统计数据
        // 写作任务数量
        try {
            const writingRes = await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.WRITING.TASKS) + '?page_size=1'
            );
            if (writingRes.ok) {
                const data = await writingRes.json();
                document.getElementById('statWritingTasks').textContent = 
                    Array.isArray(data) ? data.length + '+' : '-';
            }
        } catch (e) {
            console.log('Writing stats not available');
        }
        
        // 故事数量
        try {
            const storiesRes = await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.STORIES.LIST)
            );
            if (storiesRes.ok) {
                const data = await storiesRes.json();
                document.getElementById('statStories').textContent = 
                    Array.isArray(data) ? data.length : '-';
            }
        } catch (e) {
            console.log('Stories stats not available');
        }
        
        // 地点数量
        try {
            const placesRes = await Utils.fetchWithAuth(
                Utils.getApiUrl(CONFIG.API.PLACES.LIST)
            );
            if (placesRes.ok) {
                const data = await placesRes.json();
                document.getElementById('statPlaces').textContent = 
                    Array.isArray(data) ? data.length : '-';
            }
        } catch (e) {
            console.log('Places stats not available');
        }
        
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

/**
 * 显示全局加载状态
 */
function showGlobalLoading() {
    // 可以在这里添加全局加载指示器
}

/**
 * 隐藏全局加载状态
 */
function hideGlobalLoading() {
    // 隐藏全局加载指示器
}

// 监听 hash 变化
window.addEventListener('hashchange', function() {
    const hash = window.location.hash.slice(1);
    if (hash && hash !== AdminState.currentPage) {
        navigateTo(hash);
    }
});