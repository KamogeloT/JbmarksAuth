#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# JB Marks Digital Workplace Portal — Deployment Script
# Deploys the landing page as a Bitrix site template
#
# Usage:
#   ./deploy.sh dev        → deploys to dev VM (102.133.224.173)
#   ./deploy.sh prod       → deploys to prod VM (20.87.213.228)
#   ./deploy.sh <user@ip>  → deploys to custom target
#
# The template is installed at:
#   /var/www/bitrix/local/templates/jbmarks_portal/
#
# After deploy, activate the template in:
#   SDiM Admin → Settings → Sites → Default → Template = jbmarks_portal
# ─────────────────────────────────────────────────────────────────

set -e

DEV_TARGET="sdinmotion@102.133.224.173"
PROD_TARGET="sdinmotion@20.87.213.228"
TEMPLATE_NAME="jbmarks_portal"
REMOTE_BASE="/var/www/bitrix/local/templates"
REMOTE_PATH="$REMOTE_BASE/$TEMPLATE_NAME"

# Determine target
case "${1:-dev}" in
    dev)   TARGET="$DEV_TARGET"; ENV="DEV" ;;
    prod)  TARGET="$PROD_TARGET"; ENV="PROD" ;;
    *)     TARGET="$1"; ENV="CUSTOM" ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  JB Marks Digital Workplace Portal — Deployment"
echo "  Target: $TARGET ($ENV)"
echo "  Template: $TEMPLATE_NAME"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Safety check for prod
if [ "$ENV" = "PROD" ]; then
    read -p "⚠️  You are deploying to PRODUCTION. Continue? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled."
        exit 0
    fi
fi

# Ensure remote directories exist
echo "📁 Creating remote directories..."
ssh "$TARGET" "sudo mkdir -p $REMOTE_PATH/images && sudo chown -R www-data:www-data $REMOTE_BASE"

# Upload template files
echo "📤 Uploading template files..."

# PHP template files
scp template/header.php "$TARGET:/tmp/bx_header.php"
scp template/footer.php "$TARGET:/tmp/bx_footer.php"
scp template/description.php "$TARGET:/tmp/bx_description.php"

# CSS and JS (these are the same for both static and Bitrix template)
scp landing.css "$TARGET:/tmp/bx_landing.css"
scp landing.js "$TARGET:/tmp/bx_landing.js"

# Images
scp images/logo.png "$TARGET:/tmp/bx_logo.png"

# Move files into place with correct ownership
echo "📂 Installing template..."
ssh "$TARGET" "
    sudo cp /tmp/bx_header.php $REMOTE_PATH/header.php
    sudo cp /tmp/bx_footer.php $REMOTE_PATH/footer.php
    sudo cp /tmp/bx_description.php $REMOTE_PATH/description.php
    sudo cp /tmp/bx_landing.css $REMOTE_PATH/landing.css
    sudo cp /tmp/bx_landing.js $REMOTE_PATH/landing.js
    sudo cp /tmp/bx_logo.png $REMOTE_PATH/images/logo.png
    sudo chown -R www-data:www-data $REMOTE_PATH
    sudo chmod -R 755 $REMOTE_PATH
    rm -f /tmp/bx_header.php /tmp/bx_footer.php /tmp/bx_description.php /tmp/bx_landing.css /tmp/bx_landing.js /tmp/bx_logo.png
"

# Create the default page (index.php) that uses the template content
echo "📄 Installing portal home page..."
scp template/index.php "$TARGET:/tmp/bx_index.php"
ssh "$TARGET" "
    sudo cp /tmp/bx_index.php $REMOTE_PATH/index.php
    sudo chown www-data:www-data $REMOTE_PATH/index.php
    rm -f /tmp/bx_index.php
"

# Clear Bitrix cache
echo "🧹 Clearing Bitrix cache..."
ssh "$TARGET" "
    sudo rm -rf /var/www/bitrix/bitrix/cache/*
    sudo rm -rf /var/www/bitrix/bitrix/managed_cache/*
    sudo rm -rf /var/www/bitrix/bitrix/stack_cache/*
" 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Deployment complete!"
echo ""
echo "  Template installed at: $REMOTE_PATH"
echo ""
echo "  NEXT STEPS:"
echo "  1. Log in to SDiM admin panel"
echo "  2. Go to: Settings → Sites → Default Site"
echo "  3. Set Template = '$TEMPLATE_NAME'"
echo "  4. Clear browser cache (Ctrl+Shift+R)"
echo ""
echo "  Or set via CLI:"
echo "    ssh $TARGET"
echo "    sudo -u www-data php -r \""
echo "      \\\$_SERVER['DOCUMENT_ROOT'] = '/var/www/bitrix';"
echo "      require '/var/www/bitrix/bitrix/modules/main/include/prolog_before.php';"
echo "      COption::SetOptionString('main', 'wizard_template_id', '$TEMPLATE_NAME');"
echo "    \""
echo "═══════════════════════════════════════════════════════════"
echo ""
