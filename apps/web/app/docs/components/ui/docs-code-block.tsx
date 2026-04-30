"use client";
import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "../../../../components/ui/button";
import { useState } from "react";

type DocsCodeBlockProps = {
  children: string;
  className?: string;
  language?: string;
  styleOverride?: object;
};

const DocsCodeBlock = ({
  children,
  language = "typescript",
  styleOverride = {},
}: DocsCodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="relative my-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/30">
      <Button
        size="sm"
        variant="ghost"
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 px-2 py-1 text-xs"
        aria-label="Copy code"
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
      <SyntaxHighlighter
        language={language}
        style={dracula}
        customStyle={{
          background: "none",
          fontSize: "0.875rem",
          color: "#f8f8f2",
          margin: 0,
          paddingTop: "2.5rem",
          ...styleOverride,
        }}
        showLineNumbers={false}
        wrapLines={true}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

export default DocsCodeBlock;
