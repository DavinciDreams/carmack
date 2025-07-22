# 🚀 Carmack Coder - Quick Reference

## Automated Testing & Error Resolution System

### 🔧 Essential Commands

```bash
# One-time setup
bunx lefthook install              # Install git hooks

# Daily workflow
bun run fix:types                  # Fix TypeScript errors
bun run fix:imports               # Organize imports
bun run all-checks                # Run all quality checks

# Testing & validation
bun run fix:types:dry             # Preview fixes (dry run)
bunx lefthook run pre-commit      # Test pre-commit hooks
bun test test/actors/typescript-error-resolver.test.ts  # Test error resolver
```

### ⚡ Pre-Commit Hooks (Automatic)

When you commit, these run automatically:
1. **TypeScript Check** - Detects and fixes TS errors
2. **Biome Lint/Format** - Code style and formatting
3. **Import Organization** - Sorts and cleans imports
4. **Security Audit** - Vulnerability scanning
5. **Dafny Verification** - Formal correctness (if enabled)
6. **High-Priority Tests** - Critical functionality tests
7. **Commit Enhancement** - AI-powered commit messages

### 🎯 Error Types Fixed Automatically

| Error Code | Description | Risk Level |
|------------|-------------|------------|
| **TS7006** | Parameter implicitly has 'any' type | Low |
| **TS7034** | Variable implicitly has 'any' type | Low |
| **TS2322** | Type assignment errors | Medium |
| **TS2345** | Argument type errors | Low |
| **TS2531/2532** | Null/undefined safety | High |
| **TS2339** | Property access errors | High |
| **TS2355** | Missing return statements | Medium |

### 📋 Configuration Files

- **`lefthook.yml`** - Pre-commit hook configuration
- **`.carmack-precommit.json`** - Error resolver settings (optional)
- **`biome.json`** - Code formatting and linting rules
- **`tsconfig.json`** - TypeScript compiler configuration

### 🔍 Troubleshooting

```bash
# Check hook status
bunx lefthook dump

# Verbose output
export LEFTHOOK_VERBOSE=1
bunx lefthook run pre-commit

# Manual TypeScript check
bunx tsc --noEmit

# Reinstall hooks
bunx lefthook install --force
```

### 📊 System Status

- ✅ **TypeScript Errors**: Automatically resolved
- ✅ **Import Organization**: Clean, consistent structure  
- ✅ **Pre-Commit Hooks**: Fully operational
- ✅ **Commit Enhancement**: AI-powered analysis active
- ✅ **Test Coverage**: 100+ comprehensive tests

### 🎉 Benefits

- **Zero Manual Work**: Errors fixed automatically
- **Consistent Quality**: Every commit meets standards
- **Enhanced Messages**: Detailed commit documentation
- **Fast Performance**: 5-15 seconds typical pre-commit time
- **Safe Operations**: Risk-assessed fixes only

---

**📖 Full Documentation**: [AUTOMATED-TESTING-SYSTEM.md](./AUTOMATED-TESTING-SYSTEM.md)