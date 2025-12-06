/**
 * Generate PWA Icons from Logo
 * 
 * This script converts the favicon.svg to all required PNG icon sizes
 * for PWA manifest and app icons.
 * 
 * Usage: node scripts/generate-icons-from-logo.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceLogo = path.join(__dirname, '..', 'public', 'favicon.svg');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Required icon sizes for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512]; // Maskable icons need safe zone padding

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Check if source logo exists
if (!fs.existsSync(sourceLogo)) {
    console.error(`❌ Source logo not found: ${sourceLogo}`);
    console.error('Please ensure public/favicon.svg exists.');
    process.exit(1);
}

console.log('🎨 Generating icons from logo...\n');

// Generate regular icons
for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
        await sharp(sourceLogo)
            .resize(size, size, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toFile(outputPath);
        
        console.log(`✅ Generated: icon-${size}x${size}.png`);
    } catch (error) {
        console.error(`❌ Error generating icon-${size}x${size}.png:`, error.message);
    }
}

// Generate maskable icons (with 10% safe zone padding)
for (const size of maskableSizes) {
    const outputPath = path.join(iconsDir, `icon-maskable-${size}x${size}.png`);
    const padding = Math.round(size * 0.1); // 10% safe zone, rounded
    const innerSize = size - (padding * 2);
    
    try {
        // Create a white background
        const background = sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
        });
        
        // Resize logo to fit within safe zone
        const logo = await sharp(sourceLogo)
            .resize(innerSize, innerSize, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer();
        
        // Composite logo onto white background with padding
        await background
            .composite([{
                input: logo,
                left: padding,
                top: padding
            }])
            .png()
            .toFile(outputPath);
        
        console.log(`✅ Generated: icon-maskable-${size}x${size}.png (with safe zone)`);
    } catch (error) {
        console.error(`❌ Error generating icon-maskable-${size}x${size}.png:`, error.message);
    }
}

// Also generate SVG versions for reference
for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    
    try {
        // Read the source SVG and create a sized version
        const svgContent = fs.readFileSync(sourceLogo, 'utf8');
        // Update viewBox to maintain aspect ratio
        const sizedSvg = svgContent.replace(
            /viewBox="[^"]*"/,
            `viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"`
        );
        
        fs.writeFileSync(outputPath, sizedSvg);
        console.log(`✅ Generated: icon-${size}x${size}.svg`);
    } catch (error) {
        console.error(`❌ Error generating icon-${size}x${size}.svg:`, error.message);
    }
}

// Generate maskable SVG versions
for (const size of maskableSizes) {
    const outputPath = path.join(iconsDir, `icon-maskable-${size}x${size}.svg`);
    const padding = size * 0.1;
    const innerSize = size - (padding * 2);
    
    try {
        const svgContent = fs.readFileSync(sourceLogo, 'utf8');
        // Create SVG with white background and padding
        const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="white"/>
  <g transform="translate(${padding}, ${padding}) scale(${innerSize / 512})">
    ${svgContent.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
  </g>
</svg>`;
        
        fs.writeFileSync(outputPath, maskableSvg);
        console.log(`✅ Generated: icon-maskable-${size}x${size}.svg (with safe zone)`);
    } catch (error) {
        console.error(`❌ Error generating icon-maskable-${size}x${size}.svg:`, error.message);
    }
}

console.log('\n✨ Icon generation complete!');
console.log('\n📝 Next steps:');
console.log('   1. Review the generated icons in public/icons/');
console.log('   2. If you need to update the logo, edit public/favicon.svg and run this script again');
console.log('   3. The icons are already referenced in public/manifest.json and index.html\n');

