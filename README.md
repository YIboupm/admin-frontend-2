# LingualAudio 管理员后台

一个现代化的管理员前端系统，用于管理西班牙语学习平台的各类内容。

## 📁 项目结构

```
admin-frontend/
├── login.html          # 登录页面
├── admin.html          # 管理后台主页面
├── css/
│   ├── login.css       # 登录页样式
│   └── admin.css       # 后台主样式
└── js/
    ├── config.js       # 全局配置（API地址、常量等）
    ├── login.js        # 登录逻辑
    ├── admin.js        # 后台主逻辑
    └── writing.js      # 写作任务管理模块
```

## 🚀 快速开始

### 1. 配置 API 地址

编辑 `js/config.js` 文件，修改 `API_BASE_URL` 为你的后端地址：

```javascript
const CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:8000',  // 修改为实际的后端地址
    // ...
};
```

### 2. 部署方式

#### 方式一：直接使用
将整个 `admin-frontend` 文件夹放到任意 Web 服务器（Nginx、Apache 等）中即可访问。

#### 方式二：使用 Python 快速启动
```bash
cd admin-frontend
python -m http.server 3000
```
然后访问 `http://localhost:3000/login.html`

#### 方式三：使用 VS Code Live Server
安装 Live Server 插件后，右键 `login.html` 选择 "Open with Live Server"

## 🔐 登录说明

- 系统需要管理员权限才能访问
- 登录后 Token 存储在 localStorage 中
- 支持"记住登录"功能

## 📋 功能模块

### ✅ 已完成

1. **登录系统**
   - 邮箱/密码登录
   - 记住登录状态
   - Token 自动刷新

2. **写作任务管理**
   - 任务列表（分页、筛选、搜索）
   - 新建/编辑/删除任务
   - 支持 DELE/SIELE 两种考试类型
   - 支持 A1-C2 各级别
   - 富文本字段（HTML）

### 🔜 待扩展

- 阅读材料管理
- 故事管理
- 旅游地点管理
- 国家/城市管理

## 🛠 扩展新模块

### 添加新页面

1. 在 `admin.html` 中添加导航项：
```html
<a href="#newmodule" class="nav-item" data-page="newmodule">
    <svg>...</svg>
    <span>新模块</span>
</a>
```

2. 添加页面内容区：
```html
<section class="page-content" id="page-newmodule">
    <!-- 页面内容 -->
</section>
```

3. 创建新的 JS 文件 `js/newmodule.js`

4. 在 `admin.html` 底部引入：
```html
<script src="js/newmodule.js"></script>
```

5. 在 `admin.js` 的 `onPageLoad` 函数中添加初始化调用

### API 配置

在 `js/config.js` 的 `CONFIG.API` 中添加新模块的 API 路径：
```javascript
API: {
    NEWMODULE: {
        LIST: '/newmodule',
        DETAIL: (id) => `/newmodule/${id}`,
    },
}
```

## 🎨 样式定制

### CSS 变量

主要颜色和样式都通过 CSS 变量定义，可在 `css/admin.css` 顶部修改：

```css
:root {
    --color-primary: #1a1a2e;     /* 主色 */
    --color-accent: #e94560;      /* 强调色 */
    --color-success: #27ae60;     /* 成功色 */
    --color-error: #e74c3c;       /* 错误色 */
    /* ... */
}
```

## 📱 响应式设计

- 桌面端：完整侧边栏 + 内容区
- 平板端：可折叠侧边栏
- 移动端：抽屉式侧边栏

## 🔧 后端 API 要求

系统需要后端提供以下 API（参考你的 FastAPI 路由）：

### 认证
- `POST /auth/login` - 登录

### 写作任务
- `GET /writing/tasks` - 获取任务列表
- `POST /writing/tasks` - 创建任务
- `GET /writing/tasks/{id}` - 获取任务详情
- `PUT /writing/tasks/{id}` - 更新任务
- `DELETE /writing/tasks/{id}` - 删除任务

## 📝 注意事项

1. **CORS 配置**：确保后端允许前端域名的跨域请求
2. **Token 过期**：401 响应会自动跳转登录页
3. **浏览器兼容**：支持现代浏览器（Chrome、Firefox、Safari、Edge）

## 🐛 常见问题

### Q: 登录后跳转空白
A: 检查 `config.js` 中的 API 地址是否正确

### Q: 请求返回 401
A: Token 已过期，需要重新登录

### Q: 样式显示异常
A: 确保 Google Fonts 可访问，或替换为本地字体

---

如有问题，请联系开发团队。
