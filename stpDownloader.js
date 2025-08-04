// stpDownloader.js

/**
 * Attempts to find and download .stp files from the current page.
 * This function should be called from background.js or a content script.
 */
async function findAndDownloadSTPFiles() {
    try {
        // Scan the DOM for any elements that might contain .stp file references
        const elements = document.querySelectorAll('a, script, link, iframe, object');
        const stpLinks = [];

        elements.forEach(el => {
            const href = el.href || el.src || el.data;
            if (href && href.endsWith('.stp')) {
                stpLinks.push(href);
            }
        });

        if (stpLinks.length === 0) {
            console.log('No direct .stp links found.');
            return;
        }

        // Send message to background.js to trigger download
        stpLinks.forEach(link => {
            chrome.runtime.sendMessage({ action: 'downloadSTP', url: link });
        });
    } catch (error) {
        console.error('Error finding or downloading STP files:', error);
    }
}

export { findAndDownloadSTPFiles };
