// content/inject.js

// Utility functions for DOM manipulation and automation

// Simulate a click on an element
function clickElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.click();
    return true;
  }
  return false;
}

// Fill a form field
function fillField(selector, value) {
  const field = document.querySelector(selector);
  if (field) {
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

// Wait for an element to appear
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

// Extract part numbers from various page layouts
function extractPartNumbers() {
  const partNumbers = [];
  
  // Search for part numbers in various formats
  const patterns = [
    /^\d{3}-\d{6}-\d{3}$/,  // Standard format: 810-341810-003
    /^\d{3}[A-Z]\d{6}\d{3}$/, // Format with letter: 853A41869003
    /^\d{3}\d{6}\d{3}$/     // No hyphens: 810341810003
  ];
  
  // Look in various selectors
  const selectors = [
    '.part-number',
    '[data-part]',
    'td:first-child',
    '.part-link',
    'a[href*="partnumber"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const text = element.textContent.trim();
      if (patterns.some(pattern => pattern.test(text))) {
        partNumbers.push(text);
      }
    });
  });
  
  return [...new Set(partNumbers)]; // Remove duplicates
}

// Find and click download links
function findDownloadLink() {
  const downloadSelectors = [
    'a[href*="download"]',
    'a[href*=".pdf"]',
    '.download-button',
    'button[onclick*="download"]',
    '[title*="download"]',
    '[title*="Download"]'
  ];
  
  for (const selector of downloadSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      return {
        element: element,
        href: element.href,
        onclick: element.getAttribute('onclick'),
        text: element.textContent.trim()
      };
    }
  }
  
  return null;
}

// Trigger download with custom filename
function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Navigate to drawing viewer for a part
function navigateToDrawing(partNumber) {
  const viewerUrl = `https://kmmatrix.fremont.lamrc.net/DViewer?partnumber=${encodeURIComponent(partNumber)}&partrev=C`;
  window.location.href = viewerUrl;
}

// Navigate to search page for a part
function navigateToSearch(partNumber) {
  const searchUrl = `https://kmmatrix.fremont.lamrc.net/Search?q=${encodeURIComponent(partNumber)}`;
  window.location.href = searchUrl;
}

// Click BOM Navigator link
function clickBOMNavigator() {
  const bomSelectors = [
    'a:contains("BOM Navigator")',
    'a[href*="BOM"]',
    'a[onclick*="BOM"]',
    '.bom-navigator-link'
  ];
  
  for (const selector of bomSelectors) {
    if (selector.includes(':contains')) {
      // Handle :contains pseudo-selector
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.textContent.includes('BOM Navigator')) {
          link.click();
          return true;
        }
      }
    } else {
      const element = document.querySelector(selector);
      if (element) {
        element.click();
        return true;
      }
    }
  }
  
  return false;
}

// Extract sub-parts from drawing viewer sidebar
function extractSubParts() {
  const subParts = [];
  const selectors = [
    '.part-list-table tbody tr',
    'tr[data-part]',
    '.sidebar-part-list tr',
    '.drawing-parts tr'
  ];
  
  for (const selector of selectors) {
    const rows = document.querySelectorAll(selector);
    if (rows.length > 0) {
      rows.forEach(row => {
        const partCell = row.querySelector('.part-number, td:first-child, [data-part]');
        if (partCell) {
          const partNumber = partCell.textContent.trim();
          if (partNumber.match(/^\d{3}-\d{6}-\d{3}$/)) {
            subParts.push(partNumber);
          }
        }
      });
      break;
    }
  }
  
  return subParts;
}

// Extract BOM parts from BOM navigator
function extractBOMParts() {
  const bomParts = [];
  const selectors = [
    '.bom-tree .part-link',
    'a[href*="partnumber"]',
    '.bom-part a',
    'tr[data-part] a'
  ];
  
  for (const selector of selectors) {
    const links = document.querySelectorAll(selector);
    if (links.length > 0) {
      links.forEach(link => {
        const partNumber = link.textContent.trim();
        if (partNumber.match(/^\d{3}-\d{6}-\d{3}$/)) {
          bomParts.push(partNumber);
        }
      });
      break;
    }
  }
  
  return bomParts;
}

// Utility to clean part number (remove hyphens)
function cleanPartNumber(partNumber) {
  return partNumber.replace(/-/g, '');
}

// Generate filename according to naming convention
function generateFilename(partNumber, level, type) {
  const cleanPart = cleanPartNumber(partNumber);
  return `LAM-${cleanPart}-L${level}-${type}.pdf`;
}

// Export functions for use by content script
window.KMMatrixInject = {
  clickElement,
  fillField,
  waitForElement,
  extractPartNumbers,
  findDownloadLink,
  triggerDownload,
  navigateToDrawing,
  navigateToSearch,
  clickBOMNavigator,
  extractSubParts,
  extractBOMParts,
  cleanPartNumber,
  generateFilename
}; 