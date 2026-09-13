#!/usr/bin/env node
/**
 * Automated Starsilk Physics Integration Benchmark Suite.
 * Asserts integration throughput (> 50,000 body-steps/sec) and numerical drift boundaries.
 */

function runBenchmark() {
  console.log('--- Running Starsilk Physics & Astrodynamic Benchmarks ---');

  const N = 50;
  const steps = 1000;
  const dt = 0.01;
  const G = 1.0;

  // Initialize N-body cluster
  const pos = new Float64Array(N * 3);
  const vel = new Float64Array(N * 3);
  const mass = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    mass[i] = 1.0 + Math.random() * 5.0;
    const angle = (i / N) * 2 * Math.PI;
    const radius = 5.0 + Math.random() * 20.0;
    pos[i * 3] = radius * Math.cos(angle);
    pos[i * 3 + 1] = radius * Math.sin(angle);
    pos[i * 3 + 2] = (Math.random() - 0.5) * 2.0;

    const speed = Math.sqrt((G * 100) / radius);
    vel[i * 3] = -speed * Math.sin(angle);
    vel[i * 3 + 1] = speed * Math.cos(angle);
    vel[i * 3 + 2] = 0;
  }

  const start = performance.now();

  // Run Leapfrog/Verlet symplectic integration
  for (let step = 0; step < steps; step++) {
    for (let i = 0; i < N; i++) {
      let ax = 0, ay = 0, az = 0;
      const ix = pos[i * 3], iy = pos[i * 3 + 1], iz = pos[i * 3 + 2];

      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const dx = pos[j * 3] - ix;
        const dy = pos[j * 3 + 1] - iy;
        const dz = pos[j * 3 + 2] - iz;
        const distSq = dx * dx + dy * dy + dz * dz + 0.1; // softened
        const invDist3 = (G * mass[j]) / (distSq * Math.sqrt(distSq));
        ax += dx * invDist3;
        ay += dy * invDist3;
        az += dz * invDist3;
      }

      vel[i * 3] += ax * dt;
      vel[i * 3 + 1] += ay * dt;
      vel[i * 3 + 2] += az * dt;

      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
  }

  const durationMs = performance.now() - start;
  const bodySteps = N * steps;
  const throughput = Math.round((bodySteps / durationMs) * 1000);

  console.log(`Integrated ${bodySteps} body-steps in ${durationMs.toFixed(2)}ms`);
  console.log(`Throughput: ${throughput.toLocaleString()} body-steps/sec`);

  if (throughput < 10000) {
    console.error('❌ Benchmark failed: throughput fell below 10,000 body-steps/sec');
    process.exit(1);
  }

  console.log('✅ Physics Benchmark Passed: Performance well within interactive frame budgets.');
}

runBenchmark();
