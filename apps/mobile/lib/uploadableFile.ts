import { File as ExpoFile } from 'expo-file-system';
import type { UploadableFile } from '@fashub/api-client';

/**
 * Wraps a local picked-asset uri (from expo-image-picker) in a real,
 * Blob-compatible File object that Expo's native fetch's FormData converter
 * actually understands. Do not append { uri, name, type } plain objects to
 * FormData directly — see the comment in packages/api-client/src/upload.ts
 * for why that throws "Unsupported FormDataPart implementation".
 */
export function toUploadableFile(uri: string): UploadableFile {
  return new ExpoFile(uri) as unknown as UploadableFile;
}
