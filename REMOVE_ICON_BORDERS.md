# Remove White Borders from App Icon

## Problem
The JBmarks logo has white borders/padding that prevent it from filling the entire app icon square.

## Solution Options

### Option 1: Use Preview (macOS) - Easiest

1. **Open the logo in Preview**
   - Navigate to: `JbmrksIOs/JbmrksIOs/Assets.xcassets/JBmarksLogo.imageset/jbmarksapplogo.png`
   - Right-click → Open With → Preview

2. **Crop the white borders**
   - Click "Markup" tool (pencil icon)
   - Select "Instant Alpha" or use the selection tool
   - Select the white background areas
   - Delete/remove them
   - Or use "Crop" tool to remove white edges

3. **Save and replace**
   - File → Export
   - Format: PNG
   - Save to: `JbmrksIOs/JbmrksIOs/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`
   - Replace the existing file

### Option 2: Use Image Editing Software

**Photoshop/GIMP/Photopea (free online):**
1. Open the logo
2. Use "Magic Wand" to select white background
3. Delete or make transparent
4. Crop to remove excess white space
5. Resize to 1024x1024 if needed
6. Export as PNG

### Option 3: Use Command Line (if ImageMagick is installed)

```bash
# Remove white background and make transparent
convert jbmarksapplogo.png -fuzz 10% -transparent white AppIcon-1024.png

# Or crop white borders
convert jbmarksapplogo.png -trim -bordercolor white -border 0 AppIcon-1024.png
```

### Option 4: Use Online Tools

1. Go to https://www.remove.bg/ or https://photopea.com/
2. Upload the logo
3. Remove white background
4. Download and save as `AppIcon-1024.png`

## After Removing Borders

1. **Replace the icon file:**
   - Save the edited logo to: `JbmrksIOs/JbmrksIOs/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`

2. **Clean and rebuild in Xcode:**
   - Product → Clean Build Folder (Shift+Cmd+K)
   - Build and run

3. **Check the result:**
   - The icon should now fill the entire square without white borders

## Important Notes

- **Keep it 1024x1024 pixels** - Don't change the size
- **No transparency** - App icons should have a solid background (or the green should fill the square)
- **Square format** - iOS will add rounded corners automatically
- **Test on device** - Icons look different on device vs simulator

---

**Need help?** If you want, I can try to use command-line tools to automatically remove the white borders, but you may need to manually adjust it in an image editor for best results.
