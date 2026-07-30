import { cn } from "@/lib/cn";

/**
 * Renders the light markdown subset professors actually use in notes fields:
 * `### heading`, `**bold**`, `*italic*`, `- bullet`, `1. numbered`, `> quote`.
 *
 * Written by hand rather than pulled from a markdown library because the input is
 * professor-authored plain text, not untrusted HTML — and because a full parser
 * would be a bigger dependency than the feature warrants. No raw HTML is ever
 * inserted: inline formatting is applied by splitting on markers and emitting
 * React elements.
 */
function inline(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-cream-200 px-1 py-0.5 text-[0.9em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

type Block =
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(
        list.ordered
          ? { type: "ol", items: list.items }
          : { type: "ul", items: list.items },
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", text: heading[1] });
      continue;
    }

    const quote = /^>\s*(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: quote[1] });
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

export function RichText({
  source,
  className,
}: {
  source: string | null | undefined;
  className?: string;
}) {
  if (!source?.trim()) return null;

  const blocks = parse(source);

  return (
    <div className={cn("prose-notes text-[0.92rem] text-ink-700", className)}>
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        switch (block.type) {
          case "h3":
            return <h3 key={key}>{inline(block.text, key)}</h3>;
          case "quote":
            return <blockquote key={key}>{inline(block.text, key)}</blockquote>;
          case "ul":
            return (
              <ul key={key}>
                {block.items.map((item, i) => (
                  <li key={`${key}-${i}`}>{inline(item, `${key}-${i}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key}>
                {block.items.map((item, i) => (
                  <li key={`${key}-${i}`}>{inline(item, `${key}-${i}`)}</li>
                ))}
              </ol>
            );
          default:
            return <p key={key}>{inline(block.text, key)}</p>;
        }
      })}
    </div>
  );
}

/**
 * Transcript renderer. Lines beginning `[mm:ss]` are shown with the timestamp
 * pulled out as a monospace label so a student can find their place.
 */
export function Transcript({ source }: { source: string | null | undefined }) {
  if (!source?.trim()) return null;

  const paragraphs = source
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => {
        // [\s\S] rather than the `s` flag so this compiles under the project's
        // ES2017 target.
        const match = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([\s\S]*)$/.exec(
          paragraph,
        );
        return (
          <p key={index} className="text-[0.9rem] leading-relaxed text-ink-600">
            {match ? (
              <>
                <span className="mr-2 select-none font-mono text-[0.78rem] text-burgundy-500">
                  {match[1]}
                </span>
                {match[2]}
              </>
            ) : (
              paragraph
            )}
          </p>
        );
      })}
    </div>
  );
}
