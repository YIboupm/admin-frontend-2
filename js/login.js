/* ===================================
   登录页面逻辑 - login.js (最终修复版)
   修复：使用config.js中的Utils和正确的STORAGE_KEYS
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 登录页面初始化...');
    console.log('📦 CONFIG:', window.CONFIG ? '已加载' : '未加载');
    console.log('🛠️ Utils:', window.Utils ? '已加载' : '未加载');
    
    // 确保CONFIG和Utils已加载
    if (!window.CONFIG || !window.Utils) {
        console.error('❌ config.js未正确加载！');
        document.getElementById('errorMessage').classList.remove('hidden');
        document.getElementById('errorMessage').querySelector('span').textContent = 
            '系统初始化失败：配置文件加载错误';
        return;
    }
    
    // 🔧 修复：添加循环检测
    const loginRedirectCount = parseInt(sessionStorage.getItem('loginRedirectCount') || '0');
    
    console.log('登录页重定向次数:', loginRedirectCount);
    
    if (loginRedirectCount > 3) {
        console.error('❌ 检测到登录页面循环');
        sessionStorage.clear();
        localStorage.clear();
        const errorEl = document.getElementById('errorMessage');
        errorEl.classList.remove('hidden');
        errorEl.querySelector('span').textContent = 
            '检测到循环错误，已清除缓存，请重新登录';
        return;
    }
    
    // 检查是否已登录
    // 🔧 修复：使用Utils.isAuthenticated()
    if (Utils.isAuthenticated()) {
        console.log('✅ 已登录，准备跳转到admin...');
        
        // 🔧 修复：增加重定向计数
        sessionStorage.setItem('loginRedirectCount', (loginRedirectCount + 1).toString());
        
        // 🔧 修复：设置标记，告诉admin.html刚刚从登录页过来
        sessionStorage.setItem('justLoggedIn', 'true');
        
        // 延迟跳转，确保sessionStorage写入完成
        setTimeout(() => {
            console.log('🔄 跳转到admin.html');
            window.location.href = 'admin.html';
        }, 150); // 增加到150ms
        return;
    }
    
    // 🔧 修复：清除重定向计数
    sessionStorage.removeItem('loginRedirectCount');
    
    console.log('📝 初始化登录表单...');
    
    // 初始化登录表单
    initLoginForm();
    initPasswordToggle();
    loadRememberedEmail();
});

/**
 * 初始化登录表单
 */
function initLoginForm() {
    const form = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('🔐 开始登录流程...');
        
        // 获取表单数据
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // 表单验证
        if (!email || !password) {
            showError('请填写邮箱和密码');
            return;
        }
        
        if (!isValidEmail(email)) {
            showError('请输入有效的邮箱地址');
            return;
        }
        
        // 开始登录
        setLoading(true);
        hideError();
        
        try {
            console.log('📡 发送登录请求...');
            
            // 🔧 修复：使用Utils.getApiUrl()
            const response = await fetch(Utils.getApiUrl(CONFIG.API.AUTH.LOGIN), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            
            const data = await response.json();
            
            console.log('📥 收到响应:', response.status);
            
            if (!response.ok) {
                // 处理错误响应
                const errorMsg = data.detail?.error || data.detail || '登录失败，请检查邮箱和密码';
                throw new Error(errorMsg);
            }
            
            console.log('✅ 登录成功');
            
            // 登录成功
            handleLoginSuccess(data, email, remember);
            
        } catch (error) {
            console.error('❌ 登录失败:', error);
            showError(error.message || '登录失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    });
}

/**
 * 处理登录成功
 * 🔧 修复：添加防循环机制，确保localStorage写入完成
 */
function handleLoginSuccess(data, email, remember) {
    console.log('💾 保存登录信息...');
    
    // 🔧 修复：使用Utils.setToken()
    Utils.setToken(data.access_token);
    
    // 保存用户信息
    if (data.user) {
        // 🔧 修复：使用Utils.setUser()
        Utils.setUser(data.user);
    }
    
    // 记住邮箱
    if (remember) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.REMEMBER, email);
    } else {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER);
    }
    
    // 🔧 关键修复：设置标记，告诉admin.html刚刚登录成功
    sessionStorage.setItem('justLoggedIn', 'true');
    // 清除重定向计数
    sessionStorage.removeItem('loginRedirectCount');
    sessionStorage.removeItem('redirectCount');
    
    console.log('✅ 信息保存完成');
    
    // 显示成功消息
    showSuccess();
    
    // 🔧 关键修复：使用Promise确保localStorage写入完成后再跳转
    // 特别是Safari需要更多时间
    console.log('⏳ 等待存储完成...');
    
    Promise.resolve().then(() => {
        // 等待一个宏任务，确保所有localStorage操作完成
        setTimeout(() => {
            // 再次验证token是否写入成功
            const savedToken = Utils.getToken();
            
            console.log('🔍 验证token:', savedToken ? '存在' : '不存在');
            
            if (savedToken) {
                console.log('✅ Token已保存，准备跳转');
                window.location.href = 'admin.html';
            } else {
                // 如果token没保存成功，再试一次
                console.warn('⚠️ Token保存失败，重试...');
                Utils.setToken(data.access_token);
                setTimeout(() => {
                    const retryToken = Utils.getToken();
                    console.log('🔍 重试后token:', retryToken ? '存在' : '不存在');
                    if (retryToken) {
                        window.location.href = 'admin.html';
                    } else {
                        showError('登录信息保存失败，请重试');
                        setLoading(false);
                    }
                }, 200);
            }
        }, 350); // 增加延迟时间到350ms，Safari需要更多时间
    });
}

/**
 * 初始化密码显示/隐藏切换
 */
function initPasswordToggle() {
    const toggleBtn = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const eyeOpen = toggleBtn.querySelector('.eye-open');
    const eyeClosed = toggleBtn.querySelector('.eye-closed');
    
    toggleBtn.addEventListener('click', function() {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        eyeOpen.classList.toggle('hidden', !isPassword);
        eyeClosed.classList.toggle('hidden', isPassword);
    });
}

/**
 * 加载记住的邮箱
 */
function loadRememberedEmail() {
    const rememberedEmail = localStorage.getItem(CONFIG.STORAGE_KEYS.REMEMBER);
    if (rememberedEmail) {
        document.getElementById('email').value = rememberedEmail;
        document.getElementById('remember').checked = true;
    }
}

/**
 * 显示错误消息
 */
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.querySelector('span').textContent = message;
    errorElement.classList.remove('hidden');
}

/**
 * 隐藏错误消息
 */
function hideError() {
    const errorElement = document.getElementById('errorMessage');
    errorElement.classList.add('hidden');
}

/**
 * 显示成功状态
 */
function showSuccess() {
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.style.background = 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)';
    loginBtn.querySelector('.btn-text').textContent = '登录成功！';
}

/**
 * 设置加载状态
 */
function setLoading(loading) {
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    
    loginBtn.disabled = loading;
    
    if (loading) {
        loginBtn.classList.add('loading');
        btnLoader.classList.remove('hidden');
    } else {
        loginBtn.classList.remove('loading');
        btnLoader.classList.add('hidden');
    }
}

/**
 * 验证邮箱格式
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}