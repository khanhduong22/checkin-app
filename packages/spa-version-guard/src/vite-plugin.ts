import type { Plugin, ViteDevServer } from 'vite';
import type { VersionChangeItem, VersionRelease } from './types';

export interface ViteVersionPluginOptions {
  /**
   * Semantic version string (e.g. '1.0.0' or '2.2.0').
   * Defaults to '1.0.0'.
   */
  version?: string;

  /**
   * Unique build ID string.
   * If omitted, auto-generated based on date + version + timestamp/hash.
   */
  buildId?: string;

  /**
   * Target filename for the emitted version metadata JSON file.
   * Default: 'version.json'
   */
  fileName?: string;

  /**
   * Release date string (e.g. '10/10/2026').
   */
  releaseDate?: string;

  /**
   * Title of this release.
   */
  title?: string;

  /**
   * Subtitle / summary of this release.
   */
  subtitle?: string;

  /**
   * List of changelog items for What's New modal.
   */
  changes?: VersionChangeItem[];

  /**
   * Complete custom release object.
   */
  release?: VersionRelease;

  /**
   * Additional metadata to embed into version.json.
   */
  additionalData?: Record<string, unknown>;
}

export function viteVersionPlugin(options: ViteVersionPluginOptions = {}): Plugin {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '.');
  const appVersion = options.version || '1.0.0';
  const fileName = options.fileName || 'version.json';

  // Resolve unique build ID: options -> env -> generated
  const envBuildId =
    typeof process !== 'undefined'
      ? process.env?.APP_BUILD_ID || process.env?.VITE_APP_BUILD_ID || process.env?.GITHUB_SHA
      : undefined;

  const buildId =
    options.buildId ||
    envBuildId ||
    `${dateStr}.${appVersion}.${now.getTime().toString(36)}`;

  const releasePayload = {
    version: buildId,
    appVersion,
    buildTime: now.toISOString(),
    release: options.release || {
      version: appVersion,
      releaseDate:
        options.releaseDate ||
        `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,
      title: options.title || `Cập Nhật Phiên Bản ${appVersion}`,
      subtitle: options.subtitle || 'Tối ưu hóa hiệu năng & độ ổn định',
      changes: options.changes || [],
    },
    ...options.additionalData,
  };

  const jsonContent = JSON.stringify(releasePayload, null, 2);

  return {
    name: 'vite-plugin-spa-version-guard',

    config(config) {
      config.define = config.define || {};
      config.define.__APP_BUILD_ID__ = JSON.stringify(buildId);
      return config;
    },

    configureServer(server: ViteDevServer) {
      // In dev mode, intercept requests for version.json
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url && (url.endsWith(`/${fileName}`) || url === `/${fileName}`)) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.end(jsonContent);
          return;
        }
        next();
      });
    },

    generateBundle() {
      // In build mode, emit version.json to dist output root
      this.emitFile({
        type: 'asset',
        fileName,
        source: jsonContent,
      });
    },
  };
}

export default viteVersionPlugin;
