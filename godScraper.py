import sys
import json
import struct
import time
import os
from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains


def send_message(message):
    encoded_content = json.dumps(message).encode('utf-8')
    encoded_length = struct.pack('@I', len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()

def get_default_download_path():
    return os.path.join(os.path.expanduser('~'), 'Downloads', 'KM_downloads')

def debug_page_structure(driver):
    """Debug function to understand the page structure"""
    send_message({"status": "debug", "message": "=== DEBUGGING PAGE STRUCTURE ==="})
    
    # Check current URL
    send_message({"status": "debug", "message": f"Current URL: {driver.current_url}"})
    
    # Check page title
    send_message({"status": "debug", "message": f"Page title: {driver.title}"})
    
    # Check for iframes
    iframes = driver.find_elements(By.TAG_NAME, "iframe")
    send_message({"status": "debug", "message": f"Found {len(iframes)} iframes"})
    
    for i, iframe in enumerate(iframes):
        try:
            src = iframe.get_attribute('src')
            id_attr = iframe.get_attribute('id')
            name_attr = iframe.get_attribute('name')
            send_message({"status": "debug", "message": f"Iframe {i}: src={src}, id={id_attr}, name={name_attr}"})
        except Exception as e:
            send_message({"status": "debug", "message": f"Error getting iframe {i} attributes: {str(e)}"})
    
    # Check for common PDF viewer elements
    common_selectors = [
        "//button[@title='Save']",
        "//button[@aria-label='Save']",
        "//button[contains(@class, 'save')]",
        "//button[contains(text(), 'Save')]",
        "//div[@id='save']",
        "//span[contains(text(), 'Save')]",
        "//a[contains(@href, 'download')]",
        "//button[@title='Download']",
        "//button[@aria-label='Download']",
        "//button[contains(@class, 'download')]",
        "//button[contains(text(), 'Download')]",
        "//*[@id='save']",
        "//*[@title='Save']",
        "//*[contains(@class, 'toolbar')]//button",
        "//*[contains(@class, 'controls')]//button"
    ]
    
    for selector in common_selectors:
        try:
            elements = driver.find_elements(By.XPATH, selector)
            if elements:
                send_message({"status": "debug", "message": f"Found {len(elements)} elements with selector: {selector}"})
                for j, elem in enumerate(elements):
                    try:
                        text = elem.text
                        title = elem.get_attribute('title')
                        class_attr = elem.get_attribute('class')
                        send_message({"status": "debug", "message": f"  Element {j}: text='{text}', title='{title}', class='{class_attr}'"})
                    except Exception as e:
                        send_message({"status": "debug", "message": f"  Error getting element {j} attributes: {str(e)}"})
        except Exception as e:
            send_message({"status": "debug", "message": f"Error with selector {selector}: {str(e)}"})

def try_keyboard_shortcut(driver):
    """Try using keyboard shortcuts to save the PDF"""
    send_message({"status": "info", "message": "Trying keyboard shortcut Ctrl+S"})
    try:
        actions = ActionChains(driver)
        actions.key_down(Keys.CONTROL).send_keys('s').key_up(Keys.CONTROL).perform()
        time.sleep(2)
        return True
    except Exception as e:
        send_message({"status": "warning", "message": f"Keyboard shortcut failed: {str(e)}"})
        return False

def try_right_click_save(driver):
    """Try right-clicking and looking for save options"""
    send_message({"status": "info", "message": "Trying right-click context menu"})
    try:
        # Find the main content area or iframe
        body = driver.find_element(By.TAG_NAME, "body")
        actions = ActionChains(driver)
        actions.context_click(body).perform()
        time.sleep(1)
        
        # Look for "Save as" or similar options in context menu
        save_options = driver.find_elements(By.XPATH, "//*[contains(text(), 'Save') or contains(text(), 'Download')]")
        if save_options:
            send_message({"status": "info", "message": f"Found {len(save_options)} save options in context menu"})
            save_options[0].click()
            return True
        else:
            # Click elsewhere to close context menu
            actions.click(body).perform()
            return False
    except Exception as e:
        send_message({"status": "warning", "message": f"Right-click method failed: {str(e)}"})
        return False

def check_for_direct_pdf_link(driver, part_number):
    """Check if there's a direct PDF download link"""
    send_message({"status": "info", "message": "Checking for direct PDF download links"})
    
    # Common PDF link patterns
    pdf_patterns = [
        f"//a[contains(@href, '{part_number}')]",
        f"//a[contains(@href, '.pdf')]",
        f"//a[contains(text(), '{part_number}')]",
        f"//a[contains(text(), 'PDF')]",
        f"//a[contains(text(), 'Download')]",
        "//a[contains(@href, 'download')]"
    ]
    
    for pattern in pdf_patterns:
        try:
            links = driver.find_elements(By.XPATH, pattern)
            if links:
                send_message({"status": "info", "message": f"Found {len(links)} potential PDF links with pattern: {pattern}"})
                for i, link in enumerate(links):
                    href = link.get_attribute('href')
                    text = link.text
                    send_message({"status": "debug", "message": f"  Link {i}: href='{href}', text='{text}'"})
                    if href and '.pdf' in href.lower():
                        send_message({"status": "info", "message": f"Clicking direct PDF link: {href}"})
                        link.click()
                        return True
        except Exception as e:
            send_message({"status": "debug", "message": f"Error checking pattern {pattern}: {str(e)}"})
    
    return False

def try_direct_iframe_download(driver, part_number):
    """Try to download directly from the iframe URL"""
    send_message({"status": "info", "message": "Trying direct iframe download method"})
    
    try:
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        for i, iframe in enumerate(iframes):
            iframe_src = iframe.get_attribute('src')
            if iframe_src and 'getdwg' in iframe_src:
                send_message({"status": "info", "message": f"Found PDF iframe with URL: {iframe_src}"})
                
                # Modify the download parameter to force download
                if '&download=00' in iframe_src:
                    download_url = iframe_src.replace('&download=00', '&download=01')
                elif '&download=' not in iframe_src:
                    download_url = iframe_src + '&download=01'
                else:
                    download_url = iframe_src
                
                send_message({"status": "info", "message": f"Navigating to download URL: {download_url}"})
                driver.get(download_url)
                time.sleep(3)
                return True
        
        return False
    except Exception as e:
        send_message({"status": "warning", "message": f"Direct iframe download failed: {str(e)}"})
        return False

def check_downloads_folder(download_folder, part_number, timeout=60):
    """Check for any new PDF files in the downloads folder"""
    send_message({"status": "info", "message": f"Checking downloads folder: {download_folder}"})
    
    # Get initial list of files
    initial_files = set()
    if os.path.exists(download_folder):
        initial_files = set(os.listdir(download_folder))
    
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if os.path.exists(download_folder):
            current_files = set(os.listdir(download_folder))
            new_files = current_files - initial_files
            
            # Check for PDF files
            pdf_files = [f for f in new_files if f.endswith('.pdf')]
            if pdf_files:
                send_message({"status": "info", "message": f"Found new PDF files: {pdf_files}"})
                newest_pdf = max([os.path.join(download_folder, f) for f in pdf_files], key=os.path.getctime)
                return newest_pdf
            
            # Check for .crdownload files (Chrome-style) or .partial files
            temp_files = [f for f in new_files if f.endswith(('.crdownload', '.partial', '.tmp'))]
            if temp_files:
                send_message({"status": "info", "message": f"Download in progress: {temp_files}"})
        
        time.sleep(1)
    
    return None

def download_part_drawing(part_number, download_folder=None):
    send_message({"status": "info", "message": f"Connecting to browser for {part_number}"})

    try:
        edge_options = EdgeOptions()
        edge_options.add_experimental_option("debuggerAddress", "localhost:9223")
        
        # Add download preferences
        if not download_folder:
            download_folder = get_default_download_path()
        
        prefs = {
            "download.default_directory": download_folder,
            "download.prompt_for_download": False,
            "download.directory_upgrade": True,
            "safebrowsing.enabled": True,
            "plugins.always_open_pdf_externally": True  # This might help with PDF handling
        }
        edge_options.add_experimental_option("prefs", prefs)
        
        service = EdgeService()
        driver = webdriver.Edge(service=service, options=edge_options)

        # Navigate to the URL
        url = f"https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber={part_number}"
        driver.get(url)
        
        # Wait for page to load
        time.sleep(5)
        
        # Debug the page structure
        debug_page_structure(driver)
        
        # Try multiple methods to download the PDF
        download_success = False
        
        # Method 1: Try direct iframe download (most likely to work for this site)
        if try_direct_iframe_download(driver, part_number):
            download_success = True
        
        # Method 2: Check for direct PDF links first
        if not download_success and check_for_direct_pdf_link(driver, part_number):
            send_message({"status": "info", "message": "Found and clicked direct PDF link"})
            download_success = True
        
        # Method 3: Try keyboard shortcut
        if not download_success and try_keyboard_shortcut(driver):
            download_success = True
        
        # Method 4: Try right-click save
        if not download_success and try_right_click_save(driver):
            download_success = True
        
        # Method 5: Look for save button in main document
        if not download_success:
            save_selectors = [
                "//button[@id='save']",
                "//button[@title='Save']",
                "//button[@aria-label='Save']",
                "//button[contains(@class, 'save')]",
                "//button[contains(text(), 'Save')]",
                "//div[@id='save']",
                "//span[@id='save']",
                "//*[@id='save']",
                "//button[@title='Download']",
                "//button[contains(text(), 'Download')]"
            ]
            
            for selector in save_selectors:
                try:
                    wait = WebDriverWait(driver, 5)
                    save_button = wait.until(EC.element_to_be_clickable((By.XPATH, selector)))
                    save_button.click()
                    send_message({"status": "info", "message": f"Successfully clicked save button with selector: {selector}"})
                    download_success = True
                    break
                except Exception as e:
                    send_message({"status": "debug", "message": f"Selector {selector} failed: {str(e)}"})
        
        # Method 6: Check inside iframes
        if not download_success:
            iframes = driver.find_elements(By.TAG_NAME, "iframe")
            for i, iframe in enumerate(iframes):
                try:
                    send_message({"status": "info", "message": f"Switching to iframe {i}"})
                    driver.switch_to.frame(iframe)
                    
                    # Debug iframe structure
                    debug_page_structure(driver)
                    
                    # Try to find save button in iframe
                    for selector in save_selectors:
                        try:
                            wait = WebDriverWait(driver, 3)
                            save_button = wait.until(EC.element_to_be_clickable((By.XPATH, selector)))
                            save_button.click()
                            send_message({"status": "info", "message": f"Successfully clicked save button in iframe {i} with selector: {selector}"})
                            download_success = True
                            break
                        except Exception as e:
                            send_message({"status": "debug", "message": f"Iframe {i} selector {selector} failed: {str(e)}"})
                    
                    if download_success:
                        break
                        
                except Exception as e:
                    send_message({"status": "warning", "message": f"Error accessing iframe {i}: {str(e)}"})
                finally:
                    driver.switch_to.default_content()
        
        if not download_success:
            # Last resort: try to get the PDF URL directly
            send_message({"status": "warning", "message": "All download methods failed. Trying to access PDF URL directly..."})
            
            # Check if the current page is already a PDF
            if driver.current_url.endswith('.pdf'):
                send_message({"status": "info", "message": "Current page is a PDF, trying to save it"})
                try_keyboard_shortcut(driver)
                download_success = True
            else:
                # Try to find PDF URLs in page source
                page_source = driver.page_source
                if '.pdf' in page_source.lower():
                    send_message({"status": "info", "message": "Found PDF references in page source"})
                    # You might need to parse the page source to find the actual PDF URL
        
        # Wait for download to complete - use the enhanced checker
        if download_success:
            if not os.path.exists(download_folder):
                os.makedirs(download_folder)
            
            # Check for downloads with flexible filename matching
            downloaded_file = check_downloads_folder(download_folder, part_number, timeout=60)
            
            if downloaded_file:
                send_message({"status": "info", "message": f"Download completed: {downloaded_file}"})
                return {"status": "success", "partNumber": part_number, "filepath": downloaded_file}
            else:
                # Final fallback - check if Ctrl+S opened a save dialog
                send_message({"status": "warning", "message": "No file found in downloads folder. Checking default downloads..."})
                
                # Check system's default Downloads folder
                default_downloads = os.path.join(os.path.expanduser('~'), 'Downloads')
                system_downloaded = check_downloads_folder(default_downloads, part_number, timeout=10)
                
                if system_downloaded:
                    send_message({"status": "info", "message": f"Found file in system Downloads: {system_downloaded}"})
                    return {"status": "success", "partNumber": part_number, "filepath": system_downloaded}
                else:
                    raise TimeoutError(f"Download timed out after 60 seconds. File may have been saved elsewhere.")
            
        else:
            raise RuntimeError("Could not find any way to download the PDF. Please check the page structure manually.")

    except Exception as e:
        send_message({"status": "error", "message": str(e)})
        return {"status": "error", "partNumber": part_number, "error": str(e)}

# Rest of the code remains the same...
if __name__ == '__main__':
    if len(sys.argv) > 1:
        part_to_test = sys.argv[1]
        print(f"--- Running in Test Mode for Part: {part_to_test} ---")

        def test_send_message(message):
            print(json.dumps(message, indent=2))

        send_message = test_send_message

        test_download_folder = get_default_download_path()
        if not os.path.exists(test_download_folder):
            os.makedirs(test_download_folder)

        download_part_drawing(part_to_test, test_download_folder)
        sys.exit(0)

    try:
        raw_length = sys.stdin.buffer.read(4)
        if not raw_length:
            sys.exit(0)
        message_length = struct.unpack('@I', raw_length)[0]
        message_content = sys.stdin.buffer.read(message_length).decode('utf-8')
        data = json.loads(message_content)

        part_number = data.get("partNumber")
        download_folder = data.get("downloadFolder", get_default_download_path())

        if not os.path.exists(download_folder):
            os.makedirs(download_folder)

        if part_number:
            result = download_part_drawing(part_number, download_folder)
            send_message(result)
        else:
            send_message({"status": "error", "message": "No partNumber provided."})

    except Exception as e:
        log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper_error.log")
        with open(log_file, "a") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Fatal error: {str(e)}\n")