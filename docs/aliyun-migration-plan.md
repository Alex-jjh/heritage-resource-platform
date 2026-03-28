# 阿里云迁移 — 完成报告

## 目标架构

所有服务部署在一台阿里云 ECS（ecs.c9i.large, 8 vCPU / 16GB RAM）上：

```
┌─────────────────────────────────────────────────────────┐
│                 阿里云 ECS (ecs.c9i.large)               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Nginx (port 80)                                │    │
│  │  - /api/*          → Spring Boot :8080          │    │
│  │  - /swagger-ui/*   → Spring Boot :8080          │    │
│  │  - /files/uploads/ → /opt/heritage/uploads/     │    │
│  │  - /files/thumbnails/ → /opt/heritage/thumbnails│    │
│  │  - /*              → Next.js :3000              │    │
│  └──────────┬──────────────────┬───────────────────┘    │
│             │                  │                         │
│  ┌──────────▼──────────┐  ┌───▼───────────────────┐    │
│  │  Spring Boot :8080   │  │  Next.js :3000        │    │
│  │  - REST API          │  │  (standalone server)  │    │
│  │  - 本地 JWT 认证      │  │                       │    │
│  │  - 本地文件存储       │  └───────────────────────┘    │
│  │  - Thumbnailator     │                               │
│  └──────────┬───────────┘                               │
│             │                                           │
│  ┌──────────▼──────────┐                                │
│  │  MySQL 8.0           │                                │
│  │  - heritage_db       │                                │
│  └─────────────────────┘                                │
│                                                         │
│  /opt/heritage/uploads/      ← 用户上传文件              │
│  /opt/heritage/thumbnails/   ← 自动生成的缩略图          │
└─────────────────────────────────────────────────────────┘
```

## AWS → 阿里云 服务替换对照

| AWS 服务 | 原用途 | 替换方案 | 状态 |
|---------|--------|---------|------|
| EC2 | Spring Boot + MySQL | 阿里云 ECS | ✅ |
| Cognito | 用户认证 (JWT) | 自建 bcrypt + JJWT | ✅ |
| S3 | 文件存储 (pre-signed URLs) | 本地磁盘 + Nginx 静态托管 | ✅ |
| Lambda | 缩略图生成 | Thumbnailator (Java 库，同进程) | ✅ |
| Amplify | 前端 SSR 托管 | Next.js standalone + Nginx | ✅ |
| CloudFront | HTTPS 代理 | Nginx 反向代理 | ✅ |
| Terraform | 基础设施管理 | 手动配置 / ecs-setup.sh | ✅ |

## 已完成的改动

### Phase 1: 认证系统 ✅

| 改动 | 文件 |
|------|------|
| 新建 JwtService | `service/JwtService.java` — HMAC-SHA256 签发/验证 |
| 新建 JwtAuthFilter | `config/JwtAuthFilter.java` — Bearer token 过滤器 |
| 重写 AuthService | bcrypt 密码 + 本地 JWT，去掉 Cognito SDK |
| 重写 UserService | 去掉 Cognito 同步（updateCognitoRole 等） |
| 统一 SecurityConfig | 去掉 Profile 区分，去掉 OAuth2 Resource Server |
| User 实体 | 加 `passwordHash`，`cognitoSub` 改 nullable |
| Flyway V2 | `password_hash` 列，`cognito_sub` nullable |
| 所有 Service | `findByCognitoSub()` → `findByEmail()` |
| AuthResponse | 简化为 `accessToken` + `expiresIn` |
| 前端 auth-context | 只存 `accessToken` |
| 删除 | AwsCognitoConfig, AwsClientConfig, LocalSecurityConfig, LocalAuthFilter, LocalAuthFilterTest |
| 测试 | 9 个测试文件全部同步更新 |

### Phase 2+3: 文件存储 + 缩略图 ✅

| 改动 | 文件 |
|------|------|
| 重写 FileService | 本地磁盘存储 + Thumbnailator 缩略图 |
| 重写 FileController | multipart upload 替代 pre-signed URL |
| 重写 file-uploader.tsx | FormData 直传替代 S3 三步流程 |
| pom.xml | 去掉 AWS SDK，加 thumbnailator 0.4.20 |
| 删除 | AwsS3Config, ApiKeyAuthFilter, InternalController, S3ServiceException, ThumbnailCallbackRequest, UploadUrlRequest, UploadUrlResponse, CreateFileReferenceRequest |
| 测试 | FileServiceTest 重写，SecurityConfigTest 更新 |

### Phase 4+5+6: 部署 + 配置 + CI/CD ✅

| 改动 | 文件 |
|------|------|
| next.config.ts | `output: "standalone"`，去掉 Amplify rewrites |
| api-client.ts | 修复 token 读取（只读 accessToken） |
| Nginx 配置 | `scripts/nginx-heritage.conf` |
| ECS 部署脚本 | `scripts/ecs-setup.sh` |
| CI/CD | `.github/workflows/deploy-backend.yml` 改为阿里云 ECS |
| yml 配置 | 去掉所有 AWS/Cognito/S3 配置，加 storage + jwt 配置 |

## 已删除的 AWS 相关文件

```
backend/src/main/java/.../config/AwsCognitoConfig.java      ← Cognito 配置
backend/src/main/java/.../config/AwsClientConfig.java        ← Cognito 客户端 Bean
backend/src/main/java/.../config/AwsS3Config.java            ← S3 客户端 Bean
backend/src/main/java/.../config/ApiKeyAuthFilter.java       ← Lambda 内部认证
backend/src/main/java/.../config/LocalSecurityConfig.java    ← 本地 Profile 安全配置
backend/src/main/java/.../config/LocalAuthFilter.java        ← 本地 Mock 认证
backend/src/main/java/.../controller/InternalController.java ← Lambda 回调端点
backend/src/main/java/.../dto/ThumbnailCallbackRequest.java  ← Lambda 回调 DTO
backend/src/main/java/.../dto/UploadUrlRequest.java          ← S3 pre-signed URL DTO
backend/src/main/java/.../dto/UploadUrlResponse.java         ← S3 pre-signed URL DTO
backend/src/main/java/.../dto/CreateFileReferenceRequest.java← S3 文件引用 DTO
backend/src/main/java/.../exception/S3ServiceException.java  ← S3 异常
backend/src/test/.../config/LocalAuthFilterTest.java         ← 已删除的 Filter 测试
```

## 部署步骤

### 首次部署

```bash
# 1. SSH 到阿里云 ECS
ssh user@<ECS_IP>

# 2. 克隆代码
git clone https://github.com/Alex-jjh/heritage-resource-platform.git
cd heritage-resource-platform
git checkout feature/aliyun-migration

# 3. 设置环境变量
export DB_PASSWORD="your-mysql-password"
export JWT_SECRET="your-production-jwt-secret-at-least-256-bits-long!!"
export FRONTEND_ORIGIN="http://<ECS_IP>"

# 4. 运行部署脚本
chmod +x scripts/ecs-setup.sh
bash scripts/ecs-setup.sh
```

### 后续更新

```bash
cd heritage-resource-platform && git pull
cd backend && mvn clean package -DskipTests -q
cp target/heritage-platform-0.0.1-SNAPSHOT.jar /opt/heritage/app/
sudo systemctl restart heritage-backend

cd ../frontend && npm install && npm run build
# 复制 standalone 输出到部署目录
sudo systemctl restart heritage-frontend
```

### GitHub Actions 自动部署

在 GitHub repo Settings → Secrets 中配置：
- `ECS_HOST` — 阿里云 ECS 公网 IP
- `ECS_USERNAME` — SSH 用户名
- `ECS_SSH_KEY` — SSH 私钥

Push 到 `feature/aliyun-migration` 分支自动触发部署。

## 保留的遗留命名

以下字段名保留了 AWS 时代的命名（数据库列名不变，避免 migration 复杂度）：

| 字段 | 位置 | 实际用途 |
|------|------|---------|
| `cognito_sub` | users 表 | 已 nullable，新用户不再使用 |
| `s3_key` | file_references 表 | 存储本地文件路径（如 `resourceId/filename`） |
| `thumbnail_s3_key` | resources 表 | 存储本地缩略图路径 |

## 注意事项

- 用户密码：Cognito 密码无法导出，迁移后需重新注册
- 文件迁移：S3 文件需手动下载到 `/opt/heritage/uploads/`
- `infra/` 和 `lambda/` 目录保留在代码中（AWS 版本参考），不影响阿里云部署
