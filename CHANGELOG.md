# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.13] - 2025-10-29

### Added
- **Image Agent**: Agentic image generation system combining LLM reasoning with image APIs
  - Support for Chutes AI, Novita AI, and Replicate providers
  - Multiple model support (Chroma, FLUX, Qwen Image, Hunyuan, Seedream, Imagen 4)
- **Provider Management**: Centralized API provider configuration UI
- **Image API Client**: Unified client supporting sync, async polling, and prediction-based APIs
- **User Config Modularization**: Split config types into modular structure
- **Build Scripts**: `yarn package` command for extension packaging

### Changed
- **Settings UI**: Separated Image Agent settings from Image Function Tool settings
- **Provider Configuration**: Auto-fill host URLs when switching API schemes
- **Storage**: Migrated chat pairs to local storage

### Removed
- Unused `image-tools.ts` file (234 lines)
- Redundant fallback logic and unnecessary defaults

### Fixed
- Replicate endpoint configuration
- Tool Definition preview with %model placeholder
- Host auto-fill when switching providers
- Model default value handling

**Full Release Notes**: [docs/releases/v2.13.md](./docs/releases/v2.13.md)

---

## [v2.12-provider-support] - (Previous Release)

_Base version for v2.13 development._

---

## Version Links

- [v2.13](./docs/releases/v2.13.md) - Latest (Image Agent Release)
- v2.12-provider-support - Previous
