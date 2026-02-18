/**
 * OrbModal Class
 * Manages modal/dialog for displaying full memory orb content
 */
class OrbModal {
  constructor(audioManager = null) {
    this.modal = null;
    this.currentImages = [];
    this.currentIndex = 0;
    this.currentTitle = '';
    this.isOpen = false;
    this.audioManager = audioManager; // Reference to AudioManager
    
    // Bind methods
    this.close = this.close.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.showNext = this.showNext.bind(this);
    this.showPrev = this.showPrev.bind(this);
    
    // Create modal element
    this.createModal();
  }
  
  /**
   * Create modal HTML structure
   */
  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'orb-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-hidden', 'true');
    
    this.modal.innerHTML = `
      <div class="orb-modal-content">
        <button class="orb-modal-close" aria-label="Close modal">&times;</button>
        <div class="orb-modal-header">
          <h2 class="orb-modal-title"></h2>
        </div>
        <div class="orb-modal-body">
          <button class="orb-modal-nav prev hidden" aria-label="Previous image">‹</button>
          <div class="orb-modal-media"></div>
          <button class="orb-modal-nav next hidden" aria-label="Next image">›</button>
          <div class="orb-modal-counter hidden"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    // Get references
    this.closeBtn = this.modal.querySelector('.orb-modal-close');
    this.titleEl = this.modal.querySelector('.orb-modal-title');
    this.mediaContainer = this.modal.querySelector('.orb-modal-media');
    this.prevBtn = this.modal.querySelector('.orb-modal-nav.prev');
    this.nextBtn = this.modal.querySelector('.orb-modal-nav.next');
    this.counter = this.modal.querySelector('.orb-modal-counter');
    
    // Add event listeners
    this.closeBtn.addEventListener('click', this.close);
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
    this.prevBtn.addEventListener('click', this.showPrev);
    this.nextBtn.addEventListener('click', this.showNext);
  }
  
  /**
   * Open modal with orb content
   * @param {string} title - Orb title
   * @param {Array} images - Array of image/video elements or paths
   */
  open(title, images) {
    if (!images || images.length === 0) {
      console.log('No images to display');
      return;
    }
    
    this.currentTitle = title;
    this.currentImages = images;
    this.currentIndex = 0;
    this.isOpen = true;
    
    // Update title
    this.titleEl.textContent = title;
    
    // Show modal
    this.modal.classList.add('active');
    this.modal.setAttribute('aria-hidden', 'false');
    
    // Display first image
    this.displayMedia(0);
    
    // Update navigation
    this.updateNavigation();
    
    // Add keyboard listener
    document.addEventListener('keydown', this.handleKeyPress);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * Display media at given index
   * @param {number} index - Index of media to display
   */
  displayMedia(index) {
    if (index < 0 || index >= this.currentImages.length) return;
    
    this.currentIndex = index;
    const mediaItem = this.currentImages[index];
    
    // Clear previous content
    this.mediaContainer.innerHTML = '';
    
    // Remove video class
    this.mediaContainer.classList.remove('has-video');
    
    // Create media element
    let mediaEl;
    
    if (mediaItem instanceof HTMLImageElement) {
      mediaEl = document.createElement('img');
      mediaEl.src = mediaItem.src;
      mediaEl.alt = mediaItem.alt || this.currentTitle;
    } else if (mediaItem instanceof HTMLVideoElement) {
      mediaEl = document.createElement('video');
      mediaEl.src = mediaItem.src;
      mediaEl.controls = true;
      mediaEl.autoplay = true;
      mediaEl.loop = true;
      mediaEl.muted = false;
      // Add video class for enhanced vignette
      this.mediaContainer.classList.add('has-video');
    } else if (typeof mediaItem === 'string') {
      // Path string - determine if image or video
      const ext = mediaItem.split('.').pop().toLowerCase();
      if (['mp4', 'webm', 'mov'].includes(ext)) {
        mediaEl = document.createElement('video');
        mediaEl.src = mediaItem;
        mediaEl.controls = true;
        mediaEl.autoplay = true;
        mediaEl.loop = true;
        mediaEl.muted = false;
        // Add video class for enhanced vignette
        this.mediaContainer.classList.add('has-video');
      } else {
        mediaEl = document.createElement('img');
        mediaEl.src = mediaItem;
        mediaEl.alt = this.currentTitle;
      }
    }
    
    if (mediaEl) {
      // Handle video audio coordination with background music
      if (mediaEl.tagName === 'VIDEO' && this.audioManager) {
        // Pause background music when video plays
        mediaEl.addEventListener('play', () => {
          this.audioManager.pause();
        });
        
        // Resume background music when video pauses or ends
        mediaEl.addEventListener('pause', () => {
          this.audioManager.resume();
        });
        
        mediaEl.addEventListener('ended', () => {
          this.audioManager.resume();
        });
      }
      
      // Detect orientation when media loads (removed for performance)
      
      this.mediaContainer.appendChild(mediaEl);
    }
    
    // Update counter
    this.updateCounter();
  }
  
  /**
   * Set adaptive orientation based on media dimensions
   */
  setOrientation(mediaEl) {
    // Orientation detection removed for performance
  }
  
  /**
   * Update navigation buttons visibility
   */
  updateNavigation() {
    if (this.currentImages.length <= 1) {
      this.prevBtn.classList.add('hidden');
      this.nextBtn.classList.add('hidden');
      this.counter.classList.add('hidden');
    } else {
      this.prevBtn.classList.remove('hidden');
      this.nextBtn.classList.remove('hidden');
      this.counter.classList.remove('hidden');
    }
  }
  
  /**
   * Update image counter
   */
  updateCounter() {
    if (this.currentImages.length > 1) {
      this.counter.textContent = `${this.currentIndex + 1} / ${this.currentImages.length}`;
    }
  }
  
  /**
   * Show next image
   */
  showNext() {
    const nextIndex = (this.currentIndex + 1) % this.currentImages.length;
    this.displayMedia(nextIndex);
  }
  
  /**
   * Show previous image
   */
  showPrev() {
    const prevIndex = (this.currentIndex - 1 + this.currentImages.length) % this.currentImages.length;
    this.displayMedia(prevIndex);
  }
  
  /**
   * Close modal
   */
  close() {
    if (!this.isOpen) return;
    
    this.modal.classList.remove('active');
    this.modal.setAttribute('aria-hidden', 'true');
    this.isOpen = false;
    
    // Resume background music when modal closes
    if (this.audioManager) {
      this.audioManager.resume();
    }
    
    // Remove keyboard listener
    document.removeEventListener('keydown', this.handleKeyPress);
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clear content
    setTimeout(() => {
      this.mediaContainer.innerHTML = '';
      this.currentImages = [];
      this.currentIndex = 0;
    }, 300);
  }
  
  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event
   */
  handleKeyPress(event) {
    if (!this.isOpen) return;
    
    switch(event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowLeft':
        if (this.currentImages.length > 1) this.showPrev();
        break;
      case 'ArrowRight':
        if (this.currentImages.length > 1) this.showNext();
        break;
    }
  }
  
  /**
   * Clean up
   */
  destroy() {
    this.close();
    document.removeEventListener('keydown', this.handleKeyPress);
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrbModal;
}
