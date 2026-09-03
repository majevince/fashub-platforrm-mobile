import { API_BASE_URL } from './config';
import { getCurrentToken } from './session';

/**
 * A Blob-compatible file part — real browser `File` (web) or
 * `expo-file-system`'s `File` (native) both satisfy this shape. Constructing
 * the actual object is platform-specific (an <input> on web, expo-file-system
 * wrapping a local content:// / file:// uri on native), so that step happens
 * in the calling app, not here — this package stays platform-agnostic and
 * only knows how to send an already-valid Blob-like part.
 *
 * IMPORTANT: do not pass the legacy React Native `{ uri, name, type }`
 * convention object here. Expo SDK 50+ installs its own native `fetch` by
 * default (see expo/src/winter/fetch/convertFormData.ts), which does not
 * understand that shape — it throws "Unsupported FormDataPart implementation"
 * for anything that isn't a string, a real Blob, or a Blob/File-like object
 * exposing `.bytes()`. That was the exact root cause of the mobile story/post
 * upload failure this fixed.
 */
export type UploadableFile = Blob & { name?: string; type: string };

/**
 * Matches POST /api/upload exactly: multipart FormData, a `files` field
 * (repeatable) and a `type` field naming the allowlisted sub-directory.
 * `trim` is only honored server-side when type === 'stories' (real ffmpeg
 * cut, not a client-side re-encode — see app/api/upload/route.ts's
 * isStoryUpload/hasTrim gate).
 */
export async function uploadFiles(
  files: UploadableFile[],
  type: string,
  trim?: { start: number; end: number }
): Promise<{ urls: string[]; thumbnails: string[] }> {
  const form = new FormData();
  form.append('type', type);
  for (const file of files) {
    form.append('files', file);
  }
  if (trim) {
    form.append('trimStart', String(trim.start));
    form.append('trimEnd', String(trim.end));
  }

  const token = await getCurrentToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  } catch (err) {
    throw new Error(err instanceof Error ? `Upload failed: ${err.message}` : 'Upload failed: network error');
  }

  const rawText = await response.text();
  let data: { error?: string; urls: string[]; thumbnails: string[] };
  try {
    data = JSON.parse(rawText);
  } catch {
    // A non-JSON body here (an HTML error page from a proxy, a raw stack
    // trace) is exactly the kind of thing that must never reach the user
    // as-is — surface a plain, generic message instead.
    throw new Error(`Upload failed (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `Upload failed (${response.status})`);
  }
  return data;
}
