import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  applyTemplateTransformations,
  type TemplatePattern,
} from '../../src/actors/template-engine.ts';

const varToConstPattern: TemplatePattern = {
  id: 'var-to-const',
  language: 'typescript',
  pattern: { template: 'var $VAR = $VALUE;', flags: 'g' },
  replacement: { template: 'const $VAR = $VALUE;' },
  description: 'Convert var to const',
  complexity: 1,
  riskLevel: 'low',
  category: 'modernization',
};

describe('template engine safety contract', () => {
  let testDirectory: string;
  let targetFile: string;

  beforeEach(async () => {
    testDirectory = await mkdtemp(join(tmpdir(), 'carmack-template-safety-'));
    targetFile = join(testDirectory, 'sample.ts');
    await writeFile(targetFile, 'var answer = 42;\n', 'utf8');
  });

  afterEach(async () => {
    await rm(testDirectory, { recursive: true, force: true });
  });

  test('dry-run reports candidates without changing the file', async () => {
    const before = await readFile(targetFile, 'utf8');
    const result = await applyTemplateTransformations({
      targetFiles: [targetFile],
      patterns: [varToConstPattern],
      options: { dryRun: true },
    });

    expect(result.transformationsApplied).toBe(1);
    expect(result.filesModified).toEqual([targetFile]);
    expect(await readFile(targetFile, 'utf8')).toBe(before);
  });

  test('write mode changes only the requested file', async () => {
    const result = await applyTemplateTransformations({
      targetFiles: [targetFile],
      patterns: [varToConstPattern],
      options: { dryRun: false },
    });

    expect(result.transformationsApplied).toBe(1);
    expect(result.filesModified).toEqual([targetFile]);
    expect(await readFile(targetFile, 'utf8')).toBe('const answer = 42;\n');
  });
});
