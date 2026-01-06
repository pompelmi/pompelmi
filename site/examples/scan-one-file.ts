import { scanFile } from "pompelmi";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: tsx examples/scan-one-file.ts <path-to-file>");
    process.exit(1);
  }
  const result = await scanFile(filePath);
  console.log("verdict:", result?.verdict);
  console.log(JSON.stringify(result, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
