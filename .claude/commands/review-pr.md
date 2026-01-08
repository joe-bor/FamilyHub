Review the pull request at: $ARGUMENTS

## Instructions

Fetch the PR diff and details using `gh pr view` and `gh pr diff`. Then provide a thorough review through the lens of FamilyHub's architecture and vision.

## FamilyHub Context

This is a **shared family organization app** (not multi-user with accounts). Think: kitchen tablet, family command center. Key principles:
- Anyone can view/edit, no per-user auth
- localStorage now, backend API in Phase 2
- Calendar module is complete; Chores, Meals, Lists, Photos are future

## Review Checklist

### 1. Architecture Alignment
- [ ] Follows established patterns in CLAUDE.md
- [ ] State management: Zustand for UI state, TanStack Query for server state
- [ ] Types centralized in `src/lib/types/`
- [ ] Forms use react-hook-form + Zod validation
- [ ] Uses existing UI primitives from `src/components/ui/`

### 2. Code Quality
- [ ] No hardcoded values that should be configurable
- [ ] Proper TypeScript types (no `any`, interfaces defined)
- [ ] Uses `cn()` for className merging
- [ ] Uses time-utils.ts for date/time operations (not raw Date parsing)
- [ ] No console.logs or debug code

### 3. Performance
- [ ] No unnecessary re-renders (check selector usage)
- [ ] Large lists use proper memoization
- [ ] No blocking operations in render path

### 4. Testing
- [ ] Unit tests for new stores/utilities
- [ ] Integration tests for new components
- [ ] E2E coverage for user-facing flows
- [ ] Tests use established seeders from `src/test/test-utils`

### 5. Accessibility
- [ ] Interactive elements have aria-labels
- [ ] Touch targets are 44px+ minimum
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG standards

### 6. Mobile/Responsive
- [ ] Works on 320px viewport
- [ ] Touch-friendly interactions
- [ ] No horizontal scroll on mobile

### 7. Technical Debt
- [ ] Check if this PR addresses items in `docs/TECHNICAL-DEBT.md`
- [ ] Note any new technical debt introduced
- [ ] No backward-compatibility hacks (delete unused code, don't comment out)

## Output Format

Provide:
1. **Summary**: What this PR does (1-2 sentences)
2. **Verdict**: Approve / Request Changes / Needs Discussion
3. **Strengths**: What's done well
4. **Issues**: Specific problems to fix (with file:line references)
5. **Suggestions**: Optional improvements (not blockers)
6. **Technical Debt**: Any items to add to TECHNICAL-DEBT.md

## Posting the Review to GitHub

After completing the review analysis, post it directly to the PR:

### 1. Post Main Review Comment

Use `gh pr comment` to post the full review summary:

```bash
gh pr comment <PR_NUMBER> --repo <OWNER>/<REPO> --body "$(cat <<'EOF'
## PR Review: <title>

### Summary
<summary>

### Verdict: <verdict>

### Strengths
<strengths>

### Issues (Must Fix)
<issues with file:line references>

### Suggestions (Non-blocking)
<suggestions>

### Technical Debt
<tech debt notes>
EOF
)"
```

### 2. Post Inline Comments on Specific Lines

For each issue or suggestion that references a specific file:line, add an inline comment:

```bash
gh api repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments \
  --method POST \
  -f body="<comment explaining the issue and recommendation>" \
  -f commit_id="<latest_commit_sha_from_pr>" \
  -f path="<relative/file/path.ts>" \
  -f side="RIGHT" \
  -F line=<line_number>
```

**To get the latest commit SHA:**
```bash
gh pr view <PR_NUMBER> --repo <OWNER>/<REPO> --json commits --jq '.commits[-1].oid'
```

### 3. Important Notes

- **Own PRs**: `gh pr review --request-changes` doesn't work on your own PRs. Use `gh pr comment` instead.
- **Inline comments require**: `commit_id`, `path`, `side` ("RIGHT" for new code), and `line` number
- **Line numbers**: Use the line number in the NEW file (after changes), not the diff position
- Post inline comments for actionable issues so they appear directly on the code
