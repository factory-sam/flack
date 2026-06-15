"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

const components: Components = {
  p: (props) => <p className="my-0.5 whitespace-pre-wrap break-words first:mt-0 last:mb-0" {...props} />,
  a: (props) => (
    <a
      className="text-[var(--accent)] underline underline-offset-2"
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  ul: (props) => <ul className="my-1 list-disc space-y-0.5 pl-5" {...props} />,
  ol: (props) => <ol className="my-1 list-decimal space-y-0.5 pl-5" {...props} />,
  code: (props) => (
    <code
      className="rounded-[3px] bg-[var(--surface-2)] px-1 py-0.5 font-mono text-[12px] text-[var(--text)]"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="thin-scrollbar my-1 overflow-x-auto rounded-[5px] border border-[var(--line)] bg-[var(--surface-0)] p-2 text-[12px]"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote className="my-1 border-l-2 border-[var(--line-strong)] pl-2 text-[var(--muted)]" {...props} />
  )
};

export function MessageBody({ body }: { body: string }) {
  return (
    <div className="break-words text-[13px] leading-5 text-[var(--text)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={components}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
