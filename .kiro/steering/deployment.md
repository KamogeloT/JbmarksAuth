# JBmarks Android Deployment Procedure

## How the deployment works

The Android APK is hosted on **Azure Blob Storage** and distributed via a direct download URL. There is no Play Store or App Center involved.

### Storage details
- **Storage account:** `jbmarksoauthredirecb0ce`
- **Container:** `jbmarks-releases`
- **APK blob:** `jbmarks.apk`
- **version.json blob:** `version.json`
- **Public APK URL:** `https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/jbmarks.apk`
- **Resource group:** retrieve with `az storage account list --query "[?name=='jbmarksoauthredirecb0ce'].resourceGroup" -o tsv`

### Storage account key
Retrieve at deploy time with:
```bash
az storage account keys list \
  --account-name jbmarksoauthredirecb0ce \
  --resource-group <resource-group> \
  --query "[0].value" -o tsv
```

---

## Full deployment steps (run every time)

### 1. Bump the version
In `app/build.gradle.kts`:
```kotlin
versionCode = <increment by 1>
versionName = "<new semver>"
```

### 2. Update version.json
```json
{
  "version_code": <same as versionCode>,
  "version_name": "<same as versionName>",
  "apk_url": "https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/jbmarks.apk",
  "release_notes": "<summary of changes in this release>",
  "force_update": false
}
```

### 3. Build the debug APK
```bash
./gradlew :app:assembleDebug
```
Output: `app/build/outputs/apk/debug/jbmarks.apk`

### 4. Get the storage key
```bash
STORAGE_KEY=$(az storage account keys list \
  --account-name jbmarksoauthredirecb0ce \
  --resource-group $(az storage account list --query "[?name=='jbmarksoauthredirecb0ce'].resourceGroup" -o tsv) \
  --query "[0].value" -o tsv)
```

### 5. Upload the APK
```bash
az storage blob upload \
  --account-name jbmarksoauthredirecb0ce \
  --account-key "$STORAGE_KEY" \
  --container-name jbmarks-releases \
  --name jbmarks.apk \
  --file app/build/outputs/apk/debug/jbmarks.apk \
  --overwrite true \
  --content-type "application/vnd.android.package-archive"
```

### 6. Upload version.json
```bash
az storage blob upload \
  --account-name jbmarksoauthredirecb0ce \
  --account-key "$STORAGE_KEY" \
  --container-name jbmarks-releases \
  --name version.json \
  --file version.json \
  --overwrite true \
  --content-type "application/json"
```

### 7. Verify the APK is live
```bash
curl -s -o /dev/null -w "%{http_code} — %{size_download} bytes" \
  "https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/jbmarks.apk"
# Expected: 200 — <size> bytes
```

### 8. Commit the version bump
```bash
git add app/build.gradle.kts version.json
git commit -m "chore: bump version to <versionName> (versionCode <versionCode>) for Azure deployment"
git push origin <current-branch>
```

---

## Notes
- The app has a built-in update checker that reads `version.json` from the blob URL and prompts users to download the new APK when `version_code` increases.
- Set `force_update: true` only when the update is mandatory (e.g. breaking API changes).
- Azure CLI must be logged in (`az account show`) before deploying. The active subscription is **Azure subscription 1** (`41a1a89c-2a50-44b3-b917-d54b517783c2`), account `admin@t3ssystems.co.za`.
- No signing keystore is configured — debug builds are used for distribution.
