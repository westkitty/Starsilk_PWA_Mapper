/**
 * BACK15: Automated Bundle Report & Size Integrity Gate.
 */

import fs from "fs";
import path from "path";

const DIST_DIR = path.resolve("dist");
const MAX_TOTAL_BUNDLE_KB = 2500;

if (!fs.existsSync(DIST_DIR)) {
  console.error("Error: dist/ does not exist. Run vite build first.");
  process.exit(1);
}

let totalBytes = 0;
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else {
      totalBytes += stat.size;
    }
  }
}

walk(DIST_DIR);
const totalKb = Math.round(totalBytes / 1024);
console.log(`[Bundle Report] Total dist size: ${totalKb} KB (Budget: ${MAX_TOTAL_BUNDLE_KB} KB)`);

if (totalKb > MAX_TOTAL_BUNDLE_KB) {
  console.error(`Budget exceeded: ${totalKb} KB > ${MAX_TOTAL_BUNDLE_KB} KB`);
  process.exit(1);
} else {
  console.log("Bundle size budget verification passed.");
}
