/** Превръща качен файл (base64) в блок за chat-completions съобщение. */
export type AiFile = { name?: string; mime?: string; data?: string };

export function fileContentBlock(file: AiFile) {
  if (!file?.data) return null;
  const mime = file.mime || "application/pdf";
  if (mime.startsWith("image/")) {
    return { type: "image_url", image_url: { url: `data:${mime};base64,${file.data}` } };
  }
  return { type: "file", file: { filename: file.name || "source", file_data: `data:${mime};base64,${file.data}` } };
}

export function userContent(text: string, file?: AiFile) {
  const block = file ? fileContentBlock(file) : null;
  if (!block) return text;
  return [{ type: "text", text }, block];
}
