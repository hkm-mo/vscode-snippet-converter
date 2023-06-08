
export function adjustIndent(content: string) {
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