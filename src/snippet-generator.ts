import { parseFile } from "./sfc-template-parser";
import path from "path";
import fs from "fs";
import { adjustIndent } from "./code-helper";

async function fromFile(filePath: string, snippetPath: string) {
    const filename = path.basename(filePath);
    const snippets = await parseFile(filePath);
    const snippetFileData: {[key: string]: any } = {};
    if (snippets) {
        for (const snippet of snippets) {
            if (snippet.content) {
                snippetFileData[`${filename} - ${snippet.name}`] = {
                    prefix: snippet.attrs.prefix,
                    body: adjustIndent(snippet.content).split("\n"),
                    description: snippet.attrs.description,
                    scope: snippet.attrs.scope || "vue,html"
                };
            }
        }
    }

    await fs.promises.writeFile(snippetPath, JSON.stringify(snippetFileData, null, "  "), "utf-8")
}
async function main() {
    fromFile("./tests/test.vue", "./.vscode/snippet.code-snippets");
}

main()