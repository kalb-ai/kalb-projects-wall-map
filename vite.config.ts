import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Emits dist/version.json carrying the entry chunk's content-hashed
 * filename plus a hash of the project data. The running app polls it and
 * reloads when the value changes, so the lobby display and anyone's
 * installed desktop app pick up a deploy without being manually restarted
 * (see src/lib/version.ts).
 *
 * The data hash is the half that matters month to month. Project data is
 * read once at page load, so before it was included a data-only edit (a
 * job's status, a new project) went live on the site but never reached a
 * display that was already open: the code hash had not changed, so
 * nothing told the page to reload. It stays inside the `build` string
 * because that is the only field pages already running in the field read.
 *
 * Both halves are content hashes, not timestamps, so a redeploy of
 * identical code and data does NOT trigger a reload.
 */
function versionManifest(): Plugin {
  let dataDir = '';
  return {
    name: 'kalb-version-manifest',
    configResolved(config) {
      dataDir = config.publicDir ? join(config.publicDir, 'data') : '';
    },
    generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find(
        (c) => c.type === 'chunk' && c.isEntry
      );
      const build = `${entry?.fileName ?? 'dev'}+data.${hashDataDir(dataDir)}`;
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ build })}\n`
      });
    }
  };
}

/** Short content hash of every .json file in public/data, names included. */
function hashDataDir(dir: string): string {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return 'none';
  }
  const hash = createHash('sha256');
  for (const f of files) {
    hash.update(f).update('\0').update(readFileSync(join(dir, f))).update('\0');
  }
  return hash.digest('hex').slice(0, 12);
}

// base './' so the built bundle can be served from any path (kiosk file
// server, nginx subfolder, or GitHub Pages) without configuration.
export default defineConfig({
  base: './',
  plugins: [react(), versionManifest()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0
  }
});
