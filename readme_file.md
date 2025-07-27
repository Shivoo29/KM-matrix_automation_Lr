# 🔧 KM Matrix Automation Tool

**Advanced Chrome Extension for Lam Research Internal Use**

A powerful automation tool designed specifically for Lam Research employees to streamline the process of downloading PDFs, STP files, and BOM (Bill of Materials) structures from the KM Matrix system.

---

## 🚀 Features

### ✨ **Core Functionality**
- **Bulk PDF Downloads**: Download multiple part drawings simultaneously
- **BOM Structure Extraction**: Automatically scrape and organize Bill of Materials
- **STP File Support**: Download both PDF drawings and STP 3D models
- **Smart Folder Organization**: Automatic file organization with proper folder structure
- **Excel Report Generation**: Color-coded Excel files with download status
- **Real-time Progress Tracking**: Live progress bars and status updates

### 🎨 **User Interface**
- **Futuristic Design**: Modern, glass-morphism UI with gradient backgrounds
- **Real-time Logs**: Live status updates with color-coded messages
- **Progress Analytics**: Success/failure statistics with visual indicators
- **Responsive Controls**: Intuitive buttons with hover effects and animations

### 📁 **File Organization Structure**
```
MainPartNumber/
├── MainPartNumber.pdf          # Main part PDF
├── MainPartNumber.stp          # Main part STP file
├── MainPartNumber_BOM_Structure_YYYY-MM-DD.xlsx  # BOM Excel report
└── bomparts/                   # BOM parts folder
    ├── PartNumber1.pdf
    ├── PartNumber1.stp
    ├── PartNumber2.pdf
    ├── PartNumber2.stp
    └── nestedBOMparts1/        # Nested BOM parts (Level 1)
        ├── NestedPart1.pdf
        ├── NestedPart1.stp
        └── nestedBOMparts2/    # Nested BOM parts (Level 2)
            ├── DeepNestedPart1.pdf
            └── DeepNestedPart1.stp
```

---

## 🛠️ Installation Guide

### **Prerequisites**
- Google Chrome Browser (Version 88+)
- Access to Lam Research internal network
- Valid KM Matrix system credentials

### **Step-by-Step Installation**

1. **Download the Extension Files**
   ```bash
   # Clone or download the extension files to your computer
   git clone [repository-url]
   # OR download and extract the ZIP file
   ```

2. **Enable Developer Mode in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle "Developer mode" ON (top-right corner)
   - You should see additional options appear

3. **Load the Extension**
   - Click "Load unpacked" button
   - Select the folder containing the extension files
   - The extension should appear in your extensions list

4. **Verify Installation**
   - Look for the KM Matrix Automation icon in your Chrome toolbar
   - Click the icon to open the extension popup
   - You should see the futuristic blue interface

5. **Pin the Extension (Recommended)**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "KM-matrix_automation_Lr" and click the pin icon
   - This keeps the extension easily accessible

---

## 📖 Usage Instructions

### **Method 1: Individual PDF Downloads**

1. **Open the Extension**
   - Click the KM Matrix Automation icon in your Chrome toolbar

2. **Enter Part Numbers**
   - Type part numbers in the text area (one per line)
   - Example:
     ```
     839-B75409-001
     796-095390-102
     202-010805-001
     ```

3. **Start Download**
   - Click the "Download PDFs" button
   - Watch the progress bar and live logs
   - Files will be downloaded to your Downloads folder

### **Method 2: Complete BOM Structure**

1. **Enter Main Part Numbers**
   - Input the main assembly part numbers
   - The tool will automatically extract the complete BOM structure

2. **Start BOM Processing**
   - Click "BOM + PDFs" button
   - The tool will:
     - Extract the complete BOM structure
     - Generate a color-coded Excel report
     - Download all PDF and STP files
     - Organize files in proper folder structure

3. **Monitor Progress**
   - Watch real-time progress updates
   - Check success/failure statistics
   - Review detailed logs for any issues

---

## 📊 Excel Report Features

### **Color Coding System**
- 🟢 **Green Rows**: Files downloaded successfully
- 🔴 **Red Rows**: No PDF/STP files found (manual check required)
- 🟡 **Yellow Rows**: Connection timeout (retry recommended)
- ⚪ **White Rows**: Not processed yet

### **Report Contents**
- Complete BOM hierarchy with proper indentation
- All part details (Item, Rev, Description, Qty, etc.)
- Download status for each part
- Legend sheet with instructions
- Timestamp and main part identification

---

## 🔧 Technical Specifications

### **File Types Supported**
- **PDF**: Technical drawings and specifications
- **STP**: 3D CAD model files
- **Excel**: BOM structure reports with .xlsx format

### **Browser Compatibility**
- Google Chrome (Primary)
- Chromium-based browsers (Edge, Brave, etc.)

### **Network Requirements**
- Access to `kmmatrix.fremont.lamrc.net`
- Stable internet connection for bulk downloads
- Lam Research internal network access

---

## ⚠️ Important Notes

### **Access Restrictions**
- **This tool is designed exclusively for Lam Research employees**
- Requires valid access to the KM Matrix system
- Not for external or unauthorized use

### **Best Practices**
- Process small batches (10-20 parts) for optimal performance
- Ensure stable network connection before starting large downloads
- Check red-highlighted items in Excel reports manually
- Keep Chrome updated for best compatibility

### **Troubleshooting**
- If downloads fail, check network connectivity
- Clear browser cache if extension behaves unexpectedly
- Reload the extension from `chrome://extensions/` if needed
- Check console logs (F12) for detailed error information

---

## 🏗️ Project Structure

```
KM-Matrix-Automation/
├── manifest.json              # Extension configuration
├── background.js              # Main automation logic
├── contentScript.js           # BOM extraction script
├── popup.html                 # User interface
├── popup.js                   # UI interaction logic
├── xlsx.full.min.js          # Excel generation library
└── README.md                  # This documentation
```

---

## 🔄 Version History

### **v1.1 (Current)**
- ✅ Added STP file download support
- ✅ Implemented smart folder organization
- ✅ Enhanced UI with real-time progress tracking
- ✅ Added color-coded Excel reports
- ✅ Improved error handling and timeout management

### **v1.0**
- ✅ Basic PDF download functionality
- ✅ BOM structure extraction
- ✅ Simple folder organization

---

## 🛡️ Security & Privacy

- **Local Processing**: All data processing happens locally in your browser
- **No Data Storage**: Extension doesn't store or transmit personal data
- **Network Access**: Only connects to authorized Lam Research systems
- **Secure Downloads**: Uses Chrome's built-in download security features

---

## 📞 Support & Contact

For technical support or feature requests:

1. **Internal IT Support**: Contact Lam Research IT helpdesk
2. **Documentation**: Check Confluence pages for additional resources
3. **Updates**: Watch for extension updates through Chrome

---

## 📜 License & Disclaimer

**For Internal Use Only**

This extension is developed for Lam Research internal operations. Unauthorized distribution, modification, or use outside of Lam Research is strictly prohibited.

The tool is provided "as-is" without warranty. Users are responsible for verifying downloaded content and ensuring compliance with internal policies.

---

**Built with ❤️ for Lam Research Proto4Lab Team**