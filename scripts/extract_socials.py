#!/usr/bin/env python3
"""Extrai links de redes sociais do HTML do site clodoaldo.vercel.app."""
import re
import sys

html = open('/tmp/clodoaldo.html', encoding='utf-8', errors='ignore').read()

pats = ['instagram', 'tiktok', 'youtube', 'linkedin', 'twitter', 'x.com',
        'facebook', 'github', 'threads', 'whatsapp', 'wa.me', 't.me',
        'discord', 'pinterest', 'twitch', 'linktr', 'beacons', 'bsky',
        'bluesky', 'reddit', 'spotify', 'email', 'mailto', 'telegram']

hrefs = re.findall(r'href=["\']([^"\']+)["\']', html)
seen = set()
for h in hrefs:
    hl = h.lower()
    for p in pats:
        if p in hl:
            if h not in seen:
                seen.add(h)
                print(h)
            break

print('---TEXTS NEAR FOOTER---')
# Try to find footer section text mentioning social words
for m in re.finditer(r'(?i)(instagram|tiktok|youtube|redes sociais|seguir)', html):
    start = max(0, m.start() - 120)
    end = min(len(html), m.end() + 120)
    snippet = html[start:end].replace('\n', ' ')
    print(snippet[:260])
    print('~~~')
