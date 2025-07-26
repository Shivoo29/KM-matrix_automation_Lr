# KM-matrix Drawing Automation Extension

This Chrome extension is an automation tool designed to streamline the process of downloading engineering drawings and associated Bill of Materials (BOM) parts from the Lam Research KM-matrix web portal. It was developed for the Lam India Global Operation (LIGO) team to eliminate manual, repetitive tasks and accelerate the supply chain workflow.

## The Problem

The LIGO supply chain team is responsible for procuring parts based on engineering CAD designs. This requires them to manually download numerous drawing files (PDF, STP, etc.) from the KM-matrix portal for each part requested. This process is tedious, especially for complex assemblies with many nested BOM parts, and is prone to human error, such as missing components.

## The Solution

This extension automates the entire download process. With a single click, it can:
- Traverse a complete BOM structure, including nested parts.
- Identify all associated drawing files for every component in the BOM.
- Download all files efficiently.

This turns a potentially hours-long manual process into a task that takes only a few seconds, freeing up the LIGO team to focus on higher-value activities.

## Features

- **One-Click Operation:** Download all drawings for a top-level part with a single click.
- **Nested BOM Support:** Automatically discovers and downloads files for all sub-assemblies and components.
- **Multi-File Type Compatibility:** Handles all drawing file formats available on KM-matrix.
- **Seamless Integration:** Injects a simple user interface directly into the KM-matrix "BOMFinder" page.

## Installation

To install this extension in your browser (Google Chrome, Microsoft Edge):

1.  Download or clone this project repository to your local machine.
2.  Open your browser and navigate to the extensions page:
    -   Chrome: `chrome://extensions`
    -   Edge: `edge://extensions`
3.  Enable **"Developer mode"** using the toggle switch, usually found in the top-right corner.
4.  Click the **"Load unpacked"** button.
5.  Select the directory where you saved this project.
6.  The extension will now be installed and active. You should see its icon in your browser's toolbar.

## How to Use

1.  Navigate to a `BOMFinder` page on the KM-matrix portal.
2.  The extension will automatically inject a "Download All" button onto the page.
3.  Click the **"Download All"** button to begin the process.
4.  All associated drawings for the main part and its nested BOM will be downloaded by your browser.

## Known Limitations

- **Internet Connection:** A stable and fast internet connection is required. Downloads will fail if the connection is interrupted.
- **System Resources:** Downloading a very large number of drawings simultaneously can be memory-intensive and may cause performance issues on computers with limited RAM.

## Technology Stack

- **Manifest Version:** 3
- **Languages:** JavaScript, HTML, CSS
- **Libraries:** `xlsx.full.min.js` (for potential Excel data handling)
- **APIs:** Chrome Extension APIs (Tabs, Scripting, Downloads)
