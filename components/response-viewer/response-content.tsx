"use client";

import { useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Button } from "@/components/ui/button";
import { Check, Copy, Code, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponseContentProps {
  content: string;
  renderMarkdown: boolean;
  syntaxHighlight: boolean;
  wordWrap: boolean;
  className?: string;
}

export function ResponseContent({
  content,
  renderMarkdown,
  syntaxHighlight,
  wordWrap,
  className,
}: ResponseContentProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(!renderMarkdown);

  // Sync showRaw when renderMarkdown changes from toolbar
  useEffect(() => {
    setShowRaw(!renderMarkdown);
  }, [renderMarkdown]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  // Code block component for react-markdown
  const CodeBlock = useCallback(
    ({ className: codeClassName, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(codeClassName || "");
      const language = match ? match[1] : "";
      const code = String(children).replace(/\n$/, "");

      // Inline code
      if (!match) {
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm"
            {...props}
          >
            {children}
          </code>
        );
      }

      // Code block
      if (syntaxHighlight) {
        return (
          <div className="relative group my-3">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 bg-background/80"
                onClick={() => navigator.clipboard.writeText(code)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              wrapLines={wordWrap}
              wrapLongLines={wordWrap}
              customStyle={{
                margin: 0,
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <pre
          className={cn(
            "p-4 rounded-md bg-muted overflow-x-auto my-3",
            wordWrap && "whitespace-pre-wrap break-words"
          )}
        >
          <code className="font-mono text-sm">{code}</code>
        </pre>
      );
    },
    [syntaxHighlight, wordWrap]
  );

  return (
    <div className={cn("relative", className)}>
      {/* Toolbar */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity bg-background/80 rounded-md p-1">
        {renderMarkdown && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setShowRaw(!showRaw)}
            title={showRaw ? "Show rendered" : "Show raw"}
          >
            {showRaw ? <FileText className="h-3 w-3" /> : <Code className="h-3 w-3" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Content */}
      {showRaw ? (
        <pre
          className={cn(
            "text-sm font-mono p-4 bg-muted/30 rounded-md overflow-x-auto",
            wordWrap && "whitespace-pre-wrap break-words"
          )}
        >
          {content}
        </pre>
      ) : renderMarkdown ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: CodeBlock,
              // Make links open in new tab
              a: ({ children, href, ...props }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </a>
              ),
              // Style tables
              table: ({ children, ...props }) => (
                <div className="overflow-x-auto my-3">
                  <table className="border-collapse border border-border" {...props}>
                    {children}
                  </table>
                </div>
              ),
              th: ({ children, ...props }) => (
                <th className="border border-border bg-muted px-3 py-2 text-left" {...props}>
                  {children}
                </th>
              ),
              td: ({ children, ...props }) => (
                <td className="border border-border px-3 py-2" {...props}>
                  {children}
                </td>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      ) : (
        <div
          className={cn(
            "text-sm",
            wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
