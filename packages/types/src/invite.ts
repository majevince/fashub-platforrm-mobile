/** Matches POST /api/invite's response exactly — partial success is
 * expected (some emails may be invalid or fail to send), so this is
 * always a 200 with per-email outcomes, never an all-or-nothing result. */
export interface InviteResult {
  sent: string[];
  failed: { email: string; reason: string }[];
}
