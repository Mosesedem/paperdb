"use client";

import React, { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface CopyForAIProps {
  content?: string;
  className?: string;
}

const CopyForAI: React.FC<CopyForAIProps> = ({ content, className = "" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // If content is provided, copy it directly.
      // Otherwise, try to fetch the global llms.txt context
      let textToCopy = content;
      
      if (!textToCopy) {
        const response = await fetch("/llms.txt");
        if (!response.ok) throw new Error("Failed to fetch context");
        textToCopy = await response.text();
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Copied to clipboard for your AI assistant");
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy content");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`group flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white rounded-md transition-colors border border-white/5 hover:border-white/10 ${className}`}
      title="Copy context for AI agents"
    >
      {copied ? (
        <Check size={14} className="text-green-400" />
      ) : (
        <Sparkles size={14} className="group-hover:text-blue-400 transition-colors" />
      )}
      <span>{copied ? "Copied!" : "Copy for AI"}</span>
    </button>
  );
};

export default CopyForAI;
