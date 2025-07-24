/**
 * This function handles the core logic for downloading a single PDF.
 * It opens the part viewer page in a hidden tab, injects a script to find the actual PDF URL,
 * and then sends a message back to trigger the download and close the tab.
 * @param {string} partNumber - The part number to download.
 * @param {string} filename - The full path where the file should be saved.
 */
async function processPartForPdf(partNumber, filename) {
  const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${partNumber}`;
  // The `active: false` option is critical. It ensures the new tab does NOT get focus.
  const tab = await chrome.tabs.create({ url, active: false });

  // Give the page a moment to start loading before injecting the script.
  setTimeout(() => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (partNum, tabId, fname) => {
        // This function is injected and runs on the DViewerX page.
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

            // Fail-safe timeout after 30 seconds.
            setTimeout(() => {
              clearInterval(interval);
              resolve(null);
            }, 30000);
          });
        };

        waitForViewer().then(viewerSrc => {
          if (viewerSrc) {
            // Found the PDF source, send it back for download.
            chrome.runtime.sendMessage({
              action: 'downloadFile',
              url: viewerSrc,
              filename: fname,
              tabId: tabId
            });
          } else {
            // Failed to find the PDF.
            chrome.runtime.sendMessage({
              action: 'logAndClose',
              log: `❌ No viewer or drawing found for ${partNum}`,
              tabId: tabId
            });
          }
        });
      },
      args: [partNumber, tab.id, filename]
    });
  }, 5000);
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // Listener for manual PDF downloads from the popup.
  if (message.action === 'startDownload') {
    for (const partNumber of message.partNumbers) {
      await processPartForPdf(partNumber, `${partNumber}.pdf`);
    }
    sendResponse({ status: "started" });
  }

  // Listener to start the main BOM scraping process.
  if (message.action === 'scrapeBOM') {
    const partNumber = message.partNumbers[0]; // We only process the first part number for BOM scraping.
    if (!partNumber) return;

    const url = `https://kmmatrix.fremont.lamrc.net/BOMFinder?q=${partNumber}`;
    // Open the BOM Finder page in a background tab using `active: false`.
    await chrome.tabs.create({ url, active: false });
    sendResponse({ status: "BOM scraping started" });
  }

  // Listener for when the content script has extracted all the BOM data.
  if (message.action === 'bomExtracted') {
    console.log('📦 BOM Data Extracted:', message.parts);
    // Close the now-unneeded BOM finder tab.
    if (sender.tab && sender.tab.id) {
      chrome.tabs.remove(sender.tab.id);
    }

    const bomData = message.parts;
    if (!bomData || bomData.length === 0) return;

    const mainPartNumber = bomData[0].partNumber;
    let parentPathStack = [];

    // Process all parts sequentially to avoid opening too many tabs at once.
    for (const [index, part] of bomData.entries()) {
      const { partNumber, nestingLevel } = part;
      if (!partNumber) continue;

      let downloadPath;

      if (nestingLevel === 0) {
        // This is the main part.
        downloadPath = `${partNumber}/${partNumber}.pdf`;
      } else {
        // This is a sub-part.
        while (parentPathStack.length >= nestingLevel) {
          parentPathStack.pop();
        }

        const isParent = (index + 1 < bomData.length) && (bomData[index + 1].nestingLevel > nestingLevel);
        let pathPrefix = `${mainPartNumber}/bom_parts/`;
        if (parentPathStack.length > 0) {
          pathPrefix += parentPathStack.join('/') + '/';
        }

        if (isParent) {
          downloadPath = `${pathPrefix}${partNumber}/${partNumber}.pdf`;
          parentPathStack.push(partNumber);
        } else {
          downloadPath = `${pathPrefix}${partNumber}.pdf`;
        }
      }

      console.log(`Queuing download for ${partNumber} to ${downloadPath}`);
      await processPartForPdf(partNumber, downloadPath);
    }
  }

  // Listener to handle the actual download and tab closing.
  if (message.action === 'downloadFile') {
    console.log(`⬇️ Downloading ${message.filename}`);
    chrome.downloads.download({
      url: message.url,
      filename: message.filename
    });
    if (message.tabId) {
      chrome.tabs.remove(message.tabId);
    }
  }

  // Listener to log errors and close tabs that failed.
  if (message.action === 'logAndClose') {
    console.log(message.log);
    if (message.tabId) {
      chrome.tabs.remove(message.tabId);
    }
  }

  return true; // Indicates that we will respond asynchronously.
});
