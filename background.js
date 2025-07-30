// Enhanced Background Script with STP Support and Better Organization
// KM Matrix Automation Tool v1.2 - Lam Research Internal Use Only

let bomData = [];
let currentOperation = null;
let downloadStats = {
  success: 0,
  errors: 0,
  warnings: 0,
  total: 0,
  processed: 0,
  pendingDownloads: 0
};

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);

  // Manual PDF download for part numbers
  if (message.action === 'startDownload') {
    const partNumbers = message.partNumbers;
    currentOperation = 'manual_download';
    downloadStats = { success: 0, errors: 0, warnings: 0, total: partNumbers.length, processed: 0, pendingDownloads: 0 };

    sendProgressUpdate('🚀 Starting manual PDF download...', 'info');

    for (const part of partNumbers) {
      await processPartDownload(part, part, 'manual');
    }

    sendProgressUpdate('✅ Manual download operation completed!', 'success');
    chrome.runtime.sendMessage({
      action: 'operationComplete',
      summary: downloadStats
    });

  
  
  
  async function processPartDownload(partNumber, folderName, mode) {
  const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${partNumber}`;
  const tab = await chrome.tabs.create({ url, active: false });

  setTimeout(() => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (partNumber, folderName, mode, tabId) => {
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
            folderName,
            mode,
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
      args: [partNumber, folderName, mode, tab.id]
    });
  }, 5000);
}


    sendResponse({ status: "started" });
  }

  // BOM scraping and PDF download
  if (message.action === 'scrapeBOM') {
    const partNumbers = message.partNumbers;
    currentOperation = 'bom_extraction';
    downloadStats = { success: 0, errors: 0, warnings: 0, total: partNumbers.length, processed: 0, pendingDownloads: 0 };

    sendProgressUpdate('🔍 Starting BOM extraction...', 'info');

    for (const part of partNumbers) {
      const url = `https://kmmatrix.fremont.lamrc.net/BOMFinder?q=${part}`;
      const tab = await chrome.tabs.create({ url, active: false });

      // Inject content script after page loads
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['contentScript.js']
        });
      }, 8000);
    }

    sendResponse({ status: "BOM scraping started" });
  }

  // Receive BOM data from content script
  if (message.action === 'bomExtracted') {
    bomData = message.parts;
    const mainPartNumber = bomData[0]?.partNumber || 'Unknown';
    
    console.log('📦 BOM Data Extracted:', bomData);
    sendProgressUpdate(`📊 BOM extracted: ${bomData.length} parts found`, 'success');

    // Update total count and notify popup
    downloadStats.total = bomData.length;
    downloadStats.processed = 0;
    downloadStats.pendingDownloads = bomData.length;

    chrome.runtime.sendMessage({
      action: 'bomExtracted',
      parts: bomData,
      mainPartNumber: mainPartNumber
    });

    // Initialize download status for all parts
    bomData.forEach(part => {
      part.downloadStatus = 'pending';
      part.hasFiles = { pdf: false, stp: false };
    });

    // Start downloading all parts (use your original logic)
    for (const part of bomData) {
      const partNumber = part.partNumber;
      const nestingLevel = part.nestingLevel;
      let folderPath = '';

      // Determine folder path based on nesting level
      if (partNumber === mainPartNumber) {
        folderPath = `${mainPartNumber}/`;
      } else {
        folderPath = `${mainPartNumber}/bomparts/`;
        if (nestingLevel > 1) {
          for (let i = 1; i < nestingLevel; i++) {
            folderPath += `nestedBOMparts${i}/`;
          }
        }
      }
      

      const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${partNumber}`;
      const tab = await chrome.tabs.create({ url, active: false });

      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (partNumber, tabId, folderPath, mainPartNumber) => {
            const waitForViewer = () => {
              return new Promise((resolve) => {
                let attempts = 0;
                const maxAttempts = 20;
                
                const interval = setInterval(() => {
                  attempts++;
                  console.log(`🔍 Attempt ${attempts}/${maxAttempts} - Searching for files for ${partNumber}...`);
                  
                  // More comprehensive search for PDF and STP elements
                  const pdfCandidates = [
                    ...document.querySelectorAll('iframe'),
                    ...document.querySelectorAll('embed'),
                    ...document.querySelectorAll('object'),
                    ...document.querySelectorAll('a[href*=".pdf"]'),
                    ...document.querySelectorAll('[src*="pdf"]'),
                    ...document.querySelectorAll('[data-src*="pdf"]'),
                    ...document.querySelectorAll('[href*="pdf"]')
                  ];

                  const stpCandidates = [
                    ...document.querySelectorAll('iframe'),
                    ...document.querySelectorAll('div'),
                    ...document.querySelectorAll('object'),
                    ...document.querySelectorAll('a[href*=".stp"]'),
                    ...document.querySelectorAll('a[href*=".STP"]'),
                    ...document.querySelectorAll('[src*="stp"]'),
                    ...document.querySelectorAll('[data-src*="stp"]'),
                    ...document.querySelectorAll('a[download*=".stp"]'),
                    ...document.querySelectorAll('a[download*=".STP"]')
                  ];

                  console.log(`Found ${pdfCandidates.length} PDF candidates, ${stpCandidates.length} STP candidates`);

                  const foundFiles = { pdf: null, stp: null };

                  // Check for PDF
                  for (const el of pdfCandidates) {
                    let pdfUrl = null;
                    
                    if (el.src && el.src.startsWith('http')) {
                      pdfUrl = el.src;
                    } else if (el.href && el.href.startsWith('http')) {
                      pdfUrl = el.href;
                    } else if (el.dataset && el.dataset.src && el.dataset.src.startsWith('http')) {
                      pdfUrl = el.dataset.src;
                    }
                    
                    if (pdfUrl) {
                      console.log('✅ Found PDF URL:', pdfUrl);
                      foundFiles.pdf = pdfUrl;
                      break;
                    }
                  }

                  // Check for STP
                  for (const el of stpCandidates) {
                    let stpUrl = null;
                    
                    if (el.href && (el.href.includes('.stp') || el.href.includes('.STP'))) {
                      stpUrl = el.href;
                    } else if (el.src && (el.src.includes('.stp') || el.src.includes('.STP'))) {
                      stpUrl = el.src;
                    } else if (el.download && (el.download.includes('.stp') || el.download.includes('.STP'))) {
                      stpUrl = el.href || el.src;
                    }
                    
                    if (stpUrl && stpUrl.startsWith('http')) {
                      console.log('✅ Found STP URL:', stpUrl);
                      foundFiles.stp = stpUrl;
                      break;
                    }
                  }
                  
                  // If no direct files found, try to trigger download
                  if (attempts === 5) {
                    const downloadTriggers = document.querySelectorAll('button, a, span, div');
                    for (const trigger of downloadTriggers) {
                      const text = trigger.textContent?.toLowerCase() || '';
                      const title = trigger.title?.toLowerCase() || '';
                      const onclick = trigger.onclick?.toString() || '';
                      
                      if (text.includes('download') || text.includes('DOWNLOAD') || text.includes('pdf') || text.includes('stp') ||
                          title.includes('download') || text.includes('DOWNLOAD') || title.includes('pdf') || title.includes('stp') ||
                          onclick.includes('download') || text.includes('DOWNLOAD') || onclick.includes('pdf') || onclick.includes('stp')) {
                        console.log('🎯 Trying to click download trigger:', trigger);
                        trigger.click();
                        break;
                      }
                    }
                  }

                  if (attempts >= maxAttempts) {
                    console.log('⏰ Max attempts reached');
                    clearInterval(interval);
                    resolve(foundFiles);
                  } else if (foundFiles.pdf || foundFiles.stp) {
                    clearInterval(interval);
                    resolve(foundFiles);
                  }
                }, 2500);
              });
            };

            const files = await waitForViewer();

            // Download PDF if found
            if (files.pdf) {
              chrome.runtime.sendMessage({
                action: 'downloadWithPath',
                url: files.pdf,
                partNumber,
                folderPath: folderPath + partNumber + '.pdf',
                fileType: 'pdf',
                tabId
              });
            }

            // Download STP if found  
            if (files.stp) {
              chrome.runtime.sendMessage({
                action: 'downloadWithPath',
                url: files.stp,
                partNumber,
                folderPath: folderPath + partNumber + '.stp',
                fileType: 'stp',
                tabId
              });
            }

            // Report completion status
            chrome.runtime.sendMessage({
              action: 'partProcessed',
              partNumber,
              foundFiles: files,
              tabId
            });
          },
          args: [partNumber, tab.id, folderPath, mainPartNumber]
        });
      }, 10000); // Increased delay to 10 seconds
    }
  }

  // Handle part processing completion
  if (message.action === 'partProcessed') {
    const { partNumber, foundFiles, tabId } = message;
    
    // Update part status in bomData
    const part = bomData.find(p => p.partNumber === partNumber);
    if (part) {
      if (foundFiles.pdf) {
        part.hasFiles.pdf = true;
        part.downloadStatus = 'success';
      } else if (foundFiles.stp) {
        part.hasFiles.stp = true;
        if (part.downloadStatus !== 'success') {
          part.downloadStatus = 'partial'; // Has STP but no PDF
        }
      } else {
        part.downloadStatus = 'no_files';
      }
    }

    downloadStats.processed++;
    downloadStats.pendingDownloads--;

    sendProgressUpdate(`📊 Processed ${downloadStats.processed}/${downloadStats.total} parts`, 'info');

    // Close tab immediately when part is processed
    if (tabId) {
      try {
        chrome.tabs.remove(tabId);
      } catch (error) {
        console.log(`Tab ${tabId} already closed`);
      }
    }

    // Check if all parts are processed
    if (downloadStats.pendingDownloads <= 0) {
      sendProgressUpdate('🎉 All downloads completed! Generating Excel report...', 'success');
      
      // Now generate Excel report with color coding
      setTimeout(async () => {
        await generateBOMExcelReport(bomData, bomData[0]?.partNumber || 'Unknown');
        
        sendProgressUpdate('✅ BOM processing completed!', 'success');
        chrome.runtime.sendMessage({
          action: 'operationComplete',
          summary: downloadStats
        });
      }, 2000); // Small delay to ensure all downloads are processed
    }
  }

  // Handle download with folder path
  if (message.action === 'downloadWithPath') {
    try {
      await chrome.downloads.download({
        url: message.url,
        filename: message.folderPath
      });
      
      downloadStats.success++;
      sendProgressUpdate(`✅ Downloaded ${message.fileType?.toUpperCase() || 'file'}: ${message.partNumber}`, 'success', message.partNumber, 'success');
      
      chrome.runtime.sendMessage({
        action: 'downloadComplete',
        partNumber: message.partNumber,
        type: message.fileType || 'pdf',
        success: true
      });
    } catch (error) {
      downloadStats.errors++;
      sendProgressUpdate(`❌ Failed to download: ${message.partNumber} - ${error.message}`, 'error', message.partNumber, 'error');
      
      chrome.runtime.sendMessage({
        action: 'downloadComplete',
        partNumber: message.partNumber,
        type: message.fileType || 'pdf',
        success: false,
        error: error.message
      });
    }

    // Don't close tab here - let partProcessed handle it
  }

  // Handle individual PDF download (for manual downloads)
  if (message.action === 'download') {
    const filename = `${message.partNumber || 'file'}.pdf`;
    try {
      await chrome.downloads.download({
        url: message.url,
        filename
      });
      
      downloadStats.success++;
      sendProgressUpdate(`✅ Downloaded: ${message.partNumber}`, 'success', message.partNumber, 'success');
      
      chrome.runtime.sendMessage({
        action: 'downloadComplete',
        partNumber: message.partNumber,
        type: 'pdf',
        success: true
      });
    } catch (error) {
      downloadStats.errors++;
      sendProgressUpdate(`❌ Failed to download: ${message.partNumber} - ${error.message}`, 'error', message.partNumber, 'error');
      
      chrome.runtime.sendMessage({
        action: 'downloadComplete',
        partNumber: message.partNumber,
        type: 'pdf',
        success: false,
        error: error.message
      });
    }

    // Close tab for manual downloads
    if (message.tabId) {
      try {
        setTimeout(() => {
          chrome.tabs.remove(message.tabId);
        }, 2000);
      } catch (error) {
        console.log(`Tab ${message.tabId} already closed`);
      }
    }
  }

  // Log progress and close tab
  if (message.action === 'progress') {
    console.log(message.log);
    sendProgressUpdate(message.log, message.type || 'info', message.partNumber, message.status);
    
    if (message.tabId) {
      setTimeout(() => {
        chrome.tabs.remove(message.tabId);
      }, 2000);
    }
  }

  return true;
});

// Manual PDF download for individual parts (simplified version)
async function processPartDownload(partNumber, mainPartNumber, type, nestingLevel = 0) {
  const url = `https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber=${partNumber}`;
  const tab = await chrome.tabs.create({ url, active: false });

  setTimeout(() => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (partNumber, tabId) => {
        const waitForViewer = () => {
          return new Promise((resolve) => {
            const interval = setInterval(() => {
              console.log('🔍 Searching for PDF viewer...');
              
              const candidates = [
                ...document.querySelectorAll('iframe'),
                ...document.querySelectorAll('embed'),
                ...document.querySelectorAll('object'),
                ...document.querySelectorAll('a[href*=".pdf"]'),
                ...document.querySelectorAll('[src*="pdf"]'),
                ...document.querySelectorAll('[data-src*="pdf"]')
              ];

              console.log(`Found ${candidates.length} potential PDF elements`);

              for (const el of candidates) {
                let pdfUrl = null;
                
                if (el.src && (el.src.includes('pdf') || el.src.includes('viewer'))) {
                  pdfUrl = el.src;
                } else if (el.href && el.href.includes('.pdf')) {
                  pdfUrl = el.href;
                } else if (el.dataset && el.dataset.src && el.dataset.src.includes('pdf')) {
                  pdfUrl = el.dataset.src;
                }
                
                if (pdfUrl && pdfUrl.startsWith('http')) {
                  console.log('✅ Found PDF URL:', pdfUrl);
                  clearInterval(interval);
                  resolve(pdfUrl);
                  return;
                }
              }
              
              // Try clicking download buttons
              const downloadButtons = document.querySelectorAll('button, a, span');
              for (const btn of downloadButtons) {
                if (btn.textContent && (
                  btn.textContent.toLowerCase().includes('download') ||
                  btn.textContent.toLowerCase().includes('pdf') ||
                  btn.textContent.toLowerCase().includes('view')
                )) {
                  console.log('Found potential download element:', btn);
                  btn.click();
                }
              }
            }, 2000);

            setTimeout(() => {
              console.log('⏰ Timeout reached, no PDF found');
              clearInterval(interval);
              resolve(null);
            }, 45000);
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
      args: [partNumber, tab.id]
    });
  }, 8000);
}

// Generate enhanced Excel report with color coding - ONLY CALLED AFTER ALL DOWNLOADS COMPLETE
async function generateBOMExcelReport(parts, mainPartNumber) {
  try {
    sendProgressUpdate('📊 Generating color-coded Excel BOM report...', 'info');
    
    // Prepare parts data with download status for Excel generation
    const partsWithStatus = parts.map(part => ({
      ...part,
      pdfStatus: part.hasFiles?.pdf ? 'Downloaded' : 'Not Found',
      stpStatus: part.hasFiles?.stp ? 'Downloaded' : 'Not Found',
      rowColor: part.downloadStatus === 'success' ? 'green' : 
                part.downloadStatus === 'no_files' ? 'red' : 
                part.downloadStatus === 'timeout' ? 'yellow' : 'white'
    }));

    // Create a new tab specifically for Excel generation (not chrome:// URL)
    try {
      const url = chrome.runtime.getURL("excelGenerator.html")
      const tab = await chrome.tabs.create({ url, active: false });
      
      // Wait for tab to load
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (parts, mainPartNumber) => {
            // Create enhanced Excel with color coding
            const headers = [
              'Item', 'Part Number', 'Rev', 'Description', 'Qty', 'UOM', 'ICAT', 'CE', 
              'Status', 'Mat Group', 'Cust Viewable', 'Manufacture Detail', 
              'Internal Note', 'EC', 'SCP', 'CCM', 'CMRCL', 'MTL', 'PDF Status', 'STP Status'
            ];

            const rows = parts.map(part => [
              part.item,
              part.partNumber,
              part.rev,
              '  '.repeat(part.nestingLevel) + part.description,
              part.qty,
              part.uom,
              part.icat,
              part.ce,
              part.status,
              part.matGroup,
              part.custViewable,
              part.manufactureDetail,
              part.internalNote,
              part.ec,
              part.scp,
              part.ccm,
              part.cmrcl,
              part.mtl,
              part.pdfStatus,
              part.stpStatus
            ]);

            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            
            // Apply color coding and styling
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            for (let rowNum = 1; rowNum <= range.e.r; rowNum++) {
              const partIndex = rowNum - 1;
              const part = parts[partIndex];
              
              if (!part) continue;
              
              let fillColor = 'FFFFFF'; // Default white
              
              // Determine row color based on download status
              if (part.rowColor === 'green') {
                fillColor = 'C6EFCE'; // Light green
                console.log('green');
              } else if (part.rowColor === 'red') {
                fillColor = 'FFC7CE'; // Light red
                console.log('red');
              } else if (part.rowColor === 'yellow') {
                fillColor = 'FFEB9C'; // Light yellow
                console.log('yellow');
              }
              
              // Apply color to all cells in the row
              for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
                const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
                if (!worksheet[cellAddress]) continue;
                
                worksheet[cellAddress].s = {
                  fill: { fgColor: { rgb: fillColor } },
                  border: {
                    top: { style: 'thin', color: { rgb: 'D0D0D0' } },
                    bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
                    left: { style: 'thin', color: { rgb: 'D0D0D0' } },
                    right: { style: 'thin', color: { rgb: 'D0D0D0' } }
                  }
                };
              }
            }

            // Create legend worksheet
            const legendData = [
              ['BOM Structure Report - Color Legend', '', ''],
              ['', '', ''],
              ['Color', 'Meaning', 'Action Required'],
              ['Green', 'Files downloaded successfully', 'None'],
              ['Red', 'No PDF/STP files found', 'Manual check required'],
              ['Yellow', 'Connection timeout', 'Retry download'],
              ['White', 'Not processed yet', 'Processing pending'],
              ['', '', ''],
              ['Report Information:', '', ''],
              ['Main Part Number:', mainPartNumber, ''],
              ['Total Parts:', parts.length.toString(), ''],
              ['Generated:', new Date().toLocaleString(), ''],
              ['Generated By:', 'KM Matrix Automation Tool v1.2', '']
            ];

            const legendSheet = XLSX.utils.aoa_to_sheet(legendData);
            
            // Create workbook and add sheets
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "BOM Structure");
            XLSX.utils.book_append_sheet(workbook, legendSheet, "Legend & Info");

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${mainPartNumber}_BOM_Structure_${timestamp}.xlsx`;

            // Download the file to the main part folder
            XLSX.writeFile(workbook, filename);
            
            console.log('✅ Color-coded Excel report generated:', filename);
          },
          args: [partsWithStatus, mainPartNumber]
        });
        
        // Close the Excel generation tab after a delay
        setTimeout(() => {
          try {
            chrome.tabs.remove(tab.id);
          } catch (error) {
            console.log('Excel generation tab already closed');
          }
        }, 3000);
      }, 2000);
      
    } catch (error) {
      console.log('Failed to create Excel generation tab, using fallback method');
      // Fallback: just log the data
      console.log('Excel data prepared:', partsWithStatus);
    }

    sendProgressUpdate('✅ Color-coded Excel report generated successfully', 'success');
  } catch (error) {
    sendProgressUpdate(`❌ Failed to generate Excel report: ${error.message}`, 'error');
  }
}

// Send progress update to popup
function sendProgressUpdate(message, type = 'info', partNumber = null, status = null) {
  console.log(`📡 Progress: ${message}`);
  
  chrome.runtime.sendMessage({
    action: 'progress',
    log: message,
    type: type,
    partNumber: partNumber,
    status: status
  });
}

// Update BOM parts with download status
function updateBOMPartStatus(partNumber, status, fileType) {
  const part = bomData.find(p => p.partNumber === partNumber);
  if (part) {
    if (!part.downloadStatus) part.downloadStatus = {};
    part.downloadStatus[fileType] = status;
    
    // Update overall status
    if (status === 'success') {
      if (!part.hasFiles) part.hasFiles = {};
      part.hasFiles[fileType] = true;
    }
  }
}

// Handle download state updates
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    console.log('📥 Download completed:', downloadDelta);
  } else if (downloadDelta.state && downloadDelta.state.current === 'interrupted') {
    console.log('❌ Download interrupted:', downloadDelta);
    downloadStats.errors++;
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 KM Matrix Automation Tool v1.2 started');
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('✅ KM Matrix Automation Tool v1.2 installed successfully');
  } else if (details.reason === 'update') {
    console.log('🔄 KM Matrix Automation Tool updated to v1.2');
  }
});

// Error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
  console.error('❌ Unhandled promise rejection:', event.reason);
  sendProgressUpdate(`❌ Unexpected error: ${event.reason}`, 'error');
});