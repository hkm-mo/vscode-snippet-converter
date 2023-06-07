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
    contentRange: Range,
    endTagRange: Range,
    content?: string
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
                                } as SnippetTag);
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

                            tag.content = buildSnippet(fileContent.substring(tag.contentRange.start, tag.contentRange.end), tag, snippetTags, tag.contentRange.start);
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

function getChildrenTags(snippetTags: SnippetTag[], currTag: SnippetTag) {
    const children: SnippetTag[] = [];
    const deep = currTag.deep + 1;
    for (let i = 0; i < snippetTags.length; i++) {
        const t = snippetTags[i];
        if (deep === t.deep &&
            t.contentRange.start >= currTag.contentRange.start &&
            t.contentRange.end <= currTag.contentRange.end) {
            children.push(t);
        }
    }

    children.sort((a, b)=> a.startTagRange.start > b.startTagRange.start ? 1 : -1);

    return children;
}

function buildSnippet(snippet: string, snippetTag: SnippetTag, snippetTags: SnippetTag[], start: number) {
    const children = getChildrenTags(snippetTags, snippetTag);
    let _snippet = snippet;
    let offset = start;
    console.log(snippetTag, children.length);

    if (children.length) {
        //if (children.length === 4) console.log(children);
        for (let i = 0; i < children.length; i++) {
            const ist = children[i];
            const starting = _snippet.substring(0, ist.startTagRange.start - offset);
            const ending =  _snippet.substring(ist.endTagRange.end - offset);
            let newSnippet: string = "";

            if (ist.attrs.alone) {
                newSnippet = starting + ending;
            } else {
                newSnippet = starting + ist.content + ending;
            }
            offset += _snippet.length - newSnippet.length
            _snippet = newSnippet;
        }
    }

    console.log(_snippet);
    return _snippet;
}

parseFile("./tests/test.vue");