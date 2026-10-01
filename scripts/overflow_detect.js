/**
 * Detector de overflow horizontal "leaf-most" (scrollWidth-based).
 * Esconde elemento a elemento; se doc.scrollWidth reduz, é culpado.
 * Reporta apenas os culpados mais profundos (sem culpado descendente),
 * evitando a cadeia de ancestrais (body > div > main > ... > p).
 */
(() => {
  const doc = document.documentElement;
  const base = doc.scrollWidth;
  if (base <= window.innerWidth) {
    return JSON.stringify({ iw: window.innerWidth, base, overflow: false, culprits: [] });
  }
  const culprits = [];
  const els = [...document.querySelectorAll('body, body *')];
  for (const el of els) {
    if (['SCRIPT', 'STYLE', 'LINK', 'NEXT-ROUTE-ANNOUNCER'].includes(el.tagName)) continue;
    const prev = el.style.display;
    el.style.display = 'none';
    if (doc.scrollWidth < base) culprits.push(el);
    el.style.display = prev;
  }
  // mantém apenas os mais profundos: descarta quem CONTÉM outro culpado
  const deepest = culprits.filter(
    (el) => !culprits.some((other) => other !== el && el.contains(other))
  );
  return JSON.stringify({
    iw: window.innerWidth,
    base,
    overflow: true,
    culprits: deepest.map((el) => {
      const cls = typeof el.className === 'string' ? el.className.slice(0, 90) : '';
      return el.tagName + '[' + cls + '] txt=' + (el.textContent || '').trim().slice(0, 40);
    }),
  });
})()
