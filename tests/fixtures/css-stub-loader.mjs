// Test-only loader: stub CSS module imports so React components can be
// server-rendered under plain node --test (see source-track-47 tests).
export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".css") || specifier.endsWith(".module.css")) {
    return { url: "data:text/javascript,export default {}", shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
