// Node loader that resolves the "@/" path alias (mapped to "./src/*" in
// tsconfig.json) when running .mts verification scripts directly with Node's
// strip-types. Also resolves extensionless relative imports ("./x" →
// "./x.ts") and directory imports to index.ts.
// Next.js resolves "@/" via tsconfig paths; this loader mirrors that for Node.

import { pathToFileURL } from "node:url";
import { resolve as pathResolve } from "node:path";
import { existsSync } from "node:fs";

const root = pathResolve(import.meta.dirname, "..");
const srcDir = pathResolve(root, "src");

export async function resolve(specifier, context, nextResolve) {
  // The "server-only" guard throws outside Next.js's bundler. When running
  // these verification scripts directly under Node, stub it with a no-op
  // module so the provider/agent modules load for testing.
  if (specifier === "server-only") {
    return nextResolve(
      pathToFileURL(pathResolve(import.meta.dirname, "server-only-stub.mjs")).href,
      context
    );
  }
  if (specifier.startsWith("@/")) {
    let target = pathResolve(srcDir, specifier.slice(2));
    // Directory alias → index.ts (e.g. "@/lib/ai" → src/lib/ai/index.ts).
    if (existsSync(target)) {
      const indexPath = pathResolve(target, "index.ts");
      if (existsSync(indexPath)) target = indexPath;
    } else if (!target.endsWith(".ts")) {
      const withExt = `${target}.ts`;
      if (existsSync(withExt)) target = withExt;
    }
    return nextResolve(pathToFileURL(target).href, context);
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.[a-z]+$/i.test(specifier)
  ) {
    const resolved = await nextResolve(specifier, context);
    const withExt = `${resolved.url}.ts`;
    return nextResolve(withExt, context);
  }
  return nextResolve(specifier, context);
}
