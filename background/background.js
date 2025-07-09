let isRunning = false;
let queue = [];
let completed = 0;
let total = 0;
const NATIVE_HOST_NAME = "com.gemini.km_matrix_automator";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'start') {
    if (isRunning) return;
    isRunning = true;
    queue = msg.parts;
    completed = 0;
    total = queue.length;
    processQueue();
    sendResponse({ status: "started" });
  } else if (msg.action === 'stop') {
    isRunning = false;
    queue = [];
    chrome.runtime.sendMessage({ action: 'done', log: 'Automation stopped by user.' });
  }
  return true; // Indicates that the response will be sent asynchronously
});

async function processQueue() {
  for (let i = 0; i < queue.length && isRunning; i++) {
    const partNumber = queue[i];
    
    chrome.runtime.sendMessage({
      action: 'progress',
      completed,
      total,
      log: `[${i + 1}/${total}] Processing: ${partNumber}`
    });

    try {
      const response = await sendNativeMessage(partNumber);
      
      if (response.status === 'success') {
        completed++;
        chrome.runtime.sendMessage({
          action: 'progress',
          completed,
          total,
          log: `Success: ${partNumber} downloaded to ${response.filepath}`
        });
      } else {
        throw new Error(response.error || response.message || 'Unknown error from host');
      }
    } catch (e) {
      chrome.runtime.sendMessage({
        action: 'progress',
        completed,
        total,
        log: `Error: ${partNumber} - ${e.message}`
      });
    }
  }

  isRunning = false;
  chrome.runtime.sendMessage({ action: 'done', log: 'Automation complete.' });
}

function sendNativeMessage(partNumber) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, { partNumber }, (response) => {
      if (chrome.runtime.lastError) {
        // This error occurs if the host is not found or fails to launch.
        return reject(new Error(`Native host error: ${chrome.runtime.lastError.message}`));
      }
      if (response) {
        resolve(response);
      } else {
        // This might happen if the script exits without sending a message.
        reject(new Error('Received no response from native host.'));
      }
    });
  });
}
