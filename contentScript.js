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
            while(keepTrying) {
                const expanders = Array.from(document.querySelectorAll(expanderSelector)).filter(
                    (expander) => !expander.hasAttribute('data-gemini-clicked')
                );

                if (expanders.length === 0) {
                    keepTrying = false;
                } else {
                    for (const expander of expanders) {
                        expander.click();
                        expander.setAttribute('data-gemini-clicked', 'true');
                        await new Promise(r => setTimeout(r, 500));
                    }
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            resolve();
        });
    };

    await expandAll();

    console.log("Expansion complete. Parsing table...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    const parts = parseTable();
    console.log(`Found ${parts.length} parts.`);
    exportToExcel(parts);
    chrome.runtime.sendMessage({ action: 'bomExtracted', parts });
  };

  const observer = new MutationObserver((mutations, obs) => {
    const bomTable = document.querySelector('div[data-testid="BOM-Finder-list"] .k-grid-table');
    if (bomTable) {
      console.log("BOM table found. Starting extraction process.");
      obs.disconnect();
      expandAndExtract();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  setTimeout(() => {
      observer.disconnect();
  }, 30000);

})();
