# 作用：构建 demo 前端静态站点镜像。
# 使用方法：由 demo/docker-compose.yml 的 frontend 服务调用构建。
# 输入输出：输入为 frontend 目录文件，输出为可提供静态资源与反向代理的 Nginx 镜像。
FROM nginx:1.27-alpine

# 作用：复制前端页面与资源文件到 Nginx 默认静态目录。
COPY . /usr/share/nginx/html

# 作用：覆盖 Nginx 默认站点配置，新增 /api 反向代理。
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 作用：暴露 HTTP 服务端口。
EXPOSE 80
