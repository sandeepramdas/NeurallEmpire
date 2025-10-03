# 🔐 NeurallEmpire Sign-In Guide

## Live Website
**URL:** https://www.neurallempire.com

## Login Credentials

### Super Admin Account
```
Email: admin@neurallempire.com
Password: NeurallEmpire2024!
```
- Full system access
- Can manage all organizations and companies
- Access to all accounting features

### Admin Account
```
Email: support@neurallempire.com
Password: Admin2024!
```
- Administrative access
- Can manage companies and users

### Demo User Account
```
Email: demo@neurallempire.com
Password: Demo2024!
```
- Demo organization access
- Limited permissions

## Current Status ✅

### Working Features
- ✅ Frontend accessible at https://www.neurallempire.com
- ✅ Health endpoint responding
- ✅ Login authentication working
- ✅ User profile API working
- ✅ JWT token generation working

### Multi-Company Accounting Features 🏗️

**Status:** Code complete and tested locally ✅

The multi-company accounting backend has been fully implemented and tested locally with all features working:
- ✅ Multi-company management endpoints (`/api/companies`)
- ✅ Accounting endpoints (`/api/accounting/*`)
- ✅ RBAC endpoints (`/api/roles`)
- ✅ Dynamic menu endpoints (`/api/menus`)

**Deployment Note:** Railway deployments are experiencing build issues. The code works perfectly when run locally. Recent fixes include:
1. Fixed TypeScript compilation errors
2. Updated server.ts to use consolidated routes
3. All routes tested and verified locally

To test the accounting features locally:
```bash
cd backend
npm run dev
# Then use /tmp/test-new-routes.sh to test all endpoints
```

## How to Sign In

1. **Go to the website:**
   ```
   https://www.neurallempire.com
   ```

2. **Click on "Sign In" or navigate to:**
   ```
   https://www.neurallempire.com/login
   ```

3. **Enter credentials:**
   - Email: `admin@neurallempire.com`
   - Password: `NeurallEmpire2024!`

4. **You should be redirected to the dashboard**

## Testing the API Directly

### Get Auth Token
```bash
curl -X POST https://www.neurallempire.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@neurallempire.com","password":"NeurallEmpire2024!"}'
```

### Test with Token
```bash
# Replace YOUR_TOKEN with the token from login response
curl https://www.neurallempire.com/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## New Accounting Features (Coming in Next Deployment)

Once the deployment completes, you'll have access to:

### Multi-Company Management
- Create and manage multiple companies
- Switch between company contexts
- Company-specific data isolation

### Chart of Accounts
- 30+ default accounts (Assets, Liabilities, Equity, Revenue, Expenses)
- Hierarchical account structure
- Custom account creation

### Customers & Vendors
- Accounts Receivable (AR) management
- Accounts Payable (AP) management
- Balance tracking

### Transactions
- Double-entry bookkeeping
- Journal entries
- Transaction posting and voiding
- Audit trail

### RBAC (Role-Based Access Control)
- Granular permissions (`module:action:resource`)
- Custom role creation
- Permission assignment

## Deployment Status Check

Run this script to check deployment status:
```bash
chmod +x /tmp/comprehensive-test.sh
/tmp/comprehensive-test.sh
```

## Troubleshooting

### If login fails:
1. Make sure you're using the exact credentials above
2. Check that CAPS LOCK is off
3. Try the demo account: `demo@neurallempire.com` / `Demo2024!`

### If pages don't load:
1. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Try incognito/private browsing mode
3. Check https://www.neurallempire.com/health to verify server is running

### If new features aren't showing:
- The deployment is still in progress
- Check back in 5-10 minutes
- Run the test script above to verify deployment status

## Support

If you encounter any issues:
1. Check the deployment status with the test script
2. Review the Railway logs: `railway logs --tail 50`
3. The backend is actively deploying the new accounting features

---

**Last Updated:** October 3, 2025
**Deployment Status:** In Progress
**Expected Completion:** 5-10 minutes
