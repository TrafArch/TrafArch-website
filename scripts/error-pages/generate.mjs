import { readFileSync, writeFileSync } from 'node:fs';

const local = name => new URL(name, import.meta.url);
const template = readFileSync(local('template.html'), 'utf8').replace(/\r\n/g, '\n');
const messages = JSON.parse(readFileSync(local('messages.json'), 'utf8'));
const codes = Object.keys(messages);
const check = process.argv.includes('--check');

function output(name, content) {
  if (!check) return writeFileSync(local(name), content);
  if (readFileSync(local(name), 'utf8').replace(/\r\n/g, '\n') !== content) {
    throw new Error(`Out of date: ${name}. Run node scripts/error-pages/generate.mjs`);
  }
}

function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

for (const [code, [names, headings, descriptions]] of Object.entries(messages)) {
  const labels = names.map(name => `${code} · ${name}`);
  const titles = labels.map(label => `${label} — TrafArch`);
  const fields = {
    code, label: escapeHtml(labels[0]), heading: escapeHtml(headings[0]), description: escapeHtml(descriptions[0]),
    translations: JSON.stringify([titles, labels, headings, descriptions]).replaceAll('<', '\\u003c')
  };
  output(`../../${code}.html`, template.replace(/\{\{(\w+)\}\}/g, (_, field) => fields[field]));
}

const config = [
  ...codes.map(code => `error_page ${code} /${code}.html;`),
  '', `location ~ ^/(?:${codes.join('|')})(?:\\.html)?$ {`, '    internal;', '    root /usr/share/nginx/html;', '}', ''
];
output('nginx-errors.conf', config.join('\n'));
console.log(`${check ? 'Verified' : 'Generated'} ${codes.length} error pages and the Nginx configuration.`);
