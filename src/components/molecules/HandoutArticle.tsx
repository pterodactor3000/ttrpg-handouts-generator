import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HandoutArticleProps {
  title: string;
  html: string;
  className?: string;
  emptyPlaceholder?: ReactNode;
}

const HandoutArticle = ({ title, html, className, emptyPlaceholder }: HandoutArticleProps) => {
  return (
    <article className={cn('handout-article mx-auto w-full max-w-2xl p-4 md:p-8', className)}>
      <h1 className="mb-6 text-3xl font-bold break-words">{title}</h1>
      {html ? (
        <div
          className="prose prose-invert max-w-none break-words"
          // renderHandoutHtml sanitizes via rehype-sanitize — the XSS boundary (see handout-renderer tests)
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        emptyPlaceholder
      )}
    </article>
  );
};

export { HandoutArticle };
