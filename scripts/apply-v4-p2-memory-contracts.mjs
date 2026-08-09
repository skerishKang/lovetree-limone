import { readFile, writeFile } from "node:fs/promises";

const path = "server/api/trees.ts";
let source = await readFile(path, "utf8");

function replaceOnce(from, to, label) {
  if (source.includes(to)) return;
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  source = source.replace(from, to);
}

replaceOnce(
`  SOURCE_TYPE_VALUES,\n  validateTimestamp,\n  type VisibilityValue,\n  type SourceTypeValue,\n} from "./validate";`,
`  SOURCE_TYPE_VALUES,\n  type VisibilityValue,\n  type SourceTypeValue,\n} from "./validate";\nimport {\n  CONNECTION_REASON_MAX_LENGTH,\n  VIDEO_OFFSET_SECONDS_MAX,\n  normalizeMemoryCreateInput,\n  serializeMemoryContract,\n  validateMemoryDateCompatibility,\n} from "./memory-contract";`,
"imports"
);

replaceOnce(
`  timestamp: { kind: "string", trim: true, maxLength: 100 },\n  visibility: { kind: "string", trim: true, allowed: VISIBILITY_VALUES },`,
`  timestamp: { kind: "string", trim: true, maxLength: 10 },\n  discoveryDate: { kind: "string", trim: true, maxLength: 10 },\n  videoOffsetSeconds: { kind: "integer", min: 0, max: VIDEO_OFFSET_SECONDS_MAX },\n  connectionReason: { kind: "string", trim: true, maxLength: CONNECTION_REASON_MAX_LENGTH },\n  visibility: { kind: "string", trim: true, allowed: VISIBILITY_VALUES },`,
"memory rules"
);

replaceOnce(
`  const tsError = validateTimestamp(memory.timestamp, "memory.timestamp");\n  if (tsError) return validationError(tsError);`,
`  const dateError = validateMemoryDateCompatibility(memory, "memory.");\n  if (dateError) return validationError(dateError);\n  const normalizedMemory = normalizeMemoryCreateInput(memory);`,
"first memory date validation"
);

replaceOnce(
`    parentId: (memory.parentId as string | undefined) ?? null,\n    title: memTitle,`,
`    parentId: (normalizedMemory.parentId as string | undefined) ?? null,\n    connectionReason: (normalizedMemory.connectionReason as string | null | undefined) ?? null,\n    title: memTitle,`,
"connection reason row"
);

replaceOnce(
`    artist: (memory.artist as string | undefined) ?? "",\n    source: (memory.source as string | undefined) ?? "",\n    sourceUrl: (memory.sourceUrl as string | undefined) ?? "",\n    sourceType: ((memory.sourceType as string | undefined) ?? "youtube") as SourceTypeValue,\n    thumbnail: (memory.thumbnail as string | undefined) ?? "",\n    emotionTags: (memory.emotionTags as string[] | undefined) ?? [],\n    timestamp: (memory.timestamp as string | undefined) ?? "",\n    sortOrder: 0,\n    visibility: resolveMemoryVisibility(\n      memory.visibility as string | undefined,`,
`    artist: (normalizedMemory.artist as string | undefined) ?? "",\n    source: (normalizedMemory.source as string | undefined) ?? "",\n    sourceUrl: (normalizedMemory.sourceUrl as string | undefined) ?? "",\n    sourceType: ((normalizedMemory.sourceType as string | undefined) ?? "youtube") as SourceTypeValue,\n    thumbnail: (normalizedMemory.thumbnail as string | undefined) ?? "",\n    emotionTags: (normalizedMemory.emotionTags as string[] | undefined) ?? [],\n    timestamp: (normalizedMemory.timestamp as string | undefined) ?? "",\n    discoveryDate: (normalizedMemory.discoveryDate as string | null | undefined) ?? null,\n    videoOffsetSeconds: (normalizedMemory.videoOffsetSeconds as number | null | undefined) ?? null,\n    sortOrder: 0,\n    visibility: resolveMemoryVisibility(\n      normalizedMemory.visibility as string | undefined,`,
"P2 first memory row"
);

replaceOnce(
`    channelId: (memory.channelId as string | undefined) ?? null,\n    channelName: (memory.channelName as string | undefined) ?? null,\n    channelUrl: (memory.channelUrl as string | undefined) ?? null,`,
`    channelId: (normalizedMemory.channelId as string | undefined) ?? null,\n    channelName: (normalizedMemory.channelName as string | undefined) ?? null,\n    channelUrl: (normalizedMemory.channelUrl as string | undefined) ?? null,`,
"channel fields"
);

replaceOnce(
`  return json({ tree, memory: memoryRow }, 201);`,
`  return json({ tree, memory: serializeMemoryContract(memoryRow) }, 201);`,
"first memory response"
);

await writeFile(path, source);
console.log("Applied guarded V4 P2 memory-contract patch to server/api/trees.ts");
