// Gộp dist/ thành 1 file HTML duy nhất để serve qua Apps Script HtmlService.
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
let html = readFileSync(resolve(dist, 'index.html'), 'utf8');

html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+)"[^>]*><\/script>/g, (m, p) => {
  const js = readFileSync(resolve(dist, p), 'utf8');
  return '<script type="module">' + js.replace(/<\/script>/g, '<\\/script>') + '</script>';
});
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+)"[^>]*>/g, (m, p) => {
  const css = readFileSync(resolve(dist, p), 'utf8');
  return '<style>' + css + '</style>';
});
// Inject API URL từ template scriptlet của Apps Script
html = html.replace('</title>', '</title>\n<script>window.NC_API_URL = "<?!= apiUrl ?>";</script>');

writeFileSync(resolve(root, '..', 'gas', 'Index.html'), html);
console.log('written gas/Index.html', html.length, 'bytes');
