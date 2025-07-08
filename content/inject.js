// content/inject.js

// Utility functions for DOM manipulation and automation

// Simulate a click on an element
function clickElement(selector) { console.log('1');
  const element = document.querySelector(selector);
  if (element) {
    element.click();
    return true;
  }
  return false;
}

// Wait for an element to appear
function waitForElement(selector, timeout = 5000) { console.log('2');
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

// Find and click download links
function findDownloadLink() { console.log('3');
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
function triggerDownload(url, filename) { console.log('4');
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility to clean part number (remove hyphens)
function cleanPartNumber(partNumber) { console.log('5');
  return partNumber.replace(/-/g, '');
}

// Generate filename according to naming convention
function generateFilename(partNumber, level, type) { console.log('6')
  const cleanPart = cleanPartNumber(partNumber);
  return `LAM-${cleanPart}-L${level}-${type}.pdf`;
}

// Export functions for use by content script
window.KMMatrixInject = {
  clickElement,
  waitForElement,
  findDownloadLink,
  triggerDownload,
  cleanPartNumber,
  generateFilename
}; 