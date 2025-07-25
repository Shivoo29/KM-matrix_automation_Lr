let bomData = [];

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // Manual PDF download for part numbers
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
              chrome.runtime.sendMessage({
                action: 'download',
                url: viewerSrc,
                partNumber,
                tabId
              });
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

  // BOM scraping and PDF download
  if (message.action === 'scrapeBOM') {
    const partNumbers = message.partNumbers;

    for (const part of partNumbers) {
      const url = `https://kmmatrix.fremont.lamrc.net/BOMFinder?q=${part}`;
      const tab = await chrome.tabs.create({ url, active: false });


      // Inject content script after page loads
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['contentScript.js']
        });
      }, 5000);
    }

    sendResponse({ status: "BOM scraping started" });
  }

  // Receive BOM data from content script
  // if (message.action === 'bomExtracted') {
  //   bomData = message.parts;
  //   console.log('📦 BOM Data Extracted:', bomData);
  //   console.log(message.partSpans)

  //   // Download PDFs for all parts
  //   bomData.forEach(part => {
  //     const partNumber = part.partNumber;
  //     const nestingLevel = part.nestingLevel;
  //     const folderPath = `${bomData[0].partNumber}/${'sub/'.repeat(nestingLevel)}${partNumber}.pdf`;

  //     const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${partNumber}`;
  //     chrome.downloads.download({
  //       url,
  //       filename: folderPath
  //     });
  //   });
  // }
  if (message.action === 'bomExtracted') {
  bomData = message.parts;
  console.log('📦 BOM Data Extracted:', bomData);

  for (const part of bomData) {
    const partNumber = part.partNumber;
    const nestingLevel = part.nestingLevel;
    const folderPath = `${bomData[0].partNumber}/${'sub/'.repeat(nestingLevel)}${partNumber}.pdf`;

    const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${partNumber}`;
    const tab = await chrome.tabs.create({ url, active: false });

    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (partNumber, tabId, folderPath) => {
          const waitForViewer = () => {
            return new Promise((resolve) => {
              const interval = setInterval(() => {
                const candidates = [
                  ...document.querySelectorAll('iframe'),
                  ...document.querySelectorAll('embed'),
                  ...document.querySelectorAll('object')
                ];

                for (const el of candidates) {
                  if (el.src && el.src.startsWith('http') && el.src.endsWith('.pdf')) {
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
            chrome.runtime.sendMessage({
              action: 'downloadWithPath',
              url: viewerSrc,
              partNumber,
              folderPath,
              tabId
            });
          } else {
            chrome.runtime.sendMessage({
              action: 'progress',
              log: `❌ No PDF found for ${partNumber}`,
              tabId
            });
          }
        },
        args: [partNumber, tab.id, folderPath]
      });
    }, 5000);
  }
}


  // Handle individual PDF download
  if (message.action === 'download') {
    const filename = `${message.partNumber || 'file'}.pdf`;
    chrome.downloads.download({
      url: message.url,
      filename
    });

    if (message.tabId) {
      chrome.tabs.remove(message.tabId);
    }
  }

  // Log progress and close tab
  if (message.action === 'progress') {
    console.log(message.log);
    if (message.tabId) {
      chrome.tabs.remove(message.tabId);
    }
  }

  return true;
});
