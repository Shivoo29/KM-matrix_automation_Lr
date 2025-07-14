document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('download');
  const partNumbersInput = document.getElementById('partNumbers');
  const statusLog = document.getElementById('statusLog');

  function log(msg) {
    statusLog.textContent += msg + '\n';
    statusLog.scrollTop = statusLog.scrollHeight;
  }

  downloadBtn.addEventListener('click', () => {
    const input = partNumbersInput.value;
    const partNumbers = input.split('\n').map(p => p.trim()).filter(p => p);

    if (partNumbers.length === 0) {
      log('Please enter at least one part number.');
      return;
    }

    log('Starting download...');
    chrome.runtime.sendMessage({ action: 'startDownload', partNumbers });
  });
});
