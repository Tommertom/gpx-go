#!/usr/bin/env node

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Configuration
const FAVICON_PATH = "./favicon.png";
const ASSETS_DIR = "./assets";
const ICON_SIZES = [
  { size: 72, name: "icon-72x72.png" },
  { size: 96, name: "icon-96x96.png" },
  { size: 128, name: "icon-128x128.png" },
  { size: 144, name: "icon-144x144.png" },
  { size: 152, name: "icon-152x152.png" },
  { size: 192, name: "icon-192x192.png" },
  { size: 384, name: "icon-384x384.png" },
  { size: 512, name: "icon-512x512.png" },
];

async function ensureAssetsDir() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    console.log(`📁 Created ${ASSETS_DIR} directory`);
  }
}

async function checkFavicon() {
  if (!fs.existsSync(FAVICON_PATH)) {
    console.error(`❌ favicon.png not found at ${FAVICON_PATH}`);
    console.log(
      "Please ensure you have a favicon.png file in the project root."
    );
    process.exit(1);
  }

  try {
    const metadata = await sharp(FAVICON_PATH).metadata();
    console.log(
      `📸 Source favicon: ${metadata.width}x${metadata.height} (${metadata.format})`
    );

    if (metadata.width < 192 || metadata.height < 192) {
      console.warn(
        `⚠️  Warning: favicon.png is ${metadata.width}x${metadata.height}. Recommended minimum is 192x192 for best quality.`
      );
    }
  } catch (error) {
    console.error(`❌ Error reading favicon.png: ${error.message}`);
    process.exit(1);
  }
}

async function generateIcon(size, filename) {
  try {
    const outputPath = path.join(ASSETS_DIR, filename);

    await sharp(FAVICON_PATH)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: "cover",
        position: "center",
      })
      .png({
        quality: 90,
        compressionLevel: 9,
      })
      .toFile(outputPath);

    console.log(`✅ Generated ${filename} (${size}x${size})`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Error generating ${filename}: ${error.message}`);
    throw error;
  }
}

async function generateAllIcons() {
  console.log("🎨 GPX Go! Icon Generator");
  console.log("==========================");

  await checkFavicon();
  await ensureAssetsDir();

  console.log(`\n📦 Generating ${ICON_SIZES.length} icon sizes...`);

  const results = [];

  for (const iconInfo of ICON_SIZES) {
    try {
      const outputPath = await generateIcon(iconInfo.size, iconInfo.name);
      results.push({
        size: iconInfo.size,
        filename: iconInfo.name,
        path: outputPath,
        success: true,
      });
    } catch (error) {
      results.push({
        size: iconInfo.size,
        filename: iconInfo.name,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

function generateManifestConfig(results) {
  const successfulIcons = results.filter((r) => r.success);

  const manifestIcons = successfulIcons.map((icon) => {
    const purposes = [];

    // Add 'any' for all icons
    purposes.push("any");

    // Add 'maskable' for key sizes that work well with adaptive icons
    if ([192, 512].includes(icon.size)) {
      purposes.push("maskable");
    }

    return {
      src: `./assets/${icon.filename}`,
      sizes: `${icon.size}x${icon.size}`,
      type: "image/png",
      purpose: purposes.join(" "),
    };
  });

  return manifestIcons;
}

function updateManifest(manifestIcons) {
  const manifestPath = "./manifest.json";

  if (!fs.existsSync(manifestPath)) {
    console.warn("⚠️  manifest.json not found, skipping manifest update");
    return;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.icons = manifestIcons;

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log("✅ Updated manifest.json with new icon paths");
  } catch (error) {
    console.error(`❌ Error updating manifest.json: ${error.message}`);
  }
}

function updateFirebaseConfig() {
  const firebasePath = "./firebase.json";

  if (!fs.existsSync(firebasePath)) {
    console.warn(
      "⚠️  firebase.json not found, skipping firebase config update"
    );
    return;
  }

  try {
    const firebase = JSON.parse(fs.readFileSync(firebasePath, "utf8"));

    if (firebase.hosting && firebase.hosting.ignore) {
      // Make sure assets folder is not ignored
      firebase.hosting.ignore = firebase.hosting.ignore.filter(
        (pattern) => pattern !== "assets/**" && pattern !== "assets/"
      );
    }

    fs.writeFileSync(firebasePath, JSON.stringify(firebase, null, 2), "utf8");
    console.log("✅ Updated firebase.json to include assets folder");
  } catch (error) {
    console.error(`❌ Error updating firebase.json: ${error.message}`);
  }
}

function printSummary(results) {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log("\n📊 Generation Summary:");
  console.log("======================");
  console.log(`✅ Successfully generated: ${successful.length} icons`);

  if (failed.length > 0) {
    console.log(`❌ Failed to generate: ${failed.length} icons`);
    failed.forEach((f) => {
      console.log(`   - ${f.filename}: ${f.error}`);
    });
  }

  console.log(`\n📁 All icons saved to: ${ASSETS_DIR}/`);
  console.log("\n🚀 Next steps:");
  console.log("   1. Review the generated icons");
  console.log('   2. Run "deploy.bat" to deploy with new icons');
  console.log("   3. Test PWA installation in Chrome");
}

// Main execution
async function main() {
  try {
    const results = await generateAllIcons();
    const manifestIcons = generateManifestConfig(results);

    updateManifest(manifestIcons);
    updateFirebaseConfig();
    printSummary(results);
  } catch (error) {
    console.error(`💥 Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Check if running directly or being imported
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateAllIcons,
  generateIcon,
  ICON_SIZES,
  ASSETS_DIR,
};
