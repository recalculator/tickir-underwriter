const MAX_STRING_LENGTH = 1000;

export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, MAX_STRING_LENGTH);
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\.[/\\]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}
