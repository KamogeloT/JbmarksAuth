#!/bin/bash
# Deploy the JBmarks login template to a Bitrix24 server
# Usage: ./deploy-to-prod.sh <user>@<server-ip>
#
# Example:
#   ./deploy-to-prod.sh sdinmotion@4.221.173.148       (test)
#   ./deploy-to-prod.sh sdinmotion@20.87.213.228       (prod)

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <user>@<server-ip>"
    echo "Example: $0 sdinmotion@4.221.173.148"
    exit 1
fi

TARGET="$1"
REMOTE_PATH="/var/www/bitrix/local/templates/login"

echo "🚀 Deploying login template to $TARGET..."

# Ensure remote directories exist
ssh "$TARGET" "sudo mkdir -p $REMOTE_PATH/images && sudo chown -R www-data:www-data $REMOTE_PATH"

# Copy files
echo "📂 Copying template files..."
scp header.php "$TARGET:/tmp/header.php"
scp footer.php "$TARGET:/tmp/footer.php"
scp template_styles.css "$TARGET:/tmp/template_styles.css"
scp images/LOGO.jpg "$TARGET:/tmp/LOGO.jpg"

# Move to correct location with proper ownership
ssh "$TARGET" "
    sudo cp /tmp/header.php $REMOTE_PATH/header.php
    sudo cp /tmp/footer.php $REMOTE_PATH/footer.php
    sudo cp /tmp/template_styles.css $REMOTE_PATH/template_styles.css
    sudo cp /tmp/LOGO.jpg $REMOTE_PATH/images/LOGO.jpg
    sudo chown -R www-data:www-data $REMOTE_PATH
    sudo rm -rf /var/www/bitrix/bitrix/cache/* /var/www/bitrix/bitrix/managed_cache/*
    rm -f /tmp/header.php /tmp/footer.php /tmp/template_styles.css /tmp/LOGO.jpg
"

echo "✅ Login template deployed to $TARGET"
echo "   Clear browser cache (Cmd+Shift+R) to see changes."
