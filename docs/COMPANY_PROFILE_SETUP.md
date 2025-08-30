# Company Profile Setup

This application supports automatic company profile detection and template application.

## Setup

1. Copy the template file:
   ```bash
   cp config/company-profiles.example.ts config/company-profiles.ts
   ```

2. Edit `config/company-profiles.ts` with your company's specific settings:
   - Set your company's internal URL for detection (e.g., intranet, confluence)
   - Configure your API endpoints in `templateData`
   - Set the appropriate version number

3. The file `config/company-profiles.ts` is excluded from git tracking, so you can safely customize it without affecting the repository.

## How it works

1. When the application starts, it checks if any configured company environments are accessible
2. If detected, it shows a modal asking if you want to apply the company profile
3. The modal includes version information and offers three options:
   - **OK**: Navigate to settings and auto-import the template
   - **Ask me again**: Keep the profile in unconfirmed state (will show again next time)
   - **Reject**: Mark as rejected (won't show again for the same version)

## Version Management

- Each company profile has a version number
- When you update the version in your configuration, users will see the prompt again
- State is tracked per company and version to avoid repeated prompts

## Template Data

Define your API configurations directly in the `templateData` field of your company profile configuration.