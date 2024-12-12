import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import remarkCallout from "remark-callout";
import remarkBreaks from "remark-breaks";
import fm from "front-matter";
import addClasses from "rehype-class-names";

export async function parseMarkdown(markdown) {
  const content = fm(markdown);

  // Convert the markdown to HTML document
  const out = await unified()
    .use(remarkParse)
    .use(remarkBreaks)
    .use(remarkCallout)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .use(addClasses, {
      a: "url inlineurl",
    })
    .process(content.body);

  const outHTML = out.toString();
  return { metadata: content.attributes, html: outHTML };
}
