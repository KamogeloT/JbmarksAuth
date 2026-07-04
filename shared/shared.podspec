Pod::Spec.new do |spec|
  spec.name                     = "shared"
  spec.version                  = "1.0"
  spec.homepage                 = "https://github.com/jbmarks"
  spec.source                   = { :git => "Not Published", :tag => "Cocoapods/#{spec.name}/#{spec.version}" }
  spec.authors                  = ""
  spec.license                  = ""
  spec.summary                  = "JBmarks Shared KMM Module"
  spec.static_framework         = false
  spec.libraries                = "c++"
  spec.ios.deployment_target    = "15.0"
  
  spec.pod_target_xcconfig = {
    "KOTLIN_PROJECT_PATH" => ":shared",
    "PRODUCT_MODULE_NAME" => "shared"
  }
  
  spec.script_phases = [
    {
      :name => "Build shared",
      :execution_position => :before_compile,
      :shell_path => "/bin/sh",
      :script => <<-SCRIPT
        set +e
        REPO_ROOT="$PODS_TARGET_SRCROOT"
        cd "$REPO_ROOT/.."
        
        # Check if framework already exists
        if [ -d "build/bin/iosSimulatorArm64/debugFramework/shared.framework" ]; then
          echo "Framework already exists, skipping build"
          exit 0
        fi
        
        # Try to build if Java is available
        if [ -f "./gradlew" ] && command -v java &> /dev/null && java -version &> /dev/null; then
          echo "Building shared framework with Gradle..."
          ./gradlew :shared:iosArm64MainBinaries :shared:iosSimulatorArm64MainBinaries :shared:iosX64MainBinaries
        else
          echo "ERROR: Java not found. Please install Java 17+ from https://adoptium.net/"
          echo "Then run: cd $REPO_ROOT/.. && ./gradlew :shared:iosArm64MainBinaries :shared:iosSimulatorArm64MainBinaries :shared:iosX64MainBinaries"
          exit 0
        fi
        SCRIPT
    }
  ]
  
  spec.source_files = "src/iosMain/objc/**/*.{h,m}"
  spec.public_header_files = "src/iosMain/objc/**/*.h"
end
