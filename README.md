# FShop Backend

<p align="center">
  <strong>Nền tảng thương mại điện tử hiện đại được xây dựng với NestJS</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20.x-blue?style=flat-square" alt="Node Version" />
  <img src="https://img.shields.io/badge/npm->=10-blue?style=flat-square" alt="npm Version" />
  <img src="https://img.shields.io/badge/NestJS-11.x-red?style=flat-square" alt="NestJS Version" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square" alt="Docker Support" />
  <img src="https://img.shields.io/badge/License-UNLICENSED-lightgrey?style=flat-square" alt="License" />
</p>

---

## 📋 Mục Lục

- [Giới Thiệu](#giới-thiệu)
- [Tính Năng Chính](#tính-năng-chính)
- [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
- [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
- [Khởi Động Nhanh](#khởi-động-nhanh)
- [Cài Đặt Chi Tiết](#cài-đặt-chi-tiết)
- [Biến Môi Trường](#biến-môi-trường)
- [Lệnh Phát Triển](#lệnh-phát-triển)
- [Kiểm Thử](#kiểm-thử)
- [Quản Lý Database](#quản-lý-database)
- [Tài Liệu API](#tài-liệu-api)
- [Các Module Chính](#các-module-chính)
- [Deployment Production](#deployment-production)
- [Xử Lý Sự Cố](#xử-lý-sự-cố)
- [Contributing](#contributing)
- [Tech Stack](#tech-stack)

---

## 🚀 Giới Thiệu

**FShop Backend** là backend mạnh mẽ cho nền tảng thương mại điện tử FShop, được xây dựng bằng [NestJS](https://nestjs.com/) - một framework TypeScript hiện đại và scale được.

Hệ thống được thiết kế để xử lý các tác vụ e-commerce phức tạp including:
- Quản lý đơn hàng & thanh toán
- Quản lý kho hàng & tồn kho
- Xác thực & phân quyền người dùng
- Mua sắm trực tiếp (Live Shopping)
- Hệ thống thông báo real-time
- Chat & hỗ trợ khách hàng
- Tích hợp AI cho chatbot & tìm kiếm
- Upload & xử lý hình ảnh

---

## ✨ Tính Năng Chính

### 🛒 Thương Mại
- **Quản lý sản phẩm**: Catalog đầy đủ với biến thể, giá cả, mô tả chi tiết
- **Quản lý đơn hàng**: Tạo, sửa, hủy, theo dõi trạng thái đơn hàng
- **Giỏ hàng**: Thêm/xóa sản phẩm, cộng tiền, quản lý voucher
- **Mã giảm giá**: Hỗ trợ SHIPPING, FIXED, PERCENT discount types
- **Quản lý kho**: Tồn kho real-time, lịch sử giao dịch hàng
- **Danh mục & thương hiệu**: Phân loại sản phẩm

### 👥 Người Dùng & Xác Thực
- **JWT Authentication**: Token-based authentication
- **Google OAuth 2.0**: Đăng nhập với Google
- **Quản lý hồ sơ**: Cập nhật thông tin cá nhân, quản lý địa chỉ
- **Phân quyền**: Role-based access control (ADMIN, USER, SELLER)

### 💬 Tương Tác Khách Hàng
- **Live Chat**: WebSocket-based real-time messaging
- **Hỗ trợ khách hàng**: Ticket-based support system
- **Thông báo**: Push notifications cho đơn hàng, tin nhắn, updates
- **Review & Đánh giá**: Hệ thống review sản phẩm

### 📺 Mua Sắm Trực Tiếp
- **Live Streaming**: Tích hợp Agora SDK cho live shopping
- **Đơn hàng Live**: Theo dõi đơn hàng từ live stream

### 🤖 Tính Năng AI
- **AI Chatbot**: Hỗ trợ tìm kiếm thông minh
- **Phân tích sentiment**: Phân tích cảm xúc khách hàng
- **Virtual Try-On**: Thử sản phẩm ảo

---

## ⚙️ Yêu Cầu Hệ Thống

### Bắt Buộc
- **Node.js**: >= 20.x
- **npm**: >= 10
- **PostgreSQL**: >= 16

### Tùy Chọn (Khuyến Nghị)
- **Redis**: >= 7.x (để caching & session management)
- **Docker**: >= 24.x (để chạy toàn bộ stack trong containers)
- **Docker Compose**: >= 2.x

### IDE/Editor (Khuyến Nghị)
- Visual Studio Code với extensions:
  - ESLint
  - Prettier
  - Postman (để test API)

---

## 📁 Cấu Trúc Dự Án

```
fshop-be/
├── src/
│   ├── modules/              # 25+ modules chính (Orders, Products, Users, etc.)
│   │   ├── orders/           # Quản lý đơn hàng
│   │   ├── products/         # Quản lý sản phẩm & biến thể
│   │   ├── users/            # Quản lý người dùng
│   │   ├── auth/             # JWT + Google OAuth
│   │   ├── carts/            # Giỏ hàng
│   │   ├── coupons/          # Mã giảm giá
│   │   ├── inventories/      # Quản lý kho
│   │   ├── livestreams/      # Mua sắm trực tiếp
│   │   ├── notifications/    # Thông báo real-time
│   │   ├── chats/            # Chat & hỗ trợ
│   │   ├── ai-chatbot/       # AI chatbot
│   │   ├── reviews/          # Review sản phẩm
│   │   ├── payments/         # Thanh toán
│   │   └── ... (20+ modules khác)
│   ├── configs/              # Cấu hình (database, JWT, Redis)
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── redis.config.ts
│   ├── entities/             # Database schema entities
│   ├── dtos/                 # Data Transfer Objects
│   ├── guards/               # Authentication & authorization guards
│   ├── decorators/           # Custom decorators
│   ├── filters/              # Exception filter
│   ├── interceptors/         # Request/response interceptors
│   ├── middlewares/          # Middleware
│   ├── constants/            # Enums & constants
│   ├── migrations/           # TypeORM migrations
│   ├── seeds/                # Database seeders
│   ├── utils/                # Utility functions
│   ├── app.module.ts         # Root module
│   ├── app.controller.ts     # Root controller
│   ├── app.service.ts        # Root service
│   ├── main.ts               # Application bootstrap
│   └── data-source.ts        # TypeORM data source
├── test/                     # E2E tests
├── dist/                     # Compiled output (generated)
├── docker-compose.yml        # Local development Docker setup
├── Dockerfile                # Production Docker image
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript config
├── nest-cli.json             # NestJS CLI config
├── .eslintrc.js              # ESLint config
├── .prettierrc                # Prettier config
└── README.md                 # File này
```

---

## ⚡ Khởi Động Nhanh

### Tùy Chọn 1: Docker Compose (Khuyến Nghị)

Có thể bắt đầu toàn bộ stack (Backend + PostgreSQL + pgAdmin) với một lệnh duy nhất:

```bash
# Clone repository
git clone <repository-url>
cd fshop-be

# Khởi động toàn bộ services
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f fshop-be
```

**Sau đó, truy cập:**
- Backend API: http://localhost:4000
- API Documentation (Swagger): http://localhost:4000/api/docs
- pgAdmin: http://localhost:5050 (user: admin@admin.com, password: admin)

### Tùy Chọn 2: Cài Đặt Manual (Local Development)

```bash
# 1. Clone & install dependencies
git clone <repository-url>
cd fshop-be
npm install

# 2. Tạo file .env (xem phần Biến Môi Trường)
cp .env.example .env

# 3. Khởi động PostgreSQL (nếu cài trên máy hoặc dùng Docker riêng)
# Đảm bảo PostgreSQL chạy trên localhost:5432

# 4. Chạy migrations
npm run migration:run

# 5. Seed database (tùy chọn)
npm run seed

# 6. Khởi động server (watch mode)
npm run start:dev

# 7. Truy cập API
# API: http://localhost:4000
# Docs: http://localhost:4000/api/docs
```

---

## 📦 Cài Đặt Chi Tiết

### 1. Kiểm Tra Điều Kiện Tiên Quyết

```bash
# Kiểm tra phiên bản Node.js
node --version    # Phải >= 20.0.0

# Kiểm tra phiên bản npm
npm --version     # Phải >= 10

# Kiểm tra PostgreSQL (nếu cài trên máy)
psql --version    # Phải >= 16
```

### 2. Clone Repository & Cài Đặt Dependencies

```bash
# Clone repo
git clone https://github.com/your-org/fshop-be.git
cd fshop-be

# Cài đặt dependencies
npm install

# Kiểm tra cài đặt thành công
npm run lint:check
```

### 3. Cấu Hình Database (Không Dùng Docker)

#### Bước 3a: Tạo file `.env`

Tạo file `.env` ở thư mục gốc project với nội dung:

```env
# Server
NODE_ENV=development
PORT=4000

# Database (PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=username
DATABASE_PASSWORD=123456
DATABASE_NAME=fshop_db

# JWT
JWT_SECRET=your_jwt_secret_key_here_min_32_chars
JWT_ACCESS_EXPIRATION=30d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_REFRESH_EXPIRATION_SECONDS=2592000

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Redis (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email/SMS (Future use)
# SENDGRID_API_KEY=...
# TWILIO_ACCOUNT_SID=...
```

#### Bước 3b: Chuẩn Bị PostgreSQL

```bash
# Khởi động PostgreSQL service
# Trên Windows: Start PostgreSQL from Services hoặc pgAdmin
# Trên Mac: brew services start postgresql
# Trên Linux: sudo systemctl start postgresql

# Tạo database mới (nếu chưa có)
psql -U username -c "CREATE DATABASE fshop_db;"

# Hoặc đăng nhập vào PostgreSQL rồi chạy:
# CREATE DATABASE fshop_db;
```

#### Bước 3c: Chạy Migrations

```bash
# Chạy tất cả migration pending
npm run migration:run

# Kết quả: Database schema sẽ được tạo tự động
```

#### Bước 3d: Seed Database (Tùy Chọn)

```bash
# Nhập dữ liệu mẫu vào database
npm run seed
```

### 4. Cấu Hình Database (Với Docker Compose)

```bash
# File docker-compose.yml có sẵn cấu hình mặc định
# Chỉ cần tạo .env với biến DATABASE_HOST=postgres
# (postgres là tên service trong docker-compose)

# Hoặc copy file .env đã sẵn nếu có trong repo
cp .env.example .env

# Khởi động toàn bộ services
docker-compose up -d

# Kiểm tra services đang chạy
docker-compose ps

# Xem logs
docker-compose logs -f
```

### 5. Xác Minh Cài Đặt

```bash
# Kiểm tra kết nối database
npm run start:dev

# Nếu không có lỗi, server sẽ khởi động successful  
# Kiểm tra: curl http://localhost:4000/api/v1/health
```

---

## 🔧 Biến Môi Trường

### DATABASE Configuration

| Biến | Kiểu | Mặc Định | Mô Tả |
|------|------|---------|-------|
| `DATABASE_HOST` | string | `localhost` | Địa chỉ PostgreSQL server |
| `DATABASE_PORT` | number | `5432` | Cổng PostgreSQL |
| `DATABASE_USER` | string | `username` | Tên đăng nhập PostgreSQL |
| `DATABASE_PASSWORD` | string | `123456` | Mật khẩu PostgreSQL |
| `DATABASE_NAME` | string | `fshop_db` | Tên database |

### SERVER Configuration

| Biến | Kiểu | Mặc Định | Mô Tả |
|------|------|---------|-------|
| `NODE_ENV` | string | `development` | Environment: `development`, `production`, `test` |
| `PORT` | number | `3000` | Cổng server (thường dùng 4000) |

### JWT Configuration

| Biến | Kiểu | Mặc Định | Mô Tả |
|------|------|---------|-------|
| `JWT_SECRET` | string | Required | Secret key để ký JWT tokens (tối thiểu 32 ký tự) |
| `JWT_ACCESS_EXPIRATION` | string | `30d` | Thời gian hết hạn access token |
| `JWT_REFRESH_SECRET` | string | Required | Secret key cho refresh tokens |
| `JWT_REFRESH_EXPIRATION_SECONDS` | number | `2592000` | Thời gian hết hạn refresh token (sec) |

### OAUTH Configuration

| Biến | Kiểu | Mặc Định | Mô Tả |
|------|------|---------|-------|
| `GOOGLE_CLIENT_ID` | string | Required | Google OAuth 2.0 Client ID |

### REDIS Configuration (Optional)

| Biến | Kiểu | Mặc Định | Mô Tả |
|------|------|---------|-------|
| `REDIS_HOST` | string | `localhost` | Địa chỉ Redis server |
| `REDIS_PORT` | number | `6379` | Cổng Redis |
| `REDIS_PASSWORD` | string | - | Mật khẩu Redis (nếu cần) |

### AI Service Configuration (Optional)

| Biến | Kiểu | Mặc Định | Mô Tả |
|------|------|---------|-------|
| `AI_SERVICE_URL` | string | `http://localhost:8000` | URL của AI service dùng cho recommendations và chatbot |
| `AI_SERVER_URL` | string | `http://localhost:8000` | Alias cũ cho AI service URL |
| `AI_RECOMMENDATION_TIMEOUT_MS` | number | `5000` | Thời gian chờ tối đa khi gọi AI recommendation API |

### STORAGE Configuration (Optional)

| Biến | Kiểu | Mô Tả |
|------|------|-------|
| `CLOUDINARY_NAME` | string | Cloudinary account name (cho upload ảnh) |
| `CLOUDINARY_API_KEY` | string | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | string | Cloudinary API secret |
| `MINIO_ENDPOINT` | string | MinIO server endpoint (Storage alternative) |
| `MINIO_ACCESS_KEY` | string | MinIO access key |
| `MINIO_SECRET_KEY` | string | MinIO secret key |

---

## 💻 Lệnh Phát Triển

### Khởi Động Server

| Lệnh | Mô Tả |
|------|-------|
| `npm run start` | Chạy server production mode |
| `npm run start:dev` | Chạy server watch mode (tự restart khi code thay đổi) |
| `npm run start:debug` | Chạy server với debug mode (kết nối VS Code debugger) |
| `npm run start:prod` | Chạy compiled code từ `dist/` (cần build trước) |

### Build & Compilation

| Lệnh | Mô Tả |
|------|-------|
| `npm run build` | Biên dịch TypeScript → dist/ |
| `npm run build:watch` | Biên dịch với watch mode |

### Code Quality

| Lệnh | Mô Tả |
|------|-------|
| `npm run lint` | Kiểm tra & sửa linting issues |
| `npm run lint:check` | Chỉ kiểm tra linting (không sửa) |
| `npm run format` | Format code với Prettier |

---

## 🧪 Kiểm Thử

### Unit Tests

```bash
# Chạy tất cả unit tests
npm run test

# Watch mode (tự chạy lại khi file thay đổi)
npm run test:watch

# Xem độ che phủ test coverage
npm run test:cov

# Debug mode (inspect-brk)
npm run test:debug
```

### E2E Tests

```bash
# Chạy E2E tests
npm run test:e2e

# Xem config E2E: test/jest-e2e.json
```

### Test File Structure

```
test/
├── jest-e2e.json           # E2E Jest config
└── *.e2e-spec.ts           # E2E test files
```

---

## 🗄️ Quản Lý Database

### Migrations

#### Chạy Migrations

```bash
# Chạy tất cả pending migrations
npm run migration:run

# Kết quả: Schema được cập nhật trên database
```

#### Revert Migrations

```bash
# Revert migration cuối cùng
npm run migration:revert

# Lưu ý: Sử dụng cẩn thận, có thể mất dữ liệu
```

#### Tạo Migrations Mới

```bash
# Generate migration tự động (so sánh schema bây giờ vs database)
npm run migration:generate -- -d src/data-source.ts src/migrations/YourMigrationName

# Ví dụ:
npm run migration:generate -- -d src/data-source.ts src/migrations/AddUserPhoneNumber

# Kết quả: File mới được tạo ở src/migrations/
```

#### Tạo Migration Rỗng

```bash
# Tạo file migration template rỗng
npm run migration:create -- -n YourMigrationName

# Sau đó edit file migration để add custom SQL
```

### Seeders

```bash
# Chạy seeder
npm run seed

# File seeder: src/seeds/seed.ts
# Dùng để nhập dữ liệu mẫu (test data, categories, brands, etc.)
```

### Database CLI

```bash
# Chạy TypeORM CLI commands trực tiếp
npm run typeorm -- <command>

# Ví dụ:
npm run typeorm -- schema:sync
npm run typeorm -- query "SELECT * FROM users"
```

---

## 📚 Tài Liệu API

### Swagger UI

FShop Backend tích hợp **Swagger/OpenAPI** để tài liệu và test API interactively.

#### Truy Cập Swagger

- **Development**: http://localhost:4000/api/docs
- **Production**: https://your-api-domain.com/api/docs

#### Tính Năng

✅ Xem tất cả endpoints  
✅ Mô tả request/response schemas  
✅ Test API trực tiếp trong browser  
✅ Xem HTTP status codes & error responses  
✅ Authentication (Bearer token) support  

#### Ví Dụ

```bash
# 1. Khởi động server
npm run start:dev

# 2. Mở browser
# http://localhost:4000/api/docs

# 3. Trong Swagger UI:
# - Chọn endpoint (e.g., POST /orders)
# - Nhấn "Try it out"
# - Input request body
# - Nhấn "Execute" để gửi request
# - Xem response & status code
```

### Base URL

```
http://localhost:4000/api/v1
```

---

## 🔌 Các Module Chính

FShop Backend bao gồm 25+ modules. Dưới đây là các module chính:

### 🛒 Commerce Modules

| Module | Mục Đích |
|--------|----------|
| **orders** | Tạo, sửa, hủy, theo dõi đơn hàng; quản lý trạng thái |
| **products** | Quản lý catalog, biến thể, giá cả, mô tả |
| **carts** | Giỏ hàng: thêm/xóa sản phẩm, tính tiền |
| **coupons** | Mã giảm giá: SHIPPING, FIXED, PERCENT types |
| **inventories** | Quản lý kho, tồn kho, lịch sử giao dịch |
| **categories** | Danh mục sản phẩm |
| **brands** | Thương hiệu sản phẩm |
| **reviews** | Review & đánh giá sản phẩm |

### 👥 User & Auth Modules

| Module | Mục Đích |
|--------|----------|
| **users** | Quản lý hồ sơ người dùng, thông tin cá nhân |
| **auth** | JWT, Google OAuth 2.0, login/register |
| **addresses** | Quản lý địa chỉ giao hàng |

### 💬 Communication Modules

| Module | Mục Đích |
|--------|----------|
| **notifications** | Thông báo real-time (orders, messages, etc.) |
| **chats** | Real-time chat & hỗ trợ khách hàng |
| **posts** | Bài viết blog, tin tức |

### 📺 Live & AI Modules

| Module | Mục Đích |
|--------|----------|
| **livestreams** | Mua sắm trực tiếp, live shopping events |
| **ai-chatbot** | AI-powered chatbot, tìm kiếm thông minh |
| **ai** | AI services (sentiment analysis, virtual try-on, etc.) |

### 🔧 Infrastructure Modules

| Module | Mục Đích |
|--------|----------|
| **payments** | Thanh toán (in development) |
| **cloudinary** | Upload & quản lý ảnh trên Cloudinary |
| **minio** | Upload & storage file với MinIO |
| **dashboard** | Admin dashboard stats |

---

## 🚀 Deployment Production

### Yêu Cầu Production

- ✅ Node.js 20.x LTS
- ✅ PostgreSQL 16+ (production-ready with backups)
- ✅ Redis (recommended for caching & sessions)
- ✅ Reverse proxy (Nginx/HAProxy)
- ✅ SSL/TLS certificates
- ✅ Process manager (PM2, systemd)
- ✅ Monitoring & logging
- ✅ Backup strategy

### Tùy Chọn 1: Docker Deployment

#### Xây Dựng Docker Image

```bash
# Build image
docker build -t fshop-be:1.0.0 .

# Gắn tag
docker tag fshop-be:1.0.0 your-registry/fshop-be:1.0.0

# Push to registry
docker push your-registry/fshop-be:1.0.0
```

#### Chạy Container

```bash
# Chạy container
docker run -d \
  --name fshop-be \
  -p 4000:4000 \
  --env-file .env.production \
  --restart unless-stopped \
  your-registry/fshop-be:1.0.0

# Hoặc dùng docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

#### Kiểm Tra Health

```bash
# Xem logs
docker logs -f fshop-be

# Health check
curl http://localhost:4000/api/v1/health
```

### Tùy Chọn 2: Manual Deployment

#### 1. Prepare Server

```bash
# SSH vào server
ssh user@your-server.com

# Cài Node.js & npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Cài Redis
sudo apt-get install -y redis-server

# Cài Nginx
sudo apt-get install -y nginx
```

#### 2. Clone & Build

```bash
# Clone repository
cd /opt/apps
git clone <repository-url> fshop-be
cd fshop-be

# Cài dependencies
npm install

# Build production
npm run build

# Tạo .env.production
cp .env.example .env.production
# Edit file .env.production với production values
nano .env.production
```

#### 3. Database Setup

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database & user
CREATE USER fshop_user WITH PASSWORD 'strong_password_here';
CREATE DATABASE fshop_production OWNER fshop_user;

# Or use db management tool
```

#### 4. Run Migrations

```bash
# Set NODE_ENV & run migrations
NODE_ENV=production npm run migration:run
```

#### 5. Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start dist/main.js --name "fshop-be" --env production

# Auto restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs fshop-be
```

#### 6. Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/fshop-be

# Add config:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/fshop-be /etc/nginx/sites-enabled/

# Test & restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d your-domain.com

# Auto renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Environment Configuration (Production)

```.env
# Production .env
NODE_ENV=production
PORT=4000

# Secure secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=<very-long-random-string>
JWT_REFRESH_SECRET=<another-very-long-random-string>

# Database (production PostgreSQL)
DATABASE_HOST=your-prod-db.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USER=prod_user
DATABASE_PASSWORD=<strong-password>
DATABASE_NAME=fshop_production

# OAuth
GOOGLE_CLIENT_ID=<production-client-id>

# Redis (production instance)
REDIS_HOST=your-prod-redis.redis.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# File storage (production)
CLOUDINARY_NAME=<account-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

### Monitoring & Logging

```bash
# PM2 Plus (recommended)
pm2 install pm2-auto-pull
pm2 link <PM2 Secret> <PM2 Public>

# Logs
pm2 logs
pm2 logs --err
pm2 save

# Health checks
curl https://your-domain.com/api/v1/health
```

### Backup Strategy

```bash
# Database backup
pg_dump fshop_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup (cron job)
# Add to crontab: 0 2 * * * pg_dump fshop_production > /backups/fshop_$(date +\%Y\%m\%d).sql
```

---

## 🔍 Xử Lý Sự Cố

### Port Đã Được Sử Dụng

**Lỗi**: `EADDRINUSE: address already in use :::4000`

**Giải Pháp**:
```bash
# Tìm process sử dụng port 4000
lsof -i :4000              # Mac/Linux
netstat -ano | findstr :4000  # Windows

# Kill process
kill -9 <PID>              # Mac/Linux
taskkill /PID <PID> /F     # Windows

# Hoặc dùng port khác
PORT=5000 npm run start:dev
```

### Database Connection Failed

**Lỗi**: `FATAL: Ident authentication failed for user "username"`

**Giải Pháp**:
```bash
# 1. Kiểm tra PostgreSQL đang chạy
psql -U username -d fshop_db

# 2. Kiểm tra .env
# DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD đúng?

# 3. Kiểm tra PostgreSQL service
sudo systemctl status postgresql    # Linux
brew services list                 # Mac
```

### JWT Secret Not Set

**Lỗi**: `JWT_SECRET is not set`

**Giải Pháp**:
```bash
# Tạo secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Thêm vào .env
JWT_SECRET=<output-từ-trên>
JWT_REFRESH_SECRET=<generate-another>
```

### Module Not Found Errors

**Lỗi**: `Cannot find module '@modules/orders'`

**Giải Pháp**:
```bash
# Xóa dist/ & node_modules, cài lại
rm -rf dist node_modules
npm install
npm run build

# Hoặc restart dev server
npm run start:dev
```

### Migration Errors

**Lỗi**: `Query runner already released. Cannot run query anymore.`

**Giải Pháp**:
```bash
# Xóa failed migrations, reset database
npm run migration:revert
npm run migration:run

# Hoặc tạo database mới
DROP DATABASE fshop_db;
CREATE DATABASE fshop_db;
npm run migration:run
```

### Swagger UI Not Loading

**Lỗi**: http://localhost:4000/api/docs returns 404

**Giải Pháp**:
```bash
# Kiểm tra server đang chạy
npm run start:dev

# Xác minh app.module.ts có SwaggerModule setup
# Đọc src/main.ts để confirm Swagger routes

# Server có thể mất vài giây để start
# Chờ vài giây rồi refresh page
```

### Docker Container Exits Immediately

**Lỗi**: `docker-compose up` nhưng container exits

**Giải Pháp**:
```bash
# Xem logs để tìm lỗi
docker-compose logs fshop-be

# Kiểm tra .env trong docker-compose.yml
# DATABASE_HOST phải là 'postgres' (tên service)

# Rebuild image
docker-compose down
docker-compose up --build -d
```

### Performance Issues

**Symptoms**: Slow queries, high CPU usage

**Giải Pháp**:
```bash
# 1. Enable query logging
NODE_ENV=development npm run start:dev

# 2. Check logs for slow queries (> 1000ms marked)

# 3. Add database indexes
npm run migration:generate -- -d src/data-source.ts src/migrations/AddIndexes

# 4. Use Redis caching
# Enable REDIS_HOST in .env

# 5. Monitor with PM2
pm2 monit
```

### WebSocket Connection Issues

**Lỗi**: Socket.IO connection timeout

**Giải Pháp**:
```bash
# 1. Kiểm tra WebSocket port (thường là 4000 giống HTTP)

# 2. Kiểm tra firewall cho phép socket connections

# 3. Check browser console for detailed error

# 4. Verify CORS settings trong src/main.ts:
# app.enableCors({
#   origin: true,
#   credentials: true,
# });
```

---

## 🤝 Contributing

### Code Style

Dự án sử dụng **ESLint** + **Prettier** để đảm bảo code consistent.

```bash
# Trước khi commit, chạy:
npm run format    # Format code
npm run lint      # Fix linting issues

# Hoặc cả hai:
npm run format && npm run lint
```

### Development Workflow

```bash
1. Tạo feature branch
   git checkout -b feature/new-feature

2. Cài dependencies (nếu cần)
   npm install

3. Khởi động dev server
   npm run start:dev

4. Viết code (follow NestJS patterns)
   - Controllers ở modules/*/xxx.controller.ts
   - Business logic ở modules/*/xxx.service.ts
   - DTOs cho validation ở dtos/
   - Entities ở entities/

5. Viết tests
   npm run test

6. Format & lint
   npm run format && npm run lint

7. Push branch & create PR
   git add .
   git commit -m "feat: description..."
   git push origin feature/new-feature
```

### Architecture Principles

- **Modularity**: Feature modules tự chứa (controller, service, entity, dto)
- **Separation of Concerns**: Controllers → Services → Repositories
- **Dependency Injection**: Dùng NestJS DI container
- **DTOs for Validation**: Luôn validate input với class-validator
- **Error Handling**: Custom exception filters
- **Logging**: Sử dụng NestJS Logger cho consistent logs

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 20.x |
| **Language** | TypeScript 5.x |
| **Framework** | NestJS 11.x |
| **Database** | PostgreSQL 16 + TypeORM |
| **Cache** | Redis 7.x |
| **Authentication** | JWT + Passport.js + Google OAuth 2.0 |
| **Real-time** | WebSocket (Socket.IO) |
| **API Docs** | Swagger/OpenAPI |
| **File Storage** | Cloudinary + MinIO |
| **Live Streaming** | Agora SDK |
| **Testing** | Jest + Supertest |
| **Code Quality** | ESLint + Prettier |
| **Containerization** | Docker + Docker Compose |
| **Process Management** | PM2 |
| **CI/CD** | Jenkins (Jenkinsfile included) |

---

## 📞 API Endpoint Groups

Base URL: `http://localhost:4000/api/v1`

| Group | Endpoints | Mô Tả |
|-------|-----------|-------|
| `/auth` | POST /register, POST /login, POST /refresh | Xác thực |
| `/users` | GET, POST, PATCH, DELETE /users | Quản lý người dùng |
| `/products` | GET, POST, PATCH, DELETE /products | Quản lý sản phẩm |
| `/orders` | GET, POST, PATCH /orders | Quản lý đơn hàng |
| `/carts` | GET, POST, PATCH /carts | Giỏ hàng |
| `/categories` | GET, POST, PATCH, DELETE /categories | Danh mục |
| `/brands` | GET, POST, PATCH, DELETE /brands | Thương hiệu |
| `/coupons` | GET, POST, PATCH /coupons | Mã giảm giá |
| `/reviews` | GET, POST, PATCH /reviews | Review sản phẩm |
| `/notifications` | GET /notifications | Thông báo |
| `/chats` | GET, POST /chats | Chat & hỗ trợ |
| `/livestreams` | GET, POST /livestreams | Live shopping |
| `/uploads` | POST /cloudinary, POST /minio | Upload ảnh/file |

**Xem đầy đủ API docs tại**: http://localhost:4000/api/docs

---

## ⚠️ Known Limitations & Future Work

### Payment Integration
- ⏳ **Status**: In Progress
- **Current**: Only order note field stores payment method (COD, PayPal, MoMo)
- **Future**: Full payment gateway integration with webhook support

### Email & SMS Notifications
- ⏳ **Status**: In Progress (in-app only currently)
- **Future**: Integrate SendGrid (email) + Twilio (SMS)

### Performance Optimization
- Database indexing strategy review
- Redis caching layer expansion
- GraphQL query optimization layer

---

## 📄 License

UNLICENSED - Dự án này hiện không mở cource theo bất kỳ license nào. Vui lòng liên hệ team để biết thêm chi tiết.

---

## 🔗 Additional Resources

- **NestJS Docs**: https://docs.nestjs.com
- **TypeORM Docs**: https://typeorm.io
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **Docker Docs**: https://docs.docker.com
- **JWT Intro**: https://jwt.io
- **REST API Best Practices**: https://restfulapi.net

---

## 📞 Support

Nếu bạn gặp vấn đề hoặc có câu hỏi:

1. **Kiểm tra phần Xử Lý Sự Cố** ở trên
2. **Tìm kiếm trong Issues** của repository
3. **Tạo Issue mới** với chi tiết:
   - FShop Backend version
   - Node.js version
   - Error message đầy đủ
   - Steps to reproduce

---

**Last Updated**: April 2026  
**Maintained By**: FShop Development Team  
**Version**: 1.0.0
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Hướng dẫn chạy migration

npm run migration:run
npm run migration:revert