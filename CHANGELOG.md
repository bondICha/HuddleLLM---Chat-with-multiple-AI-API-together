# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.13.9] - 2025-12-05

### Added
- Native `API Web Search` toggle for OpenAI Responses, Claude, and Gemini that wires Web Search to their provider-native tools (`web_search_preview`, `web_search_20250305`, `google_search`).
- New documentation for the unified System Prompt and Web Search design at `docs/system-prompt-and-web-search-design.md`.
- Enhanced Gemini API integration using the official `@google/genai` SDK with streaming, image input support, and explicit thinking output.
- Display of Gemini web search grounding URLs as "Reference Sites" links in the chat UI.

### Changed
- Updated OpenAI Responses, Claude, Gemini, and custom bot implementations to prefer native web tools when API Web Search is enabled, falling back to HuddleLLM's Web Agent only for providers without native tools.
- Replaced the previous browser-based Fetch implementation (which fetched and inlined ~10 result URLs per query) with provider-optimized search tools to improve stability and reduce context size.
- Improved chatbot settings UI with clearer API Web Search options, Vertex AI mode toggles, and provider defaults backed by `config/providers/provider-defaults.ts`.
- Bumped extension manifest version to `2.13.9` and adjusted host permissions to match the current built-in providers.

### Fixed
- Corrected tool precedence and default `webAccess` behavior for OpenAI Responses so that function tools and `web_search_preview` interact predictably.
- Refined Gemini thinking panel text formatting and error handling for nested SDK error payloads.

---

## [v2.13.6] - 2025-12-02

### Added
- Enhanced Company Profile update logic with smart diff detection and preview.
- Support for tracking previous bot names to handle renames/model updates gracefully.
- Detailed JSON diff view for inspecting changes before import.
- Protection for existing API keys during provider updates.

### Changed
- Improved import matching logic to prevent duplicate bot entries.
- Updated UI for import panel with better visibility of changes.

## [v2.13.5] - 2025-11-20

### Changed
- Improved All-in-One mode panel controls with +/- buttons.
- Fixed issue where AI model settings were reset when changing panel count.

## [v2.13.4] - 2025-11-12

### Added
- Seamless Replicate support integrated into the existing Image Agent / image-api client architecture.
- Preset entries for major Replicate image models (e.g. Google Imagen 4 / Fast, Tencent Hunyuan Image 3, ByteDance Seedream 4.0).
- In-app Release Notes entry for v2.13.4 (`releasenote_v2134_replicate_seamless_support`), including visual highlight using `Replicate Support.gif`.

### Changed
- Unified Replicate handling to use the correct prediction-based API pattern:
  - `POST /v1/models/{model}/predictions`
  - `GET /v1/predictions/{id}` polling for completion
- Simplified and cleaned up legacy / experimental Replicate-specific configuration UIs and hooks to avoid inconsistent states.
- Improved expandable/file preview behavior via `ExpandableDialog` integration from `file-preview-fix`.

### Fixed
- Ensured file preview display in expandable areas behaves consistently with the rest of the UI.

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
