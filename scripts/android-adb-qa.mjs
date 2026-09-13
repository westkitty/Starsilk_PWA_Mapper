// scripts/android-adb-qa.mjs
// STARSILK SYSTEM PLANNER — Repository-Native Android ADB Physical QA Runner

delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn, execFile } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(projectRoot, 'dist');
const evidenceBaseDir = path.resolve(projectRoot, 'evidence/android-adb');

// MIME types for local preview server
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// ==========================================
// CLI Argument Parsing
// ==========================================
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    pen: false,
    serial: process.env.ANDROID_SERIAL || null,
    port: 0,
    cdpPort: 9222,
    duration: 5, // frame pacing duration in seconds
    timeout: 30, // s-pen wait timeout in seconds
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--pen') {
      options.pen = true;
    } else if (arg === '--serial' && i + 1 < args.length) {
      options.serial = args[++i];
    } else if (arg.startsWith('--serial=')) {
      options.serial = arg.slice('--serial='.length);
    } else if (arg === '--port' && i + 1 < args.length) {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '--cdp-port' && i + 1 < args.length) {
      options.cdpPort = parseInt(args[++i], 10);
    } else if (arg === '--duration' && i + 1 < args.length) {
      options.duration = parseFloat(args[++i]);
    } else if (arg === '--timeout' && i + 1 < args.length) {
      options.timeout = parseFloat(args[++i]);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }
  return options;
}

// ==========================================
// Shell & ADB Utilities
// ==========================================
function runExec(cmd, args = [], options = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: options.timeout || 15000, ...options }, (error, stdout, stderr) => {
      resolve({
        code: error ? (error.code || 1) : 0,
        stdout: (stdout || '').toString().trim(),
        stderr: (stderr || '').toString().trim(),
        error,
      });
    });
  });
}

function redactSerial(serial) {
  if (!serial) return 'UNKNOWN';
  const hash = crypto.createHash('sha256').update(serial).digest('hex').slice(0, 8);
  return `DEVICE_REDACTED_${hash}`;
}

function parseSimTimeToSeconds(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  const match = trimmed.match(/^([\d.]+)\s*(s|h|d|yr)$/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return val;
    case 'h': return val * 3600;
    case 'd': return val * 86400;
    case 'yr': return val * 365.25 * 86400;
    default: return val;
  }
}


async function findAdbBinary() {
  const whichRes = await runExec('which', ['adb']);
  if (whichRes.code === 0 && whichRes.stdout) {
    return whichRes.stdout;
  }
  const candidates = [
    '/opt/homebrew/bin/adb',
    '/usr/local/bin/adb',
    path.join(process.env.HOME || '', 'Library/Android/sdk/platform-tools/adb'),
    path.join(process.env.ANDROID_HOME || '', 'platform-tools/adb'),
    path.join(process.env.ANDROID_SDK_ROOT || '', 'platform-tools/adb'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ==========================================
// Device Discovery & Fingerprinting
// ==========================================
async function probeAdbDevices(adbPath) {
  const res = await runExec(adbPath, ['devices', '-l']);
  if (res.code !== 0) {
    throw new Error(`Failed to execute adb devices: ${res.stderr || res.stdout}`);
  }

  const lines = res.stdout.split('\n');
  const devices = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('List of devices attached')) continue;

    // Line format: <serial>\s+<state>(\s+.*)?
    // State is strictly one of the known ADB device states
    const match = line.match(/^(.*?)\s+(device|unauthorized|offline|authorizing|recovery|sideload|bootloader|connecting)(?:\s+(.*))?$/);
    if (match) {
      const serial = match[1].trim();
      const state = match[2];
      const extra = match[3] || '';

      const props = {};
      const propMatches = extra.matchAll(/(\w+):(\S+)/g);
      for (const m of propMatches) {
        props[m[1]] = m[2];
      }

      devices.push({
        raw: line,
        serial,
        state, // 'device', 'unauthorized', 'offline', 'authorizing', etc.
        model: props.model || 'Unknown',
        product: props.product || 'Unknown',
        device: props.device || 'Unknown',
        transportId: props.transport_id || null,
      });
    }
  }

  return devices;
}

async function collectDeviceFingerprint(adbPath, serial) {
  const runProp = async (prop) => {
    const r = await runExec(adbPath, ['-s', serial, 'shell', 'getprop', prop]);
    return r.stdout;
  };

  const [manufacturer, model, release, sdk, abi] = await Promise.all([
    runProp('ro.product.manufacturer'),
    runProp('ro.product.model'),
    runProp('ro.build.version.release'),
    runProp('ro.build.version.sdk'),
    runProp('ro.product.cpu.abi'),
  ]);

  const wmSizeRes = await runExec(adbPath, ['-s', serial, 'shell', 'wm', 'size']);
  const wmDensityRes = await runExec(adbPath, ['-s', serial, 'shell', 'wm', 'density']);

  const displayDump = await runExec(adbPath, ['-s', serial, 'shell', 'dumpsys', 'display']);
  let refreshRateMode = 'Unknown';
  if (displayDump.stdout) {
    const rrMatch = displayDump.stdout.match(/refreshRate\s*=\s*([0-9.]+)/i) ||
                    displayDump.stdout.match(/([0-9.]+)fps/i) ||
                    displayDump.stdout.match(/fps\s*=\s*([0-9.]+)/i) ||
                    displayDump.stdout.match(/Mode\s*\{[^}]*fps\s*=\s*([0-9.]+)/i);
    if (rrMatch) {
      refreshRateMode = `${parseFloat(rrMatch[1])}Hz`;
    }
  }

  const chromeRes = await runExec(adbPath, ['-s', serial, 'shell', 'dumpsys', 'package', 'com.android.chrome']);
  let chromeVersion = 'Not Installed';
  if (chromeRes.stdout) {
    const vMatch = chromeRes.stdout.match(/versionName=([^\s]+)/);
    if (vMatch) {
      chromeVersion = vMatch[1];
    }
  }

  return {
    manufacturer: manufacturer || 'Unknown',
    model: model || 'Unknown',
    androidRelease: release || 'Unknown',
    apiLevel: sdk || 'Unknown',
    cpuAbi: abi || 'Unknown',
    screenSize: wmSizeRes.stdout || 'Unknown',
    screenDensity: wmDensityRes.stdout || 'Unknown',
    refreshRateMode,
    chromeVersion,
    redactedSerial: redactSerial(serial),
  };
}

// ==========================================
// Static Preview Server
// ==========================================
function createStaticPreviewServer() {
  return http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath.startsWith('/Star_System_Planner/')) {
      reqPath = reqPath.slice('/Star_System_Planner/'.length);
    } else if (reqPath === '/Star_System_Planner') {
      reqPath = '';
    }
    if (reqPath === '' || reqPath === '/') {
      reqPath = 'index.html';
    }

    const filePath = path.join(distDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      if (!reqPath.endsWith('.js') && !reqPath.endsWith('.css') && !reqPath.endsWith('.png') && !reqPath.endsWith('.svg')) {
        const indexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath);
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          });
          res.end(content);
          return;
        }
      }
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(content);
  });
}

// ==========================================
// Chrome DevTools Protocol Client
// ==========================================
class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const cb = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) cb.reject(new Error(data.error.message || JSON.stringify(data.error)));
          else cb.resolve(data.result);
        } else if (data.method) {
          const listeners = this.eventListeners.get(data.method) || [];
          for (const l of listeners) l(data.params);
        }
      };
    });
  }

  on(event, handler) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event).push(handler);
  }

  send(method, params = {}, sessionId = undefined) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.callbacks.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }

  async evaluate(expression, sessionId) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId);
    if (res.exceptionDetails) {
      throw new Error(`Evaluation failed: ${res.exceptionDetails.text || JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
  }
}

// ==========================================
// Frame-Pacing Measurement Probe
// ==========================================
async function measureFramePacing(client, sessionId, durationMs = 5000) {
  return await client.evaluate(`
    new Promise((resolve) => {
      const intervals = [];
      let lastTime = performance.now();
      const startTime = lastTime;

      function onFrame(now) {
        const delta = now - lastTime;
        lastTime = now;
        intervals.push(delta);

        if (now - startTime < ${durationMs}) {
          requestAnimationFrame(onFrame);
        } else {
          // Drop initial frame delta to remove hook startup jitter
          const clean = intervals.slice(1);
          clean.sort((a, b) => a - b);

          const count = clean.length;
          const totalDuration = now - startTime;
          const median = clean[Math.floor(count / 2)] || 0;
          const p95 = clean[Math.floor(count * 0.95)] || 0;
          const p99 = clean[Math.floor(count * 0.99)] || 0;
          const sum = clean.reduce((acc, v) => acc + v, 0);
          const mean = count > 0 ? sum / count : 0;
          const variance = count > 0 ? clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count : 0;
          const stdev = Math.sqrt(variance);
          const observedFps = totalDuration > 0 ? (count / (totalDuration / 1000)) : 0;

          const drops120Hz = clean.filter(i => i > 8.33).length;
          const drops60Hz = clean.filter(i => i > 16.7).length;
          const stutters20ms = clean.filter(i => i > 20.0).length;

          resolve({
            durationMs: parseFloat(totalDuration.toFixed(1)),
            frameCount: count,
            medianIntervalMs: parseFloat(median.toFixed(2)),
            p95IntervalMs: parseFloat(p95.toFixed(2)),
            p99IntervalMs: parseFloat(p99.toFixed(2)),
            stdevMs: parseFloat(stdev.toFixed(2)),
            observedFps: parseFloat(observedFps.toFixed(1)),
            framesOver8_33ms: drops120Hz,
            framesOver16_7ms: drops60Hz,
            framesOver20ms: stutters20ms,
          });
        }
      }
      requestAnimationFrame(onFrame);
    });
  `, sessionId);
}

// ==========================================
// Screenshot Helper
// ==========================================
async function captureDeviceScreenshot(adbPath, serial, client, sessionId, targetPath) {
  try {
    const p = spawn(adbPath, ['-s', serial, 'exec-out', 'screencap', '-p']);
    const chunks = [];
    p.stdout.on('data', c => chunks.push(c));
    const code = await new Promise(r => p.on('close', r));
    if (code === 0 && chunks.length > 0) {
      const buf = Buffer.concat(chunks);
      if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        fs.writeFileSync(targetPath, buf);
        return { source: 'adb_screencap', bytes: buf.length };
      }
    }
  } catch {}

  if (client && sessionId) {
    try {
      const snap = await client.send('Page.captureScreenshot', { format: 'png' }, sessionId);
      if (snap && snap.data) {
        const buf = Buffer.from(snap.data, 'base64');
        fs.writeFileSync(targetPath, buf);
        return { source: 'cdp_capture', bytes: buf.length };
      }
    } catch {}
  }

  return { source: 'failed', bytes: 0 };
}

// ==========================================
// Global Lifecycle & Cleanup State (Defect 10)
// ==========================================
const cleanupState = {
  adbPath: null,
  targetSerial: null,
  reversedPort: null,
  forwardedPort: null,
  cdpClient: null,
  serverInstance: null,
  isCleaningUp: false,
  isCleanedUp: false,
};

async function executeCleanup() {
  if (cleanupState.isCleaningUp || cleanupState.isCleanedUp) return;
  cleanupState.isCleaningUp = true;
  console.log('\n[Cleanup] Cleaning up active ADB reverse/forward rules and preview server...');

  if (cleanupState.cdpClient) {
    try {
      cleanupState.cdpClient.close();
      console.log('  Closed CDP WebSocket');
    } catch {}
  }
  if (cleanupState.adbPath && cleanupState.targetSerial && cleanupState.reversedPort) {
    try {
      await runExec(cleanupState.adbPath, ['-s', cleanupState.targetSerial, 'reverse', '--remove', `tcp:${cleanupState.reversedPort}`]);
      console.log(`  Removed reverse tcp:${cleanupState.reversedPort}`);
    } catch {}
  }
  if (cleanupState.adbPath && cleanupState.targetSerial && cleanupState.forwardedPort) {
    try {
      await runExec(cleanupState.adbPath, ['-s', cleanupState.targetSerial, 'forward', '--remove', `tcp:${cleanupState.forwardedPort}`]);
      console.log(`  Removed forward tcp:${cleanupState.forwardedPort}`);
    } catch {}
  }
  if (cleanupState.serverInstance) {
    try {
      await new Promise((resolve) => cleanupState.serverInstance.close(resolve));
      console.log('  Closed HTTP preview server');
    } catch {}
  }
  cleanupState.isCleanedUp = true;
  cleanupState.isCleaningUp = false;
  console.log('[Cleanup] Cleanup complete.');
}

process.on('SIGINT', async () => {
  console.log('\n[Process] Caught SIGINT. Awaiting cleanup...');
  await executeCleanup();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  console.log('\n[Process] Caught SIGTERM. Awaiting cleanup...');
  await executeCleanup();
  process.exit(143);
});

// ==========================================
// Main Runner Orchestration
// ==========================================
async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(`
STARSILK SYSTEM PLANNER — Android ADB QA Runner
Usage:
  npm run qa:android              Run automated physical QA & Fate Lens validation
  npm run qa:android:pen          Run assisted S Pen & palm-rejection validation
  node scripts/android-adb-qa.mjs [options]

Options:
  --pen                 Enable assisted S Pen & palm-rejection interactive test mode
  --serial <serial>     Specify target Android device serial (or via ANDROID_SERIAL)
  --port <port>         Local preview server port (default: dynamic/ephemeral)
  --cdp-port <port>     Host port for Chrome DevTools forwarding (default: 9222)
  --duration <sec>      Duration in seconds for frame pacing measurement (default: 5)
  --timeout <sec>       Timeout in seconds waiting for S Pen input (default: 30)
  --help, -h            Show this help message
`);
    return;
  }

  const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runOutputDir = path.join(evidenceBaseDir, `run-${runTimestamp}`);
  fs.mkdirSync(runOutputDir, { recursive: true });

  console.log('================================================================================');
  console.log('STARSILK SYSTEM PLANNER — ANDROID ADB PHYSICAL QA');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Mode: ${options.pen ? 'ASSISTED S PEN & PALM REJECTION QA' : 'AUTOMATED PHYSICAL FATE LENS QA'}`);
  console.log('================================================================================\n');

  // 1. Discover ADB binary
  const adbPath = await findAdbBinary();
  if (!adbPath) {
    console.error('[ADB QA] ERROR: adb binary not found on PATH or standard SDK locations.');
    console.error('Please install Android Platform Tools: brew install android-platform-tools');
    const noAdbReport = {
      status: 'NO_ADB_BINARY',
      error: 'adb binary could not be located on PATH or standard Android SDK directories',
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(runOutputDir, 'run-report.json'), JSON.stringify(noAdbReport, null, 2));
    process.exitCode = 1;
    return;
  }
  cleanupState.adbPath = adbPath;
  console.log(`[ADB] Found adb executable: ${adbPath}`);

  // 2. Discover Attached Android Devices
  let devices = [];
  try {
    devices = await probeAdbDevices(adbPath);
  } catch (err) {
    console.error(`[ADB QA] Failed to query devices: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[ADB] Detected devices: ${devices.length}`);
  for (const d of devices) {
    console.log(`  - [${d.state}] Model: ${d.model} | Product: ${d.product} | Serial: ${redactSerial(d.serial)}`);
  }

  // 2a. Zero Devices Attached (Defect 9)
  if (devices.length === 0) {
    console.log('\n================================================================================');
    console.log('STATUS: NO AUTHORIZED DEVICE AVAILABLE');
    console.log('HARNESS STATE: ANDROID ADB HARNESS HARDENED — PHYSICAL RUN UNVERIFIED');
    console.log('================================================================================');
    console.log(`
No Android devices were detected via ADB.

To run physical-device QA on a Samsung Galaxy Tab S9 (or compatible Android device):
  1. Enable Developer Options on the tablet:
     Settings -> About tablet -> Software information -> Tap 'Build number' 7 times.
  2. Enable USB Debugging:
     Settings -> Developer options -> Toggle 'USB debugging' to ON.
     (For Wireless ADB: also toggle 'Wireless debugging' and pair via 'adb pair <ip>:<port>').
  3. Connect the tablet to this machine via USB-C cable (or run 'adb connect <tablet_ip>:<port>').
  4. Unlock the tablet and approve the RSA prompt: "Allow USB debugging?".
  5. Verify attachment with: 'adb devices -l'.
  6. Re-run: npm run qa:android (or npm run qa:android:pen).
================================================================================\n`);

    const noDeviceReport = {
      status: 'NO AUTHORIZED DEVICE AVAILABLE',
      harnessState: 'ANDROID ADB HARNESS HARDENED — PHYSICAL RUN UNVERIFIED',
      timestamp: new Date().toISOString(),
      deviceCount: 0,
      instructions: 'Enable USB/Wireless debugging on Samsung Galaxy Tab S9 and attach via ADB.',
      harnessValidation: {
        adbBinary: adbPath,
        transportModule: 'ready',
        cdpModule: 'ready',
        fateLensJourneyModule: 'hardened_with_strict_oracles',
        framePacingModule: 'ready',
        sPenTelemetryModule: 'ready',
        cleanupModule: 'structurally_safe',
      },
    };
    fs.writeFileSync(path.join(runOutputDir, 'run-report.json'), JSON.stringify(noDeviceReport, null, 2));
    fs.writeFileSync(path.join(evidenceBaseDir, 'no-device.json'), JSON.stringify(noDeviceReport, null, 2));

    const summaryMd = `# Android ADB QA Run Summary
- **Status**: NO AUTHORIZED DEVICE AVAILABLE
- **Harness State**: ANDROID ADB HARNESS HARDENED — PHYSICAL RUN UNVERIFIED
- **Timestamp**: ${new Date().toISOString()}
- **Devices Detected**: 0

### Actionable Next Steps
Attach the Samsung Galaxy Tab S9 via USB or Wireless ADB, verify authorization on the tablet screen, and execute \`npm run qa:android\`.
`;
    fs.writeFileSync(path.join(runOutputDir, 'summary.md'), summaryMd);
    console.log(`[Evidence] Report written to ${path.join(runOutputDir, 'run-report.json')}`);
    return;
  }

  // 2b. Device Selection Contract (Defect 9)
  let selectedDevice = null;
  if (options.serial) {
    // Explicit selector: EXACT match required
    selectedDevice = devices.find(d => d.serial === options.serial);
    if (!selectedDevice) {
      console.error(`\n[ADB QA] ERROR: Specified device serial "${options.serial}" does not match any attached device exactly.`);
      console.error('Available devices:');
      for (const d of devices) {
        console.error(`  - Serial: ${redactSerial(d.serial)} (model: ${d.model}, state: ${d.state})`);
      }
      process.exitCode = 1;
      return;
    }
  } else if (devices.length === 1) {
    selectedDevice = devices[0];
  } else {
    // More than 1 attached device without explicit selector: STOP (never guess)
    console.error('\n[ADB QA] ERROR: Multiple devices attached. Explicit device selector is required.');
    console.error('Please specify target device via --serial <serial> or export ANDROID_SERIAL=<serial>:');
    for (const d of devices) {
      console.error(`  - Serial: ${redactSerial(d.serial)} (model: ${d.model}, state: ${d.state})`);
    }
    process.exitCode = 1;
    return;
  }

  // Require selected device to be authorized
  if (selectedDevice.state !== 'device') {
    console.error(`\n[ADB QA] ERROR: Selected device (${redactSerial(selectedDevice.serial)}) is in state "${selectedDevice.state}". Target must be authorized ("device").`);
    if (selectedDevice.state === 'unauthorized') {
      console.error('Action: Unlock the tablet and approve the "Allow USB debugging?" RSA prompt.');
    } else if (selectedDevice.state === 'offline') {
      console.error('Action: Reconnect the USB cable or restart wireless ADB.');
    }
    process.exitCode = 1;
    return;
  }

  const targetSerial = selectedDevice.serial;
  cleanupState.targetSerial = targetSerial;
  console.log(`[ADB] Target device selected: ${selectedDevice.model} (${redactSerial(targetSerial)})`);

  // Structural Resource Lifecycle Block (Defect 10)
  try {
    // 3. Collect Device Fingerprint
    console.log('[ADB] Extracting device fingerprint...');
    const fingerprint = await collectDeviceFingerprint(adbPath, targetSerial);
    console.log('  Manufacturer:       ', fingerprint.manufacturer);
    console.log('  Model:              ', fingerprint.model);
    console.log('  Android Release:    ', fingerprint.androidRelease);
    console.log('  API Level:          ', fingerprint.apiLevel);
    console.log('  CPU ABI:            ', fingerprint.cpuAbi);
    console.log('  Display Resolution: ', fingerprint.screenSize.replace(/\n/g, ' '));
    console.log('  Display Density:    ', fingerprint.screenDensity.replace(/\n/g, ' '));
    console.log('  Refresh Rate:       ', fingerprint.refreshRateMode);
    console.log('  Chrome Version:     ', fingerprint.chromeVersion);

    // 4. Verify Production Build & Start Preview Server
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
      console.log('\n[Build] Production build not found in dist/. Running npm run build...');
      const buildRes = await runExec('npm', ['run', 'build'], { cwd: projectRoot });
      if (buildRes.code !== 0) {
        console.error('[Build] Build failed:\n' + buildRes.stderr);
        process.exitCode = 1;
        return;
      }
    }

    const server = createStaticPreviewServer();
    await new Promise((resolve) => server.listen(options.port || 0, '127.0.0.1', resolve));
    cleanupState.serverInstance = server;
    const localPort = server.address().port;
    console.log(`[HTTP] Local preview server listening on http://127.0.0.1:${localPort}`);

    // 5. Establish ADB Reverse Proxy (Defect 8: Failure must not quietly continue)
    const reverseRes = await runExec(adbPath, ['-s', targetSerial, 'reverse', `tcp:${localPort}`, `tcp:${localPort}`]);
    if (reverseRes.code !== 0) {
      console.error(`\n[ADB QA] FATAL: adb reverse tcp:${localPort} failed: ${reverseRes.stderr || reverseRes.stdout}`);
      const transportFailReport = {
        status: 'TRANSPORT_FAILED',
        harnessState: 'ADB_REVERSE_FAILED',
        timestamp: new Date().toISOString(),
        device: fingerprint,
        error: `adb reverse tcp:${localPort} failed: ${reverseRes.stderr || reverseRes.stdout}`,
      };
      fs.writeFileSync(path.join(runOutputDir, 'run-report.json'), JSON.stringify(transportFailReport, null, 2));
      process.exitCode = 1;
      return;
    }
    cleanupState.reversedPort = localPort;
    console.log(`[ADB] Established reverse proxy: device localhost:${localPort} -> host 127.0.0.1:${localPort}`);

    const appUrl = `http://localhost:${localPort}/Star_System_Planner/`;

    // 6. Launch Chrome on Device
    console.log(`[ADB] Launching Chrome on device: ${appUrl}`);
    await runExec(adbPath, ['-s', targetSerial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', appUrl, 'com.android.chrome']);

    // Allow Chrome to spawn and register its devtools socket
    await new Promise(r => setTimeout(r, 2500));

    // 7. Discover Remote DevTools Socket on Device
    console.log('[CDP] Searching for Chrome remote devtools socket...');
    let candidateSockets = [];
    for (let attempt = 0; attempt < 8; attempt++) {
      const unixRes = await runExec(adbPath, ['-s', targetSerial, 'shell', 'cat', '/proc/net/unix']);
      if (unixRes.stdout) {
        const matches = Array.from(unixRes.stdout.matchAll(/@(chrome_devtools_remote(?:_\d+)?)/g)).map(m => m[1]);
        if (matches.length > 0) {
          // Prioritize PID-specific sockets (e.g. chrome_devtools_remote_11843) over generic socket
          candidateSockets = Array.from(new Set(matches)).sort((a, b) => {
            const aHasPid = /_\d+$/.test(a);
            const bHasPid = /_\d+$/.test(b);
            if (aHasPid && !bHasPid) return -1;
            if (!aHasPid && bHasPid) return 1;
            return 0;
          }).map(s => `localabstract:${s}`);
          break;
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (candidateSockets.length === 0) {
      candidateSockets = ['localabstract:chrome_devtools_remote'];
    }

    console.log(`[CDP] Candidate devtools sockets found: ${candidateSockets.join(', ')}`);

    const hostCdpPort = options.cdpPort || 9222;
    let connectedDevtoolsSocket = null;
    let pageTarget = null;

    // Try each candidate socket until one responds to /json/list
    for (const devtoolsSocket of candidateSockets) {
      console.log(`[CDP] Testing socket: ${devtoolsSocket} (forwarding to host tcp:${hostCdpPort})...`);
      await runExec(adbPath, ['-s', targetSerial, 'forward', '--remove', `tcp:${hostCdpPort}`]);
      const forwardRes = await runExec(adbPath, ['-s', targetSerial, 'forward', `tcp:${hostCdpPort}`, devtoolsSocket]);
      if (forwardRes.code !== 0) continue;

      cleanupState.forwardedPort = hostCdpPort;

      // Probe /json/list with timeout
      for (let i = 0; i < 6; i++) {
        try {
          const resp = await fetch(`http://127.0.0.1:${hostCdpPort}/json/list`, {
            signal: AbortSignal.timeout(2000),
          });
          if (resp.ok) {
            const targets = await resp.json();
            pageTarget = targets.find(t => t.url && t.url.includes('/Star_System_Planner/')) ||
                         targets.find(t => t.type === 'page' && !t.url.startsWith('chrome-devtools://'));
            if (pageTarget && pageTarget.webSocketDebuggerUrl) {
              connectedDevtoolsSocket = devtoolsSocket;
              break;
            }
          }
        } catch {}
        await new Promise(r => setTimeout(r, 500));
      }

      if (connectedDevtoolsSocket) break;
    }

    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      console.error('[CDP] ERROR: Could not find accessible Chrome page target for STARSILK SYSTEM PLANNER.');
      await captureDeviceScreenshot(adbPath, targetSerial, null, null, path.join(runOutputDir, '00-cdp-discovery-failed.png'));
      process.exitCode = 1;
      return;
    }

    console.log(`[CDP] Attached to page target: ${pageTarget.title || 'Untitled'} (${pageTarget.url})`);
    const cdpClient = new CDPClient(pageTarget.webSocketDebuggerUrl);
    cleanupState.cdpClient = cdpClient;
    await cdpClient.connect();

    await cdpClient.send('Page.enable');
    await cdpClient.send('Runtime.enable');
    await cdpClient.send('DOM.enable');

    // Auto-respond to window.prompt dialogs (for branch forking)
    cdpClient.on('Page.javascriptDialogOpening', async () => {
      try {
        await cdpClient.send('Page.handleJavaScriptDialog', {
          accept: true,
          promptText: 'Branch Alpha',
        });
      } catch {}
    });

    // 9. Live Runtime Telemetry
    console.log('[Browser] Querying live browser runtime telemetry...');
    const browserTelemetry = await cdpClient.evaluate(`
      (() => {
        const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
        const debugInfo = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
        const gpuRenderer = gl && debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
        const gpuVendor = gl && debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';

        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
          userAgent: navigator.userAgent,
          gpuVendor,
          gpuRenderer,
          hasUniverseCanvas: !!document.querySelector('canvas.universe-canvas'),
        };
      })()
    `);
    console.log('  Viewport:    ', `${browserTelemetry.viewportWidth}x${browserTelemetry.viewportHeight} (DPR: ${browserTelemetry.devicePixelRatio})`);
    console.log('  GPU Renderer:', browserTelemetry.gpuRenderer);

    // ==========================================
    // Structured Journey State Machine (Defect 7, 11)
    // ==========================================
    const journeyResults = {
      overallVerdict: 'FAIL',
      steps: {
        loadAndMount: {
          action: 'Mount universe canvas in Chrome',
          preState: 'DOM loading',
          postState: null,
          oracle: 'canvas.universe-canvas element present and mounted in DOM',
          verdict: 'NOT_RUN',
          reason: null,
        },
        bodySelected: {
          action: 'Select celestial body via canvas pointer click',
          preState: null,
          postState: null,
          oracle: 'Context inspector panel (.right-inspector-panel) visible and .body-name-input contains non-empty name',
          verdict: 'NOT_RUN',
          reason: null,
        },
        fateLensActivated: {
          action: 'Activate Fate Lens via ToolRail FATE button',
          preState: null,
          postState: null,
          oracle: 'Fate Lens HUD badge (.fate-lens-badge) rendered with THEN, NOW, POSSIBLE triad nodes',
          verdict: 'NOT_RUN',
          reason: null,
        },
        temporalEchoAccumulation: {
          action: 'Advance simulation time and verify temporal echo accumulation',
          preState: null,
          postState: null,
          oracle: 'Echo count in .triad-sub increased (postCount > preCount)',
          verdict: 'NOT_RUN',
          reason: null,
        },
        temporalScrubRewind: {
          action: 'Scrub timeline / switch to earlier branch snapshot',
          preState: null,
          postState: null,
          oracle: 'Active timeline branch changed and simulation time rewound',
          verdict: 'NOT_RUN',
          reason: null,
        },
        bodySwitchApertureReanchor: {
          action: 'Select a different celestial body while Fate Lens is active',
          preState: null,
          postState: null,
          oracle: 'Selected body identity changed AND .fate-lens-name matches new target',
          verdict: 'NOT_RUN',
          reason: null,
        },
        scaleModeAdjusted: {
          action: 'Toggle scale mode via TopBar button',
          preState: null,
          postState: null,
          oracle: 'TopBar scale button transitioned between READABLE and TRUE SCALE',
          verdict: 'NOT_RUN',
          reason: null,
        },
        fateLensDeactivated: {
          action: 'Deactivate Fate Lens via badge close button',
          preState: 'Fate Lens active',
          postState: null,
          oracle: 'UI teardown verified: .fate-lens-badge removed from DOM and FATE tool button no longer active',
          verdict: 'NOT_RUN',
          reason: null,
        },
        fateLensReactivated: {
          action: 'Re-activate Fate Lens to verify lifecycle integrity',
          preState: 'Fate Lens inactive',
          postState: null,
          oracle: 'Fate Lens HUD badge mounts cleanly without stale or orphaned state',
          verdict: 'NOT_RUN',
          reason: null,
        },
        finalCleanState: {
          action: 'Final UI deactivation and teardown audit',
          preState: 'Fate Lens active',
          postState: null,
          oracle: 'UI teardown verified: badge removed, FATE tool inactive, inspector disengaged',
          verdict: 'NOT_RUN',
          reason: null,
        },
        workerCapabilityVerified: {
          action: 'Verify Web Worker computation thread pool on physical device (BACK44)',
          preState: null,
          postState: null,
          oracle: 'typeof Worker !== undefined AND worker pool dispatches & correlates compute task',
          verdict: 'NOT_RUN',
          reason: null,
        },
      },
    };

    // Step 1: Load & Mount Universe Canvas
    console.log('[Step 1] Waiting for Universe Canvas to mount...');
    let canvasMounted = false;
    for (let i = 0; i < 30; i++) {
      const hasCanvas = await cdpClient.evaluate(`!!document.querySelector('canvas.universe-canvas')`);
      if (hasCanvas) {
        canvasMounted = true;
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    if (canvasMounted) {
      journeyResults.steps.loadAndMount.verdict = 'PASS';
      journeyResults.steps.loadAndMount.postState = 'canvas.universe-canvas mounted and active';
    } else {
      journeyResults.steps.loadAndMount.verdict = 'FAIL';
      journeyResults.steps.loadAndMount.reason = 'Universe canvas failed to mount within 15 seconds';
    }
    await captureDeviceScreenshot(adbPath, targetSerial, cdpClient, null, path.join(runOutputDir, '01-device-loaded.png'));

    // Baseline Frame Pacing (ordinary simulation)
    console.log(`\n[Pacing] Measuring baseline frame pacing (${options.duration}s)...`);
    const baselinePacing = await measureFramePacing(cdpClient, null, options.duration * 1000);
    console.log(`  Baseline FPS:       ${baselinePacing.observedFps}`);
    console.log(`  Median interval:    ${baselinePacing.medianIntervalMs} ms`);
    console.log(`  P95 interval:       ${baselinePacing.p95IntervalMs} ms`);

    // Step 2: Body Selection Oracle (Defect 1)
    console.log('\n[Step 2] Testing celestial body selection with causation oracle...');
    const preSelection = await cdpClient.evaluate(`
      (() => {
        const inspector = document.querySelector('.right-inspector-panel');
        const input = document.querySelector('.body-name-input');
        return {
          hasInspector: !!inspector,
          selectedName: input ? input.value.trim() : null,
        };
      })()
    `);
    const preName = preSelection.selectedName;
    journeyResults.steps.bodySelected.preState = preName ? `Selected: "${preName}"` : 'none';

    // Dispatch select action on canvas center
    await cdpClient.evaluate(`
      (() => {
        const canvas = document.querySelector('canvas.universe-canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const selectBtn = Array.from(document.querySelectorAll('.left-tool-rail .tool-button')).find(b => b.textContent.includes('SELECT'));
        selectBtn?.click();

        canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, buttons: 1, pointerType: 'mouse' }));
        canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, buttons: 0, pointerType: 'mouse' }));
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    const postSelection = await cdpClient.evaluate(`
      (() => {
        const inspector = document.querySelector('.right-inspector-panel');
        const input = document.querySelector('.body-name-input');
        return {
          hasInspector: !!inspector,
          selectedName: input ? input.value.trim() : null,
        };
      })()
    `);
    const postName = postSelection.selectedName;
    journeyResults.steps.bodySelected.postState = postName ? `Selected: "${postName}"` : 'none';

    const causationProven =
      (!preName && !!postName && postSelection.hasInspector) ||
      (!!preName && !!postName && postSelection.hasInspector && preName !== postName);

    if (causationProven) {
      journeyResults.steps.bodySelected.verdict = 'PASS';
      console.log(`  Body Selection Oracle: PASS (Selected: "${postName}", was: "${preName || 'none'}")`);
    } else {
      journeyResults.steps.bodySelected.verdict = 'FAIL';
      journeyResults.steps.bodySelected.reason = `Selection causation not proven (pre: "${preName || 'none'}", post: "${postName || 'none'}")`;
      console.error(`  Body Selection Oracle: FAIL (${journeyResults.steps.bodySelected.reason})`);
    }
    await captureDeviceScreenshot(adbPath, targetSerial, cdpClient, null, path.join(runOutputDir, '02-body-selected.png'));

    // Step 3: Activate Fate Lens
    console.log('\n[Step 3] Activating Fate Lens via ToolRail...');
    await cdpClient.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('.left-tool-rail .tool-button'));
        const fateBtn = btns.find(b => b.textContent.includes('FATE'));
        fateBtn?.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    const fateAudit = await cdpClient.evaluate(`
      (() => {
        const badge = document.querySelector('.fate-lens-badge');
        const badgeText = badge ? badge.innerText : '';
        const hasThen = badgeText.includes('THEN');
        const hasNow = badgeText.includes('NOW');
        const hasPossible = badgeText.includes('POSSIBLE');
        const inspectorText = document.querySelector('.right-inspector-panel')?.innerText || '';
        const hasInspector = inspectorText.includes('FATE LENS') || inspectorText.includes('CAUSALITY');
        return {
          hasBadge: !!badge,
          hasThen,
          hasNow,
          hasPossible,
          hasInspector,
          badgeName: document.querySelector('.fate-lens-name')?.textContent?.trim() || '',
        };
      })()
    `);

    if (fateAudit.hasBadge && fateAudit.hasThen && fateAudit.hasNow && fateAudit.hasPossible) {
      journeyResults.steps.fateLensActivated.verdict = 'PASS';
      journeyResults.steps.fateLensActivated.postState = `Aperture active for "${fateAudit.badgeName}" (THEN → NOW → POSSIBLE triad verified)`;
      console.log('  Fate Lens Activation Oracle: PASS (Triad verified)');
    } else {
      journeyResults.steps.fateLensActivated.verdict = 'FAIL';
      journeyResults.steps.fateLensActivated.reason = 'Causality Aperture badge did not render THEN/NOW/POSSIBLE triad nodes';
      console.error('  Fate Lens Activation Oracle: FAIL');
    }
    await captureDeviceScreenshot(adbPath, targetSerial, cdpClient, null, path.join(runOutputDir, '03-fate-lens-active.png'));

    // Fork a branch before advancing time (so past branch rewind can be tested)
    await cdpClient.evaluate(`
      (() => {
        window.prompt = (msg, def) => def || 'Branch Alpha';
        const forkBtn = Array.from(document.querySelectorAll('.bottom-timeline-bar button')).find(b =>
          b.textContent && b.textContent.includes('FORK')
        );
        forkBtn?.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    // Step 4: Temporal Echo Accumulation Oracle (Defect 2)
    console.log('\n[Step 4] Testing temporal echo accumulation with real before/after oracle...');
    const preEcho = await cdpClient.evaluate(`
      (() => {
        const triadSub = document.querySelector('.triad-sub');
        const text = triadSub ? triadSub.textContent.trim() : '';
        const match = text.match(/\\((\\d+)\\)/);
        return match ? parseInt(match[1], 10) : 0;
      })()
    `);
    journeyResults.steps.temporalEchoAccumulation.preState = `echoCount: ${preEcho}`;

    // Advance simulation through existing UI rate button (10,000x for perceptible progression)
    console.log('  Advancing simulation rate to 10,000x...');
    await cdpClient.evaluate(`
      (() => {
        const rateBtns = Array.from(document.querySelectorAll('.bottom-timeline-bar .rate-btn'));
        const fastBtn = rateBtns.find(b => b.textContent.includes('10,000') || b.textContent.includes('10000')) ||
                        rateBtns.find(b => b.textContent.includes('1,000') || b.textContent.includes('1000')) ||
                        rateBtns[rateBtns.length - 1];
        fastBtn?.click();
      })()
    `);

    // Measure active Fate Lens frame pacing while simulation advances
    console.log(`  Measuring active Fate Lens frame pacing (${options.duration}s)...`);
    const activePacing = await measureFramePacing(cdpClient, null, options.duration * 1000);
    console.log(`  Active Fate Lens FPS: ${activePacing.observedFps}`);
    console.log(`  Median interval:      ${activePacing.medianIntervalMs} ms`);

    const postEcho = await cdpClient.evaluate(`
      (() => {
        const triadSub = document.querySelector('.triad-sub');
        const text = triadSub ? triadSub.textContent.trim() : '';
        const match = text.match(/\\((\\d+)\\)/);
        return match ? parseInt(match[1], 10) : 0;
      })()
    `);
    journeyResults.steps.temporalEchoAccumulation.postState = `echoCount: ${postEcho}`;

    if (postEcho > preEcho) {
      journeyResults.steps.temporalEchoAccumulation.verdict = 'PASS';
      console.log(`  Temporal Echo Oracle: PASS (Echoes grew from ${preEcho} to ${postEcho})`);
    } else {
      journeyResults.steps.temporalEchoAccumulation.verdict = 'FAIL';
      journeyResults.steps.temporalEchoAccumulation.reason = `Temporal echoes did not accumulate (pre: ${preEcho}, post: ${postEcho})`;
      console.error(`  Temporal Echo Oracle: FAIL (pre: ${preEcho}, post: ${postEcho})`);
    }

    // Step 5: Rewind Oracle (Defect 3)
    console.log('\n[Step 5] Testing timeline rewind with numerical backward oracle...');

    // Fork a new branch to create an alternate timeline branch from advanced state
    console.log('  Creating alternate timeline branch via FORK FUTURE...');
    await cdpClient.evaluate(`
      (() => {
        window.prompt = (msg, def) => def || 'Branch Beta';
        const btns = Array.from(document.querySelectorAll('.bottom-timeline-bar button'));
        const forkBtn = btns.find(b => b.textContent && b.textContent.includes('FORK'));
        forkBtn?.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // Advance simulation on the newly forked branch
    console.log('  Advancing simulation on new branch at 10,000x...');
    await cdpClient.evaluate(`
      (() => {
        const rateBtns = Array.from(document.querySelectorAll('.bottom-timeline-bar .rate-btn'));
        const fastBtn = rateBtns.find(b => b.textContent.includes('10,000') || b.textContent.includes('10000')) ||
                        rateBtns.find(b => b.textContent.includes('1,000') || b.textContent.includes('1000')) ||
                        rateBtns[rateBtns.length - 1];
        fastBtn?.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1500));

    const preRewind = await cdpClient.evaluate(`
      (() => {
        const select = document.querySelector('.bottom-timeline-bar select');
        const timeSpan = document.querySelector('.bottom-timeline-bar span[style*="font-weight: 600"]');
        const timeText = timeSpan ? timeSpan.textContent.trim() : '';
        return {
          optionsCount: select ? select.options.length : 0,
          activeBranchId: select ? select.value : null,
          activeBranchText: select && select.selectedIndex >= 0 ? select.options[select.selectedIndex].text : '',
          targetBranchId: select && select.options.length > 0 ? select.options[0].value : null,
          targetBranchText: select && select.options.length > 0 ? select.options[0].text : '',
          timeText,
        };
      })()
    `);

    const preTimeSec = parseSimTimeToSeconds(preRewind.timeText);
    journeyResults.steps.temporalScrubRewind.preState = `Branch: "${preRewind.activeBranchText}", Time: ${preRewind.timeText} (${preTimeSec}s)`;

    if (preRewind.optionsCount > 1 && preRewind.targetBranchId && preRewind.targetBranchId !== preRewind.activeBranchId) {
      console.log(`  Switching back to earlier branch "${preRewind.targetBranchText}"...`);
      await cdpClient.evaluate(`
        ((targetId) => {
          const select = document.querySelector('.bottom-timeline-bar select');
          if (select) {
            select.value = targetId;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })('${preRewind.targetBranchId}')
      `);
      await new Promise(r => setTimeout(r, 800));

      const postRewind = await cdpClient.evaluate(`
        (() => {
          const select = document.querySelector('.bottom-timeline-bar select');
          const timeSpan = document.querySelector('.bottom-timeline-bar span[style*="font-weight: 600"]');
          const timeText = timeSpan ? timeSpan.textContent.trim() : '';
          return {
            activeBranchId: select ? select.value : null,
            activeBranchText: select && select.selectedIndex >= 0 ? select.options[select.selectedIndex].text : '',
            timeText,
          };
        })()
      `);

      const postTimeSec = parseSimTimeToSeconds(postRewind.timeText);
      journeyResults.steps.temporalScrubRewind.postState = `Branch: "${postRewind.activeBranchText}", Time: ${postRewind.timeText} (${postTimeSec}s)`;

      if (postRewind.activeBranchId !== preRewind.activeBranchId && postTimeSec < preTimeSec) {
        journeyResults.steps.temporalScrubRewind.verdict = 'PASS';
        console.log(`  Rewind Oracle: PASS (Switched branch and rewound time: ${preTimeSec}s -> ${postTimeSec}s)`);
      } else if (postRewind.activeBranchId !== preRewind.activeBranchId && postTimeSec >= preTimeSec) {
        journeyResults.steps.temporalScrubRewind.verdict = 'FAIL';
        journeyResults.steps.temporalScrubRewind.reason = `Switched branch but simulation time did not move backward (pre: ${preTimeSec}s, post: ${postTimeSec}s)`;
        console.error(`  Rewind Oracle: FAIL (${journeyResults.steps.temporalScrubRewind.reason})`);
      } else {
        journeyResults.steps.temporalScrubRewind.verdict = 'FAIL';
        journeyResults.steps.temporalScrubRewind.reason = 'Active branch did not change after branch selector dispatch';
        console.error('  Rewind Oracle: FAIL (Active branch unchanged)');
      }
    } else {
      journeyResults.steps.temporalScrubRewind.verdict = 'SKIPPED_WITH_REASON';
      journeyResults.steps.temporalScrubRewind.reason = 'Secondary branch not available or failed to fork';
      console.log('  Rewind Oracle: SKIPPED_WITH_REASON (Secondary branch not available)');
    }
    await captureDeviceScreenshot(adbPath, targetSerial, cdpClient, null, path.join(runOutputDir, '04-temporal-scrub.png'));

    // Step 6: Body Switch & Aperture Re-Anchor Oracle (Defect 4)
    console.log('\n[Step 6] Testing body switch & aperture re-anchoring with dual verification oracle...');
    const preSwitch = await cdpClient.evaluate(`
      (() => {
        const badgeName = document.querySelector('.fate-lens-name')?.textContent?.trim() || '';
        const inputName = document.querySelector('.body-name-input')?.value?.trim() || '';
        return { badgeName, inputName };
      })()
    `);
    journeyResults.steps.bodySwitchApertureReanchor.preState = `Target: "${preSwitch.badgeName || preSwitch.inputName}"`;

    // Zoom camera out so planetary bodies are in view and obtain screen position
    const targetCoords = await cdpClient.evaluate(`
      (() => {
        const sm = window.__sceneMgr;
        if (!sm) return null;
        sm.zoomCamera(4.0);
        sm.render();

        const curName = (document.querySelector('.fate-lens-name')?.textContent || '').toLowerCase();
        const candidateId = curName.includes('pyros') ? 'thera' : 'pyros';
        return sm.getBodyScreenPosition(candidateId);
      })()
    `);

    // Ensure SELECT tool is active
    await cdpClient.evaluate(`
      (() => {
        const selectBtn = Array.from(document.querySelectorAll('.left-tool-rail .tool-button')).find(b => b.textContent.includes('SELECT'));
        selectBtn?.click();
      })()
    `);

    if (targetCoords && targetCoords.x > 0 && targetCoords.y > 0) {
      console.log(`  Dispatching pointer click on body at screen (${Math.round(targetCoords.x)}, ${Math.round(targetCoords.y)})...`);
      await cdpClient.evaluate(`
        ((coords) => {
          const canvas = document.querySelector('canvas.universe-canvas');
          if (!canvas) return;
          canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: coords.x, clientY: coords.y, buttons: 1, pointerType: 'mouse' }));
          canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: coords.x, clientY: coords.y, buttons: 0, pointerType: 'mouse' }));
        })(${JSON.stringify(targetCoords)})
      `);
    } else {
      // Fallback: sweep radiating canvas points
      await cdpClient.evaluate(`
        (() => {
          const canvas = document.querySelector('canvas.universe-canvas');
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;

          const initialBadgeName = document.querySelector('.fate-lens-name')?.textContent?.trim() || '';
          const initialInputName = document.querySelector('.body-name-input')?.value?.trim() || '';

          const radii = [100, 180, 260, 340, 420];
          const angleCount = 12;

          for (const r of radii) {
            for (let a = 0; a < angleCount; a++) {
              const theta = (a / angleCount) * Math.PI * 2;
              const px = cx + Math.cos(theta) * r;
              const py = cy + Math.sin(theta) * r;

              canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: px, clientY: py, buttons: 1, pointerType: 'mouse' }));
              canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: px, clientY: py, buttons: 0, pointerType: 'mouse' }));

              const curBadge = document.querySelector('.fate-lens-name')?.textContent?.trim() || '';
              const curInput = document.querySelector('.body-name-input')?.value?.trim() || '';

              if (curBadge && curBadge !== initialBadgeName && curInput && curInput !== initialInputName) {
                return;
              }
            }
          }
        })()
      `);
    }
    await new Promise(r => setTimeout(r, 600));

    const postSwitch = await cdpClient.evaluate(`
      (() => {
        const badgeName = document.querySelector('.fate-lens-name')?.textContent?.trim() || '';
        const inputName = document.querySelector('.body-name-input')?.value?.trim() || '';
        return { badgeName, inputName };
      })()
    `);
    journeyResults.steps.bodySwitchApertureReanchor.postState = `Target: "${postSwitch.badgeName || postSwitch.inputName}"`;

    const identityChanged = postSwitch.inputName && postSwitch.inputName !== preSwitch.inputName;
    const apertureReanchored = postSwitch.badgeName && postSwitch.badgeName !== preSwitch.badgeName &&
                               postSwitch.badgeName.toUpperCase() === postSwitch.inputName.toUpperCase();

    if (identityChanged && apertureReanchored) {
      journeyResults.steps.bodySwitchApertureReanchor.verdict = 'PASS';
      console.log(`  Body Switch Oracle: PASS (Switched to "${postSwitch.badgeName}" and aperture re-anchored)`);
    } else {
      journeyResults.steps.bodySwitchApertureReanchor.verdict = 'FAIL';
      journeyResults.steps.bodySwitchApertureReanchor.reason = `Selection identity or aperture failed to update to new target (pre: "${preSwitch.badgeName}", post: "${postSwitch.badgeName}")`;
      console.error(`  Body Switch Oracle: FAIL (Identity changed: ${!!identityChanged}, Aperture re-anchored: ${!!apertureReanchored})`);
    }
    await captureDeviceScreenshot(adbPath, targetSerial, cdpClient, null, path.join(runOutputDir, '05-body-switch.png'));

    // Step 7: Scale Mode Adjustment Oracle (Defect 5)
    console.log('\n[Step 7] Testing scale mode toggle with real state transition oracle...');
    const preScale = await cdpClient.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('.top-hud-bar button, .top-bar button')).find(b =>
          b.textContent && (b.textContent.includes('READABLE') || b.textContent.includes('TRUE SCALE'))
        );
        if (!btn) return { found: false };
        const text = btn.textContent.trim();
        const mode = text.includes('TRUE') ? 'true' : (text.includes('READABLE') ? 'readable' : 'unknown');
        return { found: true, mode };
      })()
    `);

    if (!preScale.found) {
      journeyResults.steps.scaleModeAdjusted.verdict = 'FAIL';
      journeyResults.steps.scaleModeAdjusted.reason = 'Scale toggle button not found in TopBar HUD';
      console.error('  Scale Mode Oracle: FAIL (Button not found)');
    } else {
      journeyResults.steps.scaleModeAdjusted.preState = `mode: ${preScale.mode}`;

      // Click scale toggle button
      await cdpClient.evaluate(`
        (() => {
          const btn = Array.from(document.querySelectorAll('.top-hud-bar button, .top-bar button')).find(b =>
            b.textContent && (b.textContent.includes('READABLE') || b.textContent.includes('TRUE SCALE'))
          );
          btn?.click();
        })()
      `);
      await new Promise(r => setTimeout(r, 400));

      const postScale = await cdpClient.evaluate(`
        (() => {
          const btn = Array.from(document.querySelectorAll('.top-hud-bar button, .top-bar button')).find(b =>
            b.textContent && (b.textContent.includes('READABLE') || b.textContent.includes('TRUE SCALE'))
          );
          if (!btn) return { found: false };
          const text = btn.textContent.trim();
          const mode = text.includes('TRUE') ? 'true' : (text.includes('READABLE') ? 'readable' : 'unknown');
          return { found: true, mode };
        })()
      `);
      journeyResults.steps.scaleModeAdjusted.postState = `mode: ${postScale.mode}`;

      if (postScale.found && postScale.mode !== 'unknown' && postScale.mode !== preScale.mode) {
        journeyResults.steps.scaleModeAdjusted.verdict = 'PASS';
        console.log(`  Scale Mode Oracle: PASS (Toggled from ${preScale.mode} to ${postScale.mode})`);
      } else {
        journeyResults.steps.scaleModeAdjusted.verdict = 'FAIL';
        journeyResults.steps.scaleModeAdjusted.reason = `Scale mode did not change state (pre: ${preScale.mode}, post: ${postScale.mode})`;
        console.error('  Scale Mode Oracle: FAIL (Mode unchanged)');
      }
    }

    // Step 8: Deactivate Fate Lens & Verify UI Teardown (Defect 6)
    console.log('\n[Step 8] Deactivating Fate Lens and auditing UI teardown...');
    await cdpClient.evaluate(`
      (() => {
        const closeBtn = document.querySelector('.fate-lens-close-btn');
        closeBtn?.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 500));

    const deactAudit = await cdpClient.evaluate(`
      (() => {
        const badge = document.querySelector('.fate-lens-badge');
        const fateBtnActive = !!document.querySelector('.left-tool-rail .tool-button.active')?.textContent.includes('FATE');
        return {
          badgeAbsent: !badge,
          fateBtnInactive: !fateBtnActive,
        };
      })()
    `);

    if (deactAudit.badgeAbsent && deactAudit.fateBtnInactive) {
      journeyResults.steps.fateLensDeactivated.verdict = 'PASS';
      journeyResults.steps.fateLensDeactivated.postState = 'UI teardown verified (badge removed, tool deactivated)';
      console.log('  Fate Lens Deactivation Oracle: PASS (UI teardown verified)');
    } else {
      journeyResults.steps.fateLensDeactivated.verdict = 'FAIL';
      journeyResults.steps.fateLensDeactivated.reason = 'Badge still present or FATE tool remained active after close button click';
      console.error('  Fate Lens Deactivation Oracle: FAIL');
    }
    await captureDeviceScreenshot(adbPath, targetSerial, cdpClient, null, path.join(runOutputDir, '06-fate-lens-deactivated.png'));

    // Step 9: Re-activate Fate Lens (Lifecycle Check)
    console.log('\n[Step 9] Re-activating Fate Lens for lifecycle check...');
    await cdpClient.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('.left-tool-rail .tool-button'));
        const fateBtn = btns.find(b => b.textContent.includes('FATE'));
        fateBtn?.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    const reactAudit = await cdpClient.evaluate(`
      (() => {
        const badge = document.querySelector('.fate-lens-badge');
        return { hasBadge: !!badge };
      })()
    `);

    if (reactAudit.hasBadge) {
      journeyResults.steps.fateLensReactivated.verdict = 'PASS';
      journeyResults.steps.fateLensReactivated.postState = 'Badge mounted cleanly on re-activation';
      console.log('  Lifecycle Re-activation Oracle: PASS');
    } else {
      journeyResults.steps.fateLensReactivated.verdict = 'FAIL';
      journeyResults.steps.fateLensReactivated.reason = 'Badge failed to mount on secondary activation';
      console.error('  Lifecycle Re-activation Oracle: FAIL');
    }

    // Step 10: Final Clean State Audit (Defect 6)
    console.log('\n[Step 10] Performing final UI teardown audit...');
    await cdpClient.evaluate(`
      (() => {
        const closeBtn = document.querySelector('.fate-lens-close-btn');
        closeBtn?.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 400));

    const finalAudit = await cdpClient.evaluate(`
      (() => {
        const badge = document.querySelector('.fate-lens-badge');
        const fateBtnActive = !!document.querySelector('.left-tool-rail .tool-button.active')?.textContent.includes('FATE');
        const inspectorText = document.querySelector('.right-inspector-panel')?.innerText || '';
        const fateInspectorActive = inspectorText.includes('THEN → NOW → POSSIBLE') ||
          (inspectorText.includes('FATE LENS') && inspectorText.includes('ACTIVE'));

        return {
          badgeAbsent: !badge,
          fateBtnInactive: !fateBtnActive,
          fateInspectorInactive: !fateInspectorActive,
        };
      })()
    `);

    if (finalAudit.badgeAbsent && finalAudit.fateBtnInactive && finalAudit.fateInspectorInactive) {
      journeyResults.steps.finalCleanState.verdict = 'PASS';
      journeyResults.steps.finalCleanState.postState = 'UI teardown verified (badge removed, tool inactive, inspector disengaged)';
      console.log('  Final Clean State Oracle: PASS (UI teardown verified)');
    } else {
      journeyResults.steps.finalCleanState.verdict = 'FAIL';
      journeyResults.steps.finalCleanState.reason = `Residual Fate Lens UI state detected (badgeAbsent: ${finalAudit.badgeAbsent}, toolInactive: ${finalAudit.fateBtnInactive}, inspectorInactive: ${finalAudit.fateInspectorInactive})`;
      console.error('  Final Clean State Oracle: FAIL');
    }

    // Step 11: Web Worker Thread Pool Physical Device Proof (BACK44)
    console.log('\n[Step 11] Verifying Web Worker thread pool execution on physical device (BACK44)...');
    let workerAudit = null;
    try {
      workerAudit = await cdpClient.evaluate(`
        (async () => {
          const hasWorker = typeof Worker !== 'undefined';
          const pool = window.__starsilk_worker_pool__;
          if (!hasWorker) {
            return { supported: false, error: 'typeof Worker is undefined on device' };
          }
          if (!pool) {
            return { supported: true, hasPool: false, error: 'window.__starsilk_worker_pool__ not found' };
          }

          const workerCount = typeof pool.getWorkerCount === 'function' ? pool.getWorkerCount() : 0;
          const usingRealWorkers = typeof pool.isUsingRealWorkers === 'function' ? pool.isUsingRealWorkers() : false;

          const t0 = performance.now();
          // Dispatch nbody_propagation task to worker pool
          const testBodies = [
            { id: 'sun', massKg: 1.989e30, radiusKm: 696340, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, fixed: true },
            { id: 'test_probe', massKg: 1000, radiusKm: 10, position: { x: 1.496e8, y: 0, z: 0 }, velocity: { x: 0, y: 29.78, z: 0 }, fixed: false },
          ];

          const taskResult = await pool.enqueue('nbody_propagation', {
            bodies: testBodies,
            stepDtSeconds: 86400,
            totalSteps: 50,
          });
          const elapsedMs = performance.now() - t0;

          const activeCountAfter = typeof pool.getActiveWorkerCount === 'function' ? pool.getActiveWorkerCount() : 0;

          return {
            supported: true,
            hasPool: true,
            workerCount,
            usingRealWorkers,
            elapsedMs,
            completedSteps: taskResult?.completedSteps,
            probeFinalY: taskResult?.finalBodies?.[1]?.position?.y,
            activeCountAfter,
          };
        })()
      `);

      if (workerAudit.supported && workerAudit.hasPool && workerAudit.completedSteps === 50 && typeof workerAudit.probeFinalY === 'number') {
        journeyResults.steps.workerCapabilityVerified.verdict = 'PASS';
        journeyResults.steps.workerCapabilityVerified.postState = `Worker pool operational (${workerAudit.workerCount} workers, real: ${workerAudit.usingRealWorkers}, elapsed: ${workerAudit.elapsedMs.toFixed(2)}ms, completedSteps: ${workerAudit.completedSteps})`;
        console.log(`  Web Worker Thread Pool Oracle: PASS (${journeyResults.steps.workerCapabilityVerified.postState})`);
      } else {
        journeyResults.steps.workerCapabilityVerified.verdict = 'FAIL';
        journeyResults.steps.workerCapabilityVerified.reason = workerAudit?.error || `Worker execution invalid (completedSteps: ${workerAudit?.completedSteps})`;
        console.error(`  Web Worker Thread Pool Oracle: FAIL (${journeyResults.steps.workerCapabilityVerified.reason})`);
      }
    } catch (err) {
      journeyResults.steps.workerCapabilityVerified.verdict = 'FAIL';
      journeyResults.steps.workerCapabilityVerified.reason = `Worker evaluation error: ${err.message}`;
      console.error(`  Web Worker Thread Pool Oracle: FAIL (${err.message})`);
    }

    // 13. S Pen & Palm Rejection Mode (if --pen enabled)
    let sPenTelemetry = {
      tested: false,
      status: 'S PEN: NOT TESTED (run with npm run qa:android:pen for assisted S Pen QA)',
      penEventCount: 0,
      pressure: null,
      tilt: null,
      coalescedCount: 0,
      palmRejectionObservation: 'NO HUMAN PALM-REJECTION TEST PERFORMED',
    };

    if (options.pen) {
      console.log('\n================================================================================');
      console.log('[S PEN & PALM REJECTION INTERACTIVE QA MODE]');
      console.log(`Waiting up to ${options.timeout}s for real S Pen stylus events on tablet display...`);
      console.log('Action: Draw an orbit stroke with S Pen now while resting your palm on the screen.');
      console.log('================================================================================\n');

      await cdpClient.evaluate(`
        (() => {
          window.__sPenRecords = {
            penEvents: [],
            touchEvents: [],
            startTime: performance.now(),
          };
          const canvas = document.querySelector('canvas.universe-canvas');
          if (!canvas) return;

          const handler = (e) => {
            const rec = {
              type: e.type,
              pointerType: e.pointerType,
              pointerId: e.pointerId,
              clientX: Math.round(e.clientX),
              clientY: Math.round(e.clientY),
              pressure: parseFloat(e.pressure.toFixed(4)),
              tiltX: e.tiltX,
              tiltY: e.tiltY,
              twist: e.twist || 0,
              tangentialPressure: e.tangentialPressure || 0,
              width: e.width,
              height: e.height,
              buttons: e.buttons,
              button: e.button,
              timestamp: performance.now(),
              coalescedCount: typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents().length : 1,
            };
            if (e.pointerType === 'pen') {
              window.__sPenRecords.penEvents.push(rec);
            } else if (e.pointerType === 'touch') {
              window.__sPenRecords.touchEvents.push(rec);
            }
          };

          ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(ev => {
            canvas.addEventListener(ev, handler, { passive: true });
          });
        })()
      `);

      const pollInterval = 500;
      const maxPolls = (options.timeout * 1000) / pollInterval;
      let detectedStylus = false;

      for (let poll = 0; poll < maxPolls; poll++) {
        await new Promise(r => setTimeout(r, pollInterval));
        const status = await cdpClient.evaluate(`
          (() => {
            const p = window.__sPenRecords?.penEvents || [];
            const t = window.__sPenRecords?.touchEvents || [];
            const hasUp = p.some(e => e.type === 'pointerup');
            return { penCount: p.length, touchCount: t.length, hasUp };
          })()
        `);

        if (status.penCount > 0) {
          detectedStylus = true;
          process.stdout.write(`\r[Stylus] Recorded ${status.penCount} pen events, ${status.touchCount} touch events...`);
          if (status.hasUp || poll > maxPolls - 5) break;
        }
      }
      console.log('');

      if (detectedStylus) {
        const records = await cdpClient.evaluate(`window.__sPenRecords`);
        const pen = records.penEvents;
        const touch = records.touchEvents;

        const pressures = pen.map(e => e.pressure);
        const minPressure = Math.min(...pressures);
        const maxPressure = Math.max(...pressures);
        pressures.sort((a, b) => a - b);
        const medianPressure = pressures[Math.floor(pressures.length / 2)];
        const hasVariablePressure = (maxPressure - minPressure) > 0.05;

        const tiltX = pen.map(e => e.tiltX);
        const tiltY = pen.map(e => e.tiltY);

        let palmObservation = 'No unintended touch events observed during stylus contact';
        if (touch.length > 0) {
          const penDown = pen.find(e => e.type === 'pointerdown');
          const penUp = pen.find(e => e.type === 'pointerup') || pen[pen.length - 1];
          if (penDown && penUp) {
            const concurrentTouch = touch.filter(t => t.timestamp >= penDown.timestamp && t.timestamp <= penUp.timestamp);
            if (concurrentTouch.length > 0) {
              palmObservation = `Concurrent touch activity detected: ${concurrentTouch.length} touch samples recorded during stylus stroke (suppressed by touch-action: none)`;
            }
          }
        }

        sPenTelemetry = {
          tested: true,
          status: 'PHYSICAL_S_PEN_RECORDED',
          penEventCount: pen.length,
          touchEventCount: touch.length,
          pressure: {
            min: minPressure,
            max: maxPressure,
            median: medianPressure,
            hasVariablePressure,
          },
          tilt: {
            minX: Math.min(...tiltX),
            maxX: Math.max(...tiltX),
            minY: Math.min(...tiltY),
            maxY: Math.max(...tiltY),
          },
          coalescedCount: pen.reduce((acc, e) => acc + (e.coalescedCount || 1), 0),
          palmRejectionObservation: palmObservation,
        };

        console.log('\n[S Pen Telemetry Results]');
        console.log(`  Pen Events:         ${sPenTelemetry.penEventCount}`);
        console.log(`  Pressure Range:     ${sPenTelemetry.pressure.min} -> ${sPenTelemetry.pressure.max} (median: ${sPenTelemetry.pressure.median})`);
        console.log(`  Palm Rejection:     ${sPenTelemetry.palmRejectionObservation}`);
      } else {
        console.log('\n[Stylus] S PEN: NOT TESTED (no stylus input detected within timeout).');
        sPenTelemetry = {
          tested: false,
          status: 'S PEN: NOT TESTED (no stylus input detected within timeout)',
          penEventCount: 0,
          pressure: null,
          tilt: null,
          coalescedCount: 0,
          palmRejectionObservation: 'NO HUMAN PALM-REJECTION TEST PERFORMED',
        };
      }
    }

    // Evaluate Mandatory Step Verdicts (Defect 7)
    const mandatoryStepKeys = [
      'loadAndMount',
      'bodySelected',
      'fateLensActivated',
      'temporalEchoAccumulation',
      'temporalScrubRewind',
      'bodySwitchApertureReanchor',
      'scaleModeAdjusted',
      'fateLensDeactivated',
      'fateLensReactivated',
      'finalCleanState',
      'workerCapabilityVerified',
    ];

    const failedSteps = mandatoryStepKeys.filter(k => {
      const step = journeyResults.steps[k];
      return step.verdict === 'FAIL';
    });

    const skippedSteps = mandatoryStepKeys.filter(k => {
      const step = journeyResults.steps[k];
      return step.verdict === 'SKIPPED_WITH_REASON' || step.verdict === 'NOT_RUN';
    });

    if (failedSteps.length > 0) {
      journeyResults.overallVerdict = 'FAIL';
      process.exitCode = 1;
    } else if (skippedSteps.length > 0) {
      journeyResults.overallVerdict = 'INCOMPLETE';
      process.exitCode = 2;
    } else {
      journeyResults.overallVerdict = 'PASS';
      process.exitCode = 0;
    }

    // 14. Compile Final Run Report
    const finalReport = {
      status: journeyResults.overallVerdict === 'PASS'
        ? 'PHYSICAL_QA_COMPLETED'
        : (journeyResults.overallVerdict === 'INCOMPLETE' ? 'PHYSICAL_QA_INCOMPLETE' : 'PHYSICAL_QA_FAILED'),
      harnessState: journeyResults.overallVerdict === 'PASS'
        ? 'ANDROID ADB PHYSICAL QA COMPLETE'
        : (journeyResults.overallVerdict === 'INCOMPLETE' ? 'ANDROID ADB PHYSICAL QA INCOMPLETE' : 'ANDROID ADB PHYSICAL QA FAILED ORACLE'),
      overallVerdict: journeyResults.overallVerdict,
      failedSteps,
      skippedSteps,
      timestamp: new Date().toISOString(),
      device: fingerprint,
      browser: browserTelemetry,
      workerTelemetry: workerAudit,
      transport: {
        type: 'adb_reverse_tcp',
        localPort,
        url: appUrl,
      },
      framePacing: {
        baseline: baselinePacing,
        activeFateLens: activePacing,
        deltaFps: parseFloat((activePacing.observedFps - baselinePacing.observedFps).toFixed(1)),
        p95DeltaMs: parseFloat((activePacing.p95IntervalMs - baselinePacing.p95IntervalMs).toFixed(2)),
      },
      fateLensJourney: journeyResults,
      sPenTelemetry,
      evidenceFiles: [
        '01-device-loaded.png',
        '02-body-selected.png',
        '03-fate-lens-active.png',
        '04-temporal-scrub.png',
        '05-body-switch.png',
        '06-fate-lens-deactivated.png',
      ],
    };

    const reportJsonPath = path.join(runOutputDir, 'run-report.json');
    fs.writeFileSync(reportJsonPath, JSON.stringify(finalReport, null, 2));

    // Generate Markdown Summary (Defect 11)
    let stepRows = '';
    for (const [key, step] of Object.entries(journeyResults.steps)) {
      const badge = step.verdict === 'PASS' ? 'PASS' : (step.verdict === 'SKIPPED_WITH_REASON' ? 'SKIPPED' : (step.verdict === 'NOT_RUN' ? 'NOT_RUN' : 'FAIL'));
      stepRows += `| **${key}** | ${step.action} | ${step.preState || '—'} | ${step.postState || '—'} | **${badge}** | ${step.reason || 'Verified'} |\n`;
    }

    const summaryMd = `# STARSILK SYSTEM PLANNER — Android ADB QA Summary
- **Run Date**: ${finalReport.timestamp}
- **Overall Verdict**: **${journeyResults.overallVerdict}**
- **Device**: ${fingerprint.manufacturer} ${fingerprint.model} (${fingerprint.redactedSerial})
- **Android Release**: ${fingerprint.androidRelease} (API ${fingerprint.apiLevel}, ${fingerprint.cpuAbi})
- **Display**: ${fingerprint.screenSize.replace(/\n/g, ' ')} | Density: ${fingerprint.screenDensity.replace(/\n/g, ' ')} | Mode: ${fingerprint.refreshRateMode}
- **Chrome Version**: ${fingerprint.chromeVersion}
- **Viewport**: ${browserTelemetry.viewportWidth}x${browserTelemetry.viewportHeight} (DPR: ${browserTelemetry.devicePixelRatio})
- **GPU**: ${browserTelemetry.gpuRenderer}

---

## 1. Physical Fate Lens Validation Journey (Strict Oracles)
| Step | Action | Pre-State | Post-State | Verdict | Detail / Reason |
| :--- | :--- | :--- | :--- | :--- | :--- |
${stepRows}

---

## 2. Real-Device Frame Pacing
| Metric | Baseline (Inactive) | Fate Lens (Active) | Delta |
| :--- | :--- | :--- | :--- |
| **Observed FPS** | **${baselinePacing.observedFps} fps** | **${activePacing.observedFps} fps** | \`${finalReport.framePacing.deltaFps} fps\` |
| **Median Frame Time** | ${baselinePacing.medianIntervalMs} ms | ${activePacing.medianIntervalMs} ms | \`+${(activePacing.medianIntervalMs - baselinePacing.medianIntervalMs).toFixed(2)} ms\` |
| **P95 Frame Time** | ${baselinePacing.p95IntervalMs} ms | ${activePacing.p95IntervalMs} ms | \`+${finalReport.framePacing.p95DeltaMs} ms\` |

---

## 3. S Pen & Palm Rejection Telemetry
- **Status**: ${sPenTelemetry.status}
- **Pen Events Recorded**: ${sPenTelemetry.penEventCount}
- **Palm Rejection Observation**: ${sPenTelemetry.palmRejectionObservation}
`;
    fs.writeFileSync(path.join(runOutputDir, 'summary.md'), summaryMd);

    if (journeyResults.overallVerdict === 'PASS') {
      console.log('\n================================================================================');
      console.log('PHYSICAL ANDROID ADB QA COMPLETED SUCCESSFULLY (PASS)');
      console.log(`Evidence saved to: ${runOutputDir}`);
      console.log('================================================================================\n');
    } else if (journeyResults.overallVerdict === 'INCOMPLETE') {
      console.warn('\n================================================================================');
      console.warn('PHYSICAL ANDROID ADB QA INCOMPLETE (MANDATORY STEPS SKIPPED)');
      console.warn(`Skipped Steps: ${skippedSteps.join(', ')}`);
      console.warn(`Evidence saved to: ${runOutputDir}`);
      console.warn('================================================================================\n');
    } else {
      console.error('\n================================================================================');
      console.error('PHYSICAL ANDROID ADB QA FAILED MANDATORY VERIFICATION ORACLES (FAIL)');
      console.error(`Failed Steps: ${failedSteps.join(', ')}`);
      console.error(`Evidence saved to: ${runOutputDir}`);
      console.error('================================================================================\n');
    }
  } catch (err) {
    console.error('[ADB QA] FATAL EXCEPTION DURING EXECUTION:', err);
    process.exitCode = 1;
  } finally {
    await executeCleanup();
  }
}

main().catch(async (err) => {
  console.error('[ADB QA] UNCAUGHT TOP-LEVEL EXCEPTION:', err);
  await executeCleanup();
  process.exit(1);
});
