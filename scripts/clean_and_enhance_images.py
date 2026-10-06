#!/usr/bin/env python3
"""
Image Cleaning and Enhancement Script
- Trims catalogue top-banners (logos, headers) from cropped product images.
- Replaces corrupted crops for Bullet Stud and F-Bracket with exact isolated photos.
- Trims excess whitespace around products for balanced framing.
"""

import os
import cv2
import numpy as np
import glob
import shutil

IMAGES_DIR = os.path.join(os.path.dirname(__file__), '../server/public/images')
CLIENT_IMAGES_DIR = os.path.join(os.path.dirname(__file__), '../client/public/images')
BRAIN_SCRATCH = r'C:\Users\HP\.gemini\antigravity-ide\brain\4e2a5141-e10e-4024-9616-7bb535318869\scratch'

def detect_banner_split(img):
    h, w = img.shape[:2]
    if h < 60 or w < 60:
        return None
        
    densities = []
    for y in range(h):
        row = img[y, :, :]
        non_white = np.sum((row[:, 0] < 240) | (row[:, 1] < 240) | (row[:, 2] < 240))
        densities.append(non_white / w)
    
    # Check top 60% of image for white gap separating header/banner from product
    scan_limit = int(h * 0.60)
    best_gap = None
    curr_start = None
    for y in range(scan_limit):
        if densities[y] < 0.02:
            if curr_start is None:
                curr_start = y
        else:
            if curr_start is not None:
                gap_len = y - curr_start
                if gap_len >= 8:
                    above_has = any(densities[k] > 0.05 for k in range(curr_start))
                    below_has = any(densities[k] > 0.10 for k in range(y, h))
                    if above_has and below_has:
                        if best_gap is None or gap_len > (best_gap[1] - best_gap[0]):
                            best_gap = (curr_start, y)
                curr_start = None
    if best_gap:
        return (best_gap[0] + best_gap[1]) // 2
    return None

def clean_product_image(img):
    h, w = img.shape[:2]
    if h < 40 or w < 40:
        return img
        
    split_y = detect_banner_split(img)
    start_y = split_y if split_y else 0
    product_crop = img[start_y:h, 0:w]
    
    ch, cw = product_crop.shape[:2]
    non_white_mask = (product_crop[:, :, 0] < 240) | (product_crop[:, :, 1] < 240) | (product_crop[:, :, 2] < 240)
    mask_u8 = (non_white_mask).astype(np.uint8) * 255
    contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    valid_boxes = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 400: # product contour
            bx, by, bw, bh = cv2.boundingRect(cnt)
            valid_boxes.append((bx, by, bx + bw, by + bh))
            
    if valid_boxes:
        min_x = max(0, min(b[0] for b in valid_boxes) - 16)
        min_y = max(0, min(b[1] for b in valid_boxes) - 16)
        max_x = min(cw, max(b[2] for b in valid_boxes) + 16)
        max_y = min(ch, max(b[3] for b in valid_boxes) + 16)
        return product_crop[min_y:max_y, min_x:max_x]
        
    return product_crop

def main():
    print("--- Starting Product Image Cleaning & Enhancement ---")
    
    # 1. First, replace known mis-cropped bottom items on Page 5
    bullet_src = os.path.join(BRAIN_SCRATCH, 'bullet_stud_exact.png')
    f_bracket_src = os.path.join(BRAIN_SCRATCH, 'f_bracket_exact.png')
    
    bullet_dst = os.path.join(IMAGES_DIR, 'page_005_prod_10_Brass-BulletSt.jpg')
    f_bracket_dst = os.path.join(IMAGES_DIR, 'page_005_prod_11_Brass-F_Bracke.jpg')
    
    if os.path.exists(bullet_src):
        b_img = cv2.imread(bullet_src)
        cv2.imwrite(bullet_dst, b_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print("Updated page_005_prod_10_Brass-BulletSt.jpg with exact crop.")
        
    if os.path.exists(f_bracket_src):
        f_img = cv2.imread(f_bracket_src)
        cv2.imwrite(f_bracket_dst, f_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print("Updated page_005_prod_11_Brass-F_Bracke.jpg with exact crop.")

    # 2. Process all image files in IMAGES_DIR
    image_files = glob.glob(os.path.join(IMAGES_DIR, '*.jpg'))
    cleaned_count = 0
    
    for f in image_files:
        try:
            img = cv2.imread(f)
            if img is None:
                continue
            split_y = detect_banner_split(img)
            if split_y is not None:
                cleaned = clean_product_image(img)
                if cleaned is not None and cleaned.size > 0:
                    cv2.imwrite(f, cleaned, [cv2.IMWRITE_JPEG_QUALITY, 93])
                    cleaned_count += 1
        except Exception as e:
            print(f"Error processing {f}: {e}")
            
    print(f"Cleaned banners and trimmed {cleaned_count} product images.")
    
    # Also sync to client/public/images if directory exists
    if os.path.exists(CLIENT_IMAGES_DIR):
        print(f"Syncing key images to {CLIENT_IMAGES_DIR}...")
        for name in ['page_005_prod_10_Brass-BulletSt.jpg', 'page_005_prod_11_Brass-F_Bracke.jpg', 'page_005_prod_01_Brass-D_Bracke.jpg', 'page_005_prod_03_Brass-Folding_.jpg']:
            src = os.path.join(IMAGES_DIR, name)
            dst = os.path.join(CLIENT_IMAGES_DIR, name)
            if os.path.exists(src):
                shutil.copy2(src, dst)
                
    print("--- Image Cleaning Complete ---")

if __name__ == '__main__':
    main()
