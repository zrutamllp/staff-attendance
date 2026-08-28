import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (entry === "route.ts") acc.push(full);
  }
  return acc;
}

const routeFiles = walk(path.join(root, "src/app/api"));

for (const file of routeFiles) {
  if (file.includes("[...nextauth]")) continue;

  let content = readFileSync(file, "utf8");
  let changed = false;

  if (content.includes("(request,") || content.includes("(request)") && content.includes("implicitly")) {
    // noop
  }

  if (!content.includes("NextRequest")) {
    if (content.includes('from "next/server"')) {
      content = content.replace(
        /import \{([^}]+)\} from "next\/server";/,
        (match, imports) => {
          if (imports.includes("NextRequest")) return match;
          return `import { NextRequest,${imports}} from "next/server";`;
        }
      );
      changed = true;
    } else {
      content = `import { NextRequest } from "next/server";\n${content}`;
      changed = true;
    }
  }

  content = content.replace(
    /export async function (GET|POST|PATCH|PUT|DELETE)\(request\)/g,
    "export async function $1(request: NextRequest)"
  );
  content = content.replace(
    /export async function (GET|POST|PATCH|PUT|DELETE)\(request, \{ params \}\)/g,
    "export async function $1(request: NextRequest, { params }: { params: Promise<{ id: string }> })"
  );

  if (content.includes("getErrorMessage") === false && content.match(/err\.message|error\.message/)) {
    if (!content.includes("@/lib/errors")) {
      content = content.replace(
        /^(import .+\n)/,
        "$1import { getErrorMessage } from \"@/lib/errors\";\n"
      );
    }
    content = content.replace(/err\.message/g, "getErrorMessage(err)");
    content = content.replace(
      /error instanceof Error \? error\.message : "([^"]+)"/g,
      'getErrorMessage(error, "$1")'
    );
    changed = true;
  }

  if (changed || content !== readFileSync(file, "utf8")) {
    writeFileSync(file, content, "utf8");
    console.log("patched", path.relative(root, file));
  }
}

console.log("done");
