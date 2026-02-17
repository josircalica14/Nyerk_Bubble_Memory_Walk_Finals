/**
 * VisualEffects Class
 * Manages visual enhancements like floating particles and ambient effects
 */
class VisualEffects {
  constructor() {
    this.particleContainer = null;
    this.particles = [];
    this.particleCount = 80;
    this.isInitialized = false;
    
    // Shadow system properties
    this.shadowEnabled = true;
    this.lightSource = { x: 0, y: -500, z: 1000 }; // Light source position
    this.shadowIntensity = 0.3;
    this.shadowBlur = 20;
  }
  
  /**
   * Initialize visual effects
   */
  init() {
    if (this.isInitialized) return;
    
    // Create particle container
    this.createParticleContainer();
    
    // Create floating particles
    this.createFloatingParticles();
    
    // Create ambient fog
    this.createAmbientFog();
    
    // Add pedestals to memory hall orbs (will be called when detail view opens)
    this.setupPedestalObserver();
    
    // Aurora removed for performance
    
    this.isInitialized = true;
    console.log('Visual effects initialized');
  }
  
  /**
   * Setup observer for aurora in memory hall
   */
  setupAuroraObserver() {
    // Use MutationObserver to detect when detail view becomes active
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList && mutation.target.classList.contains('detail-view')) {
          if (mutation.target.classList.contains('active')) {
            // Detail view opened, add aurora
            setTimeout(() => {
              this.createAuroraBorealis();
            }, 100);
          } else {
            // Detail view closed, remove aurora
            this.removeAuroraBorealis();
          }
        }
      });
    });
    
    const detailView = document.getElementById('detail-view');
    if (detailView) {
      observer.observe(detailView, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }
  
  /**
   * Create aurora borealis effect in memory hall
   */
  createAuroraBorealis() {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    
    // Check if aurora already exists
    if (document.querySelector('.aurora-container')) {
      const existing = document.querySelector('.aurora-container');
      existing.style.display = 'block';
      return;
    }
    
    const auroraContainer = document.createElement('div');
    auroraContainer.className = 'aurora-container';
    
    // Create 3 aurora wave layers for depth
    for (let i = 0; i < 3; i++) {
      const wave = document.createElement('div');
      wave.className = 'aurora-wave';
      auroraContainer.appendChild(wave);
    }
    
    // Append to body (fixed position will keep it in viewport)
    document.body.appendChild(auroraContainer);
    this.auroraContainer = auroraContainer;
  }
  
  /**
   * Remove aurora borealis effect
   */
  removeAuroraBorealis() {
    if (this.auroraContainer) {
      // Just hide it instead of removing (for performance)
      this.auroraContainer.style.display = 'none';
    }
  }
  
  /**
   * Setup observer for pedestals in memory hall
   */
  createParticleContainer() {
    this.particleContainer = document.createElement('div');
    this.particleContainer.className = 'particle-container';
    document.body.appendChild(this.particleContainer);
  }
  
  /**
   * Create floating particles
   */
  createFloatingParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Random size between 3-8px (larger and more visible)
      const size = Math.random() * 5 + 3;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Random horizontal position
      particle.style.left = `${Math.random() * 100}%`;
      
      // Random animation duration between 15-30 seconds
      const duration = Math.random() * 15 + 15;
      
      // Random delay to stagger particles
      const delay = Math.random() * 10;
      
      // Use one of 5 float animations
      const animationIndex = (i % 5) + 1;
      particle.style.animation = `float${animationIndex} ${duration}s linear ${delay}s infinite`;
      
      this.particleContainer.appendChild(particle);
      this.particles.push(particle);
    }
  }
  
  /**
   * Create ambient fog effect
   */
  createAmbientFog() {
    const fog = document.createElement('div');
    fog.className = 'ambient-fog';
    document.body.appendChild(fog);
  }
  
  /**
   * Setup observer for pedestals in memory hall
   */
  setupPedestalObserver() {
    // Use MutationObserver to detect when detail view becomes active
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList && mutation.target.classList.contains('detail-view')) {
          if (mutation.target.classList.contains('active')) {
            // Detail view opened, add pedestals
            setTimeout(() => {
              this.addPedestals();
            }, 100);
          }
        }
      });
    });
    
    const detailView = document.getElementById('detail-view');
    if (detailView) {
      observer.observe(detailView, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }
  
  /**
   * Add pedestals to memory hall orbs
   */
  addPedestals() {
    const orbs = document.querySelectorAll('.wall-box:not(.title-card)');
    
    orbs.forEach(orb => {
      // Add enhanced reflection class
      orb.classList.add('enhanced-reflection');
      
      // Check if pedestal already exists
      if (orb.querySelector('.orb-pedestal')) return;
      
      const pedestal = document.createElement('div');
      pedestal.className = 'orb-pedestal';
      
      // Get orb title for label
      const title = orb.querySelector('h3')?.textContent || '';
      pedestal.setAttribute('data-label', title);
      
      orb.appendChild(pedestal);
    });
  }
  
  /**
   * Clean up visual effects
   */
  destroy() {
    // Remove aurora container
    this.removeAuroraBorealis();
    
    // Remove particle container
    if (this.particleContainer && this.particleContainer.parentNode) {
      this.particleContainer.parentNode.removeChild(this.particleContainer);
    }
    
    // Remove fog
    const fog = document.querySelector('.ambient-fog');
    if (fog && fog.parentNode) {
      fog.parentNode.removeChild(fog);
    }
    
    // Remove pedestals
    const pedestals = document.querySelectorAll('.orb-pedestal');
    pedestals.forEach(pedestal => {
      if (pedestal.parentNode) {
        pedestal.parentNode.removeChild(pedestal);
      }
    });
    
    this.particles = [];
    this.isInitialized = false;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisualEffects;
}
