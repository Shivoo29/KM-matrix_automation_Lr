let isRunning = false;
let queue = [];
let completed = 0;
let total = 0;
let currentTab = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'start') {
    if (isRunning) return;
    isRunning = true;
    queue = msg.parts;
    completed = 0;
    total = queue.length;
    processQueue(msg.folder);
  } else if (msg.action === 'stop') {
    isRunning = false;
    queue = [];
    chrome.runtime.sendMessage({ action: 'done' });
  } else if (msg.action === 'partComplete') {
    completed++;
    chrome.runtime.sendMessage({ 
      action: 'progress', 
      completed, 
      total, 
      log: `Completed: ${msg.partNumber} (${msg.downloads} file)` 
    });
  } else if (msg.action === 'partError') {
    chrome.runtime.sendMessage({ 
      action: 'progress', 
      completed, 
      total, 
      log: `Error: ${msg.partNumber} - ${msg.error}` 
    });
  } else if (msg.action === 'openTabs') {
    msg.parts.forEach(partNumber => {
      chrome.tabs.create({
        url: `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${encodeURIComponent(partNumber)}`,
        active: false
      });
    });
  }
});

async function processQueue(folder) {
  // Create or get tab for automation
  currentTab = await createOrGetTab();
  
  for (let i = 0; i < queue.length && isRunning; i++) {
    const partNumber = queue[i];
    try {
      await processPart(partNumber, folder);
      await delay(500); // Delay between parts
    } catch (e) {
      chrome.runtime.sendMessage({ 
        action: 'progress', 
        completed, 
        total, 
        log: `Failed: ${partNumber} - ${e.message}` 
      });
    }
  }
  
  isRunning = false;
  chrome.runtime.sendMessage({ action: 'done' });
}

async function createOrGetTab() {
  const tabs = await chrome.tabs.query({ url: 'https://kmmatrix.fremont.lamrc.net/*' });
  if (tabs.length > 0) {
    return tabs[0];
  }
  
  return await chrome.tabs.create({ 
    url: 'https://kmmatrix.fremont.lamrc.net/Search',
    active: false 
  });
}

async function processPart(partNumber, folder) {
  try {
    // Step 1: Navigate to the search page and search for the part
    const searchUrl = `https://kmmatrix.fremont.lamrc.net/Search?q=${encodeURIComponent(partNumber)}`;
    await chrome.tabs.update(currentTab.id, { url: searchUrl });

    // Wait for the search results to load
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => window.KMMatrixInject.waitForElement('a[href*="DViewerX"]')
    });

    // Step 2: Navigate to the drawing viewer page
    const viewerUrl = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${encodeURIComponent(partNumber)}`;
    await chrome.tabs.update(currentTab.id, { url: viewerUrl });

    // Step 3: Wait for the download button and initiate the download
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: async (partNumber, folder) => {
        const downloadButton = await window.KMMatrixInject.waitForElement('button[aria-label="Download"]');
        window.KMMatrixInject.clickElement('button[aria-label="Download"]');
        
        const downloadInfo = await window.KMMatrixInject.findDownloadLink();
        if (downloadInfo && downloadInfo.href) {
          const filename = window.KMMatrixInject.generateFilename(partNumber, 0, 'MAIN');
          // This function is now running in the content script, so it can't call chrome.downloads.
          // We'll return the URL and filename to the background script.
          return { downloadUrl: downloadInfo.href, filename: filename };
        }
        return null;
      },
      args: [partNumber, folder]
    });

    if (results && results.length > 0 && results[0].result) {
      const { downloadUrl, filename } = results[0].result;
      chrome.downloads.download({
        url: downloadUrl,
        filename: folder ? `${folder}/${filename}` : filename,
        saveAs: false
      });

      chrome.runtime.sendMessage({
        action: 'partComplete',
        partNumber,
        downloads: 1
      });
    } else {
      throw new Error('Could not find download link.');
    }

  } catch (e) {
    chrome.runtime.sendMessage({
      action: 'partError',
      partNumber,
      error: e.message
    });
  }
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function openTabsForParts(parts) {
  parts.forEach(partNumber => {
    chrome.tabs.create({
      url: `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${encodeURIComponent(partNumber)}`,
      active: false
    });
  });
}

// Call openTabsForParts when user clicks Start in popup, etc. 