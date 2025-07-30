// Pipeline for Zod-validated doc generation (for Carmack and other repos)

import { writeFile } from 'fs/promises';
import { DocumentationGenerator } from './generator';
import { validateDocumentationRequest, validateDocumentationResult } from './types';

export async function generateAndStoreDocs(rawRequest: unknown) {
  // 1. Validate input
  const request = validateDocumentationRequest(rawRequest);

  // 2. Generate docs
  const generator = new DocumentationGenerator();
  const result = await generator.generateDocumentation(request);

  // 3. Validate output
  const validatedResult = validateDocumentationResult(result);

  // 4. Store docs (to file)
  if (validatedResult.outputPath) {
    await writeFile(validatedResult.outputPath, validatedResult.content, 'utf8');
    // Optionally, write metadata as JSON
    await writeFile(
      validatedResult.outputPath + '.meta.json',
      JSON.stringify(validatedResult.metadata, null, 2),
      'utf8'
    );
  }
  return validatedResult;
}
