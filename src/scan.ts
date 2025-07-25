/**
 * Reads an array of File objects via FileReader and returns their text.
 */
export async function scanFiles(
  files: File[]
): Promise<Array<{ file: File; content: string }>> {
  const readText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const results: Array<{ file: File; content: string }> = [];
  for (const file of files) {
    const content = await readText(file);
    results.push({ file, content });
  }
  return results;
}