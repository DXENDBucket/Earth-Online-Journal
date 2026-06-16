# Earth Online Journal

一个现实任务抽取与记录工具。用户可以发布任务卡、抽取任务、记录完成感受，并在浏览器中保存自己的任务进度。

## 本地运行

```bash
npm install
npm run dev
```

## 检查构建

```bash
npm run check
```

## GitHub Pages 发布

项目已经包含 GitHub Pages 工作流：`.github/workflows/deploy.yml`。

首次使用时，在 GitHub 仓库中打开：

`Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`

之后推送到 `main` 分支会自动构建并发布。发布地址通常是：

`https://dxendbucket.github.io/Earth-Online-Journal/`

## 当前数据状态

当前版本的数据保存在用户自己的浏览器里，适合快速上线试用和收集反馈。多人共享任务池、账号登录、图片云存储和管理员审核需要接入后端服务后再开放。
