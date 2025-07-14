chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'startDownload') {
    const partNumbers = message.partNumbers;

    for (const part of partNumbers) {
      const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${part}`;
      const tab = await chrome.tabs.create({ url, active: false });

      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (partNumber) => {
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.src) {
              chrome.runtime.sendMessage({
                action: 'download',
                url: iframe.src,
                partNumber
              });
            } else {
              chrome.runtime.sendMessage({
                action: 'progress',
                log: `❌ No iframe found for ${partNumber}`
              });
            }
          },
          args: [part]
        });
      }, 7000); // Adjust delay if needed
    }

    sendResponse({ status: "started" });
  }

  if (message.action === 'download') {
    const filename = `${message.partNumber || 'file'}.pdf`;
    chrome.downloads.download({
      url: message.url,
      filename
    });

    chrome.runtime.sendMessage({
      action: 'progress',
      log: `✅ Downloaded: ${filename}`
    });
  }

  return true;
});
