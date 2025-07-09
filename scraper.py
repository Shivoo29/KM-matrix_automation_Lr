
# scraper.py
import sys
import json
import struct
import time
import os
from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions

# Helper function to send a message back to the Chrome extension
def send_message(message):
    # Pack the message length into a 4-byte integer
    encoded_content = json.dumps(message).encode('utf-8')
    encoded_length = struct.pack('@I', len(encoded_content))
    # Write the length and the message to stdout
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()

def get_default_edge_profile_path():
    # Default path for Edge user data on Linux
    # This allows Selenium to use the existing logged-in session
    return os.path.join(os.path.expanduser("~"), ".config/microsoft-edge")

def download_part_drawing(part_number, download_folder):
    """
    Uses Selenium to download a single part drawing PDF from KM Matrix.
    """
    send_message({"status": "info", "message": f"Starting download for {part_number}"})

    try:
        edge_options = EdgeOptions()
        
        # --- Key Settings ---
        # 1. Use the default user profile to leverage existing login sessions
        user_data_dir = get_default_edge_profile_path()
        edge_options.add_argument(f"user-data-dir={user_data_dir}")
        edge_options.add_argument("profile-directory=Default") # Use the "Default" profile

        # 2. Set preferences to auto-download PDFs instead of opening them
        prefs = {
            "plugins.always_open_pdf_externally": True,
            "download.default_directory": download_folder,
            "download.prompt_for_download": False,
            "download.directory_upgrade": True,
        }
        edge_options.add_experimental_option("prefs", prefs)
        
        # Optional: Run headless (without a visible browser window)
        # edge_options.add_argument("--headless")

        # Path to the Edge WebDriver. 
        # If msedgedriver is in your system's PATH, you don't need to specify the path.
        # Otherwise, replace with the actual path to your msedgedriver executable.
        service = EdgeService() 
        
        driver = webdriver.Edge(service=service, options=edge_options)

        # Construct the URL
        url = f"https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber={part_number}"
        driver.get(url)

        # --- Wait for Download to Complete ---
        # The file should download automatically due to the preferences set.
        # We need to wait for the file to appear in the download folder.
        
        clean_part = part_number.replace('-', '')
        expected_filename = f"LAM-{clean_part}-L0-MAIN.pdf"
        expected_filepath = os.path.join(download_folder, expected_filename)
        
        # Check for a temporary download file first (.crdownload)
        temp_filepath = expected_filepath + ".crdownload"
        
        timeout = 60  # 60-second timeout for the download
        start_time = time.time()
        download_complete = False

        while time.time() - start_time < timeout:
            if os.path.exists(expected_filepath) and not os.path.exists(temp_filepath):
                send_message({"status": "info", "message": f"File {expected_filename} downloaded successfully."})
                download_complete = True
                break
            time.sleep(1) # Wait 1 second before checking again

        if not download_complete:
            raise TimeoutError(f"Download timed out after {timeout} seconds.")

        driver.quit()
        return {"status": "success", "partNumber": part_number, "filepath": expected_filepath}

    except Exception as e:
        send_message({"status": "error", "message": str(e)})
        # Ensure the driver is closed even if an error occurs
        if 'driver' in locals() and driver:
            driver.quit()
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

