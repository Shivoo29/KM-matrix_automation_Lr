@echo off
setlocal

REM --- This script sets up the Native Messaging host to connect the extension to the Python scraper ---

REM Name of the Native Messaging host
set HOST_NAME=km_matrix_automator

REM Get the full path to the directory where this script is located
set SCRIPT_DIR=%dp0~

REM Construct the full path to the Python scraper script
REM The extra "" are to handle potential spaces in the path
set SCRAPER_PATH="%SCRIPT_DIR%scraper.py"

REM Define the path for the manifest file
set MANIFEST_PATH="%SCRIPT_DIR%%HOST_NAME%.json"

REM Get the ID of the extension. 
REM IMPORTANT: Replace this with your actual extension ID from edge://extensions
set EXTENSION_ID=pmpgakonnakhgfjnheooicnmghimaban

REM --- Create the Native Host Manifest JSON file ---
echo Creating Native Host manifest file at %MANIFEST_PATH%...

(
    echo {
    echo   "name": "%HOST_NAME%",
    echo   "description": "Host for KM Matrix Automation Extension",
    echo   "path": %SCRAPER_PATH%,
    echo   "type": "stdio",
    echo   "allowed_origins": [
    echo     "chrome-extension://%EXTENSION_ID%/"
    echo   ]
    echo }
) > %MANIFEST_PATH%

if %errorlevel% neq 0 (
    echo Failed to create manifest file. Exiting.
    exit /b 1
)

echo Manifest file created successfully.

REM --- Register the Native Host with the Windows Registry ---
REM This tells Google Chrome where to find the manifest file.

set REG_KEY="HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\%HOST_NAME%"

echo Registering host with Chrome...

REG ADD %REG_KEY% /ve /t REG_SZ /d %MANIFEST_PATH% /f

if %errorlevel% neq 0 (
    echo ERROR: Failed to create registry key.
    echo Please try running this script as an Administrator.
    exit /b 1
)

echo.
echo ===================================================================
echo  Native Messaging Host for KM Matrix Automation has been installed.
echo ===================================================================
echo.
echo IMPORTANT: You must replace YOUR_EXTENSION_ID_HERE in this script
rem echo with the real ID of your extension from the edge://extensions page.
echo Then, run this script again.

endlocal
pause
