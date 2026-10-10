import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateDeployWorkflow,
  generateAtomicSwapBeScript,
  generateAtomicSwapFeScript,
  performHealthCheck,
} from '../src/index';

describe('@checkin/zero-downtime-deploy Unit Test Suite', () => {
  it('should generate valid GitHub Actions workflow yaml with Blue-Green Atomic Swap', () => {
    const yaml = generateDeployWorkflow({
      appSlug: 'flashbuy',
      healthUrl: 'https://flashbuy.tikat.vn/health',
    });

    // Check key requirements
    expect(yaml).toContain('name: Zero-Downtime Deployment & CI/CD to Contabo VPS');
    expect(yaml).toContain('setup-bun@v2');
    expect(yaml).toContain('bun test');
    expect(yaml).toContain('APP_SLUG="flashbuy"');
    expect(yaml).toContain('${APP_SLUG}-api_next');
    expect(yaml).toContain('docker rename');
    expect(yaml).toContain('docker exec caddy caddy reload');
    expect(yaml).toContain('flashbuy_next');
    expect(yaml).toContain('https://flashbuy.tikat.vn/health');
  });

  it('should generate atomic backend swap script with rollback and drain', () => {
    const script = generateAtomicSwapBeScript({
      activeContainer: 'my-service-api',
      healthUrl: 'http://localhost:4000/health',
      timeoutSeconds: 30,
      drainSeconds: 5,
    });

    expect(script).toContain('ACTIVE_CONTAINER="my-service-api"');
    expect(script).toContain('CANDIDATE_CONTAINER="my-service-api_next"');
    expect(script).toContain('BACKUP_CONTAINER="my-service-api_old"');
    expect(script).toContain('TIMEOUT_SECONDS=30');
    expect(script).toContain('DRAIN_SECONDS=5');
    expect(script).toContain('docker rename "$ACTIVE_CONTAINER" "$BACKUP_CONTAINER"');
    expect(script).toContain('docker rename "$CANDIDATE_CONTAINER" "$ACTIVE_CONTAINER"');
    expect(script).toContain('docker rm -f "$CANDIDATE_CONTAINER"');
  });

  it('should generate atomic frontend swap script with inode directory swap', () => {
    const script = generateAtomicSwapFeScript({
      targetDir: '/opt/kido-infra/docker/portfolio/html/apps/myapp',
    });

    expect(script).toContain('TARGET_DIR="/opt/kido-infra/docker/portfolio/html/apps/myapp"');
    expect(script).toContain('STAGING_DIR="/opt/kido-infra/docker/portfolio/html/apps/myapp_next"');
    expect(script).toContain('mv "$TARGET_DIR" "$BACKUP_DIR"');
    expect(script).toContain('mv "$STAGING_DIR" "$TARGET_DIR"');
  });

  it('should verify packaged shell scripts exist and have execute permissions', () => {
    const baseDir = path.resolve(__dirname, '..');
    const beScript = path.join(baseDir, 'scripts', 'atomic-swap-be.sh');
    const feScript = path.join(baseDir, 'scripts', 'atomic-swap-fe.sh');
    const healthScript = path.join(baseDir, 'scripts', 'health-check.sh');
    const template = path.join(baseDir, 'workflows', 'deploy.yml.template');

    expect(fs.existsSync(beScript)).toBe(true);
    expect(fs.existsSync(feScript)).toBe(true);
    expect(fs.existsSync(healthScript)).toBe(true);
    expect(fs.existsSync(template)).toBe(true);

    const beStats = fs.statSync(beScript);
    if (process.platform !== 'win32') {
      expect(beStats.mode & 0o111).toBeTruthy(); // executable
    }
  });

  it('should probe healthcheck and handle timeout gracefully', async () => {
    // Probing a non-existent port should fail gracefully within timeout
    const result = await performHealthCheck('http://127.0.0.1:59999/non-existent-probe', {
      timeoutMs: 300,
      intervalMs: 100,
    });
    expect(result.healthy).toBe(false);
    expect(result.status).toBe(0);
  });
});
