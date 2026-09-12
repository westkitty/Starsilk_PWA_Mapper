import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { CameraController } from "../rendering/camera-controller";

describe("Gesture State Machine & Camera Navigation Engine (#26–#38)", () => {
  let camera: THREE.PerspectiveCamera;
  let controller: CameraController;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 50000);
    controller = new CameraController(camera);
  });

  it("#26: Focal zoom strictly scales distance and shifts target along anchor ray", () => {
    controller.target.set(0, 0, 0);
    controller.distance = 100;
    controller.spherical.radius = 100;
    controller.spherical.phi = Math.PI / 2;
    controller.spherical.theta = 0;
    controller.updateCameraTransform();

    const anchor = new THREE.Vector3(20, 0, 10);
    controller.zoomAtPoint(0.5, 960, 540, 1920, 1080, () => anchor);

    // Scaling by 0.5 should reduce distance from 100 to 50
    expect(controller.distance).toBeCloseTo(50, 1);
    // New target = anchor + (oldTarget - anchor) * 0.5 = (20, 0, 10) + (-20, 0, -10)*0.5 = (10, 0, 5)
    expect(controller.target.x).toBeCloseTo(10, 1);
    expect(controller.target.z).toBeCloseTo(5, 1);
  });

  it("#27: Camera inertia decays exponentially according to friction", () => {
    controller.enableInertia = true;
    controller.orbit(0.05, 0.02);

    const initialTheta = controller.spherical.theta;
    controller.update(0.016); // ~1 frame at 60fps
    const thetaAfter1Frame = controller.spherical.theta;
    expect(thetaAfter1Frame).toBeGreaterThan(initialTheta);

    // Over multiple seconds, velocities decay to zero and motion settles
    for (let i = 0; i < 120; i++) {
      controller.update(0.016);
    }
    const settledTheta = controller.spherical.theta;
    controller.update(0.016);
    expect(controller.spherical.theta).toBeCloseTo(settledTheta, 4);
  });

  it("#32: Manual camera input immediately aborts in-flight transition", () => {
    let completed = false;
    const dest = new THREE.Vector3(500, 0, 0);
    controller.startTransition(dest, 150, undefined, 1.0, () => {
      completed = true;
    });

    expect(controller.isTransitioning()).toBe(true);
    controller.update(0.2); // Advance transition partially

    // Manual orbit or interrupt cancels the tween
    controller.orbit(0.01, 0.01);
    expect(controller.isTransitioning()).toBe(false);

    // Further updates do not fire onComplete
    controller.update(1.5);
    expect(completed).toBe(false);
  });

  it("#33: Frame Body computes safe viewing distance based on FOV without geometry clipping", () => {
    const bodyPos = new THREE.Vector3(100, 0, 50);
    const radius = 20;
    controller.frameBody(bodyPos, radius);

    expect(controller.isTransitioning()).toBe(true);
    // Advance transition to completion
    for (let i = 0; i < 60; i++) {
      controller.update(0.02);
    }

    expect(controller.isTransitioning()).toBe(false);
    expect(controller.target.distanceTo(bodyPos)).toBeCloseTo(0, 1);
    // Camera distance must be at least minDistance
    expect(controller.distance).toBeGreaterThanOrEqual(controller.minDistance);
    expect(controller.minDistance).toBeGreaterThan(radius);
  });

  it("#36: Camera history preserves bounded snapshots with functional undo and redo", () => {
    controller.target.set(0, 0, 0);
    controller.pushHistory("Initial");

    controller.target.set(100, 0, 0);
    controller.pushHistory("Moved 100");

    controller.target.set(200, 0, 0);
    controller.pushHistory("Moved 200");

    expect(controller.canUndo()).toBe(true);
    expect(controller.canRedo()).toBe(false);

    controller.undo();
    // Transition starts towards 100
    expect(controller.isTransitioning()).toBe(true);
    for (let i = 0; i < 40; i++) controller.update(0.02);
    expect(controller.target.x).toBeCloseTo(100, 1);

    expect(controller.canRedo()).toBe(true);
    controller.redo();
    for (let i = 0; i < 40; i++) controller.update(0.02);
    expect(controller.target.x).toBeCloseTo(200, 1);
  });

  it("#36: Camera bookmarks can be saved and restored across slots", () => {
    controller.target.set(42, 10, -8);
    controller.distance = 350;
    controller.setBookmark(1, "Virgil Core");

    controller.target.set(0, 0, 0);
    controller.distance = 100;

    const loaded = controller.loadBookmark(1);
    expect(loaded).toBe(true);
    for (let i = 0; i < 50; i++) controller.update(0.02);

    expect(controller.target.x).toBeCloseTo(42, 1);
    expect(controller.distance).toBeCloseTo(350, 1);
  });

  it("#37: Near-body safety clamp updates minDistance and camera near-plane", () => {
    controller.setFocusedBodySafety(30.0);
    expect(controller.minDistance).toBeGreaterThanOrEqual(30.0 * 1.6);
    expect(camera.near).toBeLessThan(controller.minDistance);
  });

  it("#38: Precision mode reduces orbit and pan delta by precisionMultiplier", () => {
    controller.setPrecisionMode(false);
    const theta0 = controller.spherical.theta;
    controller.orbit(0.1, 0.1);
    const normalDelta = controller.spherical.theta - theta0;

    controller.setPrecisionMode(true);
    const theta1 = controller.spherical.theta;
    controller.orbit(0.1, 0.1);
    const precisionDelta = controller.spherical.theta - theta1;

    expect(precisionDelta).toBeCloseTo(normalDelta * 0.25, 3);
  });
});
