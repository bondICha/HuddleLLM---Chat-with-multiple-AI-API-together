# Gemini Audio File Support & Speech-to-Text Implementation Plan

## Overview
Two-phase implementation to add audio support to HuddleLLM:
- **Phase 1**: Gemini-only audio file input (using inline data method) ✅ COMPLETED
- **Phase 2**: Speech-to-Text (SST) for Cross-Model Compatibility ⚠️ READY TO IMPLEMENT

---

## Phase 1: Gemini Audio File Input Support (Completed)
- **Feature**: Direct audio file transmission to Gemini API.
- **Supported Formats**: WAV, MP3, AIFF, AAC, OGG, FLAC, M4A.
- **Implementation**: 
  - `ChatMessageInput` handles file selection and MIME type validation.
  - `file-processor.ts` allows standard audio formats.
  - `GeminiApiBot` sends audio as inline base64 data.
- **UI**: File pills in input, playable audio player in chat history.

---

## Phase 2: SST for Compatibility (Speech-to-Text)

### Background & Objective
While Gemini models support direct audio file input, other models in HuddleLLM (e.g., Claude, GPT-4o, Local LLMs) do not. To ensure a consistent user experience and allow audio usage across all models, we need an **SST (Speech-to-Text)** feature.

**Goal**: Enable users to use audio files with non-Gemini bots by transcribing the audio to text before sending the message.

### Requirements
- **Target**: Models that do NOT support direct audio input (`!supportsAudioInput`).
- **Engines (Selectable)**:
  1.  **OpenAI Provider**: 
      - Models: `whisper-1`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`.
      - Requires: User's OpenAI API Config (from Provider settings).
  2.  **Gemini Provider**:
      - Models: Select from existing configured Gemini Chatbots.
      - Mechanism: Sends audio with prompt "Transcribe this audio".

### UX Flow
1. **Attachment**: User attaches an audio file to a non-supported bot.
2. **Modal**: A `TranscribeModal` appears.
   - User selects **Transcribe Mode** (OpenAI / Gemini).
   - User selects **Model** (e.g., `whisper-1` or `Gemini 1.5 Pro`).
   - Click **OK**.
3. **Processing**: Modal closes, background transcription starts.
4. **Result**: 
   - A **Text Attachment** is added to the input field.
   - **Preview**: Clicking the attachment opens a modal showing BOTH the **Audio Player** (original file) and the **Transcribed Text**.
5. **Sending**:
   - **To Gemini**: The original audio file is sent (as inline data).
   - **To Others**: The transcribed text is sent (as text content/context).

### Implementation Plan

#### STEP 1: SST Service Implementation
**File**: `src/services/sst-service.ts` (New)
- `transcribeWithOpenAI(file, apiKey, model)`: Calls `/v1/audio/transcriptions`.
- `transcribeWithGemini(file, botInstance)`: Calls bot's `sendMessage`.

#### STEP 2: UI Components
- **`src/app/components/Chat/SST/TranscribeModal.tsx`**: 
  - Provider selector (Radio/Tabs).
  - Model selector (Dropdown).
- **`src/app/components/Chat/AttachmentPreview.tsx`**:
  - Enhanced preview for transcribed audio (Audio player + Text area).

#### STEP 3: Integration
**File**: `src/app/components/Chat/ChatMessageInput.tsx`
- Detect `!supportAudioInput`.
- Open `TranscribeModal`.
- Handle transcription result -> Create specialized attachment object.
- Update `onSubmit` to handle the dual nature (Audio vs Text) based on target bot.

