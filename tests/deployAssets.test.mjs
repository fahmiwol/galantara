import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

// A static packaging contract, NOT a mock deployment or a claim that SSH works.
// Fail closed if the workflow no longer uses the current single-line rsync form.
test('manual deploy packages entry pages and their local assets, including vendor fonts', async () => {
  const workflow = await readFile(new URL('.github/workflows/deploy-vps.yml', root), 'utf8');
  const active = workflow.split(/\r?\n/).filter(line => !/^\s*#/.test(line)).join('\n');
  const triggers = active.match(/^on:\s*\n([\s\S]*?)(?=^\S)/m)?.[1];
  assert.ok(triggers, 'workflow trigger block must be readable');
  assert.match(triggers, /^  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(triggers, /^  (?!workflow_dispatch:)[\w-]+:/m, 'no automatic deploy trigger');

  const transfers = [...active.matchAll(/^\s*rsync\s+([^\r\n]+)$/gm)].map(match => {
    const command = match[1];
    const sources = [...command.matchAll(/\s\.\/([\w./-]+)(?=\s|$)/g)].map(m => m[1]);
    const destination = command.match(/"([^"\r\n]+)"\s*$/)?.[1];
    assert.ok(sources.length && destination, 'rsync form changed; update the contract parser');
    return { sources, destination, command };
  });
  assert.ok(transfers.length >= 4, 'must inspect actual rsync commands');
  const packaged = path => transfers.some(({ sources, destination, command }) => sources.some(source => {
    if (source.endsWith('/')) {
      return path.startsWith(source) && destination === '${DEST}' + source
        && /(?:^|\s)-[a-zA-Z]*a[a-zA-Z]*(?:\s|$)/.test(command);
    }
    return source === path && destination === '$DEST';
  }));

  const pages = ['index.html', 'about.html', 'admin.html', 'benteng.html'];
  const assets = new Set(pages);
  for (const page of pages) {
    const html = await readFile(new URL(page, root), 'utf8');
    // Includes the Three loader's string argument, not just src/href attributes.
    for (const match of html.matchAll(/["']\/?((?:vendor|src|assets|data)\/[^"'\s?#]+)["']/g)) {
      assets.add(match[1]);
    }
  }
  assert.ok([...assets].filter(path => path.startsWith('vendor/')).length >= 4);
  const css = await readFile(new URL('vendor/nunito.css', root), 'utf8');
  for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
    assets.add(new URL(match[1], 'https://local.invalid/vendor/nunito.css').pathname.slice(1));
  }
  for (const path of assets) {
    assert.ok((await stat(new URL(path, root))).isFile(), `referenced asset exists: ${path}`);
    assert.ok(packaged(path), `manual deploy must preserve the URL of ${path}`);
  }
});
