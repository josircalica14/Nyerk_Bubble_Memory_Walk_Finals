/**
 * LoadingScreen - 2D CSS animated loading screen for Memory Hall
 * Shows animated geometric shapes with progress indicator
 */

export class LoadingScreen {
  constructor(accentColor) {
    this.container = null;
    this.accentColor = { r: 0, g: 0, b: 0 };
    
    // Parse accent color
    if (typeof accentColor === 'string') {
      // Handle hex color
      const hex = accentColor.replace('#', '');
      this.accentColor = {
        r: parseInt(hex.substr(0, 2), 16) / 255,
        g: parseInt(hex.substr(2, 2), 16) / 255,
        b: parseInt(hex.substr(4, 2), 16) / 255
      };
    } else {
      this.accentColor = accentColor;
    }
    
    this.progressText = null;
    this.progress = 0;
    this.onResize = null;
  }

  /**
   * Initialize and show the loading screen
   */
  show() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'loading-screen';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
      background: #000510;
      opacity: 0;
      transition: opacity 0.3s ease-in;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    document.body.appendChild(this.container);

    // Fade in
    setTimeout(() => {
      this.container.style.opacity = '1';
    }, 10);

    // Create 2D animated shapes using CSS
    this.create2DShapes();

    // Create progress text overlay
    this.createProgressText();

    // Handle resize
    this.onResize = () => {
      // No resize handling needed for 2D
    };
    window.addEventListener('resize', this.onResize);
  }

  /**
   * Create 2D animated shapes using CSS
   */
  create2DShapes() {
    const shapesContainer = document.createElement('div');
    shapesContainer.style.cssText = `
      position: relative;
      width: 400px;
      height: 400px;
    `;

    // Get accent color as CSS string
    const colorStyle = `rgb(${Math.floor(this.accentColor.r * 255)}, ${Math.floor(this.accentColor.g * 255)}, ${Math.floor(this.accentColor.b * 255)})`;

    // Central rotating ring
    const centralRing = document.createElement('div');
    centralRing.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 200px;
      height: 200px;
      margin: -100px 0 0 -100px;
      border: 10px solid ${colorStyle};
      border-radius: 50%;
      opacity: 0.8;
      animation: rotateRing 8s linear infinite;
    `;

    // Outer ring
    const outerRing = document.createElement('div');
    outerRing.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 320px;
      height: 320px;
      margin: -160px 0 0 -160px;
      border: 6px solid ${colorStyle};
      border-radius: 50%;
      opacity: 0.4;
      animation: rotateRingReverse 12s linear infinite;
    `;

    // Orbiting spheres
    for (let i = 0; i < 3; i++) {
      const sphere = document.createElement('div');
      const angle = (i / 3) * 360;
      sphere.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        background: ${colorStyle};
        border-radius: 50%;
        opacity: 0.9;
        box-shadow: 0 0 20px ${colorStyle};
        animation: orbitSphere 4s linear infinite;
        animation-delay: ${-i * 1.33}s;
      `;
      shapesContainer.appendChild(sphere);
    }

    // Add CSS animations
    if (!document.querySelector('#loading-animation-style')) {
      const style = document.createElement('style');
      style.id = 'loading-animation-style';
      style.textContent = `
        @keyframes rotateRing {
          from { transform: rotate(0deg) rotateY(0deg); }
          to { transform: rotate(360deg) rotateY(360deg); }
        }
        
        @keyframes rotateRingReverse {
          from { transform: rotate(0deg) rotateX(0deg); }
          to { transform: rotate(-360deg) rotateX(-360deg); }
        }
        
        @keyframes orbitSphere {
          0% {
            transform: translate(0, -100px);
          }
          25% {
            transform: translate(100px, 0);
          }
          50% {
            transform: translate(0, 100px);
          }
          75% {
            transform: translate(-100px, 0);
          }
          100% {
            transform: translate(0, -100px);
          }
        }
      `;
      document.head.appendChild(style);
    }

    shapesContainer.appendChild(centralRing);
    shapesContainer.appendChild(outerRing);
    this.container.appendChild(shapesContainer);
  }

  /**
   * Create progress text overlay
   */
  createProgressText() {
    const colorStyle = `rgb(${Math.floor(this.accentColor.r * 255)}, ${Math.floor(this.accentColor.g * 255)}, ${Math.floor(this.accentColor.b * 255)})`;
    
    const textContainer = document.createElement('div');
    textContainer.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      color: #ffffff;
      font-family: Arial, sans-serif;
      z-index: 10000;
      pointer-events: none;
    `;

    const progressLabel = document.createElement('div');
    progressLabel.textContent = 'Loading Memory Hall';
    progressLabel.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    `;

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: 300px;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
      margin: 0 auto 10px;
    `;

    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
      width: 0%;
      height: 100%;
      background: ${colorStyle};
      border-radius: 2px;
      transition: width 0.3s ease;
      box-shadow: 0 0 10px ${colorStyle};
    `;
    progressBar.appendChild(progressFill);

    const progressPercent = document.createElement('div');
    progressPercent.textContent = '0%';
    progressPercent.style.cssText = `
      font-size: 18px;
      color: ${colorStyle};
      text-shadow: 0 0 10px ${colorStyle};
    `;

    textContainer.appendChild(progressLabel);
    textContainer.appendChild(progressBar);
    textContainer.appendChild(progressPercent);
    this.container.appendChild(textContainer);

    this.progressText = { fill: progressFill, percent: progressPercent };
  }

  /**
   * Update loading progress
   */
  setProgress(value) {
    this.progress = Math.min(100, Math.max(0, value));
    if (this.progressText) {
      this.progressText.fill.style.width = `${this.progress}%`;
      this.progressText.percent.textContent = `${Math.round(this.progress)}%`;
    }
  }

  /**
   * Fade loading screen to solid black (hide animations, keep black background)
   */
  async fadeToBlack() {
    return new Promise((resolve) => {
      if (!this.container) {
        resolve();
        return;
      }

      // Fade out the animations by hiding the shapes container
      const shapesContainer = this.container.querySelector('div');
      if (shapesContainer) {
        shapesContainer.style.transition = 'opacity 0.5s ease-out';
        shapesContainer.style.opacity = '0';
      }

      // Fade out progress text
      if (this.progressText) {
        const textContainer = this.progressText.percent.parentElement;
        if (textContainer) {
          textContainer.style.transition = 'opacity 0.5s ease-out';
          textContainer.style.opacity = '0';
        }
      }

      // Wait for fade to complete
      setTimeout(() => {
        resolve();
      }, 500);
    });
  }

  /**
   * Hide and dispose the loading screen
   */
  async hide() {
    return new Promise((resolve) => {
      if (!this.container) {
        resolve();
        return;
      }

      // Cleanup
      window.removeEventListener('resize', this.onResize);

      // Remove from DOM instantly (no fade)
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }

      // Clear all references
      this.container = null;
      this.progressText = null;
      this.onResize = null;

      resolve();
    });
  }
}
