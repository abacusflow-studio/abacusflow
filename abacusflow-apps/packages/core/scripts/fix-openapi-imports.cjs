/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

function fixFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixFiles(fullPath);
    } else if (entry.name.endsWith(".ts")) {
      let content = fs.readFileSync(fullPath, "utf8");
      // Metro and Next consume these generated files as TypeScript source.
      // Keep relative imports extensionless so both bundlers resolve .ts files.
      content = content.replace(/from '(\.\.?\/[^']+)\.js'/g, "from '$1'");
      fs.writeFileSync(fullPath, content);
    }
  }
}

fixFiles(path.join(__dirname, "../src/openapi"));
console.log("Removed .js extensions from generated OpenAPI imports");
