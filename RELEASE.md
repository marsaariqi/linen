# Releasing Linen

## Prerequisites

- GitHub repository: `https://github.com/marsaariqi/linen`
- `GITHUB_TOKEN` automatically available in Actions (no setup needed)
- `package.json` version field and `src-tauri/tauri.conf.json` version field must match

## Release Process

### 1. Bump Version

Update the version in **both** files:

```
package.json            → version: "0.2.0"
src-tauri/tauri.conf.json → version: "0.2.0"
```

### 2. Update CHANGELOG.md

Add a new section for the release version describing changes.

### 3. Commit & Tag

```bash
git add package.json src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore: bump to v0.2.0"
git tag v0.2.0
git push origin v0.2.0
```

### 4. GitHub Actions Builds

Pushing a tag matching `v*` triggers `.github/workflows/release.yml` which:

| Platform | Target | Output |
|----------|--------|--------|
| Ubuntu 22.04 | x86_64-unknown-linux-gnu | `.deb`, `.tar.gz` |
| Windows latest | x86_64-pc-windows-msvc | `.msi`, `.exe` |
| macOS latest | aarch64-apple-darwin | `.dmg` |

The workflow uses [tauri-action](https://github.com/tauri-apps/tauri-action) which:
- Builds the app for all platforms in parallel
- Creates a GitHub Release with the artifacts
- Attaches `.msi` (Windows), `.dmg` (macOS), `.deb` (Linux)

## Version & Update Check

The **Settings → Check for Updates** button fetches the latest release tag from `https://api.github.com/repos/marsaariqi/linen/releases/latest` and compares it with the build-time `__APP_VERSION__` (from `package.json`). No auto-update plugin is used — the user decides whether to download the new version. As long as the GitHub Release has the correct `tag_name` (e.g. `v0.2.0`), the check will work automatically after each release.

## Manual Release (without CI)

```bash
# Build for current platform
npx tauri build

# Outputs are in src-tauri/target/release/bundle/
```

## Version Display

The app version shown in Settings comes from `package.json` (injected at build time via Vite `define`):

```ts
// src/types.ts
declare const __APP_VERSION__: string
```
