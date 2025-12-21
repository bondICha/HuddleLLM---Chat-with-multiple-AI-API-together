import { isProbablyBinary, decodeWithHeuristics } from '~utils/content-extractor';

export type ProcessedFileResult =
  | { type: 'text'; content: string; file: File }
  | { type: 'image'; file: File }
  | { type: 'audio'; file: File }
  | { type: 'unsupported'; file: File; error: string };

async function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}


export async function processFile(file: File): Promise<ProcessedFileResult> {
  if (file.type.startsWith('image/')) {
    return { type: 'image', file };
  }

  if (file.type.startsWith('audio/')) {
    const supportedFormats = [
      // Based on Gemini Support
      'audio/wav', 'audio/mp3', 'audio/mpeg',
      'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
      'audio/m4a', 'audio/x-m4a'
    ];
    

    if (!supportedFormats.some(fmt => file.type === fmt || file.type.startsWith(fmt))) {
      return {
        type: 'unsupported',
        file,
        error: `Unsupported audio format "${file.type}". Supported: WAV, MP3, AIFF, AAC, OGG, FLAC, M4A`,
      };
    }

    return { type: 'audio', file };
  }

  try {
    const buffer = await readAsArrayBuffer(file);

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return {
        type: 'unsupported',
        file,
        error: `PDF file "${file.name}" is not supported.`,
      };
    }

    if (isProbablyBinary(new Uint8Array(buffer))) {
      return {
        type: 'unsupported',
        file,
        error: `File "${file.name}" appears to be a binary file and is not supported.`,
      };
    }

    const { text } = decodeWithHeuristics(new Uint8Array(buffer), file.type);
    const content = `Text Document: ${file.name}\n\n${text}`;
    return { type: 'text', content, file };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    alert(`DEBUG: Failed to process file ${file.name}: ${message}`);
    return {
      type: 'unsupported',
      file,
      error: `Could not process file "${file.name}": ${message}`,
    };
  }
}