import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSanitize)
  // rehypeHighlight must stay after rehypeSanitize; plugins after this point bypass sanitization
  .use(rehypeHighlight)
  .use(rehypeStringify)
  .freeze();

const renderHandoutHtml = (markdown: string): string => {
  const result = processor.processSync(markdown);
  return String(result);
};

export { renderHandoutHtml };
