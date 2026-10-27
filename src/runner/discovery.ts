import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { DiscoveryManifest, DiscoveredConfig, CheckKind } from './types.js';

/**
 * Static discovery of test, lint, and build configurations in a project.
 * Does NOT execute or eval target project code.
 */
export function discoverChecks(projectRoot: string): DiscoveryManifest {
  const configs: DiscoveredConfig[] = [];
  const detectedFrameworks = new Set<string>();

  // 1. Inspect package.json statically
  const pkgPath = join(projectRoot, 'package.json');
  let hasNpmTest = false;
  if (existsSync(pkgPath)) {
    try {
      const raw = readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(raw) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps['vitest']) detectedFrameworks.add('vitest');
      if (deps['jest']) detectedFrameworks.add('jest');
      if (deps['mocha']) detectedFrameworks.add('mocha');
      if (deps['typescript']) detectedFrameworks.add('typescript');
      if (deps['eslint']) detectedFrameworks.add('eslint');

      if (pkg.scripts) {
        if (pkg.scripts.test && !/no test specified/.test(pkg.scripts.test)) {
          hasNpmTest = true;
          let framework: DiscoveredConfig['framework'] = 'unknown';
          if (pkg.scripts.test.includes('vitest') || deps['vitest']) framework = 'vitest';
          else if (pkg.scripts.test.includes('jest') || deps['jest']) framework = 'jest';
          else if (pkg.scripts.test.includes('node --test')) framework = 'node:test';

          configs.push({
            kind: 'test_suite',
            command: 'npm test',
            framework,
            configFile: 'package.json',
            isDefault: true,
            description: `npm test ("${pkg.scripts.test}")`,
          });
        }

        if (pkg.scripts.typecheck) {
          configs.push({
            kind: 'typecheck',
            command: 'npm run typecheck',
            framework: 'tsc',
            configFile: 'package.json',
            isDefault: false,
            description: `Typecheck ("${pkg.scripts.typecheck}")`,
          });
        }

        if (pkg.scripts.lint) {
          configs.push({
            kind: 'linter',
            command: 'npm run lint',
            framework: 'eslint',
            configFile: 'package.json',
            isDefault: false,
            description: `Linter ("${pkg.scripts.lint}")`,
          });
        }
      }
    } catch {
      // malformed package.json, skip parsing
    }
  }

  // 2. Vitest / Vite config
  const vitestFiles = ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts', 'vitest.config.mjs'];
  for (const vf of vitestFiles) {
    if (existsSync(join(projectRoot, vf))) {
      detectedFrameworks.add('vitest');
      if (!hasNpmTest) {
        configs.push({
          kind: 'test_suite',
          command: 'npx vitest run',
          framework: 'vitest',
          configFile: vf,
          isDefault: true,
          description: 'Vitest test runner',
        });
      }
      break;
    }
  }

  // 3. TypeScript tsconfig
  if (existsSync(join(projectRoot, 'tsconfig.json'))) {
    detectedFrameworks.add('typescript');
    if (!configs.some(c => c.kind === 'typecheck')) {
      configs.push({
        kind: 'typecheck',
        command: 'npx tsc --noEmit',
        framework: 'tsc',
        configFile: 'tsconfig.json',
        isDefault: !hasNpmTest && configs.length === 0,
        description: 'TypeScript typecheck',
      });
    }
  }

  // 4. Rust Cargo
  if (existsSync(join(projectRoot, 'Cargo.toml'))) {
    detectedFrameworks.add('cargo');
    configs.push({
      kind: 'test_suite',
      command: 'cargo test',
      framework: 'cargo',
      configFile: 'Cargo.toml',
      isDefault: true,
      description: 'Cargo test suite',
    });
  }

  // 5. Go
  if (existsSync(join(projectRoot, 'go.mod'))) {
    detectedFrameworks.add('go');
    configs.push({
      kind: 'test_suite',
      command: 'go test ./...',
      configFile: 'go.mod',
      isDefault: true,
      description: 'Go test suite',
    });
  }

  // 6. Python pytest
  const pythonFiles = ['pyproject.toml', 'pytest.ini', 'setup.cfg', 'tox.ini'];
  for (const pf of pythonFiles) {
    if (existsSync(join(projectRoot, pf))) {
      detectedFrameworks.add('pytest');
      configs.push({
        kind: 'test_suite',
        command: 'python -m pytest -q',
        framework: 'pytest',
        configFile: pf,
        isDefault: true,
        description: 'Pytest test suite',
      });
      break;
    }
  }

  // Determine suggested command: prefer default test_suite, then typecheck, then first available
  const defaultTest = configs.find(c => c.kind === 'test_suite' && c.isDefault) ||
                      configs.find(c => c.kind === 'test_suite') ||
                      configs.find(c => c.isDefault) ||
                      configs[0];

  return {
    projectRoot,
    discoveredConfigs: configs,
    suggestedCheckCommand: defaultTest?.command ?? null,
    detectedFrameworks: Array.from(detectedFrameworks),
  };
}

/**
 * Infer check kind from a command string.
 */
export function inferCheckKind(command: string): CheckKind {
  const cmd = command.toLowerCase().trim();
  if (cmd.includes('test') || cmd.includes('pytest') || cmd.includes('vitest') || cmd.includes('jest')) {
    return 'test_suite';
  }
  if (cmd.includes('tsc') || cmd.includes('typecheck')) {
    return 'typecheck';
  }
  if (cmd.includes('lint') || cmd.includes('eslint') || cmd.includes('rubocop') || cmd.includes('flake8')) {
    return 'linter';
  }
  if (cmd.includes('build') || cmd.includes('compile')) {
    return 'build';
  }
  return 'custom';
}
