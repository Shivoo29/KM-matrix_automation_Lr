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
  const cleanPartNumber = partNumber.replace(/-/g, '');

  try {
    // Step 1: Search for main part
    await navigateToSearch(partNumber);
    await delay(300);

    // Step 2: Navigate to the drawing viewer
    const viewerUrl = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${encodeURIComponent(partNumber)}`;
    await chrome.tabs.update(currentTab.id, { url: viewerUrl });
    await waitForPageLoad();

    // Step 3: Download the main drawing
    await downloadMainDrawing(cleanPartNumber, folder);
    await delay(300); // Give time for the download to initiate

    chrome.runtime.sendMessage({
      action: 'partComplete',
      partNumber,
      downloads: 1
    });

  } catch (e) {
    chrome.runtime.sendMessage({
      action: 'partError',
      partNumber,
      error: e.message
    });
  }
}

async function navigateToSearch(partNumber) {
  const searchUrl = `https://kmmatrix.fremont.lamrc.net/Search?q=${encodeURIComponent(partNumber)}`;
  await chrome.tabs.update(currentTab.id, { url: searchUrl });
  await waitForPageLoad();
}

async function downloadMainDrawing(partNumber, folder) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: () => {
      // Use the functions exposed by inject.js
      const downloadInfo = window.KMMatrixInject.findDownloadLink();
      if (downloadInfo && downloadInfo.href) {
        const filename = window.KMMatrixInject.generateFilename(partNumber, 0, 'MAIN');
        return { downloadUrl: downloadInfo.href, filename: filename };
      }
      return null;
    }
  });

  if (results && results.length > 0 && results[0].result) {
    const { downloadUrl, filename } = results[0].result;
    chrome.downloads.download({
      url: downloadUrl,
      filename: folder ? `${folder}/${filename}` : filename,
      saveAs: false
    });
  } else {
    throw new Error('Could not find download link.');
  }
}

async function waitForPageLoad() {
  return new Promise(resolve => {
    setTimeout(resolve, 2000); // Wait 2 seconds for page load
  });
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