/**
 * AudioManager Class
 * Manages background music and video audio coordination
 */
class AudioManager {
  constructor() {
    this.bgMusic = null;
    this.isPlaying = false;
    this.volume = 1.0; // Default volume (30%)
    
    // Bind methods
    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
    this.setVolume = this.setVolume.bind(this);
  }
  
  /**
   * Initialize background music
   * @param {string} audioPath - Path to the audio file
   */
  init(audioPath) {
    if (!audioPath) {
      console.warn('No audio path provided for background music');
      return;
    }
    
    // Create audio element
    this.bgMusic = new Audio(audioPath);
    this.bgMusic.loop = true;
    this.bgMusic.volume = this.volume;
    
    // Add event listeners
    this.bgMusic.addEventListener('play', () => {
      this.isPlaying = true;
      console.log('Background music started');
    });
    
    this.bgMusic.addEventListener('pause', () => {
      this.isPlaying = false;
      console.log('Background music paused');
    });
    
    this.bgMusic.addEventListener('error', (e) => {
      console.error('Error loading background music:', e);
    });
    
    console.log('AudioManager initialized with:', audioPath);
  }
  
  /**
   * Play background music
   */
  play() {
    if (!this.bgMusic) {
      console.warn('Background music not initialized');
      return;
    }
    
    const playPromise = this.bgMusic.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Playback started successfully
        })
        .catch(error => {
          console.warn('Background music autoplay prevented:', error);
          // Show a play button or wait for user interaction
        });
    }
  }
  
  /**
   * Pause background music
   */
  pause() {
    if (!this.bgMusic) return;
    
    if (!this.bgMusic.paused) {
      this.bgMusic.pause();
    }
  }
  
  /**
   * Resume background music
   */
  resume() {
    if (!this.bgMusic) return;
    
    if (this.bgMusic.paused) {
      this.play();
    }
  }
  
  /**
   * Set volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    if (!this.bgMusic) return;
    
    this.volume = Math.max(0, Math.min(1, volume));
    this.bgMusic.volume = this.volume;
  }
  
  /**
   * Stop background music
   */
  stop() {
    if (!this.bgMusic) return;
    
    this.bgMusic.pause();
    this.bgMusic.currentTime = 0;
  }
  
  /**
   * Clean up
   */
  destroy() {
    if (this.bgMusic) {
      this.stop();
      this.bgMusic = null;
    }
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}
