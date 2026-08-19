// Extraction utility for tests: pulls the PRICING object out of index.html
// without loading a browser, so it can be asserted against in plain Node
// (repo has zero build/test tooling by design — see README "aucune dépendance, aucun build").
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPricing() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const match = html.match(/const PRICING = \{[\s\S]*?\n\};/);
  if (!match) throw new Error('const PRICING = {...}; block not found in index.html');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`const PRICING = ${match[0].slice('const PRICING = '.length, -1)};\nthis.PRICING = PRICING;`, sandbox);
  return sandbox.PRICING;
}

module.exports = { loadPricing };
