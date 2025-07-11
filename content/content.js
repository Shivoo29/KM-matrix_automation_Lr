// content/content.js

// Global state for content script
let currentPage = 'unknown';

// Listen for messages from background script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('6');
  if (msg.action === 'extractData') {
    const data = extractPageData();
    sendResponse(data);
  }
});

// Detect the type of page we're on
function detectPageType() {
  console.log('7');
  const path = window.location.pathname;
  
  if (path.includes('/Search') || path.includes('/search')) {
    return 'search';
  } else if (path.includes('/DViewerX') || path.includes('/drawing')) {
    return 'drawing';
  }
  
  return 'unknown';
}

// Extract data from current page (general function)
function extractPageData() {
  console.log('8');
  const pageType = detectPageType();
  const data = {
    pageType: pageType,
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString()
  };
  
  switch (pageType) {
    case 'drawing':
      return { ...data, ...extractDrawingData() };
    default:
      return data;
  }
}

function extractDrawingData() {
  console.log('9');
  return {
    downloadLink: findDownloadLink()
  };
}

function findDownloadLink() {
  console.log('10');
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
      return {
        href: downloadElement.href,
        onclick: downloadElement.getAttribute('onclick'),
        text: downloadElement.textContent.trim()
      };
    }
  }
  return null;
}

// Utility function to trigger a download
function triggerDownload(url, filename) {
  console.log('11');
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}