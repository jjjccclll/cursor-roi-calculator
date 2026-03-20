# Fix empty GitHub repo + Vercel

Your GitHub repo looks empty because **the push never completed** or **git was in a broken state** (`.git` pointing at a `gitdir/` folder). Follow these steps **on your Mac** in Terminal.

## 1. Reset git (your `src/` code is not deleted)

```bash
cd /Users/jacklarkins/cursor-roi-calculator

rm -rf .git .git.broken gitdir
```

## 2. Fresh repo

```bash
git init
git branch -M main
git add .
git status
```

**Check `git status`:** you should see `src/`, `package.json`, `vite.config.ts`, etc.  
You should **NOT** see `node_modules` or `dist` (they are in `.gitignore`).

## 3. Commit

```bash
git commit -m "Add Cursor Account Intelligence dashboard"
```

## 4. Connect GitHub and push

**SSH (recommended if you set up SSH keys):**

```bash
git remote add origin git@github.com:jjjccclll/Cursor-ROI-Calculator.git
git push -u origin main
```

**HTTPS + GitHub CLI:**

```bash
gh auth login
gh auth setup-git
git remote add origin https://github.com/jjjccclll/Cursor-ROI-Calculator.git
git push -u origin main
```

If GitHub already has a commit (e.g. README only) and push is rejected:

```bash
git push -u origin main --force
```

(Only do `--force` if you are okay replacing whatever is on `main`.)

## 5. Confirm on GitHub

Open: `https://github.com/jjjccclll/Cursor-ROI-Calculator`

You should see folders: `src/`, `public/`, and files like `package.json`, `vite.config.ts`.

## 6. Vercel

- Import the same repo again (or redeploy).
- If it still doesn’t auto-detect Vite, set:
  - **Framework:** Vite  
  - **Build:** `npm run build`  
  - **Output:** `dist`  

This repo includes `vercel.json` to help Vercel pick the right settings.
