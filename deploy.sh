#!/bin/bash
# ============================================================
# JBmarks Deploy Script
# Usage: ./deploy.sh "Release notes for this version"
# Requires: Azure CLI (az) logged in
# ============================================================

set -e

STORAGE_ACCOUNT="jbmarksoauthredirecb0ce"
STORAGE_KEY="AAZCWTc1g2Ol6yaPMu2EFiC7tR21KcOp8cgyRY78lVrDGIDdaFSXMUbidlNKxB/0S/U6rE9ZYQxp+AStokw8Kg=="
CONTAINER="jbmarks-releases"
GRADLE_FILE="app/build.gradle.kts"
WORKSPACE="$(dirname "$0")"
APK_PATH="app/build/outputs/apk/debug/jbmarks.apk"

# ── 1. Get release notes ─────────────────────────────────────
RELEASE_NOTES="${1:-Bug fixes and improvements}"
echo "Release notes: $RELEASE_NOTES"

# ── 2. Read current versionCode and bump it ──────────────────
CURRENT_VERSION=$(grep 'versionCode = ' "$GRADLE_FILE" | grep -o '[0-9]*')
NEW_VERSION=$((CURRENT_VERSION + 1))
VERSION_NAME=$(grep 'versionName = ' "$GRADLE_FILE" | grep -o '"[^"]*"' | tr -d '"')

echo "Bumping versionCode: $CURRENT_VERSION → $NEW_VERSION"
sed -i '' "s/versionCode = $CURRENT_VERSION/versionCode = $NEW_VERSION/" "$GRADLE_FILE"

# ── 3. Build APK ─────────────────────────────────────────────
echo "Building APK..."
./gradlew assembleDebug --quiet

# ── 4. Upload APK to Azure Blob ──────────────────────────────
echo "Uploading APK to Azure..."
az storage blob upload \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --container-name "$CONTAINER" \
  --name "jbmarks.apk" \
  --file "$APK_PATH" \
  --overwrite

APK_URL="https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}/jbmarks.apk"

# ── 5. Update version.json ───────────────────────────────────
echo "Updating version.json..."
VERSION_JSON=$(cat <<EOF
{
  "version_code": $NEW_VERSION,
  "version_name": "$VERSION_NAME",
  "apk_url": "$APK_URL",
  "release_notes": "$RELEASE_NOTES",
  "force_update": true
}
EOF
)

echo "$VERSION_JSON" > "$WORKSPACE/version.json"
az storage blob upload \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --container-name "$CONTAINER" \
  --name "version.json" \
  --file "$WORKSPACE/version.json" \
  --overwrite \
  --content-type "application/json"

# ── 6. Commit version bump ───────────────────────────────────
echo "Committing version bump..."
git add "$GRADLE_FILE"
git commit -m "chore: bump versionCode to $NEW_VERSION for release"
git push origin HEAD

echo ""
echo "✅ Deploy complete!"
echo "   Version: $NEW_VERSION ($VERSION_NAME)"
echo "   APK URL: $APK_URL"
echo "   Users will see the update dialog on next app launch."
