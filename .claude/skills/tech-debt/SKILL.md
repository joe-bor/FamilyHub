<tech-debt-skill>
# Technical Debt Management Skill

Manages the `docs/TECHNICAL-DEBT.md` document to ensure proper tracking of technical debt items.

## Usage

- `/tech-debt close <item-name>` — Close a completed debt item
- `/tech-debt audit` — Check document for issues
- `/tech-debt add` — Add a new debt item

---

## Subcommands

### `/tech-debt close <item-name>`

Guides through properly closing a technical debt item.

**Steps:**
1. Read `docs/TECHNICAL-DEBT.md`
2. Search for the item by name (fuzzy match on item titles)
3. If not found, list available items and ask user to clarify
4. Verify the fix exists (ask user for PR number if not obvious from context)
5. **MOVE** the item to the Completed Items table (do NOT copy — remove from original section)
6. Add proper entry with: Item description | Sprint (or `-`) | PR number | Date

**Example entry:**
```markdown
| Item Name (brief description) | Sprint 7 | #65 | Feb 4, 2026 |
```

### `/tech-debt audit`

Scans the document for common issues.

**Checks to perform:**
1. **Duplicates** — Item appears in both active sections AND Completed Items
2. **Missing PR numbers** — Completed Items with `-` or blank PR column
3. **Stale items** — Items marked as "Fixed" or "Completed" still in active sections
4. **Numbering issues** — Items not numbered sequentially within sections

**Output format:**
```
## Technical Debt Audit Results

### Issues Found
- ❌ Duplicate: "Item Name" exists in Low Priority AND Completed Items
- ❌ Missing PR: "Item Name" in Completed Items has no PR number
- ⚠️ Stale: "Item Name" marked as Fixed but still in Medium Priority

### Summary
Found X issues. Use `/tech-debt close` to fix duplicates.
```

If no issues: `✅ Technical debt document is clean. No issues found.`

### `/tech-debt add`

Guides through adding a new debt item with proper format.

**Required information:**
1. **Priority** — High, Medium, or Low
2. **Title** — Brief descriptive title
3. **Source** — Where was this identified? (PR number, sprint, investigation)
4. **Files** — Which files are affected?
5. **Problem** — What's the issue?
6. **Suggested Fix** — How should it be resolved?

**Template to use:**
```markdown
### N. Item Title
**Source:** PR #XX / Sprint N / Investigation
**Files:** `path/to/file.ts`, `path/to/other.ts`
**Status:** Description of current state

**Problem:**
Description of the issue.

**Suggested Fix:**
- Step 1
- Step 2
```

After adding, remind user to:
- Number the item correctly within its priority section
- Update "Last Updated" date at top of document

---

## Important Rules

1. **MOVE, don't copy** — When closing items, DELETE from active section
2. **Always include PR numbers** — Every completed item needs a PR reference
3. **Use today's date** — Format: `Mon D, YYYY` (e.g., Feb 4, 2026)
4. **Keep numbering sequential** — Renumber remaining items after moves/deletes

</tech-debt-skill>
