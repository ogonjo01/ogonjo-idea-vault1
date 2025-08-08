"use client";

import { FC } from "react";

type SummaryContent =
  | {
      description?: string;
      core_thesis?: string;
      key_takeaways?: string[];
      author_perspective?: string;
      quotes?: string[];
    }
  | { type: string; content?: any; text?: string }[];

interface SummaryRendererProps {
  content: SummaryContent | null;
}

const SummaryRenderer: FC<SummaryRendererProps> = ({ content }) => {
  if (!content) return <p>No summary available.</p>;

  // If it's an array, assume it's from TipTap rich text editor
  if (Array.isArray(content)) {
    return (
      <div className="space-y-4">
        {content.map((node, index) => {
          switch (node.type) {
            case "heading":
              return (
                <h2 key={index} className="text-xl font-bold">
                  {node.content?.map((c: any) => c.text).join("")}
                </h2>
              );
            case "paragraph":
              return (
                <p key={index} className="text-base">
                  {node.content?.map((c: any) => c.text).join("")}
                </p>
              );
            case "bulletList":
              return (
                <ul key={index} className="list-disc list-inside">
                  {node.content?.map((li: any, liIndex: number) => (
                    <li key={liIndex}>
                      {li.content?.map((c: any) => c.text).join("")}
                    </li>
                  ))}
                </ul>
              );
            case "image":
              return (
                <img
                  key={index}
                  src={node.attrs?.src}
                  alt={node.attrs?.alt || "Image"}
                  className="my-4 rounded"
                />
              );
            default:
              return null;
          }
        })}
      </div>
    );
  }

  // Otherwise it's the structured summary format
  const structured = content as any;

  return (
    <div className="space-y-4">
      {structured.description && (
        <>
          <h2 className="text-xl font-semibold">Description</h2>
          <p>{structured.description}</p>
        </>
      )}
      {structured.core_thesis && (
        <>
          <h2 className="text-xl font-semibold">Core Thesis</h2>
          <p>{structured.core_thesis}</p>
        </>
      )}
      {structured.key_takeaways && structured.key_takeaways.length > 0 && (
        <>
          <h2 className="text-xl font-semibold">Key Takeaways</h2>
          <ul className="list-disc list-inside">
            {structured.key_takeaways.map((point: string, i: number) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </>
      )}
      {structured.author_perspective && (
        <>
          <h2 className="text-xl font-semibold">Author's Perspective</h2>
          <p>{structured.author_perspective}</p>
        </>
      )}
      {structured.quotes && structured.quotes.length > 0 && (
        <>
          <h2 className="text-xl font-semibold">Quotes</h2>
          <ul className="list-disc list-inside">
            {structured.quotes.map((quote: string, i: number) => (
              <li key={i} className="italic text-gray-600">
                “{quote}”
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default SummaryRenderer;
