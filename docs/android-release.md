# Releasing the Android APK

The app ships as a **signed release APK for direct sideloading — not the Play
Store**. `.github/workflows/android-release.yml` builds and signs it in CI. This
doc is the operational runbook: one-time signing setup, then how to cut a
release.

## How it works

The workflow runs only when you **push a version tag** (`v*`) or **run it
manually** from the Actions tab. It builds the web bundle (`npm run build`),
syncs it into the Android project (`npx cap sync android`), then signs
`assembleRelease` with your release keystore. The signed APK is uploaded as a
run **artifact**, and for tag builds it is also published to that tag's **GitHub
Release** (a stable download link you can share).

The fast lint/test/web-build CI (`ci.yml`, on every push & PR) is separate and
untouched.

## One-time setup

### 1. Create a release keystore

Run once, anywhere with a JDK installed (keep the output file safe — see the
warning below). From Git Bash:

```bash
keytool -genkeypair -v -keystore uu-mlc-nexus-release.jks -alias uu-mlc-nexus -keyalg RSA -keysize 2048 -validity 10000
```

It prompts for a **store password**, a **key password** (pressing Enter reuses
the store password — simplest), and a name/org (any values). Use an
**alphanumeric password** — a `\` in the password would be misread by the Java
properties file the CI writes.

> ⚠️ **Back this file up somewhere permanent (and remember the passwords).** Every
> update must be signed with the *same* key, or a sideloaded phone will refuse to
> install it over the existing app (users would have to uninstall first, losing
> local app data). Lose the keystore and you lose the ability to ship in-place
> updates.

### 2. Base64-encode the keystore

CI can't hold a binary file in a secret, so store it base64-encoded. From Git
Bash:

```bash
base64 -w0 uu-mlc-nexus-release.jks > uu-mlc-nexus-release.b64.txt
```

(PowerShell alternative: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("uu-mlc-nexus-release.jks")) > uu-mlc-nexus-release.b64.txt`.)

Open that `.txt` and copy its entire contents for the next step. Delete the
`.txt` (and keep the `.jks` in your backup) once the secret is set.

### 3. Add the GitHub repository secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Add four:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the full base64 string from step 2 |
| `ANDROID_KEYSTORE_PASSWORD` | the store password from step 1 |
| `ANDROID_KEY_ALIAS` | `uu-mlc-nexus` (or your `-alias`) |
| `ANDROID_KEY_PASSWORD` | the key password (= store password if you pressed Enter) |

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are already set for `ci.yml` and
are reused here — nothing to add.

## Cutting a release

1. **Bump the version** in [`android/app/build.gradle`](../android/app/build.gradle):
   - Always increase `versionCode` by 1 (Android requires it to go up for a
     sideloaded update to install over the previous APK).
   - Update `versionName` (e.g. `"1.0.3"`) if it's a user-facing version change.
   - Commit and push to `main`.
2. **Build it**, either way:
   - **Test build (no tag):** Actions tab → *Android release APK* → **Run
     workflow**. Download the APK from the run's Artifacts.
   - **Real release:** push a matching tag —
     ```bash
     git tag v1.0.3
     git push origin v1.0.3
     ```
     The APK is attached to the **v1.0.3 GitHub Release** for sharing.

> First time? Use a manual **Run workflow** to produce and test an APK for the
> current `1.0.2` without needing a new tag.

## Notes

- **AAB, not APK:** intentionally not built — this is sideload-only, no Play
  Store.
- **Push notifications** need `google-services.json` (Phase 2) — its absence is
  handled gracefully and does not block this build.
- Local `vite build` is broken on Windows (Rolldown win32 defect); CI on Linux
  builds correctly, same as Render.
