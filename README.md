# Wallet Backend API

A secure REST API for managing user wallets with authentication.

## Features

- User registration and authentication
- JWT-based authorization
- Wallet creation and management
- Add/subtract money operations
- Balance inquiry
- PostgreSQL database with transactions

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and JWT secret
   ```

3. **Database Setup**
   - Create a PostgreSQL database
   - Run the migration script:
   ```bash
   psql -U postgres -d wallet_app -f migrations/init.sql
   ```

4. **Start the Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```
Returns JWT token for authenticated requests.

### Wallet Operations (Requires Authentication)

All wallet endpoints require `Authorization: Bearer <token>` header.

#### Create Wallet
```http
POST /api/wallet
Authorization: Bearer <token>
```

#### Get Wallet Details
```http
GET /api/wallet
Authorization: Bearer <token>
```

#### Get Balance Only
```http
GET /api/wallet/balance
Authorization: Bearer <token>
```

#### Add Money
```http
POST /api/wallet/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100.50
}
```

#### Subtract Money
```http
POST /api/wallet/subtract
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50.25
}
```

### Health Check
```http
GET /health
```

## Database Schema

### Users Table
- `id` (Primary Key)
- `email` (Unique)
- `password_hash`
- `created_at`

### Wallets Table
- `id` (Primary Key)
- `user_id` (Foreign Key to users.id)
- `balance` (Decimal)
- `created_at`
- `updated_at`

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- CORS protection
- Helmet security headers
- Input validation
- SQL injection protection

## Error Handling

The API returns appropriate HTTP status codes and error messages:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (expired token)
- `404` - Not Found
- `500` - Internal Server Error
