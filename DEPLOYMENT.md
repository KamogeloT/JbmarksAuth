# Deployment Guide

## Quick Deployment Steps

### 1. Build the Application

\`\`\`bash
npm run build
\`\`\`

This creates a `dist` folder with optimized production files.

### 2. Configure Environment Variables

Before deployment, ensure all environment variables are set correctly for production.

#### Option A: Build-time Configuration (Recommended)

Create `.env.production`:

\`\`\`env
VITE_BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.com/rest/1/webhook-code
VITE_BITRIX24_USER_ID=1
VITE_BITRIX24_GROUP_WATER=5
VITE_BITRIX24_GROUP_ELECTRICITY=6
VITE_BITRIX24_GROUP_ROADS=7
VITE_BITRIX24_GROUP_WASTE=8
\`\`\`

Then build:
\`\`\`bash
npm run build
\`\`\`

#### Option B: Runtime Configuration

Create `public/config.js`:

\`\`\`javascript
window.APP_CONFIG = {
  bitrix24: {
    webhookUrl: 'https://your-domain.bitrix24.com/rest/1/webhook-code',
    defaultUserId: '1',
    groups: {
      water: '5',
      electricity: '6',
      roads: '7',
      waste: '8',
    }
  },
  app: {
    name: 'Municipal Fault Reporting',
    supportEmail: 'support@municipality.gov.za',
    supportPhone: '+27 18 297 5111',
  }
};
\`\`\`

Add to `index.html` before closing `</head>`:
\`\`\`html
<script src="/config.js"></script>
\`\`\`

### 3. Test Production Build Locally

\`\`\`bash
npm run preview
\`\`\`

Access at `http://localhost:4173` and test all features.

## Deployment Platforms

### Netlify

1. **Via Netlify CLI:**

\`\`\`bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
\`\`\`

2. **Via Git Integration:**

- Push code to GitHub
- Connect repository in Netlify dashboard
- Build command: `npm run build`
- Publish directory: `dist`
- Add environment variables in Netlify dashboard

3. **Configure Redirects:**

Create `public/_redirects`:
\`\`\`
/* /index.html 200
\`\`\`

### Vercel

1. **Via Vercel CLI:**

\`\`\`bash
npm install -g vercel
vercel login
vercel --prod
\`\`\`

2. **Via Git Integration:**

- Push code to GitHub
- Import project in Vercel dashboard
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Add environment variables in Vercel dashboard

### GitHub Pages

1. **Setup GitHub Actions:**

Create `.github/workflows/deploy.yml`:

\`\`\`yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      env:
          VITE_BITRIX24_WEBHOOK_URL: \${{ secrets.BITRIX24_WEBHOOK_URL }}
          VITE_BITRIX24_USER_ID: \${{ secrets.BITRIX24_USER_ID }}
          VITE_BITRIX24_GROUP_WATER: \${{ secrets.BITRIX24_GROUP_WATER }}
          VITE_BITRIX24_GROUP_ELECTRICITY: \${{ secrets.BITRIX24_GROUP_ELECTRICITY }}
          VITE_BITRIX24_GROUP_ROADS: \${{ secrets.BITRIX24_GROUP_ROADS }}
          VITE_BITRIX24_GROUP_WASTE: \${{ secrets.BITRIX24_GROUP_WASTE }}
          
      - name: Setup Pages
        uses: actions/configure-pages@v3
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: './dist'
        
    - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
\`\`\`

2. **Configure GitHub:**

- Go to repository Settings → Pages
   - Source: GitHub Actions
- Add secrets in Settings → Secrets → Actions

3. **Update base path in `vite.config.ts`:**

\`\`\`typescript
export default defineConfig({
  base: '/repository-name/',
  // ... rest of config
});
\`\`\`

### Traditional Web Server (Apache/Nginx)

#### Apache

1. Upload `dist` contents to server
2. Create `.htaccess`:

\`\`\`apache
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
</IfModule>

# Cache static assets
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
  Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
\`\`\`

#### Nginx

1. Upload `dist` contents to `/var/www/fault-reporting`
2. Configure nginx:

\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/fault-reporting;
    index index.html;

location / {
  try_files $uri $uri/ /index.html;
}

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
\`\`\`

### Docker

Create `Dockerfile`:

\`\`\`dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
\`\`\`

Create `nginx.conf`:

\`\`\`nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
\`\`\`

Build and run:

\`\`\`bash
docker build -t fault-reporting-app .
docker run -p 80:80 fault-reporting-app
\`\`\`

## Post-Deployment Checklist

- [ ] Test all fault report categories
- [ ] Verify file upload works
- [ ] Check Bitrix24 task creation
- [ ] Test on mobile devices
- [ ] Verify PWA installation
- [ ] Test offline mode
- [ ] Check report history
- [ ] Test retry failed submissions
- [ ] Verify GPS location works
- [ ] Check all form validations
- [ ] Test on different browsers
- [ ] Verify HTTPS is working
- [ ] Check service worker registration
- [ ] Test camera/photo upload
- [ ] Monitor error logs

## Security Considerations

1. **HTTPS Required:**
   - PWA features require HTTPS
   - Use Let's Encrypt for free SSL certificates

2. **Webhook Security:**
   - Keep webhook URL secret
   - Use environment variables
   - Never commit webhook URL to repository

3. **Content Security Policy:**

Add to `index.html`:
\`\`\`html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self' https://*.bitrix24.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'">
\`\`\`

## Monitoring

### Error Tracking

Add Sentry or similar:

\`\`\`bash
npm install @sentry/react
\`\`\`

### Analytics

Add Google Analytics or similar to track usage.

## Updating the App

1. Make changes to code
2. Test locally: `npm run dev`
3. Build: `npm run build`
4. Test build: `npm run preview`
5. Deploy using your chosen method
6. Service worker will auto-update for users

## Rollback

If issues occur after deployment:

1. Revert to previous Git commit
2. Rebuild and redeploy
3. Or use platform-specific rollback features

## Support

For deployment issues, contact your system administrator or refer to the platform's documentation.
