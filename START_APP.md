# 🚀 NeurallEmpire Startup Guide

## ✅ Configuration Fixed!

I've fixed the following configuration issues:
1. ✅ Frontend API URL now points to `http://localhost:3001` (local backend)
2. ✅ Backend CORS now allows `http://localhost:3000` (Vite dev server)

## 📋 Prerequisites Check

Before starting, make sure you have:
- [ ] Node.js 20+ installed (`node --version`)
- [ ] PostgreSQL database running (Supabase configured)
- [ ] npm installed (`npm --version`)

## 🎯 Quick Start (Choose One Method)

### Method 1: Start Both Servers at Once (Recommended)
```bash
cd /Users/sandeepramdaz/NeurallEmpire
npm run dev
```

This will start:
- Backend on http://localhost:3001
- Frontend on http://localhost:3000

### Method 2: Start Servers Separately
Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd /Users/sandeepramdaz/NeurallEmpire/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/sandeepramdaz/NeurallEmpire/frontend
npm run dev
```

## 🗄️ Database Setup (If Not Done)

If you haven't set up the database yet:

```bash
cd /Users/sandeepramdaz/NeurallEmpire/backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"
**Solution:** Check your `DATABASE_URL` in `backend/.env`
```bash
cd /Users/sandeepramdaz/NeurallEmpire/backend
cat .env | grep DATABASE_URL
```

### Issue: "Port already in use"
**Solution:** Kill the process using the port
```bash
# For port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# For port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Issue: "Module not found"
**Solution:** Reinstall dependencies
```bash
cd /Users/sandeepramdaz/NeurallEmpire
npm run install:all
```

### Issue: "Prisma Client not generated"
**Solution:** Generate Prisma client
```bash
cd /Users/sandeepramdaz/NeurallEmpire/backend
npx prisma generate
```

## 🌐 Access URLs

Once running, you can access:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **Prisma Studio:** http://localhost:5555 (if running `npx prisma studio`)

## 🧪 Test Credentials (From README)
```
Email: testuser@testempire.com
Password: TestUser123!
Organization: test-empire
```

## 📊 Check if Everything is Working

1. Backend health check:
```bash
curl http://localhost:3001/health
```

2. Open browser to http://localhost:3000
3. Try to register or login

## 🎨 Development Tips

- Backend auto-restarts on file changes (using `tsx watch`)
- Frontend hot-reloads on file changes (Vite HMR)
- Check console logs in both terminal windows for errors
- Use browser DevTools Console for frontend errors

## 📝 Common Commands

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev

# Build for production
npm run build

# Run tests
npm test

# View database
cd backend && npx prisma studio

# Reset database (⚠️ Deletes all data)
cd backend && npx prisma migrate reset
```

## 🆘 Still Having Issues?

1. Check both terminal windows for error messages
2. Verify database connection is working
3. Make sure ports 3000 and 3001 are not in use
4. Try clearing node_modules and reinstalling:
```bash
cd /Users/sandeepramdaz/NeurallEmpire
npm run clean
npm run install:all
```

## 🎉 Success Indicators

You'll know it's working when you see:
- ✅ Backend: "Server is running on port 3001"
- ✅ Frontend: "VITE v5.x.x ready in xxx ms"
- ✅ Frontend: "Local: http://localhost:3000/"
- ✅ No error messages in either terminal

---

**Ready to start building AI agents! 🧠👑**
