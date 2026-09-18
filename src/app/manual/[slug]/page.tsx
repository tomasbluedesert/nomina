import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { Mermaid } from './mermaid';
export const dynamic = 'force-dynamic';

const DOCS = path.join(process.cwd(), 'docs');
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function listaDocs() {
  const files = (await fs.readdir(DOCS)).filter(f => f.endsWith('.md')).sort();
  return ['README.md', ...files.filter(f => f !== 'README.md')].map(f => f.replace(/\.md$/, ''));
}
function titulo(slug: string) { return slug === 'README' ? 'Portada' : slug.replace(/^\d+-/, '').replaceAll('-', ' '); }

export default async function Doc({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(slug)) notFound();
  let md: string;
  try { md = await fs.readFile(path.join(DOCS, `${slug}.md`), 'utf8'); } catch { notFound(); }
  // Bloques mermaid → <pre class="mermaid"> (el cliente los dibuja)
  md = md.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => `\n<pre class="mermaid">${esc(code.trim())}</pre>\n`);
  let html = await marked.parse(md, { gfm: true });
  // Enlaces internos entre documentos: 00-INDICE.md → /manual/00-INDICE
  html = html.replace(/href="([A-Za-z0-9._-]+)\.md"/g, 'href="/manual/$1"');
  const docs = await listaDocs();
  return (
    <div className="flex gap-6 items-start">
      <aside className="card p-3 w-60 shrink-0 sticky top-4 hidden lg:block">
        <div className="lbl mb-2">Manual maestro</div>
        <nav className="space-y-1 text-sm">
          {docs.map(d => <a key={d} href={`/manual/${d}`} className={`block px-2 py-1 rounded hover:bg-line/40 ${d === slug ? 'bg-line/60 font-semibold' : 'text-ink2'}`}>{titulo(d)}</a>)}
        </nav>
      </aside>
      <div className="card p-6 manual flex-1 min-w-0" dangerouslySetInnerHTML={{ __html: html }} />
      <Mermaid slug={slug} />
    </div>
  );
}
