import { V4_IMPLEMENTED_SOURCE_IDS, v4SourceStatus } from "./v4-implemented-sources";
import { V4_SOURCE_MANIFEST } from "./v4-source-manifest";

export const V4_SOURCE_REGISTRY = V4_SOURCE_MANIFEST.map((source) => ({
  ...source,
  status: v4SourceStatus(source.id),
}));

export const V4_SOURCE_COUNT = V4_SOURCE_REGISTRY.length;
export const V4_IMPLEMENTED_SOURCE_COUNT = V4_SOURCE_REGISTRY.filter(
  (source) => source.status === "implemented",
).length;

export const V4_UNIMPLEMENTED_SOURCES = V4_SOURCE_REGISTRY.filter(
  (source) => source.status !== "implemented",
);

if (V4_SOURCE_COUNT !== 25) {
  throw new Error(`V4 source registry must contain exactly 25 sources, received ${V4_SOURCE_COUNT}.`);
}

if (V4_IMPLEMENTED_SOURCE_IDS.size !== V4_SOURCE_COUNT) {
  throw new Error(
    `V4 implemented source set must match the registry before final validation: ${V4_IMPLEMENTED_SOURCE_IDS.size}/${V4_SOURCE_COUNT}.`,
  );
}
