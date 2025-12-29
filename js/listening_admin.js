/* ===================================
   听力管理入口 - listening_admin.js
   负责把听力相关子模块（素材 / tareas / questions）组合起来，并控制子视图切换
   =================================== */

const ListeningAdminState = {
    initialized: false,
    currentView: 'tareas', // 'tareas' | 'materials'
};

function initListeningAdmin() {
    if (ListeningAdminState.initialized) return;
    console.log('🎧 Initializing Listening Admin Module...');

    // 初始化 tareas 模块（优先，因为是默认视图）
    if (typeof initListeningTareasModule === 'function') {
        initListeningTareasModule();
        console.log('✅ Tareas module initialized');
    } else {
        console.warn('⚠️ initListeningTareasModule not found');
    }

    // 初始化 questions 编辑器模块
    if (typeof initListeningQuestionsModule === 'function') {
        initListeningQuestionsModule();
        console.log('✅ Questions module initialized');
    } else {
        console.warn('⚠️ initListeningQuestionsModule not found');
    }

    // 初始化已有的素材模块（listening.js）- 可选
    if (typeof initListeningModule === 'function') {
        // initListeningModule(); // 暂时禁用，避免冲突
        console.log('ℹ️ Materials module available but not auto-initialized');
    }

    // 子视图切换（Tareas / Materials）
    bindSubtabEvents();

    // 默认显示 Tareas 视图
    switchListeningView('tareas');

    ListeningAdminState.initialized = true;
    console.log('✅ Listening Admin Module initialized');
}

function bindSubtabEvents() {
    const subtabs = document.querySelectorAll('#page-listening .subtab');
    
    subtabs.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            if (view) {
                switchListeningView(view);
            }
        });
    });
}

function switchListeningView(view) {
    console.log('📺 Switching to view:', view);
    ListeningAdminState.currentView = view;

    // 更新 tab 按钮状态
    document.querySelectorAll('#page-listening .subtab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // 隐藏所有视图
    document.querySelectorAll('#page-listening .listening-view').forEach(v => {
        v.classList.add('hidden');
    });

    // 显示目标视图
    const viewId = 'listeningView' + capitalize(view);
    const targetView = document.getElementById(viewId);
    
    if (targetView) {
        targetView.classList.remove('hidden');
    } else {
        console.warn('⚠️ View not found:', viewId);
    }

    // 根据视图按需加载数据
    if (view === 'materials') {
        // 切换到素材库时，初始化素材模块（如果还没初始化）
        if (typeof initListeningModule === 'function' && typeof ListeningState !== 'undefined' && !ListeningState.initialized) {
            initListeningModule();
        } else if (typeof loadListeningMaterials === 'function') {
            loadListeningMaterials(1);
        }
    }
}

function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// 刷新当前视图
function refreshListeningView() {
    if (ListeningAdminState.currentView === 'tareas') {
        if (typeof loadTareas === 'function') {
            loadTareas(1);
        }
    } else if (ListeningAdminState.currentView === 'materials') {
        if (typeof loadListeningMaterials === 'function') {
            loadListeningMaterials(1);
        }
    }
}

// 全局暴露
window.initListeningAdmin = initListeningAdmin;
window.switchListeningView = switchListeningView;
window.refreshListeningView = refreshListeningView;

console.log('✅ listening_admin.js loaded');