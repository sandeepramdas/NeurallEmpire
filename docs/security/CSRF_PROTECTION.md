# CSRF Protection

## Overview

CSRF (Cross-Site Request Forgery) protection is implemented using the `csrf-csrf` package with the double submit cookie pattern.

## Current Status

✅ **Implemented** - CSRF protection is fully implemented but **disabled by default** for backward compatibility.

## How to Enable

### 1. Set Environment Variable

Add to your `.env` file:

```env
ENABLE_CSRF=true
COOKIE_SECRET=your-secure-random-secret-at-least-32-chars
```

**Important**: Generate a strong `COOKIE_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Frontend Integration

#### Get CSRF Token

```javascript
// Get token on page load or before form submission
const response = await fetch('/api/csrf-token', {
  credentials: 'include' // Important for cookies
});
const { csrfToken } = await response.json();
```

#### Include Token in Requests

**Option 1: Header (Recommended)**
```javascript
fetch('/api/protected-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify(data)
});
```

**Option 2: Request Body**
```javascript
fetch('/api/protected-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    ...data,
    csrfToken
  })
});
```

## Protected Methods

CSRF protection applies to:
- POST
- PUT
- PATCH
- DELETE

Safe methods (GET, HEAD, OPTIONS) are **not** protected as they should not cause state changes.

## JWT API Calls

CSRF protection is **automatically skipped** for requests with a valid JWT token in the `Authorization` header:

```javascript
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  method: 'POST',
  body: JSON.stringify(data)
});
```

This allows API clients and mobile apps to work without CSRF tokens.

## Security Features

1. **Double Submit Cookie Pattern**: More secure than synchronizer token
2. **HttpOnly Cookies**: Prevents XSS attacks from stealing tokens
3. **SameSite=Strict**: Prevents cookies from being sent in cross-site requests
4. **Secure Cookies**: In production, cookies are only sent over HTTPS
5. **64-byte Token**: Strong cryptographic randomness

## Error Handling

When CSRF validation fails, the API returns:

```json
{
  "success": false,
  "error": "Invalid CSRF token. Please refresh the page and try again.",
  "code": "CSRF_VALIDATION_FAILED"
}
```

Status code: **403 Forbidden**

## Testing

### Development Mode

CSRF is disabled by default. To test:

```bash
# Enable CSRF
export ENABLE_CSRF=true

# Start server
npm run dev
```

### Production Mode

Always enable CSRF in production:

```env
NODE_ENV=production
ENABLE_CSRF=true
COOKIE_SECRET=<your-secret-here>
```

## Migration Path

For existing applications:

1. **Phase 1**: Keep `ENABLE_CSRF=false`, test integration
2. **Phase 2**: Enable for selected routes
3. **Phase 3**: Enable globally with `ENABLE_CSRF=true`

## Common Issues

### Issue: "CSRF token missing"
**Solution**: Ensure you're calling `/api/csrf-token` and including the token in requests.

### Issue: "CSRF validation failed"
**Solutions**:
- Verify `credentials: 'include'` is set
- Check that cookies are enabled
- Ensure the token hasn't expired
- Verify CORS settings allow credentials

### Issue: "Token works in Postman but not browser"
**Solution**: Browsers have stricter same-site policies. Ensure frontend and backend are on the same domain or use proper CORS settings.

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [csrf-csrf Documentation](https://github.com/Psifi-Solutions/csrf-csrf)
