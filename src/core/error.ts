export function formatYtDlpError(
  stderr: string,
  context: "search" | "resolve",
) {
  const message = stderr.trim();
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("no such file or directory") ||
    lowerMessage.includes("not found") ||
    lowerMessage.includes("command not found")
  ) {
    return new Error("yt-dlp not installed");
  }

  if (
    context === "resolve" &&
    (lowerMessage.includes("private") ||
      lowerMessage.includes("unavailable") ||
      lowerMessage.includes("video unavailable") ||
      lowerMessage.includes("this video is unavailable"))
  ) {
    return new Error("this video is private/unavailable");
  }

  return new Error(
    `yt-dlp ${context} failed${message ? `: ${message}` : ""}`,
  );
}
