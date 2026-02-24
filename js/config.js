/**
 * Portfolio Data Configuration
 * Defines the structure and content for portfolio items displayed as bubbles
 * 
 * Each portfolio item can have a dedicated folder in assets/portfolios/{id}/
 * Images in that folder will be automatically loaded into the detail view cards
 */

// Debug: Log that config.js is loading
console.log('config.js is loading...');

/**
 * Portfolio data array
 * Each item represents a project/work to be displayed as a bubble in the 3D museum
 * 
 * Structure:
 * - id: Unique identifier (also used as folder name in assets/portfolios/)
 * - title: Display name
 * - description: Brief description
 * - image: Main bubble image (in assets/images/)
 * - color: Bubble color
 * - folder: Optional custom folder name (defaults to id)
 */
const portfolioData = [
  {
    id: 1,
    title: "CupofJay",
    description: "CupofJay - A creative portfolio showcasing innovative designs and artistic expressions.",
    image: "assets/images/cupofjay.jpg",
    color: "#0000FF",
    folder: "cupofjay", // Folder: assets/portfolios/cupofjay/
    cardTitles: {
      overview: "My Mini Me",
      gallery: "Elyu",
      technologies: "Throwback Tiktok",
      details: "NYERK",
      links: "With Mama",
      contact: "Little Cookie <3",
      placeholder1: "Little Jay with Ate Chuchay",
      placeholder2: "With Kuya, wTito & Cousins",
      placeholder3: "First swimming with friends",
      placeholder4: "Enchanted Kingdom Throwback pic",
      placeholder5: "Calica Cousins",
      placeholder6: "Lakeside Sunset pic",
      placeholder7: "Memory 7",
      placeholder8: "Memory 8",
      placeholder9: "Memory 9",
      placeholder10: "Memory 10",
      placeholder11: "Memory 11",
      placeholder12: "Memory 12",
      placeholder13: "Memory 13",
      placeholder14: "Memory 14",
      placeholder15: "Memory 15",
      placeholder16: "Memory 16",
      placeholder17: "Memory 17",
      placeholder18: "Memory 18",
      placeholder19: "Memory 19",
      placeholder20: "Memory 20",
      placeholder21: "Memory 21"
    }
  },
  {
    id: 2,
    title: "Kylabidaboo",
    description: "Kylabidaboo - Unique and vibrant creative works that push the boundaries of imagination.",
    image: "assets/images/kylabidaboo.jpg",
    color: "#FF1493",
    folder: "kylabidaboo",
    cardTitles: {
      overview: "Little Pookielay",
      gallery: "Pem: besfriend in fur <3",
      technologies: "Best Birthday with friends",
      details: "IT Gang",
      links: "With Papa & Kuya",
      contact: "With my soul sister",
      placeholder1: "College buddies",
      placeholder2: "With My fav cousin",
      placeholder3: "With ante and aleng",
      placeholder4: "My Family",
      placeholder5: "BFFs",
      placeholder6: "Wacky with Fam",
      placeholder7: "Memory 7",
      placeholder8: "Memory 8",
      placeholder9: "Memory 9",
      placeholder10: "Memory 10",
      placeholder11: "Memory 11",
      placeholder12: "Memory 12",
      placeholder13: "Memory 13",
      placeholder14: "Memory 14",
      placeholder15: "Memory 15",
      placeholder16: "Memory 16",
      placeholder17: "Memory 17",
      placeholder18: "Memory 18",
      placeholder19: "Memory 19",
      placeholder20: "Memory 20",
      placeholder21: "Memory 21"
    }
  },
  {
    id: 3,
    title: "Jnnzth",
    description: "Jnnzth - Innovative solutions and creative approaches to modern challenges.",
    image: "assets/images/jnnzth.jpg",
    color: "#90E24A",
    folder: "jnnzth",
    cardTitles: {
      overview: "Baby Janin",
      gallery: "OJT pic 1",
      technologies: "OJT Pic 2",
      details: "With Classmates",
      links: "With Cousins",
      contact: "My Life",
      placeholder1: "Fav pic with Lola",
      placeholder2: "OJT pic 3",
      placeholder3: "With Pookielay",
      placeholder4: "With Mom",
      placeholder5: "Work Friends",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 4,
    title: "Bonchan",
    description: "Bonchan - Artistic excellence and creative mastery in every project.",
    image: "assets/images/bonchan.jpg",
    color: "#FF4500",
    folder: "bonchan",
    cardTitles: {
      overview: "Overview",
      gallery: "Gallery",
      technologies: "Technologies",
      details: "Details",
      links: "Links",
      contact: "Contact",
      placeholder1: "Placeholder 1",
      placeholder2: "Placeholder 2",
      placeholder3: "Placeholder 3",
      placeholder4: "Placeholder 4",
      placeholder5: "Placeholder 5",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 5,
    title: "Beyl",
    description: "Beyl - Cutting-edge designs that blend functionality with aesthetic appeal.",
    image: "assets/images/beyl.jpg",
    color: "#FFD700",
    folder: "beyl",
    cardTitles: {
      overview: "Bebi Beyl",
      gallery: "Swimming Vid",
      technologies: "OJT 1",
      details: "DevCon Trip",
      links: "OJT Preperation",
      contact: "OJT 2",
      placeholder1: "Swimming Pic 1",
      placeholder2: "Gala",
      placeholder3: "Grad Pictorial",
      placeholder4: "Tawa",
      placeholder5: "Swim Pic 2",
      placeholder6: "Capstone",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 6,
    title: "Juan.through.tree",
    description: "Juan.through.tree - Nature-inspired creativity and organic design philosophy.",
    image: "assets/images/juan.jpg",
    color: "#8B4513",
    folder: "juan",
    cardTitles: {
      overview: "Overview",
      gallery: "Gallery",
      technologies: "Technologies",
      details: "Details",
      links: "Links",
      contact: "Contact",
      placeholder1: "Placeholder 1",
      placeholder2: "Placeholder 2",
      placeholder3: "Placeholder 3",
      placeholder4: "Placeholder 4",
      placeholder5: "Placeholder 5",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 7,
    title: "Shine",
    description: "Shine - Brilliant concepts that illuminate the path to creative excellence.",
    image: "assets/images/shine.jpg",
    color: "#FFFFFF",
    folder: "shine",
    cardTitles: {
      overview: "Overview",
      gallery: "Gallery",
      technologies: "Technologies",
      details: "Details",
      links: "Links",
      contact: "Contact",
      placeholder1: "Placeholder 1",
      placeholder2: "Placeholder 2",
      placeholder3: "Placeholder 3",
      placeholder4: "Placeholder 4",
      placeholder5: "Placeholder 5",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 8,
    title: "Mfghozt",
    description: "Mfghozt - Mysterious and captivating designs that leave a lasting impression.",
    image: "assets/images/mfghozt.jpg",
    color: "#000000",
    folder: "mfghozt",
    cardTitles: {
      overview: "Overview",
      gallery: "Gallery",
      technologies: "Technologies",
      details: "Details",
      links: "Links",
      contact: "Contact",
      placeholder1: "Placeholder 1",
      placeholder2: "Placeholder 2",
      placeholder3: "Placeholder 3",
      placeholder4: "Placeholder 4",
      placeholder5: "Placeholder 5",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 9,
    title: "Cian",
    description: "Cian - Bold and dynamic creative solutions for the modern world.",
    image: "assets/images/cian.jpg",
    color: "#FF8C00",
    folder: "cian",
    cardTitles: {
      overview: "Overview",
      gallery: "Gallery",
      technologies: "Technologies",
      details: "Details",
      links: "Links",
      contact: "Contact",
      placeholder1: "Placeholder 1",
      placeholder2: "Placeholder 2",
      placeholder3: "Placeholder 3",
      placeholder4: "Placeholder 4",
      placeholder5: "Placeholder 5",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 10,
    title: "Well Known Renjard",
    description: "Well Known Renjard - Renowned for exceptional quality and innovative thinking.",
    image: "assets/images/renjard.jpg",
    color: "#9400D3",
    folder: "renjard",
    cardTitles: {
      overview: "Overview",
      gallery: "Gallery",
      technologies: "Technologies",
      details: "Details",
      links: "Links",
      contact: "Contact",
      placeholder1: "Placeholder 1",
      placeholder2: "Placeholder 2",
      placeholder3: "Placeholder 3",
      placeholder4: "Placeholder 4",
      placeholder5: "Placeholder 5",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 11,
    title: "Pibee",
    description: "Pibee - Sweet and delightful designs that bring joy to every project.",
    image: "assets/images/pibee.jpg",
    color: "#00CED1",
    folder: "pibee",
    cardTitles: {
      overview: "Overview",
      gallery: "Gallery",
      technologies: "Technologies",
      details: "Details",
      links: "Links",
      contact: "Contact",
      placeholder1: "Placeholder 1",
      placeholder2: "Placeholder 2",
      placeholder3: "Placeholder 3",
      placeholder4: "Placeholder 4",
      placeholder5: "Placeholder 5",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 12,
    title: "Jem",
    description: "Jem - Precious and refined creative works that sparkle with originality.",
    image: "assets/images/jem.jpg",
    color: "#4B0082",
    folder: "jem",
    cardTitles: {
      overview: "Overview",
      gallery: "Gallery",
      technologies: "Technologies",
      details: "Details",
      links: "Links",
      contact: "Contact",
      placeholder1: "Placeholder 1",
      placeholder2: "Placeholder 2",
      placeholder3: "Placeholder 3",
      placeholder4: "Placeholder 4",
      placeholder5: "Placeholder 5",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 13,
    title: "KCCalip",
    description: "KCCalip - Professional excellence and creative innovation in every detail.",
    image: "assets/images/kccalip.jpg",
    color: "#32CD32",
    folder: "kccalip",
    cardTitles: {
      overview: "Overview",
      gallery: "Gallery",
      technologies: "Technologies",
      details: "Details",
      links: "Links",
      contact: "Contact",
      placeholder1: "Placeholder 1",
      placeholder2: "Placeholder 2",
      placeholder3: "Placeholder 3",
      placeholder4: "Placeholder 4",
      placeholder5: "Placeholder 5",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  },
  {
    id: 14,
    title: "Alyssa",
    description: "Alyssa - Elegant and sophisticated designs that embody timeless beauty.",
    image: "assets/images/alyssa.jpg",
    color: "#FF6347",
    folder: "alyssa",
    cardTitles: {
      overview: "Overview",
      gallery: "Gallery",
      technologies: "Technologies",
      details: "Details",
      links: "Links",
      contact: "Contact",
      placeholder1: "Placeholder 1",
      placeholder2: "Placeholder 2",
      placeholder3: "Placeholder 3",
      placeholder4: "Placeholder 4",
      placeholder5: "Placeholder 5",
      placeholder6: "Placeholder 6",
      placeholder7: "Placeholder 7",
      placeholder8: "Placeholder 8",
      placeholder9: "Placeholder 9",
      placeholder10: "Placeholder 10",
      placeholder11: "Placeholder 11",
      placeholder12: "Placeholder 12",
      placeholder13: "Placeholder 13",
      placeholder14: "Placeholder 14",
      placeholder15: "Placeholder 15",
      placeholder16: "Placeholder 16",
      placeholder17: "Placeholder 17",
      placeholder18: "Placeholder 18",
      placeholder19: "Placeholder 19",
      placeholder20: "Placeholder 20",
      placeholder21: "Placeholder 21"
    }
  }
];

/**
 * Validates a portfolio item to ensure it has all required fields
 * @param {Object} item - Portfolio item to validate
 * @returns {Object} Validation result with isValid flag and error messages
 */
function validatePortfolioItem(item) {
  const errors = [];
  
  // Check required fields
  if (!item.id || typeof item.id !== 'number') {
    errors.push('Portfolio item must have a valid numeric id');
  }
  
  if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') {
    errors.push('Portfolio item must have a non-empty title string');
  }
  
  if (!item.description || typeof item.description !== 'string' || item.description.trim() === '') {
    errors.push('Portfolio item must have a non-empty description string');
  }
  
  // Check optional fields if present
  if (item.image !== undefined && typeof item.image !== 'string') {
    errors.push('Portfolio item image must be a string if provided');
  }
  
  if (item.color !== undefined) {
    if (typeof item.color !== 'string') {
      errors.push('Portfolio item color must be a string if provided');
    } else if (!/^#[0-9A-Fa-f]{6}$/.test(item.color)) {
      errors.push('Portfolio item color must be a valid hex color code (e.g., #4A90E2)');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates an array of portfolio items
 * @param {Array} data - Array of portfolio items to validate
 * @returns {Object} Validation result with isValid flag, error messages, and valid items
 */
function validatePortfolioData(data) {
  if (!Array.isArray(data)) {
    return {
      isValid: false,
      errors: ['Portfolio data must be an array'],
      validItems: []
    };
  }
  
  if (data.length === 0) {
    return {
      isValid: false,
      errors: ['Portfolio data array cannot be empty'],
      validItems: []
    };
  }
  
  const allErrors = [];
  const validItems = [];
  const seenIds = new Set();
  
  data.forEach((item, index) => {
    const validation = validatePortfolioItem(item);
    
    if (!validation.isValid) {
      allErrors.push(`Item ${index}: ${validation.errors.join(', ')}`);
    } else {
      // Check for duplicate IDs
      if (seenIds.has(item.id)) {
        allErrors.push(`Item ${index}: Duplicate id ${item.id} found`);
      } else {
        seenIds.add(item.id);
        validItems.push(item);
      }
    }
  });
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    validItems: validItems
  };
}

// Validate the portfolio data on load
const dataValidation = validatePortfolioData(portfolioData);
if (!dataValidation.isValid) {
  console.error('Portfolio data validation failed:', dataValidation.errors);
} else {
  console.log('Portfolio data loaded successfully:', portfolioData.length, 'items');
}

// Make sure portfolioData is available globally
window.portfolioData = portfolioData;
window.validatePortfolioItem = validatePortfolioItem;
window.validatePortfolioData = validatePortfolioData;

// Export for use in other modules (Node.js compatibility)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    portfolioData,
    validatePortfolioItem,
    validatePortfolioData
  };
}
