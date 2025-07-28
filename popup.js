// Enhanced Popup JavaScript with Progress Tracking and UI Management

let currentOperation = null;
let progressData = {
  total: 0,
  processed: 0,
  success: 0,
  errors: 0,
  warnings: 0
};

// Initialize UI when popup loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 KM Matrix Automation Tool Loaded');
  
  // Set up event listeners
  document.getElementById('download').addEventListener('click', handlePDFDownload);
  document.getElementById('scrapeBOM').addEventListener('click', handleBOMScraping);
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  
  // Add some sample text for demo (remove in production)
  // document.getElementById('partNumbers').value = '839-B75409-001\n796-095390-102\n202-010805-001';
});

// Handle PDF Download button click
function handlePDFDownload() {
  const input = document.getElementById('partNumbers').value;
  const partNumbers = input.split('\n').map(p => p.trim()).filter(p => p);
  
  if (partNumbers.length === 0) {
    showError('Please enter at least one part number');
    return;
  }
  
  startOperation('pdf', partNumbers);
  chrome.runtime.sendMessage({ 
    action: 'startDownload', 
    partNumbers,
    includeProgress: true 
  });
}

// Handle BOM Scraping button click
function handleBOMScraping() {
  const input = document.getElementById('partNumbers').value;
  const partNumbers = input.split('\n').map(p => p.trim()).filter(p => p);
  
  if (partNumbers.length === 0) {
    showError('Please enter at least one part number');
    return;
  }
  
  startOperation('bom', partNumbers);
  chrome.runtime.sendMessage({ 
    action: 'scrapeBOM', 
    partNumbers,
    includeProgress: true 
  });
}

// Start operation and show progress section
function startOperation(type, partNumbers) {
  currentOperation = type;
  
  // Reset progress data
  progressData = {
    total: partNumbers.length,
    processed: 0,
    success: 0,
    errors: 0,
    warnings: 0
  };
  
  // Show progress section
  const progressSection = document.getElementById('progressSection');
  progressSection.classList.add('active');
  
  // Disable buttons
  document.getElementById('download').disabled = true;
  document.getElementById('scrapeBOM').disabled = true;
  
  // Add pulse effect to progress section
  progressSection.classList.add('pulse');
  
  // Clear logs and add start message
  const logsContainer = document.getElementById('logsContainer');
  logsContainer.innerHTML = '';
  
  const operationType = type === 'pdf' ? 'PDF Download' : 'BOM Structure Extraction';
  addLog(`🚀 Starting ${operationType} for ${partNumbers.length} part(s)...`, 'info');
  
  // Update stats
  updateStats();
  updateProgressBar();
}

// Handle messages from background script
function handleBackgroundMessage(message, sender, sendResponse) {
  console.log('📨 Received message:', message);
  
  switch (message.action) {
    case 'progress':
      handleProgressUpdate(message);
      break;
    case 'bomExtracted':
      handleBOMExtracted(message);
      break;
    case 'downloadComplete':
      handleDownloadComplete(message);
      break;
    case 'operationComplete':
      handleOperationComplete(message);
      break;
    case 'error':
      handleError(message);
      break;
  }
}

// Handle progress updates
function handleProgressUpdate(message) {
  const { log, type, partNumber, status } = message;
  
  if (log) {
    addLog(log, type || 'info');
  }
  
  if (status) {
    progressData.processed++;
    
    switch (status) {
      case 'success':
        progressData.success++;
        addLog(`✅ Successfully processed: ${partNumber}`, 'success');
        break;
      case 'error':
        progressData.errors++;
        addLog(`❌ Failed to process: ${partNumber}`, 'error');
        break;
      case 'warning':
        progressData.warnings++;
        addLog(`⚠️ Warning for: ${partNumber} - ${log}`, 'warning');
        break;
      case 'timeout':
        progressData.warnings++;
        addLog(`⏰ Timeout for: ${partNumber} - Manual check required`, 'warning');
        break;
      case 'no_pdf':
        progressData.errors++;
        addLog(`📄 No PDF found for: ${partNumber}`, 'error');
        break;
    }
    
    updateStats();
    updateProgressBar();
  }
}

// Handle BOM extraction complete
function handleBOMExtracted(message) {
  const { parts, mainPartNumber } = message;
  addLog(`📊 BOM Structure extracted: ${parts.length} parts found`, 'success');
  addLog(`📁 Creating folder structure for: ${mainPartNumber}`, 'info');
  
  // Update total count to include BOM parts
  progressData.total = parts.length;
  updateStats();
}

// Handle individual download complete
function handleDownloadComplete(message) {
  const { partNumber, type, success } = message;
  
  if (success) {
    addLog(`📥 Downloaded ${type.toUpperCase()}: ${partNumber}`, 'success');
  } else {
    addLog(`❌ Failed to download ${type.toUpperCase()}: ${partNumber}`, 'error');
  }
}

// Handle operation complete
function handleOperationComplete(message) {
  const { summary } = message;
  
  addLog('🎉 Operation completed!', 'success');
  
  if (summary) {
    addLog(`📊 Summary: ${summary.success} successful, ${summary.errors} failed, ${summary.warnings} warnings`, 'info');
  }
  
  // Re-enable buttons
  setTimeout(() => {
    document.getElementById('download').disabled = false;
    document.getElementById('scrapeBOM').disabled = false;
    
    // Remove pulse effect
    document.getElementById('progressSection').classList.remove('pulse');
  }, 2000);
}

// Handle errors
function handleError(message) {
  addLog(`❌ Error: ${message.error}`, 'error');
  progressData.errors++;
  updateStats();
}

// Add log entry to the logs container
function addLog(message, type = 'info') {
  const logsContainer = document.getElementById('logsContainer');
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  
  // Add timestamp
  const timestamp = new Date().toLocaleTimeString();
  logEntry.textContent = `[${timestamp}] ${message}`;
  
  logsContainer.appendChild(logEntry);
  
  // Auto-scroll to bottom
  logsContainer.scrollTop = logsContainer.scrollHeight;
  
  // Limit log entries to prevent memory issues
  const logEntries = logsContainer.querySelectorAll('.log-entry');
  if (logEntries.length > 100) {
    logEntries[0].remove();
  }
}

// Update statistics display
function updateStats() {
  document.getElementById('successCount').textContent = progressData.success;
  document.getElementById('errorCount').textContent = progressData.errors;
  document.getElementById('warningCount').textContent = progressData.warnings;
  document.getElementById('totalCount').textContent = `${progressData.processed}/${progressData.total}`;
}

// Update progress bar
function updateProgressBar() {
  const percentage = progressData.total > 0 ? (progressData.processed / progressData.total) * 100 : 0;
  const progressBar = document.getElementById('progressBar');
  progressBar.style.width = `${percentage}%`;
  
  // Change color based on success rate
  if (progressData.processed > 0) {
    const successRate = (progressData.success / progressData.processed) * 100;
    if (successRate >= 80) {
      progressBar.style.background = 'linear-gradient(90deg, var(--success-green), var(--primary-blue))';
    } else if (successRate >= 50) {
      progressBar.style.background = 'linear-gradient(90deg, var(--warning-yellow), var(--primary-blue))';
    } else {
      progressBar.style.background = 'linear-gradient(90deg, var(--error-red), var(--primary-blue))';
    }
  }
}

// Show error message
function showError(message) {
  addLog(`❌ ${message}`, 'error');
  
  // Show progress section briefly to display error
  const progressSection = document.getElementById('progressSection');
  progressSection.classList.add('active');
  
  setTimeout(() => {
    progressSection.classList.remove('active');
  }, 3000);
}

// Utility function to format file sizes
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
  // Ctrl/Cmd + Enter to start PDF download
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    if (!document.getElementById('download').disabled) {
      handlePDFDownload();
    }
  }
  
  // Ctrl/Cmd + Shift + Enter to start BOM scraping
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Enter') {
    event.preventDefault();
    if (!document.getElementById('scrapeBOM').disabled) {
      handleBOMScraping();
    }
  }
});

// Add tooltip for keyboard shortcuts
document.getElementById('download').title = 'Ctrl+Enter';
document.getElementById('scrapeBOM').title = 'Ctrl+Shift+Enter';