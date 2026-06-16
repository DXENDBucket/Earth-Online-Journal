
```markdown
# Earth Online Journal

一个现实任务抽取与记录工具。用户可以发布任务卡、抽取任务、记录完成感受，现在支持账号登录和云端数据同步。

## 技术栈

- 前端：Vue 3 + TypeScript + Vite + Pinia
- 后端：Python FastAPI + SQLite（测试阶段）

## 本地运行

```bash
npm install
npm run dev
```

如果想按 GitHub Pages 的路径本地试用：

```bash
npm run dev:pages
```

发布前预览构建产物：

```bash
npm run preview:pages
```

自动检查 GitHub Pages 路径能否打开：

```bash
npm run test:pages
```

## 后端启动

首次使用需要先启动后端服务：

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

创建 `.env` 文件（可复制 `.env.example`）：

```env
JWT_SECRET=your-secret-key-change-me
```

启动后端：

```bash
uvicorn app.main:app --reload
```

前端默认会连接 `http://127.0.0.1:8000`，如需修改地址，在项目根目录创建 `.env`：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 检查构建

```bash
npm run check
```

## 自动测试

```bash
npm run test:unit
```

`npm run check` 会一起执行类型检查、单元测试和生产构建。

## GitHub Pages 发布

项目使用 GitHub Actions 自动发布，不再把构建产物推到 `gh-pages` 分支。

首次使用时，在 GitHub 仓库中打开：

`Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`

发布前可以在本地跑完整验收：

```bash
npm run deploy
```

之后提交并推送到 `main` 分支，`.github/workflows/deploy.yml` 会自动构建并发布。发布地址通常是：

`https://dxendbucket.github.io/Earth-Online-Journal/`

## 当前数据状态

- 用户账号、任务卡、完成记录：存储在云端数据库中，支持多设备同步
- 偏好设置（轻量模式、抽卡动画、当前卡池）：存在浏览器本地

照片目前以 base64 形式存储在数据库中，适合小范围测试。图片云存储等功能后续再开放。

网页包含基础离线缓存和安装信息。用户在支持 PWA 的浏览器里打开后，可以把它添加到手机桌面或桌面浏览器应用列表。

