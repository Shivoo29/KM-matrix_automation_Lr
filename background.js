chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'startDownload') {
    for (const part of message.partNumbers) {
      const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${part}`;
      const tab = await chrome.tabs.create({ url, active: false });

      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const iframe = document.querySelector('iframe');
            if (iframe) {
              console.log("Found iframe:", iframe.src);
              chrome.runtime.sendMessage({ action: 'download', url: iframe.src });
            } else {
              console.log("No iframe found on the page.");
            }
          }
        });
      }, 7000); // Increased delay to 7 seconds
    }
  }

  if (message.action === 'download') {
    console.log("Downloading from:", message.url);
    chrome.downloads.download({
      url: message.url,
      filename: "downloaded_file.pdf"
    });
  }
});
