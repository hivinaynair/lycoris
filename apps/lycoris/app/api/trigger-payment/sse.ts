const enc = new TextEncoder();

export function sseLine(obj: unknown) {
  return enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
}
