# PATCH FORMAT SKILL
## Standardized Code Patches for WSIC Advertising Platform
## Using `git apply` for automatic patch application

---

## Overview

This skill defines how Claude delivers code changes as **`.patch` files** that can be applied with a single command. No manual find/replace needed!

---

## Workflow Summary

1. Claude creates `.patch` file(s)
2. You download to Downloads folder
3. Run: `git apply "C:\Users\WSIC BILLING\Downloads\filename.patch"`
4. Done! Change is applied.

---

## Your Environment

```
Project Folder: C:\Users\WSIC BILLING\Desktop\simplifi-reports
Downloads:      C:\Users\WSIC BILLING\Downloads
```

---

## When to Use Patches vs Full Files

| Scenario | Approach |
|----------|----------|
| Small change (1-50 lines) | **`.patch` file** → `git apply` |
| Multiple small changes | **Multiple `.patch` files** or combined |
| Large refactor (100+ lines) | **Full file replacement** |
| New file creation | **Full file** |
| Deleting a file | **Git command** |

---

## Patch File Format (Unified Diff)

Claude will create files like this:

```diff
--- a/frontend/src/App.jsx
+++ b/frontend/src/App.jsx
@@ -16516,7 +16516,7 @@
       ) : (
         <>
           {/* APPROVALS TAB - Admin Only */}
-          {activeTab === 'approvals' && user?.role === 'admin' && (
+          {activeTab === 'approvals' && isAdminUser(user) && (
             <div>
               {pendingCommissions.length === 0 ? (
```

**Key:**
- `---` = old file (before)
- `+++` = new file (after)  
- `-` lines = removed
- `+` lines = added
- `@@` = line numbers and context

---

## Standard Commands

### Apply a Single Patch
```cmd
cd "C:\Users\WSIC BILLING\Desktop\simplifi-reports"
git apply "C:\Users\WSIC BILLING\Downloads\fix-name.patch"
```

### Apply Multiple Patches
```cmd
cd "C:\Users\WSIC BILLING\Desktop\simplifi-reports"
git apply "C:\Users\WSIC BILLING\Downloads\patch1.patch"
git apply "C:\Users\WSIC BILLING\Downloads\patch2.patch"
```

### Preview Patch (See what will change without applying)
```cmd
git apply --stat "C:\Users\WSIC BILLING\Downloads\fix-name.patch"
```

### Check if Patch Will Apply Cleanly
```cmd
git apply --check "C:\Users\WSIC BILLING\Downloads\fix-name.patch"
```

### If Patch Fails (file was modified)
```cmd
git apply --3way "C:\Users\WSIC BILLING\Downloads\fix-name.patch"
```

---

## Complete Deployment Flow

```cmd
cd "C:\Users\WSIC BILLING\Desktop\simplifi-reports"

REM 1. Apply patch(es)
git apply "C:\Users\WSIC BILLING\Downloads\fix-commissions.patch"

REM 2. Verify changes
git status
git diff

REM 3. Commit and push
git add -A
git commit -m "Fix: description of changes"
git push origin main
```

---

## Naming Convention for Patch Files

Claude will name patches descriptively:

| Pattern | Example |
|---------|---------|
| `fix-[issue].patch` | `fix-commissions-visibility.patch` |
| `add-[feature].patch` | `add-contract-term-fields.patch` |
| `update-[component].patch` | `update-error-handling.patch` |
| `[date]-[description].patch` | `2026-01-30-order-fixes.patch` |

---

## Troubleshooting

### "patch does not apply"
The file has changed since the patch was created. Options:
1. Try: `git apply --3way "path\to\file.patch"`
2. Ask Claude for updated patch based on current file

### "trailing whitespace"
Usually safe to ignore, but can fix with:
```cmd
git apply --whitespace=fix "path\to\file.patch"
```

### Wrong directory
Make sure you're in the repo root:
```cmd
cd "C:\Users\WSIC BILLING\Desktop\simplifi-reports"
```

---

## For Claude: Patch Generation Guidelines

When creating patches:

1. **Use unified diff format** with full file paths from repo root
2. **Include 3-7 lines of context** around changes
3. **Use descriptive filenames** that indicate what's being fixed
4. **Group related changes** into single patch when logical
5. **Provide verification steps** after patch commands
6. **Always specify the exact git apply command** with full paths

### Patch Template for Claude:

```markdown
## Patch: [description]

**Files Modified:**
- `path/to/file1.jsx`
- `path/to/file2.js`

**Download:** [filename.patch]

**Apply Command:**
```cmd
cd "C:\Users\WSIC BILLING\Desktop\simplifi-reports"
git apply "C:\Users\WSIC BILLING\Downloads\filename.patch"
```

**Verification:**
[Steps to verify the fix worked]

**Then commit:**
```cmd
git add -A
git commit -m "[commit message]"
git push origin main
```
```

---

## Full File Replacement (When Needed)

For large changes, Claude will provide full files. Apply with:

```cmd
cd "C:\Users\WSIC BILLING\Desktop\simplifi-reports"

REM Backend file
del backend\routes\order.js
copy "C:\Users\WSIC BILLING\Downloads\order.js" backend\routes\order.js

REM Frontend file
del frontend\src\components\ComponentName.jsx
copy "C:\Users\WSIC BILLING\Downloads\ComponentName.jsx" frontend\src\components\ComponentName.jsx

git add -A
git commit -m "Description"
git push origin main
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Apply patch | `git apply "...\Downloads\file.patch"` |
| Preview patch | `git apply --stat "...\Downloads\file.patch"` |
| Check patch | `git apply --check "...\Downloads\file.patch"` |
| Force apply | `git apply --3way "...\Downloads\file.patch"` |
| See changes | `git diff` |
| Undo all changes | `git checkout .` |
