// content/content.js

// Global state for content script
let currentPage = 'unknown';
let extractedData = {};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'processPart') {
    processPart(msg.partNumber).then(sendResponse);
    return true; // Keep message channel open for async response
  } else if (msg.action === 'extractData') {
    const data = extractPageData();
    sendResponse(data);
  }
});

// Main processing function
async function processPart(partNumber) {
  try {
    // Determine current page type
    currentPage = detectPageType();
    
    switch (currentPage) {
      case 'search':
        return await handleSearchPage(partNumber);
      case 'drawing':
        return await handleDrawingPage(partNumber);
      case 'bom':
        return await handleBOMPage(partNumber);
      default:
        throw new Error(`Unknown page type: ${currentPage}`);
    }
  } catch (error) {
    console.error('Error processing part:', error);
    return { success: false, error: error.message };
  }
}

// Detect the type of page we're on
function detectPageType() {
  const url = window.location.href;
  const path = window.location.pathname;
  
  if (path.includes('/Search') || path.includes('/search')) {
    return 'search';
  } else if (path.includes('/DViewer') || path.includes('/drawing')) {
    return 'drawing';
  } else if (path.includes('/BOM') || path.includes('/bom') || document.querySelector('.bom-tree')) {
    return 'bom';
  }
  
  return 'unknown';
}

// Handle search results page
async function handleSearchPage(partNumber) {
  const data = {
    pageType: 'search',
    partNumber: partNumber,
    searchResults: [],
    bomLink: null
  };
  
  // Extract search results
  const resultRows = document.querySelectorAll('tr[data-part], .search-result-row, tbody tr');
  resultRows.forEach(row => {
    const partCell = row.querySelector('.part-number, td:first-child, [data-part]');
    const descCell = row.querySelector('.description, td:nth-child(2)');
    
    if (partCell) {
      const partNum = partCell.textContent.trim();
      const description = descCell ? descCell.textContent.trim() : '';
      
      if (partNum && partNum.match(/^\d{3}-\d{6}-\d{3}$/)) {
        data.searchResults.push({
          partNumber: partNum,
          description: description
        });
      }
    }
  });
  
  // Find BOM Navigator link
  const bomLink = Array.from(document.querySelectorAll('a')).find(a => 
    a.textContent.includes('BOM Navigator') || 
    a.href.includes('BOM') ||
    a.getAttribute('onclick')?.includes('BOM')
  );
  
  if (bomLink) {
    data.bomLink = {
      text: bomLink.textContent.trim(),
      href: bomLink.href,
      onclick: bomLink.getAttribute('onclick')
    };
  }
  
  // Find compass icon (drawing viewer link)
  const compassIcon = document.querySelector('a[href*="DViewer"], a[href*="drawing"], .compass-icon, [title*="drawing"]');
  if (compassIcon) {
    data.drawingLink = compassIcon.href || compassIcon.getAttribute('onclick');
  }
  
  return { success: true, data };
}

// Handle drawing viewer page
async function handleDrawingPage(partNumber) {
  const data = {
    pageType: 'drawing',
    partNumber: partNumber,
    subParts: [],
    downloadLink: null
  };
  
  // Extract sub-parts from left sidebar
  const subPartSelectors = [
    '.part-list-table tbody tr',
    'tr[data-part]',
    '.sidebar-part-list tr',
    '.drawing-parts tr'
  ];
  
  for (const selector of subPartSelectors) {
    const rows = document.querySelectorAll(selector);
    if (rows.length > 0) {
      rows.forEach(row => {
        const partCell = row.querySelector('.part-number, td:first-child, [data-part]');
        const descCell = row.querySelector('.description, td:nth-child(2)');
        const revCell = row.querySelector('.revision, td:nth-child(3)');
        const qtyCell = row.querySelector('.quantity, td:nth-child(4)');
        
        if (partCell) {
          const partNum = partCell.textContent.trim();
          if (partNum && partNum.match(/^\d{3}-\d{6}-\d{3}$/)) {
            data.subParts.push({
              partNumber: partNum,
              description: descCell ? descCell.textContent.trim() : '',
              revision: revCell ? revCell.textContent.trim() : '',
              quantity: qtyCell ? qtyCell.textContent.trim() : ''
            });
          }
        }
      });
      break; // Use first selector that finds results
    }
  }
  
  // Find download link
  const downloadSelectors = [
    'a[href*="download"]',
    'a[href*=".pdf"]',
    '.download-button',
    'button[onclick*="download"]',
    '[title*="download"]'
  ];
  
  for (const selector of downloadSelectors) {
    const downloadElement = document.querySelector(selector);
    if (downloadElement) {
      data.downloadLink = {
        href: downloadElement.href,
        onclick: downloadElement.getAttribute('onclick'),
        text: downloadElement.textContent.trim()
      };
      break;
    }
  }
  
  return { success: true, data };
}

// Handle BOM navigator page
async function handleBOMPage(partNumber) {
  const data = {
    pageType: 'bom',
    partNumber: partNumber,
    bomParts: []
  };
  
  // Extract BOM parts
  const bomSelectors = [
    '.bom-tree .part-link',
    'a[href*="partnumber"]',
    '.bom-part a',
    'tr[data-part] a'
  ];
  
  for (const selector of bomSelectors) {
    const links = document.querySelectorAll(selector);
    if (links.length > 0) {
      links.forEach(link => {
        const partNumber = link.textContent.trim();
        if (partNumber && partNumber.match(/^\d{3}-\d{6}-\d{3}$/)) {
          data.bomParts.push({
            partNumber: partNumber,
            href: link.href,
            onclick: link.getAttribute('onclick')
          });
        }
      });
      break; // Use first selector that finds results
    }
  }
  
  return { success: true, data };
}

// Extract data from current page (general function)
function extractPageData() {
  const pageType = detectPageType();
  const data = {
    pageType: pageType,
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString()
  };
  
  switch (pageType) {
    case 'search':
      return { ...data, ...extractSearchData() };
    case 'drawing':
      return { ...data, ...extractDrawingData() };
    case 'bom':
      return { ...data, ...extractBOMData() };
    default:
      return data;
  }
}

function extractSearchData() {
  return {
    searchResults: Array.from(document.querySelectorAll('tr[data-part], .search-result-row')).map(row => {
      const partCell = row.querySelector('.part-number, td:first-child');
      return partCell ? partCell.textContent.trim() : '';
    }).filter(Boolean)
  };
}

function extractDrawingData() {
  return {
    subParts: Array.from(document.querySelectorAll('.part-list-table tbody tr')).map(row => {
      const partCell = row.querySelector('.part-number, td:first-child');
      return partCell ? partCell.textContent.trim() : '';
    }).filter(Boolean)
  };
}

function extractBOMData() {
  return {
    bomParts: Array.from(document.querySelectorAll('.bom-tree .part-link')).map(link => 
      link.textContent.trim()
    ).filter(Boolean)
  };
}

// Utility function to wait for element
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

// Utility function to simulate click
function simulateClick(element) {
  if (element) {
    element.click();
    return true;
  }
  return false;
}

// Export functions for background script
window.KMMatrixContent = {
  processPart,
  extractPageData,
  detectPageType,
  waitForElement,
  simulateClick
}; 