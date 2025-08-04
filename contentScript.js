// Enhanced Content Script with Color-Coded Excel Generation

(() => {
  // Expand all BOM rows function
  function expandAllRows(callback) {
    function clickNext() {
      const icons = document.querySelectorAll('img[src^="data:image/svg+xml,%3csvg%20width=\'6\'%20height=\'8\'"]');
      if (icons.length === 0) {
        console.log("✅ All rows expanded.");
        setTimeout(callback, 1500);
        return;
      }

      // Click the first expandable icon
      icons[0].click();

      // Wait and re-scan
      setTimeout(clickNext, 800);
    }

    clickNext();
  }


  // Parse BOM table with enhanced data extraction
  const parseTable = () => {
    const partSpans = document.querySelectorAll('.click-item');
    const parts = [];
    
    console.log('🔍 Found part spans:', partSpans.length);
    
    partSpans.forEach(span => {
      // Find the closest row
      const row = span.closest('tr');
      if (!row) return;
      
      const cells = row.querySelectorAll('td');
      if (cells.length < 18) return; // Ensure we have enough cells
      
      const part = {
        item: cells[0].innerText.trim(),
        partNumber: cells[1].innerText.trim(),
        rev: cells[2].innerText.trim(),
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
        ccm: cells[15].innerText.trim(),
        cmrcl: cells[16].innerText.trim(),
        mtl: cells[17].innerText.trim(),
        nestingLevel: row.querySelectorAll('.treegrid-indent').length,
        downloadStatus: 'pending', // Will be updated during download process
        hasFiles: { pdf: false, stp: false }
      };

      parts.push(part);
    });

    return parts;
  };

  // Enhanced Excel export with color coding and better formatting
  const exportToExcel = (parts, downloadStats = null) => {
    console.log('📊 Generating enhanced Excel report...');
    
    // Prepare headers
    const headers = [
      'Item', 'Part Number', 'Rev', 'Description', 'Qty', 'UOM', 'ICAT', 'CE', 
      'Status', 'Mat Group', 'Cust Viewable', 'Manufacture Detail', 
      'Internal Note', 'EC', 'SCP', 'CCM', 'CMRCL', 'MTL', 'PDF Status', 'STP Status'
    ];

    // Prepare data rows with download status
    const rows = parts.map(part => {
      const row = [
        part.item,
        part.partNumber,
        part.rev,
        '  '.repeat(part.nestingLevel) + part.description, // Indent based on nesting level
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
        part.downloadStatus === 'no_pdf' ? 'Not Found' : 
        part.downloadStatus === 'success' ? 'Downloaded' :
        part.downloadStatus === 'timeout' ? 'Timeout' : 'Pending',
        part.hasFiles?.stp ? 'Downloaded' : 'Not Found'
      ];
      return row;
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Apply column widths
    const columnWidths = [
      { wch: 8 },   // Item
      { wch: 20 },  // Part Number
      { wch: 8 },   // Rev
      { wch: 40 },  // Description
      { wch: 8 },   // Qty
      { wch: 8 },   // UOM
      { wch: 10 },  // ICAT
      { wch: 8 },   // CE
      { wch: 12 },  // Status
      { wch: 15 },  // Mat Group
      { wch: 12 },  // Cust Viewable
      { wch: 20 },  // Manufacture Detail
      { wch: 20 },  // Internal Note
      { wch: 8 },   // EC
      { wch: 8 },   // SCP
      { wch: 8 },   // CCM
      { wch: 8 },   // CMRCL
      { wch: 8 },   // MTL
      { wch: 12 },  // PDF Status
      { wch: 12 }   // STP Status
    ];
    worksheet['!cols'] = columnWidths;

    // Apply cell styling for color coding
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let rowNum = 1; rowNum <= range.e.r; rowNum++) { // Start from 1 to skip header
      const partIndex = rowNum - 1;
      const part = parts[partIndex];
      
      if (!part) continue;
      
      let fillColor = 'FFFFFF'; // Default white
      
      // Determine row color based on download status
      if (part.downloadStatus === 'success') {
        fillColor = 'C6EFCE'; // Light green
      } else if (part.downloadStatus === 'no_pdf' || part.downloadStatus === 'no_files') {
        fillColor = 'FFC7CE'; // Light red
      } else if (part.downloadStatus === 'timeout') {
        fillColor = 'FFEB9C'; // Light yellow
      }
      
      // Apply color to all cells in the row
      for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
          fill: {
            fgColor: { rgb: fillColor }
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D0D0' } },
            bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } }
          }
        };
      }
    }

    // Style header row
    for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colNum });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: '0066CC' } }, // Lam Research blue
          font: { color: { rgb: 'FFFFFF' }, bold: true },
          border: {
            top: { style: 'medium', color: { rgb: '000000' } },
            bottom: { style: 'medium', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
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
      ['Main Part Number:', parts[0]?.partNumber || 'Unknown', ''],
      ['Total Parts:', parts.length.toString(), ''],
      ['Generated:', new Date().toLocaleString(), ''],
      ['Generated By:', 'KM Matrix Automation Tool v1.2', '']
    ];

    const legendSheet = XLSX.utils.aoa_to_sheet(legendData);
    
    // Style legend sheet
    legendSheet['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 25 }];
    
    // Color code the legend
    const legendColors = {
      3: 'C6EFCE', // Green row
      4: 'FFC7CE', // Red row
      5: 'FFEB9C', // Yellow row
      6: 'FFFFFF'  // White row
    };
    
    Object.keys(legendColors).forEach(rowIndex => {
      const row = parseInt(rowIndex);
      for (let col = 0; col < 3; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
        if (legendSheet[cellAddr]) {
          legendSheet[cellAddr].s = {
            fill: { fgColor: { rgb: legendColors[rowIndex] } },
            border: {
              top: { style: 'thin', color: { rgb: 'D0D0D0' } },
              bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
              left: { style: 'thin', color: { rgb: 'D0D0D0' } },
              right: { style: 'thin', color: { rgb: 'D0D0D0' } }
            }
          };
        }
      }
    });

    // Create workbook and add sheets
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BOM Structure");
    XLSX.utils.book_append_sheet(workbook, legendSheet, "Legend & Info");
    let folderPath = '';

    // Generate filename with timestamp
    const mainPartNumber = parts[0]?.partNumber || 'Unknown';
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `${folderPath}${mainPartNumber}_BOM_Structure_${timestamp}.xlsx`;

    // Download the file
    XLSX.writeFile(workbook, filename);
    
    console.log('✅ Enhanced Excel report generated:', filename);
  };

  // Listen for Excel generation requests from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'generateExcelReport') {
      const { parts, mainPartNumber, stats } = message.data;
      exportToExcel(parts, stats);
      sendResponse({ status: 'Excel report generated' });
    }
  });

  // Main execution: expand all rows and extract BOM
  expandAllRows(() => {
    console.log('🔄 All rows expanded, parsing BOM table...');
    const parts = parseTable();
    
    if (parts.length > 0) {
      console.log('📦 BOM extraction completed:', parts.length, 'parts found');
      exportToExcel(parts);
      chrome.runtime.sendMessage({ action: 'bomExtracted', parts });
    } else {
      console.log('❌ No BOM parts found');
      chrome.runtime.sendMessage({ 
        action: 'progress', 
        log: 'No BOM parts found in the table',
        type: 'error'
      });
    }
  });
})();