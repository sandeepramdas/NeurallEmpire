# 🚀 Supabase Setup Guide for NeurallEmpire

This guide will help you set up Supabase for your NeurallEmpire website with complete authentication and database functionality.

## 📋 Prerequisites

- Supabase account (free tier available)
- Basic understanding of SQL
- Access to your domain for email authentication

## 🎯 Step 1: Create Supabase Project

1. **Go to [Supabase](https://supabase.com)**
2. **Sign up or log in**
3. **Create a new project:**
   - Organization: Your choice
   - Project name: `neurallempire`
   - Database password: Generate a strong password
   - Region: Choose closest to your users

## 🗄️ Step 2: Set Up Database Schema

1. **Go to SQL Editor in your Supabase dashboard**
2. **Run the schema from `supabase-setup.sql`:**
   - Copy the entire content of `supabase-setup.sql`
   - Paste and execute in SQL Editor
   - This creates all tables, triggers, and policies

## 🔑 Step 3: Configure Authentication

### Enable Email Authentication
1. **Go to Authentication > Settings**
2. **Site URL:** `http://localhost:8000` (for development)
3. **Redirect URLs:** Add production domain when ready

### Email Templates (Optional)
1. **Go to Authentication > Email Templates**
2. **Customize welcome and verification emails**
3. **Use your brand colors and messaging**

## 🔧 Step 4: Get Your Credentials

1. **Go to Settings > API**
2. **Copy these values:**
   - Project URL
   - Project API Key (anon/public)

## ⚙️ Step 5: Configure Your Website

1. **Open `assets/js/supabase-config.js`**
2. **Update the configuration:**

```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_PROJECT_URL', // Replace with your URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY', // Replace with your anon key
    enabled: true, // Set to true to enable Supabase
    // ... rest of config stays the same
};
```

## 🔒 Step 6: Set Up Row Level Security (RLS)

The schema already includes RLS policies, but verify they're active:

1. **Go to Authentication > Policies**
2. **Verify these tables have policies:**
   - `user_profiles`: Users can read/update their own data
   - `contacts`: Users can read their own submissions
   - `payments`: Users can read their own payment records

## 📧 Step 7: Configure Email Service (Optional)

For production, consider setting up custom SMTP:

1. **Go to Settings > Auth**
2. **Enable Custom SMTP**
3. **Configure with your email provider:**
   - SendGrid
   - Mailgun
   - Your own SMTP server

## 🧪 Step 8: Test Your Setup

1. **Start your development server:**
   ```bash
   npx serve . -p 8000
   ```

2. **Test authentication:**
   - Try signing up with a new account
   - Check if verification email is sent
   - Verify login works
   - Test form submissions

3. **Check Supabase Dashboard:**
   - Go to Authentication > Users
   - Verify new users appear
   - Check Table Editor for form submissions

## 🚀 Step 9: Production Deployment

### Update Site URLs
1. **In Supabase Dashboard > Authentication > Settings:**
   - Site URL: `https://yourdom∫ain.com`
   - Redirect URLs: Add your production URLs

### Environment Variables
For production deployments, consider using environment variables:

```javascript
const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL || 'your-fallback-url',
    anonKey: process.env.SUPABASE_ANON_KEY || 'your-fallback-key',
    enabled: true
};
```

## 🔧 MCP Server Configuration

For enhanced development with Claude Code, you can set up MCP server configurations:

### Option 1: Supabase MCP Server
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "your-project-url",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

### Option 2: PostgreSQL MCP Server
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "your-supabase-postgres-connection"
      }
    }
  }
}
```

## 📊 Monitoring and Analytics

### Built-in Analytics
- **Go to Reports in Supabase Dashboard**
- **Monitor API usage, authentication events**
- **Track database performance**

### Custom Analytics
The schema includes fields for tracking:
- User login patterns
- Form conversion rates
- Lead scoring metrics
- Payment analytics

## 🛠️ Troubleshooting

### Common Issues

1. **"Supabase not initialized" errors:**
   - Check if URL and API key are correct
   - Verify `enabled: true` in config
   - Check browser console for detailed errors

2. **Authentication not working:**
   - Verify email confirmation is enabled
   - Check Site URL matches your domain
   - Ensure RLS policies are correctly set

3. **Form submissions failing:**
   - Check database schema is properly created
   - Verify RLS policies allow inserts
   - Check browser network tab for API errors

### Debug Mode
Enable debug logging in your config:

```javascript
const SUPABASE_CONFIG = {
    // ... your config
    options: {
        // ... existing options
        global: {
            headers: {
                'X-Application': 'NeurallEmpire',
            },
        },
        debug: true // Add this for development
    }
};
```

## 🎉 Next Steps

1. **Test thoroughly in development**
2. **Set up production environment**
3. **Configure email templates**
4. **Set up monitoring and backups**
5. **Plan for scaling (upgrade Supabase plan if needed)**

## 📞 Support

- **Supabase Documentation:** [docs.supabase.com](https://docs.supabase.com)
- **Supabase Discord:** Join their community
- **Check `supabase-setup.sql` for database schema details**

---

**🚀 Your NeurallEmpire is now powered by Supabase! Ready to dominate with real-time data and authentication.**