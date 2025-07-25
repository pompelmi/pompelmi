export async function scanFiles(files) {
  const readAsText = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const results = [];
  for (const file of files) {
    const content = await readAsText(file);
    results.push({ file, content });
  }
  return results;
}
