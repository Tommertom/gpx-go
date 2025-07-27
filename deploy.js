const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Path to the service worker file
const swPath = path.join(__dirname, "sw.js");

// Read the current service worker file
let swContent = fs.readFileSync(swPath, "utf8");

// Extract current version number
const versionMatch = swContent.match(/const CACHE_NAME = "gpx-go-v(\d+)"/);
if (!versionMatch) {
  console.error("Could not find cache version in sw.js");
  process.exit(1);
}

const currentVersion = parseInt(versionMatch[1]);
const newVersion = currentVersion + 1;

console.log(
  `📦 Updating cache version from v${currentVersion} to v${newVersion}`
);

// Update the cache version
swContent = swContent.replace(
  /const CACHE_NAME = "gpx-go-v\d+"/,
  `const CACHE_NAME = "gpx-go-v${newVersion}"`
);

// Write the updated service worker file
fs.writeFileSync(swPath, swContent, "utf8");

console.log(`✅ Updated sw.js cache version to v${newVersion}`);

// Run Firebase deploy
console.log("🚀 Deploying to Firebase...");
try {
  execSync("firebase deploy", { stdio: "inherit" });
  console.log(`🎉 Successfully deployed GPX Go! v${newVersion}`);
} catch (error) {
  console.error("❌ Firebase deploy failed");
  process.exit(1);
}
