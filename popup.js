document.getElementById('download').addEventListener('click', () => {
  const input = document.getElementById('partNumbers').value;
  const partNumbers = input.split('\n').map(p => p.trim()).filter(p => p);

  chrome.runtime.sendMessage({ action: 'startDownload', partNumbers });
});

document.getElementById('scrapeBOM').addEventListener('click', () => {
  const input = document.getElementById('partNumbers').value;
  const partNumbers = input.split('\n').map(p => p.trim()).filter(p => p);

  chrome.runtime.sendMessage({ action: 'scrapeBOM', partNumbers });
});
