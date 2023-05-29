import { parseHTML } from "./html-parser";
import * as fs from "fs/promises";
import * as path from "path";

interface SectionStack {
    deep: number,
    content: string,
    start: number,
    end: number
}

interface SectionInfo {
    name: string,
    isFileTemplate?: boolean,
    content: string
}

function removeComments(content:string) {
    return content.replace(/[\n\r]?[ \t]*<!--\/?#[\s\S]*?(?:-->)[ \t]*[\n\r]?/gm, '');
}

function adjustIndent(content:string) {
    const lines = content.replace(/\r/g, "").split("\n");
    const contentful: string[] = [];
    let stagging: string[] = [];
    let contentStarted = false
    const emptyLine = /^[\s]*$/
    for (let i = 0; i < lines.length; i++) {
        if (emptyLine.test(lines[i])) {
            if (contentStarted) {
                stagging.push(lines[i])
            }
        } else {
            contentful.push(...stagging, lines[i]);
            stagging = []
            contentStarted = true;
        }
    }

    if(contentful.length) {
        const indent = /^([ \t]+)/;
        const match = contentful[0].match(indent);
        if (match) {
            console.log(match[1].length)
            const indentAdjust = new RegExp(`^([ \t]{0,${match[1].length}})`)
            for (let i = 0; i < contentful.length; i++) {
                contentful[i] = contentful[i].replace(indentAdjust, "");
            }
        }
    }
    
    return contentful.join("\n");
}

async function parseFile(filePath: string) {
    try {
        const fileContent = await fs.readFile(filePath, { encoding: "utf-8" });
        let deep = 0;
        const stack: SectionStack[] = [];
        const sections: SectionInfo[] = [];
        if (fileContent) {
            const fileSection: SectionInfo = {
                name: path.basename(filePath),
                content: removeComments(fileContent)
            }
            sections.push(fileSection)
            console.log(fileSection)

            parseHTML(fileContent, {
                shouldKeepComment: true,
                start: (tag: string, attrs: any[], unary: boolean, start: number, end: number) => {
                    if (!unary)
                        deep++
                },
                end: () => {
                    deep--
                },
                comment: (content, start, end) => {
                    if (content) {
                        if (content.startsWith("#file")) {
                            
                        } else if (content.startsWith("#")) {
                            stack.push({
                                deep,
                                content, start, end
                            })
                        } else if (content.startsWith("/#")) {
                            const last = stack.pop()
                            if (last?.deep !== deep) throw new Error("Incorrect close tag.")

                            const sectionContent = adjustIndent(removeComments(fileContent.substring(last.end, start)))

                            console.log(last.content.trim())
                            console.log(sectionContent)
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.log(error);
    }
}

parseFile("./test.vue");