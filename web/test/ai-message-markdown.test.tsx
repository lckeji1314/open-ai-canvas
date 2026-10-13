import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AIMessageMarkdown } from "../src/components/ai/ai-message-markdown";

describe("AI message HTML source", () => {
    test("keeps a bare HTML document in one copyable code block", () => {
        const source = `<!DOCTYPE html>
<html>
<head><title>Pelican on a Bicycle</title><style>body { margin: 0; }</style></head>
<body>
<svg>
  <g>
    <path d="M490 259q67 27 172 20" />

    <path d="M412 264q37-24 72-3" />
  </g>
</svg>
<script>const sample = "Pelican";</script>
</body>
</html>`;
        const markup = renderToStaticMarkup(<AIMessageMarkdown>{source}</AIMessageMarkdown>);
        const escapedSource = renderToStaticMarkup(<code>{source}</code>).slice("<code>".length, -"</code>".length);

        expect(markup).toContain(escapedSource);
        expect(markup).toContain("&lt;!DOCTYPE html&gt;");
        expect(markup).toContain("&lt;/html&gt;");
        expect(markup).toContain("&lt;style&gt;body { margin: 0; }&lt;/style&gt;");
        expect(markup.match(/class="ai-message-codeblock"/g)).toHaveLength(1);
        expect(markup).toContain('aria-label="复制代码"');
        expect(markup).not.toContain("<svg>");
        expect(markup).not.toContain("<script>");
    });

    test("shows an HTML document without a doctype as source", () => {
        const source = '<html lang="zh-CN"><head><title>鹈鹕</title></head><body>骑车</body></html>';
        const markup = renderToStaticMarkup(<AIMessageMarkdown>{source}</AIMessageMarkdown>);
        const escapedSource = renderToStaticMarkup(<code>{source}</code>).slice("<code>".length, -"</code>".length);

        expect(markup).toContain(escapedSource);
        expect(markup).toContain("language-html");
        expect(markup.match(/class="ai-message-codeblock"/g)).toHaveLength(1);
    });

    test("shows unfinished HTML while streaming", () => {
        const source = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<style>body {';
        const markup = renderToStaticMarkup(<AIMessageMarkdown isStreaming className="test-message">{source}</AIMessageMarkdown>);
        const escapedSource = renderToStaticMarkup(<code>{source}</code>).slice("<code>".length, -"</code>".length);

        expect(markup).toContain(escapedSource);
        expect(markup).toContain("ai-message-markdown-streaming test-message");
        expect(markup.match(/class="ai-message-codeblock"/g)).toHaveLength(1);
    });

    test.each([
        ' \n\t<!doctype HTML>\n<HTML lang="en"><body>Example</body></HTML>',
        '\n<HTML lang="zh-CN"><body>示例</body></HTML>',
        "<html",
        "<!DOCTYPE html",
    ])("preserves whitespace, case and partial document openings: %s", (source) => {
        const markup = renderToStaticMarkup(<AIMessageMarkdown isStreaming>{source}</AIMessageMarkdown>);
        const escapedSource = renderToStaticMarkup(<code>{source}</code>).slice("<code>".length, -"</code>".length);

        expect(markup).toContain(escapedSource);
        expect(markup).toContain("language-html");
        expect(markup.match(/class="ai-message-codeblock"/g)).toHaveLength(1);
    });

    test("keeps normal Markdown and explicitly fenced HTML rendering", () => {
        const source = '# 标题\n\n说明 **加粗** 与 `行内代码`。\n\n[链接](https://example.com/docs)\n\n```html\n<html><body>示例</body></html>\n```';
        const markup = renderToStaticMarkup(<AIMessageMarkdown>{source}</AIMessageMarkdown>);

        expect(markup).toContain("ai-message-markdown-heading-1");
        expect(markup).toContain('data-streamdown="strong">加粗</span>');
        expect(markup).toContain('href="https://example.com/docs"');
        expect(markup).toContain("行内代码");
        expect(markup).toContain("language-html");
        expect(markup.match(/class="ai-message-codeblock"/g)).toHaveLength(1);
    });

    test.each(["<htmlish>example</htmlish>", "<!doctype htmlish>", "The <html> tag starts a document."])(
        "does not classify ordinary Markdown as a document: %s", (source) => {
            const markup = renderToStaticMarkup(<AIMessageMarkdown>{source}</AIMessageMarkdown>);
            expect(markup).not.toContain('class="ai-message-codeblock"');
        },
    );
});
