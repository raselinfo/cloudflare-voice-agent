/**
 * Encode audio data as WAV PCM16 format
 * @param samples Float32Array of audio samples (-1.0 to 1.0)
 * @param sampleRate Sample rate in Hz (e.g., 16000)
 * @returns ArrayBuffer containing WAV file
 */
export function encodeWavPCM16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const bufferSize = 44 + dataSize; // 44-byte WAV header + data

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Write WAV header
  let offset = 0;

  // "RIFF" chunk descriptor
  writeString(view, offset, 'RIFF');
  offset += 4;
  view.setUint32(offset, bufferSize - 8, true); // File size - 8
  offset += 4;
  writeString(view, offset, 'WAVE');
  offset += 4;

  // "fmt " sub-chunk
  writeString(view, offset, 'fmt ');
  offset += 4;
  view.setUint32(offset, 16, true); // Subchunk1Size (16 for PCM)
  offset += 4;
  view.setUint16(offset, 1, true); // AudioFormat (1 = PCM)
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, byteRate, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitsPerSample, true);
  offset += 2;

  // "data" sub-chunk
  writeString(view, offset, 'data');
  offset += 4;
  view.setUint32(offset, dataSize, true);
  offset += 4;

  // Write PCM samples
  for (let i = 0; i < samples.length; i++) {
    // Convert float (-1.0 to 1.0) to 16-bit PCM
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const pcmSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, pcmSample, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Write a string to a DataView at the specified offset
 */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
