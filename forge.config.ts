import 'dotenv/config';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { PublisherGithub } from '@electron-forge/publisher-github';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/node-pty/**',
    },
    name: 'Client Jira',
    icon: './resources/icon',
  },
  rebuildConfig: {},
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      // Vite plugin doesn't include node_modules in the asar.
      // Copy node-pty native module so it can be found at runtime.
      const src = path.resolve(__dirname, 'node_modules', 'node-pty');
      const dest = path.join(buildPath, 'node_modules', 'node-pty');
      if (fs.existsSync(src)) {
        copyDirSync(src, dest);
        console.log('[forge hook] Copied node-pty to', dest);
      } else {
        console.warn('[forge hook] node-pty not found at', src);
      }

      // Generate app-update.yml for electron-updater (Forge doesn't create it automatically)
      const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
      const updateYml = [
        'provider: github',
        'owner: kwonjonghun-nbt',
        'repo: client-jira',
        `updaterCacheDirName: ${pkg.name}`,
      ].join('\n');
      const resourcesDir = path.resolve(buildPath, '..');
      fs.writeFileSync(path.join(resourcesDir, 'app-update.yml'), updateYml);
      console.log('[forge hook] Generated app-update.yml in', resourcesDir);
    },
    postMake: async (_config, makeResults) => {
      // Generate latest-mac.yml for electron-updater (Forge doesn't create it)
      for (const result of makeResults) {
        if (result.platform !== 'darwin') continue;
        const zipArtifact = result.artifacts.find((a) => a.endsWith('.zip'));
        if (!zipArtifact) continue;

        const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
        const zipBuffer = fs.readFileSync(zipArtifact);
        const sha512 = crypto.createHash('sha512').update(zipBuffer).digest('base64');
        const { size } = fs.statSync(zipArtifact);
        const zipName = path.basename(zipArtifact);

        const yml = [
          `version: ${pkg.version}`,
          'files:',
          `  - url: ${zipName}`,
          `    sha512: ${sha512}`,
          `    size: ${size}`,
          `path: ${zipName}`,
          `sha512: ${sha512}`,
          `releaseDate: '${new Date().toISOString()}'`,
        ].join('\n');

        const ymlPath = path.join(path.dirname(zipArtifact), 'latest-mac.yml');
        fs.writeFileSync(ymlPath, yml);
        result.artifacts.push(ymlPath);
        console.log('[forge hook] Generated latest-mac.yml at', ymlPath);
      }
      return makeResults;
    },
  },
  makers: [
    new MakerZIP({}, ['darwin']),
    new MakerDMG({ format: 'ULFO' }),
  ],
  publishers: [
    new PublisherGithub({
      repository: { owner: 'kwonjonghun-nbt', name: 'client-jira' },
      prerelease: false,
      draft: true,
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
