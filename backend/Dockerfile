FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 作用：下载并安装官方 Node.js 二进制包（含 npm/npx），避免 apt 安装 npm 依赖链过长。
# 使用方法：镜像构建时自动下载并解压到 /usr/local。
# 输入输出：输入为 Node.js 官方压缩包，输出为可用的 node/npm/npx 命令。
ARG NODE_VERSION=20.18.0
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
	&& rm -rf /var/lib/apt/lists/* \
	&& curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz \
	&& tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
	&& rm -f /tmp/node.tar.xz

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
