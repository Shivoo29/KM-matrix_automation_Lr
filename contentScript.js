(() => {
  const parseTable = () => {
    const rows = document.querySelectorAll('table tbody tr');
    const parts = [];

    rows.forEach(row => {
      const cell = row.querySelectorAll('td');
      if (cell.length < 18) return;

      const part = {
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
      };

      parts.push(part);
    });

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

  const parts = parseTable();
  exportToExcel(parts);
  chrome.runtime.sendMessage({ action: 'bomExtracted', parts });
})();
