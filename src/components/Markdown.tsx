import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ node, ...props }) => (
          <div className="my-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm border-collapse" {...props} />
          </div>
        ),
        thead: (props) => <thead className="bg-muted/60" {...props} />,
        th: (props) => <th className="text-left font-semibold px-3 py-2 border-b" {...props} />,
        td: (props) => <td className="px-3 py-2 border-b border-border/60 align-top" {...props} />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
