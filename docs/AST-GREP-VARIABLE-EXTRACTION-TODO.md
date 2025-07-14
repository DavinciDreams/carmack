# AST-grep Variable Extraction TODO

## Issue Summary

The AST-grep transformation engine is successfully finding and applying patterns, but variable extraction from matched nodes is not working correctly. Variables like `$VAR`, `$VALUE`, `$ARRAY`, `$ITEM`, etc. are being replaced literally instead of being substituted with the actual captured values from the AST matches.

## Current Status

✅ **Working Components:**
- Pattern matching and node finding via `root.root().findAll(query)`
- Transformation application and file modification
- Priority handling and conflict resolution
- Batch processing across multiple files
- Error handling for invalid syntax and missing files
- Dry run mode and complexity limits
- Performance features (maxMatches, conflicts)

❌ **Broken Component:**
- Variable extraction from AST-grep matches in `extractVariables()` function

## Test Results

From the test execution, we can see:
- 10 out of 15 tests passing
- Variable substitution failing in patterns like:
  - `var $VAR = $VALUE` → produces `let $VAR = $VALUE` instead of `let name = "test"`
  - `$ARRAY.indexOf($ITEM) !== -1` → produces `$ARRAY.includes($ITEM)` instead of `items.includes(2)`
  - `console.log($MESSAGE)` → produces `debug($MESSAGE)` instead of `debug("debug message")`

## Root Cause Analysis

The issue is in the `extractVariables()` function in [`src/actors/ast-grep-transformation.ts`](../src/actors/ast-grep-transformation.ts):

1. **API Uncertainty**: The exact API for extracting named captures from AST-grep NAPI is unclear
2. **Method Signature**: `node.getMultipleMatches(varName)` may not be the correct method or signature
3. **Fallback Logic**: The manual pattern extraction fallback is not working effectively

## Current Implementation

```typescript
function extractVariables(node: SgNode, pattern: AstGrepPattern): Record<string, string> {
  // Attempts multiple approaches:
  // 1. node.getMultipleMatches(varName) - may be wrong API
  // 2. Manual regex-based extraction - not matching correctly
  // 3. Pattern-based extraction - too generic
}
```

## TODO: Fix Variable Extraction

### Priority: HIGH
### Estimated Effort: 4-6 hours
### Assigned To: TBD

### Tasks:

1. **Research AST-grep NAPI Documentation**
   - [ ] Study the official AST-grep NAPI documentation for variable extraction
   - [ ] Find correct method signatures for capturing named groups
   - [ ] Understand the data structures returned by match operations

2. **Investigate Alternative APIs**
   - [ ] Try `node.getMatch(varName)` instead of `getMultipleMatches`
   - [ ] Explore `node.env()` or similar environment methods
   - [ ] Test different parameter formats (string vs object)

3. **Debug Current Implementation**
   - [ ] Add extensive logging to see what `getMultipleMatches` actually returns
   - [ ] Test with simple patterns to isolate the issue
   - [ ] Verify that the pattern string format is correct for AST-grep

4. **Implement Robust Fallback**
   - [ ] Improve the regex-based variable extraction
   - [ ] Create pattern-specific extraction logic
   - [ ] Add comprehensive error handling and logging

5. **Test and Validate**
   - [ ] Ensure all 15 test cases pass
   - [ ] Add additional test cases for edge cases
   - [ ] Verify variable extraction works with complex patterns

### Code Locations

- **Primary**: [`src/actors/ast-grep-transformation.ts:420-460`](../src/actors/ast-grep-transformation.ts) - `extractVariables()` function
- **Supporting**: [`src/actors/ast-grep-transformation.ts:470-550`](../src/actors/ast-grep-transformation.ts) - Helper functions
- **Tests**: [`test/actors/ast-grep-transformation.test.ts`](../test/actors/ast-grep-transformation.test.ts)

### Success Criteria

- [ ] All 15 AST-grep transformation tests pass
- [ ] Variables are correctly extracted and substituted in transformations
- [ ] Performance remains acceptable (no significant regression)
- [ ] Error handling is robust for edge cases

### Dependencies

- AST-grep NAPI library documentation
- TypeScript type definitions for AST-grep
- Test infrastructure (already in place)

### Notes

This is a critical issue that prevents the AST-grep transformation engine from being production-ready. The core pattern matching works, but without proper variable extraction, the transformations are not useful. This should be prioritized before moving to other features.

### Related Issues

- Template engine variable extraction works correctly (can be used as reference)
- LLM transformation variable handling is functional
- Pattern learning system depends on accurate transformations

---

**Created**: 2025-01-14  
**Last Updated**: 2025-01-14  
**Status**: Open  
**Priority**: High  