# 部署说明

## 🚀 快速部署（推荐）

### 1. 在服务器上克隆仓库

```bash
# SSH 登录服务器
ssh root@你的服务器IP

# 克隆仓库到服务器
cd /opt
git clone https://github.com/Getxun/c-aihuabu.git
cd c-aihuabu

# 创建数据目录
mkdir -p data/account data/uploads
```

### 2. 配置环境变量（可选）

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
vi .env

# 主要配置项：
# C_AI_PUBLIC_BASE_URL=https://ai.k99.tw  # 你的域名
# C_AI_HOST_PORT=3300                      # 主机端口
```

### 3. 启动服务

```bash
# 拉取最新镜像
docker compose pull

# 启动容器
docker compose up -d

# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f --tail=50
```

### 4. 访问网站

浏览器访问：`https://ai.k99.tw`

---

## 🔄 更新部署

当 GitHub 有新代码提交时：

```bash
# 在服务器上执行
cd /opt/c-aihuabu

# 拉取最新镜像
docker compose pull

# 重启容器
docker compose up -d --force-recreate

# 查看状态
docker compose ps

# 清理旧镜像（可选）
docker image prune -f
```

---

## 📁 目录结构

```
/opt/c-aihuabu/
├── docker-compose.yml       ← 生产环境配置（使用远程镜像）
├── docker-compose.local.yml ← 本地开发配置（本地构建）
├── docker-compose.prod.yml  ← 备用生产配置
├── data/
│   ├── account/            ← 账号数据
│   └── uploads/            ← 上传文件
└── web/                    ← 源代码
```

---

## 🔧 配置说明

### docker-compose.yml（生产环境）

```yaml
services:
  app:
    image: ghcr.io/getxun/c-aihuabu:latest  # 使用 GitHub 构建的镜像
    container_name: infinite-canvas
    ports:
      - "${C_AI_HOST_PORT:-3000}:3000"
    environment:
      C_AI_PUBLIC_BASE_URL: "${C_AI_PUBLIC_BASE_URL:-}"
    volumes:
      - ./data/account:/app/web/data/account
      - ./data/uploads:/app/web/data/uploads
    restart: unless-stopped
```

**优势：**
- ✅ 直接拉取 GitHub 构建的镜像
- ✅ 无需本地构建，节省服务器资源
- ✅ 更新快速，只需 `docker compose pull`

---

## 🐳 镜像说明

### 镜像地址
```
ghcr.io/getxun/c-aihuabu:latest
```

### 自动构建
- 每次推送代码到 `main` 分支，GitHub Actions 自动构建
- 构建时间约 5-10 分钟
- 查看构建状态：https://github.com/Getxun/c-aihuabu/actions

---

## 🛠️ 本地开发

如果需要在本地开发和测试：

```bash
# 使用本地构建配置
docker compose -f docker-compose.local.yml up -d --build

# 或者直接本地运行
cd web
bun install
bun run dev
```

访问：`http://localhost:3000`

---

## 🔍 故障排查

### 容器无法启动

```bash
# 查看日志
docker compose logs -f

# 检查端口占用
netstat -tlnp | grep 3000

# 重新构建
docker compose up -d --force-recreate
```

### 镜像拉取失败

```bash
# 手动拉取镜像
docker pull ghcr.io/getxun/c-aihuabu:latest

# 如果 ghcr.io 访问有问题，可以配置镜像加速
# 或者使用 docker-compose.local.yml 本地构建
docker compose -f docker-compose.local.yml up -d --build
```

### 数据丢失

```bash
# 数据持久化在 data/ 目录
# 定期备份
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

---

## 📝 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `C_AI_PUBLIC_BASE_URL` | 空 | 公网访问地址（用于视频上传） |
| `C_AI_HOST_PORT` | 3000 | 主机端口映射 |
| `AI_HUABU_DATA_DIR` | `/app/web/data/account` | 账号数据目录 |
| `C_AI_NEWTOKEN_MEDIA_UPLOAD_URL` | aimh8.com接口 | NewToken 媒体上传地址 |
| `C_AI_NEWTOKEN_MEDIA_UPLOAD_KEY` | 空 | NewToken 上传密钥 |

---

## 📞 支持

- GitHub Issues: https://github.com/Getxun/c-aihuabu/issues
- 原项目：https://github.com/cangerx/c-aihuabu
