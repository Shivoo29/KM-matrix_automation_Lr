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


def send_message(message):
    encoded_content = json.dumps(message).encode('utf-8')
    encoded_length = struct.pack('@I', len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()

def get_default_download_path():
    return os.path.join(os.path.expanduser('~'), 'Downloads', 'KM_downloads')

def download_part_drawing(part_number, download_folder=None):
    send_message({"status": "info", "message": f"Connecting to browser for {part_number}"})

    try:
        edge_options = EdgeOptions()
        edge_options.add_experimental_option("debuggerAddress", "localhost:9223")
        service = EdgeService()
        driver = webdriver.Edge(service=service, options=edge_options)

        driver.execute_script("window.open('', '_blank');")
        time.sleep(2)
        handles = driver.window_handles
        if len(handles) < 2:
            raise RuntimeError("Expected at least 2 browser windows/tabs, but found fewer.")

        driver.switch_to.window(handles[-1])
        print("Window handles:", driver.window_handles)
        if len(handles) < 2:
            send_message({"status": "warning", "message": "Only one tab found. Using the existing tab."})
            driver.switch_to.window(handles[0])
        else:
            driver.switch_to.window(handles[-1])



        url = f"https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber={part_number}"
        driver.get(url)
        # Wait for the PDF viewer to load and click the Save button
        time.sleep(3)  
        
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        print("Found iframes:", len(iframes))
        for i, frame in enumerate(iframes):
            print(f"Switching to iframe {i}")
            driver.switch_to.frame(frame)
            try:
                save_button = driver.find_element(By.ID, "save")
                save_button.click()
                print("Clicked Save button inside iframe", i)
                break
            except:
                driver.switch_to.default_content()
# Give the viewer time to render
        
        try:
            wait = WebDriverWait(driver, 20)
            save_button = wait.until(EC.element_to_be_clickable((By.ID, "save")))
            save_button.click()
            send_message({"status": "info", "message": "Clicked the Save button in the PDF viewer."})
        except Exception as e:
            raise RuntimeError(f"Could not find or click the Save button. Error: {str(e)}")

        
#        try:
#            wait = WebDriverWait(driver, 20)
#            save_button = wait.until(EC.element_to_be_clickable(
#                (By.XPATH, "//button[@title='Save' or @aria-label='Save']")
#                ))
#            save_button.click()
#            send_message({"status": "info", "message": "Clicked the Save button in the PDF viewer."})
#        except Exception as e:
#            raise RuntimeError(f"Could not find or click the Save button. Error: {str(e)}")


#        try:
#            wait = WebDriverWait(driver, 20)
#            save_button = wait.until(EC.element_to_be_clickable(
#                (By.XPATH, "//div[contains(@class, 'c0141')]//button")#
#            ))
#            save_button.click()
#            send_message({"status": "info", "message": "Clicked the Save button in the PDF viewer."})
#        except Exception as e:
#            raise RuntimeError(f"Could not find or click the Save button. Error: {str(e)}")

        
#        pdf_link_text = f"{part_number}_C.PDF"
#        try:
#            wait = WebDriverWait(driver, 20)
#            link_element = wait.until(EC.element_to_be_clickable((By.XPATH, f"//a[contains(text(), '{part_number}_C.PDF')]")))
#
#            link_element.click()
#            send_message({"status": "info", "message": f"Clicked on download link: {pdf_link_text}"})
#            raise RuntimeError(f"Could not find or click the download link: {pdf_link_text}. Error: {str(e)}")
#        except Exception as e:


        clean_part = part_number.replace('-', '')
        expected_filename = f"LAM-{clean_part}-L0-MAIN.pdf"

        if not download_folder:
            download_folder = get_default_download_path()
        if not os.path.exists(download_folder):
            os.makedirs(download_folder)#

        expected_filepath = os.path.join(download_folder, expected_filename)
        temp_filepath = expected_filepath + ".crdownload"

        timeout = 60
        start_time = time.time()
        download_complete = False

        send_message({"status": "info", "message": f"Waiting for download in: {download_folder}"})

        while time.time() - start_time < timeout:
            if os.path.exists(expected_filepath) and not os.path.exists(temp_filepath):
                time.sleep(2)
                send_message({"status": "info", "message": f"File {expected_filename} downloaded successfully."})
                download_complete = True
                break
            time.sleep(1)

        driver.close()
        if len(driver.window_handles) > 0:
            driver.switch_to.window(driver.window_handles[0])
        else:
            send_message({"status": "warning", "message": "No remaining browser windows to switch to."})

        if not download_complete:
            
            raise TimeoutError(f"Download timed out after {timeout} seconds. Check if the file was downloaded manually.")

        return {"status": "success", "partNumber": part_number, "filepath": expected_filepath}

    except Exception as e:
        send_message({"status": "error", "message": str(e)})
        return {"status": "error", "partNumber": part_number, "error": str(e)}

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
