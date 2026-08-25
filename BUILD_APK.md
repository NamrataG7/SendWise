# How to Get the SendWise APK

Three ways, in order of increasing effort. **Method 1 is the recommended path** — no local toolchain required.

---

## Method 1 — Download from GitHub Actions *(recommended)*

Every push to `main` triggers a debug APK build. Namrata's laptop needs nothing installed beyond a browser.

- [ ] Open <https://github.com/NamrataG7/SendWise/actions>
- [ ] Wait until the most recent **Build APK** workflow shows a green check ✅
- [ ] Click the run title → scroll to the **Artifacts** section at the bottom
- [ ] Click **`SendWise-debug-apk`** to download `SendWise-debug-apk.zip`
- [ ] Unzip → you now have `app-debug.apk`

> [!NOTE]
> GitHub Actions artefacts expire after **90 days**. Re-run the workflow (Actions → workflow → *Re-run all jobs*) if the artefact is gone.

Proceed to [`INSTALL_ON_REDMI.md`](INSTALL_ON_REDMI.md) to sideload the APK.

---

## Method 2 — Local build *(advanced)*

Use this only if you cannot access GitHub Actions.

### Prerequisites (macOS)

```bash
# JDK 21
brew install --cask temurin@21
/usr/libexec/java_home -v 21   # confirm the path

# Android command-line tools
brew install --cask android-commandlinetools
```

Set environment (add to `~/.zshrc`):

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"
```

### Install required SDK packages

```bash
sdkmanager --list | head -40                           # sanity check
sdkmanager --licenses                                  # accept all
sdkmanager "platform-tools" \
           "platforms;android-34" \
           "build-tools;34.0.0"
```

### Build

```bash
cd SafeKeyboardApp
./gradlew assembleDebug
```

The APK is at:

```
SafeKeyboardApp/app/build/outputs/apk/debug/app-debug.apk
```

- [ ] Transfer to phone per [`INSTALL_ON_REDMI.md`](INSTALL_ON_REDMI.md)

---

## Method 3 — Download a tagged release

For pinned, citable versions (e.g. the exact APK submitted with the paper):

```bash
git tag v1.0.0
git push --tags
```

GitHub Actions attaches `app-debug.apk` to the release. Then:

- [ ] Open <https://github.com/NamrataG7/SendWise/releases>
- [ ] Choose the tag (e.g. `v1.0.0`)
- [ ] Download `app-debug.apk` under **Assets**

> [!TIP]
> Reviewers should be pointed at the tagged release, not the rolling `main` artefact — tags are immutable.

---

<sub>APK in hand? → [`INSTALL_ON_REDMI.md`](INSTALL_ON_REDMI.md).</sub>
