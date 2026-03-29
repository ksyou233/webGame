# Foxy Survival Demo（独立 demo 目录）

## 目标

本目录是独立最简全栈演示工程：

- 前端：Canvas 可玩 demo（使用本地素材）
- 后端：FastAPI 成绩接口
- 数据库：PostgreSQL 持久化
- 编排：Docker Compose 一键启动

说明：demo 代码只在 demo 目录内部互相调用，不依赖仓库根目录原有运行代码。

## 目录结构

- [docker-compose.yml](docker-compose.yml)：demo 独立编排
- [.env.example](.env.example)：环境变量模板
- [frontend/index.html](frontend/index.html)：页面入口
- [frontend/app.js](frontend/app.js)：玩法与接口调用
- [frontend/style.css](frontend/style.css)：样式
- [frontend/nginx/default.conf](frontend/nginx/default.conf)：前端反向代理
- [backend/app/main.py](backend/app/main.py)：API 入口
- [backend/app/crud.py](backend/app/crud.py)：成绩逻辑
- [backend/app/models.py](backend/app/models.py)：数据库模型

## 快速启动

1. 在 demo 目录准备环境变量

```powershell
Copy-Item .env.example .env
```

2. 启动服务

```powershell
docker compose up -d --build
```

3. 打开页面

- http://localhost:18080

## 验收步骤

1. 点击“开始游戏”，使用 WASD 移动并鼠标左键射击。
2. 血量归零后出现提交卡片，输入昵称并提交。
3. 右侧排行榜出现最新成绩。
4. 运行以下命令确认健康接口：

```powershell
Invoke-RestMethod http://localhost:18080/api/health
```

期望输出：

```json
{"status":"ok"}
```

## 常用命令

查看日志：

```powershell
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f db
```

停止服务：

```powershell
docker compose down
```

停止并清空数据库卷：

```powershell
docker compose down -v
```

## 常见问题

1. `docker compose up` 失败：请先确认 Docker Desktop 已启动。
2. 页面可打开但排行榜失败：检查 backend 日志与 `CORS_ORIGINS`。
3. 后端改完仍旧接口异常：执行 `docker compose up -d --build backend` 重新构建。
