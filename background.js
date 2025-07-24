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
                  const candidates = [
                    ...document.querySelectorAll('iframe'),
                    ...document.querySelectorAll('embed'),
                    ...document.querySelectorAll('object')
                  ];

                  for (const el of candidates) {
                    if (el.src && el.src.startsWith('http')) {
                      clearInterval(interval);
                      resolve(el.src);
                      return;
                    }
                  }
                }, 1000);

                setTimeout(() => {
                  clearInterval(interval);
                  resolve(null);
                }, 30000);
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
      }, 5000);
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
      }, 5000);
    }

    sendResponse({ status: "BOM scraping started" });
  }

  // Receive BOM data from content script
  if (message.action === 'bomExtracted') {
    bomData = message.parts;
    console.log('📦 BOM Data Extracted:', bomData);

    if (bomData.length === 0) return;

    const mainPartNumber = bomData[0].partNumber;
    const mainPartUrl = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${mainPartNumber}`;
    // Download main part PDF
    chrome.downloads.download({
        url: mainPartUrl,
        filename: `${mainPartNumber}/${mainPartNumber}.pdf`
    });

    const parentPathStack = []; // a stack of part numbers representing the current path

    for (let i = 1; i < bomData.length; i++) {
        const part = bomData[i];
        const partNumber = part.partNumber;
        const nestingLevel = part.nestingLevel; // 1-based for sub-parts

        // Adjust the path stack based on nesting level
        while (parentPathStack.length >= nestingLevel) {
            parentPathStack.pop();
        }

        // Check if the current part is a parent of the next part
        const isParent = (i + 1 < bomData.length) && (bomData[i+1].nestingLevel > nestingLevel);

        let pathPrefix = `${mainPartNumber}/bom_parts/`;
        if (parentPathStack.length > 0) {
            pathPrefix += parentPathStack.join('/') + '/';
        }

        let downloadPath;
        if (isParent) {
            // It's a parent, download its PDF inside its own folder
            downloadPath = `${pathPrefix}${partNumber}/${partNumber}.pdf`;
        } else {
            // It's a leaf node, download it directly
            downloadPath = `${pathPrefix}${partNumber}.pdf`;
        }

        // Now, if it's a parent, push it to the stack for its children
        if (isParent) {
            parentPathStack.push(partNumber);
        }

        const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${partNumber}`;
        chrome.downloads.download({
            url,
            filename: downloadPath
        });
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
      chrome.tabs.remove(message.tabId);
    }
  }

  // Log progress and close tab
  if (message.action === 'progress') {
    console.log(message.log);
    if (message.tabId) {
      chrome.tabs.remove(message.tabId);
    }
  }

  return true;
});
