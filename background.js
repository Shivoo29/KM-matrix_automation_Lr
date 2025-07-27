let bomData = [];

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // Manual PDF download for part numbers
  if (message.action === 'startDownload') {
    const partNumbers = message.partNumbers;

    for (const part of partNumbers) {
      const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${part}`;
      const tab = await chrome.tabs.create({ url, active: false });

      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (partNumber, tabId) => {
            const waitForViewer = () => {
              return new Promise((resolve) => {
                const interval = setInterval(() => {
                  console.log('🔍 Searching for PDF viewer...');
                  
                  const candidates = [
                    ...document.querySelectorAll('iframe'),
                    ...document.querySelectorAll('embed'),
                    ...document.querySelectorAll('object'),
                    ...document.querySelectorAll('a[href*=".pdf"]'),
                    ...document.querySelectorAll('[src*="pdf"]'),
                    ...document.querySelectorAll('[data-src*="pdf"]')
                  ];

                  console.log(`Found ${candidates.length} potential PDF elements`);

                  for (const el of candidates) {
                    let pdfUrl = null;
                    
                    // Check different attributes for PDF URL
                    if (el.src && (el.src.includes('pdf') || el.src.includes('viewer'))) {
                      pdfUrl = el.src;
                    } else if (el.href && el.href.includes('.pdf')) {
                      pdfUrl = el.href;
                    } else if (el.dataset && el.dataset.src && el.dataset.src.includes('pdf')) {
                      pdfUrl = el.dataset.src;
                    }
                    
                    if (pdfUrl && pdfUrl.startsWith('http')) {
                      console.log('✅ Found PDF URL:', pdfUrl);
                      clearInterval(interval);
                      resolve(pdfUrl);
                      return;
                    }
                  }
                  
                  // Also check for any download links or buttons
                  const downloadButtons = document.querySelectorAll('button, a, span');
                  for (const btn of downloadButtons) {
                    if (btn.textContent && (
                      btn.textContent.toLowerCase().includes('download') ||
                      btn.textContent.toLowerCase().includes('pdf') ||
                      btn.textContent.toLowerCase().includes('view')
                    )) {
                      console.log('Found potential download element:', btn);
                      // Try clicking it
                      btn.click();
                    }
                  }
                }, 2000); // Increased interval to 2 seconds

                setTimeout(() => {
                  console.log('⏰ Timeout reached, no PDF found');
                  clearInterval(interval);
                  resolve(null);
                }, 45000); // Increased timeout to 45 seconds
              });
            };

            const viewerSrc = await waitForViewer();

            if (viewerSrc) {
              chrome.runtime.sendMessage({
                action: 'download',
                url: viewerSrc,
                partNumber,
                tabId
              });
            } else {
              chrome.runtime.sendMessage({
                action: 'progress',
                log: `❌ No viewer or drawing found for ${partNumber}`,
                tabId
              });
            }
          },
          args: [part, tab.id]
        });
      }, 8000); // Increased initial delay to 8 seconds
    }

    sendResponse({ status: "started" });
  }

  // BOM scraping and PDF download
  if (message.action === 'scrapeBOM') {
    const partNumbers = message.partNumbers;

    for (const part of partNumbers) {
      const url = `https://kmmatrix.fremont.lamrc.net/BOMFinder?q=${part}`;
      const tab = await chrome.tabs.create({ url, active: false });

      // Inject content script after page loads
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['contentScript.js']
        });
      }, 8000); // Increased delay
    }

    sendResponse({ status: "BOM scraping started" });
  }

  // Receive BOM data from content script
  if (message.action === 'bomExtracted') {
    bomData = message.parts;
    console.log('📦 BOM Data Extracted:', bomData);

    for (const part of bomData) {
      const partNumber = part.partNumber;
      const nestingLevel = part.nestingLevel;
      const folderPath = `${bomData[0].partNumber}/${'sub/'.repeat(nestingLevel)}${partNumber}.pdf`;

      const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${partNumber}`;
      const tab = await chrome.tabs.create({ url, active: false });

      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (partNumber, tabId, folderPath) => {
            const waitForViewer = () => {
              return new Promise((resolve) => {
                let attempts = 0;
                const maxAttempts = 20;
                
                const interval = setInterval(() => {
                  attempts++;
                  console.log(`🔍 Attempt ${attempts}/${maxAttempts} - Searching for PDF for ${partNumber}...`);
                  
                  // More comprehensive search for PDF elements
                  const candidates = [
                    ...document.querySelectorAll('iframe'),
                    ...document.querySelectorAll('embed'),
                    ...document.querySelectorAll('object'),
                    ...document.querySelectorAll('a[href*=".pdf"]'),
                    ...document.querySelectorAll('[src*="pdf"]'),
                    ...document.querySelectorAll('[data-src*="pdf"]'),
                    ...document.querySelectorAll('[href*="pdf"]')
                  ];

                  console.log(`Found ${candidates.length} potential elements`);

                  for (const el of candidates) {
                    let pdfUrl = null;
                    
                    // Check multiple attributes
                    if (el.src && el.src.startsWith('http')) {
                      pdfUrl = el.src;
                    } else if (el.href && el.href.startsWith('http')) {
                      pdfUrl = el.href;
                    } else if (el.dataset && el.dataset.src && el.dataset.src.startsWith('http')) {
                      pdfUrl = el.dataset.src;
                    }
                    
                    if (pdfUrl) {
                      console.log('✅ Found potential PDF URL:', pdfUrl);
                      clearInterval(interval);
                      resolve(pdfUrl);
                      return;
                    }
                  }
                  
                  // If no direct PDF found, try to trigger download
                  if (attempts === 5) {
                    const downloadTriggers = document.querySelectorAll('button, a, span, div');
                    for (const trigger of downloadTriggers) {
                      const text = trigger.textContent?.toLowerCase() || '';
                      const title = trigger.title?.toLowerCase() || '';
                      const onclick = trigger.onclick?.toString() || '';
                      
                      if (text.includes('download') || text.includes('pdf') || 
                          title.includes('download') || title.includes('pdf') ||
                          onclick.includes('download') || onclick.includes('pdf')) {
                        console.log('🎯 Trying to click download trigger:', trigger);
                        trigger.click();
                        break;
                      }
                    }
                  }

                  if (attempts >= maxAttempts) {
                    console.log('⏰ Max attempts reached');
                    clearInterval(interval);
                    resolve(null);
                  }
                }, 2500);
              });
            };

            const viewerSrc = await waitForViewer();

            if (viewerSrc) {
              chrome.runtime.sendMessage({
                action: 'downloadWithPath',
                url: viewerSrc,
                partNumber,
                folderPath,
                tabId
              });
            } else {
              chrome.runtime.sendMessage({
                action: 'progress',
                log: `❌ No PDF found for ${partNumber}`,
                tabId
              });
            }
          },
          args: [partNumber, tab.id, folderPath]
        });
      }, 10000); // Increased delay to 10 seconds
    }
  }

  // Handle download with folder path
  if (message.action === 'downloadWithPath') {
    chrome.downloads.download({
      url: message.url,
      filename: message.folderPath
    });

    if (message.tabId) {
      setTimeout(() => {
        chrome.tabs.remove(message.tabId);
      }, 2000);
    }
  }

  // Handle individual PDF download
  if (message.action === 'download') {
    const filename = `${message.partNumber || 'file'}.pdf`;
    chrome.downloads.download({
      url: message.url,
      filename
    });

    if (message.tabId) {
      setTimeout(() => {
        chrome.tabs.remove(message.tabId);
      }, 2000);
    }
  }

  // Log progress and close tab
  if (message.action === 'progress') {
    console.log(message.log);
    if (message.tabId) {
      setTimeout(() => {
        chrome.tabs.remove(message.tabId);
      }, 2000);
    }
  }

  return true;
});