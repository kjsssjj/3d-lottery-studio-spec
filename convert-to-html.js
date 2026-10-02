const fs = require('fs');
const path = require('path');
const { marked } = require('C:/Users/user/Downloads/md2html/node_modules/marked');
const hljs = require('C:/Users/user/Downloads/md2html/node_modules/highlight.js');

const srcPath = path.join(__dirname, '3D_Lottery_Studio_V1.2_Unified_Spec.md');
const outPath = path.join(__dirname, '3D_Lottery_Studio_V1.3_Unified_Spec.html');

const md = fs.readFileSync(srcPath, 'utf-8');

marked.setOptions({
  gfm: true,
  breaks: false,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }
});

const htmlBody = marked.parse(md);

// Extract TOC from headings
const tocItems = [];
const headingRegex = /<h([1-3])\s*id="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/g;
let m;
const tempHtml = htmlBody;

// Generate IDs for headings
let processedHtml = tempHtml.replace(/<h([1-3])>([\s\S]*?)<\/h\1>/g, (match, level, text) => {
  const plainText = text.replace(/<[^>]+>/g, '').trim();
  const id = plainText
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'section';
  const uniqueId = id + '-' + Math.random().toString(36).substr(2, 4);
  tocItems.push({ level: parseInt(level), text: plainText, id: uniqueId });
  return `<h${level} id="${uniqueId}">${text}</h${level}>`;
});

// Build TOC HTML
let tocHtml = '';
let currentH1 = null;
let currentH2Group = null;

for (const item of tocItems) {
  if (item.level === 1) {
    if (currentH2Group) tocHtml += '</ul></li>';
    if (currentH1) tocHtml += '</ul></li>';
    currentH1 = item;
    tocHtml += `<li class="toc-h1"><a href="#${item.id}">${item.text}</a><ul>`;
    currentH2Group = null;
  } else if (item.level === 2) {
    if (currentH2Group) tocHtml += '</ul></li>';
    currentH2Group = item;
    tocHtml += `<li class="toc-h2"><a href="#${item.id}">${item.text}</a><ul>`;
  } else if (item.level === 3) {
    tocHtml += `<li class="toc-h3"><a href="#${item.id}">${item.text}</a></li>`;
  }
}
if (currentH2Group) tocHtml += '</ul></li>';
if (currentH1) tocHtml += '</ul></li>';

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>3D Lottery Studio V1.3 Unified Spec</title>
<style>
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #141414;
  --bg-tertiary: #1e1e1e;
  --bg-card: #1a1a1a;
  --border-color: #2a2a2a;
  --border-gold: #8b6914;
  --text-primary: #e8e0d0;
  --text-secondary: #b0a890;
  --text-muted: #807860;
  --gold-primary: #c9a227;
  --gold-light: #e8c84a;
  --gold-dark: #8b6914;
  --red-primary: #8b1a1a;
  --red-light: #c62828;
  --red-dark: #5c1010;
  --accent-green: #4caf50;
  --accent-orange: #ff9800;
  --accent-red: #f44336;
  --code-bg: #0d0d0d;
  --sidebar-width: 320px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.7;
  font-size: 15px;
}

/* Sidebar */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  z-index: 100;
  padding: 20px 0;
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-gold);
  margin-bottom: 12px;
}

.sidebar-header h1 {
  font-size: 14px;
  color: var(--gold-primary);
  font-weight: 600;
  letter-spacing: 0.5px;
}

.sidebar-header .version {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.sidebar-search {
  padding: 8px 16px;
  margin-bottom: 8px;
}

.sidebar-search input {
  width: 100%;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.sidebar-search input:focus {
  border-color: var(--gold-dark);
}

.toc { padding: 0 8px; }
.toc ul { list-style: none; padding-left: 0; }
.toc li { margin: 1px 0; }
.toc li.toc-h1 { margin-top: 10px; }
.toc li.toc-h1 > a {
  font-weight: 600;
  color: var(--gold-primary);
  font-size: 13px;
}
.toc li.toc-h2 > a {
  color: var(--text-primary);
  font-size: 12px;
}
.toc li.toc-h3 > a {
  color: var(--text-secondary);
  font-size: 11px;
}
.toc li.toc-h2 { padding-left: 14px; }
.toc li.toc-h3 { padding-left: 28px; }
.toc a {
  display: block;
  padding: 3px 12px;
  text-decoration: none;
  border-radius: 3px;
  transition: all 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.toc a:hover {
  background: var(--bg-tertiary);
  color: var(--gold-light);
}

/* Main content */
.main {
  margin-left: var(--sidebar-width);
  padding: 40px 60px;
  max-width: 1100px;
}

/* Headings */
h1 {
  font-size: 28px;
  color: var(--gold-primary);
  margin: 48px 0 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-gold);
  font-weight: 700;
}

h1:first-of-type {
  margin-top: 0;
  font-size: 32px;
  text-align: center;
  border-bottom: 3px double var(--border-gold);
  padding-bottom: 20px;
}

h2 {
  font-size: 20px;
  color: var(--gold-light);
  margin: 36px 0 14px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

h3 {
  font-size: 16px;
  color: var(--text-primary);
  margin: 24px 0 10px;
}

h4 {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 18px 0 8px;
}

/* Paragraphs & text */
p { margin: 10px 0; }
strong { color: var(--gold-light); }
em { color: var(--text-secondary); font-style: italic; }

/* Links */
a { color: var(--gold-primary); text-decoration: none; }
a:hover { color: var(--gold-light); text-decoration: underline; }

/* Lists */
ul, ol { margin: 8px 0; padding-left: 24px; }
li { margin: 3px 0; }

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 13px;
}

thead {
  background: var(--bg-tertiary);
}

th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  color: var(--gold-primary);
  border-bottom: 2px solid var(--border-gold);
  font-size: 12px;
  white-space: nowrap;
}

td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: top;
}

tr:hover td {
  background: rgba(201, 162, 39, 0.03);
}

/* Code */
code {
  font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace;
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
  color: var(--gold-light);
  border: 1px solid var(--border-color);
}

pre {
  background: var(--code-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 16px 20px;
  overflow-x: auto;
  margin: 14px 0;
  position: relative;
}

pre code {
  background: none;
  padding: 0;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.6;
}

/* Syntax highlighting */
.hljs-keyword, .hljs-type { color: #c678dd; }
.hljs-string { color: #98c379; }
.hljs-number { color: #d19a66; }
.hljs-built_in { color: #e6c07b; }
.hljs-function { color: #61afef; }
.hljs-title { color: #e5c07b; }
.hljs-params { color: #abb2bf; }
.hljs-comment { color: #5c6370; font-style: italic; }
.hljs-meta { color: #56b6c2; }
.hljs-attr { color: #d19a66; }
.hljs-attribute { color: #e06c75; }
.hljs-symbol { color: #56b6c2; }
.hljs-params { color: #abb2bf; }

/* Blockquotes */
blockquote {
  border-left: 3px solid var(--gold-dark);
  padding: 10px 16px;
  margin: 14px 0;
  background: rgba(201, 162, 39, 0.05);
  color: var(--text-secondary);
}

/* Horizontal rules */
hr {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 32px 0;
}

/* Checkboxes */
input[type="checkbox"] {
  margin-right: 6px;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg-primary); }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--gold-dark); }

/* Back to top */
.back-to-top {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 40px;
  height: 40px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-gold);
  border-radius: 50%;
  color: var(--gold-primary);
  font-size: 18px;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 200;
  transition: all 0.2s;
}

.back-to-top:hover {
  background: var(--gold-dark);
  color: var(--bg-primary);
}

/* Print */
@media print {
  .sidebar { display: none; }
  .main { margin-left: 0; padding: 20px; }
  body { background: white; color: #333; font-size: 11pt; }
  h1 { color: #8b1a1a; border-bottom-color: #8b1a1a; }
  h2 { color: #333; }
  code { background: #f5f5f5; color: #333; border-color: #ddd; }
  pre { background: #f5f5f5; border-color: #ddd; }
  th { color: #8b1a1a; border-bottom-color: #8b1a1a; }
  a { color: #333; }
}

/* Mobile */
@media (max-width: 1024px) {
  .sidebar { width: 260px; }
  .main { margin-left: 260px; padding: 20px 30px; }
}

@media (max-width: 768px) {
  .sidebar { display: none; }
  .main { margin-left: 0; padding: 16px; }
}
</style>
</head>
<body>

<nav class="sidebar">
  <div class="sidebar-header">
    <h1>3D Lottery Studio</h1>
    <div class="version">V1.3 Unified Spec &mdash; 6316 lines</div>
  </div>
  <div class="sidebar-search">
    <input type="text" id="toc-search" placeholder="搜索章节..." />
  </div>
  <div class="toc">
    <ul>${tocHtml}</ul>
  </div>
</nav>

<main class="main">
${processedHtml}
</main>

<button class="back-to-top" id="backToTop" title="回到顶部">&#8593;</button>

<script>
// Back to top
const btn = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
});
btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// TOC search
const searchInput = document.getElementById('toc-search');
const tocLinks = document.querySelectorAll('.toc a');
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  tocLinks.forEach(a => {
    const li = a.parentElement;
    if (!q || a.textContent.toLowerCase().includes(q)) {
      li.style.display = '';
    } else {
      li.style.display = 'none';
    }
  });
});

// Active TOC highlight
const headings = document.querySelectorAll('h1[id], h2[id], h3[id]');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      tocLinks.forEach(a => {
        a.style.background = a.getAttribute('href') === '#' + id
          ? 'rgba(201, 162, 39, 0.12)' : '';
      });
    }
  });
}, { rootMargin: '-20% 0px -70% 0px' });

headings.forEach(h => observer.observe(h));
</script>

</body>
</html>`;

fs.writeFileSync(outPath, html, 'utf-8');
console.log('Done:', outPath);
console.log('Size:', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB');
