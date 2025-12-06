# Logo Update Guide

This guide explains how to update the app logo across all platforms and sizes.

## Quick Update Process

1. **Replace the source logo**: Edit `public/favicon.svg` with your new logo design
   - The logo should be an SVG file
   - Recommended size: 512x512 viewBox for best quality
   - The logo will be automatically resized for all icon sizes

2. **Generate all icon sizes**: Run the icon generation script
   ```bash
   npm run generate-icons
   ```

3. **Verify**: Check that all icons were generated in `public/icons/`
   - Regular icons: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
   - Maskable icons: 192x192, 512x512 (with safe zone padding for Android)

## Logo File Locations

- **Source Logo**: `public/favicon.svg` - This is the master logo file
- **Generated Icons**: `public/icons/` - All PNG and SVG sizes are generated here
- **Manifest**: `public/manifest.json` - References all PWA icons
- **HTML**: `index.html` - References favicon and Apple touch icons

## Icon Generation Script

The script `scripts/generate-icons-from-logo.js`:
- Converts `favicon.svg` to PNG in all required sizes
- Creates maskable versions with 10% safe zone padding
- Generates SVG versions for reference
- Uses Sharp library for high-quality image processing

## Logo Design Guidelines

For best results:
- Use SVG format for scalability
- Design at 512x512 viewBox
- Keep important elements within the center 80% (for maskable icons)
- Use solid colors or gradients (avoid complex patterns at small sizes)
- Ensure text is readable at small sizes (72x72)

## Current Logo Design

The current logo features:
- "Mi PRACTICE COACH" text
- Rounded square with speech bubble tail
- Three-color sections (blue, green, navy)
- Bird silhouette in top-right corner

## Troubleshooting

**Icons not updating?**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- For PWA: Uninstall and reinstall the app

**Icon generation fails?**
- Ensure `sharp` is installed: `npm install`
- Check that `public/favicon.svg` exists and is valid SVG
- Verify file permissions

**Need different sizes?**
- Edit `scripts/generate-icons-from-logo.js` to add/remove sizes
- Update `public/manifest.json` to include new sizes

