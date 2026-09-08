"use client";

import { Highlight, Prism } from "prism-react-renderer";

// The bundled Prism languages include TSX and JSON; these rules cover our shell examples.
Prism.languages.bash ??= {
  comment: /#.*/,
  string: { pattern: /(["'])(?:\\.|(?!\1)[^\\])*\1/, greedy: true },
  variable: /\$[\w]+/,
  function: /\bbun(?=\s)/,
  operator: /&&|\|\||[|>]/,
};

export type CodeLanguage = "tsx" | "typescript" | "json" | "bash";

const codeTokenClasses: Record<string, string> = {
  comment: "text-muted-foreground italic",
  keyword: "text-destructive",
  operator: "text-destructive",
  string: "text-success",
  "attr-value": "text-success",
  function: "text-warning",
  "class-name": "text-warning",
  tag: "text-warning",
  number: "text-ring",
  boolean: "text-ring",
  "attr-name": "text-ring",
  property: "text-ring",
  punctuation: "text-muted-foreground",
};

export function HighlightedCode({
  code,
  language = "tsx",
}: {
  code: string;
  language?: CodeLanguage;
}) {
  return (
    <Highlight code={code} language={language}>
      {({ tokens }) => (
        <pre className="bg-transparent text-foreground" data-language={language}>
          <code>
            {tokens.map((line, lineIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Token positions are regenerated with the snippet.
              <span key={lineIndex}>
                {line.map((token, tokenIndex) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: Tokens have no persistent identity.
                    key={tokenIndex}
                    className={[
                      token.empty != null ? "inline-block" : "",
                      token.types
                        .map((type) => codeTokenClasses[type])
                        .filter(Boolean)
                        .at(-1),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {token.content}
                  </span>
                ))}
                {lineIndex < tokens.length - 1 ? "\n" : null}
              </span>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}
