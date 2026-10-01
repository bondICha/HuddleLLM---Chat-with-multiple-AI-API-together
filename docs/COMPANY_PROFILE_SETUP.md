# Company Profile Setup

This application supports automatic company profile detection and template application.

## Setup

1. Copy the template file:
   ```bash
   cp packages/core/config/company-profiles.example.ts packages/core/config/company-profiles.ts
   ```

2. Edit `packages/core/config/company-profiles.ts` with your company's specific settings:
   - Set your company's internal URL for detection (`checkUrl`, e.g., intranet, confluence)
   - Configure your API endpoints in `templateData`
   - Set the appropriate version number

3. Add the `checkUrl` origin to `host_permissions` in `packages/chrome/manifest.config.ts`:
   ```ts
   host_permissions: [
     // ...
     "https://your-intranet.example.com/",
   ]
   ```
   This is required so the extension can read the HTTP status of the detection HEAD request. Without it, the cross-origin response status is not readable and detection always fails.

4. The file `packages/core/config/company-profiles.ts` is excluded from git tracking, so you can safely customize it without affecting the repository.

## How it works

1. When the application starts, it checks if any configured company environments are accessible
   - **Note**: the check only runs during the first 3 application launches (`openTimes <= 3`), or when the profile version is newer than the stored one
2. The detection request is a `HEAD` request with a 1-second timeout and **must return exactly HTTP 200** (redirects, 403, etc. count as "not detected")
3. If detected, it shows a modal asking if you want to apply the company profile
4. The modal includes version information and offers three options:
   - **OK**: Navigate to settings and auto-import the template
   - **Ask me again**: Keep the profile in unconfirmed state (will show again next time)
   - **Reject**: Mark as rejected (won't show again for the same version)

## Version Management

- Each company profile has a version number
- When you update the version in your configuration, users will see the prompt again
- State is tracked per company and version to avoid repeated prompts

## Template Data

Define your API configurations directly in the `templateData` field of your company profile configuration.

If your API servers reject requests with a browser `Origin` header (CORS), you can also create `packages/chrome/rules/remove-origin-header.json` (copy from `remove-origin-header.json.example`) to strip the `Origin` header for your API domains via declarativeNetRequest. This file is also excluded from git tracking.

## Debugging: Chrome Storage Manipulation

Use the following commands in the Chrome DevTools Console (on the extension's `app.html` page) to reset or manipulate the company profile state for testing.

**Print current profile name and version:**
```javascript
chrome.storage.local.get(null, (all) => { const k = Object.keys(all).find(k => k.startsWith('companyProfile_')); console.log(k, all[k]?.companyName, all[k]?.version) })
```

**Reset detection conditions (re-show the modal on next launch):**
```javascript
chrome.storage.sync.set({ openTimes: 1 })
chrome.storage.local.remove('companyProfile_YourCompany') // your companyName
```

**Trigger re-import (downgrade stored version):**
```javascript
chrome.storage.local.get(null, (all) => { const k = Object.keys(all).find(k => k.startsWith('companyProfile_')); chrome.storage.local.set({ [k]: { ...all[k], version: '2020.01.01' } }, () => console.log('done')) })
```

**Open the import dialog directly (equivalent to clicking OK on the modal):**
```javascript
window.location.href = '#/setting?autoImport=templateData&company=YourCompanyName'
```

After running the storage commands, reload the extension or open a new tab to trigger the detection flow.
