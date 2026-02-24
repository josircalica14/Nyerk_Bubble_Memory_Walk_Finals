/**
 * DetailView - Simple Three.js view with T-shaped floor
 * Shows a T-shaped floor with glowing edges in the bubble's accent color
 */

import * as THREE from 'three';

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
    
    // Camera controls
    this.cameraRotation = { x: 0, y: 0 };
    this.cameraVelocity = new THREE.Vector3();
    this.moveSpeed = 40; // Increased movement speed
    this.lookSpeed = 0.002;
    this.keys = { forward: false, backward: false, left: false, right: false };
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseDownX = 0; // Store initial mouse down position
    this.mouseDownY = 0;
    
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
    
    // Add starfield
    this.createStarfield();

    // Create camera - position at entrance inside the T-shaped floor
    this.camera = new THREE.PerspectiveCamera(
      50, // Narrower FOV for less distortion
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 30); // Spawn between entrance and first orbs
    
    // Initialize camera rotation
    this.cameraRotation.x = 0; // Look straight ahead
    this.cameraRotation.y = 0;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Add lighting for reflections
    const ambientLight = new THREE.AmbientLight(0x606060, 2.0); // Brighter ambient
    this.scene.add(ambientLight);
    
    // Add directional light from above for reflections
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(0, 30, 0);
    directionalLight.castShadow = true;
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
  createTShapedFloor(accentColor) {
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

    // Dimensions
    const mainCorridorWidth = 16;
    const mainCorridorLength = 80;
    const tBarWidth = 70;
    const tBarLength = 12;
    const tBarExtension = 0;
    const entranceExtension = 35;
    
    const entranceBackZ = 10 + entranceExtension;
    const entranceZ = 10;
    const junctionZ = -mainCorridorLength + 10;
    const tBarBackZ = junctionZ - tBarLength;

    // Create nebula texture for floor
    const nebulaTexture = this.createNebulaTexture();
    
    // Create T-shaped floor with nebula texture
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

    // Main corridor floor - from entrance to junction
    const mainFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(mainCorridorWidth, mainCorridorLength),
      floorMaterial
    );
    mainFloor.rotation.x = -Math.PI / 2;
    mainFloor.position.set(0, 0.1, (entranceZ + junctionZ) / 2);
    mainFloor.receiveShadow = true;
    this.scene.add(mainFloor);
    this.floorPieces.push(mainFloor);

    // T-bar floor - full width
    const tBarFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(tBarWidth, tBarLength),
      floorMaterial
    );
    tBarFloor.rotation.x = -Math.PI / 2;
    tBarFloor.position.set(0, 0.1, junctionZ - tBarLength / 2);
    tBarFloor.receiveShadow = true;
    this.scene.add(tBarFloor);
    this.floorPieces.push(tBarFloor);

    // Create glowing edges - ONLY ON OUTSIDE
    this.createGlowingEdges(mainCorridorWidth, mainCorridorLength, tBarWidth, tBarLength, entranceExtension, tBarExtension, entranceZ, junctionZ);

    // Add memory orbs along the walls
    this.createMemoryOrbs(mainCorridorWidth, mainCorridorLength, tBarWidth, tBarLength, entranceZ, junctionZ);

    // Add point lights at corners
    this.addCornerLights(mainCorridorWidth, mainCorridorLength, tBarWidth, tBarLength, entranceZ, junctionZ);
    
    // Add glowing entrance arc
    this.createEntranceArc(mainCorridorWidth, entranceZ);
    
    // Exit door removed - orb 27 placed in that position instead
    // this.createExitDoorAndTitle(mainCorridorWidth, mainCorridorLength, tBarWidth, tBarLength, junctionZ);
    
    // Add floating title at T-junction
    const bubbleName = this.portfolioData?.title || 'Memory';
    const titleText = `${bubbleName}'s Memory Hall`;
    this.createFloatingTitle(titleText, 0, 25, junctionZ - tBarLength - 4 + 10, this.originalAccentColor);
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
   * Create glowing edges for the T-shaped floor with orb-style glow
   */
  createGlowingEdges(mainWidth, mainLength, tBarWidth, tBarLength, entranceExtension, tBarExtension, entranceZ, junctionZ) {
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
    const tBarHalfWidth = tBarWidth / 2;
    const tBarFrontZ = junctionZ;
    const tBarBackZ = junctionZ - tBarLength;
    const tBarExtendedBackZ = tBarBackZ - tBarExtension; // Extended back edge

    // Helper function to create edge with orb-style glow
    const createLightsaberEdge = (length, position, rotation) => {
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

      // Outer glow
      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(glowRadius, glowRadius, length, 16),
        glowMaterial.clone()
      );
      glow.position.copy(position);
      if (rotation.x) glow.rotation.x = rotation.x;
      if (rotation.z) glow.rotation.z = rotation.z;
      this.scene.add(glow);
      this.edges.push(glow);

      // Softer point light matching orb intensity
      const light = new THREE.PointLight(this.accentColor, 1.8, 10);
      light.position.copy(position);
      this.scene.add(light);
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

    // === T-BAR EDGES (extended width) ===
    createLightsaberEdge(
      tBarLength,
      new THREE.Vector3(-tBarHalfWidth - coreRadius, edgeY, (tBarFrontZ + tBarBackZ) / 2),
      { x: Math.PI / 2 }
    );
    
    createLightsaberEdge(
      tBarLength,
      new THREE.Vector3(tBarHalfWidth + coreRadius, edgeY, (tBarFrontZ + tBarBackZ) / 2),
      { x: Math.PI / 2 }
    );
    
    createLightsaberEdge(
      tBarWidth + coreRadius * 2,
      new THREE.Vector3(0, edgeY, tBarBackZ - coreRadius),
      { z: Math.PI / 2 }
    );

    // === T-BAR FRONT EDGES ===
    const leftExtensionWidth = tBarHalfWidth - mainHalfWidth;
    
    createLightsaberEdge(
      leftExtensionWidth,
      new THREE.Vector3(-mainHalfWidth - leftExtensionWidth / 2 - coreRadius * 2, edgeY, tBarFrontZ + coreRadius),
      { z: Math.PI / 2 }
    );
    
    createLightsaberEdge(
      leftExtensionWidth,
      new THREE.Vector3(mainHalfWidth + leftExtensionWidth / 2 + coreRadius * 2, edgeY, tBarFrontZ + coreRadius),
      { z: Math.PI / 2 }
    );
  }

  /**
   * Create floating memory orbs along the walls with main museum glassmorphism style
   */
  createMemoryOrbs(mainWidth, mainLength, tBarWidth, tBarLength, entranceZ, junctionZ) {
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

    const orbRadius = 2.5; // Medium size
    const orbHeight = 4.5; // Raised higher

    // Amber yellow color for all orbs
    const colors = [
      { hex: 0xF79C00, rgb: [247, 156, 0] } // Amber yellow
    ];

    const mainHalfWidth = mainWidth / 2;
    const tBarHalfWidth = tBarWidth / 2;
    const tBarBackZ = junctionZ - tBarLength;
    const tBarCenterZ = junctionZ - tBarLength / 2;
    
    // Get portfolio images if available
    const folder = this.portfolioData?.folder || null;
    const cardTitles = this.portfolioData?.cardTitles || {};
    const cardKeys = [
      'overview', 'gallery', 'technologies', 'details', 'links', 'contact',
      'placeholder1', 'placeholder2', 'placeholder3', 'placeholder4', 'placeholder5', 'placeholder6',
      'placeholder7', 'placeholder8', 'placeholder9', 'placeholder10', 'placeholder11', 'placeholder12',
      'placeholder13', 'placeholder14', 'placeholder15', 'placeholder16', 'placeholder17', 'placeholder18',
      'placeholder19', 'placeholder20', 'placeholder21'
    ];

    let orbIndex = 0;
    let lastColorIndex = -1; // Track last color used to avoid repetition

    // Helper to create glassmorphism orb with portfolio image
    const createOrb = (x, y, z, rotationY) => {
      // Select a color different from the last one
      let colorIndex;
      do {
        colorIndex = Math.floor(Math.random() * colors.length);
      } while (colorIndex === lastColorIndex && colors.length > 1);
      
      lastColorIndex = colorIndex;
      const colorData = colors[colorIndex];
      const currentOrbIndex = orbIndex++;
      
      // Get media path for this orb (try video first, then image)
      const cardKey = cardKeys[currentOrbIndex] || `placeholder${currentOrbIndex + 1}`;
      const videoPath = folder ? `assets/portfolios/${folder}/${cardKey}/1.mp4` : null;
      const imagePath = folder ? `assets/portfolios/${folder}/${cardKey}/1.jpg` : null;
      
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
        
        // Add inner border - darker gold for visible outline inside the circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Draw inner border by stroking a slightly smaller circle
        ctx.beginPath();
        ctx.arc(256, 256, 251, 0, Math.PI * 2); // Smaller radius for inner border
        ctx.strokeStyle = 'rgba(247, 140, 0, 1)'; // Amber yellow, fully opaque
        ctx.lineWidth = 10; // Thicker to ensure visibility inside
        ctx.stroke();
        ctx.restore();
        
        texture.needsUpdate = true;
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
        
        videoElement.addEventListener('error', () => {
          console.log('Video not found, using image fallback:', videoPath);
          videoElement = null;
          hasVideo = false;
        });
        
        videoElement.load();
      }
      
      // Load image (will be used if video doesn't exist or fails)
      if (imagePath) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Only draw image if we don't have video
          if (!hasVideo) {
            drawMediaToCanvas(img);
          }
        };
        img.onerror = () => {
          console.log('Failed to load image:', imagePath);
          // Draw fallback colored orb
          drawFallbackOrb(ctx, colorData);
          texture.needsUpdate = true;
        };
        img.src = imagePath;
      } else if (!videoPath) {
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
      const textSprite = this.createTextSprite(caption, colorData, rotationY);
      
      // Position text forward from the orb (toward viewer)
      const forwardOffset = 2.0; // Move 2 units forward
      const textX = x + Math.sin(rotationY) * forwardOffset;
      const textZ = z + Math.cos(rotationY) * forwardOffset;
      textSprite.position.set(textX, y - orbRadius - 1.0, textZ);
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
        cardKey: cardKey,
        caption: caption
      });
    };

    // Main corridor - Left wall (Orbs 1, 3, 5, 7, 9, 11) - equal spacing throughout
    const leftX = -mainHalfWidth - 4.5; // Same distance as right wall
    createOrb(leftX, orbHeight, 2, Math.PI / 2);    // Orb 1 (start)
    createOrb(leftX, orbHeight, -10, Math.PI / 2);  // Orb 3 (12 units)
    createOrb(leftX, orbHeight, -22, Math.PI / 2);  // Orb 5 (12 units)
    createOrb(leftX, orbHeight, -34, Math.PI / 2);  // Orb 7 (12 units)
    createOrb(leftX, orbHeight, -46, Math.PI / 2);  // Orb 9 (12 units)
    createOrb(leftX, orbHeight, -56, Math.PI / 2);  // Orb 11 (10 units, then 12 to corner at -68)

    // Main corridor - Right wall (Orbs 2, 4, 6, 8, 10, 12) - equal spacing throughout
    const rightX = mainHalfWidth + 4.5; // Moved further from wall
    createOrb(rightX, orbHeight, 2, -Math.PI / 2);    // Orb 2 (start)
    createOrb(rightX, orbHeight, -10, -Math.PI / 2);  // Orb 4 (12 units)
    createOrb(rightX, orbHeight, -22, -Math.PI / 2);  // Orb 6 (12 units)
    createOrb(rightX, orbHeight, -34, -Math.PI / 2);  // Orb 8 (12 units)
    createOrb(rightX, orbHeight, -46, -Math.PI / 2);  // Orb 10 (12 units)
    createOrb(rightX, orbHeight, -56, -Math.PI / 2);  // Orb 12 (10 units, then 12 to corner at -68)

    // T-bar dimensions for proper outside positioning
    // Main corridor ends at Z=-70 (junctionZ), T-bar extends from Z=-70 to Z=-82
    const tBarLeftX = -tBarHalfWidth - 4.5;   // Moved further from wall
    const tBarRightX = tBarHalfWidth + 4.5;   // Moved further from wall
    const tBarBackWallZ = tBarBackZ - 4.5;    // Moved further from wall
    const tBarMiddleZ = (junctionZ + tBarBackZ) / 2;  // -76 (middle of T-bar)

    // LEFT INNER CORNER (Orbs 13, 14, 15) - moved inward for spacing
    createOrb(leftX, orbHeight, -65, Math.PI / 2);  // Orb 13 - aligned with left wall orbs, more space from corner
    createOrb(-22, orbHeight, -65, Math.PI);        // Orb 14 - face toward back wall
    createOrb(-30, orbHeight, -65, Math.PI);        // Orb 15 - face toward back wall

    // LEFT SIDE WALL END (Orb 16) - revert to side facing
    createOrb(tBarLeftX, orbHeight, tBarMiddleZ, Math.PI / 2);   // Orb 16 - face side wall

    // BACK WALL CENTER (Orbs 17, 18, 19, 20, 21, 22, 27) - facing forward into hallway
    createOrb(-30, orbHeight, tBarBackWallZ, 0);   // Orb 17 - face forward
    createOrb(-18, orbHeight, tBarBackWallZ, 0);   // Orb 18 - face forward
    createOrb(-8, orbHeight, tBarBackWallZ, 0);    // Orb 19 - face forward
    createOrb(0, orbHeight, tBarBackWallZ, 0);     // Orb 27 - face forward (CENTER)
    createOrb(8, orbHeight, tBarBackWallZ, 0);     // Orb 20 - face forward
    createOrb(18, orbHeight, tBarBackWallZ, 0);    // Orb 21 - face forward
    createOrb(30, orbHeight, tBarBackWallZ, 0);    // Orb 22 - face forward

    // RIGHT INNER CORNER (Orbs 23, 24, 25) - moved inward for spacing
    createOrb(rightX, orbHeight, -65, -Math.PI / 2);  // Orb 23 - aligned with right wall orbs, more space from corner
    createOrb(22, orbHeight, -65, Math.PI);         // Orb 24 - face toward back wall
    createOrb(30, orbHeight, -65, Math.PI);         // Orb 25 - face toward back wall

    // RIGHT SIDE WALL END (Orb 26) - revert to side facing
    createOrb(tBarRightX, orbHeight, tBarMiddleZ, -Math.PI / 2);  // Orb 26 - face side wall
  }

  /**
   * Add corner lights
   */
  addCornerLights(mainWidth, mainLength, tBarWidth, tBarLength, entranceZ, junctionZ) {
    const mainHalfWidth = mainWidth / 2;
    const mainStart = entranceZ;
    const mainEnd = junctionZ;
    const tBarHalfWidth = tBarWidth / 2;
    const tBarZ = mainEnd + tBarLength / 2;
    const tBarHalfLength = tBarLength / 2;

    const corners = [
      // Entrance corners
      { x: -mainHalfWidth, z: mainStart },
      { x: mainHalfWidth, z: mainStart },
      // T-bar outer corners
      { x: -tBarHalfWidth, z: tBarZ - tBarHalfLength },
      { x: tBarHalfWidth, z: tBarZ - tBarHalfLength }
    ];

    corners.forEach(corner => {
      const light = new THREE.PointLight(this.accentColor, 2.5, 15);
      light.position.set(corner.x, 2, corner.z);
      this.scene.add(light);
    });
  }

  /**
   * Create text sprite for orb captions
   */
  createTextSprite(text, colorData, rotationY) {
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
      depthTest: true
    });
    
    // Calculate plane width based on canvas aspect ratio
    const planeHeight = 1;
    const planeWidth = (canvas.width / canvas.height) * planeHeight;
    
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Rotate to face the hallway (toward center)
    mesh.rotation.y = rotationY;
    
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
    const particleCount = 50;
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
    const particleCount = 30;
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
   * Create starfield background
   */
  createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    // Create stars scattered in a large sphere around the scene
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      
      // Random position in a large sphere
      const radius = 200 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
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
      
      // Random sizes
      sizes[i] = Math.random() * 2 + 0.5;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
    this.stars = stars;
    
    // Store twinkle data for animation
    this.starTwinkleData = [];
    for (let i = 0; i < starCount; i++) {
      this.starTwinkleData.push({
        baseOpacity: 0.5 + Math.random() * 0.5,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
    
    // Add glowing half moon
    this.createMoon();
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
    
    // Draw glowing text effect with larger font
    ctx.font = 'bold 140px Arial';
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
    
    // Create 3D depth effect by layering multiple planes
    const textWidth = 70; // Increased from 50
    const textHeight = 16; // Increased from 12
    const depthLayers = 8; // Number of layers for 3D effect
    const layerSpacing = 0.15; // Space between layers
    
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
   * Show the detail view
   */
  show(accentColor, portfolioData = null) {
    console.log('DetailView.show called with:', accentColor, portfolioData);
    
    if (!this.container) {
      this.init();
    }

    // Clean up previous content before creating new
    this.cleanupSceneContent();

    // Reset camera position and rotation
    this.camera.position.set(0, 5, 30); // Spawn between entrance and first orbs
    this.cameraRotation.x = 0; // Look straight ahead, not down
    this.cameraRotation.y = 0;
    this.cameraVelocity.set(0, 0, 0);
    
    // Reset movement keys
    this.keys = { forward: false, backward: false, left: false, right: false };

    this.portfolioData = portfolioData;
    this.createTShapedFloor(accentColor);
    this.container.style.display = 'block';
    this.isActive = true;
    
    // Add back button
    this.createBackButton();
    
    // Add controls
    this.addControls();
    
    // Show welcome text
    this.showWelcomeText();
    
    this.animate();
    
    console.log('DetailView shown successfully');
  }

  /**
   * Show flashing welcome text when entering memory hall
   */
  showWelcomeText() {
    // Use original accent color (not the darker floor color)
    const accentColorHex = this.originalAccentColor ? this.originalAccentColor.getHexString() : 'FFD700';
    const r = parseInt(accentColorHex.slice(0, 2), 16);
    const g = parseInt(accentColorHex.slice(2, 4), 16);
    const b = parseInt(accentColorHex.slice(4, 6), 16);
    
    // Create dark overlay to focus attention
    const darkOverlay = document.createElement('div');
    darkOverlay.id = 'welcome-dark-overlay';
    darkOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 249;
      pointer-events: none;
      animation: fadeOverlay 3s ease-in-out;
    `;
    
    // Create welcome container with blurred background (no border)
    const welcomeContainer = document.createElement('div');
    welcomeContainer.id = 'welcome-container';
    welcomeContainer.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 250;
      text-align: center;
      pointer-events: none;
      animation: scaleContainer 3s ease-in-out;
    `;
    
    // Create welcome text
    const welcomeText = document.createElement('div');
    const portfolioName = this.portfolioData?.title || 'Memory';
    welcomeText.textContent = `Welcome to ${portfolioName}'s Memory Hall!`;
    welcomeText.style.cssText = `
      font-size: 3rem;
      font-weight: bold;
      color: white;
      text-shadow: 
        0 0 20px rgba(${r}, ${g}, ${b}, 1),
        0 0 40px rgba(${r}, ${g}, ${b}, 0.8),
        0 0 60px rgba(${r}, ${g}, ${b}, 0.6),
        2px 2px 4px rgba(0, 0, 0, 0.8);
      animation: flashWelcome 3s ease-in-out;
      white-space: nowrap;
    `;
    
    welcomeContainer.appendChild(welcomeText);
    this.container.appendChild(darkOverlay);
    this.container.appendChild(welcomeContainer);
    
    // Add CSS animations
    if (!document.querySelector('#welcome-animation-style')) {
      const style = document.createElement('style');
      style.id = 'welcome-animation-style';
      style.textContent = `
        @keyframes fadeOverlay {
          0% {
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        
        @keyframes scaleContainer {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          70% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes flashWelcome {
          0% {
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Remove welcome elements after animation (3 seconds)
    setTimeout(() => {
      if (darkOverlay && darkOverlay.parentNode) {
        darkOverlay.remove();
      }
      if (welcomeContainer && welcomeContainer.parentNode) {
        welcomeContainer.remove();
      }
    }, 3000);
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
      if (this.floor.material) this.floor.material.dispose();
      this.floor = null;
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
        this.showOrbContent(orbIndex);
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
    
    // Create image cards (27 cards total - 6 main + 21 placeholders)
    const cardKeys = [
      'overview', 'gallery', 'technologies', 'details', 'links', 'contact',
      'placeholder1', 'placeholder2', 'placeholder3', 'placeholder4', 'placeholder5', 'placeholder6',
      'placeholder7', 'placeholder8', 'placeholder9', 'placeholder10', 'placeholder11', 'placeholder12',
      'placeholder13', 'placeholder14', 'placeholder15', 'placeholder16', 'placeholder17', 'placeholder18',
      'placeholder19', 'placeholder20', 'placeholder21'
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
    this.tryLoadMedia(possiblePaths, caption);
  }
  
  /**
   * Try loading media from multiple possible paths
   */
  tryLoadMedia(paths, caption, index = 0) {
    if (index >= paths.length) {
      console.log('No media found, showing fallback');
      this.showImageCard(null, caption);
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
        this.showImageCard(path, caption);
      };
      
      video.onerror = () => {
        console.log('Video failed to load, trying next:', path);
        this.tryLoadMedia(paths, caption, index + 1);
      };
      
      video.src = path;
    } else {
      // Try loading image
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully:', path);
        this.showImageCard(path, caption);
      };
      img.onerror = () => {
        console.log('Image failed to load:', path);
        this.tryLoadMedia(paths, caption, index + 1);
      };
      img.src = path;
    }
  }
  
  /**
   * Show image card with glassmorphism styling themed like gold orbs
   */
  showImageCard(imagePath, caption) {
    // Remove existing card
    const existingCard = this.container.querySelector('.memory-card');
    if (existingCard) existingCard.remove();
    
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: auto;
      max-width: 90vw;
      max-height: 90vh;
      background: rgba(20, 15, 5, 0.95);
      backdrop-filter: blur(20px);
      border: 3px solid rgba(255, 215, 0, 0.6);
      border-radius: 20px;
      padding: 2rem;
      z-index: 300;
      box-shadow: 0 0 40px rgba(255, 215, 0, 0.4), 0 20px 60px rgba(0, 0, 0, 0.7);
      animation: cardFadeIn 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    
    const captionEl = document.createElement('h3');
    captionEl.textContent = caption;
    captionEl.style.cssText = `
      color: #FFD700;
      font-size: 1.8rem;
      margin: 0 0 1.5rem 0;
      text-align: center;
      text-shadow: 0 0 15px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.4);
      font-weight: bold;
    `;
    card.appendChild(captionEl);
    
    // Check if this is a video or image path
    const isVideo = imagePath && imagePath.endsWith('.mp4');
    
    // Add media if path is provided
    if (imagePath) {
      if (isVideo) {
        // Create video element
        const video = document.createElement('video');
        video.src = imagePath;
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.muted = false;
        video.style.cssText = `
          max-width: 80vw;
          max-height: 65vh;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 12px;
          margin-bottom: 1rem;
          border: 2px solid rgba(255, 215, 0, 0.3);
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
        `;
        
        video.onerror = () => {
          console.log('Video failed to load, trying image:', imagePath);
          // Try image fallback
          const imgPath = imagePath.replace('.mp4', '.jpg');
          const img = document.createElement('img');
          img.src = imgPath;
          img.alt = caption;
          img.style.cssText = video.style.cssText;
          img.onerror = () => {
            // Show placeholder if both fail
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
              width: 400px;
              height: 300px;
              background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 180, 0, 0.15));
              border-radius: 12px;
              margin-bottom: 1rem;
              display: flex;
              align-items: center;
              justify-content: center;
              color: rgba(255, 215, 0, 0.5);
              font-size: 1rem;
              border: 2px solid rgba(255, 215, 0, 0.2);
            `;
            placeholder.textContent = 'Empty Memory';
            img.parentNode.replaceChild(placeholder, img);
          };
          video.parentNode.replaceChild(img, video);
        };
        
        card.appendChild(video);
      } else {
        // Create image element
        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = caption;
        img.style.cssText = `
          max-width: 80vw;
          max-height: 65vh;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 12px;
          margin-bottom: 1rem;
          border: 2px solid rgba(255, 215, 0, 0.3);
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
        `;
        
        img.onerror = () => {
          console.log('Image failed to load:', imagePath);
          // Show placeholder
          const placeholder = document.createElement('div');
          placeholder.style.cssText = `
            width: 400px;
            height: 300px;
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 180, 0, 0.15));
            border-radius: 12px;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 215, 0, 0.5);
            font-size: 1rem;
            border: 2px solid rgba(255, 215, 0, 0.2);
          `;
          placeholder.textContent = 'Empty Memory';
          img.parentNode.replaceChild(placeholder, img);
        };
        
        card.appendChild(img);
      }
    } else {
      // Fallback for missing media
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        width: 400px;
        height: 300px;
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 180, 0, 0.15));
        border-radius: 12px;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 215, 0, 0.5);
        font-size: 1rem;
        border: 2px solid rgba(255, 215, 0, 0.2);
      `;
      placeholder.textContent = 'Empty Memory';
      card.appendChild(placeholder);
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      width: 100%;
      max-width: 400px;
      padding: 0.75rem;
      background: rgba(255, 215, 0, 0.15);
      border: 2px solid rgba(255, 215, 0, 0.5);
      border-radius: 10px;
      color: #FFD700;
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    `;
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 215, 0, 0.3)';
      closeBtn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.4)';
      closeBtn.style.transform = 'scale(1.05)';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 215, 0, 0.15)';
      closeBtn.style.boxShadow = 'none';
      closeBtn.style.transform = 'scale(1)';
    });
    
    closeBtn.addEventListener('click', () => {
      // Stop video if playing
      const video = card.querySelector('video');
      if (video) {
        video.pause();
      }
      card.remove();
    });
    
    card.appendChild(closeBtn);
    this.container.appendChild(card);
    
    // Add animation keyframes if not exists
    if (!document.querySelector('#memory-card-animation')) {
      const style = document.createElement('style');
      style.id = 'memory-card-animation';
      style.textContent = `
        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
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
      // Find which orb was clicked
      const clickedMesh = intersects[0].object;
      const clickedOrb = this.orbs.find(orb => orb.mesh === clickedMesh);
      
      if (clickedOrb) {
        this.showMediaModal(clickedOrb);
      }
    }
  }
  
  /**
   * Show media modal with full image/video
   */
  showMediaModal(orb) {
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
    
    // Create content container
    const content = document.createElement('div');
    content.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    `;
    
    // Create media element (video or image)
    let mediaElement;
    const folder = this.portfolioData?.folder;
    const videoPath = folder ? `assets/portfolios/${folder}/${orb.cardKey}/1.mp4` : null;
    const imagePath = folder ? `assets/portfolios/${folder}/${orb.cardKey}/1.jpg` : null;
    
    // Try video first, then fallback to image
    const tryVideo = videoPath && orb.videoElement;
    
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
        box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
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
    } else if (imagePath) {
      // Show image
      mediaElement = document.createElement('img');
      mediaElement.src = imagePath;
      mediaElement.style.cssText = `
        max-width: 85vw;
        max-height: 75vh;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 10px;
        box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
        background: rgba(0, 0, 0, 0.5);
      `;
      
      // Show error if image fails
      mediaElement.onerror = () => {
        console.log('Image failed to load:', imagePath);
        mediaElement.alt = 'Empty Memory';
        mediaElement.style.display = 'none';
        const errorMsg = document.createElement('div');
        errorMsg.textContent = 'Empty Memory';
        errorMsg.style.cssText = `
          color: rgba(255, 255, 255, 0.5);
          font-size: 1.5rem;
          padding: 40px;
        `;
        mediaElement.parentNode.appendChild(errorMsg);
      };
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
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
    `;
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: -60px;
      right: 0;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 215, 0, 0.5);
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
      closeBtn.style.background = 'rgba(255, 215, 0, 0.3)';
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
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        // Stop video if playing
        if (mediaElement.tagName === 'VIDEO') {
          mediaElement.pause();
        }
        document.body.removeChild(modal);
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
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Assemble modal
    content.appendChild(closeBtn);
    content.appendChild(caption);
    content.appendChild(mediaElement);
    modal.appendChild(content);
    document.body.appendChild(modal);
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
    this.mouseDownX = event.clientX; // Store initial position
    this.mouseDownY = event.clientY;
    this.container.style.cursor = 'grabbing';
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event) {
    if (!this.isMouseDown) return;

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
   * Check if a position is within the T-shaped floor boundaries
   */
  isInsideTShapedFloor(x, z, mainWidth, mainLength, tBarWidth, tBarLength, entranceExtension = 35) {
    const mainHalfWidth = mainWidth / 2;
    const entranceBackZ = 10 + entranceExtension;
    const entranceZ = 10;
    const junctionZ = -mainLength + 10;
    const tBarHalfWidth = tBarWidth / 2;
    const tBarBackZ = junctionZ - tBarLength;

    // Check if in entrance extension
    if (z >= entranceZ && z <= entranceBackZ) {
      if (x >= -mainHalfWidth && x <= mainHalfWidth) {
        return true;
      }
    }

    // Check if in main corridor
    if (z >= junctionZ && z <= entranceZ) {
      if (x >= -mainHalfWidth && x <= mainHalfWidth) {
        return true;
      }
    }

    // Check if in T-bar
    if (z >= tBarBackZ && z <= junctionZ) {
      if (x >= -tBarHalfWidth && x <= tBarHalfWidth) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update camera based on controls
   */
  updateCamera(deltaTime) {
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

    // T-shaped floor dimensions (must match createTShapedFloor)
    const mainCorridorWidth = 16;
    const mainCorridorLength = 80;
    const tBarWidth = 60;
    const tBarLength = 12;
    const margin = 0.5; // Small margin from edges

    // Check if new position is inside T-shaped floor
    if (this.isInsideTShapedFloor(newX, newZ, mainCorridorWidth - margin * 2, mainCorridorLength, tBarWidth - margin * 2, tBarLength)) {
      // Valid position - update camera
      this.camera.position.x = newX;
      this.camera.position.z = newZ;
    } else {
      // Hit boundary - try sliding along walls
      // Try X movement only
      if (this.isInsideTShapedFloor(newX, prevZ, mainCorridorWidth - margin * 2, mainCorridorLength, tBarWidth - margin * 2, tBarLength)) {
        this.camera.position.x = newX;
        this.cameraVelocity.z = 0; // Stop Z velocity
      }
      // Try Z movement only
      else if (this.isInsideTShapedFloor(prevX, newZ, mainCorridorWidth - margin * 2, mainCorridorLength, tBarWidth - margin * 2, tBarLength)) {
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
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Remove controls
    this.removeControls();
    
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Animation loop
   */
  animate() {
    if (!this.isActive) return;

    this.animationFrameId = requestAnimationFrame(this.animate);
    
    const deltaTime = 0.016; // ~60fps
    this.time += deltaTime;

    // Update camera controls
    this.updateCamera(deltaTime);

    // Animate edge glow (skip door edges - they should be static)
    this.edges.forEach((edge, index) => {
      // Skip animation for door edges (they have additive blending)
      if (edge.material.blending === THREE.AdditiveBlending && edge.material.opacity > 0.8) {
        return; // Skip door edge frames
      }
      const offset = index * 0.5;
      const intensity = 0.7 + Math.sin(this.time * 2 + offset) * 0.3;
      edge.material.opacity = intensity;
    });

    // Animate memory orbs with main museum floating motion
    this.orbs.forEach((orb, index) => {
      const offset = index * 0.3;
      // Gentle floating motion matching main museum (translateY(-20px) at 50%)
      const floatY = orb.baseY + Math.sin(this.time * 1.5 + offset) * 0.4;
      orb.mesh.position.y = floatY;
      orb.glowRing.position.y = floatY;
      orb.light.position.y = floatY;
      // Sprites automatically face camera, no need for lookAt
      
      // Update video frame if present
      if (orb.videoElement && orb.videoElement.readyState >= orb.videoElement.HAVE_CURRENT_DATA) {
        // Draw current video frame to canvas with effects
        const canvas = orb.texture.image;
        const ctx = canvas.getContext('2d');
        
        // Calculate dimensions
        const sourceAspect = orb.videoElement.videoWidth / orb.videoElement.videoHeight;
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
        
        // Clear and redraw with effects
        ctx.clearRect(0, 0, 512, 512);
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(orb.videoElement, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
        
        // Apply effects (overlay, vignette, highlight) - use orb's actual color
        const colorData = { rgb: [247, 156, 0] }; // Amber yellow matching orb color
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = `rgba(${colorData.rgb[0]}, ${colorData.rgb[1]}, ${colorData.rgb[2]}, 0.35)`;
        ctx.fillRect(0, 0, 512, 512);
        ctx.restore();
        
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
        
        orb.texture.needsUpdate = true;
      }
      
      // Animate platform particles
      if (orb.platform && orb.platform.userData.particles) {
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

    // Animate floating title
    if (this.titleSprite) {
      const floatY = this.titleSprite.baseY + Math.sin(this.time * 1.2 + this.titleSprite.floatOffset) * 0.3;
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

    // Animate twinkling stars - more noticeable
    if (this.stars && this.starTwinkleData) {
      const colors = this.stars.geometry.attributes.color.array;
      this.starTwinkleData.forEach((data, i) => {
        // Larger variation: from 0.2 to 1.2 (60% variation instead of 30%)
        const twinkle = Math.sin(this.time * data.twinkleSpeed + data.twinkleOffset) * 0.5 + 0.7;
        const brightness = data.baseOpacity * twinkle;
        const i3 = i * 3;
        colors[i3] = brightness;
        colors[i3 + 1] = brightness;
        colors[i3 + 2] = brightness;
      });
      this.stars.geometry.attributes.color.needsUpdate = true;
    }

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

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handle window resize
   */
  onResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
        }
        
        // Dispose resources
        if (orb.mesh.geometry) orb.mesh.geometry.dispose();
        if (orb.mesh.material) orb.mesh.material.dispose();
        if (orb.texture) orb.texture.dispose();
        
        if (orb.glowRing) {
          if (orb.glowRing.geometry) orb.glowRing.geometry.dispose();
          if (orb.glowRing.material) orb.glowRing.material.dispose();
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
    
    // Cleanup stars
    if (this.stars) {
      this.scene.remove(this.stars);
      if (this.stars.geometry) this.stars.geometry.dispose();
      if (this.stars.material) this.stars.material.dispose();
      this.stars = null;
    }
    
    // Cleanup moon
    if (this.moon) {
      this.scene.remove(this.moon);
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
    
    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
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
    
    this.camera = null;
    this.isActive = false;
  }
}
