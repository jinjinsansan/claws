"use client";

import { useState } from "react";

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export default function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border border-border rounded-lg overflow-hidden">
          <button
            className="w-full text-left px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-start sm:items-center bg-surface hover:bg-border/30 transition-colors"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <span className="font-bold text-sm sm:text-base text-text-main">{item.question}</span>
            <span className="text-primary text-lg sm:text-xl ml-3 sm:ml-4 shrink-0">
              {openIndex === i ? "−" : "+"}
            </span>
          </button>
          {openIndex === i && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base text-text-muted leading-relaxed border-t border-border">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
