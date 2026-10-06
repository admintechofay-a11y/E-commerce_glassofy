#!/usr/bin/env python3
"""
Scanned Product Catalogue Processor
===================================
A high-performance pipeline for extracting structured product data from
scanned hardware/e-commerce catalogue PDFs:
  - Renders PDF pages at 200 DPI (via PyMuPDF).
  - Performs OCR with bounding boxes and confidence tracking (RapidOCR/PaddleOCR or Tesseract).
  - Normalizes text, handles unicode/fullwidth characters, and eliminates headers/footers.
  - Detects product cards across diverse layouts (Key-Value, Tables, Grids, and Compact cards).
  - Extracts Code, Item, Finish, and MRP (supporting multi-size pricing like '270 (19mm) / 420 (25mm)').
  - Automatically locates and crops individual product photos (evaluating above, left, and right placement with card boundary constraints).
  - Exports products.json with both human-readable strings and structured price variants.
  - Flags low-confidence, missing-price, or incomplete records into review.csv for manual inspection.

Usage:
  python extract_catalogue.py --pdf glassofy.pdf --pages 1-10 --output-dir catalogue_output
  python extract_catalogue.py --pdf "Tools PDF.pdf" --dpi 200 --ocr paddle
"""

import os
import sys
import re
import csv
import json
import logging
import argparse
import unicodedata
from typing import List, Dict, Any, Tuple, Optional

import cv2
import numpy as np
import pymupdf
from PIL import Image

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("CatalogueProcessor")

KNOWN_FINISHES = [
    'S.S. 304 GRADE', 'S.S. 304', 'S.S. 202', 'S.S.', 'STAINLESS STEEL',
    'MATT (PER INCH)', 'MATT', 'MATTE', 'C.P.', 'CP/TT', 'CHROME PLATED',
    'ALUMINUM', 'ALUMINIUM', 'ALU.', 'BLACK', 'GOLD', 'ROSE GOLD',
    'GOLDEN & GRAY', 'GOLDEN', 'GRAY', 'GREY', 'COPPER', 'COPER',
    'WOODEN', 'WENGI', 'WENGE', 'BRASS', 'ZINC', 'ZINCK', 'PVD',
    'WHITE', 'PINK+BLUE', 'SILVER', 'CUBIK', 'ABS'
]


class TextNormalizer:
    """Normalizes raw OCR text, converting fullwidth characters and fixing OCR quirks."""

    REPLACEMENTS = {
        '：': ':', '—': '-', '–': '-', '―': '-', 'ー': '-',
        '“': '"', '”': '"', '‘': "'", '’': "'",
        '（': '(', '）': ')', '【': '[', '】': ']',
        '／': '/', '×': 'x', '，': ',', '。': '.',
        '；': ';', '॥': '"', '”': '"', '|': ' ',
        '·': '.', '•': '.'
    }

    @classmethod
    def clean(cls, text: str) -> str:
        if not text:
            return ""
        text = unicodedata.normalize('NFKD', str(text))
        for k, v in cls.REPLACEMENTS.items():
            text = text.replace(k, v)
        text = re.sub(r'^(Code|Item|Finish|MRP|Size|Dia)\s*:\s*', r'\1: ', text, flags=re.I)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()


class OCREngineWrapper:
    """Unified interface for OCR engines (PaddleOCR / RapidOCR and Tesseract)."""

    def __init__(self, engine_type: str = "paddle", tesseract_cmd: Optional[str] = None):
        self.engine_type = engine_type.lower()
        self.rapid_engine = None
        self.pytesseract = None

        if self.engine_type in ["paddle", "rapidocr"]:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self.rapid_engine = RapidOCR()
                logger.info("Initialized RapidOCR (PaddleOCR ONNX Runtime engine).")
            except ImportError:
                logger.warning("rapidocr-onnxruntime not found. Attempting to fall back to pytesseract...")
                self.engine_type = "tesseract"

        if self.engine_type == "tesseract":
            try:
                import pytesseract
                if tesseract_cmd:
                    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
                self.pytesseract = pytesseract
                logger.info("Initialized Tesseract OCR engine.")
            except ImportError:
                raise RuntimeError("Neither RapidOCR nor pytesseract could be loaded.")

    def run_ocr(self, img_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """Runs OCR on a BGR image and returns recognized boxes with confidence."""
        results = []
        if self.rapid_engine is not None:
            ocr_res, _ = self.rapid_engine(img_bgr)
            if not ocr_res:
                return []
            for box, text, score in ocr_res:
                box_np = np.array(box).astype(int)
                xmin, xmax = int(np.min(box_np[:, 0])), int(np.max(box_np[:, 0]))
                ymin, ymax = int(np.min(box_np[:, 1])), int(np.max(box_np[:, 1]))
                cleaned_text = TextNormalizer.clean(text)
                if not cleaned_text:
                    continue
                results.append({
                    'box': box_np.tolist(),
                    'bbox': (xmin, ymin, xmax, ymax),
                    'text': cleaned_text,
                    'confidence': float(score)
                })

        elif self.pytesseract is not None:
            rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            data = self.pytesseract.image_to_data(rgb, output_type=self.pytesseract.Output.DICT)
            n_boxes = len(data['text'])
            for i in range(n_boxes):
                text = data['text'][i].strip()
                conf = float(data['conf'][i])
                if conf < 0 or not text:
                    continue
                x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                cleaned_text = TextNormalizer.clean(text)
                if cleaned_text:
                    results.append({
                        'box': [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
                        'bbox': (x, y, x + w, y + h),
                        'text': cleaned_text,
                        'confidence': max(0.0, min(1.0, conf / 100.0))
                    })
        return results


class ProductImageCropper:
    """Smart product photo locator and cropper across card directions with boundary checks."""

    @staticmethod
    def _evaluate_roi(
        page_bgr: np.ndarray,
        search_roi: Tuple[int, int, int, int],
        ocr_boxes: List[Tuple[int, int, int, int]]
    ) -> Tuple[int, Optional[Tuple[int, int, int, int]]]:
        """Evaluates a candidate region for product contours, returning (score, bbox)."""
        h_page, w_page = page_bgr.shape[:2]
        x1, y1, x2, y2 = [int(v) for v in search_roi]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_page, x2), min(h_page, y2)

        if x2 - x1 < 25 or y2 - y1 < 25:
            return 0, None

        roi = page_bgr[y1:y2, x1:x2]
        h_roi, w_roi = roi.shape[:2]

        text_mask = np.ones((h_roi, w_roi), dtype=np.uint8) * 255
        for bx1, by1, bx2, by2 in ocr_boxes:
            ix1 = max(0, int(bx1) - x1)
            iy1 = max(0, int(by1) - y1)
            ix2 = min(w_roi, int(bx2) - x1)
            iy2 = min(h_roi, int(by2) - y1)
            if ix2 > ix1 and iy2 > iy1:
                cv2.rectangle(text_mask, (ix1, iy1), (ix2, iy2), 0, -1)

        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        sat = hsv[:, :, 1]

        non_white = ((gray < 238) | (sat > 30)) & (text_mask > 0)
        non_white = non_white.astype(np.uint8) * 255

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 17))
        closed = cv2.morphologyEx(non_white, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid_boxes = []
        total_area = 0
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 1000:
                bx, by, bw, bh = cv2.boundingRect(cnt)
                if bw > 20 and bh > 20 and (bw / bh < 12) and (bh / bw < 12):
                    valid_boxes.append((bx, by, bx + bw, by + bh))
                    total_area += int(area)

        if not valid_boxes:
            return 0, None

        min_bx = min(b[0] for b in valid_boxes)
        min_by = min(b[1] for b in valid_boxes)
        max_bx = max(b[2] for b in valid_boxes)
        max_by = max(b[3] for b in valid_boxes)

        pad = 10
        crop_x1 = max(0, min_bx - pad)
        crop_y1 = max(0, min_by - pad)
        crop_x2 = min(w_roi, max_bx + pad)
        crop_y2 = min(h_roi, max_by + pad)

        abs_bbox = (x1 + crop_x1, y1 + crop_y1, x1 + crop_x2, y1 + crop_y2)
        return total_area, abs_bbox

    @classmethod
    def crop_smart_product_photo(
        cls,
        page_bgr: np.ndarray,
        text_bbox: Tuple[int, int, int, int],
        card_cell_bounds: Tuple[int, int, int, int],
        all_ocr_boxes: List[Tuple[int, int, int, int]]
    ) -> Optional[np.ndarray]:
        """
        Tests directional candidate regions around the text (Above, Left, Right)
        strictly confined within card_cell_bounds (cell_x1, cell_y1, cell_x2, cell_y2).
        """
        h_page, w_page = page_bgr.shape[:2]
        tx1, ty1, tx2, ty2 = text_bbox
        cx1, cy1, cx2, cy2 = card_cell_bounds

        candidates = []

        # 1. Candidate Above (vertical card layout)
        roi_above = (
            max(cx1, tx1 - 60),
            max(cy1, ty1 - 380),
            min(cx2, tx2 + 60),
            max(cy1, ty1 - 6)
        )
        score_above, box_above = cls._evaluate_roi(page_bgr, roi_above, all_ocr_boxes)
        if box_above and score_above > 1000:
            candidates.append((score_above, box_above))

        # 2. Candidate Left (horizontal card layout e.g. Bullet Stud)
        roi_left = (
            cx1,
            max(cy1, ty1 - 30),
            max(cx1, tx1 - 6),
            min(cy2, ty2 + 30)
        )
        score_left, box_left = cls._evaluate_roi(page_bgr, roi_left, all_ocr_boxes)
        if box_left and score_left > 1000:
            candidates.append((score_left, box_left))

        # 3. Candidate Right (horizontal card layout e.g. right photo)
        roi_right = (
            min(cx2, tx2 + 6),
            max(cy1, ty1 - 30),
            cx2,
            min(cy2, ty2 + 30)
        )
        score_right, box_right = cls._evaluate_roi(page_bgr, roi_right, all_ocr_boxes)
        if box_right and score_right > 1000:
            candidates.append((score_right, box_right))

        if not candidates:
            # Fallback to region above if valid
            if roi_above[3] > roi_above[1] and roi_above[2] > roi_above[0]:
                crop = page_bgr[roi_above[1]:roi_above[3], roi_above[0]:roi_above[2]]
                if crop.size > 0:
                    return crop
            return None

        candidates.sort(key=lambda x: x[0], reverse=True)
        best_box = candidates[0][1]
        x1, y1, x2, y2 = best_box
        cropped = page_bgr[y1:y2, x1:x2]
        return cropped if cropped.size > 0 else None


class CataloguePageParser:
    """Parses text items on a page into structured product cards."""

    def __init__(self, page_img: np.ndarray, ocr_items: List[Dict[str, Any]], page_num: int):
        self.page_img = page_img
        self.ocr_items = ocr_items
        self.page_num = page_num
        self.h_page, self.w_page = page_img.shape[:2]

    def is_header_or_footer(self, item: Dict[str, Any]) -> bool:
        """Filters out global banners, logos, and page footers."""
        xmin, ymin, xmax, ymax = item['bbox']
        if ymax < self.h_page * 0.085:
            return True
        if ymin > self.h_page * 0.94:
            return True
        norm = item['text'].lower()
        if 'camscanner' in norm:
            return True
        if re.fullmatch(r'\d{1,3}', item['text'].strip()) and (ymin > self.h_page * 0.90 or ymax < self.h_page * 0.10):
            return True
        return False

    def parse(self) -> List[Dict[str, Any]]:
        """Identifies product blocks and extracts structured data."""
        filtered = [it for it in self.ocr_items if not self.is_header_or_footer(it)]
        if not filtered:
            return []

        kv_code_count = sum(1 for it in filtered if re.search(r'\bCode\s*[:\-]', it['text'], re.I))
        kv_item_count = sum(1 for it in filtered if re.search(r'\bItem\s*[:\-]', it['text'], re.I))
        table_header_count = sum(1 for it in filtered if it['text'].upper() in ['SIZE', 'MRP', 'DIA'])

        # If it's predominantly Key-Value labels and low table count
        if (kv_code_count >= 2 or kv_item_count >= 2) and table_header_count < 4:
            return self._parse_key_value_cards(filtered)
        else:
            return self._parse_grid_table_cards(filtered)

    def _compute_card_cell_bounds(
        self,
        cards: List[Dict[str, Any]]
    ) -> List[Tuple[int, int, int, int]]:
        """Computes 2D cell bounding boxes for each card based on spatial neighbors."""
        bounds = []
        for i, card in enumerate(cards):
            tx1, ty1, tx2, ty2 = card['text_bbox']

            # Find horizontal neighbors overlapping vertically
            left_bound = int(self.w_page * 0.03)
            right_bound = int(self.w_page * 0.97)
            top_bound = int(self.h_page * 0.08)
            bottom_bound = min(self.h_page, ty2 + 40)

            for j, other in enumerate(cards):
                if i == j:
                    continue
                ox1, oy1, ox2, oy2 = other['text_bbox']

                # Horizontal neighbors (overlapping vertically)
                if max(ty1 - 250, oy1) < min(ty2 + 100, oy2):
                    if ox2 <= tx1 and ox2 > left_bound:
                        left_bound = ox2 + 8
                    if ox1 >= tx2 and ox1 < right_bound:
                        right_bound = ox1 - 8

                # Vertical neighbors in same column
                if max(tx1, ox1) < min(tx2, ox2):
                    if oy2 <= ty1 and oy2 > top_bound:
                        top_bound = oy2 + 8

            bounds.append((left_bound, top_bound, right_bound, bottom_bound))
        return bounds

    def _parse_key_value_cards(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parses pages with explicit 'Code:', 'Item:', 'Finish:', 'MRP:' blocks."""
        anchors = []
        for idx, it in enumerate(items):
            text = it['text']
            if re.search(r'\bCode\s*[:\-]', text, re.I) or re.match(r'^Code\s*-\s*\d+', text, re.I):
                anchors.append((idx, 'code', it))
            elif re.search(r'\bItem\s*[:\-]', text, re.I):
                anchors.append((idx, 'item', it))

        # Deduplicate anchors belonging to the same card
        deduped_anchors = []
        for idx, atype, it in anchors:
            if not deduped_anchors:
                deduped_anchors.append((idx, atype, it))
                continue
            prev_idx, prev_type, prev_it = deduped_anchors[-1]
            x_dist = abs(it['bbox'][0] - prev_it['bbox'][0])
            y_dist = it['bbox'][1] - prev_it['bbox'][1]
            if x_dist < 180 and 0 <= y_dist < 80:
                continue
            deduped_anchors.append((idx, atype, it))

        cards = []
        for a_i, (a_idx, a_type, anchor_item) in enumerate(deduped_anchors):
            ax1, ay1, ax2, ay2 = anchor_item['bbox']
            col_x1 = max(0, ax1 - 100)
            col_x2 = min(self.w_page, ax2 + 340)

            next_anchor_y = self.h_page * 0.93
            for _, _, next_a in deduped_anchors:
                if next_a['bbox'][1] > ay1 + 60 and abs(next_a['bbox'][0] - ax1) < 220:
                    if next_a['bbox'][1] < next_anchor_y:
                        next_anchor_y = next_a['bbox'][1]

            card_items = []
            for it in items:
                ix1, iy1, ix2, iy2 = it['bbox']
                if max(col_x1, ix1) < min(col_x2, ix2):
                    if ay1 - 20 <= iy1 < next_anchor_y - 15:
                        card_items.append(it)

            if not card_items:
                card_items = [anchor_item]

            prod = self._extract_fields_from_kv_cluster(card_items, anchor_item)

            cluster_y1 = min(it['bbox'][1] for it in card_items)
            cluster_y2 = max(it['bbox'][3] for it in card_items)
            cluster_x1 = min(it['bbox'][0] for it in card_items)
            cluster_x2 = max(it['bbox'][2] for it in card_items)

            prod['text_bbox'] = (cluster_x1, cluster_y1, cluster_x2, cluster_y2)
            cards.append(prod)

        # Compute cell boundaries for smart photo cropping
        cell_bounds = self._compute_card_cell_bounds(cards)
        for card, bounds in zip(cards, cell_bounds):
            card['cell_bounds'] = bounds

        return cards

    def _extract_fields_from_kv_cluster(
        self,
        items: List[Dict[str, Any]],
        anchor_item: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extracts Code, Item, Finish, MRP from key-value text lines."""
        code, item, finish, mrp = None, None, None, None
        scores = []
        variants = []

        combined_text = "\n".join([it['text'] for it in items])
        for it in items:
            scores.append(it['confidence'])
            t = it['text']

            # Code
            m_code = re.search(r'\bCode\s*[:\-]\s*([A-Za-z0-9\-_/\+]+(?:\s+[A-Za-z0-9\-_/\+]+)*)', t, re.I)
            if m_code and not code:
                val = m_code.group(1).strip()
                if val.lower() not in ['for', 'item', 'finish']:
                    code = val

            # Item
            m_item = re.search(r'\bItem\s*[:\-]\s*(.+)', t, re.I)
            if m_item and not item:
                item = m_item.group(1).strip()

            # Finish
            m_fin = re.search(r'\bFinish\s*[:\-]\s*(.+)', t, re.I)
            if m_fin and not finish:
                finish = m_fin.group(1).strip()

            # MRP
            m_mrp = re.search(r'\bMRP\s*[:\-]\s*(.+)', t, re.I)
            if m_mrp and not mrp:
                mrp = m_mrp.group(1).strip()

        # Multi-line item continuation
        if item:
            for it in items:
                t = it['text']
                if not any(re.search(r'\b' + k + r'\s*[:\-]', t, re.I) for k in ['Code', 'Item', 'Finish', 'MRP', 'Size', 'Dia']):
                    if t not in item and not re.search(r'^\d+(\s*mm|\s*feet|\s*inch)?$', t, re.I) and len(t) > 3:
                        if not any(k in t.upper() for k in ['1PCS', '1 SET', '1SET', 'WARRANTY']):
                            item = f"{item} {t}".strip()

        # Multi-size prices on MRP line
        if mrp:
            price_nums = re.findall(r'\b\d{2,6}\b', mrp)
            if len(price_nums) > 1:
                sizes = []
                for it in items:
                    t = it['text']
                    if 'size' in t.lower() or 'finish' in t.lower():
                        detected_tokens = re.findall(r'(\d+[\"\']?|\d+\s*mm|\d+\s*feet|\d+\s*inch|[A-Za-z]+)', t, re.I)
                        filtered_toks = [tok for tok in detected_tokens if tok.lower() not in ['size', 'finish']]
                        if len(filtered_toks) >= len(price_nums):
                            sizes = filtered_toks[:len(price_nums)]
                            break
                if sizes:
                    mrp_formatted = " / ".join([f"{p} ({s})" for p, s in zip(price_nums, sizes)])
                    for p, s in zip(price_nums, sizes):
                        variants.append({"size": s, "price": int(p)})
                    mrp = mrp_formatted
                else:
                    mrp = " / ".join(price_nums)
                    for p in price_nums:
                        variants.append({"price": int(p)})
            elif len(price_nums) == 1:
                try:
                    variants.append({"price": int(price_nums[0])})
                except ValueError:
                    pass

        if not finish:
            for kf in KNOWN_FINISHES:
                if kf in combined_text.upper():
                    finish = kf.title()
                    break

        avg_conf = float(np.mean(scores)) if scores else 0.5
        return {
            'code': code,
            'item': item or "Hardware Product",
            'finish': finish,
            'mrp': mrp,
            'price_variants': variants,
            'confidence': round(avg_conf, 3),
            'page': self.page_num
        }

    def _parse_grid_table_cards(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parses pages arranged with Product Titles above Tables or compact grids."""
        candidate_titles = []
        for idx, it in enumerate(items):
            text = it['text']
            xmin, ymin, xmax, ymax = it['bbox']

            if text.upper() in ['SIZE', 'MRP', 'DIA', 'MEDIUM', 'HEAVY', 'PLANE', 'WORK', 'FINISH']:
                continue
            if re.fullmatch(r'\d+\s*(PCS|SET|PAIR)', text, re.I):
                continue
            if re.fullmatch(r'\d+', text):
                continue
            # Skip stray 1-2 char noise (e.g. 'G6', 'S', '01')
            if len(text.strip()) <= 2 and not re.search(r'\b(SS|CP)\b', text, re.I):
                continue

            has_table_below = False
            for other in items:
                ox1, oy1, ox2, oy2 = other['bbox']
                if other['text'].upper() in ['SIZE', 'MRP', 'DIA'] and 0 < (oy1 - ymax) < 120:
                    if abs(ox1 - xmin) < 220:
                        has_table_below = True
                        break

            is_code_title = bool(re.search(r'\bCode\s*[-:]\s*[A-Za-z0-9\-_]+', text, re.I))
            is_keyword_title = any(k in text.lower() for k in [
                'bracket', 'socket', 'pivot', 'stud', 'support', 'handle', 'hinge',
                'lock', 'council', 'shelf', 'holder', 'closer', 'spring', 'ring', 'rod', 'cloth', 'sliding'
            ])

            if has_table_below or is_code_title or is_keyword_title:
                candidate_titles.append(it)

        # Merge vertically stacked title lines in the same column
        # e.g., 'Code-R-821' above 'Towel Ring', or 'Code-R-840' above 'ClothRank' above '3 Layer (ABS)'
        cand_sorted = sorted(candidate_titles, key=lambda x: (x['bbox'][1], x['bbox'][0]))
        title_clusters = []
        used_ids = set()

        for i, it in enumerate(cand_sorted):
            if i in used_ids:
                continue
            cluster = [it]
            used_ids.add(i)

            curr_y2 = it['bbox'][3]
            curr_x1, curr_x2 = it['bbox'][0], it['bbox'][2]

            for j in range(i + 1, len(cand_sorted)):
                if j in used_ids:
                    continue
                other = cand_sorted[j]
                ox1, oy1, ox2, oy2 = other['bbox']

                # Stop searching if too far vertically
                if oy1 - curr_y2 > 65:
                    if oy1 - curr_y2 > 100:
                        break
                    continue

                # Check horizontal alignment (same column)
                x_overlap = max(0, min(curr_x2, ox2) - max(curr_x1, ox1))
                close_x = abs(curr_x1 - ox1) < 120 or x_overlap > 15
                if close_x and -25 <= (oy1 - curr_y2) < 55:
                    cluster.append(other)
                    used_ids.add(j)
                    curr_y2 = max(curr_y2, oy2)
                    curr_x1 = min(curr_x1, ox1)
                    curr_x2 = max(curr_x2, ox2)

            title_clusters.append(cluster)

        # Form merged title descriptors
        merged_titles = []
        for cluster in title_clusters:
            code, finish = None, None
            name_parts = []

            for cit in cluster:
                txt = cit['text']

                # Check for Code
                m_c = re.search(r'\bCode\s*[-:]\s*([A-Za-z0-9\-_]+)', txt, re.I)
                if m_c and not code:
                    full_code_str = m_c.group(1).strip()
                    # Check if hyphenated like 103-FancyWoodenHandle
                    m_hyphen = re.match(r'^([A-Za-z0-9]+)-(.*)', full_code_str)
                    if m_hyphen and any(w in m_hyphen.group(2).lower() for w in ['handle', 'bracket', 'stud', 'pivot', 'holder', 'ring', 'rod', 'lock']):
                        code = m_hyphen.group(1).strip()
                        raw_sub = m_hyphen.group(2).strip()
                        # Add spaces before capitals if CamelCase
                        sub_spaced = re.sub(r'([a-z])([A-Z])', r'\1 \2', raw_sub)
                        name_parts.append(sub_spaced)
                    else:
                        code = full_code_str

                # Check for Finish
                for kf in ['C.P.', 'C.P', 'MATT', 'S.S.', 'BRASS', 'WOODEN', 'BLACK', 'GOLD', 'ROSE GOLD', 'ABS', 'ALUMINUM']:
                    if kf in txt.upper() and not finish:
                        finish = kf
                        break

                # Extract cleaned item name part
                cleaned = re.sub(r'\bCode\s*[-:]\s*[A-Za-z0-9\-_]+\s*[-:]?\s*', '', txt, flags=re.I).strip()
                if cleaned and cleaned not in name_parts:
                    name_parts.append(cleaned)

            item_name = " ".join(name_parts).strip() or "Hardware Item"
            combined_bbox = (
                min(cit['bbox'][0] for cit in cluster),
                min(cit['bbox'][1] for cit in cluster),
                max(cit['bbox'][2] for cit in cluster),
                max(cit['bbox'][3] for cit in cluster)
            )
            merged_titles.append({
                'code': code,
                'item_name': item_name,
                'finish': finish,
                'bbox': combined_bbox,
                'cluster_items': cluster
            })

        # Group into horizontal rows (bands)
        merged_titles.sort(key=lambda t: t['bbox'][1])
        rows: List[List[Dict[str, Any]]] = []
        for title in merged_titles:
            ty = title['bbox'][1]
            placed = False
            for row in rows:
                row_y = np.mean([t['bbox'][1] for t in row])
                if abs(ty - row_y) < 65:
                    row.append(title)
                    placed = True
                    break
            if not placed:
                rows.append([title])

        cards = []
        for r_idx, row in enumerate(rows):
            row.sort(key=lambda t: t['bbox'][0])

            row_y1 = min(t['bbox'][1] for t in row)
            if r_idx < len(rows) - 1:
                next_row_y1 = min(t['bbox'][1] for t in rows[r_idx + 1])
                row_y2 = next_row_y1 - 10
            else:
                row_y2 = int(self.h_page * 0.94)

            for c_idx, title in enumerate(row):
                tx1, ty1, tx2, ty2 = title['bbox']

                # Strict column boundaries at midpoints between adjacent cards (zero bleed)
                if c_idx == 0:
                    col_x1 = max(0, tx1 - 100)
                else:
                    prev_tx2 = row[c_idx - 1]['bbox'][2]
                    col_x1 = (prev_tx2 + tx1) // 2

                if c_idx == len(row) - 1:
                    col_x2 = min(self.w_page, tx2 + 150)
                else:
                    next_tx1 = row[c_idx + 1]['bbox'][0]
                    col_x2 = (tx2 + next_tx1) // 2

                # Collect cell items strictly within this cell
                cell_items = []
                for it in items:
                    ix1, iy1, ix2, iy2 = it['bbox']
                    ix_center = (ix1 + ix2) // 2
                    if col_x1 <= ix_center < col_x2:
                        if ty1 <= iy1 < row_y2:
                            cell_items.append(it)

                prod = self._extract_fields_from_table_cluster(title, cell_items)

                cluster_y1 = min(it['bbox'][1] for it in cell_items) if cell_items else ty1
                cluster_y2 = max(it['bbox'][3] for it in cell_items) if cell_items else ty2
                cluster_x1 = min(it['bbox'][0] for it in cell_items) if cell_items else tx1
                cluster_x2 = max(it['bbox'][2] for it in cell_items) if cell_items else tx2

                prod['text_bbox'] = (cluster_x1, cluster_y1, cluster_x2, cluster_y2)
                prod['cell_bounds'] = (col_x1, max(0, row_y1 - 380), col_x2, row_y2)
                cards.append(prod)

        return cards

    def _extract_fields_from_table_cluster(
        self,
        title_meta: Dict[str, Any],
        cluster_items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Extracts fields and multi-size prices from strictly partitioned table card clusters."""
        code = title_meta.get('code')
        finish = title_meta.get('finish')
        item_name = title_meta.get('item_name', "Hardware Item")

        scores = [cit['confidence'] for cit in title_meta.get('cluster_items', [])]
        for it in cluster_items:
            scores.append(it['confidence'])

        # Group items into rows by vertical position (y-center)
        rows_by_y: Dict[int, List[Dict[str, Any]]] = {}
        for it in cluster_items:
            # Exclude items belonging to the title cluster itself
            if it in title_meta.get('cluster_items', []):
                continue
            y_center = (it['bbox'][1] + it['bbox'][3]) // 2
            matched_row = None
            for ry in rows_by_y.keys():
                if abs(ry - y_center) < 18:
                    matched_row = ry
                    break
            if matched_row is not None:
                rows_by_y[matched_row].append(it)
            else:
                rows_by_y[y_center] = [it]

        size_price_pairs = []
        direct_mrp_found = None

        for ry in sorted(rows_by_y.keys()):
            row = sorted(rows_by_y[ry], key=lambda x: x['bbox'][0])
            row_texts = [r['text'] for r in row]
            row_joined = " ".join(row_texts)

            # Skip header rows
            if any(h in row_joined.upper() for h in ['SIZE', 'DIA', 'MEDIUM', 'HEAVY', 'FINISH']) and 'MRP' in row_joined.upper():
                continue

            # Check if this row is a simple "MRP" label followed by price
            m_mrp_label = re.search(r'MRP\s*[:\-]?\s*(\d{2,6})', row_joined, re.I)
            if m_mrp_label:
                direct_mrp_found = m_mrp_label.group(1)
                continue

            if len(row) == 1 and row[0]['text'].upper() == 'MRP':
                # MRP header, price is likely in subsequent row
                continue

            # Medium and Heavy column tables (e.g. S.S. D-Bracket: Size | Medium | Heavy)
            has_med_hvy = any('MEDIUM' in it['text'].upper() or 'HEAVY' in it['text'].upper() for it in cluster_items)
            m_two_prices = re.findall(r'\b\d{1,5}\b', row_joined)
            if has_med_hvy and len(row) >= 3 and len(m_two_prices) >= 2:
                # Row has Size followed by 2 prices (Medium, Heavy)
                s_token = row[0]['text']
                p_med, p_hvy = m_two_prices[-2], m_two_prices[-1]
                size_price_pairs.append((f"{s_token} Med:{p_med}/Hvy:{p_hvy}", p_hvy))
                continue

            # Standard 2-column or 3-column rows (e.g. Size | MRP or Dia | Size | MRP)
            if len(row) >= 2:
                p_text = row[-1]['text']
                m_price = re.search(r'\b\d{2,6}\b', p_text)
                if m_price:
                    s_tokens = [r['text'] for r in row[:-1]]
                    s_clean = " ".join(s_tokens)
                    s_clean = re.sub(r'^(Dia|Size|MRP)\s*[:\-]?\s*', '', s_clean, flags=re.I).strip()
                    size_price_pairs.append((s_clean, m_price.group(0)))
            elif len(row) == 1:
                # Single standalone number in a row (e.g. price row following MRP label)
                m_num = re.fullmatch(r'\d{2,6}', row[0]['text'])
                if m_num:
                    size_price_pairs.append((None, m_num.group(0)))

        mrp_str = None
        variants = []
        if size_price_pairs:
            has_sizes = any(s is not None and len(s) > 0 for s, p in size_price_pairs)
            if has_sizes:
                mrp_str = " / ".join([
                    f"{p} ({s})" if s else p for s, p in size_price_pairs
                ])
                for s, p in size_price_pairs:
                    try:
                        variants.append({"size": s, "price": int(p)})
                    except ValueError:
                        pass
            else:
                mrp_str = " / ".join([p for _, p in size_price_pairs])
                for _, p in size_price_pairs:
                    try:
                        variants.append({"price": int(p)})
                    except ValueError:
                        pass
        elif direct_mrp_found:
            mrp_str = direct_mrp_found
            try:
                variants.append({"price": int(direct_mrp_found)})
            except ValueError:
                pass

        # Check for finish in combined cluster text if not yet set
        if not finish:
            combined_text = f"{item_name} " + " ".join([it['text'] for it in cluster_items])
            for kf in KNOWN_FINISHES:
                if kf in combined_text.upper():
                    finish = kf.title()
                    break

        avg_conf = float(np.mean(scores)) if scores else 0.5
        return {
            'code': code,
            'item': item_name,
            'finish': finish,
            'mrp': mrp_str,
            'price_variants': variants,
            'confidence': round(avg_conf, 3),
            'page': self.page_num
        }


class CatalogueProcessor:
    """Main orchestrator for batch processing catalogue PDFs."""

    def __init__(
        self,
        pdf_path: str,
        output_dir: str = "output",
        dpi: int = 200,
        ocr_engine: str = "paddle",
        confidence_thresh: float = 0.85,
        require_code: bool = False,
        tesseract_cmd: Optional[str] = None
    ):
        self.pdf_path = pdf_path
        self.output_dir = output_dir
        self.dpi = dpi
        self.confidence_thresh = confidence_thresh
        self.require_code = require_code
        self.images_dir = os.path.join(output_dir, "images")
        os.makedirs(self.images_dir, exist_ok=True)

        self.ocr = OCREngineWrapper(engine_type=ocr_engine, tesseract_cmd=tesseract_cmd)

    def parse_page_range(self, pages_arg: str, total_pages: int) -> List[int]:
        """Parses page arguments like '1-5', '4,10,12', or 'all' into 0-indexed list."""
        if not pages_arg or pages_arg.lower() == 'all':
            return list(range(total_pages))

        pages = []
        parts = pages_arg.split(',')
        for p in parts:
            p = p.strip()
            if '-' in p:
                start, end = p.split('-')
                start_i = max(1, int(start.strip()))
                end_i = min(total_pages, int(end.strip()))
                pages.extend(range(start_i - 1, end_i))
            else:
                val = int(p)
                if 1 <= val <= total_pages:
                    pages.append(val - 1)
        return sorted(list(set(pages)))

    def process(self, pages_arg: str = "all") -> Dict[str, Any]:
        """Executes full rendering, OCR, parsing, photo cropping, and exports."""
        if not os.path.isfile(self.pdf_path):
            raise FileNotFoundError(f"PDF file not found: {self.pdf_path}")

        doc = pymupdf.open(self.pdf_path)
        total_pages = len(doc)
        target_pages = self.parse_page_range(pages_arg, total_pages)

        logger.info(f"Opening '{self.pdf_path}' ({total_pages} total pages).")
        logger.info(f"Processing {len(target_pages)} pages at {self.dpi} DPI...")

        all_products = []
        review_rows = []
        mat = pymupdf.Matrix(self.dpi / 72.0, self.dpi / 72.0)

        for p_idx in target_pages:
            pno_1based = p_idx + 1
            logger.info(f"--- Processing Page {pno_1based}/{total_pages} ---")

            # 1. Render page at DPI
            page = doc[p_idx]
            pix = page.get_pixmap(matrix=mat)
            img_rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
            if pix.n == 4:
                img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGBA2BGR)
            else:
                img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)

            # 2. Run OCR
            ocr_items = self.ocr.run_ocr(img_bgr)
            logger.info(f"  Page {pno_1based}: {len(ocr_items)} text boxes recognized.")

            # 3. Detect and Parse Product Blocks
            parser = CataloguePageParser(img_bgr, ocr_items, page_num=pno_1based)
            prods = parser.parse()
            logger.info(f"  Page {pno_1based}: Detected {len(prods)} product blocks.")

            all_ocr_boxes = [it['bbox'] for it in ocr_items]

            # 4. Crop photos and compile records
            for idx, prod in enumerate(prods, start=1):
                text_bbox = prod.pop('text_bbox', None)
                cell_bounds = prod.pop('cell_bounds', None)

                safe_code = re.sub(r'[^A-Za-z0-9_-]', '_', prod.get('code') or prod.get('item', 'prod')[:14])
                photo_filename = f"page_{pno_1based:03d}_prod_{idx:02d}_{safe_code}.jpg"
                photo_relpath = os.path.join("images", photo_filename).replace("\\", "/")
                photo_fullpath = os.path.join(self.images_dir, photo_filename)

                # Smart crop across candidate directions with cell boundary limits
                cropped_img = None
                if text_bbox is not None and cell_bounds is not None:
                    cropped_img = ProductImageCropper.crop_smart_product_photo(
                        img_bgr, text_bbox, cell_bounds, all_ocr_boxes
                    )

                if cropped_img is not None and cropped_img.size > 0:
                    cv2.imwrite(photo_fullpath, cropped_img, [cv2.IMWRITE_JPEG_QUALITY, 93])
                    prod['photo'] = photo_relpath
                else:
                    prod['photo'] = None

                # 5. Validation and review triggers
                review_reasons = []
                conf = prod.get('confidence', 0.0)
                if conf < self.confidence_thresh:
                    review_reasons.append(f"Low OCR confidence ({conf:.2f} < {self.confidence_thresh})")
                if not prod.get('mrp'):
                    review_reasons.append("Missing MRP price")
                if not prod.get('item'):
                    review_reasons.append("Missing item name")
                if self.require_code and not prod.get('code'):
                    review_reasons.append("Missing product Code")
                if not prod.get('photo'):
                    review_reasons.append("Missing product photo crop")

                prod['id'] = f"P{pno_1based:03d}_{idx:02d}_{safe_code}"
                prod['needs_review'] = len(review_reasons) > 0
                prod['review_reasons'] = review_reasons

                all_products.append(prod)

                if prod['needs_review']:
                    review_rows.append({
                        'page': pno_1based,
                        'product_id': prod['id'],
                        'code': prod.get('code') or "",
                        'item': prod.get('item') or "",
                        'finish': prod.get('finish') or "",
                        'mrp': prod.get('mrp') or "",
                        'confidence': prod.get('confidence', 0.0),
                        'review_reasons': " | ".join(review_reasons),
                        'photo_path': prod['photo'] or ""
                    })

        # 6. Save products.json
        json_path = os.path.join(self.output_dir, "products.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(all_products, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved {len(all_products)} products to '{json_path}'.")

        # 7. Save review.csv
        csv_path = os.path.join(self.output_dir, "review.csv")
        csv_fields = ['page', 'product_id', 'code', 'item', 'finish', 'mrp', 'confidence', 'review_reasons', 'photo_path']
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=csv_fields)
            writer.writeheader()
            writer.writerows(review_rows)
        logger.info(f"Saved {len(review_rows)} flagged items to '{csv_path}'.")

        return {
            'total_pages_processed': len(target_pages),
            'total_products_extracted': len(all_products),
            'total_flagged_for_review': len(review_rows),
            'products_json': json_path,
            'review_csv': csv_path,
            'images_dir': self.images_dir
        }


def main():
    parser = argparse.ArgumentParser(
        description="Extract products, metadata, and cropped photos from scanned catalogue PDFs."
    )
    parser.add_argument(
        "--pdf",
        type=str,
        default="glassofy.pdf",
        help="Path to scanned PDF catalogue (default: glassofy.pdf)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="catalogue_output",
        help="Directory to save images, products.json, and review.csv (default: catalogue_output)"
    )
    parser.add_argument(
        "--pages",
        type=str,
        default="all",
        help="Page numbers or ranges to process, e.g., '1-5', '4,10,12,26,68', or 'all' (default: all)"
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=200,
        help="Render DPI for scanned PDF pages (default: 200)"
    )
    parser.add_argument(
        "--ocr",
        type=str,
        default="paddle",
        choices=["paddle", "tesseract"],
        help="OCR engine: 'paddle' (RapidOCR/PaddleOCR ONNX) or 'tesseract' (default: paddle)"
    )
    parser.add_argument(
        "--confidence-thresh",
        type=float,
        default=0.85,
        help="Confidence threshold below which items are flagged in review.csv (default: 0.85)"
    )
    parser.add_argument(
        "--require-code",
        action="store_true",
        help="Flag products missing manufacturer code in review.csv (default: False)"
    )
    parser.add_argument(
        "--tesseract-cmd",
        type=str,
        default=None,
        help="Path to tesseract executable if using Tesseract OCR"
    )

    args = parser.parse_args()

    processor = CatalogueProcessor(
        pdf_path=args.pdf,
        output_dir=args.output_dir,
        dpi=args.dpi,
        ocr_engine=args.ocr,
        confidence_thresh=args.confidence_thresh,
        require_code=args.require_code,
        tesseract_cmd=args.tesseract_cmd
    )

    summary = processor.process(pages_arg=args.pages)
    print("\n" + "=" * 55)
    print("           PROCESSING COMPLETED")
    print("=" * 55)
    print(f"Pages Processed       : {summary['total_pages_processed']}")
    print(f"Products Extracted    : {summary['total_products_extracted']}")
    print(f"Flagged for Review    : {summary['total_flagged_for_review']}")
    print(f"JSON Output           : {summary['products_json']}")
    print(f"Review CSV            : {summary['review_csv']}")
    print(f"Cropped Images Folder : {summary['images_dir']}")
    print("=" * 55)


if __name__ == "__main__":
    main()
