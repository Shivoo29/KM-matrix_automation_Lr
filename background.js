chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
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
              if (viewerSrc.includes("Drawing for this part is not available")) {
                chrome.runtime.sendMessage({
                  action: 'progress',
                  log: `⚠️ Drawing not available for ${partNumber}`,
                  tabId
                });
              } else {
                chrome.runtime.sendMessage({
                  action: 'download',
                  url: viewerSrc,
                  partNumber,
                  tabId
                });
              }
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

    if (message.tabId) {
      chrome.tabs.remove(message.tabId);
    }
  }

  if (message.action === 'progress') {
    console.log(message.log);
    if (message.tabId) {
      chrome.tabs.remove(message.tabId);
    }
  }

  return true;
});