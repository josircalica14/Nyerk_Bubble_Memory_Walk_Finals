/**
 * BubbleManager - Manages creation, positioning, and animation of portfolio bubbles
 */
class BubbleManager {
  constructor(container, data) {
    // DOM reference
    this.container = container;
    
    // Portfolio data
    this.data = data;
    
    // Array to store bubble state objects
    this.bubbles = [];
    
    // Constants for sphere distribution
    this.SPHERE_RADIUS = 500; // Base radius for bubble positioning
    this.MIN_RADIUS = 400;
    this.MAX_RADIUS = 600;
    this.POSITION_OFFSET = 50; // Random offset for organic appearance
    
    // Animation constants
    this.FLOAT_SPEED = 0.001;
    this.FLOAT_AMPLITUDE = 10;
    
    // Check for reduced motion preference
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Calculate bubble positions using Fibonacci sphere algorithm
   * Distributes points evenly on a sphere surface
   * @returns {Array} Array of position objects with spherical and Cartesian coordinates
   */
  calculateBubblePositions() {
    const positions = [];
    const numBubbles = this.data.length;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = Math.PI * 2 * goldenRatio;

    for (let i = 0; i < numBubbles; i++) {
      // Fibonacci sphere algorithm
      const t = i / numBubbles;
      const phi = Math.acos(1 - 2 * t); // Polar angle (0 to PI)
      const theta = angleIncrement * i; // Azimuthal angle

      // Add random offset for organic appearance
      const radiusOffset = (Math.random() - 0.5) * this.POSITION_OFFSET;
      const radius = this.SPHERE_RADIUS + radiusOffset;

      // Convert spherical coordinates to Cartesian (x, y, z)
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions.push({
        // Spherical coordinates
        radius: radius,
        theta: theta,
        phi: phi,
        // Cartesian coordinates
        x: x,
        y: y,
        z: z
      });
    }

    return positions;
  }

  /**
   * Create bubble DOM elements and append to container
   * Generates bubbles from portfolio data with initial 3D positions
   */
  createBubbles() {
    // Calculate positions for all bubbles
    const positions = this.calculateBubblePositions();

    // Create bubble elements
    this.data.forEach((item, index) => {
      const position = positions[index];

      // Create bubble element
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.setAttribute('data-id', item.id);
      bubble.setAttribute('data-index', index);
      
      // Accessibility attributes
      bubble.setAttribute('role', 'button');
      bubble.setAttribute('tabindex', '0');
      bubble.setAttribute('aria-label', `View ${item.title} portfolio item`);

      // Create inner structure
      const bubbleInner = document.createElement('div');
      bubbleInner.className = 'bubble-inner';

      // Add image if available
      if (item.image) {
        const bubbleImage = document.createElement('img');
        bubbleImage.className = 'bubble-image';
        bubbleImage.src = item.image;
        bubbleImage.alt = item.title;
        bubbleImage.loading = 'lazy';
        bubbleInner.appendChild(bubbleImage);
      }

      // Create label outside the bubble
      const bubbleLabel = document.createElement('div');
      bubbleLabel.className = 'bubble-label';
      bubbleLabel.textContent = item.title;
      bubbleLabel.setAttribute('aria-hidden', 'true'); // Hide from screen readers since aria-label on parent is more descriptive

      // Assemble structure
      bubble.appendChild(bubbleInner);
      bubble.appendChild(bubbleLabel);

      // Set bubble color (from data or generate random)
      const color = item.color || this.generateRandomColor();
      bubble.style.setProperty('--bubble-color', color);
      
      // Extract RGB values for vignette effect
      const rgb = this.extractRGB(color);
      if (rgb) {
        bubble.style.setProperty('--vignette-color-r', rgb.r);
        bubble.style.setProperty('--vignette-color-g', rgb.g);
        bubble.style.setProperty('--vignette-color-b', rgb.b);
      }

      // Start bubbles at center (0, 0, 0) for animation
      bubble.style.setProperty('--x', '0px');
      bubble.style.setProperty('--y', '0px');
      bubble.style.setProperty('--z', '0px');
      bubble.style.setProperty('--scale', '0.1');
      
      // Add animation class
      bubble.classList.add('bubble-animating');

      // Store bubble state
      this.bubbles.push({
        element: bubble,
        position: position,
        data: item,
        isHovered: false,
        isSelected: false
      });

      // Append to container
      this.container.appendChild(bubble);
      
      // Animate to final position after a delay
      setTimeout(() => {
        bubble.style.setProperty('--x', `${position.x}px`);
        bubble.style.setProperty('--y', `${position.y}px`);
        bubble.style.setProperty('--z', `${position.z}px`);
        bubble.style.setProperty('--scale', '1');
        
        // Remove animation class after animation completes
        setTimeout(() => {
          bubble.classList.remove('bubble-animating');
        }, 1500);
      }, 100 + index * 50); // Stagger animation for each bubble
    });
  }

  /**
   * Generate a random vibrant color for bubbles
   * @returns {String} Hex color code
   */
  generateRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 20); // 70-90%
    const lightness = 50 + Math.floor(Math.random() * 20); // 50-70%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Extract RGB values from a color string (hex, rgb, rgba, hsl, hsla)
   * @param {String} color - Color string in any CSS format
   * @returns {Object|null} Object with r, g, b properties or null if parsing fails
   */
  extractRGB(color) {
    // Create a temporary element to let the browser parse the color
    const temp = document.createElement('div');
    temp.style.color = color;
    document.body.appendChild(temp);
    
    // Get computed color (always in rgb/rgba format)
    const computed = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);
    
    // Parse rgb/rgba format: rgb(r, g, b) or rgba(r, g, b, a)
    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    
    return null;
  }

  /**
   * Update bubble transforms based on camera state
   * Applies rotation and zoom, plus floating animation
   * @param {Object} cameraState - Camera rotation and zoom values
   */
  updateBubbles(cameraState) {
    const timestamp = performance.now();
    const { rotation, zoom } = cameraState;

    // Convert rotation to radians
    const rotX = (rotation.x * Math.PI) / 180;
    const rotY = (rotation.y * Math.PI) / 180;

    // Batch DOM writes for performance
    this.bubbles.forEach((bubble, index) => {
      const pos = bubble.position;

      // Apply camera rotation to position
      // Rotate around Y-axis
      let x = pos.x * Math.cos(rotY) - pos.z * Math.sin(rotY);
      let z = pos.x * Math.sin(rotY) + pos.z * Math.cos(rotY);
      
      // Rotate around X-axis
      let y = pos.y * Math.cos(rotX) - z * Math.sin(rotX);
      z = pos.y * Math.sin(rotX) + z * Math.cos(rotX);

      // Apply floating animation offset only if reduced motion is not preferred
      if (!this.prefersReducedMotion) {
        const floatOffset = Math.sin(timestamp * this.FLOAT_SPEED + index) * this.FLOAT_AMPLITUDE;
        y += floatOffset;
      }

      // Apply zoom
      x *= zoom;
      y *= zoom;
      z *= zoom;

      // Update CSS custom properties
      bubble.element.style.setProperty('--x', `${x}px`);
      bubble.element.style.setProperty('--y', `${y}px`);
      bubble.element.style.setProperty('--z', `${z}px`);

      // Update z-index based on z position (closer bubbles on top)
      bubble.element.style.zIndex = Math.round(1000 + z);
    });
  }

  /**
   * Get bubble element at given screen coordinates
   * Used for click detection with tolerance
   * @param {Number} x - Screen X coordinate
   * @param {Number} y - Screen Y coordinate
   * @returns {HTMLElement|null} Bubble element or null if none found
   */
  getBubbleAt(x, y) {
    const TOLERANCE = 10; // 10 pixel tolerance as per requirements
    const BUBBLE_RADIUS = 60; // Approximate bubble radius in pixels
    
    let closestBubble = null;
    let closestDistance = Infinity;

    this.bubbles.forEach(bubble => {
      const element = bubble.element;
      const rect = element.getBoundingClientRect();

      // Calculate bubble center in screen coordinates
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from click point to bubble center
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Get current scale from CSS custom property
      const scale = parseFloat(element.style.getPropertyValue('--scale')) || 1;
      const effectiveRadius = BUBBLE_RADIUS * scale;

      // Check if click is within bubble radius plus tolerance
      if (distance <= effectiveRadius + TOLERANCE) {
        // Keep track of closest bubble (for overlapping cases)
        if (distance < closestDistance) {
          closestDistance = distance;
          closestBubble = element;
        }
      }
    });

    return closestBubble;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BubbleManager;
}
