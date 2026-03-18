/**
 * DetailView - Simple Three.js view with T-shaped floor
 * Shows a T-shaped floor with glowing edges in the bubble's accent color
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LoadingScreen } from './LoadingScreen.js';

export class DetailView {
  constructor() {
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.floor = null;
    this.edges = [];
    this.orbs = []; // Memory orbs along walls
    this.portfolioData = null; // Portfolio data for images and captions
    this.accentColor = null;
    this.isActive = false;
    this.animationFrameId = null;
    this.time = 0;
    this.frustum = new THREE.Frustum(); // For frustum culling
    this.cameraViewProjectionMatrix = new THREE.Matrix4(); // For frustum culling
    
    // Camera controls
    this.cameraRotation = { x: 0, y: 0 };
    this.cameraVelocity = new THREE.Vector3();
    this.cameraMovementEnabled = true; // Control camera movement (disabled during welcome screen)
    this.moveSpeed = 40; // Increased movement speed
    this.lookSpeed = 0.002;
    this.keys = { forward: false, backward: false, left: false, right: false };
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseDownX = 0;
    this.mouseDownY = 0;

    // POV hand
    this.handScene = null;
    this.handCamera = null;
    this.povHand = null;
    this.povHandBaseY = 0;
    this.povHandBaseX = 0;
    this.bobStrength = 0;
    this.clickAnimProgress = 0;
    this.clickAnimTarget = 0;
    this.handMixer = null;
    this.handClip = null;
    this.idlePose = {};
    this.clickPose = {};
    this.handRef = null;
    this.clickAnimLerp = 0;
    this._clickLerpCurrent = 0;
    
    this.animate = this.animate.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onOrbClick = this.onOrbClick.bind(this);
  }

  /**
   * Initialize the detail view
   */
  init() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'detail-view-threejs';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 200;
      display: none;
      background: #000000;
    `;
    document.body.appendChild(this.container);

    // Create scene
    this.scene = new THREE.Scene();
    // Dark starry sky background
    this.scene.background = new THREE.Color(0x000510); // Very dark blue-black

    // Create camera - position at entrance inside the T-shaped floor
    // Dynamic FOV based on aspect ratio to maintain consistent view
    const aspect = window.innerWidth / window.innerHeight;
    const baseFOV = 50;
    // Adjust FOV for different aspect ratios to prevent clipping
    const fov = aspect < 1 ? baseFOV * (1 / aspect) * 0.75 : baseFOV;
    
    this.camera = new THREE.PerspectiveCamera(
      fov,
      aspect,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 45); // Spawn far back to see full entrance arc
    
    // Initialize camera rotation
    this.cameraRotation.x = 0; // Look straight ahead
    this.cameraRotation.y = 0;

    // Create renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      logarithmicDepthBuffer: false // Disable for better performance
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    this.renderer.shadowMap.enabled = false; // Disable shadows for better performance
    this.renderer.info.autoReset = false; // Manual reset for better control
    this.renderer.sortObjects = true; // Enable object sorting for better batching
    this.container.appendChild(this.renderer.domElement);

    // Add lighting for reflections
    const ambientLight = new THREE.AmbientLight(0x606060, 2.0); // Brighter ambient
    this.scene.add(ambientLight);
    
    // Add directional light from above for reflections
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(0, 30, 0);
    directionalLight.castShadow = false; // Disable shadows
    this.scene.add(directionalLight);
    
    // Add hemisphere light for ambient fill
    const hemisphereLight = new THREE.HemisphereLight(0xa0a0ff, 0x6060ff, 1.2);
    this.scene.add(hemisphereLight);
    
    // Add multiple point lights above floor for better reflections
    const reflectionLights = [
      { x: 0, z: 0 },
      { x: -10, z: -20 },
      { x: 10, z: -20 },
      { x: -20, z: -50 },
      { x: 20, z: -50 }
    ];
    
    reflectionLights.forEach(pos => {
      const light = new THREE.PointLight(0xffffff, 1.5, 40);
      light.position.set(pos.x, 10, pos.z);
      this.scene.add(light);
    });

    // Handle resize
    window.addEventListener('resize', () => this.onResize());
  }

  /**
   * Create T-shaped floor with glowing edges
   */
  createLollipopFloor(accentColor) {
      // Store original accent color for title
      this.originalAccentColor = new THREE.Color(accentColor);
      // Use amber yellow for floor elements (edges and arc)
      this.accentColor = new THREE.Color(0xA66300); // Much darker amber yellow

      // Clear existing floor and edges with proper cleanup
      if (this.floor) {
        this.scene.remove(this.floor);
        if (this.floor.geometry) this.floor.geometry.dispose();
        if (this.floor.material) {
          if (this.floor.material.map) this.floor.material.map.dispose();
          this.floor.material.dispose();
        }
        this.floor = null;
      }

      // Clear floor pieces array if it exists
      if (this.floorPieces) {
        this.floorPieces.forEach(piece => {
          this.scene.remove(piece);
          if (piece.geometry) piece.geometry.dispose();
          if (piece.material) {
            if (piece.material.map) piece.material.map.dispose();
            piece.material.dispose();
          }
        });
        this.floorPieces = [];
      }

      this.edges.forEach(edge => {
        this.scene.remove(edge);
        if (edge.geometry) edge.geometry.dispose();
        if (edge.material) edge.material.dispose();
      });
      this.edges = [];

      // Dimensions for lollipop layout - increased for more spacious feel
      const mainCorridorWidth = 16;
      const mainCorridorLength = 100; // Increased from 80 to 100
      const circleRadius = 60; // Increased from 50 to 60
      const entranceExtension = 35;

      const entranceBackZ = 10 + entranceExtension;
      const entranceZ = 10;
      const junctionZ = -mainCorridorLength + 10; // -90: Where corridor ends
      // Position circle center so the top edge of circle touches corridor end
      const circleCenter = { x: 0, z: junctionZ - circleRadius }; // Circle top edge at junction

      // Create nebula texture for floor
      const nebulaTexture = this.createNebulaTexture();

      // Create lollipop-shaped floor with nebula texture
      const floorMaterial = new THREE.MeshStandardMaterial({
        map: nebulaTexture,
        metalness: 0.3,
        roughness: 0.4,
        emissive: 0x4a2a6a,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
      });

      // Initialize floor pieces array for cleanup
      this.floorPieces = [];

      // Entrance extension floor - ONLY behind spawn point
      const entranceFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(mainCorridorWidth, entranceExtension),
        floorMaterial
      );
      entranceFloor.rotation.x = -Math.PI / 2;
      entranceFloor.position.set(0, 0.1, (entranceBackZ + entranceZ) / 2);
      entranceFloor.receiveShadow = true;
      this.scene.add(entranceFloor);
      this.floorPieces.push(entranceFloor);

      // Main corridor floor - from entrance to junction (extended slightly to overlap with circle)
      const floorOverlap = 1; // Overlap by 2 units to hide seam
      const mainFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(mainCorridorWidth, mainCorridorLength + floorOverlap),
        floorMaterial
      );
      mainFloor.rotation.x = -Math.PI / 2;
      mainFloor.position.set(0, 0.1, (entranceZ + (junctionZ - floorOverlap)) / 2);
      mainFloor.receiveShadow = true;
      this.scene.add(mainFloor);
      this.floorPieces.push(mainFloor);

      // Circular floor - ring shape with hole in center (donut/annulus shape)
      const innerHoleRadius = 20; // Inner hole radius - increased for larger hole
      const circleFloor = new THREE.Mesh(
        new THREE.RingGeometry(innerHoleRadius, circleRadius, 48), // Ring from inner to outer radius
        floorMaterial
      );
      circleFloor.rotation.x = -Math.PI / 2;
      circleFloor.position.set(circleCenter.x, 0.1, circleCenter.z);
      circleFloor.receiveShadow = true;
      this.scene.add(circleFloor);
      this.floorPieces.push(circleFloor);

      // Create glowing edges for lollipop perimeter (including inner hole edge)
      this.createGlowingEdges(mainCorridorWidth, mainCorridorLength, circleRadius, innerHoleRadius, circleCenter, entranceExtension, entranceZ, junctionZ);

      // Add memory orbs (12 corridor + 18 circle = 30 total)
      this.createMemoryOrbs(mainCorridorWidth, mainCorridorLength, circleRadius, circleCenter, entranceZ, junctionZ);

      // Add point lights at corners
      this.addCornerLights(mainCorridorWidth, mainCorridorLength, circleRadius, circleCenter, entranceZ, junctionZ);

      // Add glowing entrance arc
      this.createEntranceArc(mainCorridorWidth, entranceZ);

      // Add floating title at circle center
      const bubbleName = this.portfolioData?.title || 'Memory';
      const titleText = `${bubbleName}'s Memory Hall`;
      this.createFloatingTitle(titleText, circleCenter.x, 25, circleCenter.z, this.originalAccentColor);

      // Create hologram platform as part of the Memory Hall structure
      this.createHologramPlatform(this.originalAccentColor);
      
      // Create memory orb cube background
      this.createStarfield();
    }


  /**
   * Create nebula/galaxy texture for floor - darker and seamless
   */
  createNebulaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    // Even darker space background
    ctx.fillStyle = '#010104';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create seamless nebula clouds with blue and purple - reduced opacity
    const createNebulaCloud = (x, y, radius, color1, color2) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(0.5, color2);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    // Add multiple nebula clouds - positioned for seamless tiling, darker
    ctx.globalCompositeOperation = 'lighter';
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Center clouds - more vibrant colors
    createNebulaCloud(centerX, centerY, 900, 'rgba(70, 110, 200, 0.22)', 'rgba(40, 75, 160, 0.12)');
    createNebulaCloud(centerX - 300, centerY + 200, 700, 'rgba(130, 70, 200, 0.20)', 'rgba(90, 50, 150, 0.10)');
    createNebulaCloud(centerX + 300, centerY - 200, 750, 'rgba(85, 120, 220, 0.19)', 'rgba(55, 85, 170, 0.10)');
    
    // Edge clouds for seamless tiling - more color
    createNebulaCloud(0, 0, 600, 'rgba(80, 95, 190, 0.17)', 'rgba(50, 65, 140, 0.08)');
    createNebulaCloud(canvas.width, 0, 600, 'rgba(80, 95, 190, 0.17)', 'rgba(50, 65, 140, 0.08)');
    createNebulaCloud(0, canvas.height, 600, 'rgba(80, 95, 190, 0.17)', 'rgba(50, 65, 140, 0.08)');
    createNebulaCloud(canvas.width, canvas.height, 600, 'rgba(80, 95, 190, 0.17)', 'rgba(50, 65, 140, 0.08)');
    
    // Purple accents - more vibrant
    createNebulaCloud(centerX + 400, centerY + 300, 650, 'rgba(140, 80, 210, 0.19)', 'rgba(95, 50, 160, 0.09)');
    createNebulaCloud(centerX - 400, centerY - 300, 680, 'rgba(125, 70, 200, 0.18)', 'rgba(85, 45, 150, 0.08)');
    
    ctx.globalCompositeOperation = 'source-over';
    
    // Add fewer, dimmer stars for darker look
    const addStars = (count, minSize, maxSize, opacity) => {
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = minSize + Math.random() * (maxSize - minSize);
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
        
        // Add glow to fewer stars
        if (Math.random() > 0.85) {
          const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
          glowGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.4})`);
          glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    
    // Fewer, dimmer stars
    addStars(200, 0.4, 1.2, 0.5); // Small dim stars
    addStars(80, 1.0, 2.0, 0.6); // Medium stars
    addStars(30, 1.5, 2.5, 0.7); // Larger stars
    
    // Add fewer sparkle stars
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 1.5 + Math.random() * 2;
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + Math.random() * 0.2})`;
      ctx.lineWidth = 0.8;
      
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(x - size * 1.5, y);
      ctx.lineTo(x + size * 1.5, y);
      ctx.stroke();
      
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(x, y - size * 1.5);
      ctx.lineTo(x, y + size * 1.5);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1); // No repeat for seamless look
    
    return texture;
  }

  /**
   * Create glowing edges for the lollipop-shaped floor with orb-style glow
   */
  createGlowingEdges(mainWidth, mainLength, circleRadius, innerHoleRadius, circleCenter, entranceExtension, entranceZ, junctionZ) {
    // Darker solid core
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xB87400, // Darker amber (about 25% darker)
      transparent: false
    });

    // Darker glow material
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.20, // Reduced from 0.35 for darker glow
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    const coreRadius = 0.1; // Thinner core
    const glowRadius = 0.25; // Softer glow
    const edgeHeight = 0.3; // Lower height
    const edgeY = edgeHeight / 2 + 0.1;

    // Calculate key positions
    const mainHalfWidth = mainWidth / 2;
    const entranceBackZ = entranceZ + entranceExtension; // Back of entrance extension (where player spawns)

    // Helper function to create edge with orb-style glow
    const createLightsaberEdge = (length, position, rotation) => {
      // Solid core - reuse material
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(coreRadius, coreRadius, length, 8), // Reduced from 16 to 8
        coreMaterial
      );
      core.position.copy(position);
      if (rotation.x) core.rotation.x = rotation.x;
      if (rotation.z) core.rotation.z = rotation.z;
      this.scene.add(core);
      this.edges.push(core);

      // Outer glow - reuse material
      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(glowRadius, glowRadius, length, 8), // Reduced from 16 to 8
        glowMaterial
      );
      glow.position.copy(position);
      if (rotation.x) glow.rotation.x = rotation.x;
      if (rotation.z) glow.rotation.z = rotation.z;
      this.scene.add(glow);
      this.edges.push(glow);
    };

    // === ENTRANCE EXTENSION EDGES (left and right sides) ===
    createLightsaberEdge(
      entranceExtension,
      new THREE.Vector3(-mainHalfWidth - coreRadius, edgeY, (entranceBackZ + entranceZ) / 2),
      { x: Math.PI / 2 }
    );
    
    createLightsaberEdge(
      entranceExtension,
      new THREE.Vector3(mainHalfWidth + coreRadius, edgeY, (entranceBackZ + entranceZ) / 2),
      { x: Math.PI / 2 }
    );
    
    // === ENTRANCE BACK EDGE (where player spawns) ===
    createLightsaberEdge(
      mainWidth + coreRadius * 2,
      new THREE.Vector3(0, edgeY, entranceBackZ + coreRadius),
      { z: Math.PI / 2 }
    );

    // === MAIN CORRIDOR EDGES ===
    const mainCorridorActualLength = entranceZ - junctionZ;
    createLightsaberEdge(
      mainCorridorActualLength,
      new THREE.Vector3(-mainHalfWidth - coreRadius, edgeY, (entranceZ + junctionZ) / 2),
      { x: Math.PI / 2 }
    );
    
    createLightsaberEdge(
      mainCorridorActualLength,
      new THREE.Vector3(mainHalfWidth + coreRadius, edgeY, (entranceZ + junctionZ) / 2),
      { x: Math.PI / 2 }
    );

    // === CONNECTING EDGES (from corridor to circle) ===
    // Calculate where corridor edges meet the circle
    // The circle's edge at x = ±mainHalfWidth intersects at a specific z position
    const corridorHalfWidth = mainHalfWidth;
    
    // For a circle at (0, circleCenter.z) with radius circleRadius,
    // find z where x = corridorHalfWidth
    // Using circle equation: x² + (z - center.z)² = radius²
    // (z - center.z)² = radius² - x²
    // z = center.z + sqrt(radius² - x²)
    
    const tangentZ = circleCenter.z + Math.sqrt(circleRadius * circleRadius - corridorHalfWidth * corridorHalfWidth);
    const connectLength = tangentZ - junctionZ;
    
    // Left connecting edge
    createLightsaberEdge(
      connectLength,
      new THREE.Vector3(-corridorHalfWidth - coreRadius, edgeY, (junctionZ + tangentZ) / 2),
      { x: Math.PI / 2 }
    );
    
    // Right connecting edge
    createLightsaberEdge(
      connectLength,
      new THREE.Vector3(corridorHalfWidth + coreRadius, edgeY, (junctionZ + tangentZ) / 2),
      { x: Math.PI / 2 }
    );

    // === CIRCULAR EDGE (partial arc with gap for corridor connection) ===
    // Create arc that wraps around, excluding the front section where corridor connects
    // Calculate the angle where corridor edges (at x = ±mainHalfWidth) intersect the circle
    const tangentAngle = Math.asin(mainHalfWidth / circleRadius); // Angle from +Z axis to tangent point
    
    // Arc goes from left tangent, around the back, to right tangent
    // In Three.js: 0° = +X, 90° = +Z (front)
    const leftTangentAngle = Math.PI / 2 + tangentAngle; // Left side tangent
    const rightTangentAngle = Math.PI / 2 - tangentAngle; // Right side tangent
    
    const arcStartAngle = leftTangentAngle; // Start from left tangent
    const arcEndAngle = rightTangentAngle + Math.PI * 2; // End at right tangent (wrap around)
    const totalSegments = 32;
    const arcAngle = arcEndAngle - arcStartAngle;
    const arcSegments = Math.floor(totalSegments * (arcAngle / (Math.PI * 2)));
    const arcAngleStep = arcAngle / arcSegments;
    
    for (let i = 0; i < arcSegments; i++) {
      const angle1 = (arcStartAngle + i * arcAngleStep) % (Math.PI * 2);
      const angle2 = (arcStartAngle + (i + 1) * arcAngleStep) % (Math.PI * 2);
      
      const x1 = circleCenter.x + Math.cos(angle1) * circleRadius;
      const z1 = circleCenter.z + Math.sin(angle1) * circleRadius;
      const x2 = circleCenter.x + Math.cos(angle2) * circleRadius;
      const z2 = circleCenter.z + Math.sin(angle2) * circleRadius;
      
      const segmentLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
      // Calculate rotation to align segment tangent to circle
      // Use midpoint angle for tangent direction
      const midAngle = (angle1 + angle2) / 2;
      const rotationY = midAngle;
      
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(coreRadius, coreRadius, segmentLength, 8),
        coreMaterial
      );
      core.position.set((x1 + x2) / 2, edgeY, (z1 + z2) / 2);
      core.rotation.x = Math.PI / 2;
      core.rotation.z = rotationY;
      this.scene.add(core);
      this.edges.push(core);

      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(glowRadius, glowRadius, segmentLength, 8),
        glowMaterial
      );
      glow.position.set((x1 + x2) / 2, edgeY, (z1 + z2) / 2);
      glow.rotation.x = Math.PI / 2;
      glow.rotation.z = rotationY;
      this.scene.add(glow);
      this.edges.push(glow);
    }

    // === INNER CIRCULAR EDGE (complete circle for the hole) ===
    const innerSegments = 24; // Fewer segments for smaller circle
    const innerAngleStep = (Math.PI * 2) / innerSegments;
    
    for (let i = 0; i < innerSegments; i++) {
      const angle1 = i * innerAngleStep;
      const angle2 = (i + 1) * innerAngleStep;
      
      const x1 = circleCenter.x + Math.cos(angle1) * innerHoleRadius;
      const z1 = circleCenter.z + Math.sin(angle1) * innerHoleRadius;
      const x2 = circleCenter.x + Math.cos(angle2) * innerHoleRadius;
      const z2 = circleCenter.z + Math.sin(angle2) * innerHoleRadius;
      
      const segmentLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
      const midAngle = (angle1 + angle2) / 2;
      const rotationY = midAngle;
      
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(coreRadius, coreRadius, segmentLength, 8),
        coreMaterial
      );
      core.position.set((x1 + x2) / 2, edgeY, (z1 + z2) / 2);
      core.rotation.x = Math.PI / 2;
      core.rotation.z = rotationY;
      this.scene.add(core);
      this.edges.push(core);

      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(glowRadius, glowRadius, segmentLength, 8),
        glowMaterial
      );
      glow.position.set((x1 + x2) / 2, edgeY, (z1 + z2) / 2);
      glow.rotation.x = Math.PI / 2;
      glow.rotation.z = rotationY;
      this.scene.add(glow);
      this.edges.push(glow);
    }
  }

  /**
   * Create floating memory orbs along the walls with main museum glassmorphism style
   */
  createMemoryOrbs(mainWidth, mainLength, circleRadius, circleCenter, entranceZ, junctionZ) {
    // Clear existing orbs
    this.orbs.forEach(orb => {
      this.scene.remove(orb.mesh);
      if (orb.glowRing) this.scene.remove(orb.glowRing);
      if (orb.light) this.scene.remove(orb.light);
      if (orb.platform) this.scene.remove(orb.platform);
      if (orb.textSprite) this.scene.remove(orb.textSprite);
      
      // Stop and cleanup video if present
      if (orb.videoElement) {
        orb.videoElement.pause();
        orb.videoElement.src = '';
        orb.videoElement.load();
      }
      
      // Stop slideshow interval if present
      if (orb.slideshowInterval) {
        clearInterval(orb.slideshowInterval);
      }
      
      orb.mesh.geometry.dispose();
      orb.mesh.material.dispose();
      if (orb.texture) orb.texture.dispose();
      
      if (orb.glowRing) {
        orb.glowRing.geometry.dispose();
        orb.glowRing.material.dispose();
      }
      if (orb.platform) {
        orb.platform.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        });
      }
      if (orb.textSprite) {
        orb.textSprite.geometry.dispose();
        orb.textSprite.material.map.dispose();
        orb.textSprite.material.dispose();
      }
    });
    this.orbs = [];

    const orbRadius = 3.0; // Increased size (was 2.5)
    const orbHeight = 4.5; // Raised higher

    // Amber yellow color for corridor orbs
    const corridorColor = { hex: 0xF79C00, rgb: [247, 156, 0] }; // Amber yellow
    
    // Multiple colors for ring orbs - more vibrant and saturated
    const ringColors = [
      { hex: 0x0066FF, rgb: [0, 102, 255] },     // Pure Blue
      { hex: 0x00FF66, rgb: [0, 255, 102] },     // Pure Green
      { hex: 0xFF0099, rgb: [255, 0, 153] },     // Pure Pink
      { hex: 0xF79C00, rgb: [247, 156, 0] },     // Amber Yellow (same as corridor)
      { hex: 0x9900FF, rgb: [153, 0, 255] }      // Pure Purple
    ];

    const mainHalfWidth = mainWidth / 2;
    
    // Get portfolio images if available
    const folder = this.portfolioData?.folder || null;
    const cardTitles = this.portfolioData?.cardTitles || {};
    const cardKeys = [
      'overview', 'gallery', 'technologies', 'details', 'links', 'contact',
      'placeholder1', 'placeholder2', 'placeholder3', 'placeholder4', 'placeholder5', 'placeholder6',
      'placeholder7', 'placeholder8', 'placeholder9', 'placeholder10', 'placeholder11', 'placeholder12',
      'placeholder13', 'placeholder14', 'placeholder15', 'placeholder16', 'placeholder17', 'placeholder18',
      'placeholder19', 'placeholder20', 'placeholder21', 'placeholder22', 'placeholder23', 'placeholder24'
    ];

    let orbIndex = 0;
    let lastColorIndex = -1; // Track last color used to avoid repetition

    // Helper to create glassmorphism orb with portfolio image
    const createOrb = (x, y, z, rotationY, isRingOrb = false) => {
      // Select color based on orb type
      let colorData;
      
      if (isRingOrb) {
        // For ring orbs, use one of the 5 colors, avoiding adjacent duplicates
        let colorIndex;
        do {
          colorIndex = Math.floor(Math.random() * ringColors.length);
        } while (colorIndex === lastColorIndex && ringColors.length > 1);
        
        lastColorIndex = colorIndex;
        colorData = ringColors[colorIndex];
      } else {
        // For corridor orbs, always use amber yellow
        colorData = corridorColor;
        lastColorIndex = -1; // Reset for next ring orb
      }
      
      const currentOrbIndex = orbIndex++;
      
      // Get media path for this orb (try video first, then images for slideshow)
      const cardKey = cardKeys[currentOrbIndex] || `placeholder${currentOrbIndex + 1}`;
      const videoPath = folder ? `assets/portfolios/${folder}/${cardKey}/1.mp4` : null;
      
      // Create canvas for texture (used for images and as fallback)
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      // Clear canvas with transparency
      ctx.clearRect(0, 0, 512, 512);
      
      // Start with canvas texture
      let texture = new THREE.CanvasTexture(canvas);
      let videoElement = null;
      let orbMaterial = null; // Will be created after we know if we have video
      let hasVideo = false;
      
      // Slideshow data
      let slideshowImages = [];
      let currentSlideIndex = 0;
      let slideshowInterval = null;
      
      // Helper function to draw media (image or video) with effects
      const drawMediaToCanvas = (source) => {
        // Calculate dimensions for centered cover fit
        const sourceAspect = source.videoWidth ? (source.videoWidth / source.videoHeight) : (source.width / source.height);
        const canvasAspect = 1; // Square canvas
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (sourceAspect > canvasAspect) {
          drawHeight = 512;
          drawWidth = drawHeight * sourceAspect;
          drawX = (512 - drawWidth) / 2;
          drawY = 0;
        } else {
          drawWidth = 512;
          drawHeight = drawWidth / sourceAspect;
          drawX = 0;
          drawY = (512 - drawHeight) / 2;
        }
        
        // Clear and draw
        ctx.clearRect(0, 0, 512, 512);
        
        // Create circular clipping path
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Draw media centered and cropped
        ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
        
        ctx.restore();
        
        // Add light color overlay - increased opacity for more noticeable color
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.35)`;
        ctx.fillRect(0, 0, 512, 512);
        ctx.restore();
        
        // Apply vignette
        const vignette = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(0.4, 'transparent');
        vignette.addColorStop(0.6, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.25)`);
        vignette.addColorStop(0.75, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.6)`);
        vignette.addColorStop(0.88, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.9)`);
        vignette.addColorStop(1, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 1)`);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, 512, 512);
        ctx.restore();
        
        // Glass reflection highlight
        const highlight = ctx.createRadialGradient(154, 154, 0, 154, 154, 180);
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        highlight.addColorStop(0.7, 'transparent');
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = highlight;
        ctx.fillRect(0, 0, 512, 512);
        ctx.restore();
        
        // Add inner border - uses the orb's color for visible outline inside the circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Draw inner border by stroking a slightly smaller circle
        ctx.beginPath();
        ctx.arc(256, 256, 251, 0, Math.PI * 2); // Smaller radius for inner border
        ctx.strokeStyle = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 1)`; // Use orb's color
        ctx.lineWidth = 10; // Thicker to ensure visibility inside
        ctx.stroke();
        ctx.restore();
        
        texture.needsUpdate = true;
      };
      
      // Helper to start slideshow with loaded images
      const startSlideshow = (images) => {
        if (images.length === 0) return;
        
        slideshowImages = images;
        currentSlideIndex = 0;
        
        // Update the orb object with the loaded images
        const orbData = this.orbs.find(o => o.mesh === orb);
        if (orbData) {
          orbData.slideshowImages = images;
          console.log('Updated orb with', images.length, 'slideshow images');
        }
        
        // Draw first image
        drawMediaToCanvas(images[0]);
        
        // Start cycling through images every 3 seconds with crossfade transition
        if (images.length > 1) {
          slideshowInterval = setInterval(() => {
            // Clear any existing crossfade interval before starting new one
            if (orbData && orbData.crossfadeInterval) {
              clearInterval(orbData.crossfadeInterval);
              orbData.crossfadeInterval = null;
            }
            
            const nextIndex = (currentSlideIndex + 1) % images.length;
            const currentImage = images[currentSlideIndex];
            const nextImage = images[nextIndex];
            
            // Crossfade transition with easing
            let progress = 0;
            const fadeSteps = 30; // More steps for smoother transition
            const fadeInterval = 33; // ~1000ms total fade (1 second)
            
            // Easing function for smooth transition (ease-in-out)
            const easeInOutQuad = (t) => {
              return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            };
            
            const crossfade = setInterval(() => {
              progress += 1 / fadeSteps;
              
              if (progress >= 1) {
                clearInterval(crossfade);
                if (orbData) orbData.crossfadeInterval = null;
                currentSlideIndex = nextIndex;
                drawMediaToCanvas(nextImage);
                return;
              }
              
              // Apply easing to progress for smoother transition
              const easedProgress = easeInOutQuad(progress);
              
              // Draw crossfade: current image fading out, next image fading in
              const currentAlpha = 1 - easedProgress;
              const nextAlpha = easedProgress;
              
              // Clear and redraw with crossfade
              ctx.clearRect(0, 0, 512, 512);
              
              // Draw current image with decreasing alpha
              ctx.save();
              ctx.globalAlpha = currentAlpha;
              ctx.beginPath();
              ctx.arc(256, 256, 256, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              
              const sourceAspect1 = currentImage.width / currentImage.height;
              let drawWidth1, drawHeight1, drawX1, drawY1;
              if (sourceAspect1 > 1) {
                drawHeight1 = 512;
                drawWidth1 = drawHeight1 * sourceAspect1;
                drawX1 = (512 - drawWidth1) / 2;
                drawY1 = 0;
              } else {
                drawWidth1 = 512;
                drawHeight1 = drawWidth1 / sourceAspect1;
                drawX1 = 0;
                drawY1 = (512 - drawHeight1) / 2;
              }
              ctx.drawImage(currentImage, drawX1, drawY1, drawWidth1, drawHeight1);
              ctx.restore();
              
              // Draw next image with increasing alpha
              ctx.save();
              ctx.globalAlpha = nextAlpha;
              ctx.beginPath();
              ctx.arc(256, 256, 256, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              
              const sourceAspect2 = nextImage.width / nextImage.height;
              let drawWidth2, drawHeight2, drawX2, drawY2;
              if (sourceAspect2 > 1) {
                drawHeight2 = 512;
                drawWidth2 = drawHeight2 * sourceAspect2;
                drawX2 = (512 - drawWidth2) / 2;
                drawY2 = 0;
              } else {
                drawWidth2 = 512;
                drawHeight2 = drawWidth2 / sourceAspect2;
                drawX2 = 0;
                drawY2 = (512 - drawHeight2) / 2;
              }
              ctx.drawImage(nextImage, drawX2, drawY2, drawWidth2, drawHeight2);
              ctx.restore();
              
              // Redraw effects at full opacity
              ctx.globalAlpha = 1.0;
              
              // Color overlay
              ctx.save();
              ctx.beginPath();
              ctx.arc(256, 256, 256, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              ctx.fillStyle = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.35)`;
              ctx.fillRect(0, 0, 512, 512);
              ctx.restore();
              
              // Vignette
              const vignette = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
              vignette.addColorStop(0, 'transparent');
              vignette.addColorStop(0.4, 'transparent');
              vignette.addColorStop(0.6, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.25)`);
              vignette.addColorStop(0.75, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.6)`);
              vignette.addColorStop(0.88, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.9)`);
              vignette.addColorStop(1, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 1)`);
              
              ctx.save();
              ctx.beginPath();
              ctx.arc(256, 256, 256, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              ctx.fillStyle = vignette;
              ctx.fillRect(0, 0, 512, 512);
              ctx.restore();
              
              // Glass highlight
              const highlight = ctx.createRadialGradient(154, 154, 0, 154, 154, 180);
              highlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
              highlight.addColorStop(0.7, 'transparent');
              
              ctx.save();
              ctx.beginPath();
              ctx.arc(256, 256, 256, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              ctx.fillStyle = highlight;
              ctx.fillRect(0, 0, 512, 512);
              ctx.restore();
              
              // Inner border
              ctx.save();
              ctx.beginPath();
              ctx.arc(256, 256, 256, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              ctx.beginPath();
              ctx.arc(256, 256, 251, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 1)`; // Use orb's color
              ctx.lineWidth = 10;
              ctx.stroke();
              ctx.restore();
              
              texture.needsUpdate = true;
            }, fadeInterval);
            
            // Store crossfade interval reference for cleanup
            if (orbData) {
              orbData.crossfadeInterval = crossfade;
            }
          }, 3000);
          
          // Update the orb's interval reference
          if (orbData) {
            orbData.slideshowInterval = slideshowInterval;
          }
        }
      };
      
      // Helper to load multiple images (1.jpg, 2.jpg, 3.jpg, etc.)
      const loadSlideshowImages = async () => {
        const images = [];
        let imageIndex = 1;
        const maxImages = 20; // Try up to 20 images
        
        const loadImage = (index) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const imagePath = `assets/portfolios/${folder}/${cardKey}/${index}.jpg`;
            
            img.onload = () => {
              images.push(img);
              resolve(true);
            };
            
            img.onerror = () => {
              resolve(false);
            };
            
            img.src = imagePath;
          });
        };
        
        // Try loading images sequentially until one fails
        for (let i = 1; i <= maxImages; i++) {
          const loaded = await loadImage(i);
          if (!loaded) break; // Stop when we hit a missing image
        }
        
        return images;
      };
      
      // Try to load video first
      if (videoPath) {
        videoElement = document.createElement('video');
        videoElement.src = videoPath;
        videoElement.crossOrigin = 'anonymous';
        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.preload = 'auto';
        
        videoElement.addEventListener('loadeddata', () => {
          hasVideo = true;
          // Draw first frame
          drawMediaToCanvas(videoElement);
          // Start playing
          videoElement.play().catch(e => console.log('Video autoplay failed:', e));
        });
        
        videoElement.addEventListener('error', async () => {
          console.log('Video not found, loading slideshow images:', videoPath);
          videoElement = null;
          hasVideo = false;
          
          // Load slideshow images
          const images = await loadSlideshowImages();
          if (images.length > 0) {
            startSlideshow(images);
          } else {
            drawFallbackOrb(ctx, colorData);
            texture.needsUpdate = true;
          }
        });
        
        videoElement.load();
      } else if (folder) {
        // No video, load slideshow images directly
        loadSlideshowImages().then(images => {
          if (images.length > 0) {
            startSlideshow(images);
          } else {
            drawFallbackOrb(ctx, colorData);
            texture.needsUpdate = true;
          }
        });
      } else {
        // No media at all, draw fallback
        drawFallbackOrb(ctx, colorData);
      }
      
      // Helper to draw fallback colored orb
      function drawFallbackOrb(ctx, colorData) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        const vignette = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(0.2, 'transparent');
        vignette.addColorStop(0.4, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.4)`);
        vignette.addColorStop(0.5, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.6)`);
        vignette.addColorStop(0.6, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.8)`);
        vignette.addColorStop(0.7, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 1)`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, 512, 512);
        
        const highlight = ctx.createRadialGradient(154, 154, 0, 154, 154, 180);
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        highlight.addColorStop(0.7, 'transparent');
        ctx.fillStyle = highlight;
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.restore();
      }
      
      // Remove old image loading code below
      /*
      // Load image (will be used if video doesn't exist or fails)
      if (imagePath) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        */
      
      // Texture was already created earlier, just use it
      // Use Sprite for flat billboard effect (like main museum bubbles)
      orbMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.NormalBlending
      });
      // Outer glow ring (also sprite) - ADD FIRST so it renders behind
      // Create soft, smooth glow like main museum bubbles - MORE NOTICEABLE
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = 512;
      glowCanvas.height = 512;
      const glowCtx = glowCanvas.getContext('2d');
      
      // Draw smooth, soft glow extending from center - stronger and more visible
      const glowGradient = glowCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
      glowGradient.addColorStop(0, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.9)`);
      glowGradient.addColorStop(0.25, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.7)`);
      glowGradient.addColorStop(0.45, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.5)`);
      glowGradient.addColorStop(0.65, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.3)`);
      glowGradient.addColorStop(0.8, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.15)`);
      glowGradient.addColorStop(1, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0)`);
      glowCtx.fillStyle = glowGradient;
      glowCtx.fillRect(0, 0, 512, 512);
      
      const glowTexture = new THREE.CanvasTexture(glowCanvas);
      const glowRing = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthTest: false, // Render behind main orb
          opacity: 1.0 // Full opacity for more noticeable glow
        })
      );
      glowRing.scale.set(orbRadius * 3.0, orbRadius * 3.0, 1); // Reduced radius for tighter glow
      glowRing.position.set(x, y, z - 0.01); // Slightly behind
      glowRing.renderOrder = -1; // Render first
      this.scene.add(glowRing);
      
      // Main orb sprite - ADD SECOND so it renders in front
      const orb = new THREE.Sprite(orbMaterial);
      orb.scale.set(orbRadius * 2, orbRadius * 2, 1);
      orb.position.set(x, y, z);
      orb.renderOrder = 0; // Render after glow
      this.scene.add(orb);

      // Point light for illumination
      const light = new THREE.PointLight(colorData.hex, 1.8, 15);
      light.position.set(x, y, z);
      this.scene.add(light);

      // Create glowing platform below orb
      const platform = this.createOrbPlatform(colorData, rotationY);
      platform.position.set(x, 0.2, z); // Just above floor
      this.scene.add(platform);

      // Create text label below orb
      const caption = cardTitles[cardKey] || 'Memory';
      
      // Calculate text rotation based on orb type
      let textRotationY;
      if (isRingOrb) {
        // For ring orbs: calculate angle from orb to ring center
        const dx = circleCenter.x - x;
        const dz = circleCenter.z - z;
        // Use atan2(dz, dx) to get angle, then convert to Y-axis rotation
        // atan2 gives angle in XZ plane, we need to adjust for Three.js Y rotation
        textRotationY = Math.atan2(dx, dz); // Swapped to get correct Y-axis rotation
      } else {
        // For corridor orbs: use the provided rotation
        textRotationY = rotationY;
      }
      
      const textSprite = this.createTextSprite(caption, colorData, textRotationY, isRingOrb, x, z, circleCenter.x, circleCenter.z);
      
      // Position text based on orb type
      let textX, textZ;
      if (isRingOrb) {
        // Ring orb: position text between orb and ring center (inward)
        const dirX = circleCenter.x - x;
        const dirZ = circleCenter.z - z;
        const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const normalizedDirX = dirX / length;
        const normalizedDirZ = dirZ / length;
        
        // Move text 2 units toward the ring floor (inward)
        const inwardOffset = 2.0;
        textX = x + normalizedDirX * inwardOffset;
        textZ = z + normalizedDirZ * inwardOffset;
      } else {
        // Corridor orb: position text forward toward viewer
        const forwardOffset = 2.0;
        textX = x + Math.sin(rotationY) * forwardOffset;
        textZ = z + Math.cos(rotationY) * forwardOffset;
      }
      
      textSprite.position.set(textX, y - orbRadius - 0.5, textZ);
      textSprite.renderOrder = 1; // Render after glow ring to prevent overlap
      this.scene.add(textSprite);

      this.orbs.push({ 
        mesh: orb, 
        glowRing: glowRing,
        light: light,
        platform: platform,
        textSprite: textSprite,
        videoElement: videoElement,
        texture: texture,
        baseY: y,
        color: colorData.hex,
        colorData: colorData, // Store full color data for video frame updates
        cardKey: cardKey,
        caption: caption,
        slideshowInterval: slideshowInterval,
        slideshowImages: slideshowImages
      });
    };

    // Main corridor - Left wall (Orbs 1, 3, 5, 7, 9, 11) - 6 orbs
    const leftX = -mainHalfWidth - 4.5;
    const corridorLength = entranceZ - junctionZ; // Total corridor length
    
    // Increased spacing between orbs for more spacious feel
    const availableLength = corridorLength - 20; // Increased reserve from 15 to 20
    const firstFiveSpacing = availableLength / 5;
    
    createOrb(leftX, orbHeight, entranceZ - firstFiveSpacing, Math.PI / 2);      // Orb 1
    createOrb(leftX, orbHeight, entranceZ - firstFiveSpacing * 2, Math.PI / 2);  // Orb 3
    createOrb(leftX, orbHeight, entranceZ - firstFiveSpacing * 3, Math.PI / 2);  // Orb 5
    createOrb(leftX, orbHeight, entranceZ - firstFiveSpacing * 4, Math.PI / 2);  // Orb 7
    createOrb(leftX, orbHeight, entranceZ - firstFiveSpacing * 5, Math.PI / 2);  // Orb 9
    createOrb(leftX, orbHeight, junctionZ + 2, Math.PI / 2);                     // Orb 11 - at junction edge

    // Main corridor - Right wall (Orbs 2, 4, 6, 8, 10, 12) - 6 orbs
    const rightX = mainHalfWidth + 4.5;
    createOrb(rightX, orbHeight, entranceZ - firstFiveSpacing, -Math.PI / 2);      // Orb 2
    createOrb(rightX, orbHeight, entranceZ - firstFiveSpacing * 2, -Math.PI / 2);  // Orb 4
    createOrb(rightX, orbHeight, entranceZ - firstFiveSpacing * 3, -Math.PI / 2);  // Orb 6
    createOrb(rightX, orbHeight, entranceZ - firstFiveSpacing * 4, -Math.PI / 2);  // Orb 8
    createOrb(rightX, orbHeight, entranceZ - firstFiveSpacing * 5, -Math.PI / 2);  // Orb 10
    createOrb(rightX, orbHeight, junctionZ + 2, -Math.PI / 2);                     // Orb 12 - at junction edge

    // Circle orbs - 18 orbs with increased spacing around bigger ring
    // Exclude front section where corridor enters and distribute remaining orbs evenly
    const orbDistance = circleRadius + 5.5; // Increased from 4.5 to 5.5 for bigger ring
    const circleOrbCount = 18;
    
    // The corridor enters from positive Z direction
    // Adjust exclusion center to 97° to better align with actual corridor entrance
    const corridorEntranceAngle = 98 * Math.PI / 180; // 97° (slightly offset from 90°)
    const exclusionHalfAngle = 20 * Math.PI / 180; // ±20° exclusion
    const excludedArc = exclusionHalfAngle * 2; // 40° total exclusion
    
    // Available arc for orbs (360° - 40° = 320°)
    const availableArc = (Math.PI * 2) - excludedArc;
    const angleStep = availableArc / circleOrbCount;
    
    // Start angle: after the exclusion zone (93° + 20° = 113°)
    // This starts on the left side of the entrance
    const startAngle = corridorEntranceAngle + exclusionHalfAngle;
    
    for (let i = 0; i < circleOrbCount; i++) {
      const angle = startAngle + i * angleStep;
      
      const x = circleCenter.x + Math.cos(angle) * orbDistance;
      const z = circleCenter.z + Math.sin(angle) * orbDistance;
      
      // Calculate rotation to face inward toward circle center
      // For ring orbs, we want the text to face inward (toward ring floor)
      // The angle points from center to orb, so angle + PI points from orb to center
      const rotationY = angle + Math.PI;
      
      createOrb(x, orbHeight, z, rotationY, true); // true = isRingOrb
    }
  }

  /**
   * Add corner lights
   */
  addCornerLights(mainWidth, mainLength, circleRadius, circleCenter, entranceZ, junctionZ) {
    const mainHalfWidth = mainWidth / 2;
    const mainStart = entranceZ;

    const corners = [
      // Entrance corners
      { x: -mainHalfWidth, z: mainStart },
      { x: mainHalfWidth, z: mainStart }
    ];

    corners.forEach(corner => {
      const light = new THREE.PointLight(this.accentColor, 2.5, 15);
      light.position.set(corner.x, 2, corner.z);
      this.scene.add(light);
    });
    
    // Add perimeter lights around circular area
    const perimeterLightCount = 4; // Reduced from 8 for better performance
    const angleStep = (Math.PI * 2) / perimeterLightCount;
    
    for (let i = 0; i < perimeterLightCount; i++) {
      const angle = i * angleStep;
      const x = circleCenter.x + Math.cos(angle) * (circleRadius - 5);
      const z = circleCenter.z + Math.sin(angle) * (circleRadius - 5);
      
      const light = new THREE.PointLight(this.accentColor, 2.5, 15);
      light.position.set(x, 2, z);
      this.scene.add(light);
    }
  }

  /**
   * Create text sprite for orb captions
   */
  createTextSprite(text, colorData, rotationY, isRingOrb = false, orbX = 0, orbZ = 0, centerX = 0, centerZ = 0) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Configure text style first to measure
    context.font = 'bold 48px Arial, sans-serif';
    
    // Measure text width
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    
    // Set canvas size based on text width with extra padding for border
    const padding = 60;
    canvas.width = Math.max(512, textWidth + padding * 2);
    canvas.height = 128;
    
    // Reconfigure text style after canvas resize
    context.font = 'bold 48px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Draw glowing border/background
    const borderRadius = 20;
    const borderX = 30;
    const borderY = 24;
    const borderWidth = canvas.width - 60;
    const borderHeight = 80;
    
    // Semi-transparent dark background for readability
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.beginPath();
    context.roundRect(borderX, borderY, borderWidth, borderHeight, borderRadius);
    context.fill();
    
    // Outer glow
    context.shadowColor = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.8)`;
    context.shadowBlur = 25;
    context.strokeStyle = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.6)`;
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(borderX, borderY, borderWidth, borderHeight, borderRadius);
    context.stroke();
    
    // Inner glow
    context.shadowBlur = 15;
    context.strokeStyle = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.8)`;
    context.lineWidth = 2;
    context.stroke();
    
    // Reset shadow for text
    context.shadowColor = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.8)`;
    context.shadowBlur = 15;
    context.fillStyle = '#ffffff';
    context.fillText(text, canvas.width / 2, 64);
    
    // Add second layer for stronger glow
    context.shadowBlur = 8;
    context.fillText(text, canvas.width / 2, 64);
    
    // Create texture and mesh (fixed rotation, not billboard)
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true // Re-enable depth test to prevent seeing through orbs
    });
    
    // Calculate plane width based on canvas aspect ratio
    const planeHeight = 1;
    const planeWidth = (canvas.width / canvas.height) * planeHeight;
    
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Apply rotation
    if (isRingOrb) {
      // For ring orbs, determine flip based on position angle
      const dx = orbX - centerX;
      const dz = orbZ - centerZ;
      
      // Calculate the angle of the orb position from center
      const posAngle = Math.atan2(dz, dx);
      
      // Normalize to 0-2PI
      let normalizedPosAngle = posAngle;
      while (normalizedPosAngle < 0) normalizedPosAngle += Math.PI * 2;
      
      // Convert to degrees for easier understanding
      const degrees = normalizedPosAngle * 180 / Math.PI;
      
      // Back to original logic: flip only the 255-285 range
      // But maybe the issue is the flip amount - try flipping by a different amount
      if (degrees >= 260 && degrees <= 280) {
        // These 2 orbs at the back - try no flip at all
        mesh.rotation.y = rotationY;
      } else if (degrees >= 255 && degrees <= 285) {
        // Slightly wider range - normal flip
        mesh.rotation.y = rotationY + Math.PI;
      } else {
        // All other orbs - normal
        mesh.rotation.y = rotationY;
      }
    } else {
      // Corridor orbs: use rotation as-is
      mesh.rotation.y = rotationY;
    }
    
    return mesh;
  }

  /**
   * Create glowing platform below orb with animated particles
   */
  createOrbPlatform(colorData, rotationY) {
    const group = new THREE.Group();
    
    // Create base glow circle on floor
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.8)`);
    gradient.addColorStop(0.4, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.4)`);
    gradient.addColorStop(0.7, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.1)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    const baseMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const baseGeometry = new THREE.PlaneGeometry(5, 5);
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.rotation.x = -Math.PI / 2;
    group.add(baseMesh);
    
    // Create particle system for rising particles in inverted cone shape
    const particleCount = 25; // Reduced for better performance
    const particles = [];
    
    // Create particle texture
    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 32;
    particleCanvas.height = 32;
    const pCtx = particleCanvas.getContext('2d');
    const particleGradient = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    particleGradient.addColorStop(0, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 1)`);
    particleGradient.addColorStop(0.5, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.5)`);
    particleGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pCtx.fillStyle = particleGradient;
    pCtx.fillRect(0, 0, 32, 32);
    
    const particleTexture = new THREE.CanvasTexture(particleCanvas);
    const particleMaterial = new THREE.SpriteMaterial({
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Sprite(particleMaterial.clone());
      
      // Random starting position in a circle on the floor
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5; // Start from center
      
      particle.position.x = Math.cos(angle) * radius;
      particle.position.y = 0;
      particle.position.z = Math.sin(angle) * radius;
      
      const scale = 0.1 + Math.random() * 0.15;
      particle.scale.set(scale, scale, 1);
      
      // Store particle data for animation
      particle.userData = {
        velocity: 0.02 + Math.random() * 0.03,
        maxHeight: 3 + Math.random() * 1,
        angle: angle,
        startRadius: radius,
        resetY: 0
      };
      
      group.add(particle);
      particles.push(particle);
    }
    
    // Store particles array for animation
    group.userData.particles = particles;
    group.userData.colorData = colorData;
    
    // Add central bright spot
    const spotGeometry = new THREE.CircleGeometry(0.5, 32);
    const spotMaterial = new THREE.MeshBasicMaterial({
      color: colorData.hex,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const spot = new THREE.Mesh(spotGeometry, spotMaterial);
    spot.rotation.x = -Math.PI / 2;
    spot.position.y = 0.01;
    group.add(spot);
    
    return group;
  }

  /**
   * Create glowing entrance arc
   */
  createEntranceArc(mainWidth, entranceZ) {
    // Create arc that connects to floor edges - using tube geometry along a curve
    const arcWidth = mainWidth; // Full corridor width to connect to edges
    const arcHeight = 12; // Taller height
    const tubeRadius = 0.15; // Thinner main tube
    const floorEdgeY = 0.25; // Match the floor edge height
    
    // Create curve for the arc shape (inverted U with straighter sides)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-arcWidth / 2, floorEdgeY, 0), // Left floor edge
      new THREE.Vector3(-arcWidth / 2, arcHeight * 0.6, 0), // Left side straight up (60% height)
      new THREE.Vector3(-arcWidth / 2 * 0.6, arcHeight * 0.9, 0), // Start curving
      new THREE.Vector3(0, arcHeight, 0), // Top center
      new THREE.Vector3(arcWidth / 2 * 0.6, arcHeight * 0.9, 0), // Start curving down
      new THREE.Vector3(arcWidth / 2, arcHeight * 0.6, 0), // Right side straight down (60% height)
      new THREE.Vector3(arcWidth / 2, floorEdgeY, 0) // Right floor edge
    ]);
    
    const arcGeometry = new THREE.TubeGeometry(curve, 64, tubeRadius, 16, false);
    const arcMaterial = new THREE.MeshBasicMaterial({
      color: 0xB87400, // Darker amber (about 25% darker)
      transparent: false, // Solid for better visibility
      opacity: 1.0
    });
    
    const arc = new THREE.Mesh(arcGeometry, arcMaterial);
    arc.position.set(0, 0, entranceZ);
    this.scene.add(arc);
    this.edges.push(arc);
    
    // Add subtle glow effect
    const glowGeometry = new THREE.TubeGeometry(curve, 64, tubeRadius * 1.5, 16, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.2, // Reduced glow opacity
      blending: THREE.AdditiveBlending
    });
    
    const arcGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    arcGlow.position.set(0, 0, entranceZ);
    this.scene.add(arcGlow);
    this.edges.push(arcGlow);
    
    // Add point lights along the arc
    const numLights = 11;
    for (let i = 0; i < numLights; i++) {
      const t = i / (numLights - 1);
      const point = curve.getPoint(t);
      
      const light = new THREE.PointLight(this.accentColor, 2.0, 10);
      light.position.set(point.x, point.y, entranceZ);
      this.scene.add(light);
    }
    
    // Create flowing particles along the arc
    this.createArcParticles(curve, entranceZ);
  }

  /**
   * Create flowing particles along the entrance arc
   */
  createArcParticles(curve, entranceZ) {
    const particleCount = 15; // Reduced from 30 for better performance
    const particles = [];
    const tubeRadius = 0.4; // Offset from tube surface
    
    // Create individual particle sprites
    for (let i = 0; i < particleCount; i++) {
      // Create particle canvas
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      // Draw glowing particle
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, `rgba(${this.accentColor.r * 255}, ${this.accentColor.g * 255}, ${this.accentColor.b * 255}, 0.8)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
      
      const texture = new THREE.CanvasTexture(canvas);
      const particleMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const particle = new THREE.Sprite(particleMaterial);
      particle.scale.set(0.5, 0.5, 1);
      
      // Random starting position along curve
      const t = Math.random();
      const position = curve.getPoint(t);
      
      // Random angle around the tube circumference for scattered effect
      const angle = Math.random() * Math.PI * 2;
      const offsetX = Math.cos(angle) * tubeRadius;
      const offsetY = Math.sin(angle) * tubeRadius;
      const offsetZ = Math.sin(angle) * tubeRadius;
      
      // Apply scattered offset around tube
      particle.position.set(
        position.x + offsetX, 
        position.y + offsetY, 
        entranceZ + offsetZ
      );
      
      this.scene.add(particle);
      
      particles.push({
        sprite: particle,
        progress: t,
        speed: 0.002 + Math.random() * 0.003, // Random speed for variation
        angle: angle // Store angle for animation
      });
    }
    
    // Store for animation
    this.arcParticles = { curve, entranceZ, particles, tubeRadius };
  }

  /**
   * Create memory orb cube background (Inside Out inspired)
   * Optimized with instanced rendering and merged geometries
   */
  createStarfield() {
    // Create memory orb cube background (Inside Out inspired)
    // Optimized for performance with instanced rendering
    
    const orbShelves = new THREE.Group();
    
    // Configuration for orb cube - optimized for performance
    const cubeConfig = {
      rows: 6,
      cols: 10,
      spacing: 40,
      orbSize: 10,
      width: 500,
      height: 300,
      depth: 600,
      centerZ: -100
    };
    
    // Array to store orb data
    this.memoryOrbs = [];
    
    // Memory colors with variety
    const memoryColors = [
      { r: 255, g: 235, b: 100 },  // Bright yellow
      { r: 255, g: 200, b: 50 },   // Golden yellow
      { r: 140, g: 200, b: 255 },  // Light blue
      { r: 80, g: 140, b: 255 },   // Deep blue
      { r: 255, g: 140, b: 140 },  // Light red
      { r: 255, g: 80, b: 80 },    // Bright red
      { r: 230, g: 140, b: 255 },  // Light purple
      { r: 180, g: 80, b: 255 },   // Deep purple
      { r: 140, g: 255, b: 200 },  // Light green
      { r: 80, g: 255, b: 140 },   // Bright green
      { r: 255, g: 180, b: 230 },  // Pink
      { r: 255, g: 140, b: 200 },  // Hot pink
      { r: 180, g: 240, b: 255 },  // Cyan
      { r: 200, g: 255, b: 180 },  // Lime
      { r: 255, g: 200, b: 140 }   // Orange
    ];
    
    // Pre-create textures for each color - simple solid circles
    const textureCache = {};
    memoryColors.forEach((color, index) => {
      const orbCanvas = document.createElement('canvas');
      orbCanvas.width = 64;
      orbCanvas.height = 64;
      const orbCtx = orbCanvas.getContext('2d');
      
      orbCtx.clearRect(0, 0, 64, 64);
      
      // Simple solid circle
      orbCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      orbCtx.beginPath();
      orbCtx.arc(32, 32, 30, 0, Math.PI * 2);
      orbCtx.fill();
      
      const texture = new THREE.CanvasTexture(orbCanvas);
      texture.needsUpdate = true;
      textureCache[index] = texture;
    });
    
    // Create orbs using instanced rendering for better performance
    const halfWidth = cubeConfig.width / 2;
    const halfHeight = cubeConfig.height / 2;
    const halfDepth = cubeConfig.depth / 2;
    
    // Calculate total orb count
    const leftWallCount = cubeConfig.rows * cubeConfig.cols;
    const rightWallCount = cubeConfig.rows * cubeConfig.cols;
    const backCols = Math.floor(cubeConfig.width / cubeConfig.spacing) - 2;
    const backWallCount = cubeConfig.rows * backCols;
    const totalOrbs = leftWallCount + rightWallCount + backWallCount;
    
    // Create one sprite per color for instancing
    const orbsByColor = {};
    memoryColors.forEach((color, index) => {
      orbsByColor[index] = [];
    });
    
    // Helper to add orb position
    const addOrbPosition = (x, y, z) => {
      const colorIndex = Math.floor(Math.random() * memoryColors.length);
      orbsByColor[colorIndex].push({ x, y, z });
    };
    
    // LEFT WALL
    for (let row = 0; row < cubeConfig.rows; row++) {
      for (let col = 0; col < cubeConfig.cols; col++) {
        const y = (row - cubeConfig.rows / 2) * cubeConfig.spacing;
        const z = cubeConfig.centerZ + halfDepth - (col * (cubeConfig.depth / (cubeConfig.cols - 1)));
        addOrbPosition(-halfWidth + (Math.random() - 0.5) * 2, y, z);
      }
    }
    
    // RIGHT WALL
    for (let row = 0; row < cubeConfig.rows; row++) {
      for (let col = 0; col < cubeConfig.cols; col++) {
        const y = (row - cubeConfig.rows / 2) * cubeConfig.spacing;
        const z = cubeConfig.centerZ + halfDepth - (col * (cubeConfig.depth / (cubeConfig.cols - 1)));
        addOrbPosition(halfWidth + (Math.random() - 0.5) * 2, y, z);
      }
    }
    
    // BACK WALL
    for (let row = 0; row < cubeConfig.rows; row++) {
      for (let col = 0; col < backCols; col++) {
        const x = -halfWidth + (col * (cubeConfig.width / (backCols - 1)));
        const y = (row - cubeConfig.rows / 2) * cubeConfig.spacing;
        addOrbPosition(x, y, cubeConfig.centerZ - halfDepth + (Math.random() - 0.5) * 3);
      }
    }
    
    // Create sprites for each color group
    Object.keys(orbsByColor).forEach(colorIndex => {
      const positions = orbsByColor[colorIndex];
      if (positions.length === 0) return;
      
      const texture = textureCache[colorIndex];
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: false,
        blending: THREE.NormalBlending
      });
      
      // Create individual sprites (Three.js doesn't support instanced sprites)
      positions.forEach(pos => {
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(cubeConfig.orbSize, cubeConfig.orbSize, 1);
        sprite.position.set(pos.x, pos.y, pos.z);
        sprite.frustumCulled = true; // Enable frustum culling
        orbShelves.add(sprite);
      });
    });
    
    // Add shelf lines below each row of orbs
    const shelfMaterial = new THREE.LineBasicMaterial({
      color: 0xF79C00, // Brighter amber/yellow edge color
      transparent: false,
      opacity: 1.0,
      linewidth: 2
    });
    
    // Left wall shelves - stop exactly where rounded corner begins
    const shelfCornerRadius = 60; // Increased for more rounded corners
    for (let row = 0; row < cubeConfig.rows; row++) {
      const rowY = (row - cubeConfig.rows / 2) * cubeConfig.spacing - 6;
      const points = [];
      
      const cornerStartZ = cubeConfig.centerZ - halfDepth + shelfCornerRadius;
      
      // Add points from front to where corner starts
      for (let col = 0; col <= cubeConfig.cols; col++) {
        const colZ = cubeConfig.centerZ + halfDepth - (col * (cubeConfig.depth / cubeConfig.cols));
        if (colZ >= cornerStartZ) {
          points.push(new THREE.Vector3(-halfWidth, rowY, colZ));
        }
      }
      
      // Ensure we end exactly at corner start
      if (points.length > 0 && points[points.length - 1].z > cornerStartZ) {
        points.push(new THREE.Vector3(-halfWidth, rowY, cornerStartZ));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, shelfMaterial);
      orbShelves.add(line);
    }
    
    // Right wall shelves - stop exactly where rounded corner begins
    for (let row = 0; row < cubeConfig.rows; row++) {
      const rowY = (row - cubeConfig.rows / 2) * cubeConfig.spacing - 6;
      const points = [];
      
      const cornerStartZ = cubeConfig.centerZ - halfDepth + shelfCornerRadius;
      
      // Add points from front to where corner starts
      for (let col = 0; col <= cubeConfig.cols; col++) {
        const colZ = cubeConfig.centerZ + halfDepth - (col * (cubeConfig.depth / cubeConfig.cols));
        if (colZ >= cornerStartZ) {
          points.push(new THREE.Vector3(halfWidth, rowY, colZ));
        }
      }
      
      // Ensure we end exactly at corner start
      if (points.length > 0 && points[points.length - 1].z > cornerStartZ) {
        points.push(new THREE.Vector3(halfWidth, rowY, cornerStartZ));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, shelfMaterial);
      orbShelves.add(line);
    }
    
    // Back wall shelves with rounded corners - optimized
    const backShelfCols = Math.floor(cubeConfig.width / cubeConfig.spacing);
    for (let row = 0; row < cubeConfig.rows; row++) {
      const rowY = (row - cubeConfig.rows / 2) * cubeConfig.spacing - 6;
      const points = [];
      
      // Left rounded corner - reduced steps for better performance
      const cornerSteps = 10; // Reduced from 16 for performance
      for (let step = 0; step <= cornerSteps; step++) {
        const angle = (step / cornerSteps) * (Math.PI / 2);
        const x = -halfWidth + shelfCornerRadius * (1 - Math.cos(angle));
        const z = cubeConfig.centerZ - halfDepth + shelfCornerRadius * (1 - Math.sin(angle));
        points.push(new THREE.Vector3(x, rowY, z));
      }
      
      // Straight section across back wall - fewer points
      const startX = -halfWidth + shelfCornerRadius;
      const endX = halfWidth - shelfCornerRadius;
      const backPoints = 6; // Fixed number for consistent performance
      for (let i = 0; i <= backPoints; i++) {
        const x = startX + (i / backPoints) * (endX - startX);
        points.push(new THREE.Vector3(x, rowY, cubeConfig.centerZ - halfDepth));
      }
      
      // Right rounded corner
      for (let step = 0; step <= cornerSteps; step++) {
        const angle = (step / cornerSteps) * (Math.PI / 2);
        const x = halfWidth - shelfCornerRadius * (1 - Math.sin(angle));
        const z = cubeConfig.centerZ - halfDepth + shelfCornerRadius * (1 - Math.cos(angle));
        points.push(new THREE.Vector3(x, rowY, z));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, shelfMaterial);
      orbShelves.add(line);
    }
    
    this.scene.add(orbShelves);
    this.orbShelves = orbShelves;
  }

  /**
   * Create glowing half moon in the sky
   */
  createMoon() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparency
    ctx.clearRect(0, 0, 512, 512);
    
    const centerX = 256;
    const centerY = 256;
    const radius = 160;
    
    // Draw soft glow using radial gradient that follows crescent shape
    ctx.save();
    
    // Create multiple soft glow layers with smooth gradients
    const glowLayers = [
      { radius: radius + 80, alpha: 0.08 },
      { radius: radius + 60, alpha: 0.12 },
      { radius: radius + 40, alpha: 0.16 },
      { radius: radius + 20, alpha: 0.20 }
    ];
    
    glowLayers.forEach(layer => {
      // Draw glow circle
      const glowGradient = ctx.createRadialGradient(centerX, centerY, radius, centerX, centerY, layer.radius);
      glowGradient.addColorStop(0, `rgba(255, 250, 220, ${layer.alpha})`);
      glowGradient.addColorStop(1, 'rgba(255, 250, 220, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, layer.radius, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();
      
      // Cut out shadow side with soft edge
      const shadowGradient = ctx.createRadialGradient(centerX + 90, centerY, radius - 20, centerX + 90, centerY, layer.radius);
      shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      shadowGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.8)');
      shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(centerX + 90, centerY, layer.radius, 0, Math.PI * 2);
      ctx.fillStyle = shadowGradient;
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    });
    
    // Draw the main moon crescent with smooth edges
    const moonGradient = ctx.createRadialGradient(centerX - 40, centerY - 40, 0, centerX, centerY, radius);
    moonGradient.addColorStop(0, 'rgba(255, 255, 250, 1)');
    moonGradient.addColorStop(0.5, 'rgba(245, 245, 240, 1)');
    moonGradient.addColorStop(0.8, 'rgba(230, 230, 225, 1)');
    moonGradient.addColorStop(1, 'rgba(220, 220, 215, 0.95)');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = moonGradient;
    ctx.fill();
    
    // Cut out shadow with soft gradient edge for natural look
    const shadowGradient = ctx.createRadialGradient(centerX + 90, centerY, radius - 30, centerX + 90, centerY, radius + 10);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    shadowGradient.addColorStop(0.8, 'rgba(0, 0, 0, 1)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX + 90, centerY, radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = shadowGradient;
    ctx.fill();
    
    ctx.restore();
    
    const moonTexture = new THREE.CanvasTexture(canvas);
    const moonMaterial = new THREE.SpriteMaterial({
      map: moonTexture,
      transparent: true,
      blending: THREE.NormalBlending,
      depthTest: false
    });
    
    const moon = new THREE.Sprite(moonMaterial);
    moon.scale.set(35, 35, 1);
    moon.position.set(-80, 80, -150); // Raised higher in the sky
    this.scene.add(moon);
    
    this.moon = moon;
  }

  /**
   * Create exit door and floating title at T-junction back wall
   */
  createExitDoorAndTitle(mainWidth, mainLength, tBarWidth, tBarLength, junctionZ) {
    const tBarBackZ = junctionZ - tBarLength - 4; // Push door 4 units beyond back wall
    
    // Exit door dimensions
    const doorWidth = 6;
    const doorHeight = 10;
    const floatHeight = 2.0; // Raised to make door float higher
    const doorCenterY = doorHeight / 2 + floatHeight;
    
    // 1. Main white glowing door surface (no pulsing)
    const doorMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: false
    });
    
    const doorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(doorWidth, doorHeight),
      doorMaterial
    );
    doorMesh.position.set(0, doorCenterY, tBarBackZ);
    this.scene.add(doorMesh);
    this.edges.push(doorMesh);
    
    // 2. Intense white point light at door (static)
    const doorLight = new THREE.PointLight(0xffffff, 10.0, 40);
    doorLight.position.set(0, doorCenterY, tBarBackZ);
    this.scene.add(doorLight);
    
    // 3. Floor light spill - SpotLight pointing down at floor (static)
    const floorSpillLight = new THREE.SpotLight(0xffffff, 6.0, 15, Math.PI / 3, 0.8);
    floorSpillLight.position.set(0, doorHeight + floatHeight, tBarBackZ + 2);
    floorSpillLight.target.position.set(0, 0, tBarBackZ + 5);
    this.scene.add(floorSpillLight);
    this.scene.add(floorSpillLight.target);
    
    // 4. Create thin glowing accent-colored border tubes (like floor edges)
    this.createDoorBorderTubes(doorWidth, doorHeight, doorCenterY, tBarBackZ);
    
    // Create animated particles flowing into the door
    this.createDoorParticles(doorWidth, doorHeight, floatHeight, tBarBackZ);
    
    // Floating title in the sky above the hall
    const bubbleName = this.portfolioData?.title || 'Memory';
    const titleText = `${bubbleName}'s Memory Hall`;
    this.createFloatingTitle(titleText, 0, 25, tBarBackZ + 10, this.accentColor);
  }

  /**
   * Create thin glowing border tubes around door (with neon glow)
   */
  createDoorBorderTubes(doorWidth, doorHeight, doorCenterY, doorZ) {
    const coreRadius = 0.04; // Slightly thicker for visibility
    const innerGlowRadius = 0.1; // Thinner inner neon glow
    const outerGlowRadius = 0.25; // Thinner outer neon glow
    const tubeY = 0.2; // Height above door surface
    
    // Solid core material
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: this.accentColor,
      transparent: false
    });
    
    // Inner glow material
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    // Outer glow material
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    // Helper to create border tube with neon glow
    const createBorderTube = (length, position, rotation) => {
      // Solid core
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(coreRadius, coreRadius, length, 16),
        coreMaterial.clone()
      );
      core.position.copy(position);
      if (rotation.x) core.rotation.x = rotation.x;
      if (rotation.z) core.rotation.z = rotation.z;
      this.scene.add(core);
      this.edges.push(core);
      
      // Inner glow
      const innerGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(innerGlowRadius, innerGlowRadius, length, 16),
        innerGlowMaterial.clone()
      );
      innerGlow.position.copy(position);
      if (rotation.x) innerGlow.rotation.x = rotation.x;
      if (rotation.z) innerGlow.rotation.z = rotation.z;
      this.scene.add(innerGlow);
      this.edges.push(innerGlow);
      
      // Outer glow
      const outerGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(outerGlowRadius, outerGlowRadius, length, 16),
        outerGlowMaterial.clone()
      );
      outerGlow.position.copy(position);
      if (rotation.x) outerGlow.rotation.x = rotation.x;
      if (rotation.z) outerGlow.rotation.z = rotation.z;
      this.scene.add(outerGlow);
      this.edges.push(outerGlow);
      
      // Point light for neon effect
      const light = new THREE.PointLight(this.accentColor, 2.5, 12);
      light.position.copy(position);
      this.scene.add(light);
    };
    
    // Helper to create corner sphere with neon glow
    const createCornerSphere = (position) => {
      // Solid core sphere
      const coreSphere = new THREE.Mesh(
        new THREE.SphereGeometry(coreRadius, 16, 16),
        coreMaterial.clone()
      );
      coreSphere.position.copy(position);
      this.scene.add(coreSphere);
      this.edges.push(coreSphere);
      
      // Inner glow sphere
      const innerGlowSphere = new THREE.Mesh(
        new THREE.SphereGeometry(innerGlowRadius, 16, 16),
        innerGlowMaterial.clone()
      );
      innerGlowSphere.position.copy(position);
      this.scene.add(innerGlowSphere);
      this.edges.push(innerGlowSphere);
      
      // Outer glow sphere
      const outerGlowSphere = new THREE.Mesh(
        new THREE.SphereGeometry(outerGlowRadius, 16, 16),
        outerGlowMaterial.clone()
      );
      outerGlowSphere.position.copy(position);
      this.scene.add(outerGlowSphere);
      this.edges.push(outerGlowSphere);
      
      // Point light at corner
      const light = new THREE.PointLight(this.accentColor, 3.0, 12);
      light.position.copy(position);
      this.scene.add(light);
    };
    
    const halfWidth = doorWidth / 2;
    const halfHeight = doorHeight / 2;
    const topY = doorCenterY + halfHeight;
    const bottomY = doorCenterY - halfHeight;
    
    // Top border (horizontal)
    createBorderTube(
      doorWidth,
      new THREE.Vector3(0, topY, doorZ + tubeY),
      { z: Math.PI / 2 }
    );
    
    // Bottom border (horizontal)
    createBorderTube(
      doorWidth,
      new THREE.Vector3(0, bottomY, doorZ + tubeY),
      { z: Math.PI / 2 }
    );
    
    // Left border (vertical)
    createBorderTube(
      doorHeight,
      new THREE.Vector3(-halfWidth, doorCenterY, doorZ + tubeY),
      { x: 0 }
    );
    
    // Right border (vertical)
    createBorderTube(
      doorHeight,
      new THREE.Vector3(halfWidth, doorCenterY, doorZ + tubeY),
      { x: 0 }
    );
    
    // Add corner spheres to connect the tubes seamlessly
    createCornerSphere(new THREE.Vector3(-halfWidth, topY, doorZ + tubeY)); // Top-left
    createCornerSphere(new THREE.Vector3(halfWidth, topY, doorZ + tubeY));  // Top-right
    createCornerSphere(new THREE.Vector3(-halfWidth, bottomY, doorZ + tubeY)); // Bottom-left
    createCornerSphere(new THREE.Vector3(halfWidth, bottomY, doorZ + tubeY));  // Bottom-right
  }
  
  /**
   * No background glow - removed
   */
  createDoorBackgroundGlow(doorWidth, doorHeight, doorCenterY, doorZ) {
    // Background glow removed - only neon border tubes now
  }
  /**
   * Create animated particles flowing into the door
   */
  createDoorParticles(doorWidth, doorHeight, floatHeight, doorZ) {
    const particleCount = 40; // Doubled particle count for more visibility
    const particles = [];
    const startDistance = 8; // Distance from door edge where particles start
    
    for (let i = 0; i < particleCount; i++) {
      // Create brighter white glowing particle
      const canvas = document.createElement('canvas');
      canvas.width = 32; // Larger canvas for bigger particles
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      // Brighter gradient with more solid core
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.5)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
      
      const texture = new THREE.CanvasTexture(canvas);
      const particleMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const particle = new THREE.Sprite(particleMaterial);
      particle.scale.set(0.6, 0.6, 1); // Larger particles (doubled from 0.3)
      
      // Random starting position farther from door perimeter
      const side = Math.floor(Math.random() * 4);
      let startX, startY;
      
      if (side === 0) { // Top - start farther above
        startX = (Math.random() - 0.5) * (doorWidth + startDistance * 2);
        startY = doorHeight + floatHeight + startDistance;
      } else if (side === 1) { // Bottom - start farther below
        startX = (Math.random() - 0.5) * (doorWidth + startDistance * 2);
        startY = floatHeight - startDistance;
      } else if (side === 2) { // Left - start farther left
        startX = -doorWidth / 2 - startDistance;
        startY = Math.random() * (doorHeight + startDistance * 2) + floatHeight - startDistance;
      } else { // Right - start farther right
        startX = doorWidth / 2 + startDistance;
        startY = Math.random() * (doorHeight + startDistance * 2) + floatHeight - startDistance;
      }
      
      particle.position.set(startX, startY, doorZ + 2);
      this.scene.add(particle);
      
      particles.push({
        sprite: particle,
        startX: startX,
        startY: startY,
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.003 // Slightly varied speed
      });
    }
    
    this.doorParticles = { particles, doorWidth, doorHeight, floatHeight, doorZ };
  }

  /**
   * Create floating 3D glowing title with depth
   */
  createFloatingTitle(text, x, y, z, color) {
    // Create canvas for text texture with higher resolution
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparency
    ctx.clearRect(0, 0, 2048, 512);
    
    // Dynamically adjust font size based on text length
    let fontSize = 140;
    ctx.font = `bold ${fontSize}px Arial`;
    let textMetrics = ctx.measureText(text);
    
    // If text is too wide, reduce font size
    const maxWidth = 1900; // Leave some padding
    while (textMetrics.width > maxWidth && fontSize > 60) {
      fontSize -= 5;
      ctx.font = `bold ${fontSize}px Arial`;
      textMetrics = ctx.measureText(text);
    }
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Outer glow layers
    const colorHex = color.getHexString();
    const r = parseInt(colorHex.slice(0, 2), 16);
    const g = parseInt(colorHex.slice(2, 4), 16);
    const b = parseInt(colorHex.slice(4, 6), 16);
    
    // Multiple glow layers for depth
    ctx.shadowBlur = 50;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
    ctx.fillText(text, 1024, 256);
    
    ctx.shadowBlur = 30;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 1)`;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
    ctx.fillText(text, 1024, 256);
    
    // Bright white core
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 255, 255, 1)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillText(text, 1024, 256);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create 3D depth effect by layering multiple planes - reduced for performance
    const textWidth = 70; // Increased from 50
    const textHeight = 16; // Increased from 12
    const depthLayers = 4; // Reduced from 8 to 4 for better performance
    const layerSpacing = 0.2; // Slightly increased spacing to maintain depth perception
    
    const textGroup = new THREE.Group();
    
    // Create back layers (darker, for depth)
    for (let i = depthLayers - 1; i >= 0; i--) {
      const layerGeometry = new THREE.PlaneGeometry(textWidth, textHeight);
      const opacity = 0.3 + (i / depthLayers) * 0.7; // Fade from back to front
      
      // Use NormalBlending for front layer to preserve white color
      const blendMode = i === 0 ? THREE.NormalBlending : THREE.AdditiveBlending;
      
      const layerMaterial = new THREE.MeshBasicMaterial({
        map: i === 0 ? texture : texture.clone(),
        transparent: true,
        side: THREE.DoubleSide,
        blending: blendMode,
        depthWrite: false,
        opacity: i === 0 ? 1.0 : opacity // Front layer full opacity
      });
      
      const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
      layerMesh.position.z = -i * layerSpacing; // Stack layers back
      
      // Add slight color tint ONLY to back layers (not the front layer i===0)
      if (i > 0) {
        layerMaterial.color.setRGB(
          r / 255 * (0.5 + i / depthLayers * 0.5),
          g / 255 * (0.5 + i / depthLayers * 0.5),
          b / 255 * (0.5 + i / depthLayers * 0.5)
        );
      } else {
        // Front layer stays pure white - no color tinting
        layerMaterial.color.setRGB(1, 1, 1);
      }
      
      textGroup.add(layerMesh);
    }
    
    textGroup.position.set(x, y, z);
    this.scene.add(textGroup);
    
    // Add stronger point light behind text for extra glow
    const textLight = new THREE.PointLight(color, 5.0, 30);
    textLight.position.set(x, y, z - 2);
    this.scene.add(textLight);
    
    // Add rim lights on sides for 3D effect
    const leftLight = new THREE.PointLight(color, 2.5, 20);
    leftLight.position.set(x - 20, y, z);
    this.scene.add(leftLight);
    
    const rightLight = new THREE.PointLight(color, 2.5, 20);
    rightLight.position.set(x + 20, y, z);
    this.scene.add(rightLight);
    
    // Add floating animation
    const floatOffset = Math.random() * Math.PI * 2;
    this.titleSprite = { 
      sprite: textGroup, 
      baseY: y, 
      floatOffset: floatOffset, 
      light: textLight,
      rimLights: [leftLight, rightLight]
    };
  }

  /**
   * Create hologram platform as part of Memory Hall structure (platform only)
   */
  createHologramPlatform(accentColor) {
    const hologramX = -6;
    const hologramZ = 16;
    const platformRadius = 1.4;
    const platformY = 0.2;
    
    // Create platform only - beam/ring/light created when chibi appears
    const platformGeometry = new THREE.CylinderGeometry(platformRadius, platformRadius, 0.2, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    
    this.welcomePlatform = new THREE.Mesh(platformGeometry, platformMaterial);
    this.welcomePlatform.position.set(hologramX, platformY, hologramZ);
    this.scene.add(this.welcomePlatform);
  }

  /**
   * Show the detail view with loading screen
   */
  async show(accentColor, portfolioData = null) {
    console.log('DetailView.show called with:', accentColor, portfolioData);
    
    // Store portfolio data for returning to correct position
    this.currentPortfolio = portfolioData;
    
    if (!this.container) {
      this.init();
    }

    // Clean up previous content before creating new
    this.cleanupSceneContent();

    // Reset camera position and rotation
    this.camera.position.set(0, 5, 45); // Spawn far back to see full entrance arc
    this.cameraRotation.x = 0; // Look straight ahead, not down
    this.cameraRotation.y = 0;
    this.cameraVelocity.set(0, 0, 0);
    
    // Update camera FOV for current screen size
    const aspect = window.innerWidth / window.innerHeight;
    const baseFOV = 50;
    const fov = aspect < 1 ? baseFOV * (1 / aspect) * 0.75 : baseFOV;
    this.camera.fov = fov;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    
    // Reset movement keys
    this.keys = { forward: false, backward: false, left: false, right: false };

    this.portfolioData = portfolioData;
    
    // Create white fade overlay for transition
    const fadeOverlay = document.createElement('div');
    fadeOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.95);
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.8s ease-in-out;
      pointer-events: none;
    `;
    document.body.appendChild(fadeOverlay);
    
    // Fade to white
    setTimeout(() => {
      fadeOverlay.style.opacity = '1';
    }, 10);
    
    // Wait for fade to complete
    await new Promise(resolve => setTimeout(resolve, 900));
    
    // Load memory hall assets while white
    this.createLollipopFloor(accentColor);
    
    // Set isActive and show container
    this.isActive = true;
    this.container.style.display = 'block';
    this.container.style.opacity = '1';
    this.container.style.zIndex = '200';
    
    // Start animation loop
    this.animate();
    
    // Wait a moment for rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Fade from white to reveal memory hall - smoother and slower
    fadeOverlay.style.transition = 'opacity 1.5s cubic-bezier(0.4, 0.0, 0.2, 1)';
    fadeOverlay.style.opacity = '0';
    
    // Remove overlay after fade completes
    setTimeout(() => {
      fadeOverlay.remove();
    }, 1500);
    
    // Add back button
    this.createBackButton();
    
    // Add controls
    this.addControls();

    // POV hand
    this.createPOVHand();

    this.animate();
    
    // Show chibi welcome screen immediately (platform visible right away)
    this.showChibiWelcome();
    
    console.log('DetailView shown successfully');
  }

  /**
   * Show 3D hologram welcome with chibi avatar and speech bubble
   */
  showChibiWelcome() {
    const folder = this.portfolioData?.folder;
    if (!folder) return;
    
    // Remove any existing welcome hologram sprite only (platform is part of floor now)
    if (this.welcomeHologram) {
      this.scene.remove(this.welcomeHologram);
      if (this.welcomeHologram.material) {
        this.welcomeHologram.material.dispose();
        if (this.welcomeHologram.material.map) {
          this.welcomeHologram.material.map.dispose();
        }
      }
      if (this.welcomeHologram.geometry) {
        this.welcomeHologram.geometry.dispose();
      }
      this.welcomeHologram = null;
    }
    
    // Use portfolio folder name as the chibi filename
    const chibiPath = `assets/portfolios/${folder}/chibi_avatar/${folder}.png`;
    const portfolioName = this.portfolioData?.title || 'Memory';
    const accentColor = this.portfolioData?.color || '#FF1493';
    
    // Platform is already created as part of the floor in createHologramPlatform()
    const hologramX = -6;
    const hologramY = 6.5;
    const hologramZ = 16;
    const platformRadius = 1.4;
    const platformY = 0.2;
    
    // Create beam, ring, and light (platform already exists)
    const beamHeight = 3;
    const beamGeometry = new THREE.ConeGeometry(platformRadius * 1.2, beamHeight, 32, 16, false);
    const beamMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(accentColor) }
      },
      vertexShader: `
        varying float vHeight;
        void main() {
          vHeight = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vHeight;
        void main() {
          float alpha = smoothstep(-1.5, 1.5, vHeight);
          gl_FragColor = vec4(color, alpha * 0.8);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.welcomeBeam = new THREE.Mesh(beamGeometry, beamMaterial);
    this.welcomeBeam.rotation.x = Math.PI;
    this.welcomeBeam.position.set(hologramX, platformY + beamHeight / 2 + 0.3, hologramZ);
    this.welcomeBeam.renderOrder = 1;
    this.scene.add(this.welcomeBeam);
    
    // Create ring
    const ringGeometry = new THREE.RingGeometry(platformRadius - 0.1, platformRadius + 0.1, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentColor),
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    this.welcomeRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.welcomeRing.rotation.x = -Math.PI / 2;
    this.welcomeRing.position.set(hologramX, platformY + 0.1, hologramZ);
    this.scene.add(this.welcomeRing);
    
    // Create light
    this.welcomePlatformLight = new THREE.PointLight(new THREE.Color(accentColor), 3, 20);
    this.welcomePlatformLight.position.set(hologramX, platformY + 0.3, hologramZ);
    this.scene.add(this.welcomePlatformLight);
    
    // Create canvas for hologram texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // Load chibi image
    const chibiImage = new Image();
    chibiImage.crossOrigin = 'anonymous';
    chibiImage.onload = () => {
      // Clear canvas with fully transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Reset all context settings to defaults
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      
      // Center everything on canvas for proper billboard effect
      const chibiSize = 350;
      const chibiX = (canvas.width - chibiSize) / 2; // Center horizontally
      const chibiY = canvas.height - chibiSize - 100; // Leave space for name below
      ctx.drawImage(chibiImage, chibiX, chibiY, chibiSize, chibiSize);
      
      // Draw portfolio name below chibi (centered with glowing white border)
      ctx.font = 'bold 45px Arial Black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      const nameX = canvas.width / 2; // Center of canvas
      const nameY = chibiY + chibiSize - 15; // Even closer to chibi
      
      // Draw glowing white border (multiple layers for stronger glow)
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(portfolioName.toUpperCase(), nameX, nameY);
      
      // Additional glow layer
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.strokeText(portfolioName.toUpperCase(), nameX, nameY);
      
      // Reset shadow for fill
      ctx.shadowBlur = 0;
      
      // Draw colored fill on top
      ctx.fillStyle = accentColor;
      ctx.fillText(portfolioName.toUpperCase(), nameX, nameY);
      
      // Speech bubble will be drawn later during animation
      
      // Create texture and sprite
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthTest: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        toneMapped: false
      });
      
      this.welcomeHologram = new THREE.Sprite(material);
      
      // Position hologram on the floor like a welcome staff/bot (left side of entrance)
      const hologramX = -6;
      const hologramY = 6.5;
      const hologramZ = 16;
      this.welcomeHologram.position.set(hologramX, hologramY, hologramZ);
      this.welcomeHologram.scale.set(14, 10.5, 1);
      
      this.scene.add(this.welcomeHologram);
      
      // Store canvas and context for redrawing with speech bubble
      const canvasRef = canvas;
      const ctxRef = ctx;
      let speechBubbleDrawn = false;
      let bubbleCanvas = null;
      
      // Save the base canvas (chibi + name) before any modifications
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = canvas.width;
      baseCanvas.height = canvas.height;
      const baseCtx = baseCanvas.getContext('2d');
      baseCtx.drawImage(canvas, 0, 0);
      
      // Function to draw speech bubble on a separate canvas (drawn once)
      const createSpeechBubbleCanvas = () => {
        if (bubbleCanvas) return bubbleCanvas;
        
        bubbleCanvas = document.createElement('canvas');
        bubbleCanvas.width = canvasRef.width;
        bubbleCanvas.height = canvasRef.height;
        const bubbleCtx = bubbleCanvas.getContext('2d');
        
        // Draw speech bubble above chibi (centered)
        const bubbleWidth = 400;
        const bubbleHeight = 180;
        const bubbleX = (bubbleCanvas.width - bubbleWidth) / 2;
        const bubbleY = 120;
        const bubbleRadius = 20;
        const tailSize = 30;
        
        // Draw frosted glass effect background
        bubbleCtx.fillStyle = 'rgba(0, 20, 40, 0.7)';
        this.roundRect(bubbleCtx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius);
        bubbleCtx.fill();
        
        // Add subtle inner glow for depth
        bubbleCtx.fillStyle = 'rgba(0, 40, 80, 0.3)';
        this.roundRect(bubbleCtx, bubbleX + 2, bubbleY + 2, bubbleWidth - 4, bubbleHeight - 4, bubbleRadius - 2);
        bubbleCtx.fill();
        
        // Enhanced glowing border effect (multiple layers for stronger glow)
        // Outer glow
        bubbleCtx.strokeStyle = accentColor;
        bubbleCtx.lineWidth = 4;
        bubbleCtx.shadowColor = accentColor;
        bubbleCtx.shadowBlur = 30;
        this.roundRect(bubbleCtx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius);
        bubbleCtx.stroke();
        
        // Middle glow
        bubbleCtx.lineWidth = 3;
        bubbleCtx.shadowBlur = 20;
        this.roundRect(bubbleCtx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius);
        bubbleCtx.stroke();
        
        // Inner glow
        bubbleCtx.strokeStyle = accentColor;
        bubbleCtx.lineWidth = 2;
        bubbleCtx.shadowBlur = 15;
        this.roundRect(bubbleCtx, bubbleX + 5, bubbleY + 5, bubbleWidth - 10, bubbleHeight - 10, bubbleRadius - 5);
        bubbleCtx.stroke();
        
        // Reset shadow for tail
        bubbleCtx.shadowBlur = 0;
        
        // Bubble tail (pointing to chibi) with enhanced glow - centered
        const tailCenterX = bubbleX + bubbleWidth / 2;
        bubbleCtx.beginPath();
        bubbleCtx.moveTo(tailCenterX - 50, bubbleY + bubbleHeight);
        bubbleCtx.lineTo(tailCenterX, bubbleY + bubbleHeight + tailSize);
        bubbleCtx.lineTo(tailCenterX + 50, bubbleY + bubbleHeight);
        bubbleCtx.closePath();
        bubbleCtx.fillStyle = 'rgba(0, 40, 80, 0.3)';
        bubbleCtx.fill();
        
        // Enhanced tail glow
        bubbleCtx.strokeStyle = accentColor;
        bubbleCtx.lineWidth = 4;
        bubbleCtx.shadowColor = accentColor;
        bubbleCtx.shadowBlur = 30;
        bubbleCtx.stroke();
        
        // Additional tail glow layer
        bubbleCtx.lineWidth = 3;
        bubbleCtx.shadowBlur = 20;
        bubbleCtx.stroke();
        
        // Reset shadow for text
        bubbleCtx.shadowBlur = 0;
        
        // Draw welcome text in bubble
        const fullText = `${portfolioName}'s Memory Hall!`;
        let fontSize = 26;
        
        if (fullText.length > 25) {
          fontSize = 22;
        } else if (fullText.length > 20) {
          fontSize = 24;
        }
        
        bubbleCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        bubbleCtx.font = `bold ${fontSize}px Courier New`;
        bubbleCtx.textAlign = 'center';
        bubbleCtx.textBaseline = 'middle';
        
        const titleX = bubbleX + bubbleWidth / 2;
        const centerY = bubbleY + bubbleHeight / 2;
        bubbleCtx.fillText(`Welcome to`, titleX, centerY - 30);
        bubbleCtx.fillText(fullText, titleX, centerY + 30);
        
        return bubbleCanvas;
      };
      
      // Function to composite speech bubble with fade
      let lastBubbleAlpha = -1;
      const drawWithBubbleFade = (bubbleAlpha) => {
        // Only redraw if alpha changed significantly (reduce updates)
        if (Math.abs(bubbleAlpha - lastBubbleAlpha) < 0.05 && lastBubbleAlpha >= 0) {
          return;
        }
        lastBubbleAlpha = bubbleAlpha;
        
        // Clear and redraw base (chibi + name from saved base canvas)
        ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height);
        ctxRef.drawImage(baseCanvas, 0, 0);
        
        // Draw speech bubble with alpha
        if (bubbleAlpha > 0) {
          const bubble = createSpeechBubbleCanvas();
          ctxRef.globalAlpha = bubbleAlpha;
          ctxRef.drawImage(bubble, 0, 0);
          ctxRef.globalAlpha = 1.0;
        }
        
        texture.needsUpdate = true;
      };
      
      // Animate hologram appearance in sequence: chibi+name first, then speech bubble fades in
      const startTime = this.time;
      const chibiDuration = 0.8; // Chibi+name fade in over 0.8s
      const bubbleDelay = 1.8; // Bubble appears 1.8s after chibi starts
      const bubbleDuration = 0.6; // Bubble fades in over 0.6s
      
      this.welcomeHologramAnimation = () => {
        const elapsed = this.time - startTime;
        
        // Phase 1: Fade in chibi and name (0 to chibiDuration)
        if (elapsed < chibiDuration) {
          const chibiProgress = elapsed / chibiDuration;
          this.welcomeHologram.material.opacity = chibiProgress;
        }
        // Phase 2: Chibi+name fully visible, wait for bubble delay
        else if (elapsed < bubbleDelay) {
          this.welcomeHologram.material.opacity = 1.0;
        }
        // Phase 3: Fade in speech bubble
        else if (elapsed < bubbleDelay + bubbleDuration) {
          const bubbleProgress = (elapsed - bubbleDelay) / bubbleDuration;
          drawWithBubbleFade(bubbleProgress);
          this.welcomeHologram.material.opacity = 1.0;
        }
        // Phase 4: Everything fully visible
        else {
          if (!speechBubbleDrawn) {
            drawWithBubbleFade(1.0);
            speechBubbleDrawn = true;
          }
          this.welcomeHologram.material.opacity = 1.0;
          this.welcomeHologramAnimation = null;
        }
      };
    };
    
    chibiImage.onerror = () => {
      console.warn('Failed to load chibi image:', chibiPath);
    };
    
    chibiImage.src = chibiPath;
  }
  
  /**
   * Helper function to draw rounded rectangle
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Clean up scene content before creating new
   */
  cleanupSceneContent() {
    // Remove old title
    if (this.titleSprite) {
      if (this.titleSprite.sprite) {
        this.scene.remove(this.titleSprite.sprite);
        
        // Handle group of meshes (for 3D layered text)
        if (this.titleSprite.sprite.children) {
          this.titleSprite.sprite.children.forEach(child => {
            if (child.material) {
              child.material.dispose();
              if (child.material.map) {
                child.material.map.dispose();
              }
            }
            if (child.geometry) {
              child.geometry.dispose();
            }
          });
        }
        
        // Handle single mesh
        if (this.titleSprite.sprite.material) {
          this.titleSprite.sprite.material.dispose();
          if (this.titleSprite.sprite.material.map) {
            this.titleSprite.sprite.material.map.dispose();
          }
        }
        if (this.titleSprite.sprite.geometry) {
          this.titleSprite.sprite.geometry.dispose();
        }
      }
      
      // Remove main light
      if (this.titleSprite.light) {
        this.scene.remove(this.titleSprite.light);
      }
      
      // Remove rim lights
      if (this.titleSprite.rimLights) {
        this.titleSprite.rimLights.forEach(light => {
          this.scene.remove(light);
        });
      }
      
      this.titleSprite = null;
    }

    // Remove old arc particles
    if (this.arcParticles) {
      this.arcParticles.particles.forEach(particle => {
        this.scene.remove(particle.sprite);
        if (particle.sprite.material) {
          particle.sprite.material.dispose();
          if (particle.sprite.material.map) {
            particle.sprite.material.map.dispose();
          }
        }
      });
      this.arcParticles = null;
    }

    // Remove old door particles
    if (this.doorParticles) {
      this.doorParticles.particles.forEach(particle => {
        this.scene.remove(particle.sprite);
        if (particle.sprite.material) {
          particle.sprite.material.dispose();
          if (particle.sprite.material.map) {
            particle.sprite.material.map.dispose();
          }
        }
      });
      this.doorParticles = null;
    }

    // Remove old orbs
    if (this.orbs) {
      this.orbs.forEach(orb => {
        // Remove from scene
        this.scene.remove(orb.mesh);
        if (orb.glowRing) this.scene.remove(orb.glowRing);
        if (orb.light) this.scene.remove(orb.light);
        if (orb.platform) this.scene.remove(orb.platform);
        if (orb.textSprite) this.scene.remove(orb.textSprite);
        
        // Stop and cleanup video
        if (orb.videoElement) {
          orb.videoElement.pause();
          orb.videoElement.src = '';
          orb.videoElement.load();
          orb.videoElement = null;
        }
        
        // Stop slideshow interval
        if (orb.slideshowInterval) {
          clearInterval(orb.slideshowInterval);
          orb.slideshowInterval = null;
        }
        
        // Stop any active crossfade intervals
        if (orb.crossfadeInterval) {
          clearInterval(orb.crossfadeInterval);
          orb.crossfadeInterval = null;
        }
        
        // Dispose mesh resources
        if (orb.mesh.geometry) orb.mesh.geometry.dispose();
        if (orb.mesh.material) {
          if (orb.mesh.material.map) orb.mesh.material.map.dispose();
          orb.mesh.material.dispose();
        }
        
        // Dispose glow ring resources
        if (orb.glowRing) {
          if (orb.glowRing.geometry) orb.glowRing.geometry.dispose();
          if (orb.glowRing.material) {
            if (orb.glowRing.material.map) orb.glowRing.material.map.dispose();
            orb.glowRing.material.dispose();
          }
        }
        
        // Dispose platform resources
        if (orb.platform) {
          orb.platform.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (child.material.map) child.material.map.dispose();
              child.material.dispose();
            }
          });
        }
        
        // Dispose text sprite resources
        if (orb.textSprite) {
          if (orb.textSprite.geometry) orb.textSprite.geometry.dispose();
          if (orb.textSprite.material) {
            if (orb.textSprite.material.map) orb.textSprite.material.map.dispose();
            orb.textSprite.material.dispose();
          }
        }
        
        // Dispose texture
        if (orb.texture) {
          orb.texture.dispose();
        }
      });
      this.orbs = [];
    }

    // Remove old edges
    if (this.edges) {
      this.edges.forEach(edge => {
        this.scene.remove(edge);
        if (edge.geometry) edge.geometry.dispose();
        if (edge.material) edge.material.dispose();
      });
      this.edges = [];
    }

    // Remove old floor
    if (this.floor) {
      this.scene.remove(this.floor);
      if (this.floor.geometry) this.floor.geometry.dispose();
      if (this.floor.material) {
        if (this.floor.material.map) this.floor.material.map.dispose();
        this.floor.material.dispose();
      }
      this.floor = null;
    }
    
    // Remove floor pieces (lollipop layout components)
    if (this.floorPieces) {
      this.floorPieces.forEach(piece => {
        this.scene.remove(piece);
        if (piece.geometry) piece.geometry.dispose();
        if (piece.material) {
          if (piece.material.map) piece.material.map.dispose();
          piece.material.dispose();
        }
      });
      this.floorPieces = [];
    }
    
    // Remove welcome hologram and platform
    if (this.welcomeHologram) {
      this.scene.remove(this.welcomeHologram);
      if (this.welcomeHologram.material) {
        this.welcomeHologram.material.dispose();
        if (this.welcomeHologram.material.map) {
          this.welcomeHologram.material.map.dispose();
        }
      }
      if (this.welcomeHologram.geometry) {
        this.welcomeHologram.geometry.dispose();
      }
      this.welcomeHologram = null;
    }
    
    if (this.welcomePlatform) {
      this.scene.remove(this.welcomePlatform);
      if (this.welcomePlatform.geometry) this.welcomePlatform.geometry.dispose();
      if (this.welcomePlatform.material) this.welcomePlatform.material.dispose();
      this.welcomePlatform = null;
    }
    
    if (this.welcomeBeam) {
      this.scene.remove(this.welcomeBeam);
      if (this.welcomeBeam.geometry) this.welcomeBeam.geometry.dispose();
      if (this.welcomeBeam.material) {
        if (this.welcomeBeam.material.uniforms) {
          Object.values(this.welcomeBeam.material.uniforms).forEach(uniform => {
            if (uniform.value && uniform.value.dispose) {
              uniform.value.dispose();
            }
          });
        }
        this.welcomeBeam.material.dispose();
      }
      this.welcomeBeam = null;
    }
    
    if (this.welcomeRing) {
      this.scene.remove(this.welcomeRing);
      if (this.welcomeRing.geometry) this.welcomeRing.geometry.dispose();
      if (this.welcomeRing.material) this.welcomeRing.material.dispose();
      this.welcomeRing = null;
    }
    
    if (this.welcomePlatformLight) {
      this.scene.remove(this.welcomePlatformLight);
      this.welcomePlatformLight = null;
    }
    
    // Clear welcome hologram animation
    if (this.welcomeHologramAnimation) {
      this.welcomeHologramAnimation = null;
    }
    
    if (this.welcomeRing) {
      this.scene.remove(this.welcomeRing);
      if (this.welcomeRing.geometry) this.welcomeRing.geometry.dispose();
      if (this.welcomeRing.material) this.welcomeRing.material.dispose();
      this.welcomeRing = null;
    }
    
    if (this.welcomePlatformLight) {
      this.scene.remove(this.welcomePlatformLight);
      this.welcomePlatformLight = null;
    }

    // Remove all lights from previous hall
    const lightsToRemove = [];
    this.scene.traverse((object) => {
      if (object instanceof THREE.Light && !(object instanceof THREE.AmbientLight) && !(object instanceof THREE.DirectionalLight) && !(object instanceof THREE.HemisphereLight)) {
        lightsToRemove.push(object);
      }
    });
    lightsToRemove.forEach(light => this.scene.remove(light));
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event) {
    console.log('onMouseUp triggered');
    this.isMouseDown = false;
    this.container.style.cursor = 'grab';
    
    // Check for orb clicks (only if not dragging)
    // Compare to initial mouse down position, not last move position
    const dragDistance = Math.sqrt(
      Math.pow(event.clientX - this.mouseDownX, 2) + 
      Math.pow(event.clientY - this.mouseDownY, 2)
    );
    
    console.log('Drag distance:', dragDistance);
    
    if (dragDistance < 5) { // Small threshold for click vs drag
      console.log('Click detected, checking orbs...');
      this.checkOrbClick(event.clientX, event.clientY);
    }
  }
  
  /**
   * Check if an orb was clicked
   */
  checkOrbClick(mouseX, mouseY) {
    console.log('checkOrbClick called, portfolioData:', this.portfolioData);
    
    if (!this.portfolioData) {
      console.log('No portfolio data available');
      return;
    }
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    mouse.x = (mouseX / window.innerWidth) * 2 - 1;
    mouse.y = -(mouseY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, this.camera);
    
    // Check intersections with orb meshes
    const orbMeshes = this.orbs.map(orb => orb.mesh);
    const intersects = raycaster.intersectObjects(orbMeshes);
    
    console.log('Orb intersections:', intersects.length);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const orbIndex = this.orbs.findIndex(orb => orb.mesh === clickedMesh);

      console.log('Clicked orb index:', orbIndex);

      if (orbIndex !== -1) {
        // Trigger click animation, delay content until after it plays
        if (Object.keys(this.clickPose).length > 0) {
          this.clickAnimLerp = 1;
          setTimeout(() => { this.clickAnimLerp = 0; }, 600);
          setTimeout(() => { this.showOrbContent(orbIndex); }, 350);
        } else {
          this.clickAnimTarget = 1;
          setTimeout(() => { this.clickAnimTarget = 0; }, 200);
          this.showOrbContent(orbIndex);
        }
      }
    }
  }
  
  /**
   * Display content for clicked orb
   */
  showOrbContent(orbIndex) {
    console.log('showOrbContent called with index:', orbIndex);
    console.log('Portfolio data:', this.portfolioData);
    
    if (!this.portfolioData) return;
    
    // Get images from portfolio folder
    const folder = this.portfolioData.folder || `portfolio-${this.portfolioData.id}`;
    const cardTitles = this.portfolioData.cardTitles || {};
    
    console.log('Folder:', folder);
    console.log('Card titles:', cardTitles);
    
    // Create image cards (30 cards total - 6 main + 24 placeholders)
    const cardKeys = [
      'overview', 'gallery', 'technologies', 'details', 'links', 'contact',
      'placeholder1', 'placeholder2', 'placeholder3', 'placeholder4', 'placeholder5', 'placeholder6',
      'placeholder7', 'placeholder8', 'placeholder9', 'placeholder10', 'placeholder11', 'placeholder12',
      'placeholder13', 'placeholder14', 'placeholder15', 'placeholder16', 'placeholder17', 'placeholder18',
      'placeholder19', 'placeholder20', 'placeholder21', 'placeholder22', 'placeholder23', 'placeholder24'
    ];
    
    // Use direct index without modulo to ensure each orb uses its own folder
    const cardKey = cardKeys[orbIndex] || `placeholder${orbIndex + 1}`;
    const caption = cardTitles[cardKey] || 'Memory';
    
    // Try multiple file paths and extensions (video first, then images)
    const possiblePaths = [
      `assets/portfolios/${folder}/${cardKey}/1.mp4`,  // Try video first
      `assets/portfolios/${folder}/${cardKey}/1.jpg`,  // Then jpg
      `assets/portfolios/${folder}/${cardKey}/1.png`,  // Then png
      `assets/portfolios/${folder}/${cardKey}.mp4`,    // Fallback video path
      `assets/portfolios/${folder}/${cardKey}.jpg`,    // Fallback jpg path
      `assets/portfolios/${folder}/${cardKey}.png`     // Fallback png path
    ];
    
    console.log('Trying paths:', possiblePaths);
    
    // Try to load the first available media
    this.tryLoadMedia(possiblePaths, caption, orbIndex);
  }
  
  /**
   * Try loading media from multiple possible paths
   */
  tryLoadMedia(paths, caption, orbIndex, index = 0) {
    if (index >= paths.length) {
      console.log('No media found, showing fallback');
      this.showImageCard(null, caption, orbIndex);
      return;
    }
    
    const path = paths[index];
    const isVideo = path.endsWith('.mp4');
    
    if (isVideo) {
      // Try loading video
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        console.log('Video loaded successfully:', path);
        this.showImageCard(path, caption, orbIndex);
      };
      
      video.onerror = () => {
        console.log('Video failed to load, trying next:', path);
        this.tryLoadMedia(paths, caption, orbIndex, index + 1);
      };
      
      video.src = path;
    } else {
      // Try loading image
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully:', path);
        this.showImageCard(path, caption, orbIndex);
      };
      img.onerror = () => {
        console.log('Image failed to load:', path);
        this.tryLoadMedia(paths, caption, orbIndex, index + 1);
      };
      img.src = path;
    }
  }
  
  /**
   * Show image card with circular styling
   */
  showImageCard(imagePath, caption, orbIndex = null) {
    // Get the orb data if orbIndex is provided
    const orb = orbIndex !== null ? this.orbs[orbIndex] : null;
    const hasMultipleImages = orb && orb.slideshowImages && orb.slideshowImages.length > 1;
    let currentImageIndex = 0;
    
    // Remove existing card
    const existingCard = this.container.querySelector('.memory-card');
    if (existingCard) existingCard.remove();
    
    // Check if this is a video or image path
    const isVideo = imagePath && imagePath.endsWith('.mp4');
    
    // Pause Three.js animation for performance
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Create backdrop with blur
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px);
      -webkit-backdrop-filter: blur(0px);
      z-index: 999;
      transition: all 0.3s ease;
    `;
    this.container.appendChild(backdrop);
    
    // Trigger backdrop animation
    setTimeout(() => {
      backdrop.style.background = 'rgba(0, 0, 0, 0.7)';
      backdrop.style.backdropFilter = 'blur(10px)';
      backdrop.style.webkitBackdropFilter = 'blur(10px)';
    }, 10);
    
    // Create circular card container styled like a zoomed memory orb
    // Calculate responsive modal size that leaves room for controls
    // Reserve space: 80px for caption above, 150px for controls below
    const availableHeight = window.innerHeight - 230;
    const availableWidth = window.innerWidth * 0.85;
    
    // Make it wider for videos to show more content
    const modalSize = isVideo 
      ? `min(${availableWidth}px, 800px)` 
      : `min(${availableWidth}px, ${availableHeight}px, 600px)`;
    const modalHeight = isVideo 
      ? `min(${availableHeight * 0.7}px, 600px)` 
      : `min(${availableWidth}px, ${availableHeight}px, 600px)`;
    
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      width: ${modalSize};
      height: ${modalHeight};
      background: rgba(255, 196, 1, 0.90);
      border: 3px solid rgba(255, 196, 1, 0.8);
      border-radius: ${isVideo ? '40px' : '50%'};
      z-index: 1000;
      display: flex;
      flex-direction: column;
      opacity: 0;
      transition: all 0.3s ease;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 0 40px rgba(255, 196, 1, 0.7),
        0 0 80px rgba(255, 196, 1, 0.5),
        0 0 120px rgba(255, 196, 1, 0.3),
        inset 0 0 60px rgba(255, 196, 1, 0.15);
      padding: 0.2rem;
      animation: modalPulse 3s ease-in-out infinite;
      overflow: hidden;
    `;
    
    // Store calculated size for later use
    const calculatedSize = Math.min(availableWidth, availableHeight, 600);
    
    // Caption - positioned outside above the modal
    const captionEl = document.createElement('h3');
    captionEl.textContent = caption;
    captionEl.style.cssText = `
      color: #FFD700;
      font-size: 1.8rem;
      margin: 0;
      text-align: center;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
      position: fixed;
      top: calc(50% - ${calculatedSize / 2}px - 60px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 1001;
      opacity: 0;
      transition: opacity 0.3s ease 0.1s;
    `;
    card.appendChild(captionEl);
    
    // Trigger animations after elements are added to DOM
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translate(-50%, -50%) scale(1)';
      captionEl.style.opacity = '1';
    }, 10);
    
    // Media container - fills entire modal
    const mediaContainer = document.createElement('div');
    mediaContainer.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border-radius: ${isVideo ? '40px' : '50%'};
      overflow: hidden;
    `;
    
    // Add media if path is provided
    if (imagePath) {
      if (isVideo) {
        const video = document.createElement('video');
        video.src = imagePath;
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.muted = false;
        video.style.cssText = `
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          object-position: center;
        `;
        
        // Adjust modal size once video metadata is loaded
        video.addEventListener('loadedmetadata', () => {
          const videoAspect = video.videoWidth / video.videoHeight;
          const maxWidth = Math.min(window.innerWidth * 0.9, 1000);
          const maxHeight = Math.min(window.innerHeight * 0.8, 700);
          
          let modalWidth, modalHeight;
          
          if (videoAspect > maxWidth / maxHeight) {
            // Video is wider - fit to width
            modalWidth = maxWidth;
            modalHeight = maxWidth / videoAspect;
          } else {
            // Video is taller - fit to height
            modalHeight = maxHeight;
            modalWidth = maxHeight * videoAspect;
          }
          
          // Update card dimensions
          card.style.width = `${modalWidth}px`;
          card.style.height = `${modalHeight}px`;
          
          // Update caption and button positions
          captionEl.style.top = `calc(50% - ${modalHeight / 2}px - 60px)`;
          if (hasMultipleImages) {
            if (card.navContainer) {
              card.navContainer.style.top = `calc(50% + ${modalHeight / 2}px + 30px)`;
            }
            closeBtn.style.top = `calc(50% + ${modalHeight / 2}px + 90px)`;
          } else {
            closeBtn.style.top = `calc(50% + ${modalHeight / 2}px + 30px)`;
          }
        });
        
        mediaContainer.appendChild(video);
        
        // Add colored vignette overlay on the video (amber) - rounded rectangle
        const videoVignette = document.createElement('div');
        videoVignette.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 40px;
          background: radial-gradient(
            ellipse at center,
            rgba(247, 156, 0, 0) 0%,
            rgba(247, 156, 0, 0) 30%,
            rgba(247, 156, 0, 0.1) 45%,
            rgba(247, 156, 0, 0.2) 58%,
            rgba(247, 156, 0, 0.35) 70%,
            rgba(247, 156, 0, 0.5) 80%,
            rgba(247, 156, 0, 0.7) 90%,
            rgba(247, 156, 0, 0.85) 96%,
            rgba(247, 156, 0, 1) 100%
          );
          pointer-events: none;
          z-index: 1;
        `;
        mediaContainer.appendChild(videoVignette);
      } else {
        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = caption;
        img.style.cssText = `
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        `;
        mediaContainer.appendChild(img);
        
        // Add colored vignette overlay on the image (amber) - intensified with solid outer edge
        const imageVignette = document.createElement('div');
        imageVignette.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(
            circle at center,
            rgba(255, 187, 1, 0) 0%,
            rgba(255, 187, 1, 0) 15%,
            rgba(255, 187, 1, 0.2) 30%,
            rgba(255, 187, 1, 0.4) 42%,
            rgba(255, 187, 1, 0.6) 54%,
            rgba(255, 187, 1, 0.8) 68%,
            rgba(255, 187, 1, 0.95) 80%,
            rgba(255, 187, 1, 1) 90%,
            rgba(255, 187, 1, 1) 100%
          );
          pointer-events: none;
          z-index: 1;
        `;
        mediaContainer.appendChild(imageVignette);
      }
    }
    
    card.appendChild(mediaContainer);
    
    // Full view toggle button and navigation - positioned outside above close button
    let isFullView = false;
    
    // Create full view toggle button (for images only, not videos)
    let fullViewBtn = null;
    if (!isVideo) {
      fullViewBtn = document.createElement('button');
      fullViewBtn.textContent = '🔍 Full View';
      fullViewBtn.style.cssText = `
        padding: 0.6rem 1.2rem;
        background: rgba(255, 215, 0, 0.2);
        border: 2px solid rgba(255, 215, 0, 0.5);
        border-radius: 20px;
        color: #FFD700;
        cursor: pointer;
        font-size: 1rem;
        font-weight: bold;
        transition: all 0.3s ease;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
        white-space: nowrap;
      `;
      
      fullViewBtn.addEventListener('mouseenter', () => {
        fullViewBtn.style.background = 'rgba(255, 215, 0, 0.4)';
        fullViewBtn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
        fullViewBtn.style.transform = 'scale(1.05)';
      });
      
      fullViewBtn.addEventListener('mouseleave', () => {
        fullViewBtn.style.background = 'rgba(255, 215, 0, 0.2)';
        fullViewBtn.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
        fullViewBtn.style.transform = 'scale(1)';
      });
      
      fullViewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isFullView = !isFullView;
        
        const imgElement = mediaContainer.querySelector('img');
        const vignette = mediaContainer.querySelector('div');
        
        if (isFullView) {
          // Full view - resize modal to fit original image dimensions
          if (imgElement && imgElement.naturalWidth && imgElement.naturalHeight) {
            const imgAspect = imgElement.naturalWidth / imgElement.naturalHeight;
            
            // Reserve more space for caption (80px above) and controls (180px below for nav + close button)
            const reservedVerticalSpace = 280;
            const maxWidth = Math.min(window.innerWidth * 0.7, imgElement.naturalWidth);
            const maxHeight = Math.min(window.innerHeight - reservedVerticalSpace, imgElement.naturalHeight);
            
            let modalWidth, modalHeight;
            
            // Calculate dimensions to fit image while respecting max constraints
            if (imgElement.naturalWidth > maxWidth || imgElement.naturalHeight > maxHeight) {
              // Image is larger than max constraints, scale it down
              if (imgAspect > maxWidth / maxHeight) {
                modalWidth = maxWidth;
                modalHeight = maxWidth / imgAspect;
              } else {
                modalHeight = maxHeight;
                modalWidth = maxHeight * imgAspect;
              }
            } else {
              // Image fits within constraints, use natural size
              modalWidth = imgElement.naturalWidth;
              modalHeight = imgElement.naturalHeight;
            }
            
            // Update card dimensions with transition
            card.style.transition = 'all 0.4s ease';
            card.style.width = `${modalWidth}px`;
            card.style.height = `${modalHeight}px`;
            card.style.borderRadius = '40px';
            
            mediaContainer.style.borderRadius = '40px';
            if (vignette) vignette.style.borderRadius = '40px';
            if (imgElement) {
              imgElement.style.objectFit = 'contain';
              imgElement.style.borderRadius = '40px';
            }
            
            // Update caption position
            captionEl.style.transition = 'all 0.4s ease';
            captionEl.style.top = `calc(50% - ${modalHeight / 2}px - 60px)`;
            
            // Update navigation and close button positions
            if (card.navContainer) {
              card.navContainer.style.transition = 'all 0.4s ease';
              card.navContainer.style.top = `calc(50% + ${modalHeight / 2}px + 30px)`;
            }
            closeBtn.style.transition = 'all 0.4s ease';
            if (hasMultipleImages) {
              closeBtn.style.top = `calc(50% + ${modalHeight / 2}px + 90px)`;
            } else {
              closeBtn.style.top = `calc(50% + ${modalHeight / 2}px + 90px)`;
            }
          }
          
          fullViewBtn.textContent = '⭕ Circle View';
        } else {
          // Circle view - restore to circular modal
          card.style.transition = 'all 0.4s ease';
          card.style.width = modalSize;
          card.style.height = modalHeight;
          card.style.borderRadius = '50%';
          
          mediaContainer.style.borderRadius = '50%';
          if (vignette) vignette.style.borderRadius = '50%';
          if (imgElement) {
            imgElement.style.objectFit = 'cover';
            imgElement.style.borderRadius = '50%';
          }
          
          // Restore caption position
          captionEl.style.transition = 'all 0.4s ease';
          captionEl.style.top = `calc(50% - ${calculatedSize / 2}px - 60px)`;
          
          // Restore navigation and close button positions
          if (card.navContainer) {
            card.navContainer.style.transition = 'all 0.4s ease';
            card.navContainer.style.top = `calc(50% + ${calculatedSize / 2}px + 30px)`;
          }
          closeBtn.style.transition = 'all 0.4s ease';
          if (hasMultipleImages) {
            closeBtn.style.top = `calc(50% + ${calculatedSize / 2}px + 90px)`;
          } else {
            closeBtn.style.top = `calc(50% + ${calculatedSize / 2}px + 90px)`;
          }
          
          fullViewBtn.textContent = '🔍 Full View';
        }
      });
    }
    
    // Navigation for multiple images - positioned outside above close button
    if (hasMultipleImages && !isVideo) {
      const folder = this.portfolioData.folder;
      const cardKey = orb.cardKey;
      const totalImages = orb.slideshowImages.length;
      
      const navContainer = document.createElement('div');
      navContainer.style.cssText = `
        position: fixed;
        top: calc(50% + ${calculatedSize / 2}px + 30px);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 1.5rem;
        z-index: 1001;
      `;
      
      const prevBtn = document.createElement('button');
      prevBtn.textContent = '←';
      prevBtn.style.cssText = `
        width: 40px;
        height: 40px;
        background: rgba(255, 215, 0, 0.2);
        border: 2px solid rgba(255, 215, 0, 0.5);
        border-radius: 50%;
        color: #FFD700;
        cursor: pointer;
        font-size: 1.2rem;
        transition: all 0.3s ease;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
      `;
      
      prevBtn.addEventListener('mouseenter', () => {
        prevBtn.style.background = 'rgba(255, 215, 0, 0.4)';
        prevBtn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
        prevBtn.style.transform = 'scale(1.1)';
      });
      
      prevBtn.addEventListener('mouseleave', () => {
        prevBtn.style.background = 'rgba(255, 215, 0, 0.2)';
        prevBtn.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
        prevBtn.style.transform = 'scale(1)';
      });
      
      const counter = document.createElement('span');
      counter.textContent = `1 / ${totalImages}`;
      counter.style.cssText = `
        color: #FFD700;
        font-size: 1.1rem;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
      `;
      
      const nextBtn = document.createElement('button');
      nextBtn.textContent = '→';
      nextBtn.style.cssText = prevBtn.style.cssText;
      
      nextBtn.addEventListener('mouseenter', () => {
        nextBtn.style.background = 'rgba(255, 215, 0, 0.4)';
        nextBtn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
        nextBtn.style.transform = 'scale(1.1)';
      });
      
      nextBtn.addEventListener('mouseleave', () => {
        nextBtn.style.background = 'rgba(255, 215, 0, 0.2)';
        nextBtn.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
        nextBtn.style.transform = 'scale(1)';
      });
      
      const updateImage = () => {
        const imageNumber = currentImageIndex + 1;
        const newImagePath = `assets/portfolios/${folder}/${cardKey}/${imageNumber}.jpg`;
        const imgElement = mediaContainer.querySelector('img');
        
        if (imgElement) {
          imgElement.src = newImagePath;
          counter.textContent = `${imageNumber} / ${totalImages}`;
        }
      };
      
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImageIndex = (currentImageIndex - 1 + totalImages) % totalImages;
        updateImage();
      });
      
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImageIndex = (currentImageIndex + 1) % totalImages;
        updateImage();
      });
      
      navContainer.appendChild(prevBtn);
      navContainer.appendChild(counter);
      navContainer.appendChild(nextBtn);
      
      // Add full view button to navigation container
      if (fullViewBtn) {
        navContainer.appendChild(fullViewBtn);
      }
      
      this.container.appendChild(navContainer);
      
      // Store reference for cleanup
      card.navContainer = navContainer;
    } else if (fullViewBtn && !isVideo) {
      // No multiple images, but still show full view button alone
      const navContainer = document.createElement('div');
      navContainer.style.cssText = `
        position: fixed;
        top: calc(50% + ${calculatedSize / 2}px + 30px);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 1.5rem;
        z-index: 1001;
      `;
      
      navContainer.appendChild(fullViewBtn);
      this.container.appendChild(navContainer);
      card.navContainer = navContainer;
    }
    
    // Close button - positioned outside below navigation
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      position: fixed;
      top: calc(50% + ${calculatedSize / 2}px + 90px);
      left: 50%;
      transform: translateX(-50%);
      padding: 0.75rem 2rem;
      background: rgba(255, 215, 0, 0.3);
      border: 2px solid rgba(255, 215, 0, 0.6);
      border-radius: 25px;
      color: #FFD700;
      font-size: 1.1rem;
      font-weight: bold;
      cursor: pointer;
      z-index: 1001;
      opacity: 0;
      transition: all 0.3s ease 0.15s;
      box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
    `;
    
    // Fade in close button
    setTimeout(() => {
      closeBtn.style.opacity = '1';
    }, 10);
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 215, 0, 0.5)';
      closeBtn.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.7)';
      closeBtn.style.transform = 'translateX(-50%) scale(1.05)';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 215, 0, 0.3)';
      closeBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.4)';
      closeBtn.style.transform = 'translateX(-50%) scale(1)';
    });
    
    closeBtn.addEventListener('click', () => {
      const video = card.querySelector('video');
      if (video) {
        video.pause();
        video.src = ''; // Clear video source
        video.load(); // Reset video element
      }
      
      // Animate out
      card.style.opacity = '0';
      card.style.transform = 'translate(-50%, -50%) scale(0.8)';
      captionEl.style.opacity = '0';
      closeBtn.style.opacity = '0';
      backdrop.style.background = 'rgba(0, 0, 0, 0)';
      backdrop.style.backdropFilter = 'blur(0px)';
      backdrop.style.webkitBackdropFilter = 'blur(0px)';
      if (card.navContainer) card.navContainer.style.opacity = '0';
      
      // Remove all modal elements after animation
      setTimeout(() => {
        // Clean up image element
        const imgElement = card.querySelector('img');
        if (imgElement) {
          imgElement.src = ''; // Clear image source
          imgElement.remove();
        }
        
        // Clean up video element
        if (video) {
          video.remove();
        }
        
        // Remove all elements
        card.remove();
        closeBtn.remove();
        captionEl.remove();
        backdrop.remove();
        if (card.navContainer) card.navContainer.remove();
        
        // Resume Three.js animation
        if (!this.animationFrameId) {
          this.animate();
        }
      }, 300);
    });
    
    this.container.appendChild(captionEl);
    card.appendChild(closeBtn);
    this.container.appendChild(card);
    this.container.appendChild(closeBtn);
    
    // Add animation keyframes for pulsing glow effect
    if (!document.querySelector('#modal-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'modal-pulse-animation';
      style.textContent = `
        @keyframes modalPulse {
          0%, 100% {
            box-shadow: 
              0 0 30px rgba(247, 156, 0, 0.6),
              0 0 60px rgba(247, 156, 0, 0.4),
              0 0 90px rgba(247, 156, 0, 0.2),
              inset 0 0 40px rgba(247, 156, 0, 0.1);
          }
          50% {
            box-shadow: 
              0 0 40px rgba(247, 156, 0, 0.8),
              0 0 80px rgba(247, 156, 0, 0.5),
              0 0 120px rgba(247, 156, 0, 0.3),
              inset 0 0 50px rgba(247, 156, 0, 0.15);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Handle orb click
   */
  onOrbClick(event) {
    if (!this.isActive) return;
    
    // Get mouse position
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    // Check intersections with orbs
    const orbMeshes = this.orbs.map(orb => orb.mesh);
    const intersects = raycaster.intersectObjects(orbMeshes);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const clickedOrb = this.orbs.find(orb => orb.mesh === clickedMesh);

      if (clickedOrb) {
        // Trigger click animation, delay content until after it plays
        if (Object.keys(this.clickPose).length > 0) {
          this.clickAnimLerp = 1;
          setTimeout(() => { this.clickAnimLerp = 0; }, 600);
          setTimeout(() => { this.showMediaModal(clickedOrb); }, 350);
        } else {
          this.clickAnimTarget = 1;
          setTimeout(() => { this.clickAnimTarget = 0; }, 200);
          this.showMediaModal(clickedOrb);
        }
      }
    }
  }
  
  /**
   * Show media modal with full image/video
   */
  showMediaModal(orb) {
    console.log('=== showMediaModal called ===');
    console.log('Orb data:', orb);
    
    // Get orb color for modal styling
    const orbColorData = orb.colorData || { hex: 0xF79C00, rgb: [247, 156, 0] }; // Default to amber
    const colorRgb = `${orbColorData.rgb[0]}, ${orbColorData.rgb[1]}, ${orbColorData.rgb[2]}`;
    const colorHex = `#${orbColorData.hex.toString(16).padStart(6, '0')}`;
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    `;
    
    // Create content container with FIXED dimensions
    const content = document.createElement('div');
    content.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      width: 90vw;
      max-width: 1200px;
    `;
    
    // Create a FIXED-SIZE image container to prevent resizing
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
      width: 85vw;
      height: 75vh;
      max-width: 1100px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 60px;
      box-shadow: 0 0 50px rgba(${colorRgb}, 0.5);
      overflow: hidden;
    `;
    
    // Create media element (video or image)
    let mediaElement;
    const folder = this.portfolioData?.folder;
    const videoPath = folder ? `assets/portfolios/${folder}/${orb.cardKey}/1.mp4` : null;
    const imagePath = folder ? `assets/portfolios/${folder}/${orb.cardKey}/1.jpg` : null;
    
    // Try video first, then fallback to image
    // Only try video if the orb actually has a working video element that loaded successfully
    const tryVideo = videoPath && orb.videoElement && orb.videoElement.readyState >= 2;
    
    if (tryVideo) {
      // Show video
      mediaElement = document.createElement('video');
      mediaElement.src = videoPath;
      mediaElement.controls = true;
      mediaElement.autoplay = true;
      mediaElement.loop = true;
      mediaElement.muted = false; // Enable sound in modal
      mediaElement.style.cssText = `
        max-width: 85vw;
        max-height: 75vh;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 10px;
        box-shadow: 0 0 50px rgba(${colorRgb}, 0.5);
        background: rgba(0, 0, 0, 0.5);
      `;
      
      // Fallback to image if video fails to load
      mediaElement.addEventListener('error', () => {
        console.log('Video failed to load, trying image:', videoPath);
        if (imagePath) {
          const img = document.createElement('img');
          img.src = imagePath;
          img.style.cssText = mediaElement.style.cssText;
          img.onerror = () => {
            // Show error message
            img.alt = 'Empty Memory';
            img.style.display = 'none';
            const errorMsg = document.createElement('div');
            errorMsg.textContent = 'Empty Memory';
            errorMsg.style.cssText = `
              color: rgba(255, 255, 255, 0.5);
              font-size: 1.5rem;
              padding: 40px;
            `;
            mediaElement.parentNode.replaceChild(errorMsg, mediaElement);
          };
          mediaElement.parentNode.replaceChild(img, mediaElement);
        }
      });
    } else if (imagePath || (orb.slideshowImages && orb.slideshowImages.length > 0)) {
      // Show image - ALWAYS load from file path, not from orb's processed images
      const img = document.createElement('img');
      
      // Load the first image directly from file path (1.jpg)
      if (orb.slideshowImages && orb.slideshowImages.length > 0) {
        // Load from file path, not from orb.slideshowImages[0].src
        img.src = `assets/portfolios/${folder}/${orb.cardKey}/1.jpg`;
      } else if (imagePath) {
        // Load from path
        img.src = imagePath;
      }
      
      // Image fits within the fixed container
      img.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        object-position: center;
        border-radius: 60px;
      `;
      
      // Show error if image fails
      img.onerror = () => {
        console.log('Image failed to load:', imagePath);
        img.alt = 'Empty Memory';
        img.style.display = 'none';
        const errorMsg = document.createElement('div');
        errorMsg.textContent = 'Empty Memory';
        errorMsg.style.cssText = `
          color: rgba(255, 255, 255, 0.5);
          font-size: 1.5rem;
          padding: 40px;
        `;
        imageContainer.appendChild(errorMsg);
      };
      
      imageContainer.appendChild(img);
      mediaElement = imageContainer;
      // Store reference to img for updates
      mediaElement.imgElement = img;
    } else {
      // No media available
      mediaElement = document.createElement('div');
      mediaElement.textContent = 'Empty Memory';
      mediaElement.style.cssText = `
        color: rgba(255, 255, 255, 0.5);
        font-size: 1.5rem;
        padding: 40px;
      `;
    }
    
    // Create caption
    const caption = document.createElement('div');
    caption.textContent = orb.caption;
    caption.style.cssText = `
      color: white;
      font-size: 1.5rem;
      font-weight: bold;
      text-align: center;
      text-shadow: 0 0 10px rgba(${colorRgb}, 0.8);
    `;
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: -60px;
      right: 0;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(${colorRgb}, 0.5);
      color: white;
      font-size: 2rem;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = `rgba(${colorRgb}, 0.3)`;
      closeBtn.style.transform = 'scale(1.1)';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      closeBtn.style.transform = 'scale(1)';
    });
    
    closeBtn.addEventListener('click', () => {
      // Stop video if playing
      if (mediaElement.tagName === 'VIDEO') {
        mediaElement.pause();
      }
      document.body.removeChild(modal);
      // Resume animation loop
      this.isActive = true;
      this.animate();
    });
    
    // Navigation for multiple images
    let currentImageIndex = 0;
    const totalImages = orb.slideshowImages ? orb.slideshowImages.length : 0;
    const hasMultipleImages = totalImages > 1;
    
    console.log('Navigation check:', {
      totalImages: totalImages,
      hasMultipleImages: hasMultipleImages,
      orbHasSlideshowImages: !!orb.slideshowImages,
      slideshowImagesLength: orb.slideshowImages?.length
    });
    
    // Create navigation container
    let navigationDiv = null;
    if (hasMultipleImages) {
      console.log('Creating navigation for', totalImages, 'images');
      navigationDiv = document.createElement('div');
      navigationDiv.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2rem;
        margin-top: 1.5rem;
      `;
      
      // Previous button
      const prevButton = document.createElement('button');
      prevButton.textContent = '← Previous';
      prevButton.style.cssText = `
        padding: 0.75rem 1.5rem;
        background: rgba(${colorRgb}, 0.2);
        border: 2px solid rgba(${colorRgb}, 0.5);
        border-radius: 10px;
        color: ${colorHex};
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-shadow: 0 0 10px rgba(${colorRgb}, 0.8);
      `;
      
      // Counter
      const counterSpan = document.createElement('span');
      counterSpan.textContent = `1 / ${totalImages}`;
      counterSpan.style.cssText = `
        color: ${colorHex};
        font-size: 1.2rem;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(${colorRgb}, 0.8);
        min-width: 100px;
        text-align: center;
      `;
      
      // Next button
      const nextButton = document.createElement('button');
      nextButton.textContent = 'Next →';
      nextButton.style.cssText = prevButton.style.cssText;
      
      // Update image function
      const updateDisplayedImage = () => {
        const imageNumber = currentImageIndex + 1;
        const newImagePath = `assets/portfolios/${folder}/${orb.cardKey}/${imageNumber}.jpg`;
        
        // Find the img element inside mediaElement (which is the imageContainer)
        const imgElement = mediaElement.querySelector('img');
        if (imgElement) {
          imgElement.src = newImagePath;
          counterSpan.textContent = `${imageNumber} / ${totalImages}`;
        } else {
          console.error('Could not find img element in mediaElement');
        }
      };
      
      // Button click handlers
      prevButton.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImageIndex = (currentImageIndex - 1 + totalImages) % totalImages;
        updateDisplayedImage();
      });
      
      nextButton.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImageIndex = (currentImageIndex + 1) % totalImages;
        updateDisplayedImage();
      });
      
      // Hover effects
      [prevButton, nextButton].forEach(btn => {
        btn.addEventListener('mouseenter', () => {
          btn.style.background = `rgba(${colorRgb}, 0.4)`;
          btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = `rgba(${colorRgb}, 0.2)`;
          btn.style.transform = 'scale(1)';
        });
      });
      
      navigationDiv.appendChild(prevButton);
      navigationDiv.appendChild(counterSpan);
      navigationDiv.appendChild(nextButton);
      
      console.log('Navigation div created and populated:', navigationDiv);
      console.log('Navigation div has children:', navigationDiv.children.length);
    }
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        // Stop video if playing
        if (mediaElement.tagName === 'VIDEO') {
          mediaElement.pause();
        }
        document.body.removeChild(modal);
        // Resume animation loop
        this.isActive = true;
        this.animate();
      }
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        // Stop video if playing
        if (mediaElement.tagName === 'VIDEO') {
          mediaElement.pause();
        }
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escapeHandler);
        // Resume animation loop
        this.isActive = true;
        this.animate();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Assemble modal
    content.appendChild(closeBtn);
    content.appendChild(caption);
    content.appendChild(mediaElement);
    
    console.log('navigationDiv before append:', navigationDiv);
    console.log('Will append navigation?', !!navigationDiv);
    
    if (navigationDiv) {
      console.log('Appending navigation to content');
      content.appendChild(navigationDiv);
    } else {
      console.log('No navigation to append');
    }
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Pause animation loop while modal is open for better performance
    this.isActive = false;
  }

  createPOVHand() {
    this.handScene = new THREE.Scene();
    this.handCamera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
    this.handCamera.position.set(0, 0, 4);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.handScene.add(ambLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0);
    keyLight.position.set(3, 4, 5);
    this.handScene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.6);
    fillLight.position.set(-4, 2, 2);
    this.handScene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, -2, -5);
    this.handScene.add(rimLight);

    const loader = new GLTFLoader();
    loader.load(
      'robotic_hand/scene_embedded.gltf',
      (gltf) => {
        const hand = gltf.scene;

        hand.traverse(child => {
          if (child.isMesh || child.isSkinnedMesh) {
            child.frustumCulled = false;
            // Hide the grey duplicate, keep only the blue hand
            if (child.name === 'Object_110') child.visible = false;
            // Semi-transparent
            if (child.material) {
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

        this.handScene.add(pivot);
        this.povHand = pivot;
        this.povHandBaseY = -1.2;
        this.povHandBaseX = 1.5;
        this.idleRotation = { x: 1.3, y: 3.4 + Math.PI, z: 4.7 };
        this.walkRotation = { x: 1.3, y: 2.5 + Math.PI, z: 4.3 };

        if (gltf.animations && gltf.animations.length > 0) {
          this.handMixer = new THREE.AnimationMixer(hand);
          this.handClip = gltf.animations[0];
          const action = this.handMixer.clipAction(this.handClip);
          action.play();
          // Seek to idle pose and snapshot bone quaternions
          this.handMixer.update(this.handClip.duration * 0.55);
          action.timeScale = 0;

          const skipBones = new Set(['GLOBAL_MAIN_CONTROL_R', 'GLOBAL_MAIN_CONTROL_R1', 'Root_joint_01', 'Root_joint_023', 'GLOBAL_cntrl', 'HANDPALM_cntrl']);
          this.idlePose = {};
          this.clickPose = {};
          this.walkPose = {};
          hand.traverse(child => {
            if (child.isBone && !skipBones.has(child.name)) {
              this.idlePose[child.name] = child.quaternion.clone();
            }
          });

          // Seek to click pose (0.75) and snapshot
          action.timeScale = 1;
          this.handMixer.setTime(0);
          this.handMixer.update(this.handClip.duration * 0.75);
          action.timeScale = 0;
          hand.traverse(child => {
            if (child.isBone && !skipBones.has(child.name)) {
              this.clickPose[child.name] = child.quaternion.clone();
            }
          });

          // Seek to walk pose (0.25) and snapshot
          action.timeScale = 1;
          this.handMixer.setTime(0);
          this.handMixer.update(this.handClip.duration * 0.25);
          action.timeScale = 0;
          hand.traverse(child => {
            if (child.isBone && !skipBones.has(child.name)) {
              this.walkPose[child.name] = child.quaternion.clone();
            }
          });

          // Return to idle pose
          action.timeScale = 1;
          this.handMixer.setTime(0);
          this.handMixer.update(this.handClip.duration * 0.55);
          action.timeScale = 0;

          // Stop mixer — drive bones manually from now on
          action.stop();
          this.handMixer = null;

          // Apply idle pose
          hand.traverse(child => {
            if (child.isBone && this.idlePose[child.name]) {
              child.quaternion.copy(this.idlePose[child.name]);
            }
          });

          this.handRef = hand;
          this.clickAnimLerp = 0;
          console.log('DetailView hand poses captured. Idle bones:', Object.keys(this.idlePose).length);
          console.log('DetailView hand animations:', gltf.animations.map(a => a.name));
        }

        if (this.handCamera && this.container) {
          this.handCamera.aspect = this.container.clientWidth / this.container.clientHeight;
          this.handCamera.updateProjectionMatrix();
        }
        console.log('DetailView POV hand loaded — size:', size, 'scale:', s);
      },
      undefined,
      (err) => console.warn('POV hand failed to load:', err)
    );
  }

  /**
   * Add keyboard and mouse controls
   */
  addControls() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    this.container.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    
    this.container.style.cursor = 'grab';
  }

  /**
   * Remove controls
   */
  removeControls() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    this.container.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  /**
   * Handle key down
   */
  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
    }
  }

  /**
   * Handle key up
   */
  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
    }
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event) {
    this.isMouseDown = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.mouseDownX = event.clientX;
    this.mouseDownY = event.clientY;
    this.container.style.cursor = 'grabbing';
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event) {
    if (!this.isMouseDown) return;

    // Don't allow mouse rotation if camera movement is disabled
    if (this.cameraMovementEnabled === false) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    this.cameraRotation.y -= deltaX * this.lookSpeed;
    this.cameraRotation.x -= deltaY * this.lookSpeed;

    // Clamp vertical rotation
    this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  /**
   * Check if a position is within the lollipop-shaped floor boundaries
   * Floor layout (updated for expanded dimensions):
   * - Entrance extension: z from 10 to 45, width 16
   * - Main corridor: z from -90 to 10, width 16 (25% longer)
   * - Junction: at z = -90
   * - Circle center: at (0, -150) (moved back 30 units)
   * - Ring floor: outer radius 60 (20% bigger), inner radius 20
   */
  isInsideLollipopFloor(x, z, mainWidth, mainLength, circleRadius, circleCenter, entranceExtension = 35, innerHoleRadius = 20) {
    const halfWidth = mainWidth / 2;
    
    // Define z boundaries
    const entranceBack = 10 + entranceExtension; // 45
    const entranceFront = 10;
    const corridorEnd = -mainLength + 10; // -90 (updated from -70)
    
    // 1. Entrance extension (z: 10 to 45, width: 16)
    if (z >= entranceFront && z <= entranceBack && Math.abs(x) <= halfWidth) {
      return true;
    }
    
    // 2. Main corridor (z: -90 to 10, width: 16) - updated for longer corridor
    // Extend slightly into ring area for smooth transition
    if (z >= corridorEnd - 10 && z <= entranceFront && Math.abs(x) <= halfWidth) {
      return true;
    }
    
    // 3. Ring floor (donut shape: outer radius 60, inner radius 20, center updated for bigger ring)
    const dx = x - circleCenter.x;
    const dz = z - circleCenter.z;
    const distFromCenter = Math.sqrt(dx * dx + dz * dz);
    
    // Check if in ring area (between inner and outer radius)
    if (distFromCenter >= innerHoleRadius && distFromCenter <= circleRadius) {
      return true;
    }
    
    return false;
  }

  /**
   * Update camera based on controls
   */
  updateCamera(deltaTime) {
    // Don't update camera if movement is disabled (e.g., during welcome screen)
    if (this.cameraMovementEnabled === false) {
      return;
    }
    
    // Update camera rotation
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.cameraRotation.y;
    this.camera.rotation.x = this.cameraRotation.x;

    // Calculate movement direction
    const direction = new THREE.Vector3();
    
    if (this.keys.forward) direction.z -= 1;
    if (this.keys.backward) direction.z += 1;
    if (this.keys.left) direction.x -= 1;
    if (this.keys.right) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize();
      
      // Apply camera rotation to direction
      direction.applyQuaternion(this.camera.quaternion);
      direction.y = 0; // Keep movement horizontal
      
      // Update velocity
      this.cameraVelocity.x += direction.x * this.moveSpeed * deltaTime;
      this.cameraVelocity.z += direction.z * this.moveSpeed * deltaTime;
    }

    // Apply friction (slightly higher for smoother feel)
    this.cameraVelocity.multiplyScalar(0.92);

    // Store previous position for collision detection
    const prevX = this.camera.position.x;
    const prevZ = this.camera.position.z;

    // Calculate new position
    const newX = prevX + this.cameraVelocity.x * deltaTime;
    const newZ = prevZ + this.cameraVelocity.z * deltaTime;

    // Lollipop floor dimensions (must match createLollipopFloor exactly)
    const mainCorridorWidth = 16;
    const mainCorridorLength = 100; // Updated: 80 → 100 (25% longer)
    const circleRadius = 60; // Updated: 50 → 60 (20% bigger)
    const innerHoleRadius = 20;
    const entranceExtension = 35;
    const circleCenter = { x: 0, z: -90 - 60 }; // z = -150 (updated for longer corridor and bigger ring)

    // Check if new position is inside lollipop floor (no margin adjustments)
    if (this.isInsideLollipopFloor(newX, newZ, mainCorridorWidth, mainCorridorLength, circleRadius, circleCenter, entranceExtension, innerHoleRadius)) {
      // Valid position - update camera
      this.camera.position.x = newX;
      this.camera.position.z = newZ;
    } else {
      // Hit boundary - try sliding along walls
      // Try X movement only
      if (this.isInsideLollipopFloor(newX, prevZ, mainCorridorWidth, mainCorridorLength, circleRadius, circleCenter, entranceExtension, innerHoleRadius)) {
        this.camera.position.x = newX;
        this.cameraVelocity.z = 0; // Stop Z velocity
      }
      // Try Z movement only
      else if (this.isInsideLollipopFloor(prevX, newZ, mainCorridorWidth, mainCorridorLength, circleRadius, circleCenter, entranceExtension, innerHoleRadius)) {
        this.camera.position.z = newZ;
        this.cameraVelocity.x = 0; // Stop X velocity
      }
      // Can't move - stop all velocity
      else {
        this.cameraVelocity.set(0, 0, 0);
      }
    }

    // Keep camera at reasonable height
    this.camera.position.y = Math.max(2, Math.min(30, this.camera.position.y));
  }

  /**
   * Create back button
   */
  createBackButton() {
    // Remove existing button if any
    const existingBtn = this.container.querySelector('.back-button');
    if (existingBtn) existingBtn.remove();
    
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.innerHTML = '<span>←</span> Back';
    backButton.style.cssText = `
      position: fixed;
      top: 2rem;
      left: 2rem;
      padding: 0.75rem 1.5rem;
      background: rgba(30, 35, 60, 0.95);
      border: 2px solid rgba(100, 200, 255, 0.5);
      border-radius: 50px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      z-index: 999;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    
    backButton.addEventListener('mouseenter', () => {
      backButton.style.background = 'rgba(100, 200, 255, 0.3)';
      backButton.style.borderColor = 'rgba(100, 200, 255, 0.8)';
      backButton.style.transform = 'translateX(-5px)';
    });
    
    backButton.addEventListener('mouseleave', () => {
      backButton.style.background = 'rgba(30, 35, 60, 0.95)';
      backButton.style.borderColor = 'rgba(100, 200, 255, 0.5)';
      backButton.style.transform = 'translateX(0)';
    });
    
    backButton.addEventListener('click', () => this.hide());
    
    this.container.appendChild(backButton);
  }

  /**
   * Hide the detail view
   */
  hide() {
    // Remove any existing welcome screen
    const existingWelcome = document.getElementById('floating-welcome');
    if (existingWelcome) {
      existingWelcome.remove();
    }
    
    // Create fade overlay for smooth transition out
    const fadeOverlay = document.createElement('div');
    fadeOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.95);
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.8s ease-in-out;
      pointer-events: none;
    `;
    document.body.appendChild(fadeOverlay);
    
    // Fade to white
    setTimeout(() => {
      fadeOverlay.style.opacity = '1';
    }, 10);
    
    // Hide after fade completes
    setTimeout(() => {
      this.isActive = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      
      // Remove controls
      this.removeControls();
      
      if (this.container) {
        this.container.style.display = 'none';
      }
      
      // Dispatch event to notify main museum to position camera at orb
      // Dispatch immediately so camera is positioned before fade completes
      if (this.currentPortfolio) {
        window.dispatchEvent(new CustomEvent('returnToMainMuseum', { 
          detail: { portfolio: this.currentPortfolio } 
        }));
      }
      
      // Fade out overlay to reveal main museum
      setTimeout(() => {
        fadeOverlay.style.opacity = '0';
        setTimeout(() => {
          fadeOverlay.remove();
        }, 800);
      }, 100);
    }, 900);
  }

  /**
   * Animation loop
   */
  animate() {
    if (!this.isActive) return;

    this.animationFrameId = requestAnimationFrame(this.animate);
    
    const deltaTime = 0.016; // ~60fps
    this.time += deltaTime;
    
    // Cache frame counter (used multiple times)
    const frameCount = Math.floor(this.time * 60);

    // Update camera controls
    this.updateCamera(deltaTime);
    
    // Update frustum for culling (only update every 3 frames for performance)
    if (frameCount % 3 === 0) {
      this.camera.updateMatrixWorld();
      this.cameraViewProjectionMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      );
      this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix);
    }

    // Animate edge glow (skip door edges - they should be static)
    // Optimize: Only update every 3 frames for edge glow (imperceptible due to sine wave)
    if (frameCount % 3 === 0) {
      this.edges.forEach((edge, index) => {
        // Skip animation for door edges (they have additive blending)
        if (edge.material.blending === THREE.AdditiveBlending && edge.material.opacity > 0.8) {
          return; // Skip door edge frames
        }
        const offset = index * 0.5;
        const intensity = 0.7 + Math.sin(this.time * 2 + offset) * 0.3;
        edge.material.opacity = intensity;
      });
    }

    // Animate memory orbs with frustum culling - only update visible orbs
    this.orbs.forEach((orb, index) => {
      // Check if orb is in camera frustum
      const isVisible = this.frustum.intersectsObject(orb.mesh);
      
      // Calculate distance from camera to orb for video playback control
      const distance = this.camera.position.distanceTo(orb.mesh.position);
      const videoPlayDistance = 50; // Play video only within 30 units
      
      // Control video playback based on distance
      if (orb.videoElement) {
        if (distance <= videoPlayDistance && isVisible) {
          // Close enough and visible - play video
          if (orb.videoElement.paused) {
            orb.videoElement.play().catch(e => {
              // Ignore autoplay errors
            });
          }
        } else {
          // Too far or not visible - pause video to save performance
          if (!orb.videoElement.paused) {
            orb.videoElement.pause();
          }
        }
      }
      
      // Only animate visible orbs
      if (isVisible) {
        const offset = index * 0.3;
        // Subtle floating motion
        const floatY = orb.baseY + Math.sin(this.time * 1.5 + offset) * 0.15;
        orb.mesh.position.y = floatY;
        orb.glowRing.position.y = floatY;
        orb.light.position.y = floatY;
        // Sprites automatically face camera, no need for lookAt
      }
      
      // Update video frame if present - optimize: only update every 3 frames (20fps for video) and cache gradients
      if (isVisible && distance <= videoPlayDistance && orb.videoElement && orb.videoElement.readyState >= orb.videoElement.HAVE_CURRENT_DATA && frameCount % 3 === 0) {
        // Draw current video frame to canvas with effects
        const canvas = orb.texture.image;
        const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: true });
        
        // Cache dimensions if not already cached
        if (!orb.cachedDimensions) {
          const sourceAspect = orb.videoElement.videoWidth / orb.videoElement.videoHeight;
          if (sourceAspect > 1) {
            orb.cachedDimensions = {
              drawHeight: 512,
              drawWidth: 512 * sourceAspect,
              drawX: (512 - 512 * sourceAspect) / 2,
              drawY: 0
            };
          } else {
            orb.cachedDimensions = {
              drawWidth: 512,
              drawHeight: 512 / sourceAspect,
              drawX: 0,
              drawY: (512 - 512 / sourceAspect) / 2
            };
          }
        }
        
        const { drawWidth, drawHeight, drawX, drawY } = orb.cachedDimensions;
        
        // Clear and redraw with effects - use single clip path
        ctx.clearRect(0, 0, 512, 512);
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.clip();
        
        // Draw video
        ctx.drawImage(orb.videoElement, drawX, drawY, drawWidth, drawHeight);
        
        // Apply color overlay using orb's actual color
        const colorData = orb.colorData;
        ctx.fillStyle = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.35)`;
        ctx.fillRect(0, 0, 512, 512);
        
        // Cache gradients if not already cached
        if (!orb.cachedGradients) {
          const vignette = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
          vignette.addColorStop(0, 'transparent');
          vignette.addColorStop(0.4, 'transparent');
          vignette.addColorStop(0.6, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.25)`);
          vignette.addColorStop(0.75, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.6)`);
          vignette.addColorStop(0.88, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.9)`);
          vignette.addColorStop(1, `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 1)`);
          
          const highlight = ctx.createRadialGradient(154, 154, 0, 154, 154, 180);
          highlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
          highlight.addColorStop(0.7, 'transparent');
          
          orb.cachedGradients = { vignette, highlight };
        }
        
        // Apply vignette
        ctx.fillStyle = orb.cachedGradients.vignette;
        ctx.fillRect(0, 0, 512, 512);
        
        // Apply highlight
        ctx.fillStyle = orb.cachedGradients.highlight;
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.restore();
        
        orb.texture.needsUpdate = true;
      }
      
      // Animate platform particles (only every 2 frames - imperceptible difference)
      if (isVisible && frameCount % 2 === 0 && orb.platform && orb.platform.userData.particles) {
        orb.platform.userData.particles.forEach(particle => {
          // Move particle upward
          particle.position.y += particle.userData.velocity;
          
          // Expand outward as it rises (inverted cone shape)
          const progress = particle.position.y / particle.userData.maxHeight;
          const currentRadius = particle.userData.startRadius + progress * 2;
          particle.position.x = Math.cos(particle.userData.angle) * currentRadius;
          particle.position.z = Math.sin(particle.userData.angle) * currentRadius;
          
          // Fade out as it rises
          particle.material.opacity = 1 - progress;
          
          // Reset when reaching max height
          if (particle.position.y >= particle.userData.maxHeight) {
            particle.position.y = 0;
            const newAngle = Math.random() * Math.PI * 2;
            const newRadius = Math.random() * 0.5;
            particle.userData.angle = newAngle;
            particle.userData.startRadius = newRadius;
            particle.position.x = Math.cos(newAngle) * newRadius;
            particle.position.z = Math.sin(newAngle) * newRadius;
            particle.material.opacity = 1;
          }
        });
      }
    });

    // Animate floating title - subtle movement for performance
    if (this.titleSprite) {
      const floatY = this.titleSprite.baseY + Math.sin(this.time * 0.5 + this.titleSprite.floatOffset) * 0.15;
      this.titleSprite.sprite.position.y = floatY;
      if (this.titleSprite.light) {
        this.titleSprite.light.position.y = floatY;
      }
      // Animate rim lights
      if (this.titleSprite.rimLights) {
        this.titleSprite.rimLights.forEach(light => {
          light.position.y = floatY;
        });
      }
    }

    // Animate memory orbs - removed pulsing for better performance
    // Orbs are now static

    // Animate arc particles
    if (this.arcParticles) {
      this.arcParticles.particles.forEach(particle => {
        // Update progress along curve
        particle.progress += particle.speed;
        if (particle.progress > 1) {
          particle.progress = 0; // Loop back to start
        }
        
        // Get position on curve
        const position = this.arcParticles.curve.getPoint(particle.progress);
        
        // Apply scattered offset around tube using stored angle
        const offsetX = Math.cos(particle.angle) * this.arcParticles.tubeRadius;
        const offsetY = Math.sin(particle.angle) * this.arcParticles.tubeRadius;
        const offsetZ = Math.sin(particle.angle) * this.arcParticles.tubeRadius;
        
        particle.sprite.position.set(
          position.x + offsetX, 
          position.y + offsetY, 
          this.arcParticles.entranceZ + offsetZ
        );
        
        // Fade in/out at ends for smooth looping
        const fadeRange = 0.1;
        let opacity = 1;
        if (particle.progress < fadeRange) {
          opacity = particle.progress / fadeRange;
        } else if (particle.progress > 1 - fadeRange) {
          opacity = (1 - particle.progress) / fadeRange;
        }
        particle.sprite.material.opacity = opacity;
      });
    }

    // Animate door particles
    if (this.doorParticles) {
      this.doorParticles.particles.forEach(particle => {
        // Update progress toward center
        particle.progress += particle.speed;
        if (particle.progress > 1) {
          particle.progress = 0; // Loop back
        }
        
        // Calculate position moving from edge to center
        const centerX = 0;
        const centerY = this.doorParticles.doorHeight / 2 + this.doorParticles.floatHeight;
        
        const currentX = particle.startX + (centerX - particle.startX) * particle.progress;
        const currentY = particle.startY + (centerY - particle.startY) * particle.progress;
        
        particle.sprite.position.set(currentX, currentY, this.doorParticles.doorZ + 2);
        
        // Fade out as approaching center
        particle.sprite.material.opacity = 1 - particle.progress;
      });
    }
    
    // Animate welcome hologram
    if (this.welcomeHologramAnimation) {
      this.welcomeHologramAnimation();
    }

    // Render
    this.renderer.render(this.scene, this.camera);

    // Render POV hand on top
    if (this.handScene && this.handCamera) {
      // Bob only when moving
      if (this.povHand) {
        const isMoving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
        this.bobStrength += ((isMoving ? 0.3 : 0) - this.bobStrength) * 0.08;
        const t = this.time * 10;
        const sway = Math.sin(t * 0.5) * 0.13 * this.bobStrength;
        const bobY_dv = Math.sin(t) * 0.11 * this.bobStrength;
        this.povHand.position.y = this.povHandBaseY + bobY_dv;
        this.povHand.position.x = this.povHandBaseX + Math.sin(t * 0.5) * 0.055 * this.bobStrength;

        // Lerp pivot rotation between idle and walk rotation, add sway
        if (this.idleRotation && this.walkRotation) {
          this._walkLerpCurrent = this._walkLerpCurrent || 0;
          const walkTarget = this.bobStrength > 0.05 ? 1 : 0;
          this._walkLerpCurrent += (walkTarget - this._walkLerpCurrent) * 0.08;
          const w = this._walkLerpCurrent;
          this.povHand.rotation.x = this.idleRotation.x + (this.walkRotation.x - this.idleRotation.x) * w;
          this.povHand.rotation.y = this.idleRotation.y + (this.walkRotation.y - this.idleRotation.y) * w;
          this.povHand.rotation.z = this.idleRotation.z + (this.walkRotation.z - this.idleRotation.z) * w + sway;
        }

        // Tick animation mixer for rigged hand
        if (this.handMixer) {
          this.handMixer.update(0.016);
        } else if (this.handRef && Object.keys(this.idlePose).length > 0) {
          // Click lerp (0=idle, 1=click)
          this._clickLerpCurrent += (this.clickAnimLerp - this._clickLerpCurrent) * 0.15;

          // Nudge hand forward and up on click
          this.povHand.position.z = -this._clickLerpCurrent * 0.3;
          this.povHand.position.y = this.povHandBaseY + bobY_dv + this._clickLerpCurrent * 0.15;

          this.handRef.traverse(child => {
            if (child.isBone && this.idlePose[child.name]) {
              if (this._clickLerpCurrent > 0.01 && this.clickPose[child.name]) {
                // Click takes priority
                child.quaternion.slerpQuaternions(this.idlePose[child.name], this.clickPose[child.name], this._clickLerpCurrent);
              } else if (this._walkLerpCurrent > 0.001 && this.walkPose[child.name]) {
                // Walk pose — held steady
                child.quaternion.slerpQuaternions(this.idlePose[child.name], this.walkPose[child.name], this._walkLerpCurrent);
              } else {
                child.quaternion.copy(this.idlePose[child.name]);
              }
            }
          });
        } else {
          // Fallback Z-punch if no mixer
          const lerpSpeed = this.clickAnimTarget > this.clickAnimProgress ? 0.25 : 0.12;
          this.clickAnimProgress += (this.clickAnimTarget - this.clickAnimProgress) * lerpSpeed;
          this.povHand.position.z = this.clickAnimProgress * 0.4;
        }
      }
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.handScene, this.handCamera);
      this.renderer.autoClear = true;
    }
    
    // Reset render info every 60 frames to prevent memory buildup
    if (Math.floor(this.time * 60) % 60 === 0) {
      this.renderer.info.reset();
    }
  }

  /**
   * Handle window resize
   */
  onResize() {
    if (!this.camera || !this.renderer) return;

    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    
    // Dynamically adjust FOV based on aspect ratio to maintain consistent view
    const baseFOV = 50;
    const fov = aspect < 1 ? baseFOV * (1 / aspect) * 0.75 : baseFOV;
    this.camera.fov = fov;
    
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.handCamera) {
      this.handCamera.aspect = aspect;
      this.handCamera.updateProjectionMatrix();
    }
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.hide();
    
    // Stop animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Cleanup orbs
    if (this.orbs) {
      this.orbs.forEach(orb => {
        this.scene.remove(orb.mesh);
        if (orb.glowRing) this.scene.remove(orb.glowRing);
        if (orb.light) this.scene.remove(orb.light);
        if (orb.platform) this.scene.remove(orb.platform);
        if (orb.textSprite) this.scene.remove(orb.textSprite);
        
        // Stop video
        if (orb.videoElement) {
          orb.videoElement.pause();
          orb.videoElement.src = '';
          orb.videoElement.load();
          orb.videoElement = null;
        }
        
        // Dispose resources
        if (orb.mesh.geometry) orb.mesh.geometry.dispose();
        if (orb.mesh.material) {
          if (orb.mesh.material.map) orb.mesh.material.map.dispose();
          orb.mesh.material.dispose();
        }
        if (orb.texture) {
          orb.texture.dispose();
          orb.texture = null;
        }
        
        if (orb.glowRing) {
          if (orb.glowRing.geometry) orb.glowRing.geometry.dispose();
          if (orb.glowRing.material) {
            if (orb.glowRing.material.map) orb.glowRing.material.map.dispose();
            orb.glowRing.material.dispose();
          }
        }
        
        if (orb.platform) {
          // Clean up platform particles
          if (orb.platform.userData && orb.platform.userData.particles) {
            orb.platform.userData.particles.forEach(particle => {
              if (particle.geometry) particle.geometry.dispose();
              if (particle.material) particle.material.dispose();
            });
            orb.platform.userData.particles = [];
          }
          
          orb.platform.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (child.material.map) child.material.map.dispose();
              child.material.dispose();
            }
          });
        }
        
        // Clean up portal particles
        if (orb.portalParticles) {
          this.scene.remove(orb.portalParticles);
          if (orb.portalParticles.geometry) orb.portalParticles.geometry.dispose();
          if (orb.portalParticles.material) orb.portalParticles.material.dispose();
          orb.portalParticles = null;
        }
        
        if (orb.textSprite) {
          if (orb.textSprite.geometry) orb.textSprite.geometry.dispose();
          if (orb.textSprite.material) {
            if (orb.textSprite.material.map) orb.textSprite.material.map.dispose();
            orb.textSprite.material.dispose();
          }
        }
      });
      this.orbs = [];
    }
    
    // Cleanup title sprite
    if (this.titleSprite) {
      if (this.titleSprite.sprite) {
        this.scene.remove(this.titleSprite.sprite);
        
        if (this.titleSprite.sprite.children) {
          this.titleSprite.sprite.children.forEach(child => {
            if (child.material) {
              child.material.dispose();
              if (child.material.map) child.material.map.dispose();
            }
            if (child.geometry) child.geometry.dispose();
          });
        }
        
        if (this.titleSprite.sprite.material) {
          this.titleSprite.sprite.material.dispose();
          if (this.titleSprite.sprite.material.map) {
            this.titleSprite.sprite.material.map.dispose();
          }
        }
        if (this.titleSprite.sprite.geometry) {
          this.titleSprite.sprite.geometry.dispose();
        }
      }
      
      if (this.titleSprite.light) this.scene.remove(this.titleSprite.light);
      if (this.titleSprite.rimLights) {
        this.titleSprite.rimLights.forEach(light => this.scene.remove(light));
      }
      
      this.titleSprite = null;
    }
    
    // Cleanup arc particles
    if (this.arcParticles) {
      this.arcParticles.particles.forEach(particle => {
        this.scene.remove(particle.sprite);
        if (particle.sprite.material) {
          particle.sprite.material.dispose();
          if (particle.sprite.material.map) particle.sprite.material.map.dispose();
        }
      });
      this.arcParticles = null;
    }
    
    // Cleanup door particles
    if (this.doorParticles) {
      this.doorParticles.particles.forEach(particle => {
        this.scene.remove(particle.sprite);
        if (particle.sprite.material) {
          particle.sprite.material.dispose();
          if (particle.sprite.material.map) particle.sprite.material.map.dispose();
        }
      });
      this.doorParticles = null;
    }
    
    // Cleanup memory orb shelves (sprites and lines)
    if (this.orbShelves) {
      this.orbShelves.traverse((child) => {
        if (child instanceof THREE.Sprite) {
          // Cleanup sprite
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        } else if (child instanceof THREE.Line) {
          // Cleanup shelf lines
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
      this.scene.remove(this.orbShelves);
      this.orbShelves = null;
    }
    if (this.memoryOrbs) {
      this.memoryOrbs = [];
    }
    
    // Cleanup moon
    if (this.moon) {
      this.scene.remove(this.moon);
      if (this.moon.geometry) this.moon.geometry.dispose();
      if (this.moon.material) {
        if (this.moon.material.map) this.moon.material.map.dispose();
        this.moon.material.dispose();
      }
      this.moon = null;
    }
    
    // Cleanup floor pieces
    if (this.floorPieces) {
      this.floorPieces.forEach(piece => {
        this.scene.remove(piece);
        if (piece.geometry) piece.geometry.dispose();
        if (piece.material) {
          if (piece.material.map) piece.material.map.dispose();
          piece.material.dispose();
        }
      });
      this.floorPieces = [];
    }
    
    // Cleanup single floor if exists
    if (this.floor) {
      this.scene.remove(this.floor);
      if (this.floor.geometry) this.floor.geometry.dispose();
      if (this.floor.material) {
        if (this.floor.material.map) this.floor.material.map.dispose();
        this.floor.material.dispose();
      }
      this.floor = null;
    }
    
    // Cleanup edges
    if (this.edges) {
      this.edges.forEach(edge => {
        this.scene.remove(edge);
        if (edge.geometry) edge.geometry.dispose();
        if (edge.material) edge.material.dispose();
      });
      this.edges = [];
    }
    
    // Cleanup welcome hologram and platform components
    if (this.welcomeHologram) {
      this.scene.remove(this.welcomeHologram);
      if (this.welcomeHologram.material) {
        this.welcomeHologram.material.dispose();
        if (this.welcomeHologram.material.map) {
          this.welcomeHologram.material.map.dispose();
        }
      }
      if (this.welcomeHologram.geometry) {
        this.welcomeHologram.geometry.dispose();
      }
      this.welcomeHologram = null;
    }
    
    if (this.welcomePlatform) {
      this.scene.remove(this.welcomePlatform);
      if (this.welcomePlatform.geometry) this.welcomePlatform.geometry.dispose();
      if (this.welcomePlatform.material) this.welcomePlatform.material.dispose();
      this.welcomePlatform = null;
    }
    
    if (this.welcomeBeam) {
      this.scene.remove(this.welcomeBeam);
      if (this.welcomeBeam.geometry) this.welcomeBeam.geometry.dispose();
      if (this.welcomeBeam.material) {
        if (this.welcomeBeam.material.uniforms) {
          Object.values(this.welcomeBeam.material.uniforms).forEach(uniform => {
            if (uniform.value && uniform.value.dispose) {
              uniform.value.dispose();
            }
          });
        }
        this.welcomeBeam.material.dispose();
      }
      this.welcomeBeam = null;
    }
    
    if (this.welcomeRing) {
      this.scene.remove(this.welcomeRing);
      if (this.welcomeRing.geometry) this.welcomeRing.geometry.dispose();
      if (this.welcomeRing.material) this.welcomeRing.material.dispose();
      this.welcomeRing = null;
    }
    
    if (this.welcomePlatformLight) {
      this.scene.remove(this.welcomePlatformLight);
      this.welcomePlatformLight = null;
    }
    
    if (this.welcomeHologramAnimation) {
      this.welcomeHologramAnimation = null;
    }
    
    // Cleanup all lights in scene
    const lightsToRemove = [];
    this.scene.traverse((object) => {
      if (object instanceof THREE.Light) {
        lightsToRemove.push(object);
      }
    });
    lightsToRemove.forEach(light => this.scene.remove(light));
    
    // Remove event listeners
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('resize', this.onWindowResize);
    
    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    
    // Remove container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
    
    // Clear scene
    if (this.scene) {
      this.scene.clear();
      this.scene = null;
    }

    // Clean up POV hand
    if (this.handScene) {
      this.handScene.traverse(child => {
        if (child.isMesh || child.isSkinnedMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => {
                if (m.map) m.map.dispose();
                if (m.normalMap) m.normalMap.dispose();
                if (m.roughnessMap) m.roughnessMap.dispose();
                if (m.metalnessMap) m.metalnessMap.dispose();
                m.dispose();
              });
            } else {
              if (child.material.map) child.material.map.dispose();
              if (child.material.normalMap) child.material.normalMap.dispose();
              if (child.material.roughnessMap) child.material.roughnessMap.dispose();
              if (child.material.metalnessMap) child.material.metalnessMap.dispose();
              child.material.dispose();
            }
          }
        }
      });
      this.handScene.clear();
      this.handScene = null;
      this.handCamera = null;
      this.povHand = null;
      this.handRef = null;
      this.clickAnimProgress = 0;
      this.clickAnimTarget = 0;
      this.bobStrength = 0;
    }
    if (this.handMixer) {
      this.handMixer.stopAllAction();
      this.handMixer = null;
      this.handClip = null;
    }
    // Clear pose snapshots
    this.idlePose = {};
    this.clickPose = {};
    this.walkPose = {};
    this._clickLerpCurrent = 0;
    this.clickAnimLerp = 0;
    this.idleRotation = null;
    this.walkRotation = null;

    this.camera = null;
    this.isActive = false;
    this.currentPortfolio = null;
  }
}
