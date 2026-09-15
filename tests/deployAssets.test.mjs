import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const active = (text) => text.split(/\r?\n/).filter(line => !/^\s*#/.test(line)).join('\n');

// A static packaging contract, NOT a mock deployment or a claim that SSH works.
// Since ADR-0020 there are three places that must agree on what gets shipped:
// the CI workflow (git archive), the manual tool (ISI=(...)) and the root-run
// receiver on the server (member whitelist + required folders/pages). If they
// drift, one path silently ships less than the other or the receiver rejects it.
async function packageLists() {
  const workflow = active(await read('.github/workflows/deploy-vps.yml'));
  const archive = workflow.match(/git archive[^\n]*?HEAD((?:\s+[\w./-]+)+)\s*$/m);
  assert.ok(archive, 'workflow must package with git archive ... HEAD <paths>');
  const fromWorkflow = archive[1].trim().split(/\s+/);

  const manual = active(await read('tools/deploy-galantara.sh'));
  const isi = manual.match(/^ISI=\(([^)]*)\)/m);
  assert.ok(isi, 'manual tool must declare ISI=(...)');
  const fromManual = isi[1].trim().split(/\s+/);

  const receiver = active(await read('tools/deploy/terima-deploy-galantara.sh'));
  const folders = receiver.match(/^FOLDER=\(([^)]*)\)/m)?.[1].trim().split(/\s+/);
  const pages = receiver.match(/^HTML=\(([^)]*)\)/m)?.[1].trim().split(/\s+/);
  assert.ok(folders && pages, 'receiver must declare FOLDER=(...) and HTML=(...)');
  assert.equal(pages.at(-1), 'index.html', 'receiver must sync index.html last');
  return { fromWorkflow, fromManual, fromReceiver: [...pages, ...folders], receiver };
}

test('workflow, manual tool and receiver ship the same package', async () => {
  const { fromWorkflow, fromManual, fromReceiver, receiver } = await packageLists();
  const sorted = (list) => [...list].sort();
  assert.deepEqual(sorted(fromWorkflow), sorted(fromManual));
  assert.deepEqual(sorted(fromReceiver), sorted(fromManual));
  // The receiver's tar whitelist must admit exactly these top-level entries.
  for (const entry of fromManual) {
    const escaped = entry.replace(/\./g, '\\.');
    assert.ok(receiver.includes(escaped), `receiver whitelist must allow ${entry}`);
  }
});

test('every page asset referenced by the entry pages is inside the package', async () => {
  const { fromManual } = await packageLists();
  const shipped = (path) => fromManual.some(entry => path === entry || path.startsWith(`${entry}/`));

  const pages = ['index.html', 'about.html', 'admin.html', 'benteng.html'];
  const assets = new Set(pages);
  for (const page of pages) {
    const html = await read(page);
    // Includes the Three loader's string argument, not just src/href attributes.
    for (const match of html.matchAll(/["']\/?((?:vendor|src|assets|data)\/[^"'\s?#]+)["']/g)) {
      assets.add(match[1]);
    }
  }
  assert.ok([...assets].filter(path => path.startsWith('vendor/')).length >= 4);
  const css = await read('vendor/nunito.css');
  for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
    assets.add(new URL(match[1], 'https://local.invalid/vendor/nunito.css').pathname.slice(1));
  }
  for (const path of assets) {
    assert.ok((await stat(new URL(path, root))).isFile(), `referenced asset exists: ${path}`);
    assert.ok(shipped(path), `deploy package must preserve the URL of ${path}`);
  }
});

test('automatic deploy runs only from main, only for shipped paths, and skips green when unconfigured', async () => {
  const workflow = active(await read('.github/workflows/deploy-vps.yml'));
  const triggers = workflow.match(/^on:\s*\n([\s\S]*?)(?=^\S)/m)?.[1];
  assert.ok(triggers, 'workflow trigger block must be readable');
  assert.match(triggers, /^  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(triggers, /^  (?!workflow_dispatch:|push:)[\w-]+:/m, 'only push and workflow_dispatch may trigger a deploy');
  assert.match(triggers, /^    branches: \[main\]\s*$/m, 'push deploys only from main');

  const { fromManual } = await packageLists();
  const paths = [...triggers.matchAll(/^\s+- '?([^'\n]+)'?\s*$/gm)].map(m => m[1]);
  for (const entry of fromManual) {
    const covered = paths.includes(entry) || paths.includes(`${entry}/**`);
    assert.ok(covered, `push paths must include ${entry}`);
  }
  // Without the CI key configured the job must be skipped, not red (ADR-0007's lesson).
  assert.match(workflow, /::notice::Deploy dilewati/);
  assert.match(workflow, /StrictHostKeyChecking=yes/, 'host key must be pinned, not accepted blindly');
});
