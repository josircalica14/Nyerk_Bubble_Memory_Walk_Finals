/**
 * ContentPanel Class
 * Manages the content panel overlay that displays detailed portfolio item information
 */
class ContentPanel {
  constructor() {
    // Get references to panel elements
    this.panel = document.getElementById('content-panel');
    this.backdrop = document.querySelector('.backdrop');
    this.closeBtn = this.panel.querySelector('.close-btn');
    this.contentImage = this.panel.querySelector('.content-image');
    this.contentTitle = this.panel.querySelector('.content-title');
    this.contentDescription = this.panel.querySelector('.content-description');
    
    // Track panel state
    this.isOpen = false;
    
    // Create live region for screen reader announcements
    this.createLiveRegion();
    
    // Bind methods to maintain context
    this.hide = this.hide.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    
    // Set up close button event listener
    this.closeBtn.addEventListener('click', this.hide);
  }
  
  /**
   * Create a live region for screen reader announcements
   */
  createLiveRegion() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'visually-hidden';
    document.body.appendChild(this.liveRegion);
  }
  
  /**
   * Announce message to screen readers
   * @param {String} message - Message to announce
   */
  announce(message) {
    if (this.liveRegion) {
      this.liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        this.liveRegion.textContent = '';
      }, 1000);
    }
  }
  
  /**
   * Show the content panel with portfolio item data
   * @param {Object} data - Portfolio item data
   */
  show(data) {
    if (!data) return;
    
    // Store the element that had focus before opening panel
    this.previouslyFocusedElement = document.activeElement;
    
    // Store current data
    this.currentData = data;
    
    // Populate panel with content
    this.contentTitle.textContent = data.title || '';
    this.contentDescription.textContent = data.description || '';
    
    // Lazy load image when panel opens
    if (data.image) {
      this.contentImage.src = data.image;
      this.contentImage.alt = data.title ? `${data.title} portfolio image` : 'Portfolio item image';
      this.contentImage.style.display = 'block';
    } else {
      this.contentImage.src = '';
      this.contentImage.alt = '';
      this.contentImage.style.display = 'none';
    }
    
    // Set bubble color and vignette for the panel
    if (data.color) {
      this.panel.style.setProperty('--bubble-color', data.color);
      
      // Extract RGB values for vignette effect
      const rgb = this.extractRGB(data.color);
      if (rgb) {
        this.panel.style.setProperty('--vignette-color-r', rgb.r);
        this.panel.style.setProperty('--vignette-color-g', rgb.g);
        this.panel.style.setProperty('--vignette-color-b', rgb.b);
      }
    }
    
    // Update button text to "Enter [Name]'s Memory Hall"
    const viewDetailsBtn = this.panel.querySelector('.content-button:first-child');
    if (viewDetailsBtn && data.title) {
      viewDetailsBtn.textContent = `Enter ${data.title}'s Memory Hall`;
    }
    
    // Add active class to trigger slide-in animation
    requestAnimationFrame(() => {
      this.panel.classList.add('active');
      this.backdrop.classList.add('active');
      this.panel.setAttribute('aria-hidden', 'false');
    });
    
    // Set isOpen flag
    this.isOpen = true;
    
    // Add backdrop click listener to close panel
    this.backdrop.addEventListener('click', this.handleBackdropClick);
    
    // Add keyboard support for ESC key
    document.addEventListener('keydown', this.handleKeyPress);
    
    // Announce to screen readers
    this.announce(`Opened ${data.title || 'portfolio item'} details`);
    
    // Focus the close button for accessibility (after animation starts)
    setTimeout(() => {
      this.closeBtn.focus();
    }, 100);
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
   * Hide the content panel
   */
  hide() {
    if (!this.isOpen) return;
    
    // Remove active class to trigger slide-out animation
    this.panel.classList.remove('active');
    this.backdrop.classList.remove('active');
    this.panel.setAttribute('aria-hidden', 'true');
    
    // Announce to screen readers
    this.announce('Closed portfolio details');
    
    // Clear panel content after animation completes
    setTimeout(() => {
      if (!this.isOpen) {
        this.contentTitle.textContent = '';
        this.contentDescription.textContent = '';
        this.contentImage.src = '';
        this.contentImage.alt = '';
      }
    }, 400); // Match CSS transition duration
    
    // Set isOpen flag to false
    this.isOpen = false;
    
    // Remove backdrop click listener
    this.backdrop.removeEventListener('click', this.handleBackdropClick);
    
    // Remove keyboard listener
    document.removeEventListener('keydown', this.handleKeyPress);
    
    // Return focus to the previously focused element (the bubble)
    if (this.previouslyFocusedElement && this.previouslyFocusedElement.focus) {
      setTimeout(() => {
        this.previouslyFocusedElement.focus();
      }, 100);
    }
  }
  
  /**
   * Handle keyboard events (ESC key to close)
   * @param {KeyboardEvent} event
   */
  handleKeyPress(event) {
    if (event.key === 'Escape' && this.isOpen) {
      this.hide();
    }
  }
  
  /**
   * Handle backdrop click to close panel
   * @param {MouseEvent} event
   */
  handleBackdropClick(event) {
    if (event.target === this.backdrop) {
      this.hide();
    }
  }
  
  /**
   * Clean up event listeners
   */
  destroy() {
    this.closeBtn.removeEventListener('click', this.hide);
    this.backdrop.removeEventListener('click', this.handleBackdropClick);
    document.removeEventListener('keydown', this.handleKeyPress);
  }
}
