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
  }
});

async function processQueue(folder) {
  for (let i = 0; i < queue.length && isRunning; i++) {
    const partNumber = queue[i];
    try {
      const tab = await chrome.tabs.create({
        url: `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${encodeURIComponent(partNumber)}`,
        active: false
      });

      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          processPart(tabId, partNumber, folder);
        }
      });

      await delay(100); // Delay between opening tabs
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

async function processPart(tabId, partNumber, folder) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (partNumber) => {
        const embed = document.querySelector('embed');
        if (embed && embed.src) {
          const cleanPart = partNumber.replace(/-/g, '');
          const filename = `LAM-${cleanPart}-L0-MAIN.pdf`;
          return { downloadUrl: embed.src, filename };
        }
        return null;
      },
      args: [partNumber]
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
      throw new Error('Could not find embed download link.');
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
