/**
 * DetailView Class
 * Manages the 3D wall portfolio detail page with 360° room view
 */
class DetailView {
  constructor(audioManager = null) {
    // Get references to elements
    this.detailView = document.getElementById('detail-view');
    this.backBtn = document.getElementById('back-btn');
    this.detailTitle = this.detailView.querySelector('.detail-title');
    this.detailContainer = this.detailView.querySelector('.detail-container');
    this.wallGrid = this.detailView.querySelector('.wall-grid');
    
    // Track state
    this.isOpen = false;
    this.currentData = null;
    
    // Initialize orb modal with audio manager
    this.orbModal = new OrbModal(audioManager);
    this.audioManager = audioManager;
    
    // FPS Camera state - start at entrance of hallway
    this.rotation = { x: 0, y: 0 }; // Looking straight down the hallway
    this.targetRotation = { x: 0, y: 0 };
    
    // Camera position for FPS movement (start at entrance)
    this.position = { x: 0, y: 0, z: 600 }; // Start 600px back from first cards
    this.targetPosition = { x: 0, y: 0, z: 600 };
    this.moveSpeed = 8; // Faster movement for hallway
    
    // Hallway boundaries - extended to accommodate exit door at -3400px
    this.hallwayLength = 3600; // Length to exit door at -3400px
    this.hallwayWidth = 700; // Width boundaries (left/right) - wider hallway to accommodate orbs at ±650px
    this.hallwayForwardLimit = 600; // Forward boundary (entrance)
    
    // Movement state
    this.keys = { w: false, a: false, s: false, d: false };
    
    // Mouse look
    this.isDragging = false;
    this.lastMousePos = null;
    this.mouseSensitivity = 0.3;
    this.animationFrameId = null;
    
    // Vertical look limits
    this.MIN_PITCH = -60; // Look down limit
    this.MAX_PITCH = 60;  // Look up limit
    
    // Bind methods
    this.hide = this.hide.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.updateCamera = this.updateCamera.bind(this);
    
    // Set up event listeners
    this.backBtn.addEventListener('click', this.hide);
    
    // Add exit door click listener with white fade transition
    const exitDoor = this.detailView.querySelector('.exit-door');
    if (exitDoor) {
      exitDoor.addEventListener('click', () => {
        // Show white fade overlay
        const whiteFade = document.querySelector('.white-fade-overlay');
        if (whiteFade) {
          whiteFade.classList.add('active');
          
          // Hide detail view after fade starts
          setTimeout(() => {
            this.hide();
            
            // Remove white fade after detail view is hidden
            setTimeout(() => {
              whiteFade.classList.remove('active');
            }, 400);
          }, 400);
        } else {
          // Fallback if overlay doesn't exist
          this.hide();
        }
      });
    }
    
    // Add click listeners to orbs
    this.setupOrbClickListeners();
  }
  
  /**
   * Setup click listeners for memory orbs
   */
  setupOrbClickListeners() {
    const orbs = this.wallGrid.querySelectorAll('.wall-box:not(.title-card)');
    
    orbs.forEach(orb => {
      orb.style.cursor = 'pointer';
      orb.addEventListener('click', (e) => {
        // Prevent if clicking during camera movement
        if (this.isDragging) return;
        
        const cardType = orb.getAttribute('data-card');
        const title = orb.querySelector('h3')?.textContent || 'Memory Orb';
        const imagesContainer = orb.querySelector('.card-images');
        
        if (imagesContainer) {
          // Get all images and videos from the orb
          const mediaElements = Array.from(imagesContainer.querySelectorAll('img, video'));
          
          if (mediaElements.length > 0) {
            this.orbModal.open(title, mediaElements);
          } else {
            console.log('No media found in orb:', cardType);
          }
        }
      });
    });
  }
  
  /**
   * Show the detail view with portfolio data
   * @param {Object} data - Portfolio item data
   */
  show(data) {
    if (!data) return;
    
    this.currentData = data;
    
    // Update title card with portfolio name
    const portfolioTitle = document.getElementById('portfolio-title');
    if (portfolioTitle) {
      portfolioTitle.textContent = `${data.title}'s Memory Hall`;
    }
    
    // Update card titles if custom titles are provided
    if (data.cardTitles) {
      const cards = this.wallGrid.querySelectorAll('.wall-box');
      cards.forEach(card => {
        const cardType = card.getAttribute('data-card');
        const h3 = card.querySelector('h3');
        if (h3 && data.cardTitles[cardType]) {
          h3.textContent = data.cardTitles[cardType];
        }
      });
    }
    
    // Apply color theme based on portfolio color
    this.applyColorTheme(data.color, data);
    
    // Reset to default starting position for all portfolios
    this.position = { x: 0, y: 0, z: 600 };
    this.targetPosition = { x: 0, y: 0, z: 600 };
    // Reset to default hallway length (extended for exit door)
    this.hallwayLength = 3600;
    this.hallwayForwardLimit = 600;
    
    // Load images from portfolio folder
    this.loadPortfolioImages(data);
    
    // Show detail view
    this.detailView.classList.add('active');
    this.detailView.setAttribute('aria-hidden', 'false');
    
    // Create floating orbs for detail view
    this.createFloatingOrbs();
    
    // Create glowing floor circles
    this.createFloorCircles();
    
    // Set state
    this.isOpen = true;
    
    // Add keyboard listener for ESC and WASD
    document.addEventListener('keydown', this.handleKeyPress);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    
    // Add drag controls for mouse look
    this.detailView.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    
    // Start animation loop
    this.startAnimation();
    
    console.log('Detail view opened for:', data.title, '- Use WASD to move, mouse to look around');
  }
  
  /**
   * Apply color theme to detail view based on portfolio color
   * @param {string} color - Hex color code
   * @param {Object} data - Portfolio item data
   */
  applyColorTheme(color, data) {
    if (!color) return;
    
    // Convert hex to RGB for alpha variations
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const rgb = hexToRgb(color);
    if (!rgb) return;
    
    // Remove any existing particle background
    const existingBg = this.detailView.querySelector('.detail-particle-background');
    if (existingBg) existingBg.remove();
    
    // Create particle background container for shooting star images only
    const particleBg = document.createElement('div');
    particleBg.className = 'detail-particle-background';
    particleBg.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    `;
    
    // Add flying PNG images from portfolio background folder with shooting star effect
    const folder = data.folder || data.id;
    const backgroundPath = `assets/portfolios/${folder}/background/`;
    
    // First, collect available images
    const availableImages = [];
    const maxImagesToCheck = 10;
    
    // Create a promise-based image loader to check which images exist
    const checkImage = (path) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(path);
        img.onerror = () => resolve(null);
        img.src = path;
      });
    };
    
    // Load available images and create 8-10 shooting stars
    const numShootingStars = Math.floor(Math.random() * 3) + 8; // 8-10 shooting stars
    
    // Check which images exist (1.png through 10.png)
    Promise.all(
      Array.from({ length: maxImagesToCheck }, (_, i) => 
        checkImage(`${backgroundPath}${i + 1}.png`)
      )
    ).then(results => {
      const validImages = results.filter(path => path !== null);
      
      // If no images found, skip
      if (validImages.length === 0) {
        console.log('No background images found for', folder);
        return;
      }
      
      console.log(`Found ${validImages.length} background images for ${folder}`);
      
      // Create 8-10 shooting stars, cycling through available images
      for (let i = 0; i < numShootingStars; i++) {
        const imgElement = document.createElement('img');
        const imgPath = validImages[i % validImages.length]; // Cycle through available images
        
        // Bigger size for shooting stars
        const size = Math.random() * 40 + 60; // 60-100px
        
        // Random starting position (off-screen or edge)
        const startSide = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        let startX, startY, endX, endY;
        
        switch(startSide) {
          case 0: // Start from top
            startX = Math.random() * 100;
            startY = -10;
            endX = Math.random() * 100;
            endY = 110;
            break;
          case 1: // Start from right
            startX = 110;
            startY = Math.random() * 100;
            endX = -10;
            endY = Math.random() * 100;
            break;
          case 2: // Start from bottom
            startX = Math.random() * 100;
            startY = 110;
            endX = Math.random() * 100;
            endY = -10;
            break;
          case 3: // Start from left
            startX = -10;
            startY = Math.random() * 100;
            endX = 110;
            endY = Math.random() * 100;
            break;
        }
        
        // Animation duration and delay
        const duration = Math.random() * 8 + 6; // 6-14 seconds
        const delay = Math.random() * 5; // 0-5 second delay
        
        imgElement.src = imgPath;
        imgElement.alt = '';
        imgElement.className = 'shooting-star';
        imgElement.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          left: ${startX}%;
          top: ${startY}%;
          object-fit: contain;
          opacity: 0;
          filter: drop-shadow(0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)) 
                  drop-shadow(0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5));
          animation: shootingStar${i} ${duration}s ease-in-out ${delay}s infinite;
          transform-origin: center center;
        `;
        
        particleBg.appendChild(imgElement);
        
        // Create shooting star animation with trail effect
        const imgStyle = document.createElement('style');
        imgStyle.textContent = `
          @keyframes shootingStar${i} {
            0% { 
              left: ${startX}%;
              top: ${startY}%;
              opacity: 0;
              transform: rotate(${Math.random() * 360}deg) scale(0.5);
              filter: drop-shadow(0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)) 
                      drop-shadow(0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5))
                      blur(0px);
            }
            10% { 
              opacity: 1;
              transform: rotate(${Math.random() * 360}deg) scale(1);
            }
            50% { 
              left: ${(startX + endX) / 2}%;
              top: ${(startY + endY) / 2}%;
              opacity: 1;
              transform: rotate(${Math.random() * 360}deg) scale(1.1);
              filter: drop-shadow(0 0 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)) 
                      drop-shadow(0 0 25px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7))
                      blur(0px);
            }
            90% { 
              opacity: 1;
              transform: rotate(${Math.random() * 360}deg) scale(0.9);
            }
            100% { 
              left: ${endX}%;
              top: ${endY}%;
              opacity: 0;
              transform: rotate(${Math.random() * 360}deg) scale(0.5);
              filter: drop-shadow(0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)) 
                      drop-shadow(0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5))
                      blur(1px);
            }
          }
        `;
        document.head.appendChild(imgStyle);
      }
    });
    
    this.detailView.insertBefore(particleBg, this.detailView.firstChild);
    
    // Create glowing entrance arch (attached to wall-grid so it moves with scene)
    const existingArc = this.wallGrid.querySelector('.entrance-arch');
    if (existingArc) existingArc.remove();
    
    // Standard arch position for all portfolios
    const archZPosition = 700;
    
    // Create container with overflow to hide bottom line only
    const archContainer = document.createElement('div');
    archContainer.className = 'entrance-arch';
    archContainer.style.cssText = `
      position: absolute;
      left: -825px;
      top: -540px;
      width: 1650px;
      height: 715px;
      transform: translateZ(${archZPosition}px);
      transform-style: preserve-3d;
      overflow: hidden;
      pointer-events: none;
      z-index: 50;
    `;
    
    const entranceArch = document.createElement('div');
    entranceArch.style.cssText = `
      position: absolute;
      left: 75px;
      top: 75px;
      width: 1500px;
      height: 750px;
      border: 6px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8);
      border-bottom: none;
      border-radius: 750px 750px 0 0;
      box-shadow: 
        0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1),
        0 0 40px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8),
        0 0 60px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6),
        inset 0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5);
      animation: archGlow 3s ease-in-out infinite alternate;
    `;
    
    // Add animated light particles along the arc
    for (let i = 0; i < 8; i++) {
      const light = document.createElement('div');
      const size = Math.random() * 8 + 6; // 6-14px
      const duration = Math.random() * 3 + 3; // 3-6 seconds
      const delay = (i / 8) * duration; // Stagger the lights
      
      light.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1);
        border-radius: 50%;
        box-shadow: 
          0 0 ${size * 2}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1),
          0 0 ${size * 4}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8);
        animation: arcLight${i} ${duration}s linear ${delay}s infinite;
        opacity: 0;
      `;
      
      entranceArch.appendChild(light);
      
      // Create animation for each light traveling along the arc
      const lightStyle = document.createElement('style');
      lightStyle.textContent = `
        @keyframes arcLight${i} {
          0% {
            left: 0%;
            bottom: 0px;
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          25% {
            left: 25%;
            bottom: ${565 * 0.7}px;
            opacity: 1;
          }
          50% {
            left: 50%;
            bottom: ${565}px;
            opacity: 1;
          }
          75% {
            left: 75%;
            bottom: ${565 * 0.7}px;
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            left: 100%;
            bottom: 0px;
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(lightStyle);
    }
    
    archContainer.appendChild(entranceArch);
    
    // Add glow animation
    const archStyle = document.createElement('style');
    archStyle.textContent = `
      @keyframes archGlow {
        0% {
          border-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7);
          box-shadow: 
            0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1),
            0 0 40px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8),
            0 0 60px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6),
            inset 0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5);
        }
        100% {
          border-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1);
          box-shadow: 
            0 0 30px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1),
            0 0 60px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1),
            0 0 90px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8),
            inset 0 0 30px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7);
        }
      }
    `;
    document.head.appendChild(archStyle);
    
    this.wallGrid.appendChild(archContainer);
    
    // Add glowing floor edges with accent color (all 4 sides)
    const existingFloorEdges = this.wallGrid.querySelectorAll('.floor-edge');
    existingFloorEdges.forEach(edge => edge.remove());
    
    // Standard floor for all portfolios
    // Remove any existing floor extension first
    const existingFloorExt = document.querySelector('.dynamic-floor-extension');
    if (existingFloorExt) existingFloorExt.remove();
    
    // Add glowing border for floor
    const floorBorderStyle = document.createElement('style');
    floorBorderStyle.className = 'dynamic-floor-extension';
    floorBorderStyle.textContent = `
      #detail-view .wall-grid::before {
        top: -5000px !important;
        height: 7000px !important;
        transform: rotateX(90deg) translateZ(-1700px) !important;
        box-shadow: 
          inset 0 0 0 4px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8),
          inset 0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6),
          inset 0 0 40px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4) !important;
      }
    `;
    document.head.appendChild(floorBorderStyle);
    
    // Remove the separate edge elements since we're using floor border now
    const leftEdge = null;
    const rightEdge = null;
    const startEdge = null;
    const endEdge = null;
    
    // Add edge glow animation
    const edgeStyle = document.createElement('style');
    edgeStyle.textContent = `
      @keyframes edgeGlow {
        0% {
          box-shadow: 
            0 0 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1),
            0 0 30px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8);
        }
        100% {
          box-shadow: 
            0 0 25px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1),
            0 0 50px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1);
        }
      }
    `;
    document.head.appendChild(edgeStyle);
    
    // Set dark base background
    this.detailView.style.background = `
      radial-gradient(ellipse at center, rgba(15, 20, 45, 1) 0%, rgba(5, 8, 20, 1) 100%)
    `;
    
    // Apply color theme to title card
    const titleCard = this.detailView.querySelector('.title-card');
    if (titleCard) {
      titleCard.style.background = `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3) 40%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2) 100%)`;
      titleCard.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
      titleCard.style.boxShadow = `
        0 0 60px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1),
        0 0 120px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6),
        0 30px 80px rgba(0, 0, 0, 0.6),
        inset 0 0 80px rgba(255, 255, 255, 0.2)
      `;
      
      const title = titleCard.querySelector('h2');
      if (title) {
        title.style.textShadow = `
          0 0 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1),
          0 0 30px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8),
          0 0 45px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)
        `;
      }
    }
    
    // Apply accent color to main bubble (above title card)
    const mainBubble = this.detailView.querySelector('.main-bubble');
    if (mainBubble) {
      mainBubble.style.setProperty('--main-bubble-color', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
      mainBubble.style.setProperty('--main-bubble-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
      
      const mainBubbleImages = mainBubble.querySelector('.card-images');
      if (mainBubbleImages) {
        mainBubbleImages.style.setProperty('--vignette-color-r', rgb.r);
        mainBubbleImages.style.setProperty('--vignette-color-g', rgb.g);
        mainBubbleImages.style.setProperty('--vignette-color-b', rgb.b);
      }
    }
    
    // Apply color theme to all cards
    const cards = this.detailView.querySelectorAll('.wall-box:not(.title-card):not(.main-bubble)');
    
    // Gold yellow color for all memory orbs
    const goldYellow = { r: 255, g: 215, b: 0 }; // Gold yellow RGB
    
    cards.forEach(card => {
      card.style.borderColor = `rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.3)`;
      
      // Apply gold yellow glow to orbs
      card.style.boxShadow = `
        0 0 40px rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.6),
        0 0 80px rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.4),
        0 20px 60px rgba(0, 0, 0, 0.5),
        inset 0 0 60px rgba(255, 255, 255, 0.1),
        inset -20px -20px 40px rgba(0, 0, 0, 0.3),
        0 0 0 8px rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.15),
        0 0 0 16px rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.1),
        0 0 0 24px rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.05)
      `;
      
      // Apply gold yellow overlay to card images for memory orb effect
      const cardImages = card.querySelector('.card-images');
      if (cardImages) {
        cardImages.style.background = `radial-gradient(circle at 50% 50%, 
          rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.3) 0%,
          rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.4) 50%,
          rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.5) 100%)`;
        cardImages.style.borderColor = `rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.8)`;
        
        // Apply gold yellow vignette effect using CSS custom properties
        cardImages.style.setProperty('--vignette-color-r', goldYellow.r);
        cardImages.style.setProperty('--vignette-color-g', goldYellow.g);
        cardImages.style.setProperty('--vignette-color-b', goldYellow.b);
      }
      
      // Update card title color to gold yellow
      const h3 = card.querySelector('h3');
      if (h3) {
        h3.style.color = `rgb(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b})`;
      }
      
      // Update list item borders
      const listItems = card.querySelectorAll('li');
      listItems.forEach(li => {
        li.style.borderLeftColor = `rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.5)`;
        li.style.background = `rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.05)`;
      });
      
      // Update links
      const links = card.querySelectorAll('.detail-link');
      links.forEach(link => {
        link.style.background = `rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.15)`;
        link.style.borderColor = `rgba(${goldYellow.r}, ${goldYellow.g}, ${goldYellow.b}, 0.3)`;
      });
    });
    
    // Update back button with accent color (not gold yellow)
    if (this.backBtn) {
      this.backBtn.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
      this.backBtn.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
    }
    
    // Update exit door with accent color border
    const exitDoor = this.detailView.querySelector('.exit-door');
    if (exitDoor) {
      exitDoor.style.setProperty('--door-color-r', rgb.r);
      exitDoor.style.setProperty('--door-color-g', rgb.g);
      exitDoor.style.setProperty('--door-color-b', rgb.b);
    }
  }
  
  /**
   * Load images from portfolio folder into cards
   * @param {Object} data - Portfolio item data
   */
  loadPortfolioImages(data) {
    const folder = data.folder || data.id;
    const basePath = `assets/portfolios/${folder}/`;
    
    console.log('Loading images for portfolio:', data.title, 'from:', basePath);
    
    // Card names mapping to folder names
    const cardFolders = {
      'overview': 'overview',
      'gallery': 'gallery',
      'technologies': 'technologies',
      'details': 'details',
      'links': 'links',
      'contact': 'contact',
      'placeholder1': 'placeholder1',
      'placeholder2': 'placeholder2',
      'placeholder3': 'placeholder3',
      'placeholder4': 'placeholder4',
      'placeholder5': 'placeholder5',
      'placeholder6': 'placeholder6'
    };
    
    // Load main bubble image (use the main portfolio image)
    const mainBubble = this.detailView.querySelector('.main-bubble');
    if (mainBubble && data.image) {
      const mainBubbleContainer = mainBubble.querySelector('.card-images');
      if (mainBubbleContainer) {
        mainBubbleContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = data.image;
        img.alt = data.title;
        img.loading = 'lazy';
        console.log('Loading main bubble image:', data.image);
        img.onload = function() {
          console.log('✓ Main bubble image loaded successfully');
        };
        img.onerror = function() {
          console.log('✗ Main bubble image failed to load');
        };
        mainBubbleContainer.appendChild(img);
      }
    }
    
    // Load images for each card
    Object.keys(cardFolders).forEach(cardName => {
      const card = this.detailView.querySelector(`[data-card="${cardName}"]`);
      if (!card) {
        console.log('Card not found:', cardName);
        return;
      }
      
      const imagesContainer = card.querySelector('.card-images');
      if (!imagesContainer) {
        console.log('Images container not found for card:', cardName);
        return;
      }
      
      // Clear previous images
      imagesContainer.innerHTML = '';
      
      // Try to load images from the card's folder
      const cardPath = `${basePath}${cardFolders[cardName]}/`;
      console.log('Loading images from:', cardPath);
      
      // Try common image names (1.jpg, 2.jpg, etc.)
      this.loadImagesFromFolder(cardPath, imagesContainer, 5);
    });
  }
  
  /**
   * Load images and videos from a folder
   * @param {string} folderPath - Path to the folder
   * @param {HTMLElement} container - Container to append media to
   * @param {number} maxImages - Maximum number of files to try loading
   */
  loadImagesFromFolder(folderPath, container, maxImages = 5) {
    console.log('Trying to load media from:', folderPath);
    let loadedCount = 0;
    
    // First, try to load any video files with common names
    const videoExtensions = ['mp4', 'webm', 'mov'];
    videoExtensions.forEach(ext => {
      const video = document.createElement('video');
      const videoPath = `${folderPath}1.${ext}`;
      
      video.src = videoPath;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.style.cssText = `
        min-width: 100%;
        min-height: 100%;
        width: 150%;
        height: 150%;
        object-fit: cover;
        object-position: center;
        opacity: 0.85;
        filter: brightness(0.9) contrast(1.1) saturate(0.8) hue-rotate(10deg);
        mix-blend-mode: luminosity;
      `;
      
      video.onloadeddata = function() {
        console.log('✓ Video loaded successfully:', this.src);
        this.play().catch(e => console.log('Video autoplay failed:', e));
        loadedCount++;
      };
      
      video.onerror = function() {
        console.log('✗ Video failed:', videoPath);
        this.remove();
      };
      
      container.appendChild(video);
    });
    
    // Then try numbered image files
    for (let i = 1; i <= maxImages; i++) {
      const img = document.createElement('img');
      const jpgPath = `${folderPath}${i}.jpg`;
      const pngPath = `${folderPath}${i}.png`;
      
      img.alt = `Portfolio image ${i}`;
      img.loading = 'lazy';
      
      // Try JPG first
      img.src = jpgPath;
      console.log('Attempting to load:', jpgPath);
      
      img.onload = function() {
        console.log('✓ Image loaded successfully:', this.src);
        loadedCount++;
      };
      
      img.onerror = function() {
        console.log('✗ JPG failed, trying PNG:', pngPath);
        // Try PNG
        this.src = pngPath;
        this.onerror = function() {
          console.log('✗ PNG also failed, removing element');
          this.remove();
        };
        this.onload = function() {
          console.log('✓ PNG loaded successfully:', this.src);
          loadedCount++;
        };
      };
      
      container.appendChild(img);
    }
    
    console.log('Appended media elements to container');
  }
  
  /**
   * Hide the detail view
   */
  hide() {
    if (!this.isOpen) return;
    
    // Clean up ALL dynamic styles that might affect the main museum
    const dynamicFloorStyle = document.querySelector('.dynamic-floor-style');
    if (dynamicFloorStyle) dynamicFloorStyle.remove();
    
    const dynamicFloorExt = document.querySelector('.dynamic-floor-extension');
    if (dynamicFloorExt) dynamicFloorExt.remove();
    
    // Remove all dynamically created style elements from detail view
    const dynamicStyles = document.querySelectorAll('style');
    dynamicStyles.forEach(style => {
      // Only remove styles that contain detail-view specific animations or modifications
      if (style.textContent && (
        style.textContent.includes('floatParticle') ||
        style.textContent.includes('shootingStar') ||
        style.textContent.includes('archGlow') ||
        style.textContent.includes('arcLight') ||
        style.textContent.includes('edgeGlow') ||
        style.textContent.includes('.wall-grid::before') ||
        style.textContent.includes('#detail-view')
      )) {
        style.remove();
      }
    });
    
    // Remove particle background
    const particleBg = this.detailView.querySelector('.detail-particle-background');
    if (particleBg) particleBg.remove();
    
    // Remove floating orbs
    this.removeFloatingOrbs();
    
    // Remove floor circles
    this.removeFloorCircles();
    
    // Remove entrance arch
    const entranceArch = this.wallGrid.querySelector('.entrance-arch');
    if (entranceArch) entranceArch.remove();
    
    // Remove floor edges
    const floorEdges = this.wallGrid.querySelectorAll('.floor-edge');
    floorEdges.forEach(edge => edge.remove());
    
    // Remove info card
    const infoCard = this.wallGrid.querySelector('.box-8');
    if (infoCard) infoCard.remove();
    
    // Hide detail view
    this.detailView.classList.remove('active');
    this.detailView.setAttribute('aria-hidden', 'true');
    
    // Set state
    this.isOpen = false;
    this.currentData = null;
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyPress);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.detailView.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.detailView.removeEventListener('wheel', this.handleWheel);
    
    // Stop animation
    this.stopAnimation();
    
    // Reset FPS camera to entrance of hallway
    this.rotation = { x: 0, y: 0 };
    this.targetRotation = { x: 0, y: 0 };
    this.position = { x: 0, y: 0, z: 600 };
    this.targetPosition = { x: 0, y: 0, z: 600 };
    this.keys = { w: false, a: false, s: false, d: false };
    
    console.log('Detail view closed');
  }
  
  /**
   * Handle mouse down to start dragging
   */
  handleMouseDown(event) {
    // Allow dragging anywhere, including on cards
    // Only prevent drag on the back button
    if (event.target.closest('.back-button')) {
      return;
    }
    
    event.preventDefault();
    this.isDragging = true;
    this.lastMousePos = {
      x: event.clientX,
      y: event.clientY
    };
    this.detailView.style.cursor = 'grabbing';
  }
  
  /**
   * Handle mouse up to stop dragging
   */
  handleMouseUp(event) {
    this.isDragging = false;
    this.lastMousePos = null;
    this.detailView.style.cursor = 'grab';
  }
  
  /**
   * Handle mouse movement for FPS camera look
   */
  handleMouseMove(event) {
    if (!this.isDragging || !this.lastMousePos) {
      return;
    }
    
    // Calculate mouse delta
    const deltaX = event.clientX - this.lastMousePos.x;
    const deltaY = event.clientY - this.lastMousePos.y;
    
    // Update target rotation for FPS look
    // Horizontal mouse movement = yaw (left/right) - INVERTED for natural feel
    this.targetRotation.y -= deltaX * this.mouseSensitivity;
    
    // Vertical mouse movement = pitch (up/down)
    this.targetRotation.x -= deltaY * this.mouseSensitivity;
    
    // Clamp vertical look to prevent over-rotation
    this.targetRotation.x = Math.max(this.MIN_PITCH, Math.min(this.MAX_PITCH, this.targetRotation.x));
    
    // Update last position
    this.lastMousePos = {
      x: event.clientX,
      y: event.clientY
    };
  }
  
  /**
   * Start animation loop
   */
  startAnimation() {
    this.updateCamera();
  }
  
  /**
   * Stop animation loop
   */
  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Update FPS camera with smooth interpolation
   */
  updateCamera() {
    if (!this.isOpen) return;
    
    // Update movement based on WASD keys
    this.updateMovement();
    
    // Smooth interpolation for rotation (camera look)
    this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.15;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.15;
    
    // Smooth interpolation for position (camera movement)
    this.position.x += (this.targetPosition.x - this.position.x) * 0.12;
    this.position.y += (this.targetPosition.y - this.position.y) * 0.12;
    this.position.z += (this.targetPosition.z - this.position.z) * 0.12;
    
    // Apply FPS camera transform to wall-grid
    // Rotate first (where you're looking), then translate (where you are)
    if (this.wallGrid) {
      this.wallGrid.style.transform = `
        rotateX(${-this.rotation.x}deg)
        rotateY(${-this.rotation.y}deg)
        translate3d(${-this.position.x}px, ${-this.position.y}px, ${-this.position.z}px)
      `;
    }
    
    // Continue animation
    this.animationFrameId = requestAnimationFrame(this.updateCamera);
  }
  
  /**
   * Handle keyboard events (ESC to close)
   * @param {KeyboardEvent} event
   */
  handleKeyPress(event) {
    if (event.key === 'Escape' && this.isOpen) {
      this.hide();
    }
  }
  
  /**
   * Handle key down for WASD movement
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    if (!this.isOpen) return;
    
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      this.keys[key] = true;
      event.preventDefault();
    }
  }
  
  /**
   * Handle key up for WASD movement
   * @param {KeyboardEvent} event
   */
  handleKeyUp(event) {
    if (!this.isOpen) return;
    
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      this.keys[key] = false;
      event.preventDefault();
    }
  }
  
  /**
   * Update camera position based on WASD keys (FPS movement)
   */
  updateMovement() {
    // Calculate movement direction based on camera yaw (Y rotation only)
    const yaw = (this.rotation.y * Math.PI) / 180;
    
    // Forward/backward (W/S) - move along view direction
    if (this.keys.w) {
      this.targetPosition.x -= Math.sin(yaw) * this.moveSpeed;
      this.targetPosition.z -= Math.cos(yaw) * this.moveSpeed;
    }
    if (this.keys.s) {
      this.targetPosition.x += Math.sin(yaw) * this.moveSpeed;
      this.targetPosition.z += Math.cos(yaw) * this.moveSpeed;
    }
    
    // Strafe left/right (A/D) - move perpendicular to view direction
    if (this.keys.a) {
      this.targetPosition.x -= Math.cos(yaw) * this.moveSpeed;
      this.targetPosition.z += Math.sin(yaw) * this.moveSpeed;
    }
    if (this.keys.d) {
      this.targetPosition.x += Math.cos(yaw) * this.moveSpeed;
      this.targetPosition.z -= Math.sin(yaw) * this.moveSpeed;
    }
    
    // Apply hallway boundaries
    // Limit left/right movement (X axis)
    this.targetPosition.x = Math.max(-this.hallwayWidth, Math.min(this.hallwayWidth, this.targetPosition.x));
    
    // Limit forward/backward movement (Z axis) - can't go past entrance or end
    this.targetPosition.z = Math.max(-this.hallwayLength, Math.min(this.hallwayForwardLimit, this.targetPosition.z));
    
    // Keep Y at 0 (no vertical movement)
    this.targetPosition.y = 0;
  }
  
  /**
   * Create floating orbs that move sideways in the detail view
   */
  createFloatingOrbs() {
    // Remove existing orbs if any
    this.removeFloatingOrbs();
    
    // Create orb container (same as main museum)
    const orbContainer = document.createElement('div');
    orbContainer.className = 'detail-floating-orbs';
    orbContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    `;
    
    // Create 250 floating particles (increased for more density)
    const particleCount = 250;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      
      // Random size between 5-12px (increased from 3-8px)
      const size = Math.random() * 7 + 5;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Random position across the entire screen
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      
      // White color (same style as main museum particles)
      particle.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.8) 30%, rgba(255, 255, 255, 0) 70%)';
      particle.style.borderRadius = '50%';
      particle.style.position = 'absolute';
      particle.style.pointerEvents = 'none';
      particle.style.opacity = '0.8';
      particle.style.boxShadow = '0 0 4px rgba(255, 255, 255, 0.8)';
      
      // No animation - particles stay in place
      
      orbContainer.appendChild(particle);
    }
    
    this.detailView.insertBefore(orbContainer, this.detailView.firstChild);
  }
  
  /**
   * Remove floating orbs from detail view
   */
  removeFloatingOrbs() {
    const orbContainer = this.detailView.querySelector('.detail-floating-orbs');
    if (orbContainer) {
      orbContainer.remove();
    }
    
    // Remove animation styles
    const orbStyles = document.querySelectorAll('.detail-orb-animation');
    orbStyles.forEach(style => style.remove());
  }
  
  /**
   * Create 100 glowing circles on the floor
   */
  createFloorCircles() {
    // Remove existing circles if any
    this.removeFloorCircles();
    
    // Add circles as a style element for better performance
    const style = document.createElement('style');
    style.className = 'floor-circles-style';
    
    // Generate 100 circles with random positions, sizes, and colors
    const colors = [
      '255, 100, 200',  // Pink
      '100, 150, 255',  // Blue
      '255, 200, 100',  // Orange
      '150, 100, 255',  // Purple
      '100, 255, 200',  // Cyan
      '255, 150, 100',  // Coral
      '200, 100, 255',  // Violet
      '100, 200, 255',  // Sky blue
      '255, 255, 100',  // Yellow
      '255, 100, 150',  // Rose
      '150, 255, 100',  // Green
      '255, 150, 200',  // Light pink
      '100, 255, 255',  // Aqua
      '255, 200, 150',  // Peach
      '200, 150, 255',  // Lavender
      '150, 255, 200',  // Mint
      '255, 180, 100',  // Amber
      '180, 100, 255',  // Deep purple
      '100, 220, 255',  // Light blue
      '255, 120, 180'   // Hot pink
    ];
    
    let gradients = [];
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = Math.random() * 60 + 50; // 50-110px
      const color = colors[i % colors.length];
      const opacity = (Math.random() * 0.1 + 0.25).toFixed(2); // 0.25-0.35
      
      gradients.push(`radial-gradient(circle ${size}px at ${x}% ${y}%, rgba(${color}, ${opacity}) 0%, rgba(${color}, ${opacity * 0.7}) 40%, transparent 70%)`);
    }
    
    style.textContent = `
      .wall-grid::before {
        background: 
          ${gradients.join(',\n          ')},
          linear-gradient(to bottom,
            rgba(20, 15, 35, 1) 0%,
            rgba(15, 10, 28, 1) 50%,
            rgba(12, 8, 22, 1) 100%) !important;
        filter: brightness(1.1) contrast(1.15) drop-shadow(0 0 15px rgba(255, 255, 255, 0.1)) !important;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Remove floor circles
   */
  removeFloorCircles() {
    const circleStyle = document.querySelector('.floor-circles-style');
    if (circleStyle) {
      circleStyle.remove();
    }
  }
  
  /**
   * Clean up event listeners
   */
  destroy() {
    this.backBtn.removeEventListener('click', this.hide);
    document.removeEventListener('keydown', this.handleKeyPress);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.detailView.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.stopAnimation();
  }
}
