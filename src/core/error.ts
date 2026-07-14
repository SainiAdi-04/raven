export function formatYtDlpError(stderr: string, context: "search" | "resolve"): Error {
  const message = stderr.trim();
  const lower = message.toLowerCase();

  if (
    context === "resolve" &&
    (lower.includes("private") || lower.includes("unavailable"))
  ) {
    return new Error("this video is private or unavailable");
  }

  if (lower.includes("sign in to confirm") || lower.includes("age")) {
    return new Error("this video requires sign-in (age-restricted or similar) — can't be played");
  }

  return new Error(`yt-dlp ${context} failed${message ? `: ${message}` : ""}`);
}