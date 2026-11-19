/**
 * Whether a file matches an `accept` list, such as `image/*, .pdf`. An empty
 * list accepts every file.
 */
export function isAccepted(file: File, accept: string) {
  const types = accept
    .split(",")
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);
  if (!types.length) return true;

  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return types.some((type) => {
    if (type.startsWith(".")) return name.endsWith(type);
    if (type.endsWith("/*")) return mime.startsWith(type.slice(0, -1));
    return mime === type;
  });
}
