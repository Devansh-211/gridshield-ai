#!/usr/bin/env python3
"""
GridShield AI — Readability Check Script (Section 11.2 & 11.7).

Computes Flesch-Kincaid grade level for each plain Markdown section in frontend/src/content/explained/.
Asserts grade level <= 9.5 for all plain sections.
"""

import os
import re
import glob
import sys


def count_syllables(word: str) -> int:
    word = word.lower().strip()
    if len(word) <= 3:
        return 1
    word = re.sub(r'(?:[^laeiouy]|ed|es|e)$', '', word)
    word = re.sub(r'^y', '', word)
    syllables = len(re.findall(r'[aeiouy]{1,2}', word))
    return max(1, syllables)


def compute_flesch_kincaid_grade(text: str) -> float:
    # Strip markdown headers, alerts, links, and code blocks
    clean = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    clean = re.sub(r'`.*?`', '', clean)
    clean = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', clean)
    clean = re.sub(r'[#>\*\-\|]', ' ', clean)
    
    sentences = [s.strip() for s in re.split(r'[\.\?!]+|\n+', clean) if len(s.strip()) > 3]
    words = [w.strip() for w in re.findall(r'\b[A-Za-z]+\b', clean) if len(w.strip()) > 0]
    
    if not sentences or not words:
        return 0.0
    
    total_sentences = len(sentences)
    total_words = len(words)
    total_syllables = sum(count_syllables(w) for w in words)
    
    asl = total_words / total_sentences
    asw = total_syllables / total_words
    
    fk_grade = 0.39 * asl + 11.8 * asw - 15.59
    return max(0.0, fk_grade)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    explained_dir = os.path.join(root, "frontend", "src", "content", "explained")
    
    files = sorted(glob.glob(os.path.join(explained_dir, "*.md")))
    if not files:
        print(f"[ERROR] No explained Markdown files found in {explained_dir}")
        sys.exit(1)
        
    print(f"Checking readability for {len(files)} Explained sections...")
    max_allowed_grade = 9.5
    failed = False
    
    for fpath in files:
        fname = os.path.basename(fpath)
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
            
        grade = compute_flesch_kincaid_grade(content)
        status = "PASS" if grade <= max_allowed_grade else "FAIL"
        print(f"  [{status}] {fname:<32} -> Flesch-Kincaid Grade: {grade:.2f}")
        if grade > max_allowed_grade:
            failed = True
            
    if failed:
        print(f"\n[FAIL] One or more sections exceed grade {max_allowed_grade}.")
        sys.exit(1)
    else:
        print(f"\n[PASS] All {len(files)} plain-language sections meet reading grade <= {max_allowed_grade}.")
        sys.exit(0)


if __name__ == "__main__":
    main()
