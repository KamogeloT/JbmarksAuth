# Bitrix24 Login Page Customization

## Overview

The Bitrix24 login page has been customized with JBmarks branding. The page is mobile-friendly and works on both desktop and phone.

## What was changed

- JBmarks municipality logo as the full-page background
- White semi-transparent card with the login form
- Modern rounded inputs (grey pill style, green focus ring)
- Green gradient "Log In" button with hover animation
- "Authorization" heading in bold green at the top of the card
- Removed all Bitrix24 branding (logo, QR code, language selector, copyright)
- Added "Powered by SDiMotion" footer
- Responsive layout (works on mobile and desktop)

## Server Details

| Item | Value |
|------|-------|
| Test Server | `4.221.173.148` |
| Production Server | `jbmarks.sdinmotion.co.za` (DNS change pending) |
| SSH User | `sdinmotion` |
| SSH Auth | Key-based (public key added to `~/.ssh/authorized_keys`) |
| Web Root | `/var/www/bitrix/` |

## Files Modified

All customizations are in the **local** template directory (survives Bitrix updates):

```
/var/www/bitrix/local/templates/login/
├── header.php              ← Page structure + all CSS styles
├── footer.php              ← Closing HTML + "Powered by SDiMotion"
├── template_styles.css     ← Cleared (styles are inline in header.php)
└── images/
    └── LOGO.jpg            ← JBmarks hi-res logo (background image)
```

## How it Works

Bitrix24 uses a template system. The `login` template is assigned to unauthenticated users via a database condition:

```sql
-- From b_site_template table:
SITE_ID: s1
TEMPLATE: login
CONDITION: ((method_exists("CUser", "HasNoAccess") && $GLOBALS["USER"]->HasNoAccess()) || !$GLOBALS["USER"]->IsAuthorized()) && $_SERVER["REMOTE_USER"]==""
SORT: 250
```

When a user is not logged in, Bitrix loads the `login` template which consists of:
1. `header.php` — opens HTML, defines all CSS, opens the card container
2. Bitrix's auth component renders the form (inputs, button, links)
3. `footer.php` — closes the card, adds footer text, closes HTML

The CSS in `header.php` overrides Bitrix's default form classes:
- `.login-inp` — the username/password input fields
- `.login-btn` — the submit button
- `.log-popup-header` — the "Authorization" heading
- `.log-popup-footer` — container for button + forgot password link
- `.login-card` — the white card wrapper

## How to Make Changes

### SSH into the server:
```bash
ssh sdinmotion@4.221.173.148
```

### Edit the header (styles + structure):
```bash
sudo nano /var/www/bitrix/local/templates/login/header.php
```

### Edit the footer:
```bash
sudo nano /var/www/bitrix/local/templates/login/footer.php
```

### Replace the background logo:
```bash
sudo cp /path/to/new-logo.jpg /var/www/bitrix/local/templates/login/images/LOGO.jpg
sudo chown www-data:www-data /var/www/bitrix/local/templates/login/images/LOGO.jpg
```

### Clear cache after changes:
```bash
sudo rm -rf /var/www/bitrix/bitrix/cache/* /var/www/bitrix/bitrix/managed_cache/*
```

### Then hard-refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)

## Key CSS Classes (Bitrix Login Form)

| Class | Element | What it is |
|-------|---------|-----------|
| `.login-card` | `<div>` | The white card container |
| `.log-popup-header` | `<div>` | "Authorization" heading text |
| `.login-inp` | `<input>` | Username and password text fields |
| `.login-btn` | `<input type="submit">` | The "Log In" button |
| `.login-btn-transparent` | `<div>` | "Back" button (for QR mode — hidden) |
| `.login-item-checkbox-label` | `<label>` | "Remember me" label |
| `.login-checkbox-user-remember` | `<input checkbox>` | Remember me checkbox |
| `.login-link-forgot-pass` | `<a>` | "Forgot your password?" link |
| `.log-popup-footer` | `<div>` | Container holding button + forgot link |
| `.log-popup-form-qr` | `<div>` | QR code section (hidden) |
| `.login-wrapper` | `<div>` | Inner wrapper (reset to contents) |
| `.login-links` | `<div>` | Register link (hidden) |

## Deploying to Production

When ready to apply to the production server:

1. Update DNS for `jbmarks.sdinmotion.co.za` to point to the new VM IP
2. SSH into the production server
3. Copy the same files:
   - `/var/www/bitrix/local/templates/login/header.php`
   - `/var/www/bitrix/local/templates/login/footer.php`
   - `/var/www/bitrix/local/templates/login/images/LOGO.jpg`
4. Clear the template_styles.css: `echo '/* */' | sudo tee /var/www/bitrix/local/templates/login/template_styles.css`
5. Clear cache: `sudo rm -rf /var/www/bitrix/bitrix/cache/* /var/www/bitrix/bitrix/managed_cache/*`

## Local Preview

A standalone HTML preview file exists at:
```
bitrix-login-preview/login.html
```
Open it in a browser to preview/tweak the design without touching the server. Once happy, replicate the CSS changes in `header.php` on the VM.

## Colour Palette

| Colour | Hex | Usage |
|--------|-----|-------|
| JBmarks Green (dark) | `#1B5E20` | Button, focus rings, links, heading |
| JBmarks Green (light) | `#2E7D32` | Button gradient end, hover states |
| Input background | `#f4f4f5` | Default input fill |
| Input focus background | `#eef7ee` | Light green tint on focus |
| Card background | `rgba(255,255,255,0.95)` | Semi-transparent white |
| Text dark | `#1a1a1a` | Input text |
| Text muted | `#666` | Remember me, labels |
| Footer text | `#bbb` | "Powered by SDiMotion" |
