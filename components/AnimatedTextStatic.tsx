import type { ReactNode } from "react";

/**
 * CSS-only letter reveal for server-rendered marketing copy.
 *
 * Unlike the interactive WordCycle component, this renderer has no client
 * state or effects. Its markup is animated by the existing CSS keyframes and
 * stays out of the hydration bundle on static sections.
 */
type TextTag = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4";

export function AnimatedText({
  text,
  className,
  as: Tag = "span",
  delay = 0,
  stagger = 0.025,
  heavy = false,
  once: _once = true,
  animateOnLoad: _animateOnLoad = false,
}: {
  text: string;
  className?: string;
  as?: TextTag;
  delay?: number;
  stagger?: number;
  heavy?: boolean;
  once?: boolean;
  animateOnLoad?: boolean;
}): ReactNode {
  const words = text.split(" ");
  let index = 0;

  return (
    <Tag className={className}>
      <span style={{ display: "inline" }}>
        {words.map((word, wordIndex) => (
          <span
            key={`${word}-${wordIndex}`}
            style={{ display: "inline-block", whiteSpace: "nowrap" }}
            aria-hidden="true"
          >
            {Array.from(word).map((char, charIndex) => {
              const characterIndex = index++;
              return (
                <span
                  key={`${char}-${charIndex}`}
                  className={heavy ? "anim-char-heavy" : "anim-char"}
                  style={{ animationDelay: `${(delay + characterIndex * stagger).toFixed(3)}s` }}
                >
                  {char}
                </span>
              );
            })}
            {wordIndex < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </Tag>
  );
}

export default AnimatedText;
