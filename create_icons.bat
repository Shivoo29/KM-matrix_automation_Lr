@echo off
echo Creating placeholder icons for KM Matrix Automation Extension...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH.
    echo.
    echo Please install Python from https://python.org
    echo Or manually create icon files:
    echo - icon16.png (16x16 pixels)
    echo - icon48.png (48x48 pixels) 
    echo - icon128.png (128x128 pixels)
    echo.
    pause
    exit /b 1
)

REM Check if PIL/Pillow is installed
python -c "from PIL import Image" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Pillow (PIL)...
    pip install Pillow
    if %errorlevel% neq 0 (
        echo Failed to install Pillow. Please run: pip install Pillow
        pause
        exit /b 1
    )
)

REM Run the Python script
python create_icons.py

echo.
echo Icons created successfully!
echo You can now load the extension in Chrome or Edge.
echo.
echo For Chrome: chrome://extensions/
echo For Edge: edge://extensions/
echo.
pause 