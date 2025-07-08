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
      log: `Completed: ${msg.partNumber} (${msg.downloads} files)` 
    });
  } else if (msg.action === 'partError') {
    chrome.runtime.sendMessage({ 
      action: 'progress', 
      completed, 
      total, 
      log: `Error: ${msg.partNumber} - ${msg.error}` 
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
  let totalDownloads = 0;
  
  try {
    // Step 1: Search for main part
    await navigateToSearch(partNumber);
    await delay(300);
    
    // Step 2: Download main drawing and get sub-parts (Level 0 & 1)
    const subParts = await processMainDrawing(partNumber, cleanPartNumber, folder);
    totalDownloads += 1 + subParts.length; // Main + sub-parts
    
    // Step 3: Get BOM parts (Level 2)
    const bomParts = await getBOMParts(partNumber);
    
    // Step 4: Process each BOM part and its sub-parts (Level 2 & 3)
    for (const bomPart of bomParts) {
      if (!isRunning) break;
      
      const bomCleanPart = bomPart.replace(/-/g, '');
      await downloadPartDrawing(bomPart, bomCleanPart, 2, 'BOM', folder);
      totalDownloads++;
      
      // Get BOM sub-parts (Level 3) - NO further nesting
      const bomSubParts = await getBOMSubParts(bomPart);
      for (const bomSubPart of bomSubParts) {
        if (!isRunning) break;
        const bomSubCleanPart = bomSubPart.replace(/-/g, '');
        await downloadPartDrawing(bomSubPart, bomSubCleanPart, 3, 'BOMSUB', folder);
        totalDownloads++;
      }
    }
    
    chrome.runtime.sendMessage({ 
      action: 'partComplete', 
      partNumber, 
      downloads: totalDownloads 
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

async function processMainDrawing(partNumber, cleanPartNumber, folder) {
  // Navigate to drawing viewer
  const viewerUrl = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${encodeURIComponent(partNumber)}`;
  await chrome.tabs.update(currentTab.id, { url: viewerUrl });
  await waitForPageLoad();
  
  // Download main drawing (Level 0)
  await downloadMainDrawing(cleanPartNumber, folder);
  
  // Get sub-parts from left sidebar (Level 1)
  const subParts = await getSubPartsFromViewer();
  
  // Download each sub-part
  for (const subPart of subParts) {
    if (!isRunning) break;
    const subCleanPart = subPart.replace(/-/g, '');
    await downloadPartDrawing(subPart, subCleanPart, 1, 'SUB', folder);
  }
  
  return subParts;
}

async function getBOMParts(partNumber) {
  // Navigate back to search results
  const searchUrl = `https://kmmatrix.fremont.lamrc.net/Search?q=${encodeURIComponent(partNumber)}`;
  await chrome.tabs.update(currentTab.id, { url: searchUrl });
  await waitForPageLoad();
  
  // Click BOM Navigator link
  await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    function: clickBOMNavigator
  });
  
  await waitForPageLoad();
  
  // Extract BOM parts
  const result = await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    function: extractBOMParts
  });
  
  return result[0].result || [];
}

async function getBOMSubParts(bomPart) {
  // Navigate to BOM part's drawing viewer
  const viewerUrl = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${encodeURIComponent(bomPart)}`;
  await chrome.tabs.update(currentTab.id, { url: viewerUrl });
  await waitForPageLoad();
  
  // Get sub-parts from left sidebar
  const result = await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    function: getSubPartsFromViewer
  });
  
  return result[0].result || [];
}

async function downloadMainDrawing(cleanPartNumber, folder) {
  await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    function: downloadDrawing,
    args: [cleanPartNumber, 0, 'MAIN', folder]
  });
}

async function downloadPartDrawing(partNumber, cleanPartNumber, level, type, folder) {
  // Navigate to part's drawing viewer
  const viewerUrl = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${encodeURIComponent(partNumber)}`;
  await chrome.tabs.update(currentTab.id, { url: viewerUrl });
  await waitForPageLoad();
  
  // Download the drawing
  await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    function: downloadDrawing,
    args: [cleanPartNumber, level, type, folder]
  });
}

async function waitForPageLoad() {
  return new Promise(resolve => {
    setTimeout(resolve, 2000); // Wait 2 seconds for page load
  });
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// Functions to be executed in content script context
function clickBOMNavigator() {
  const bomLink = Array.from(document.querySelectorAll('a')).find(a => 
    a.textContent.includes('BOM Navigator')
  );
  if (bomLink) {
    bomLink.click();
    return true;
  }
  return false;
}

function extractBOMParts() {
  const bomParts = [];
  const partLinks = document.querySelectorAll('.bom-tree .part-link, a[href*="partnumber"]');
  
  partLinks.forEach(link => {
    const partNumber = link.textContent.trim();
    if (partNumber && partNumber.match(/^\d{3}-\d{6}-\d{3}$/)) {
      bomParts.push(partNumber);
    }
  });
  
  return [...new Set(bomParts)]; // Remove duplicates
}

function getSubPartsFromViewer() {
  const subParts = [];
  const rows = document.querySelectorAll('.part-list-table tbody tr, tr[data-part]');
  
  rows.forEach(row => {
    const partCell = row.querySelector('.part-number, td:first-child');
    if (partCell) {
      const partNumber = partCell.textContent.trim();
      if (partNumber && partNumber.match(/^\d{3}-\d{6}-\d{3}$/)) {
        subParts.push(partNumber);
      }
    }
  });
  
  return [...new Set(subParts)]; // Remove duplicates
}

function downloadDrawing(cleanPartNumber, level, type, folder) {
  const filename = `LAM-${cleanPartNumber}-L${level}-${type}.pdf`;
  
  // Find download link
  const downloadLink = document.querySelector('a[href*="download"], a[href*=".pdf"]');
  if (downloadLink) {
    const downloadUrl = downloadLink.href;
    
    // Trigger download with custom filename
    chrome.downloads.download({
      url: downloadUrl,
      filename: filename,
      saveAs: false
    });
    
    return true;
  }
  
  return false;
}

// For each part number, open a new tab
queue.forEach(partNumber => {
  chrome.tabs.create({
    url: `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${encodeURIComponent(partNumber)}`,
    active: false
  });
});

// When the DViewer page loads, click the PDF download button
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    let btn = document.querySelector('button[aria-label="Download"]') ||
              document.querySelector('button.download, .toolbarButton.download');
    if (btn) btn.click();
  }, 2000); // Adjust delay as needed
}); 