# KM Matrix Automation Extension

Automates downloading engineering drawings from Lam Research's internal KM Matrix system (kmmatrix.fremont.lamrc.net). Compatible with **Google Chrome** and **Microsoft Edge**.

## 🚀 Quick Start

### Installation

#### For Google Chrome:
1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable "Developer mode"** (toggle in top right)
4. **Click "Load unpacked"** and select the extension folder
5. **Extension icon** will appear in your Chrome toolbar

#### For Microsoft Edge:
1. **Download/Clone** this repository to your local machine
2. **Open Edge** and go to `edge://extensions/`
3. **Enable "Developer mode"** (toggle in top left)
4. **Click "Load unpacked"** and select the extension folder
5. **Extension icon** will appear in your Edge toolbar

### Usage
1. **Click the extension icon** to open the popup
2. **Enter part numbers** (one per line), e.g.:
   ```
   810-341810-003
   710-341810-101
   648-320227-476
   ```
3. **Click "Start"** to begin automation
4. **Monitor progress** in the popup
5. **Downloads** will be saved to your default Downloads folder

## 📋 Features

### Part Processing
- Downloads the main engineering drawing for each part number entered.

### File Naming Convention
```
LAM-[CleanPartNumber]-L0-MAIN.pdf

Example:
- LAM-810341810003-L0-MAIN.pdf
```

### Automation Flow
1. For each part number in the list:
2. **Navigate** to the drawing viewer page.
3. **Download** the main drawing PDF.

## 🧪 Testing

### Test Part Numbers
- `810-341810-003`
- `710-341810-101`
- `648-320227-476`

### Testing Steps
1. **Load extension** in Chrome or Edge.
2. **Navigate** to the KM Matrix system and log in.
3. **Open the extension popup**.
4. **Enter one or more test part numbers**.
5. **Click "Start"** and monitor the progress.
6. **Verify** that the corresponding PDF drawings are saved to your Downloads folder.
7. **Check** that the downloaded files follow the specified naming convention.

## ⚙️ Final Setup Instructions

Follow these steps on your company laptop to configure the full extension and backend scraper.

### Step 1: Setup the Python Environment (First Time Only)

1.  **Open a terminal** in the project directory.
2.  **Create a virtual environment:** `python -m venv venv`
3.  **Activate the environment:** `.\venv\Scripts\activate` (on Windows).
4.  **Install dependencies:** `pip install -r requirements.txt`

### Step 2: Install the Native Messaging Host

This critical step connects the browser extension to the Python script.

1.  **Load your extension in Edge.** Go to `edge://extensions/`, make sure "Developer mode" is on, and click "Load unpacked" to select your project folder.
2.  **Find your extension's ID.** On the extensions page, find your "KM Matrix Automation" extension. The ID is a long string of letters (e.g., `fmkadmapgofadopljbjfkapdkoienihi`). Copy it.
3.  **Edit `install.bat`.** Open the `install.bat` file in a text editor. Replace the placeholder `YOUR_EXTENSION_ID_HERE` with the actual ID you just copied. Save the file.
4.  **Run the installer.** In your terminal (no virtual environment needed), run the script:
    ```bash
    install.bat
    ```
    You should see a success message.

### Step 3: Run the Automation

This is the process you will follow for daily use.

1.  **Force-quit all Edge processes.** Open **Task Manager** (`Ctrl+Shift+Esc`) and end every `msedge.exe` task.
2.  **Launch Edge for automation.** Open a Command Prompt or PowerShell and run:
    ```powershell
    # In PowerShell
    & "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222
    ```
3.  In the new Edge window, **log in to the KM Matrix website** and leave the window open.
4.  **Use the extension.** Click the extension icon in your browser toolbar, paste your part numbers, and click "Start". The downloads should begin automatically and save to your main Downloads folder.

## 🔧 Technical Details

### Extension Structure
```
manifest.json (Manifest V3)
├── popup/
│   ├── popup.html (user interface)
│   ├── popup.js (popup logic)
│   └── popup.css (styling)
├── content/
│   ├── content.js (DOM manipulation)
│   └── inject.js (page interaction)
├── background/
│   └── background.js (service worker)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Security & Compliance
- ✅ **Local processing only** - no external API calls
- ✅ **Uses authenticated session** - no login required
- ✅ **No data transmission** - all processing in browser
- ✅ **No cloud storage** - downloads go directly to local machine
- ✅ **No logging services** - all logs stay in browser

### Error Handling
- **Network timeouts** - graceful handling with retries
- **Missing parts** - skipped with error logging
- **Failed downloads** - continue processing other parts
- **Invalid part numbers** - clear error messages
- **Page navigation issues** - automatic retry logic

## 📁 GitHub Deployment

### For Manager Review

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial KM Matrix Automation Extension"
   git branch -M main
   git remote add origin https://github.com/yourusername/km-matrix-automation.git
   git push -u origin main
   ```

2. **Share Repository Link** with manager

3. **Installation Instructions for Manager:**
   - Download ZIP from GitHub
   - Extract to local folder
   - Follow installation steps above
   - Test with provided part numbers

### Repository Structure
```
km-matrix-automation/
├── README.md (this file)
├── manifest.json
├── popup/
├── content/
├── background/
├── icons/
└── .gitignore (if needed)
```

## 🐛 Troubleshooting

### Common Issues

**Extension not loading:**
- Check browser version (requires Chrome 88+ or Edge 88+)
- Verify all files are present
- Check console for errors
- For Edge: Ensure you're using the Chromium-based version (Edge 79+)

**No downloads:**
- Ensure logged into KM Matrix
- Check part number format (XXX-XXXXXX-XXX)
- Verify access permissions to parts

**Wrong file names:**
- Check part number format
- Verify naming convention implementation
- Look for special characters in part numbers

**Automation stops:**
- Check network connection
- Verify KM Matrix is accessible
- Look for popup error messages

### Debug Mode
1. **Open Chrome DevTools** (F12)
2. **Go to Console tab**
3. **Look for extension errors**
4. **Check Network tab** for failed requests

## 📞 Support

For issues or questions:
1. **Check troubleshooting section** above
2. **Review error logs** in extension popup
3. **Contact IT administrator** for KM Matrix access issues
4. **Contact extension maintainer** for technical issues

## 🔄 Updates

### Version History
- **v1.0** - Initial release with simplified core functionality.

### Planned Features
- [ ] Download progress reporting
- [ ] Custom download folder selection
- [ ] Batch processing optimization
- [ ] Error recovery mechanisms
- [ ] User preference settings

---

**Note:** This extension is designed for internal Lam Research use only and requires access to the KM Matrix system.
 