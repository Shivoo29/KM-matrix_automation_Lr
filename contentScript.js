(() => {
  function expandAllRows(callback) {
  let clicks = 0;
  function clickNext() {
    const icons = document.querySelectorAll('img[src^="data:image/svg+xml,%3csvg%20width=\'6\'%20height=\'8\'"]');
    if (icons[clicks]) {
      icons[clicks].click();
      clicks++;
      setTimeout(clickNext, 800); // Wait for expansion
    } else {
      setTimeout(callback, 1500); // Wait for last expansion
    }
  }
  clickNext();
}


  // function waitForExpansion(selector, minCount, callback, timeout = 10000) {
  //     const start = Date.now();
  //     const observer = new MutationObserver(() => {
  //       const elements = document.querySelectorAll(selector);
  //       if (elements.length >= minCount) {
  //         observer.disconnect();
  //         callback();
  //       } else if (Date.now() - start > timeout) {
  //         observer.disconnect();
  //         callback(); // fallback: run anyway after timeout
  //         }
  //       });
  //       observer.observe(document.body, { childList: true, subtree: true });
  //     }

  const parseTable = () => {
    

    
    
    const partSpans = document.querySelectorAll('.click-item');
    const parts = [];
    //const rows = document.querySelectorAll('table.k-table.k-grid-table.k-table-md tbody.k-table-tbody tr');
    //const rows = document.querySelectorAll('table tbody tr');
    //const parts = [];
    console.log(partSpans)
    partSpans.forEach(span => {
  
    // Find the closest row
    const row = span.closest('tr');
    if (!row) return;
    const cell = row.querySelectorAll('td');

    parts.push({

      // Add more field
        item: cell[0].innerText.trim(),
        partNumber: cell[1].innerText.trim(),
        rev: cell[2].innerText.trim(),
        description: cell[3].innerText.trim(),
        qty: cell[4].innerText.trim(),
        uom: cell[5].innerText.trim(),
        icat: cell[6].innerText.trim(),
        ce: cell[7].innerText.trim(),
        status: cell[8].innerText.trim(),
        matGroup: cell[9].innerText.trim(),
        custViewable: cell[10].innerText.trim(),
        manufactureDetail: cell[11].innerText.trim(),
        internalNote: cell[12].innerText.trim(),
        ec: cell[13].innerText.trim(),
        scp: cell[14].innerText.trim(),
        ccm: cell[15].innerText.trim(),
        cmrcl: cell[16].innerText.trim(),
        mtl: cell[17].innerText.trim(),
        nestingLevel: row.querySelectorAll('.treegrid-indent').length
      });
  });

    // rows.forEach(row => {
    //   //const cell = row.querySelectorAll('td');
    //   //if (cell.length < 18) return;
    //   // Find the part number using the .click-item span
    // const partNumberSpan = row.querySelector('.click-item');
    // if (!partNumberSpan) return; // Skip rows without a part number

    // // Extract other details from the row's cells
    // const cell = row.querySelectorAll('td');
    // // Adjust indices as needed for your table structure

    //   const part = {
    //     item: cell[0].innerText.trim(),
    //     partNumber: cell[1].innerText.trim(),
    //     rev: cell[2].innerText.trim(),
    //     description: cell[3].innerText.trim(),
    //     qty: cell[4].innerText.trim(),
    //     uom: cell[5].innerText.trim(),
    //     icat: cell[6].innerText.trim(),
    //     ce: cell[7].innerText.trim(),
    //     status: cell[8].innerText.trim(),
    //     matGroup: cell[9].innerText.trim(),
    //     custViewable: cell[10].innerText.trim(),
    //     manufactureDetail: cell[11].innerText.trim(),
    //     internalNote: cell[12].innerText.trim(),
    //     ec: cell[13].innerText.trim(),
    //     scp: cell[14].innerText.trim(),
    //     ccm: cell[15].innerText.trim(),
    //     cmrcl: cell[16].innerText.trim(),
    //     mtl: cell[17].innerText.trim(),
    //     nestingLevel: row.querySelectorAll('.treegrid-indent').length
    //   };

    //   parts.push(part);
    // });

    return parts;
  };

  const exportToExcel = (parts) => {
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

  // const parts = parseTable();
  // exportToExcel(parts);
  // chrome.runtime.sendMessage({ action: 'bomExtracted', parts, partSpans });
 // waitForExpansion('.click-item', 3, () => {
       //   setTimeout(() => {
   //   const expandIcon = document.querySelector('img[src^="data:image/svg+xml,%3csvg%20width=\'6\'%20height=\'8\'"]');
     // if (expandIcon) expandIcon.click();
    //}, 5000); // delay of 10

  // const parts = parseTable();
  // exportToExcel(parts);
  // chrome.runtime.sendMessage({ action: 'bomExtracted', parts });
  expandAllRows(() => {
  const parts = parseTable();
  exportToExcel(parts);
  chrome.runtime.sendMessage({ action: 'bomExtracted', parts });
});
//});
})();
