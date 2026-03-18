/**
 * MainMuseum.js
 * Three.js scene for the main museum with circular layout
 * Uses techniques from DetailView.js (Memory Hall)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class MainMuseum {
  constructor(container, portfolioData) {
    this.container = container;
    this.portfolioData = portfolioData;
    
    // Scene setup
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Floor and environment
    this.floor = null;
    this.floorDimensions = null;
    this.edges = [];
    this.stars = [];
    
    // Portfolio bubbles
    this.bubbles = [];
    
    // Animation
    this.time = 0;
    this.bobStrength = 0;
    this.clickAnimProgress = 0;  // 0 = rest, 1 = clicked
    this.clickAnimTarget = 0;
    this.handMixer = null;
    this.handClip = null;
    this.idlePose = {};
    this.clickPose = {};
    this.walkPose = {};
    this.handRef = null;
    this.clickAnimLerp = 0;
    this.animationId = null;
    
    // Raycaster for click detection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Camera movement (first-person controls like Memory Hall)
    this.cameraRotation = { x: 0, y: 0 };
    this.cameraVelocity = new THREE.Vector3();
    this.moveSpeed = 80; // Increased for faster movement
    this.lookSpeed = 0.002;
    this.keys = { forward: false, backward: false, left: false, right: false };
    this.lockCameraRotation = false; // Flag to lock rotation temporarily
    this.disableBoundaries = false; // Flag to disable boundaries temporarily
    
    // Drag controls (like Memory Hall)
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseDownX = 0;
    this.mouseDownY = 0;
    
    // Bind methods
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    
    this.init();
  }
  
  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();
    this.createFloor();
    this.createBubbles(); // Create bubbles first to calculate pathway angles
    this.createEdges(); // Then create edges with gaps at pathway angles
    this.createStars();
    this.createFloatingTitle(); // Add floating title in center
    this.createRainbowFountain(); // Add rainbow fountain in inner ring
    this.createPOVHand(); // First-person wireframe hand
    this.setupEventListeners();
    this.animate();
  }
  
  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000510); // Same as Memory Hall
    // No fog - removed for clear visibility
  }
  
  createCamera() {
    // Same camera setup as Memory Hall
    const aspect = window.innerWidth / window.innerHeight;
    const baseFOV = 50;
    const fov = aspect < 1 ? baseFOV * (1 / aspect) * 0.75 : baseFOV;
    
    this.camera = new THREE.PerspectiveCamera(
      fov,
      aspect,
      0.1,
      1000
    );
    // Spawn at entrance (within entrance floor boundaries)
    this.camera.position.set(0, 5, 32);
    
    // Initialize camera rotation
    this.cameraRotation.x = 0;
    this.cameraRotation.y = 0;
  }
  
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }
  
  createLights() {
    // Same lighting as Memory Hall
    const ambientLight = new THREE.AmbientLight(0x606060, 2.0);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(0, 30, 0);
    directionalLight.castShadow = false;
    this.scene.add(directionalLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0xa0a0ff, 0x6060ff, 1.2);
    this.scene.add(hemisphereLight);
    
    // Reflection lights
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
  }
  
  createFloor() {
    // Adjusted dimensions - even bigger ring for better spacing
    const mainCorridorWidth = 16;
    const mainCorridorLength = 50;
    const circleRadius = 100; // Increased from 85 to 100
    const entranceExtension = 25;
    const innerHoleRadius = 35; // Increased from 30 to 35

    const entranceBackZ = 10 + entranceExtension;
    const entranceZ = 10;
    const junctionZ = -mainCorridorLength + 10;
    const circleCenter = { x: 0, z: junctionZ - circleRadius };

    // Store for later use
    this.floorDimensions = {
      mainCorridorWidth,
      mainCorridorLength,
      circleRadius,
      innerHoleRadius,
      entranceExtension,
      entranceBackZ,
      entranceZ,
      junctionZ,
      circleCenter
    };

    // Create nebula texture (same as Memory Hall)
    const nebulaTexture = this.createNebulaTexture();

    // Create floor material (same as Memory Hall)
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: nebulaTexture,
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x4a2a6a,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide
    });

    // Entrance extension floor
    const entranceFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(mainCorridorWidth, entranceExtension),
      floorMaterial
    );
    entranceFloor.rotation.x = -Math.PI / 2;
    entranceFloor.position.set(0, 0.1, (entranceBackZ + entranceZ) / 2);
    entranceFloor.receiveShadow = true;
    this.scene.add(entranceFloor);

    // Main corridor floor
    const floorOverlap = 1;
    const mainFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(mainCorridorWidth, mainCorridorLength + floorOverlap),
      floorMaterial
    );
    mainFloor.rotation.x = -Math.PI / 2;
    mainFloor.position.set(0, 0.1, (entranceZ + (junctionZ - floorOverlap)) / 2);
    mainFloor.receiveShadow = true;
    this.scene.add(mainFloor);

    // Circular ring floor (donut shape)
    const circleFloor = new THREE.Mesh(
      new THREE.RingGeometry(innerHoleRadius, circleRadius, 48),
      floorMaterial
    );
    circleFloor.rotation.x = -Math.PI / 2;
    circleFloor.position.set(circleCenter.x, 0.1, circleCenter.z);
    circleFloor.receiveShadow = true;
    this.scene.add(circleFloor);
    
    // Store floor material for pathway creation
    this.floorMaterial = floorMaterial;
    this.floorMeshes = [entranceFloor, mainFloor, circleFloor];
  }
  
  createNebulaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    // Dark space background
    ctx.fillStyle = '#010104';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create nebula clouds
    const createNebulaCloud = (x, y, radius, color1, color2) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(0.5, color2);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    ctx.globalCompositeOperation = 'lighter';
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Center clouds
    createNebulaCloud(centerX, centerY, 900, 'rgba(70, 110, 200, 0.22)', 'rgba(40, 75, 160, 0.12)');
    createNebulaCloud(centerX - 300, centerY + 200, 700, 'rgba(130, 70, 200, 0.20)', 'rgba(90, 50, 150, 0.10)');
    createNebulaCloud(centerX + 300, centerY - 200, 750, 'rgba(85, 120, 220, 0.19)', 'rgba(55, 85, 170, 0.10)');
    
    // Edge clouds for seamless tiling
    createNebulaCloud(0, 0, 600, 'rgba(80, 95, 190, 0.17)', 'rgba(50, 65, 140, 0.08)');
    createNebulaCloud(canvas.width, 0, 600, 'rgba(80, 95, 190, 0.17)', 'rgba(50, 65, 140, 0.08)');
    createNebulaCloud(0, canvas.height, 600, 'rgba(80, 95, 190, 0.17)', 'rgba(50, 65, 140, 0.08)');
    createNebulaCloud(canvas.width, canvas.height, 600, 'rgba(80, 95, 190, 0.17)', 'rgba(50, 65, 140, 0.08)');
    
    // Purple accents
    createNebulaCloud(centerX + 400, centerY + 300, 650, 'rgba(140, 80, 210, 0.19)', 'rgba(95, 50, 160, 0.09)');
    createNebulaCloud(centerX - 400, centerY - 300, 680, 'rgba(125, 70, 200, 0.18)', 'rgba(85, 45, 150, 0.08)');
    
    ctx.globalCompositeOperation = 'source-over';
    
    // Add stars
    const addStars = (count, minSize, maxSize, opacity) => {
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = minSize + Math.random() * (maxSize - minSize);
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
        
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
    
    addStars(200, 0.4, 1.2, 0.5);
    addStars(80, 1.0, 2.0, 0.6);
    addStars(30, 1.5, 2.5, 0.7);
    
    // Add sparkle stars
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 1.5 + Math.random() * 2;
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + Math.random() * 0.2})`;
      ctx.lineWidth = 0.8;
      
      ctx.beginPath();
      ctx.moveTo(x - size * 1.5, y);
      ctx.lineTo(x + size * 1.5, y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x, y - size * 1.5);
      ctx.lineTo(x, y + size * 1.5);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    
    return texture;
  }
  
  createEdges() {
    const {
      mainCorridorWidth,
      mainCorridorLength,
      circleRadius,
      innerHoleRadius,
      entranceExtension,
      entranceBackZ,
      entranceZ,
      junctionZ,
      circleCenter
    } = this.floorDimensions;

    // Amber glow color (same as Memory Hall)
    const accentColor = 0xF79C00;
    this.accentColor = new THREE.Color(accentColor); // Store for pathway edges

    // Core material (darker amber)
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xB87400,
      transparent: false
    });

    // Glow material
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.20,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    const coreRadius = 0.1;
    const glowRadius = 0.25;
    const edgeHeight = 0.3;
    const edgeY = edgeHeight / 2 + 0.1;
    const mainHalfWidth = mainCorridorWidth / 2;

    // Helper to create edge segments
    const createEdge = (length, position, rotation) => {
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(coreRadius, coreRadius, length, 8),
        coreMaterial
      );
      core.position.copy(position);
      if (rotation.x) core.rotation.x = rotation.x;
      if (rotation.y) core.rotation.y = rotation.y;
      if (rotation.z) core.rotation.z = rotation.z;
      this.scene.add(core);
      this.edges.push(core);

      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(glowRadius, glowRadius, length, 8),
        glowMaterial
      );
      glow.position.copy(position);
      if (rotation.x) glow.rotation.x = rotation.x;
      if (rotation.y) glow.rotation.y = rotation.y;
      if (rotation.z) glow.rotation.z = rotation.z;
      this.scene.add(glow);
      this.edges.push(glow);
    };

    // Entrance extension edges
    createEdge(
      entranceExtension,
      new THREE.Vector3(-mainHalfWidth - coreRadius, edgeY, (entranceBackZ + entranceZ) / 2),
      { x: Math.PI / 2 }
    );
    createEdge(
      entranceExtension,
      new THREE.Vector3(mainHalfWidth + coreRadius, edgeY, (entranceBackZ + entranceZ) / 2),
      { x: Math.PI / 2 }
    );

    // Entrance back edge
    createEdge(
      mainCorridorWidth + coreRadius * 2,
      new THREE.Vector3(0, edgeY, entranceBackZ + coreRadius),
      { z: Math.PI / 2 }
    );

    // Main corridor edges
    const mainCorridorActualLength = entranceZ - junctionZ;
    createEdge(
      mainCorridorActualLength,
      new THREE.Vector3(-mainHalfWidth - coreRadius, edgeY, (entranceZ + junctionZ) / 2),
      { x: Math.PI / 2 }
    );
    createEdge(
      mainCorridorActualLength,
      new THREE.Vector3(mainHalfWidth + coreRadius, edgeY, (entranceZ + junctionZ) / 2),
      { x: Math.PI / 2 }
    );

    // Connecting edges to circle
    const tangentZ = circleCenter.z + Math.sqrt(circleRadius * circleRadius - mainHalfWidth * mainHalfWidth);
    const connectLength = tangentZ - junctionZ;

    createEdge(
      connectLength,
      new THREE.Vector3(-mainHalfWidth - coreRadius, edgeY, (junctionZ + tangentZ) / 2),
      { x: Math.PI / 2 }
    );
    createEdge(
      connectLength,
      new THREE.Vector3(mainHalfWidth + coreRadius, edgeY, (junctionZ + tangentZ) / 2),
      { x: Math.PI / 2 }
    );

    // Custom outer circular edge with precise 25-unit wide openings
    const tangentAngle = Math.asin(mainHalfWidth / circleRadius);
    const leftTangentAngle = Math.PI / 2 + tangentAngle;
    const rightTangentAngle = Math.PI / 2 - tangentAngle;
    
    // Get pathway angles from bubble distribution (calculated in createBubbles)
    const pathwayAngles = this.pathwayAngles || [];
    
    // Calculate opening half-angle based on 20-unit width at circleRadius
    const openingWidth = 20; // units
    const openingHalfAngle = Math.atan(openingWidth / 2 / circleRadius);
    
    // Create array of arc segments to draw (between openings)
    const arcSegments = [];
    
    // Start from left tangent, go around to right tangent (wrapping around 2π)
    const arcStartAngle = leftTangentAngle;
    const arcEndAngle = rightTangentAngle + Math.PI * 2;
    
    // Build list of opening ranges (angle ranges to skip)
    const openingRanges = pathwayAngles.map(angle => {
      // Normalize angle to be in range [arcStartAngle, arcEndAngle]
      let normalizedAngle = angle;
      while (normalizedAngle < arcStartAngle) normalizedAngle += Math.PI * 2;
      while (normalizedAngle > arcEndAngle) normalizedAngle -= Math.PI * 2;
      
      return {
        start: normalizedAngle - openingHalfAngle,
        end: normalizedAngle + openingHalfAngle,
        center: normalizedAngle
      };
    });
    
    // Sort openings by start angle
    openingRanges.sort((a, b) => a.start - b.start);
    
    // Build arc segments between openings
    let currentAngle = arcStartAngle;
    
    for (const opening of openingRanges) {
      if (opening.start > currentAngle) {
        // Add arc segment from currentAngle to opening.start
        arcSegments.push({
          startAngle: currentAngle,
          endAngle: opening.start
        });
      }
      currentAngle = opening.end;
    }
    
    // Add final segment from last opening to arc end
    if (currentAngle < arcEndAngle) {
      arcSegments.push({
        startAngle: currentAngle,
        endAngle: arcEndAngle
      });
    }
    
    // Draw each arc segment with small edge pieces
    arcSegments.forEach(segment => {
      const segmentArc = segment.endAngle - segment.startAngle;
      const numPieces = Math.max(2, Math.ceil(segmentArc / (Math.PI / 48))); // ~3.75° per piece
      const pieceAngleStep = segmentArc / numPieces;
      
      for (let i = 0; i < numPieces; i++) {
        const angle1 = segment.startAngle + i * pieceAngleStep;
        const angle2 = segment.startAngle + (i + 1) * pieceAngleStep;
        const midAngle = (angle1 + angle2) / 2;
        
        const x1 = circleCenter.x + Math.cos(angle1) * circleRadius;
        const z1 = circleCenter.z + Math.sin(angle1) * circleRadius;
        const x2 = circleCenter.x + Math.cos(angle2) * circleRadius;
        const z2 = circleCenter.z + Math.sin(angle2) * circleRadius;
        
        const segmentLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
        
        const core = new THREE.Mesh(
          new THREE.CylinderGeometry(coreRadius, coreRadius, segmentLength, 8),
          coreMaterial
        );
        core.position.set((x1 + x2) / 2, edgeY, (z1 + z2) / 2);
        core.rotation.x = Math.PI / 2;
        core.rotation.z = midAngle;
        this.scene.add(core);
        this.edges.push(core);
        
        const glow = new THREE.Mesh(
          new THREE.CylinderGeometry(glowRadius, glowRadius, segmentLength, 8),
          glowMaterial
        );
        glow.position.set((x1 + x2) / 2, edgeY, (z1 + z2) / 2);
        glow.rotation.x = Math.PI / 2;
        glow.rotation.z = midAngle;
        this.scene.add(glow);
        this.edges.push(glow);
      }
    });

    // Inner circular edge (complete circle)
    const innerSegments = 24;
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

      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(coreRadius, coreRadius, segmentLength, 8),
        coreMaterial
      );
      core.position.set((x1 + x2) / 2, edgeY, (z1 + z2) / 2);
      core.rotation.x = Math.PI / 2;
      core.rotation.z = midAngle;
      this.scene.add(core);
      this.edges.push(core);

      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(glowRadius, glowRadius, segmentLength, 8),
        glowMaterial
      );
      glow.position.set((x1 + x2) / 2, edgeY, (z1 + z2) / 2);
      glow.rotation.x = Math.PI / 2;
      glow.rotation.z = midAngle;
      this.scene.add(glow);
      this.edges.push(glow);
    }
  }
  
  createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3000; // Increased count
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    // Create stars scattered all around - FAR in the distance
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      
      // Position stars VERY FAR away - much farther than any scene objects
      const radius = 500 + Math.random() * 500; // 500-1000 units away
      const theta = Math.random() * Math.PI * 2; // Full 360° horizontally
      
      // Bias phi toward horizon: more stars at eye level, fewer at top/bottom
      let phi;
      if (Math.random() > 0.3) {
        // 70% of stars near horizon (between 45° and 135°)
        phi = (Math.PI * 0.25) + (Math.random() * Math.PI * 0.5);
      } else {
        // 30% of stars anywhere else
        phi = Math.random() * Math.PI;
      }
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.cos(phi);
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Star colors - mostly white with some blue/yellow tints
      const colorVariation = Math.random();
      if (colorVariation > 0.9) {
        // Blue stars
        colors[i3] = 0.7;
        colors[i3 + 1] = 0.8;
        colors[i3 + 2] = 1.0;
      } else if (colorVariation > 0.8) {
        // Yellow stars
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.9;
        colors[i3 + 2] = 0.7;
      } else {
        // White stars
        colors[i3] = 1.0;
        colors[i3 + 1] = 1.0;
        colors[i3 + 2] = 1.0;
      }
      
      // Random sizes - bigger since they're farther
      sizes[i] = Math.random() * 4 + 2;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const starMaterial = new THREE.PointsMaterial({
      size: 3.0, // Larger size since they're farther away
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.renderOrder = -999; // Render stars first, behind everything
    this.scene.add(stars);
    this.stars.push(stars);
    
    // Store twinkle data for animation
    this.starTwinkleData = [];
    for (let i = 0; i < starCount; i++) {
      this.starTwinkleData.push({
        baseOpacity: 0.6 + Math.random() * 0.4,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }
  
  
  createBubbles() {
    const bubbleRadius = 6; // Increased from 4
    const bubbleHeight = 8;
    
    const { circleRadius, innerHoleRadius, circleCenter } = this.floorDimensions;
    
    // Create exclusion zone at entrance (reduced to bring openings closer)
    const corridorEntranceAngle = 90 * Math.PI / 180;
    const exclusionHalfAngle = 25 * Math.PI / 180; // Reduced from 35 to 25 degrees
    const excludedArc = exclusionHalfAngle * 2;
    
    // Calculate available arc for orbs (360° - excluded arc)
    const availableArc = (Math.PI * 2) - excludedArc;
    
    // Distribute bubbles evenly across available arc
    const angleStep = availableArc / this.portfolioData.length;
    
    // Start angle: corridor entrance + half exclusion + half step (to center first orb)
    const startAngle = corridorEntranceAngle + exclusionHalfAngle + (angleStep / 2);
    
    // Store pathway angles and opening centers for use in edge gap calculation
    this.pathwayAngles = [];
    this.openingCenters = [];
    
    this.portfolioData.forEach((portfolio, index) => {
      const angle = startAngle + (index * angleStep);
      this.pathwayAngles.push(angle); // Store for gap calculation
      
      // Calculate opening center (at the ring's outer edge)
      const openingCenterX = Math.cos(angle) * circleRadius + circleCenter.x;
      const openingCenterZ = Math.sin(angle) * circleRadius + circleCenter.z;
      this.openingCenters.push({ x: openingCenterX, z: openingCenterZ, angle: angle });
      
      // Position orb beyond the end of the pathway (like Memory Hall)
      const pathwayLength = 45;
      const orbDistance = pathwayLength + 8; // Orb is 8 units beyond the pathway end
      const orbX = openingCenterX + Math.cos(angle) * orbDistance;
      const orbZ = openingCenterZ + Math.sin(angle) * orbDistance;
      
      // Create pathway from ring opening center to orb
      this.createPathway(openingCenterX, openingCenterZ, orbX, orbZ, angle, circleCenter);
      
      const bubble = this.createBubble(portfolio, orbX, bubbleHeight, orbZ, bubbleRadius, circleCenter);
      this.bubbles.push(bubble);
      
      // Create entrance label at pathway opening
      this.createEntranceLabel(portfolio.title, portfolio.color, openingCenterX, openingCenterZ, angle);
      
      // Create edges from text label to ring opening
      this.createPathwayEdges(bubble.textSprite, openingCenterX, openingCenterZ, orbX, orbZ);
    });
  }
  
  createPathway(openingCenterX, openingCenterZ, orbX, orbZ, angle, circleCenter) {
    // Create a pathway floor from ring opening center to orb
    const pathwayWidth = 20;
    const pathwayLength = 45;
    const floorOverlap = 5; // Overlap with ring floor for seamless connection
    
    // Calculate rotation to face ring center (same as text labels)
    const dx = circleCenter.x - orbX;
    const dz = circleCenter.z - orbZ;
    const rotationY = Math.atan2(dx, dz);
    
    // Extend pathway inward by overlap amount to connect seamlessly with ring
    // Calculate the inward direction (toward ring center)
    const inwardDirX = Math.cos(angle + Math.PI); // Opposite of outward direction
    const inwardDirZ = Math.sin(angle + Math.PI);
    
    // Move opening center inward by overlap amount
    const extendedOpeningX = openingCenterX + inwardDirX * floorOverlap;
    const extendedOpeningZ = openingCenterZ + inwardDirZ * floorOverlap;
    
    // Calculate pathway center position (midpoint between extended opening and orb)
    const pathwayCenterX = (extendedOpeningX + orbX) / 2;
    const pathwayCenterZ = (extendedOpeningZ + orbZ) / 2;
    
    // Calculate actual floor dimensions
    const actualWidth = pathwayWidth;
    const actualLength = pathwayLength + floorOverlap;
    
    // Create pathway floor with extended length
    const pathway = new THREE.Mesh(
      new THREE.PlaneGeometry(actualWidth, actualLength),
      this.floorMaterial
    );
    pathway.rotation.x = -Math.PI / 2; // Lay flat
    pathway.rotation.z = rotationY; // Rotate to face ring center
    pathway.position.set(pathwayCenterX, 0.1, pathwayCenterZ);
    pathway.receiveShadow = true;
    this.scene.add(pathway);
    
    if (!this.pathways) this.pathways = [];
    this.pathways.push(pathway);
    
    // Add 3D yellow borders on both sides of the pathway
    const borderWidth = 0.3;
    const borderHeight = 0.25; // Half the height of border boxes (0.5 / 2)
    const pathwayHalfWidth = 10;
    
    // Yellow border material (same color as cylinder edges)
    const borderMaterial = new THREE.MeshStandardMaterial({
      color: 0xF79C00, // Amber/yellow color
      emissive: 0xF79C00,
      emissiveIntensity: 0.8, // Increased from 0.3 for brighter glow
      metalness: 0.3,
      roughness: 0.4
    });
    
    // Calculate perpendicular direction (same as boxes and particles)
    const distance = Math.sqrt(dx * dx + dz * dz);
    const dirX = dx / distance;
    const dirZ = dz / distance;
    const perpX = -dirZ;
    const perpZ = dirX;
    
    // Calculate pathway end position (pathway floor is 45 units, extend borders 4 more units = 49 total)
    const pathwayFloorLength = 45; // Pathway floor length
    const borderExtension = 4; // Extend borders 4 units beyond pathway floor (halfway to orb)
    const borderEndLength = pathwayFloorLength + borderExtension;
    const totalOrbDistance = Math.sqrt(Math.pow(orbX - openingCenterX, 2) + Math.pow(orbZ - openingCenterZ, 2));
    const pathwayEndX = openingCenterX + (orbX - openingCenterX) * (borderEndLength / totalOrbDistance);
    const pathwayEndZ = openingCenterZ + (orbZ - openingCenterZ) * (borderEndLength / totalOrbDistance);
    
    // Calculate border start and end points (from pathway end to opening)
    const leftStartX = pathwayEndX + perpX * pathwayHalfWidth;
    const leftStartZ = pathwayEndZ + perpZ * pathwayHalfWidth;
    const leftEndX = openingCenterX + perpX * pathwayHalfWidth;
    const leftEndZ = openingCenterZ + perpZ * pathwayHalfWidth;
    
    const rightStartX = pathwayEndX - perpX * pathwayHalfWidth;
    const rightStartZ = pathwayEndZ - perpZ * pathwayHalfWidth;
    const rightEndX = openingCenterX - perpX * pathwayHalfWidth;
    const rightEndZ = openingCenterZ - perpZ * pathwayHalfWidth;
    
    // Calculate border centers
    const leftCenterX = (leftStartX + leftEndX) / 2;
    const leftCenterZ = (leftStartZ + leftEndZ) / 2;
    const rightCenterX = (rightStartX + rightEndX) / 2;
    const rightCenterZ = (rightStartZ + rightEndZ) / 2;
    
    // Calculate border length (from pathway end to opening)
    const borderLength = Math.sqrt(
      Math.pow(openingCenterX - pathwayEndX, 2) + 
      Math.pow(openingCenterZ - pathwayEndZ, 2)
    );
    
    // Calculate rotation for borders (from pathway end to opening)
    const borderRotationY = Math.atan2(openingCenterX - pathwayEndX, openingCenterZ - pathwayEndZ);
    
    // Left border (3D box)
    const leftBorder = new THREE.Mesh(
      new THREE.BoxGeometry(borderWidth, borderHeight, borderLength),
      borderMaterial
    );
    leftBorder.position.set(leftCenterX, borderHeight / 2, leftCenterZ);
    leftBorder.rotation.y = borderRotationY;
    leftBorder.castShadow = true;
    this.scene.add(leftBorder);
    this.edges.push(leftBorder);
    
    // Right border (3D box)
    const rightBorder = new THREE.Mesh(
      new THREE.BoxGeometry(borderWidth, borderHeight, borderLength),
      borderMaterial
    );
    rightBorder.position.set(rightCenterX, borderHeight / 2, rightCenterZ);
    rightBorder.rotation.y = borderRotationY;
    rightBorder.castShadow = true;
    this.scene.add(rightBorder);
    this.edges.push(rightBorder);
    
    // Add end border (connecting left and right borders at pathway end)
    const endBorderWidth = pathwayWidth; // 20 units wide (full pathway width)
    const endBorderHeight = borderHeight; // Same height as side borders
    const endBorderDepth = borderWidth; // Same depth as side borders
    
    const endBorder = new THREE.Mesh(
      new THREE.BoxGeometry(endBorderWidth, endBorderHeight, endBorderDepth),
      borderMaterial
    );
    endBorder.position.set(pathwayEndX, borderHeight / 2, pathwayEndZ);
    endBorder.rotation.y = borderRotationY;
    endBorder.castShadow = true;
    this.scene.add(endBorder);
    this.edges.push(endBorder);
    
    // Store pathway info for edge creation
    if (!this.pathwayInfo) this.pathwayInfo = [];
    this.pathwayInfo.push({
      centerX: pathwayCenterX,
      centerZ: pathwayCenterZ,
      rotationY: rotationY,
      width: actualWidth,
      length: actualLength
    });
    
    // Store pathway boundary info for collision detection
    if (!this.pathwayBoundaries) this.pathwayBoundaries = [];
    this.pathwayBoundaries.push({
      startX: openingCenterX,
      startZ: openingCenterZ,
      endX: pathwayEndX,
      endZ: pathwayEndZ,
      halfWidth: pathwayHalfWidth,
      dirX: (orbX - openingCenterX) / totalOrbDistance,
      dirZ: (orbZ - openingCenterZ) / totalOrbDistance,
      perpX: perpX,
      perpZ: perpZ,
      length: borderEndLength
    });
  }
  
  createEntranceLabel(name, color, openingX, openingZ, angle) {
    const { circleCenter } = this.floorDimensions;
    
    // Parse color
    const threeColor = new THREE.Color(color);
    const colorRgb = [
      Math.floor(threeColor.r * 255),
      Math.floor(threeColor.g * 255),
      Math.floor(threeColor.b * 255)
    ];
    
    // Create temporary canvas to measure text width
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = 'bold 40px Arial';
    
    // Measure both lines of text
    const line1 = `Enter ${name}'s`;
    const line2 = 'Memory Hall';
    const line1Width = tempCtx.measureText(line1).width;
    const line2Width = tempCtx.measureText(line2).width;
    const maxTextWidth = Math.max(line1Width, line2Width);
    
    // Calculate canvas width based on text width with padding
    const horizontalPadding = 80; // Extra padding on sides
    const canvasWidth = Math.max(512, Math.ceil(maxTextWidth + horizontalPadding));
    
    // Create canvas for text with background
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvasWidth, 256);
    
    // Draw glowing border background
    const padding = 20;
    const borderRadius = 15;
    const rectX = padding;
    const rectY = padding;
    const rectWidth = canvas.width - padding * 2;
    const rectHeight = canvas.height - padding * 2;
    
    // Add subtle vignette background
    const vignette = ctx.createRadialGradient(
      canvasWidth / 2, 128, 0,
      canvasWidth / 2, 128, Math.max(rectWidth, rectHeight) / 2
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.05)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = vignette;
    ctx.beginPath();
    ctx.roundRect(rectX, rectY, rectWidth, rectHeight, borderRadius);
    ctx.fill();
    
    // Thicker glowing border with orb color
    ctx.shadowBlur = 25;
    ctx.shadowColor = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.9)`; // Orb color glow
    ctx.strokeStyle = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.9)`; // Orb color border
    ctx.lineWidth = 6; // Increased from 4 to 6
    
    ctx.beginPath();
    ctx.roundRect(rectX, rectY, rectWidth, rectHeight, borderRadius);
    ctx.stroke();
    
    // Draw text on two lines
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerX = canvasWidth / 2;
    
    // Line 1: "Enter [Name]'s"
    ctx.fillText(line1, centerX, 95);
    // Line 2: "Memory Hall"
    ctx.fillText(line2, centerX, 160);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 1.0
    });
    
    // Calculate plane width based on canvas width (scale proportionally)
    const planeWidth = (canvasWidth / 768) * 11; // Scale relative to original 768px = 11 units
    const planeHeight = 3.75;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position on LEFT side of opening
    const leftOffset = 12; // Increased from 8 to move further left
    const perpAngle = angle - Math.PI / 2; // Left perpendicular
    
    const labelX = openingX + Math.cos(perpAngle) * leftOffset;
    const labelZ = openingZ + Math.sin(perpAngle) * leftOffset;
    
    // Calculate rotation to face ring center (same as orb text labels)
    const dx = circleCenter.x - labelX;
    const dz = circleCenter.z - labelZ;
    const rotationY = Math.atan2(dx, dz);
    
    mesh.position.set(labelX, 4.0, labelZ); // Raised from 2.5 to 4.0
    mesh.rotation.y = rotationY + 0.15; // Face ring center with slight tilt to the right
    
    this.scene.add(mesh);
  }
  
  createPathwayEdges(textSprite, openingX, openingZ, orbX, orbZ) {
    const { circleCenter } = this.floorDimensions;
    
    // Pathway width is 20 units, boxes are at ±10 units from center
    const pathwayHalfWidth = 10;
    const bordersPerSide = 14; // Reduced from 15 to 14
    
    // Calculate direction from orb to ring center
    const dx = circleCenter.x - orbX;
    const dz = circleCenter.z - orbZ;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Normalize the direction
    const dirX = dx / distance;
    const dirZ = dz / distance;
    
    // Calculate perpendicular direction (for left/right positioning)
    const perpX = -dirZ;
    const perpZ = dirX;
    
    // Calculate rotation for boxes (facing toward ring center)
    const boxRotationY = Math.atan2(dx, dz);
    
    // Yellow color (same as pathway borders)
    const yellowColor = 0xF79C00;
    
    // Create 3D border geometry and material
    const borderGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.5); // Increased from 0.4, 0.6, 0.4
    const borderMaterial = new THREE.MeshStandardMaterial({
      color: yellowColor,
      emissive: yellowColor,
      emissiveIntensity: 0.8, // Increased from 0.5 for brighter glow
      metalness: 0.3,
      roughness: 0.4
    });
    
    // Calculate pathway end position (pathway is 45 units long, extend boxes 4 more units = 49 total)
    const pathwayLength = 45;
    const boxExtension = 4; // Extend boxes 4 units beyond pathway floor (halfway to orb)
    const boxEndLength = pathwayLength + boxExtension;
    const totalDistance = Math.sqrt(Math.pow(orbX - openingX, 2) + Math.pow(orbZ - openingZ, 2));
    const pathwayEndX = openingX + (orbX - openingX) * (boxEndLength / totalDistance);
    const pathwayEndZ = openingZ + (orbZ - openingZ) * (boxEndLength / totalDistance);
    
    // Create left side 3D borders (from pathway end to opening)
    for (let i = 0; i < bordersPerSide; i++) {
      const t = i / (bordersPerSide - 1); // 0 to 1
      
      // Position along the pathway from pathway end to opening
      const posX = pathwayEndX + (openingX - pathwayEndX) * t;
      const posZ = pathwayEndZ + (openingZ - pathwayEndZ) * t;
      
      // Offset to left side
      const leftX = posX + perpX * pathwayHalfWidth;
      const leftZ = posZ + perpZ * pathwayHalfWidth;
      
      const border = new THREE.Mesh(borderGeometry, borderMaterial);
      border.position.set(leftX, 0.25, leftZ);
      border.rotation.y = boxRotationY;
      border.castShadow = true;
      this.scene.add(border);
      this.edges.push(border);
    }
    
    // Create right side 3D borders (from pathway end to opening)
    for (let i = 0; i < bordersPerSide; i++) {
      const t = i / (bordersPerSide - 1); // 0 to 1
      
      // Position along the pathway from pathway end to opening
      const posX = pathwayEndX + (openingX - pathwayEndX) * t;
      const posZ = pathwayEndZ + (openingZ - pathwayEndZ) * t;
      
      // Offset to right side
      const rightX = posX - perpX * pathwayHalfWidth;
      const rightZ = posZ - perpZ * pathwayHalfWidth;
      
      const border = new THREE.Mesh(borderGeometry, borderMaterial);
      border.position.set(rightX, 0.25, rightZ);
      border.rotation.y = boxRotationY;
      border.castShadow = true;
      this.scene.add(border);
      this.edges.push(border);
    }
  }
  
  createOrbEdges(orbX, orbZ, pathwayRotationY) {
    // Create a single 20-unit wide edge line at the end of pathway
    const edgeWidth = 20;
    const coreRadius = 0.1;
    const glowRadius = 0.25;
    const edgeHeight = 0.3;
    const edgeY = edgeHeight / 2 + 0.1;
    
    // Core material
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xB87400,
      transparent: false
    });
    
    // Glow material
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.20,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    // Create a single edge that spans the width (perpendicular to pathway)
    // The cylinder runs perpendicular to the pathway direction
    const edgeCore = new THREE.Mesh(
      new THREE.CylinderGeometry(coreRadius, coreRadius, edgeWidth, 8),
      coreMaterial
    );
    edgeCore.position.set(orbX, edgeY, orbZ);
    edgeCore.rotation.x = Math.PI / 2;  // Lay horizontal
    edgeCore.rotation.z = pathwayRotationY + Math.PI / 2;  // Perpendicular to pathway
    this.scene.add(edgeCore);
    this.edges.push(edgeCore);
    
    const edgeGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(glowRadius, glowRadius, edgeWidth, 8),
      glowMaterial
    );
    edgeGlow.position.set(orbX, edgeY, orbZ);
    edgeGlow.rotation.x = Math.PI / 2;
    edgeGlow.rotation.z = pathwayRotationY + Math.PI / 2;  // Perpendicular to pathway
    this.scene.add(edgeGlow);
    this.edges.push(edgeGlow);
  }
  
  createBubble(portfolio, x, y, z, radius, circleCenter) {
    // Parse color
    const color = new THREE.Color(portfolio.color);
    const colorRgb = [
      Math.floor(color.r * 255),
      Math.floor(color.g * 255),
      Math.floor(color.b * 255)
    ];
    const colorData = {
      hex: color.getHex(),
      rgb: colorRgb
    };
    
    // Create canvas for orb texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const texture = new THREE.CanvasTexture(canvas);
    
    // Draw image to canvas - CLEAN, no effects
    const drawImageToCanvas = (source) => {
      const sourceAspect = source.width / source.height;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (sourceAspect > 1) {
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
      
      ctx.clearRect(0, 0, 512, 512);
      
      // Circular clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(256, 256, 256, 0, Math.PI * 2);
      ctx.clip();
      
      // Draw image with NO effects
      ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
      
      // Add thin colored vignette at edges only
      const vignette = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(0.55, 'transparent');
      vignette.addColorStop(0.65, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.2)`);
      vignette.addColorStop(0.72, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.4)`);
      vignette.addColorStop(0.78, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.6)`);
      vignette.addColorStop(0.85, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.8)`);
      vignette.addColorStop(0.92, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.95)`);
      vignette.addColorStop(1, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 1)`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, 512, 512);
      
      ctx.restore();
      texture.needsUpdate = true;
    };
    
    // Fallback colored orb
    const drawFallback = () => {
      ctx.clearRect(0, 0, 512, 512);
      ctx.save();
      ctx.beginPath();
      ctx.arc(256, 256, 256, 0, Math.PI * 2);
      ctx.clip();
      
      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.2, 'transparent');
      grad.addColorStop(0.4, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.4)`);
      grad.addColorStop(0.6, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.8)`);
      grad.addColorStop(1, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 1)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      
      ctx.restore();
      texture.needsUpdate = true;
    };
    
    // Load image
    if (portfolio.image) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => drawImageToCanvas(img);
      img.onerror = () => drawFallback();
      img.src = portfolio.image;
    } else {
      drawFallback();
    }
    
    // Create orb sprite with FULL opacity
    const orbMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0
    });
    const orb = new THREE.Sprite(orbMaterial);
    orb.scale.set(radius * 2, radius * 2, 1);
    orb.position.set(x, y, z);
    orb.renderOrder = 0;
    this.scene.add(orb);
    
    // Create glow ring - BEHIND orb so it doesn't affect image
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 512;
    glowCanvas.height = 512;
    const glowCtx = glowCanvas.getContext('2d');
    
    const glowGrad = glowCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
    glowGrad.addColorStop(0, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.9)`);
    glowGrad.addColorStop(0.2, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.7)`);
    glowGrad.addColorStop(0.4, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.5)`);
    glowGrad.addColorStop(0.6, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.3)`);
    glowGrad.addColorStop(0.8, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.1)`);
    glowGrad.addColorStop(1, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0)`);
    glowCtx.fillStyle = glowGrad;
    glowCtx.fillRect(0, 0, 512, 512);
    
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glowRing = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        opacity: 1.0
      })
    );
    glowRing.scale.set(radius * 3.5, radius * 3.5, 1);
    glowRing.position.set(x, y, z - 0.1);
    glowRing.renderOrder = -1;
    this.scene.add(glowRing);
    
    // Platform
    const platform = this.createOrbPlatform(colorData);
    platform.position.set(x, 0.2, z);
    this.scene.add(platform);
    
    // Text label
    const dx = circleCenter.x - x;
    const dz = circleCenter.z - z;
    const textRotationY = Math.atan2(dx, dz);
    
    const textSprite = this.createTextSprite(portfolio.title, colorData, textRotationY);
    
    const forwardOffset = 2.0;
    const forwardX = Math.sin(textRotationY) * forwardOffset;
    const forwardZ = Math.cos(textRotationY) * forwardOffset;
    
    textSprite.position.set(x + forwardX, y + radius + 3.0, z + forwardZ);
    this.scene.add(textSprite);
    
    // Create portal particles - vacuum effect around orb in 3D (using Points, no billboard)
    const portalParticleCount = 35;
    const portalGeometry = new THREE.BufferGeometry();
    const portalPositions = new Float32Array(portalParticleCount * 3);
    const portalColors = new Float32Array(portalParticleCount * 3);
    const portalSizes = new Float32Array(portalParticleCount);
    const portalData = [];
    
    for (let i = 0; i < portalParticleCount; i++) {
      const i3 = i * 3;
      
      // Random position in 3D sphere around orb for continuous flow
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const startRadius = radius * 3;
      
      // Stagger starting distances for continuous flow
      const radiusVariation = Math.random() * startRadius * 0.5;
      const currentRadius = startRadius - radiusVariation;
      
      const px = Math.sin(phi) * Math.cos(theta) * currentRadius;
      const py = Math.cos(phi) * currentRadius;
      const pz = Math.sin(phi) * Math.sin(theta) * currentRadius;
      
      portalPositions[i3] = x + px;
      portalPositions[i3 + 1] = y + py;
      portalPositions[i3 + 2] = z + pz;
      
      // Set particle color
      portalColors[i3] = colorRgb[0] / 255;
      portalColors[i3 + 1] = colorRgb[1] / 255;
      portalColors[i3 + 2] = colorRgb[2] / 255;
      
      // Bigger size
      portalSizes[i] = 0.4 + Math.random() * 0.3;
      
      // Store particle data for vacuum animation
      portalData.push({
        index: i,
        directionX: -px / currentRadius,
        directionY: -py / currentRadius,
        directionZ: -pz / currentRadius,
        speed: 0.04 + Math.random() * 0.02,
        distance: currentRadius,
        maxDistance: startRadius,
        centerX: x,
        centerY: y,
        centerZ: z
      });
    }
    
    portalGeometry.setAttribute('position', new THREE.BufferAttribute(portalPositions, 3));
    portalGeometry.setAttribute('color', new THREE.BufferAttribute(portalColors, 3));
    portalGeometry.setAttribute('size', new THREE.BufferAttribute(portalSizes, 1));
    
    const portalMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    const portalParticles = new THREE.Points(portalGeometry, portalMaterial);
    portalParticles.userData.particleData = portalData;
    portalParticles.userData.colorData = colorData;
    this.scene.add(portalParticles);
    
    return {
      orb: orb,
      glowRing: glowRing,
      light: null,
      platform: platform,
      textSprite: textSprite,
      portalParticles: portalParticles,
      portfolio: portfolio,
      baseY: y,
      texture: texture
    };
  }
  
  createFloatingTitle() {
    const { circleCenter } = this.floorDimensions;
    const text = "NYERK";
    const color = new THREE.Color(0xffffff); // White color
    const x = circleCenter.x;
    const y = 28;
    const z = circleCenter.z;
    
    // Create canvas for text texture
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, 2048, 512);
    
    ctx.font = 'bold 180px Arial'; // Bigger font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Subtle outer glow (widest, softest)
    ctx.shadowBlur = 50;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillText(text, 1024, 256);
    
    // Slightly more glow
    ctx.shadowBlur = 30; // Increased from 20
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)'; // Increased opacity
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText(text, 1024, 256);
    
    ctx.shadowBlur = 15; // Increased from 10
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(text, 1024, 256);
    
    // Bright white core
    ctx.shadowBlur = 8; // Increased from 5
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fillText(text, 1024, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create 3D depth effect - bigger size
    const textWidth = 100; // Increased from 70
    const textHeight = 24; // Increased from 16
    const depthLayers = 5; // Reduced from 8 for less glow
    const layerSpacing = 0.15;
    
    const textGroup = new THREE.Group();
    
    for (let i = depthLayers - 1; i >= 0; i--) {
      const layerGeometry = new THREE.PlaneGeometry(textWidth, textHeight);
      const opacity = 0.4 + (i / depthLayers) * 0.6; // Less opacity variation
      const blendMode = i === 0 ? THREE.NormalBlending : THREE.AdditiveBlending;
      
      const layerMaterial = new THREE.MeshBasicMaterial({
        map: i === 0 ? texture : texture.clone(),
        transparent: true,
        side: THREE.DoubleSide,
        blending: blendMode,
        depthWrite: false,
        opacity: i === 0 ? 1.0 : opacity
      });
      
      const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
      layerMesh.position.z = -i * layerSpacing;
      
      if (i === 0) {
        layerMaterial.color.setRGB(1, 1, 1);
      } else {
        layerMaterial.color.setRGB(0.8 + i / depthLayers * 0.2, 0.8 + i / depthLayers * 0.2, 0.8 + i / depthLayers * 0.2);
      }
      
      textGroup.add(layerMesh);
    }
    
    textGroup.position.set(x, y, z);
    textGroup.userData = { baseY: y, floatOffset: Math.random() * Math.PI * 2 };
    this.scene.add(textGroup);
    this.titleSprite = textGroup;
    
    // Slightly stronger point light
    const textLight = new THREE.PointLight(color, 3.5, 30); // Increased from 2.0
    textLight.position.set(x, y, z - 2);
    this.scene.add(textLight);
  }
  
  createOrbPlatform(colorData) {
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
    
    // Create particle system for rising particles
    const particleCount = 25;
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
      const radius = Math.random() * 0.5;
      
      particle.position.x = Math.cos(angle) * radius;
      particle.position.y = 0;
      particle.position.z = Math.sin(angle) * radius;
      
      const scale = 0.2 + Math.random() * 0.3; // Bigger particles (was 0.1-0.25)
      particle.scale.set(scale, scale, 1);
      
      // Store particle data for animation
      particle.userData = {
        velocity: 0.02 + Math.random() * 0.03,
        maxHeight: 3 + Math.random() * 1,
        angle: angle,
        startRadius: radius,
        resetY: 0,
        expansionRate: 3 + Math.random() * 2 // More outward spread (was 2)
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
  
  createTextSprite(text, colorData, rotationY) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // No background - transparent
    ctx.clearRect(0, 0, 1024, 256);
    
    // Create soft, smooth glow with large blur radius
    ctx.shadowColor = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.9)`;
    ctx.shadowBlur = 50; // Large blur for soft, smooth glow
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 110px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw glow layers with decreasing blur for smooth gradient
    ctx.shadowBlur = 60;
    ctx.fillText(text, 512, 128);
    
    ctx.shadowBlur = 45;
    ctx.fillText(text, 512, 128);
    
    ctx.shadowBlur = 30;
    ctx.fillText(text, 512, 128);
    
    // Add subtle dark shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Final bright text layer
    ctx.fillText(text, 512, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 1.0
    });
    
    const planeHeight = 5.0;
    const planeWidth = 20.0;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Apply rotation to face ring center
    mesh.rotation.y = rotationY;
    
    return mesh;
  }
  
  createRainbowFountain() {
    const { circleCenter } = this.floorDimensions;
    const particleCount = 80;

    // Use the actual orb colors from portfolio data (same as the museum orbs)
    const orbColors = this.portfolioData.map(p => {
      const c = new THREE.Color(p.color);
      return [Math.floor(c.r * 255), Math.floor(c.g * 255), Math.floor(c.b * 255)];
    });

    // Use same particle texture style as createOrbPlatform
    const textures = orbColors.map(rgb => {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`);
      g.addColorStop(0.5, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.5)`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
      return new THREE.CanvasTexture(c);
    });

    const gravity = -0.012;
    // Particles spawn from top spout (topY=0.2 + 1.52 = 1.72)
    // and reset when they fall back to water surface (topY - 0.05 = 0.15)
    const spawnY = 4.85;  // spout tip height
    const basinY = 0.15;  // water surface — reset level
    const vy0 = 0.65;
    const targetRadius = 13;
    const outwardSpeed = targetRadius * Math.abs(gravity) / (2 * vy0);
    const particles = [];

    const resetParticle = (p) => {
      const ud = p.userData;
      ud.x = circleCenter.x;
      ud.y = spawnY;
      ud.z = circleCenter.z;

      const angle = Math.random() * Math.PI * 2;
      const variation = 0.85 + Math.random() * 0.3;
      const s = outwardSpeed * variation;
      ud.vx = Math.cos(angle) * s;
      ud.vy = vy0;
      ud.vz = Math.sin(angle) * s;

      p.position.set(ud.x, ud.y, ud.z);
      p.material.opacity = 1;
    };

    for (let i = 0; i < particleCount; i++) {
      const colorIndex = i % orbColors.length;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: textures[colorIndex],
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));

      const scale = 0.7 + Math.random() * 0.5;
      sprite.scale.set(scale, scale, 1);
      sprite.userData = { vx: 0, vy: 0, vz: 0, x: 0, y: 0, z: 0, baseScale: scale };

      resetParticle(sprite);

      // Stagger so fountain looks continuous from the start
      const staggerFrames = Math.floor(Math.random() * 60);
      for (let f = 0; f < staggerFrames; f++) {
        sprite.userData.vy += gravity;
        sprite.userData.x += sprite.userData.vx;
        sprite.userData.y += sprite.userData.vy;
        sprite.userData.z += sprite.userData.vz;
        sprite.position.set(sprite.userData.x, sprite.userData.y, sprite.userData.z);
        if (sprite.userData.y <= basinY && sprite.userData.vy < 0) resetParticle(sprite);
      }

      this.scene.add(sprite);
      particles.push(sprite);
    }

    this.fountainParticles = particles;
    this.fountainGravity = gravity;
    this.fountainCenter = circleCenter;
    this.fountainBasinY = basinY;
    this.fountainSpawnY = spawnY;

    this.createFountainBase(circleCenter);
  }

  createFountainBase(circleCenter) {
    const cx = circleCenter.x;
    const cz = circleCenter.z;
    const outerRadius = 18;
    const innerRadius = 14.5;
    const wallHeight = 0.8;
    const sinkY = -0.6;
    const wallY = sinkY + wallHeight / 2;
    const topY = sinkY + wallHeight; // = 0.2

    const purple = 0x4a2a6a;
    const purpleLight = 0x6a3a9a;

    const solidMat = new THREE.MeshStandardMaterial({
      color: purple, emissive: purple, emissiveIntensity: 0.5,
      metalness: 0.3, roughness: 0.5,
    });
    const topMat = new THREE.MeshStandardMaterial({
      color: purpleLight, emissive: purpleLight, emissiveIntensity: 0.7,
      metalness: 0.4, roughness: 0.3,
    });

    // Outer wall (open cylinder)
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(outerRadius, outerRadius, wallHeight, 64, 1, true),
      solidMat
    );
    wall.position.set(cx, wallY, cz);
    this.scene.add(wall);

    // Inner wall face (open cylinder)
    const innerWall = new THREE.Mesh(
      new THREE.CylinderGeometry(innerRadius, innerRadius, wallHeight, 64, 1, true),
      solidMat
    );
    innerWall.position.set(cx, wallY, cz);
    this.scene.add(innerWall);

    // Solid purple basin bottom
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(innerRadius, 64), solidMat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.set(cx, sinkY + 0.02, cz);
    this.scene.add(bottom);

    // Top coping ring (flat donut on top of walls)
    const capRing = new THREE.Mesh(
      new THREE.RingGeometry(innerRadius, outerRadius + 0.4, 64),
      topMat
    );
    capRing.rotation.x = -Math.PI / 2;
    capRing.position.set(cx, topY + 0.01, cz);
    this.scene.add(capRing);

    // Amber glow ring on top edge
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(outerRadius + 0.4, 0.15, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0xF79C00, transparent: true, opacity: 0.85 })
    );
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.set(cx, topY + 0.02, cz);
    this.scene.add(glowRing);

    // Rainbow water surface — sits ABOVE the bottom, BELOW the coping ring
    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = 256;
    waterCanvas.height = 256;

    const drawWaterCanvas = (canvas, portfolioData, t) => {
      const ctx = canvas.getContext('2d');
      const wcx = canvas.width / 2, wcy = canvas.height / 2, wr = wcx;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(wcx, wcy, wr, 0, Math.PI * 2);
      ctx.clip();

      // Draw a dark base
      ctx.fillStyle = `rgba(20, 10, 40, 1)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Soft blended color pools — each portfolio color as a radial blob
      // positioned around the circle, slowly drifting
      const cols = portfolioData.map(p => {
        const c = new THREE.Color(p.color);
        return [Math.floor(c.r * 255), Math.floor(c.g * 255), Math.floor(c.b * 255)];
      });
      const count = cols.length;
      cols.forEach((rgb, i) => {
        const angle = (i / count) * Math.PI * 2 + t * 0.15; // slow drift
        const dist = wr * 0.45; // keep blobs inside
        const bx = wcx + Math.cos(angle) * dist;
        const by = wcy + Math.sin(angle) * dist;
        const blobR = wr * 0.55;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, blobR);
        g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.75)`);
        g.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.35)`);
        g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      // Bright shimmer highlight in center — pulses like light on water
      const shimmerR = wr * (0.25 + 0.08 * Math.sin(t * 1.8));
      const shimmer = ctx.createRadialGradient(wcx, wcy, 0, wcx, wcy, shimmerR);
      shimmer.addColorStop(0, `rgba(255,255,255,${0.35 + 0.15 * Math.sin(t * 2.3)})`);
      shimmer.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shimmer;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.restore();
    };

    drawWaterCanvas(waterCanvas, this.portfolioData, 0);
    this.drawWaterCanvas = drawWaterCanvas;

    const waterTexture = new THREE.CanvasTexture(waterCanvas);
    const waterMesh = new THREE.Mesh(
      new THREE.CircleGeometry(innerRadius - 0.3, 64),
      new THREE.MeshBasicMaterial({ map: waterTexture, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(cx, topY - 0.05, cz); // just inside the basin, below coping ring
    waterMesh.renderOrder = 2;
    this.scene.add(waterMesh);

    this.fountainWater = { canvas: waterCanvas, texture: waterTexture };

    // Central tiered fountain structure
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x7a5a9a, emissive: 0x3a1a5a, emissiveIntensity: 0.4,
      metalness: 0.2, roughness: 0.7,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xF79C00, emissive: 0xF79C00, emissiveIntensity: 0.9,
      metalness: 0.6, roughness: 0.2,
    });

    const tierParts = [];

    // Tier 1 — wide base pedestal sitting on water surface
    const base = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.25, 0.75, 32), stoneMat);
    base.position.set(cx, topY + 0.375, cz);
    this.scene.add(base); tierParts.push(base);

    // Tier 1 amber rim
    const baseRim = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.25, 8, 32), accentMat);
    baseRim.rotation.x = Math.PI / 2;
    baseRim.position.set(cx, topY + 0.75, cz);
    this.scene.add(baseRim); tierParts.push(baseRim);

    // Stem connecting tier 1 to tier 2
    const stem1 = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.0, 1.25, 16), stoneMat);
    stem1.position.set(cx, topY + 1.375, cz);
    this.scene.add(stem1); tierParts.push(stem1);

    // Tier 2 — medium bowl
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.0, 0.625, 32), stoneMat);
    tier2.position.set(cx, topY + 2.0, cz);
    this.scene.add(tier2); tierParts.push(tier2);

    const tier2Rim = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.22, 8, 32), accentMat);
    tier2Rim.rotation.x = Math.PI / 2;
    tier2Rim.position.set(cx, topY + 2.3, cz);
    this.scene.add(tier2Rim); tierParts.push(tier2Rim);

    // Stem connecting tier 2 to tier 3
    const stem2 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 1.0, 16), stoneMat);
    stem2.position.set(cx, topY + 2.8, cz);
    this.scene.add(stem2); tierParts.push(stem2);

    // Tier 3 — small top bowl
    const tier3 = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.1, 0.5, 32), stoneMat);
    tier3.position.set(cx, topY + 3.55, cz);
    this.scene.add(tier3); tierParts.push(tier3);

    const tier3Rim = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.18, 8, 32), accentMat);
    tier3Rim.rotation.x = Math.PI / 2;
    tier3Rim.position.set(cx, topY + 3.8, cz);
    this.scene.add(tier3Rim); tierParts.push(tier3Rim);

    // Stem connecting tier 3 to spout
    const stem3 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 0.7, 16), stoneMat);
    stem3.position.set(cx, topY + 4.15, cz);
    this.scene.add(stem3); tierParts.push(stem3);

    // Top spout — glowing orb where particles emerge
    const spout = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), accentMat);
    spout.position.set(cx, topY + 4.65, cz);
    this.scene.add(spout); tierParts.push(spout);

    this.fountainBase = [wall, innerWall, bottom, capRing, glowRing, waterMesh, ...tierParts];
  }

  createPOVHand() {
    this.handScene = new THREE.Scene();
    this.handCamera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
    this.handCamera.position.set(0, 0, 4);

    // Lights for the hand scene — low ambient + multiple directionals for depth
    const ambLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.handScene.add(ambLight);

    // Key light — upper front-right, warm
    const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0);
    keyLight.position.set(3, 4, 5);
    this.handScene.add(keyLight);

    // Fill light — left side, cooler and dimmer
    const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.6);
    fillLight.position.set(-4, 2, 2);
    this.handScene.add(fillLight);

    // Rim light — back, creates edge separation
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
        pivot.rotation.y = 3.4 + Math.PI; // flip palm to face away from screen
        pivot.rotation.x = 1.3; // lay horizontal
        pivot.rotation.z = 4.7;
        pivot.position.set(1.2, -0.3, 0);

        this.handScene.add(pivot);
        this.povHand = pivot;
        this.povHandBaseY = -1.2;
        this.povHandBaseX = 1.5;

        // Store idle rotation for lerping
        this.idleRotation = { x: 1.3, y: 3.4 + Math.PI, z: 4.7 };
        // Walk rotation — tweak these to taste
        this.walkRotation = { x: 1.3, y: 2.5 + Math.PI, z: 4.3 };

        if (gltf.animations && gltf.animations.length > 0) {
          this.handMixer = new THREE.AnimationMixer(hand);
          this.handClip = gltf.animations[0];
          const action = this.handMixer.clipAction(this.handClip);
          action.play();
          // Seek to idle pose and snapshot bone quaternions
          this.handMixer.update(this.handClip.duration * 0.55);
          action.timeScale = 0;

          // Snapshot idle pose (exclude root/global bones that move position)
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

          // Stop mixer — we'll drive bones manually from now on
          action.stop();
          this.handMixer = null;

          // Apply idle pose
          hand.traverse(child => {
            if (child.isBone && this.idlePose[child.name]) {
              child.quaternion.copy(this.idlePose[child.name]);
            }
          });

          this.handRef = hand; // keep ref for lerping
          this.clickAnimLerp = 0; // 0=idle, 1=click
          console.log('Hand poses captured. Idle bones:', Object.keys(this.idlePose).length);
          console.log('Hand animations:', gltf.animations.map(a => a.name));
        }

        console.log('POV hand loaded — size:', size, 'scale:', s);
      },
      undefined,
      (err) => console.warn('POV hand model failed to load:', err)
    );
  }

  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Keyboard controls (WASD movement)
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    
    // Mouse drag controls (like Memory Hall)
    this.container.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    
    // Listen for return from detail view
    this._returnHandler = (event) => {
      if (event.detail && event.detail.portfolio) {
        this.positionCameraAtOrb(event.detail.portfolio);
      }
    };
    window.addEventListener('returnToMainMuseum', this._returnHandler);
    
    // Set cursor style
    this.container.style.cursor = 'grab';
  }
  
  positionCameraAtOrb(portfolio) {
    // Find the bubble for this portfolio
    const bubble = this.bubbles.find(b => b.portfolio.title === portfolio.title);
    if (!bubble) {
      console.log('Bubble not found for portfolio:', portfolio.title);
      return;
    }
    
    const orbX = bubble.orb.position.x;
    const orbY = bubble.orb.position.y;
    const orbZ = bubble.orb.position.z;
    
    // Calculate direction from orb to ring center
    const { circleCenter } = this.floorDimensions;
    const dx = circleCenter.x - orbX;
    const dz = circleCenter.z - orbZ;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Normalize direction
    const dirX = dx / distance;
    const dirZ = dz / distance;
    
    // Position camera further in front of orb (25 units away, facing toward the orb)
    const cameraDistance = 25;
    const cameraX = orbX + dirX * cameraDistance;
    const cameraZ = orbZ + dirZ * cameraDistance;
    
    // Disable boundaries temporarily to prevent being pushed away
    this.disableBoundaries = true;
    setTimeout(() => {
      this.disableBoundaries = false;
    }, 2000); // Disable for 2 seconds
    
    // Set camera position
    this.camera.position.set(cameraX, 5, cameraZ);
    
    // Use lookAt to face the orb directly
    this.camera.lookAt(orbX, orbY, orbZ);
    
    // Extract rotation from camera after lookAt
    this.cameraRotation.y = this.camera.rotation.y;
    this.cameraRotation.x = this.camera.rotation.x;
    
    // Lock camera rotation temporarily to prevent mouse movement from overriding
    this.lockCameraRotation = true;
    setTimeout(() => {
      this.lockCameraRotation = false;
    }, 1000); // Increased lock time to 1000ms
    
    // Reset velocity
    this.cameraVelocity.set(0, 0, 0);
    
    console.log('Camera positioned at:', cameraX, 5, cameraZ, 'looking at orb:', orbX, orbY, orbZ);
    console.log('Boundaries disabled for 2 seconds');
  }
  
  applyBoundaries() {
    // Skip boundaries if disabled (e.g., when spawning at orb)
    if (this.disableBoundaries) return;
    
    const {
      mainCorridorWidth,
      circleRadius,
      innerHoleRadius,
      entranceBackZ,
      entranceZ,
      junctionZ,
      circleCenter
    } = this.floorDimensions;
    
    const x = this.camera.position.x;
    const z = this.camera.position.z;
    const margin = 1.0;
    
    // 1. Check if in pathway FIRST (pathways can extend into any area)
    if (this.pathwayBoundaries && this.pathwayBoundaries.length > 0) {
      for (let i = 0; i < this.pathwayBoundaries.length; i++) {
        const pw = this.pathwayBoundaries[i];
        const dx = x - pw.startX;
        const dz = z - pw.startZ;
        
        // Distance along pathway
        const along = dx * pw.dirX + dz * pw.dirZ;
        
        // Distance perpendicular to pathway
        const perp = dx * pw.perpX + dz * pw.perpZ;
        
        // Very generous bounds for pathway detection
        const inLength = along >= -15 && along <= pw.length + 15;
        const inWidth = Math.abs(perp) <= pw.halfWidth + 3;
        
        if (inLength && inWidth) {
          // Constrain width if outside bounds
          if (Math.abs(perp) > pw.halfWidth - margin) {
            const constrainedPerp = Math.sign(perp) * (pw.halfWidth - margin);
            this.camera.position.x = pw.startX + along * pw.dirX + constrainedPerp * pw.perpX;
            this.camera.position.z = pw.startZ + along * pw.dirZ + constrainedPerp * pw.perpZ;
          }
          
          // Constrain length - prevent going past the end (orb side)
          if (along > pw.length - margin) {
            const constrainedAlong = pw.length - margin;
            this.camera.position.x = pw.startX + constrainedAlong * pw.dirX + perp * pw.perpX;
            this.camera.position.z = pw.startZ + constrainedAlong * pw.dirZ + perp * pw.perpZ;
          }
          
          return; // In pathway, done - don't check other boundaries
        }
      }
    }
    
    // 2. Check entrance extension (simple rectangle)
    if (z >= entranceZ && z <= entranceBackZ + margin) {
      const halfWidth = mainCorridorWidth / 2 - margin;
      // Constrain width
      if (Math.abs(x) > halfWidth) {
        this.camera.position.x = Math.sign(x) * halfWidth;
      }
      // Constrain back boundary (prevent going past spawn point)
      if (z > entranceBackZ) {
        this.camera.position.z = entranceBackZ;
      }
      return;
    }
    
    // 3. Check main corridor (simple rectangle)
    if (z >= junctionZ - margin && z < entranceZ) {
      const halfWidth = mainCorridorWidth / 2 - margin;
      if (Math.abs(x) > halfWidth) {
        this.camera.position.x = Math.sign(x) * halfWidth;
      }
      return;
    }
    
    // 4. Check ring (donut shape) - only if not in pathway
    const distFromCenter = Math.sqrt(
      Math.pow(x - circleCenter.x, 2) + 
      Math.pow(z - circleCenter.z, 2)
    );
    
    // Only apply ring boundaries if actually in the ring walkway area
    const inRingWalkway = distFromCenter >= innerHoleRadius - 5 && distFromCenter <= circleRadius + 5;
    
    if (inRingWalkway) {
      // Inner boundary - always apply (prevent falling into hole)
      if (distFromCenter < innerHoleRadius + margin) {
        const angle = Math.atan2(z - circleCenter.z, x - circleCenter.x);
        this.camera.position.x = circleCenter.x + Math.cos(angle) * (innerHoleRadius + margin);
        this.camera.position.z = circleCenter.z + Math.sin(angle) * (innerHoleRadius + margin);
        return;
      }
      
      // Outer boundary - check if at an opening
      let atOpening = false;
      if (this.pathwayAngles) {
        const angle = Math.atan2(z - circleCenter.z, x - circleCenter.x);
        const openingAngle = Math.atan(15 / circleRadius); // Wider opening detection
        
        for (const pathAngle of this.pathwayAngles) {
          let diff = Math.abs(angle - pathAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff <= openingAngle) {
            atOpening = true;
            break;
          }
        }
      }
      
      // Only apply outer boundary if NOT at an opening
      if (!atOpening && distFromCenter > circleRadius - margin) {
        const angle = Math.atan2(z - circleCenter.z, x - circleCenter.x);
        this.camera.position.x = circleCenter.x + Math.cos(angle) * (circleRadius - margin);
        this.camera.position.z = circleCenter.z + Math.sin(angle) * (circleRadius - margin);
        return;
      }
    }
    
    // If we get here, we're in a valid area (pathway, center area, or beyond ring opening)
    // Don't apply any constraints
  }
  
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
  
  onMouseDown(event) {
    this.isMouseDown = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.mouseDownX = event.clientX;
    this.mouseDownY = event.clientY;
    this.container.style.cursor = 'grabbing';
  }
  
  onMouseMove(event) {
    if (!this.isMouseDown || this.lockCameraRotation) return;
    
    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;
    
    this.cameraRotation.y -= deltaX * this.lookSpeed;
    this.cameraRotation.x -= deltaY * this.lookSpeed;
    
    // Clamp vertical rotation
    this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));
    
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }
  
  onMouseUp(event) {
    this.isMouseDown = false;
    this.container.style.cursor = 'grab';
    this.clickAnimTarget = 0;
    
    // Check if it was a click (not a drag)
    const dragDistance = Math.sqrt(
      Math.pow(event.clientX - this.mouseDownX, 2) + 
      Math.pow(event.clientY - this.mouseDownY, 2)
    );
    
    // If drag distance is small, treat as click
    if (dragDistance < 5) {
      this.onBubbleClick(event);
    }
  }
  
  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    if (this.handCamera) {
      this.handCamera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.handCamera.updateProjectionMatrix();
    }
  }
  
  onBubbleClick(event) {
    // Use center of screen for raycasting (first-person view)
    this.mouse.x = 0;
    this.mouse.y = 0;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObjects(
      this.bubbles.map(b => b.orb)
    );
    
    if (intersects.length > 0) {
      const clickedBubble = this.bubbles.find(b => b.orb === intersects[0].object);
      if (clickedBubble) {
        console.log('Clicked portfolio:', clickedBubble.portfolio.title);
        if (Object.keys(this.clickPose).length > 0) {
          this.clickAnimLerp = 1;
          setTimeout(() => { this.clickAnimLerp = 0; }, 600);
          // Delay portfolio transition until after click animation plays
          setTimeout(() => { this.onPortfolioClick(clickedBubble.portfolio); }, 350);
        } else {
          this.onPortfolioClick(clickedBubble.portfolio);
        }
      }
    }
  }
  
  onPortfolioClick(portfolio) {
    // Dispatch custom event for portfolio selection
    const event = new CustomEvent('portfolioSelected', { detail: portfolio });
    window.dispatchEvent(event);
  }
  
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const deltaTime = 0.016; // ~60fps
    this.time += deltaTime;
    
    // Update camera rotation
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.cameraRotation.y;
    this.camera.rotation.x = this.cameraRotation.x;
    
    // Update camera movement (WASD)
    if (this.keys.forward || this.keys.backward || this.keys.left || this.keys.right) {
      const direction = new THREE.Vector3();
      
      if (this.keys.forward) direction.z -= 1;
      if (this.keys.backward) direction.z += 1;
      if (this.keys.left) direction.x -= 1;
      if (this.keys.right) direction.x += 1;
      
      direction.normalize();
      direction.applyQuaternion(this.camera.quaternion);
      direction.y = 0; // Keep movement horizontal
      direction.normalize();
      
      this.cameraVelocity.x += direction.x * this.moveSpeed * deltaTime;
      this.cameraVelocity.z += direction.z * this.moveSpeed * deltaTime;
    }
    
    // Apply velocity with friction
    this.camera.position.x += this.cameraVelocity.x * deltaTime;
    this.camera.position.z += this.cameraVelocity.z * deltaTime;
    
    // Apply boundaries - keep camera within floor areas
    this.applyBoundaries();
    
    this.cameraVelocity.multiplyScalar(0.85); // Friction
    
    // Animate bubbles (floating effect)
    this.bubbles.forEach((bubble, index) => {
      const offset = index * 0.5;
      const newY = bubble.baseY + Math.sin(this.time + offset) * 0.3;
      
      bubble.orb.position.y = newY;
      if (bubble.glowRing) bubble.glowRing.position.y = newY;
      if (bubble.light) bubble.light.position.y = newY;
      bubble.textSprite.position.y = newY + 6 + 3.0;
      
      // Constant glow
      if (bubble.glowRing) bubble.glowRing.material.opacity = 1.0;
      if (bubble.light) bubble.light.intensity = 1.5;
      
      // Animate platform particles - rising effect like Memory Hall
      if (bubble.platform && bubble.platform.userData.particles) {
        bubble.platform.userData.particles.forEach(particle => {
          // Move particle upward
          particle.position.y += particle.userData.velocity;
          
          // Expand outward as it rises (more dramatic splatter)
          const progress = particle.position.y / particle.userData.maxHeight;
          const currentRadius = particle.userData.startRadius + progress * particle.userData.expansionRate;
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
            particle.userData.expansionRate = 3 + Math.random() * 2;
            particle.material.opacity = 1;
          }
        });
      }
      
      // Animate portal particles - vacuum/black hole effect
      if (bubble.portalParticles && bubble.portalParticles.userData.particleData) {
        const positions = bubble.portalParticles.geometry.attributes.position.array;
        const colors = bubble.portalParticles.geometry.attributes.color.array;
        const colorData = bubble.portalParticles.userData.colorData;
        
        bubble.portalParticles.userData.particleData.forEach(data => {
          const i3 = data.index * 3;
          
          // Move straight toward center (no rotation)
          positions[i3] += data.directionX * data.speed;
          positions[i3 + 1] += data.directionY * data.speed;
          positions[i3 + 2] += data.directionZ * data.speed;
          
          // Calculate distance from center
          const dx = positions[i3] - data.centerX;
          const dy = positions[i3 + 1] - data.centerY;
          const dz = positions[i3 + 2] - data.centerZ;
          data.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Fade in as it gets closer (adjust color alpha)
          const progress = 1 - (data.distance / data.maxDistance);
          const alpha = Math.min(1, progress * 1.5);
          colors[i3] = (colorData.rgb[0] / 255) * alpha;
          colors[i3 + 1] = (colorData.rgb[1] / 255) * alpha;
          colors[i3 + 2] = (colorData.rgb[2] / 255) * alpha;
          
          // Reset when reaching center
          if (data.distance <= 0.5) {
            // Respawn at random position on 3D sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = data.maxDistance;
            
            const px = Math.sin(phi) * Math.cos(theta) * r;
            const py = Math.cos(phi) * r;
            const pz = Math.sin(phi) * Math.sin(theta) * r;
            
            positions[i3] = data.centerX + px;
            positions[i3 + 1] = data.centerY + py;
            positions[i3 + 2] = data.centerZ + pz;
            
            data.directionX = -px / r;
            data.directionY = -py / r;
            data.directionZ = -pz / r;
            data.distance = r;
          }
        });
        
        bubble.portalParticles.geometry.attributes.position.needsUpdate = true;
        bubble.portalParticles.geometry.attributes.color.needsUpdate = true;
      }
    });
    
    // Animate edges (no pulsing, edges are already glowing)
    // Animation removed - edges now have constant bright glow
    
    // Animate twinkling stars - subtle variation only
    if (this.stars.length > 0 && this.starTwinkleData) {
      const starObject = this.stars[0];
      if (starObject && starObject.geometry.attributes.color) {
        const colors = starObject.geometry.attributes.color.array;
        
        // Store original colors if not already stored
        if (!this.originalStarColors) {
          this.originalStarColors = new Float32Array(colors);
        }
        
        this.starTwinkleData.forEach((data, i) => {
          const i3 = i * 3;
          // Subtle brightness variation: 0.85 to 1.0 (only 15% variation)
          const brightness = 0.85 + Math.sin(this.time * data.twinkleSpeed + data.twinkleOffset) * 0.075;
          
          // Apply brightness to original colors
          colors[i3] = this.originalStarColors[i3] * brightness;
          colors[i3 + 1] = this.originalStarColors[i3 + 1] * brightness;
          colors[i3 + 2] = this.originalStarColors[i3 + 2] * brightness;
        });
        starObject.geometry.attributes.color.needsUpdate = true;
      }
    }
    
    // Animate floating title
    if (this.titleSprite) {
      const floatY = this.titleSprite.userData.baseY + Math.sin(this.time * 1.2 + this.titleSprite.userData.floatOffset) * 0.3;
      this.titleSprite.position.y = floatY;
    }
    
    // Animate rainbow fountain particles
    if (this.fountainParticles) {
      this.fountainParticles.forEach(p => {
        const ud = p.userData;
        ud.vy += this.fountainGravity;
        ud.x += ud.vx;
        ud.y += ud.vy;
        ud.z += ud.vz;
        p.position.set(ud.x, ud.y, ud.z);
        // Fade out as it falls back toward basin
        p.material.opacity = Math.min(1, (ud.y - this.fountainBasinY) / 4 + 0.3);
        // Reset when it falls back to basin level
        if (ud.y <= this.fountainBasinY && ud.vy < 0) {
          const resetAngle = Math.random() * Math.PI * 2;
          const s = (10 * Math.abs(this.fountainGravity) / (2 * 0.65)) * (0.85 + Math.random() * 0.3);
          ud.x = this.fountainCenter.x;
          ud.y = this.fountainSpawnY;
          ud.z = this.fountainCenter.z;
          ud.vx = Math.cos(resetAngle) * s;
          ud.vy = 0.65;
          ud.vz = Math.sin(resetAngle) * s;
          p.material.opacity = 1;
        }
      });
    }

    // Animate rainbow water fill in basin
    if (this.fountainWater && this.drawWaterCanvas) {
      this.drawWaterCanvas(this.fountainWater.canvas, this.portfolioData, this.time);
      this.fountainWater.texture.needsUpdate = true;
    }

    // Animate POV hand — natural walking bob, fades in/out smoothly
    if (this.povHand) {
      const isMoving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
      this.bobStrength += ((isMoving ? 0.3 : 0) - this.bobStrength) * 0.08;
      const t = this.time * 10;
      const bobY = Math.sin(t) * 0.11 * this.bobStrength;
      const bobX = Math.sin(t * 0.5) * 0.055 * this.bobStrength;
      const sway = Math.sin(t * 0.5) * 0.13 * this.bobStrength;
      this.povHand.position.y = this.povHandBaseY + bobY;
      this.povHand.position.x = this.povHandBaseX + bobX;

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
        this.handMixer.update(deltaTime);
      } else if (this.handRef && Object.keys(this.idlePose).length > 0) {
        // Click lerp (0=idle, 1=click)
        this._clickLerpCurrent = this._clickLerpCurrent || 0;
        this._clickLerpCurrent += (this.clickAnimLerp - this._clickLerpCurrent) * 0.15;

        // Nudge hand forward and up on click
        this.povHand.position.z = -this._clickLerpCurrent * 0.3;
        this.povHand.position.y = this.povHandBaseY + bobY + this._clickLerpCurrent * 0.15;

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

    // Render main scene
    this.renderer.render(this.scene, this.camera);

    // Render POV hand on top (no depth clear so it overlays)
    if (this.handScene && this.handCamera) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.handScene, this.handCamera);
      this.renderer.autoClear = true;
    }
  }

  pause() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume() {
    if (!this.animationId) {
      this.animate();
    }
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    this.container.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('resize', this.onWindowResize);
    if (this._returnHandler) {
      window.removeEventListener('returnToMainMuseum', this._returnHandler);
      this._returnHandler = null;
    }
    
    // Clean up bubbles with all their components
    if (this.bubbles) {
      this.bubbles.forEach(bubble => {
        // Orb
        if (bubble.orb) {
          if (bubble.orb.geometry) bubble.orb.geometry.dispose();
          if (bubble.orb.material) {
            if (bubble.orb.material.map) bubble.orb.material.map.dispose();
            bubble.orb.material.dispose();
          }
          this.scene.remove(bubble.orb);
        }
        
        // Glow ring
        if (bubble.glowRing) {
          if (bubble.glowRing.geometry) bubble.glowRing.geometry.dispose();
          if (bubble.glowRing.material) {
            if (bubble.glowRing.material.map) bubble.glowRing.material.map.dispose();
            bubble.glowRing.material.dispose();
          }
          this.scene.remove(bubble.glowRing);
        }
        
        // Light
        if (bubble.light) {
          this.scene.remove(bubble.light);
        }
        
        // Platform with particles (Group — traverse all children)
        if (bubble.platform) {
          bubble.platform.traverse(child => {
            if (child.isMesh || child.isSprite) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
              }
            }
          });
          this.scene.remove(bubble.platform);
        }
        
        // Portal particles
        if (bubble.portalParticles) {
          if (bubble.portalParticles.geometry) bubble.portalParticles.geometry.dispose();
          if (bubble.portalParticles.material) bubble.portalParticles.material.dispose();
          this.scene.remove(bubble.portalParticles);
        }
        
        // Text sprite
        if (bubble.textSprite) {
          if (bubble.textSprite.material) {
            if (bubble.textSprite.material.map) bubble.textSprite.material.map.dispose();
            bubble.textSprite.material.dispose();
          }
          this.scene.remove(bubble.textSprite);
        }
      });
      this.bubbles = [];
    }
    
    // Clean up pathways
    if (this.pathways) {
      this.pathways.forEach(pathway => {
        if (pathway.geometry) pathway.geometry.dispose();
        if (pathway.material) pathway.material.dispose();
        this.scene.remove(pathway);
      });
      this.pathways = [];
    }
    
    // Clean up edges
    if (this.edges) {
      this.edges.forEach(edge => {
        if (edge.geometry) edge.geometry.dispose();
        if (edge.material) edge.material.dispose();
        this.scene.remove(edge);
      });
      this.edges = [];
    }
    
    // Clean up entrance labels
    if (this.entranceLabels) {
      this.entranceLabels.forEach(label => {
        if (label.material) {
          if (label.material.map) label.material.map.dispose();
          label.material.dispose();
        }
        this.scene.remove(label);
      });
      this.entranceLabels = [];
    }
    
    // Clean up stars
    if (this.stars) {
      this.stars.forEach(star => {
        if (star.geometry) star.geometry.dispose();
        if (star.material) star.material.dispose();
        this.scene.remove(star);
      });
      this.stars = [];
    }
    
    // Clean up fountain particles (dispose each unique texture map)
    if (this.fountainParticles) {
      const disposedMaps = new Set();
      this.fountainParticles.forEach(p => {
        this.scene.remove(p);
        if (p.material) {
          if (p.material.map && !disposedMaps.has(p.material.map)) {
            disposedMaps.add(p.material.map);
            p.material.map.dispose();
          }
          p.material.dispose();
        }
      });
      this.fountainParticles = null;
    }

    // Clean up fountain base meshes
    if (this.fountainBase) {
      this.fountainBase.forEach(mesh => {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
          } else {
            if (mesh.material.map) mesh.material.map.dispose();
            mesh.material.dispose();
          }
        }
      });
      this.fountainBase = null;
    }

    // Clean up fountain water canvas texture
    if (this.fountainWater) {
      this.fountainWater.texture.dispose();
      this.fountainWater = null;
    }
    this.drawWaterCanvas = null;

    // Clean up floating title group (Group of layered meshes)
    if (this.titleSprite) {
      this.titleSprite.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      });
      this.scene.remove(this.titleSprite);
      this.titleSprite = null;
    }
    
    // Clean up POV hand scene
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
    this._walkLerpCurrent = 0;
    this.clickAnimLerp = 0;
    this.idleRotation = null;
    this.walkRotation = null;

    // Clean up floor meshes
    if (this.floorMeshes) {
      this.floorMeshes.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        this.scene.remove(mesh);
      });
      this.floorMeshes = null;
    }

    // Clean up floor materials (shared materials)
    if (this.floorMaterial) {
      this.floorMaterial.dispose();
      this.floorMaterial = null;
    }
    
    // Clean up lights
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
      this.ambientLight = null;
    }
    if (this.directionalLight) {
      this.scene.remove(this.directionalLight);
      this.directionalLight = null;
    }
    
    // Clean up renderer
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    
    // Clear arrays
    this.pathwayBoundaries = [];
    this.pathwayAngles = [];
    this.pathwayInfo = [];
    this.starTwinkleData = [];
    this.originalStarColors = null;
    
    // Clear scene
    if (this.scene) {
      this.scene.clear();
      this.scene = null;
    }

    // Clear Three.js loader cache so the GLTF model doesn't stay in memory
    THREE.Cache.clear();

    this.camera = null;
  }
}
