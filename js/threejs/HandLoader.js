/**
 * HandLoader.js
 * Singleton GLTF cache — loads the robotic hand once, clones for each view.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let _cachedGLTF = null;
let _loadPromise = null;

export function loadHandGLTF() {
  if (_cachedGLTF) return Promise.resolve(_cachedGLTF);
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      'robotic_hand/scene_embedded.gltf',
      (gltf) => { _cachedGLTF = gltf; resolve(gltf); },
      undefined,
      reject
    );
  });

  return _loadPromise;
}

/**
 * Snapshot bone quaternions at a given animation time fraction.
 * Returns a map of boneName -> quaternion clone.
 */
export function snapshotPose(hand, mixer, clip, fraction, skipBones) {
  const action = mixer.clipAction(clip);
  action.timeScale = 1;
  mixer.setTime(0);
  mixer.update(clip.duration * fraction);
  action.timeScale = 0;

  const pose = {};
  hand.traverse(child => {
    if (child.isBone && !skipBones.has(child.name)) {
      pose[child.name] = child.quaternion.clone();
    }
  });
  return pose;
}

/**
 * Build a ready-to-use hand pivot from a GLTF.
 * Returns { pivot, hand, idlePose, clickPose, walkPose }
 */
export function buildHand(gltf) {
  const hand = gltf.scene.clone(true);

  hand.traverse(child => {
    if (child.isMesh || child.isSkinnedMesh) {
      child.frustumCulled = false;
      if (child.name === 'Object_110') child.visible = false;
      if (child.material) {
        child.material = child.material.clone(); // clone so opacity is per-instance
        child.material.transparent = true;
        child.material.opacity = 0.6;
      }
    }
  });

  const box = new THREE.Box3().setFromObject(hand);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const s = 4.6 / maxDim;
  hand.scale.setScalar(s);

  const pivot = new THREE.Group();
  hand.position.set(-center.x * s, -center.y * s, -center.z * s);
  pivot.add(hand);
  pivot.rotation.y = 3.4 + Math.PI;
  pivot.rotation.x = 1.3;
  pivot.rotation.z = 4.7;
  pivot.position.set(1.2, -0.3, 0);

  let idlePose = {}, clickPose = {}, walkPose = {};

  if (gltf.animations && gltf.animations.length > 0) {
    const clip = gltf.animations[0];
    const mixer = new THREE.AnimationMixer(hand);
    const action = mixer.clipAction(clip);
    action.play();

    const skipBones = new Set([
      'GLOBAL_MAIN_CONTROL_R', 'GLOBAL_MAIN_CONTROL_R1',
      'Root_joint_01', 'Root_joint_023',
      'GLOBAL_cntrl', 'HANDPALM_cntrl'
    ]);

    idlePose  = snapshotPose(hand, mixer, clip, 0.55, skipBones);
    clickPose = snapshotPose(hand, mixer, clip, 0.75, skipBones);
    walkPose  = snapshotPose(hand, mixer, clip, 0.25, skipBones);

    // Return to idle and stop — bones driven manually
    snapshotPose(hand, mixer, clip, 0.55, skipBones);
    action.stop();
    mixer.stopAllAction();

    // Apply idle pose
    hand.traverse(child => {
      if (child.isBone && idlePose[child.name]) {
        child.quaternion.copy(idlePose[child.name]);
      }
    });
  }

  return { pivot, hand, idlePose, clickPose, walkPose, size };
}
