# 作用：构建 demo 后端容器镜像。
# 使用方法：由 demo/docker-compose.yml 的 backend 服务调用构建。
# 输入输出：输入为 backend 目录源码，输出为可运行 FastAPI 的镜像。
FROM python:3.12-slim

# 作用：避免 Python 在容器内写 pyc 并强制无缓冲输出，便于日志排障。
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 作用：先安装依赖以利用 Docker 层缓存，加速重复构建。
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 作用：复制 demo 后端代码到镜像中。
COPY app ./app

# 作用：暴露 FastAPI 默认端口。
EXPOSE 8000

# 作用：启动后端 HTTP 服务。
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
