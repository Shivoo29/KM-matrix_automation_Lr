
# scraper.py
import sys
import json
import struct
import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions

# Helper function to send a message back to the Chrome extension
def send_message(message):
    # Pack the message length into a 4-byte integer
    encoded_content = json.dumps(message).encode('utf-8')
    encoded_length = struct.pack('@I', len(encoded_content))
    # Write the length and the message to stdout
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()

def get_default_download_path():
    """Returns the default downloads path for the current user."""
    if os.name == 'nt': # Windows
        # This is a reliable way to get the Downloads folder path on Windows
        import ctypes
        from ctypes import windll, wintypes
        CSIDL_DOWNLOADS = 37
        SHGFP_TYPE_CURRENT = 0
        buf = ctypes.create_unicode_buffer(wintypes.MAX_PATH)
        windll.shell32.SHGetFolderPathW(None, CSIDL_DOWNLOADS, None, SHGFP_TYPE_CURRENT, buf)
        return buf.value
    else: # macOS / Linux
        return os.path.join(os.path.expanduser('~'), 'Downloads')

def download_part_drawing(part_number, download_folder):
    """
    Uses Selenium to download a single part drawing PDF from KM Matrix.
    """
    send_message({"status": "info", "message": f"Connecting to browser for {part_number}"})

    try:
        chrome_options = ChromeOptions()
        
        # --- Key Setting ---
        # Connect to an already running instance of Chrome that has remote debugging enabled.
        chrome_options.add_experimental_option("debuggerAddress", "localhost:9222")
        
        # Path to the Chrome WebDriver. 
        service = ChromeService()
        driver = webdriver.Chrome(service=service, options=chrome_options)

        # The script will now control the browser you opened manually.
        # We need to open the part in a new tab.
        driver.execute_script("window.open('', '_blank');")
        driver.switch_to.window(driver.window_handles[-1])

        # Construct the URL and navigate to it
        url = f"https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber={part_number}"
        driver.get(url)

        # --- Wait for Download to Complete ---
        # The file should download automatically based on browser settings.
        # We need to wait for the file to appear in the default download folder.
        
        clean_part = part_number.replace('-', '')
        expected_filename = f"LAM-{clean_part}-L0-MAIN.pdf"
        # The download folder is now the system's default, not one we can set.
        download_folder = get_default_download_path()
        expected_filepath = os.path.join(download_folder, expected_filename)
        
        # Check for a temporary download file first (.crdownload)
        temp_filepath = expected_filepath + ".crdownload"
        
        timeout = 60  # 60-second timeout for the download
        start_time = time.time()
        download_complete = False

        send_message({"status": "info", "message": f"Waiting for download in: {download_folder}"})

        while time.time() - start_time < timeout:
            # Check if the temp file exists and has finished downloading
            if os.path.exists(expected_filepath) and not os.path.exists(temp_filepath):
                # Add a small delay to ensure the file is fully written
                time.sleep(2)
                send_message({"status": "info", "message": f"File {expected_filename} downloaded successfully."})
                download_complete = True
                break
            time.sleep(1) # Wait 1 second before checking again

        # Close the tab we opened
        driver.close()
        # Switch back to the original tab/window
        driver.switch_to.window(driver.window_handles[0])

        if not download_complete:
            raise TimeoutError(f"Download timed out after {timeout} seconds. Check if the file was downloaded manually.")

        return {"status": "success", "partNumber": part_number, "filepath": expected_filepath}

    except Exception as e:
        send_message({"status": "error", "message": str(e)})
        # Do not quit the driver, as it was opened by the user.
        return {"status": "error", "partNumber": part_number, "error": str(e)}

if __name__ == '__main__':
    # This script can be run in two ways:
    # 1. For Native Messaging (from the extension): It reads JSON from stdin.
    # 2. For direct testing: Pass a part number as a command-line argument.

    # Check if a part number was passed as a command-line argument for testing
    if len(sys.argv) > 1:
        part_to_test = sys.argv[1]
        print(f"--- Running in Test Mode for Part: {part_to_test} ---")
        
        # In test mode, we don't send messages back to an extension, just print the outcome.
        def test_send_message(message):
            print(json.dumps(message, indent=2))

        # Replace the real send_message with our test version
        send_message = test_send_message

        project_dir = os.path.dirname(os.path.abspath(__file__))
        test_download_folder = os.path.join(project_dir, "Downloads")

        if not os.path.exists(test_download_folder):
            os.makedirs(test_download_folder)
        
        download_part_drawing(part_to_test, test_download_folder)
        sys.exit(0)

    # --- Native Messaging Mode ---
    # (This part runs when called by the Chrome extension)
    try:
        # Read the message length (first 4 bytes)
        raw_length = sys.stdin.buffer.read(4)
        if not raw_length:
            sys.exit(0)
        message_length = struct.unpack('@I', raw_length)[0]
        
        # Read the message content
        message_content = sys.stdin.buffer.read(message_length).decode('utf-8')
        data = json.loads(message_content)
        
        part_number = data.get("partNumber")
        project_dir = os.path.dirname(os.path.abspath(__file__))
        download_folder = data.get("downloadFolder", os.path.join(project_dir, "Downloads"))

        if not os.path.exists(download_folder):
            os.makedirs(download_folder)

        if part_number:
            result = download_part_drawing(part_number, download_folder)
            send_message(result)
        else:
            send_message({"status": "error", "message": "No partNumber provided."})

    except Exception as e:
        # Use a log file for debugging errors in native messaging mode
        log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper_error.log")
        with open(log_file, "a") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Fatal error: {str(e)}\n")

