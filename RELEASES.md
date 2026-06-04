# Releases

This document describes how to set up a remote and push the v10 release series.

## Current State

- **Repo:** `C:\Users\benjamin.steimer\workspace\NoteStash`
- **Branch:** `master`
- **Commits:** 1 (initial commit with `README.md`)
- **Tags:** 10 annotated v10 tags (`v10.0.0` … `v10.0.9`)
- **Remote:** None configured (push not yet performed)

## Tag Summary

| Tag | Subject | Type |
|-----|---------|------|
| `v10.0.0` | Initial release: 36 modules, AI cleaning, sessions, recording mode | release |
| `v10.0.1` | Security: Google API key moved from URL to `x-goog-api-key` header | security |
| `v10.0.2` | Security: CSP added to `manifest.json` | security |
| `v10.0.3` | Security: 6 `innerHTML` XSS sinks fixed | security |
| `v10.0.4` | Refactor: storage area consistency in `chrome-api.mjs` | refactor |
| `v10.0.5` | Cleanup: dead modules removed, `src/` tree deleted (~5,113 LoC) | cleanup |
| `v10.0.6` | Quality: 59 `console.log`s gated, 406 inline comments removed | quality |
| `v10.0.7` | Feature: XPath text resolver added | feature |
| `v10.0.8` | Cleanup: archive artifacts moved to `releases/`, `.gitignore` added | cleanup |
| `v10.0.9` | Docs: 15 audit + verification + planning reports in `reports/` | docs |

## How to Push

### 1. Create a GitHub / GitLab / Gitea repo

On the host (github.com):
1. Click **New repository**
2. Name: `NoteStash`
3. Visibility: Public (or Private)
4. **Do not** initialize with README, license, or .gitignore (we already have those)

### 2. Add the remote

```powershell
cd "C:\Users\benjamin.steimer\workspace\NoteStash"
git remote add origin https://github.com/YOUR-USERNAME/NoteStash.git
git remote -v   # verify
```

### 3. Push the branch + tags

```powershell
git push -u origin master          # push the master branch
git push --tags -u                  # push all 10 v10 tags
```

Or in one shot:

```powershell
git push -u origin master --tags
```

### 4. Mark releases on GitHub

For each tag, optionally create a GitHub Release:
1. Go to `https://github.com/YOUR-USERNAME/NoteStash/releases`
2. Click **Draft a new release**
3. Choose a tag (e.g., `v10.0.7`)
4. Title: `NoteStash v10.0.7 — XPath text resolver`
5. Description: copy from the tag's annotated message
6. Attach `build/NoteStash-v10.0.0.zip` as a binary asset
7. Click **Publish release**

### 5. CLI alternative (using `gh`)

```powershell
gh release create v10.0.7 ./NoteStash-v10.0.0.zip --title "XPath text resolver" --notes "Detects and resolves absolute XPath patterns in clipped page content."
```

## Verification

After pushing:

```powershell
git ls-remote --tags origin   # lists all tags on the remote
```

## Bundle Artifact

The actual `.zip` bundle lives at `notestash/build/NoteStash-v10.0.0.zip` (~129 KB) — copy it to the repo root before publishing a release:

```powershell
Copy-Item "C:\Users\benjamin.steimer\workspace\notestash\build\NoteStash-v10.0.0.zip" "C:\Users\benjamin.steimer\workspace\NoteStash\NoteStash-v10.0.0.zip" -Force
```

## Notes

- The 10 tags currently all point to the initial `README.md` commit because the working source tree was not copied into this fresh repo. The tag annotations document what each release *was* — when source is re-added, the tags can be re-pointed via `git tag -f v10.0.7 <commit-sha>`.
- The original source for these tags lives in commit history of the upstream NoteStash work, archived in the `notestash/reports/` audit trail.
