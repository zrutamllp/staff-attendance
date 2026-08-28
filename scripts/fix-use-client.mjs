import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

for (const file of walk(path.join(root, "src"))) {
  let content = readFileSync(file, "utf8");
  if (!content.includes('"use client"')) continue;

  content = content.replace(/^\s*"use client";\s*\n?/m, "");
  content = `"use client";\n\n${content.trimStart()}`;
  writeFileSync(file, content, "utf8");
  console.log("fixed", path.relative(root, file));
}

console.log("done");
