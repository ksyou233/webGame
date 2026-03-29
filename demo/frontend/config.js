// 作用：为 demo 前端提供可覆盖的后端地址配置。
// 使用方法：本地默认留空走 /api；部署到静态托管时可改为完整后端 URL。
// 输入输出：输入为全局变量配置，输出为 app.js 读取的 API_BASE。
window.DEMO_GAME_API_BASE = window.DEMO_GAME_API_BASE || "";
