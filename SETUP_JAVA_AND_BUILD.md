# Setup Java and Build Android APK

## Quick Setup (5 minutes)

### Step 1: Install Java JDK

**Option A: Using Homebrew (Recommended)**
```bash
# This will require your password
brew install --cask temurin
```

**Option B: Manual Download**
1. Download from: https://adoptium.net/
2. Install the macOS .pkg file
3. Run the installer

### Step 2: Verify Java Installation

After installation, verify it works:
```bash
java -version
# Should show Java version 11 or higher
```

If it doesn't work, set JAVA_HOME:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
export PATH=$JAVA_HOME/bin:$PATH
```

### Step 3: Build the APK

Once Java is installed, run:
```bash
cd /Users/kamogelotshukudu/.cursor/worktrees/sdinmotionapp/FOOWY
./build-signed-apk.sh
```

## Alternative: I can guide you through manual steps

Since Java installation requires admin access, I can help you:
1. Prepare all files needed
2. Create the keystore script
3. Provide step-by-step terminal commands

Would you like me to prepare everything now so you just need to install Java and run one command?

