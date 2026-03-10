/**
 * MuseumController.js
 * Manages the Three.js Museum as the primary view
 */

class MuseumController {
  constructor(container, portfolioData) {
    this.container = container;
    this.portfolioData = portfolioData;
    
    // View instance
    this.threejsMuseum = null;
    
    this.init();
  }
  
  async init() {
    // Clear container
    this.container.innerHTML = '';
    
    // Initialize Three.js museum directly
    await this.initializeThreeJSMuseum();
  }
  
  async initializeThreeJSMuseum() {
    try {
      // Dynamically import MainMuseum
      const { default: MainMuseum } = await import('./threejs/MainMuseum.js');
      
      this.threejsMuseum = new MainMuseum(this.container, this.portfolioData);
      
      // Listen for portfolio selection
      window.addEventListener('portfolioSelected', (event) => {
        const portfolio = event.detail;
        console.log('Portfolio selected from Three.js museum:', portfolio);
        
        // Trigger the detail view
        if (window.detailView) {
          window.detailView.show(portfolio.color, portfolio);
        }
      });
      
      console.log('Three.js museum initialized as primary view');
    } catch (error) {
      console.error('Failed to initialize Three.js museum:', error);
      this.container.innerHTML = 
        '<p style="color: white; text-align: center; padding: 2rem;">' +
        'Failed to load 3D museum. Please refresh the page.<br>' +
        'Error: ' + error.message + '</p>';
    }
  }
  
  dispose() {
    // Clean up Three.js museum
    if (this.threejsMuseum) {
      this.threejsMuseum.dispose();
      this.threejsMuseum = null;
    }
  }
}

// Make available globally
window.MuseumController = MuseumController;
