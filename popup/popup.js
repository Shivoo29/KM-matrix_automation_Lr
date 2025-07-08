// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const partNumbers = document.getElementById('partNumbers');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const statusLog = document.getElementById('statusLog');
  const folderSelect = document.getElementById('folderSelect');
  const chooseFolderBtn = document.getElementById('chooseFolderBtn');

  let isRunning = false;
  let totalParts = 0;
  let completedParts = 0;

  function log(msg) { console.log('aaaaaaa');
    statusLog.textContent += msg + '\n';
    statusLog.scrollTop = statusLog.scrollHeight;
  }

  function updateProgress(completed, total) {  console.log('bbbbb');
    progressBar.max = total;
    progressBar.value = completed;
    progressText.textContent = `${completed}/${total}`;
  }

  startBtn.addEventListener('click', () => {  console.log('d');
    const parts = partNumbers.value.split('\n').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      log('Please enter at least one part number.');
      return;
    }
    isRunning = true;
    totalParts = parts.length;
    completedParts = 0;
    updateProgress(0, totalParts);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    log('Starting automation...');
    // Send start message to background
    chrome.runtime.sendMessage({ action: 'start', parts, folder: folderSelect.value });
  });

  stopBtn.addEventListener('click', () => { console.log('e');
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    log('Stopping automation...');
    // Send stop message to background
    chrome.runtime.sendMessage({ action: 'stop' });
  });

  chooseFolderBtn.addEventListener('click', () => { console.log('f');
    // Placeholder: Chrome does not support folder picker in popup, so just log for now
    log('Folder selection is not supported in Chrome extensions. Downloads will go to the default folder.');
  });

  // Listen for progress updates from background
  chrome.runtime.onMessage.addListener((msg) => { console.log('g')
    if (msg.action === 'progress') {
      completedParts = msg.completed;
      totalParts = msg.total;
      updateProgress(completedParts, totalParts);
      if (msg.log) log(msg.log);
    } else if (msg.action === 'done') {
      isRunning = false;
      startBtn.disabled = false;
      stopBtn.disabled = true;
      updateProgress(totalParts, totalParts);
      log('Automation complete.');
    } else if (msg.action === 'error') {
      log('Error: ' + msg.error);
    }
  });
}); 