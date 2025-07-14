chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'start') {
    const parts = message.parts;
    let completed = 0;
    const total = parts.length;

    for (const [index, part] of parts.entries()) {
      const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${part}`;
      const tab = await chrome.tabs.create({ url, active: false });

      // Wait 7 seconds for the page to load
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const iframe = document.querySelector('iframe');
            if (iframe) {
              chrome.runtime.sendMessage({
                action: 'download',
                url: iframe.src,
                partNumber: new URLSearchParams(window.location.search).get('partnumber')
              });
            } else {
              chrome.runtime.sendMessage({
                action: 'progress',
                log: 'No iframe found on the page.'
              });
            }
          }
        });
      }, 7000);
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
      log: `Downloaded: ${filename}`
    });
  }

  return true;
});
