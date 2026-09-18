'use client';
import { useEffect } from 'react';
/** Dibuja los bloques <pre class="mermaid"> cargando Mermaid desde CDN (solo en /manual). */
export function Mermaid({ slug }: { slug: string }) {
  useEffect(() => {
    const s = document.createElement('script');
    s.type = 'module';
    s.textContent = `import m from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      m.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
      m.run({ querySelector: 'pre.mermaid' });`;
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [slug]);
  return null;
}
