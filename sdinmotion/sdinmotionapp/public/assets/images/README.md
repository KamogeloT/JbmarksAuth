# Images Folder

This folder contains all images, logos, and icons used in the app.

## 📁 Folder Structure

```
public/assets/images/
├── logos/          - Place your app logos here (municipal logo, company logos, etc.)
├── icons/          - Place custom icons and small graphics here
└── [other images]  - Place general images here
```

## 📝 Usage in Your App

### How to Use Images in Your Code:

**In React Components:**
```tsx
// Logo example
<img src="/assets/images/logos/municipal-logo.png" alt="Municipal Logo" />

// Icon example
<img src="/assets/images/icons/water-icon.png" alt="Water" />

// Background image example
<div style={{ backgroundImage: 'url(/assets/images/background.jpg)' }}>
  Content here
</div>
```

**In CSS/Tailwind:**
```css
.header {
  background-image: url('/assets/images/logos/banner.png');
}
```

## 📐 Recommended Image Sizes

### Logos:
- **App Logo (Square):** 512x512px (for app icon)
- **Header Logo:** 200-400px wide, maintain aspect ratio
- **Splash Screen Logo:** 1024x1024px

### Icons:
- **Small icons:** 32x32px or 64x64px
- **Medium icons:** 128x128px
- **Large icons:** 256x256px

### Photos/Images:
- **Background images:** 1920x1080px (Full HD)
- **Content images:** 800-1200px wide
- **Thumbnails:** 300x300px

## 🎨 Recommended Formats

- **Logos:** PNG (with transparency) or SVG
- **Photos:** JPG or WebP
- **Icons:** PNG or SVG
- **Graphics:** PNG or SVG

## 📦 After Adding Images

After you drop images into these folders, rebuild and sync the app:

```bash
npm run build
npx cap sync
```

Or use the quick command:
```bash
.\build-and-run.ps1
```

---

**Drop your images here and they'll be ready to use in your app!** 🎨

