import { readFile, writeFile } from "node:fs/promises";

const paths = ["server/api/memories.ts", "server/api/trees.ts"];
const from = 'parentId: { kind: "string", trim: true, maxLength: 100 },';
const to = 'parentId: { kind: "string", nullable: true, trim: true, maxLength: 100 },';

for (const path of paths) {
  let source = await readFile(path, "utf8");
  if (source.includes(to)) continue;
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${path}: expected exactly one parentId rule, found ${count}`);
  source = source.replace(from, to);
  await writeFile(path, source);
}

console.log("Applied guarded nullable parentId rules to Memory write contracts");
