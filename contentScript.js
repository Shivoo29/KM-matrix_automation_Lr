(() => {
  const parseTable = () => {
    const rows = document.querySelectorAll('.k-table-tbody tr.k-master-row');
    const parts = [];

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 19) return;

      const partNumberEl = cells[1].querySelector('.click-item');
      const revEl = cells[2].querySelector('.rev-finder');

      const part = {
        item: cells[0].innerText.trim(),
        partNumber: partNumberEl ? partNumberEl.innerText.trim() : '',
        rev: revEl ? revEl.innerText.trim() : '',
        description: cells[3].innerText.trim(),
        qty: cells[4].innerText.trim(),
        uom: cells[5].innerText.trim(),
        icat: cells[6].innerText.trim(),
        ce: cells[7].innerText.trim(),
        status: cells[8].innerText.trim(),
        matGroup: cells[9].innerText.trim(),
        custViewable: cells[10].innerText.trim(),
        manufactureDetail: cells[11].innerText.trim(),
        internalNote: cells[12].innerText.trim(),
        ec: cells[13].innerText.trim(),
        scp: cells[14].innerText.trim(),
        sc: cells[15].innerText.trim(),
        ccm: cells[16].innerText.trim(),
        cmrcl: cells[17].innerText.trim(),
        mtl: cells[18].innerText.trim(),
        nestingLevel: row.querySelectorAll('.line-tree').length
      };

      parts.push(part);
    });

    return parts;
  };

  const exportToExcel = (parts) => {
    if (!parts || parts.length === 0) {
        console.log("No parts to export.");
        return;
    }
    const headers = Object.keys(parts[0]);
    const rows = parts.map(part =>
      headers.map(key =>
        key === 'description'
          ? '  '.repeat(part.nestingLevel) + part[key]
          : part[key]
      )
    );

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BOM");

    XLSX.writeFile(workbook, "BOM_Structure.xlsx");
  };

  const expandAndExtract = async () => {
    const expanderSelector = 'td.part-number-column img[style*="cursor: pointer"]';

    const expandAll = () => {
        return new Promise(async (resolve) => {
            let keepTrying = true;
            let cycles = 0;
            while(keepTrying && cycles < 20) { // Safety break after 20 cycles
                const expanders = Array.from(document.querySelectorAll(expanderSelector)).filter(
                    (expander) => !expander.hasAttribute('data-gemini-clicked')
                );

                if (expanders.length === 0) {
                    keepTrying = false;
                } else {
                    console.log(`Found ${expanders.length} new rows to expand...`);
                    for (const expander of expanders) {
                        expander.click();
                        expander.setAttribute('data-gemini-clicked', 'true');
                        await new Promise(r => setTimeout(r, 500)); // Stagger clicks
                    }
                    await new Promise(r => setTimeout(r, 1000)); // Wait for UI to update
                }
                cycles++;
            }
            resolve();
        });
    };

    await expandAll();

    console.log("Expansion complete. Parsing table...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    const parts = parseTable();
    if (parts.length > 0) {
        console.log(`Found and parsed ${parts.length} parts.`);
        exportToExcel(parts);
        chrome.runtime.sendMessage({ action: 'bomExtracted', parts });
    } else {
        console.error("Error: No parts were found after attempting to expand and parse the table.");
    }
  };

  const waitForElement = (selector, callback) => {
      let interval = setInterval(() => {
          const element = document.querySelector(selector);
          if (element) {
              console.log(`Element '${selector}' found. Proceeding with extraction.`);
              clearInterval(interval);
              callback();
          }
      }, 1000);

      setTimeout(() => {
          clearInterval(interval);
          console.error(`Timeout: Could not find element '${selector}' after 30 seconds.`);
      }, 30000);
  };

  console.log("Content script injected. Waiting for BOM table to appear...");
  waitForElement('div[data-testid="BOM-Finder-list"] .k-grid-table', expandAndExtract);

})();