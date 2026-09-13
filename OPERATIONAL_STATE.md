# OPERATIONAL STATE & VERIFICATION LEDGER

> System verification record, build artifacts, test suite telemetry, runtime guarantees, and physical-QA boundaries for STARSILK SYSTEM PLANNER.

---

## 1. Executive Status Summary

| Attribute | State | Details |
| :--- | :--- | :--- |
| **Project Name** | `STARSILK SYSTEM PLANNER` | Tactile 3D stellar-architecture laboratory & cosmological instrument |
| **Repository Root** | `./` (`/Users/andrew/Star_System_Planner`) | Git branch: `main` |
| **Remote Origin** | `https://github.com/westkitty/Starsilk_PWA_Mapper.git` | Canonical public GitHub target |
| **Canon Reference** | `westkitty/Starsilk_Character_Dossier` | Read-only canon reference |
| **Verified Runtime Commit** | `b25f02c4c55fcb57c53d517ca6bc7e158c409ea4` | Exact commit validated and deployed by GitHub Actions run #9 |
| **TypeScript Strict** | **0 Errors** | GitHub Actions run #9 |
| **Test Suite** | **87 / 87 Passed** | 14 / 14 Vitest suites passed in GitHub Actions run #9 |
| **Production Build** | **Successful** | Pages-target Vite + Workbox PWA build passed in run #9 |
| **GitHub Pages** | **DEPLOYED** | Deployment succeeded for exact runtime commit `b25f02c4…` |
| **Starfield** | **Dense / luminous / continuous parallax** | 12,000 deterministic stars in 3 Points draw calls; additive stellar emission; stronger near/mid/deep parallax separation |
| **Desktop Navigation** | **Parable-derived navigation grammar implemented** | Plain LMB drag pans after drag threshold; MMB or Shift/Alt+LMB orbits; wheel/trackpad pinch cursor-anchors zoom |
| **Tablet Navigation** | **Software verified; physical QA pending** | One-finger orbit; two-finger simultaneous pan + pinch; 1→2→1 gesture reseeding; browser-native touch gestures suppressed on the canvas |
| **S Pen Navigation** | **Software verified; physical QA pending** | Hover preserved; plain pen drag pans outside tool ownership; secondary/barrel-button orbit supported where browser Pointer Events expose it; palm rejection preserved |
| **Interaction & Instrumentation Programs** | **Software Verified** | Existing #1–#50 accepted behavior retained, including semantic LOD, smart labels, Fate Lens, instrumentation, and prior render-hot-path repair |
| **Strict Exclusions Enforced** | **6 Items Excluded** | #3, #12, #14, #18, #19, #24 remain excluded |
| **Physical Hardware QA** | **PENDING FOR THIS CONTROL/STARFIELD PASS** | Actual starfield visibility, mouse hand-feel, S9 pinch/pan, S Pen/barrel/palm behavior, and post-density frame pacing still require real-device/human verification |

---

## 2. Current Closure Pass — Visible Starfield & Cross-Device Navigation

### Dense visible starfield

The previous enhanced starfield was mathematically present but was reported as effectively invisible in the real application. The current runtime raises visibility materially while preserving the existing architecture and simulation isolation.

Current star allocation:

- **Deep:** 7,800 stars, parallax `0.010–0.060`, size `1.4–2.9 px`, alpha `0.42–0.82`.
- **Mid:** 3,200 stars, parallax `0.055–0.300`, size `2.1–4.7 px`, alpha `0.55–0.96`.
- **Near:** 1,000 stars, parallax `0.260–0.650`, size `3.0–6.8 px`, alpha `0.72–1.00`.
- **Total:** 12,000 deterministic stars.

The renderer still uses exactly three `THREE.Points` layers/draw calls. Camera translation still updates only the shared camera-position uniform on the CPU; individual parallax remains GPU-evaluated.

Visibility changes:

- global stellar brightness multiplier `1.35`;
- stronger optical nucleus/body/halo contribution;
- `THREE.AdditiveBlending` for luminous stellar emission;
- `depthTest: true`, `depthWrite: false`, so foreground scene geometry can still occlude stars correctly;
- deterministic galactic-belt geography and stellar color-temperature palette remain intact;
- star points remain explicitly non-raycastable and simulation-isolated.

### Parable control-system precedent

The requested desktop navigation precedent was found in `westkitty/Parable`, branch:

`spike/godot-hand-feel-2026-07-02`

Authoritative reference files:

- `godot-spike/scripts/hand_input.gd`
- `godot-spike/scripts/camera_rig.gd`

The relevant Parable interaction grammar is now applied to ordinary Starsilk navigation without replacing Starsilk's existing 3D camera engine:

- plain **LMB** remains click-capable until movement crosses a **10 px drag threshold**, then acts as grip-drag pan;
- **MMB drag** or **Shift/Alt + LMB drag** orbits;
- orbit input is normalized to the Parable angular scale (`0.0036 rad/px` effective path through Starsilk's existing callback scaling);
- mouse wheel and browser trackpad pinch feed one signed cursor-centered focal-zoom path;
- Starsilk's existing camera target, safety distance, transition/history, inertia, adaptive pan scaling, and anchor-preserving zoom math remain authoritative.

Specialized Starsilk tools retain ownership when explicitly active: Orbit Loom and Grab & Throw continue to receive the primary pointer rather than being broken by ordinary navigation routing.

### Tablet / S Pen parity

The same `PointerManager` now routes every platform into the same camera operations rather than separate camera implementations:

- one-finger touch drag → orbit after touch slop;
- two-finger gesture → simultaneous midpoint pan + focal pinch zoom;
- after a 1→2→1 transition, the remaining pointer is reseeded so the camera does not inherit a stale delta;
- canvas `touch-action`, `user-select`, and overscroll behavior are application-controlled so browser page gestures do not compete with the planner;
- plain S Pen drag → pan when no construction/manipulation tool owns the pointer;
- S Pen secondary/barrel input → orbit where Chromium exposes the barrel as a secondary Pointer Event button;
- S Pen hover telemetry remains non-mutating;
- existing recent-pen/contact-size/proximity palm rejection remains active.

---

## 3. Changed Files

Runtime / UX:

- `src/rendering/starfield-renderer.ts`
- `src/interaction/pointer-manager.ts`
- `src/ui/ControlsHelpModal.tsx`

Regression evidence:

- `src/tests/starfield.test.ts`
- `src/tests/navigation-policy.test.ts`
- `src/tests/interaction-bridge.test.ts` — test fixture updated to model the real `HTMLElement.style` surface required by canvas gesture locking

State:

- `OPERATIONAL_STATE.md`

No new runtime dependency, renderer, animation loop, simulation model, Fate Lens mutation path, or deployment architecture was introduced.

---

## 4. Automated Verification

### First implementation run — #8

Implementation commit:

`1fb8ed2e8c57ca4836faeb3615fce453d61ff9bb`

Results:

- TypeScript: **PASS**.
- New dense-starfield suite: **13 / 13 PASS**.
- New Parable-navigation policy suite: **5 / 5 PASS**.
- Three legacy interaction-bridge tests failed before exercising behavior because their fake `HTMLElement` omitted `.style`, which the real canvas always has.

The bounded repair changed only that test fixture to represent the browser surface accurately.

### Final verified run — #9

Workflow run:

`34682657852`

Exact checked-out/deployed runtime commit:

`b25f02c4c55fcb57c53d517ca6bc7e158c409ea4`

Verified results:

- TypeScript `tsc --noEmit`: **PASS / 0 errors**.
- Vitest: **14 / 14 suites passed**.
- Vitest: **87 / 87 tests passed**.
- `src/tests/starfield.test.ts`: **13 / 13 PASS**.
- `src/tests/navigation-policy.test.ts`: **5 / 5 PASS**.
- `src/tests/interaction-bridge.test.ts`: **8 / 8 PASS**.
- Pages-target Vite production build: **PASS**.
- Workbox PWA generation: **PASS**.
- Pages artifact upload: **PASS**.
- GitHub Pages deployment: **PASS**.
- Deployed environment: `https://westkitty.github.io/Starsilk_PWA_Mapper/`.

The production bundle remains above Vite's 500 kB advisory threshold (~1,010 kB minified main JS / ~272 kB gzip). This is a warning, not a build failure, and bundle restructuring was intentionally excluded from this bounded control/starfield repair.

Dependency installation still reports two moderate-severity npm audit findings. They remain a separate compatibility-scoped dependency-review task; no unsafe `npm audit fix --force` was applied.

---

## 5. Physical Verification Boundary

Repository, automated software behavior, production build, and deployment are verified. The following are deliberately **not** promoted to physical verification until actual use on the target hardware/browser:

- starfield is immediately and comfortably visible on the Mac and Tab S9 Ultra displays;
- near/mid/deep parallax reads clearly during real camera translation without becoming visually noisy;
- plain LMB grip-drag pan, MMB/modifier orbit, and cursor-centered wheel zoom have the intended Parable hand-feel;
- one-finger orbit and simultaneous two-finger pan + pinch are stable on the Tab S9 Ultra;
- 1→2→1 touch transitions do not jump;
- Chrome/PWA does not steal page pinch/scroll gestures from the canvas;
- S Pen plain-drag pan feels correct;
- S Pen barrel orbit works on the exact Chrome/Samsung Pointer Events path when the barrel button is exposed;
- palm contact does not cause accidental navigation/manipulation;
- 12,000-star field plus Fate Lens/instrumentation retains acceptable target-device frame pacing.

Synthetic Pointer Events and desktop CI do not count as physical proof for these items.

---

## 6. Protected Invariants

- Starsilk PWA Mapper remains an offline-first PWA; ADB remains QA tooling only.
- Exactly one application render loop remains authoritative.
- Simulation state remains authoritative outside Three.js presentation objects.
- Procedural starfield remains deterministic, non-selectable, and simulation-isolated.
- Fate Lens remains derived presentation and must not mutate simulation state.
- Smart labels remain presentation-only and pointer-transparent.
- Specialized construction/manipulation tools retain explicit pointer ownership.
- Desktop, touch, trackpad, and S Pen navigation route into the existing shared Starsilk camera engine rather than duplicate camera implementations.
- GitHub Pages base path remains `/Starsilk_PWA_Mapper/`.
- Excluded features #3, #12, #14, #18, #19, #24 remain absent.
- No physical QA claim may be made for this control/starfield pass without real-device observation.

---

## 7. Closure State

**Dense starfield / parallax implementation:** SOFTWARE VERIFIED.

**Parable-derived desktop control grammar:** SOFTWARE VERIFIED.

**Cross-device pointer routing:** SOFTWARE VERIFIED.

**GitHub Pages deployment of runtime commit `b25f02c4…`:** VERIFIED.

**Actual rendered visibility / Parable hand-feel / Tab S9 Ultra + S Pen parity / target-device performance:** PENDING PHYSICAL QA.

---

## 8. macOS Native Wrapper & Dock Runtime Integration

### Architecture & Specification

| Attribute | Value / Specification |
| :--- | :--- |
| **Application Name** | `Starsilk System Planner` |
| **Installed Location** | `/Users/andrew/Applications/Starsilk System Planner.app` (`~/Applications`) |
| **Reconciled Repository HEAD** | `74c284d4b94368ccde734198e34ed6bf7c229717` |
| **Wrapper Architecture** | Native Swift (`AppKit` + `WebKit` / `WKWebView`), Apple Silicon `arm64` binary |
| **Framework Overhead** | Zero Electron, zero Tauri, zero external runtime npm dependencies; binary size ~137 KB, total bundle size ~992 KB |
| **Source Directory** | `macos-wrapper/` (`src/main.swift`, `resources/Info.plist`, `scripts/`) |
| **Bundle Identifier** | `com.westkitty.starsilk-system-planner` |
| **Application Icon** | Compiled `AppIcon.icns` (16x16 to 1024x1024) rasterized from authoritative `public/pwa-512x512.svg` via `magick` and `iconutil` |
| **macOS Dock Integration** | Slot 37 in `~/Library/Preferences/com.apple.dock.plist` via `/opt/homebrew/bin/dockutil` |
| **Local Server Target** | Local Vite preview server serving `dist/` production distribution |
| **Loopback Security Boundary** | Strictly `127.0.0.1` (never `0.0.0.0`); verified via `lsof -nP -iTCP:4173 -sTCP:LISTEN` |
| **Loopback Port Range** | Deterministic range `4173` through `4185` with POSIX socket binding detection |
| **Local Base URL** | `http://127.0.0.1:<port>/Star_System_Planner/` (derived from `vite.config.ts`) |
| **Stale-Build Protection** | Deterministic build identity stamp (`dist/.starsilk-source-revision`) generated on build and evaluated on launch by `scripts/check-build-freshness.mjs`. Wrapper rebuilds synchronously if `dist/index.html` is missing, stamp is missing, recorded HEAD differs from repo HEAD, or runtime source paths (`src/`, `public/`, `package.json`, `vite.config.ts`) are modified relative to the stamp. Rebuild failure produces a native `NSAlert` and exits cleanly rather than serving stale code. |
| **Child Process Management** | Wrapper process spawns `node vite.js preview`; tracks PID; terminates *only* that specific child PID on window close/quit via `SIGTERM` with `SIGKILL` timeout fallback; zero global process killing (`killall node` / `pkill -f vite`) |
| **Single-Instance Reopen** | Dock clicks while app is active trigger `applicationShouldHandleReopen`, focusing existing window rather than spawning duplicate servers |
| **Window Specifications** | 1440x900 initial, minimum 960x600, resizable, full-size content view, obsidian `#03050a` background preventing white flash |
| **Reproducible Scripts** | `npm run wrapper:mac:build`, `npm run wrapper:mac:install`, `npm run wrapper:mac:launch`, `npm run wrapper:mac:icon` |
| **Rollback Preservation** | Preserved at `/tmp/Starsilk_Backup_Starsilk System Planner.app` and initial work tree backed up at `/tmp/starsilk-wrapper-backup-20260912-055552` |

### Empirical Validation Telemetry

1. **Test Suite & Typecheck (Current Runtime)**:
   - `npm run verify`: **14 test suites, 87 / 87 tests passed (100%)**
   - TypeScript `tsc --noEmit`: **0 errors**
   - Production Vite + Workbox PWA build: **Passed**
2. **Build Freshness & Stamp Integration**:
   - `node scripts/check-build-freshness.mjs`: `FRESH: dist matches current HEAD 74c284d`
   - Build identity stamp verified at `dist/.starsilk-source-revision`
3. **Bundle Lint & Permissions**:
   - `plutil -lint "/Users/andrew/Applications/Starsilk System Planner.app/Contents/Info.plist"`: `OK`
   - `test -x ".../MacOS/Starsilk System Planner"`: `PASS`
   - `test -f ".../Resources/AppIcon.icns"`: `PASS` (1024x1024 multi-res icon verified)
4. **Cold Launch Verification**:
   - Launched via `open -a "$HOME/Applications/Starsilk System Planner.app"` with no pre-existing server or terminal.
   - Child process spawned: PID `98555` (`node .../vite.js preview --host 127.0.0.1 --port 4173 --strictPort`).
   - Loopback listener verified: `node 98555 andrew 16u IPv4 ... TCP 127.0.0.1:4173 (LISTEN)`.
   - Web view loaded `http://127.0.0.1:4173/Star_System_Planner/` with HTTP 200; zero asset 404s.
   - Real window capture verified (`macos-wrapper/build/reconciled-window-evidence.png`): Canvas mounted, 12,000-star dense starfield active, tool rails active, orientation cube active.
5. **Single-Instance Telemetry**:
   - Repeated launch command executed while app was running.
   - Dock reopen caught: `Reopen requested from Dock. Re-activating existing window.`
   - Exactly one app process (`PID 98539`) and one child Vite process (`PID 98555`) confirmed; zero redundant listeners.
6. **Clean Termination & Cleanup**:
   - Issued standard application quit.
   - Child process PID `98555` terminated cleanly.
   - `lsof -nP -iTCP:4173 -sTCP:LISTEN`: verified 0 listeners remaining on port 4173.
7. **Relaunch Verification**:
   - Relaunched application cold a second time.
   - Server became responsive and loaded in <1.5s with child PID `98649`.
   - Shut down cleanly with zero orphaned processes.
8. **Parable-Derived Desktop Mouse Controls**:
   - Navigation policy verified via `src/tests/navigation-policy.test.ts` (5/5 tests) and interactive routing in WKWebView:
     - Short LMB click -> body selection / tool activation
     - LMB drag > 10px -> thresholded camera pan
     - MMB drag -> camera orbit
     - Shift + LMB / Alt + LMB drag -> camera orbit
     - Mouse wheel / trackpad pinch -> cursor-centered focal zoom
9. **Remaining Unknowns / Not Tested**:
   - Physical S Pen / Samsung Tab S9 Ultra hardware pass-through in this desktop wrapper session (0 ADB devices connected; touch/stylus simulated and verified via unit tests and synthetic pointer event test harness).
