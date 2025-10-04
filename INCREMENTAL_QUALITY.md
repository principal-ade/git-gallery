# Incremental Code Quality Strategy

This project uses an incremental approach to gradually improve TypeScript and ESLint coverage without breaking existing workflows.

## Overview

Instead of enforcing strict type checking and linting on the entire codebase immediately, we use incremental configurations that can be gradually expanded as code quality improves.

## TypeScript Configurations

### Level 1 - Foundation (`tsconfig.level1.json`)

**Folders included:**

- `src/types/**/*` - Type definitions
- `src/config/**/*` - Configuration files
- `src/adapters/**/*` - Adapter patterns
- `src/contexts/**/*` - React contexts

**Command:** `npm run typecheck:level1`

### Level 2 - Core Logic (`tsconfig.level2.json`)

**Adds:**

- `src/hooks/**/*` - Custom React hooks
- `src/lib/**/*` - Utility libraries

**Command:** `npm run typecheck:level2`

### Level 3 - Extended Coverage (`tsconfig.level3.json`)

**Adds:**

- `src/utils/**/*` - Utility functions
- `src/stores/**/*` - State management
- `src/component-tabs/**/*` - Component tabs

**Command:** `npm run typecheck:level3`

## ESLint Configurations

Each level targets the same folders as TypeScript configs using Next.js ESLint:

### Level 1 - Foundation

**Command:** `npm run lint:level1`
**Folders:** `src/types`, `src/config`, `src/adapters`, `src/contexts`

### Level 2 - Core Logic

**Command:** `npm run lint:level2`
**Adds:** `src/hooks`, `src/lib`

### Level 3 - Extended Coverage

**Command:** `npm run lint:level3`  
**Adds:** `src/utils`, `src/stores`, `src/component-tabs`

### Level 4 - Component Coverage ✅

**Command:** `npm run lint:level4`
**Adds:** `src/components/providers`, `src/components/shared`

**Current ESLint Level:** Level 4 (11 folders)

## Current Active Level

**Current:** Level 4 ✅

**Folders covered (all clean):**

- `src/types/**/*` - Type definitions
- `src/config/**/*` - Configuration files
- `src/adapters/**/*` - Adapter patterns
- `src/contexts/**/*` - React contexts
- `src/hooks/**/*` - Custom React hooks
- `src/lib/**/*` - Utility libraries
- `src/utils/**/*` - Utility functions
- `src/stores/**/*` - State management
- `src/component-tabs/**/*` - Component tabs
- `src/components/providers/**/*` - Provider components
- `src/components/shared/**/*` - Shared components

**Next target:** Level 5 (add more component folders)

The pre-commit hook runs:

- `npm run typecheck:incremental` (→ `typecheck:level4`)
- `npm run lint:incremental` (→ `lint:level4`)

This means **11 folders** are now protected from both type errors AND linting issues! 🎉

**ESLint Status:** Currently shows only warnings (no errors) in the protected folders.

## Advancing to Next Level

When ready to advance to the next level:

1. **Test the next level:**

   ```bash
   npm run typecheck:level2
   npm run lint:level2
   ```

2. **Fix any errors in the new folders**

3. **Update the active level:**

   ```json
   // In package.json
   "typecheck:incremental": "npm run typecheck:level5",
   "lint:incremental": "npm run lint:level5"
   ```

4. **Commit the changes**

## Benefits

- ✅ **No build breaks** - Start with clean, small folders
- ✅ **Gradual improvement** - Add folders as they're cleaned up
- ✅ **Team buy-in** - No sudden strict enforcement
- ✅ **Quality gates** - Pre-commit hooks prevent regressions
- ✅ **Clear progress** - Easy to see which folders are "clean"

## Adding New Folders

To add a folder to the next level:

1. Test it in isolation:

   ```bash
   npx tsc --noEmit src/new-folder/**/*
   ```

2. If clean, add to the appropriate level config

3. Update documentation

## Future Expansion

As the codebase improves, additional levels can include:

- `src/components/**/*`
- `src/services/**/*`
- `src/app/**/*`

The goal is to eventually have the entire codebase under strict type checking and linting.
