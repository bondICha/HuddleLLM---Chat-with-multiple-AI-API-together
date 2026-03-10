# Contributing to HuddleLLM

Thank you for your interest in contributing to HuddleLLM!

## Git Workflow

We follow a simplified Git Flow for managing branches and releases:

```
main (production releases only)
  ↑
release/* (release preparation)
  ↑
dev (development integration)
  ↑
feat/*, fix/* (feature development)
```

### Branch Structure

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only. Updated via release branches. |
| `dev` | Development branch where features are integrated. |
| `release/vX.Y.Z` | Release preparation branch, created from `dev`. |
| `feat/*` | Feature branches, created from `dev`. |
| `fix/*` | Bug fix branches, created from `dev`. |

### Workflow Steps

1. **Feature Development**
   ```bash
   git checkout dev
   git checkout -b feat/your-feature-name
   # Make changes and commit
   git push origin feat/your-feature-name
   # Create PR to merge into dev
   ```

2. **Integration**
   - Merge completed `feat/*` or `fix/*` branches into `dev`
   - Test thoroughly on `dev` branch

3. **Release Preparation**
   ```bash
   git checkout dev
   git checkout -b release/vX.Y.Z
   # Final testing, version bump, changelog update
   ```

4. **Production Release**
   ```bash
   # Merge release into main
   git checkout main
   git merge release/vX.Y.Z
   git tag vX.Y.Z
   git push origin main --tags
   ```

5. **Backport**
   ```bash
   # Sync main changes back to dev
   git checkout dev
   git merge main
   git push origin dev
   ```

### Commit Message Convention

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

Example: `feat: add dark mode support`

### Pull Request Guidelines

1. Create PR from `feat/*` or `fix/*` to `dev`
2. Ensure build passes: `yarn build`
3. Update i18n files for all 4 locales if adding UI text
4. Keep PRs focused and reasonably sized

## Development Setup

```bash
# Install dependencies
yarn install

# Build the extension
yarn build

# Load the extension in Chrome
# Go to chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" and select the dist folder
```

## Code Style

- Follow existing component patterns
- Use the custom scrollbar class `.custom-scrollbar` for scrollable areas
- Refer to `src/app/base.scss` for styling conventions

## Questions?

Feel free to open an issue for any questions or suggestions!
