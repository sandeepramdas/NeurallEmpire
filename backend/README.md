# 🚀 NeurallEmpire Backend API

A comprehensive REST API backend for the NeurallEmpire website, built with Node.js, Express, and MongoDB.

## ✅ Features

### 🔐 **Authentication System**
- User registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- Email verification
- Password reset functionality
- Session management
- Role-based access control

### 📊 **User Management**
- Complete user profiles
- Subscription management
- Lead scoring system
- Activity tracking
- Email preferences
- Profile image uploads

### 📬 **Contact Management**
- Contact form submissions
- Lead classification and scoring
- Follow-up scheduling
- Status tracking
- Notes and communication history
- Email integration

### 💳 **Payment Processing**
- Razorpay integration
- Stripe support
- Subscription management
- Invoice generation
- Refund processing
- Revenue analytics

### 📧 **Email Services**
- Welcome emails
- Email verification
- Password reset emails
- Login notifications
- Lead notifications
- Payment confirmations

### 🛡️ **Security Features**
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- SQL injection prevention
- XSS protection

## 🏗️ **Architecture**

```
backend/
├── server.js              # Main application entry point
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variables template
├── config/
│   └── database.js        # Database connection configuration
├── models/
│   ├── User.js            # User data model
│   ├── Contact.js         # Contact form model
│   └── Payment.js         # Payment transaction model
├── routes/
│   ├── auth.js            # Authentication endpoints
│   ├── contact.js         # Contact form endpoints
│   └── payments.js        # Payment processing endpoints
├── middleware/
│   ├── auth.js            # Authentication middleware
│   └── validation.js      # Input validation middleware
├── services/
│   ├── emailService.js    # Email sending service
│   └── paymentService.js  # Payment processing service
└── README.md              # This file
```

## 🚀 **Quick Start**

### **1. Prerequisites**
- Node.js 18+ installed
- MongoDB running locally or cloud instance
- Email service credentials (Gmail, SendGrid, etc.)
- Payment gateway credentials (Razorpay/Stripe)

### **2. Installation**
```bash
cd backend
npm install
```

### **3. Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

### **4. Database Setup**
```bash
# Start MongoDB locally
mongod

# Or use cloud MongoDB (update MONGODB_URI in .env)
```

### **5. Start Development Server**
```bash
npm run dev
```

The API will be available at: `http://localhost:3001`

## 📡 **API Endpoints**

### **Authentication (`/api/auth`)**
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /me` - Get current user profile
- `PUT /profile` - Update user profile
- `PUT /password` - Change password
- `POST /logout` - User logout
- `GET /verify-email/:token` - Verify email address
- `POST /resend-verification` - Resend verification email
- `GET /status` - Check authentication status

### **Contact Forms (`/api/contact`)**
- `POST /` - Submit contact form
- `GET /` - Get all contacts (admin)
- `GET /:id` - Get specific contact
- `PUT /:id` - Update contact status
- `DELETE /:id` - Delete contact
- `POST /:id/notes` - Add note to contact

### **Payments (`/api/payments`)**
- `POST /create-intent` - Create payment intent
- `POST /verify` - Verify payment
- `GET /` - Get user payments
- `GET /:id` - Get specific payment
- `POST /:id/refund` - Process refund
- `GET /stats` - Get revenue statistics

### **Health Check**
- `GET /health` - API health status

## 🔧 **Configuration**

### **Required Environment Variables**

```bash
# Server
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/neurallempire

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="NeurallEmpire <noreply@neurallempire.com>"

# Payment Gateway
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_secret

# Security
BCRYPT_SALT_ROUNDS=12
```

### **Optional Variables**
- `STRIPE_SECRET_KEY` - For Stripe payments
- `CLOUDINARY_*` - For image uploads
- `REDIS_URL` - For session storage
- `LOG_LEVEL` - Logging level

## 📦 **Dependencies**

### **Core Dependencies**
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `cors` - Cross-origin resource sharing
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `express-validator` - Input validation

### **Payment Processing**
- `razorpay` - Razorpay payment gateway
- `stripe` - Stripe payment gateway

### **Email Services**
- `nodemailer` - Email sending
- `@sendgrid/mail` - SendGrid integration

### **Development Tools**
- `nodemon` - Auto-restart during development
- `jest` - Testing framework
- `supertest` - API testing

## 🔄 **Frontend Integration**

### **Update Frontend Configuration**
Replace localStorage calls in your frontend with API calls:

```javascript
// OLD: Frontend localStorage
const users = JSON.parse(localStorage.getItem('neurall_users') || '[]');

// NEW: API call
const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
});
```

### **Authentication Integration**
```javascript
// Login
const loginUser = async (email, password) => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
        localStorage.setItem('token', data.data.token);
        return data.data.user;
    }

    throw new Error(data.error);
};

// Authenticated requests
const makeAuthRequest = async (url, options = {}) => {
    const token = localStorage.getItem('token');

    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
};
```

## 🧪 **Testing**

### **Run Tests**
```bash
npm test
```

### **API Testing with curl**
```bash
# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"Password123!"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Password123!"}'

# Get profile (with token)
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚀 **Deployment Options**

### **1. Heroku Deployment**
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create neurallempire-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret

# Deploy
git push heroku main
```

### **2. DigitalOcean App Platform**
```yaml
# app.yaml
name: neurallempire-api
services:
- name: api
  source_dir: /backend
  github:
    repo: your-username/NeurallEmpire
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: MONGODB_URI
    value: ${DATABASE_URL}
```

### **3. Railway Deployment**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### **4. AWS EC2 with PM2**
```bash
# On EC2 instance
sudo apt update
sudo apt install nodejs npm mongodb

# Clone and setup
git clone your-repo
cd backend
npm install
npm install -g pm2

# Start with PM2
pm2 start server.js --name "neurallempire-api"
pm2 startup
pm2 save
```

## 📊 **Monitoring & Logs**

### **Application Monitoring**
- Health check endpoint: `/health`
- Error logging with Winston
- Performance monitoring with New Relic
- Uptime monitoring with Pingdom

### **Database Monitoring**
- MongoDB Atlas monitoring
- Connection pool monitoring
- Query performance analysis

## 🔒 **Security Best Practices**

### **Implemented Security Measures**
- Rate limiting on all endpoints
- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Security headers with Helmet
- Environment variable security

### **Additional Recommendations**
- Enable MongoDB authentication
- Use HTTPS in production
- Implement 2FA for admin accounts
- Regular security audits
- Database encryption at rest
- API request logging

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Submit a Pull Request

## 📞 **Support**

- **Email**: sandeepramdaz@neurallempire.com
- **Documentation**: API documentation available at `/api`
- **Issues**: Report bugs via GitHub issues

---

**🚀 Ready to power your empire with this robust backend infrastructure!**