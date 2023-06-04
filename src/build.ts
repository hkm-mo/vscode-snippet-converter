import { parseHTML, decodeAttr } from "./html-parser";
import * as fs from "fs/promises";
import * as path from "path";

interface CodeSnippetAttrs {
    prefix?: string[],
    description?: string,
    placeholders?: { [key: string]: string },
    alone?: boolean,
    skip?: boolean
}

interface Range {
    start: number,
    end: number
}

interface SnippetTag {
    name: string,
    attrs: CodeSnippetAttrs,
    deep: number,
    startTagRange: Range,
    contentRange?: Range,
    endTagRange?: Range
}

interface SectionInfo {
    name: string,
    isFileTemplate?: boolean,
    content: string
}

const snippetNameAndAttr = /^#([\w\-]+)((\s|.)*)/
const attribute =
    /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?((\s|.)*)/
const multipleValuesAttr = ["prefix"]

function removeComments(content: string) {
    return content.replace(/[\n\r]?[ \t]*<!--\/?#[\s\S]*?(?:-->)[ \t]*[\n\r]?/gm, '');
}

function adjustIndent(content: string) {
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

    if (contentful.length) {
        const indent = /^([ \t]+)/;
        const match = contentful[0].match(indent);
        if (match) {
            const indentAdjust = new RegExp(`^([ \t]{0,${match[1].length}})`)
            for (let i = 0; i < contentful.length; i++) {
                contentful[i] = contentful[i].replace(indentAdjust, "");
            }
        }
    }
    return contentful.join("\n");
}

function parseAttrs(html: string, accumulate: CodeSnippetAttrs = {}) {
    const match = html.trim().match(attribute);
    if (match) {
        const attrName = match[1] as keyof CodeSnippetAttrs;
        const attrVal = match[3];
        if (multipleValuesAttr.includes(attrName)) {
            accumulate[attrName] = typeof attrVal !== "undefined" ? attrVal.split(",") : [] as any;
        } if (attrName.startsWith("placeholder-")) {
            if (!accumulate.placeholders)
                accumulate.placeholders = {}

            accumulate.placeholders[attrName.substring(12)] = decodeAttr(attrVal);
        } else {
            accumulate[attrName] = typeof attrVal !== "undefined" ? decodeAttr(attrVal) : true as any;
        }

        if (match[6]) {
            parseAttrs(match[6], accumulate);
        }
    }

    return accumulate;
}

async function parseFile(filePath: string) {
    try {
        const fileContent = await fs.readFile(filePath, { encoding: "utf-8" });
        let deep = 0;
        const snippetTagStack: SnippetTag[] = [];
        const snippetTags: SnippetTag[] = [];
        if (fileContent) {
            parseHTML(fileContent, {
                shouldKeepComment: true,
                comment: (content, start, end) => {
                    if (content) {
                        if (content.startsWith("#")) {
                            deep++;
                            const match = content.match(snippetNameAndAttr);
                            if (match) {
                                snippetTagStack.push({
                                    name: match[1],
                                    deep,
                                    attrs: parseAttrs(match[2]),
                                    startTagRange: {
                                        start,
                                        end
                                    }
                                });
                            }
                        } else if (content.startsWith("/#")) {
                            const tag = snippetTagStack.pop();

                            if (tag?.deep !== deep) throw new Error("Incorrect close tag.");

                            tag.contentRange = {
                                start: tag.startTagRange.end,
                                end: start
                            };

                            tag.endTagRange = {
                                start,
                                end
                            };

                            const children = getChildrenTags(snippetTags, tag);

                            buildSnippets(fileContent, tag, children);
                            snippetTags.push(tag);

                            deep--;
                            // console.log(tag)
                            // const sectionContent = adjustIndent(removeComments(fileContent.substring(tag.contentRange.start, tag.contentRange.end)))

                            // console.log(tag.content.trim())
                            // console.log(sectionContent)
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.log(error);
    }
}

function getChildrenTags(branch: SnippetTag[], currTag: SnippetTag) {
    const children: SnippetTag[] = [];
    for (let i = 0; i < branch.length; i++) {
        const t = branch[i];
        if ((currTag.contentRange && t.contentRange) &&
            t.contentRange.start >= currTag.contentRange.start &&
            t.contentRange.end <= currTag.contentRange.end) {
            children.push(t);
        }
    }

    return children;
}

function buildSnippets(fileContent: string, snippetTag: SnippetTag, innerSnippetTags: SnippetTag[]) {
    console.log(snippetTag, innerSnippetTags.length);
    if (snippetTag.contentRange) {
        const snippet = fileContent.substring(snippetTag.contentRange.start, snippetTag.contentRange.end);
        let offset = 0 - snippetTag.contentRange.start;

        if (innerSnippetTags.length) {
            for (let i = 0; i < innerSnippetTags.length; i++) {
                const ist = innerSnippetTags[i];
                if (ist.attrs.alone) {
                    //offset -= ist.startTagRange
                }
            }
        }
    }
    snippetTag.contentRange?.start
}

parseFile("./tests/test.vue");