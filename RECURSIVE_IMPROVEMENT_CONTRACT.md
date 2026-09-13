# Recursive Improvement Contract & Anti-Regression Doctrine

**Project**: Starsilk System Planner (`westkitty/Starsilk_PWA_Mapper`)  
**Effective Date**: September 13, 2026  
**Status**: Enforced across all future recursive improvement iterations.

---

## 1. Fundamental Principle: Zero Feature-Count Theater

Recursive self-improvement agents must deliver **legitimate, integrated, and verified engineering value**. Creating disconnected files, stub implementations, mock functions, or non-functional UI controls to satisfy arbitrary feature counts is strictly prohibited. Quality, integration depth, and architectural cohesion supersede numerical quotas.

---

## 2. Inviolable Anti-Island & Integration Rules

### Rule 2.1: No Island Modules
Every newly introduced class, function, mesh, shader, or data structure **must have an active caller** in the runtime application:
- Physics and simulation models must be integrated into `engine.ts`, `integrator.ts`, or an active simulation worker.
- 3D visualizers, meshes, and particle systems must be instantiated, updated, and disposed within `SceneManager` lifecycle methods.
- UI components and modals must be accessible from user workflows (e.g., `App.tsx`, `ContextInspector.tsx`, or top navigation bars) and emit typed events via `EventBus`.

### Rule 2.2: Bidirectional UI Wiring
UI controls must never exist in an operational vacuum:
- A button claiming to toggle or deploy a physical phenomenon (e.g., CME, Dyson swarm, Roche lobes, magnetosphere, space elevator) must emit a typed event on `EventBus`.
- The corresponding engine or renderer must subscribe to that event, update internal state, and provide immediate visual or physical feedback.

### Rule 2.3: Zero Stubs, Zero Mocks
- No empty function bodies (`() => {}`).
- No placeholder constants disguised as dynamic models (e.g., `return 42;`).
- No mock canvas contexts or mock meshes in production source code (`src/` outside `src/tests/`).

### Rule 2.4: Accurate Physical & Algorithmic Scoping
Claims in commit messages and documentation must match the exact mathematical implementation:
- If an algorithm evaluates post-Newtonian optical effects or Doppler shifts, do not claim "complete general relativity".
- If an ephemeris parser evaluates Chebyshev polynomial coefficients via Clenshaw recurrence, do not claim "binary SPICE BSP file ingestion".
- If a shading helper computes analytical geometric contact occlusion, do not claim "screen-space ambient occlusion (SSAO) post-processing pipeline".

---

## 3. Mandatory Definition of Done (DoD)

An improvement is only complete when all five criteria are met:

1. **Integrated Implementation**: Authored in the appropriate architectural layer (`src/simulation/`, `src/rendering/`, `src/ui/`, `src/core/`, or `src/persistence/`) and wired into active runtime loops.
2. **Resource Lifecycle Management**: Any Three.js geometry, material, texture, event listener, or audio node must be cleanly released in the corresponding `dispose()` method.
3. **Automated Unit Testing**: At least one concrete unit test asserting behavioral correctness, boundary conditions, and state transitions added to `src/tests/`.
4. **Documentation Accuracy**: Accurately recorded in `SELF_IMPROVEMENT_LOG.md` with file locations, physical equations, and operational hooks.
5. **Clean Verification Ladder**: All 6 verification steps pass with exit code `0`.

---

## 4. Verification Ladder Protocol

Before any commit is staged or pushed, the following verification commands must run and pass unconditionally:

```bash
# 1. Typecheck (TypeScript strict mode, 0 errors)
npm run typecheck

# 2. Automated Test Suite (100% passing across all suites)
npm run test

# 3. Production Build & Service Worker Generation
npm run build

# 4. Bundle Size Budget Audit (Must remain under 2,500 KB limit)
node scripts/bundle-report.mjs

# 5. Security & AST Pattern Audit (0 dangerous evaluations)
node scripts/security-audit.mjs

# 6. Symplectic Physics & Astrodynamic Benchmarks (> 1M body-steps/sec, < 0.1% energy drift)
node scripts/physics-benchmarks.mjs
```

---

## 5. Enforcement & Rollback Policy

Any future recursive iteration that introduces disconnected files, untested features, or fabricated claims must be flagged for forensic audit and repair. Work may not proceed to subsequent passes until the existing pass achieves verified structural integrity.
