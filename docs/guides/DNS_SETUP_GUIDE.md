# 🌐 NeurallEmpire DNS Configuration Guide

## Current Status (Verified)

### ✅ What's Working:
- **Login API**: Working perfectly (`admin@neurallempire.com`)
- **SSL Certificate**: Valid Google Trust Services certificate
- **CORS Headers**: Present and configured
- **Railway Domain**: `www.neurallempire.com` is configured
- **DNS Resolution**: Cloudflare IPs (104.21.44.23, 172.67.193.246)

### ⚠️ What Needs Fixing:
1. **Apex domain** (`neurallempire.com`) returns 404
2. **Wildcard subdomain** not properly configured for multi-tenancy
3. **CORS wildcard** (`access-control-allow-origin: *`) from Cloudflare

---

## 📋 Step-by-Step DNS Configuration

### Step 1: Clean Up Old DNS Records ✅ (Already Done)

The old GitHub Pages A records have been replaced with Cloudflare IPs.

Current DNS:
```
neurallempire.com → 104.21.44.23, 172.67.193.246 (Cloudflare)
www.neurallempire.com → 104.21.44.23, 172.67.193.246 (Cloudflare)
*.neurallempire.com → 104.21.44.23, 172.67.193.246 (Cloudflare)
```

### Step 2: Configure Railway Custom Domains

**Railway already has:**
- ✅ `www.neurallempire.com` (working)
- ❓ Need to add: `neurallempire.com` (apex)
- ❓ Need to add: `*.neurallempire.com` (wildcard for multi-tenant)

#### Add Custom Domains to Railway:

```bash
# Add apex domain
railway domain add neurallempire.com

# Add wildcard domain
railway domain add *.neurallempire.com
```

Or via Railway Dashboard:
1. Go to: https://railway.app/project/fa6214c1-48ed-4944-a0d0-318aaf399a83
2. Click on **NeurallEmpire** service
3. Go to **Settings** → **Domains**
4. Click **+ Custom Domain**
5. Add:
   - `neurallempire.com`
   - `*.neurallempire.com`

### Step 3: Update Cloudflare DNS Records

**Current Records to Keep:**
- ✅ `CNAME www → ff0f0dsk.up.railway.app` (Proxied)

**Records to Update/Add:**

1. **Apex Domain (neurallempire.com):**
   ```
   Type: CNAME
   Name: @ (or neurallempire.com)
   Target: ff0f0dsk.up.railway.app
   Proxy: Enabled (Orange cloud)
   TTL: Auto
   ```

2. **Wildcard Subdomain (*.neurallempire.com):**
   ```
   Type: CNAME
   Name: *
   Target: ff0f0dsk.up.railway.app (change from www.neurallempire.com)
   Proxy: Enabled (Orange cloud)
   TTL: Auto
   ```

### Step 4: Fix CORS Wildcard Header (Optional)

To remove `access-control-allow-origin: *` from Cloudflare:

1. Go to Cloudflare Dashboard
2. Navigate to: **Rules** → **Transform Rules** → **Modify Response Header**
3. Click **Create rule**
4. Configure:
   - **Rule name**: Remove CORS Wildcard
   - **If**: Hostname matches `*.neurallempire.com`
   - **Then**: Remove header `access-control-allow-origin`
5. Save and deploy

**Note:** Your Express CORS is already configured correctly. This step just removes Cloudflare's override.

---

## 🧪 Testing After DNS Changes

### Run Verification Script:
```bash
./verify-dns.sh
```

### Manual Tests:

1. **Test Apex Domain:**
   ```bash
   curl https://neurallempire.com/health
   # Should return: {"status":"OK",...}
   ```

2. **Test WWW:**
   ```bash
   curl https://www.neurallempire.com/health
   # Should return: {"status":"OK",...}
   ```

3. **Test Wildcard (Multi-tenant):**
   ```bash
   curl https://test-org.neurallempire.com/health
   # Should return: {"status":"OK",...}
   ```

4. **Test Login:**
   ```bash
   curl -X POST https://www.neurallempire.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@neurallempire.com","password":"NeurallEmpire2024!"}'
   # Should return: {"success":true,...}
   ```

---

## 🎯 Final DNS Configuration

### Cloudflare DNS Records:

| Type | Name | Target | Proxy | TTL |
|------|------|--------|-------|-----|
| CNAME | @ | ff0f0dsk.up.railway.app | ✅ Proxied | Auto |
| CNAME | www | ff0f0dsk.up.railway.app | ✅ Proxied | Auto |
| CNAME | * | ff0f0dsk.up.railway.app | ✅ Proxied | Auto |

### Railway Custom Domains:

- `www.neurallempire.com` ✅
- `neurallempire.com` ⬅️ Add this
- `*.neurallempire.com` ⬅️ Add this

---

## 🔧 Troubleshooting

### Issue: "404 Not Found" on apex domain
**Solution:** Add `neurallempire.com` to Railway custom domains

### Issue: "Wildcard subdomain not working"
**Solution:**
1. Add `*.neurallempire.com` to Railway
2. Update Cloudflare CNAME `*` to point to Railway

### Issue: "SSL Certificate Error"
**Solution:** Cloudflare proxy must be enabled (orange cloud)

### Issue: "CORS errors in browser"
**Solution:**
1. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
2. Try incognito/private window
3. Check browser console for actual error

---

## 📞 Railway CLI Commands

```bash
# View current domains
railway domain

# Add custom domain
railway domain add neurallempire.com
railway domain add *.neurallempire.com

# View deployment status
railway status

# View logs
railway logs
```

---

## ✅ Verification Checklist

- [ ] Apex domain added to Railway
- [ ] Wildcard domain added to Railway
- [ ] Cloudflare DNS updated (CNAME records)
- [ ] DNS propagation complete (can take 5-30 minutes)
- [ ] All domains return 200 OK on `/health`
- [ ] Login works on all domains
- [ ] Multi-tenant subdomains work (e.g., `acme.neurallempire.com`)

---

**Last Updated:** 2025-10-01
**Verified By:** Claude Code
