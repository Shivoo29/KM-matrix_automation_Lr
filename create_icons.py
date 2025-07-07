#!/usr/bin/env python3
"""
Simple script to create placeholder icons for the KM Matrix Automation Extension.
This creates basic icons that will work in both Chrome and Edge.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, text="KM", bg_color=(52, 152, 219), text_color=(255, 255, 255)):
    """Create a simple icon with the given size and text."""
    # Create image with background
    img = Image.new('RGBA', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a system font, fallback to default if not available
    try:
        # Try different font sizes to find one that fits
        font_size = max(8, size // 4)
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
        except:
            font = ImageFont.load_default()
    
    # Calculate text position to center it
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    # Draw text
    draw.text((x, y), text, fill=text_color, font=font)
    
    return img

def main():
    """Create all required icon sizes."""
    # Create icons directory if it doesn't exist
    if not os.path.exists('icons'):
        os.makedirs('icons')
    
    # Create icons for different sizes
    sizes = [16, 48, 128]
    
    for size in sizes:
        icon = create_icon(size)
        filename = f'icons/icon{size}.png'
        icon.save(filename, 'PNG')
        print(f"Created {filename} ({size}x{size} pixels)")
    
    print("\nIcons created successfully!")
    print("You can now load the extension in Chrome or Edge.")
    print("\nFor Chrome: chrome://extensions/")
    print("For Edge: edge://extensions/")

if __name__ == "__main__":
    main() 