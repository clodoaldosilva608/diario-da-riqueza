#!/usr/bin/env python3
"""Isola a tag <footer> do site e lista links na ordem em que aparecem."""
import re

html = open('/tmp/clodoaldo.html', encoding='utf-8', errors='ignore').read()

# find <footer ...> ... </footer>
m = re.search(r'<footer\b.*?</footer>', html, re.S)
if not m:
    print('NO FOOTER TAG FOUND — searching for id="footer"/class footer')
    m = re.search(r'<(?:section|div)\b[^>]*(?:id|class)="[^"]*footer[^"]*".*?</(?:section|div)>', html[-200000:], re.S)

if m:
    footer = m.group(0)
    print('FOOTER LENGTH:', len(footer))
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', footer)
    print('LINKS IN FOOTER (in order):')
    for h in hrefs:
        print(' -', h)
    # Extract visible text (rough)
    text = re.sub(r'<script.*?</script>', '', footer, flags=re.S)
    text = re.sub(r'<style.*?</style>', '', text, flags=re.S)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    print('\nFOOTER TEXT:')
    print(text[:2000])
else:
    print('still no footer')
    # print last 3000 chars text
    tail = html[-8000:]
    text = re.sub(r'<[^>]+>', ' ', tail)
    print(re.sub(r'\s+', ' ', text)[:1500])
