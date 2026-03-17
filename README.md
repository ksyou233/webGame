# Foxy Survival (HTML/CSS/JS + FastAPI + PostgreSQL + Docker)

一个使用你提供素材制作的像素风生存射击 Web 游戏。

## 功能

- 原生 Canvas 2D 游戏循环
- 狐狸玩家移动、射击、受伤与死亡结算
- 史莱姆追踪生成、击杀动画
- BGM 与射击/死亡/结束音效
- FastAPI 排行榜接口
- PostgreSQL 持久化成绩
- Docker Compose 一键启动

## 目录

- `frontend/` 前端页面与游戏逻辑
- `backend/` FastAPI 服务
- `docker-compose.yml` 前后端和数据库编排
- `.env.example` 环境变量模板
- `AssetBundle/` 原始素材（你提供）

## 快速启动

1. 复制环境变量文件

```powershell
Copy-Item .env.example .env
```

2. 构建并启动

```powershell
docker compose up -d --build
```

3. 打开游戏

- 浏览器访问: `http://localhost:8080`

## 常用命令

- 查看日志

```powershell
docker compose logs -f frontend
docker compose logs -f backend
```

- 停止服务

```powershell
docker compose down
```

- 连同数据库数据一起清理

```powershell
docker compose down -v
```

## API

- `GET /api/health`
- `GET /api/scores/top?limit=10`
- `POST /api/scores`

提交示例:

```json
{
  "player_name": "FoxyPlayer",
  "score": 120,
  "survived_seconds": 78
}
```

## 操作说明

- 桌面端
  - `W A S D` 移动
  - 鼠标移动瞄准
  - 鼠标点击或空格射击
- 移动端
  - 使用方向键与 `SHOOT` 按钮

## 说明

- 排行榜走 `/api` 反向代理到 FastAPI
- 前端资源来自 `AssetBundle`，已复制到 `frontend/assets`

## Itch.io 发布说明

Itch.io 的 HTML 页面通常是固定画布尺寸，不能只依赖页面宽度判断是否显示移动端控件。
本项目已支持以下策略：

- 触屏设备自动启用移动端控件（双摇杆和技能键）
- 可通过 `?mobile=1` 强制启用移动端控件

例如：

```text
https://your-itch-page-url/?mobile=1
```

### 连接后端服务

Itch.io 只能托管静态文件，`/api` 代理不可用。需要把后端单独部署（Render/Railway/Fly.io/云服务器），然后在 `frontend/config.js` 中配置：

```javascript
window.GAME_API_BASE = "https://your-backend.example.com";
```

也可通过 URL 临时覆盖：

```text
https://your-itch-page-url/?api=https://your-backend.example.com
```

### CORS 设置

后端需要允许 Itch 页面来源（origin），例如：

```text
https://yourname.itch.io
https://html-classic.itch.zone
```

在后端环境变量里设置 `CORS_ORIGINS`（多个用逗号分隔）。
