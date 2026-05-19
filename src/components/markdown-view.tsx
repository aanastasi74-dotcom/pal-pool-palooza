import ReactMarkdown from "react-markdown";

export function MarkdownView({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-headings:font-bold prose-p:my-2 prose-strong:text-foreground ${className ?? ""}`}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
