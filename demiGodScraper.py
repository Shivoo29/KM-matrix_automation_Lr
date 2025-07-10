import requests
import os
import time
from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.common.by import By

def download_pdf_direct(part_number, download_folder=None):
    """Try to download PDF directly without browser automation"""
    
    if not download_folder:
        download_folder = os.path.join(os.path.expanduser('~'), 'Downloads', 'KM_downloads')
    
    if not os.path.exists(download_folder):
        os.makedirs(download_folder)
    
    print(f"Trying to download {part_number} directly...")
    
    # First, get the iframe URL using selenium
    try:
        edge_options = EdgeOptions()
        edge_options.add_experimental_option("debuggerAddress", "localhost:9223")
        service = EdgeService()
        driver = webdriver.Edge(service=service, options=edge_options)
        
        url = f"https://kmmatrix.fremont.lamrc.net/DViewerX?partnumber={part_number}"
        driver.get(url)
        time.sleep(5)
        
        # Get the iframe URL
        iframe = driver.find_element(By.TAG_NAME, "iframe")
        iframe_url = iframe.get_attribute('src')
        print(f"Found iframe URL: {iframe_url}")
        
        # Try different download parameter values
        download_urls = [
            iframe_url.replace('&download=00', '&download=01'),
            iframe_url.replace('&download=00', '&download=1'),
            iframe_url.replace('&download=00', '&download=true'),
            iframe_url + '&force_download=1',
            iframe_url + '&attachment=1'
        ]
        
        for i, download_url in enumerate(download_urls):
            print(f"Trying download URL {i+1}: {download_url}")
            
            try:
                # Navigate directly to the download URL
                driver.get(download_url)
                time.sleep(5)
                
                # Check if download started
                downloads_before = set(os.listdir(download_folder)) if os.path.exists(download_folder) else set()
                default_downloads = os.path.join(os.path.expanduser('~'), 'Downloads')
                system_downloads_before = set(os.listdir(default_downloads)) if os.path.exists(default_downloads) else set()
                
                # Wait for download
                time.sleep(10)
                
                # Check for new files
                downloads_after = set(os.listdir(download_folder)) if os.path.exists(download_folder) else set()
                system_downloads_after = set(os.listdir(default_downloads)) if os.path.exists(default_downloads) else set()
                
                new_files = downloads_after - downloads_before
                new_system_files = system_downloads_after - system_downloads_before
                
                if new_files:
                    pdf_files = [f for f in new_files if f.endswith('.pdf')]
                    if pdf_files:
                        print(f"SUCCESS! Downloaded: {pdf_files}")
                        return True
                
                if new_system_files:
                    pdf_files = [f for f in new_system_files if f.endswith('.pdf')]
                    if pdf_files:
                        print(f"SUCCESS! Downloaded to system folder: {pdf_files}")
                        return True
                
            except Exception as e:
                print(f"Error with URL {i+1}: {e}")
        
        # Try using requests to download directly
        print("Trying direct HTTP download...")
        try:
            # Get cookies from the browser session
            cookies = driver.get_cookies()
            session = requests.Session()
            for cookie in cookies:
                session.cookies.set(cookie['name'], cookie['value'])
            
            for download_url in download_urls:
                print(f"Trying requests download: {download_url}")
                response = session.get(download_url, stream=True)
                
                if response.status_code == 200:
                    # Check if it's actually a PDF
                    if response.headers.get('content-type', '').startswith('application/pdf'):
                        filename = f"{part_number}.pdf"
                        filepath = os.path.join(download_folder, filename)
                        
                        with open(filepath, 'wb') as f:
                            for chunk in response.iter_content(chunk_size=8192):
                                f.write(chunk)
                        
                        print(f"SUCCESS! Downloaded via requests: {filepath}")
                        return True
                    else:
                        print(f"Response not a PDF: {response.headers.get('content-type', 'unknown')}")
                else:
                    print(f"HTTP {response.status_code}: {response.reason}")
        
        except Exception as e:
            print(f"Requests method failed: {e}")
        
        driver.quit()
        return False
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        part_number = sys.argv[1]
    else:
        part_number = "715-B77627-001"
    
    success = download_pdf_direct(part_number)
    
    if success:
        print("Download completed successfully!")
    else:
        print("Download failed. You might need to check the browser settings or the website's requirements.")