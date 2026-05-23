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
      // Add .js extension to relative imports
      content = content.replace(/from '(\.\.?\/[^']+)'/g, "from '$1.js'");
      fs.writeFileSync(fullPath, content);
    }
  }
}

fixFiles(path.join(__dirname, "../src/openapi"));
console.log("Fixed .js extensions in generated OpenAPI imports");
