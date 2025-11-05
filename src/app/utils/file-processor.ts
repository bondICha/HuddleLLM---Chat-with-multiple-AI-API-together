import { isProbablyBinary, decodeWithHeuristics } from '~utils/content-extractor';

export type ProcessedFileResult =
  | { type: 'text'; content: string; file: File }
  | { type: 'image'; file: File }
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