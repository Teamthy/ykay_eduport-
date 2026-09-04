"use client";

// AnimatedText — typographic motion system for Ykay College.
//
// Three pieces:
//   AnimatedText — splits text into per-letter spans and springs each one in
//                  with a small rotate/scale overshoot (the "jumpy" feel).
//   WordCycle    — one word at a time from a list, springing in and out.
//   Marquee      — an infinite horizontal band of repeated text.
//
// All three honour prefers-reduced-motion: they render plain, static text with
// no transforms. Word wrapping is preserved by wrapping each WORD in an
// inline-block span and only splitting letters inside it, so a long headline
// breaks between words like normal text and never mid-word.

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/** Elements this component may render as. Kept concrete so the JSX children
 * type stays sound under React 19's stricter intrinsic-element typing. */
type TextTag = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4";

const SPRING = { type: "spring", stiffness: 300, damping: 14, mass: 0.6 } as const;

/** Heavier, slower-settling spring used by the big editorial headlines. */
const SPRING_HEAVY = { type: "spring", stiffness: 220, damping: 11, mass: 1.05 } as const;

/** Per-letter springy reveal. Splits on spaces so words never break apart. */
export function AnimatedText({
  text,
  className,
  as: Tag = "span",
  delay = 0,
  stagger = 0.025,
  heavy = false,
  once = true,
  animateOnLoad = false,
}: {
  text: string;
  className?: string;
  /** Element to render as — e.g. "h1", "h2". Defaults to a span. */
  as?: TextTag;
  /** Delay before the first letter, in SECONDS. */
  delay?: number;
  /** Gap between letters, in SECONDS. */
  stagger?: number;
  /** Heavy editorial reveal: letters rise further, overshoot more and blur in. */
  heavy?: boolean;
  once?: boolean;
  /** Animate immediately on mount instead of when scrolled into view. */
  animateOnLoad?: boolean;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <Tag className={className}>{text}</Tag>;

  const words = text.split(" ");
  let index = 0;

  const motionProps = animateOnLoad
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: { once, margin: "-40px" } };

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <motion.span
        initial="hidden"
        {...motionProps}
        style={{ display: "inline" }}
        aria-hidden="true"
      >
        {words.map((word, w) => (
          <span
            key={`${word}-${w}`}
            style={{ display: "inline-block", whiteSpace: "nowrap" }}
            aria-hidden="true"
          >
            {Array.from(word).map((char, c) => {
              const i = index++;
              return (
                <motion.span
                  key={`${char}-${c}`}
                  style={{ display: "inline-block", willChange: "transform" }}
                  variants={
                    heavy
                      ? {
                          hidden: {
                            opacity: 0,
                            y: "1.05em",
                            rotate: -14,
                            scale: 0.62,
                            filter: "blur(9px)",
                          },
                          show: {
                            opacity: 1,
                            y: 0,
                            rotate: 0,
                            scale: 1,
                            filter: "blur(0px)",
                            transition: { ...SPRING_HEAVY, delay: delay + i * stagger },
                          },
                        }
                      : {
                          hidden: { opacity: 0, y: "0.5em", rotate: -8, scale: 0.8 },
                          show: {
                            opacity: 1,
                            y: 0,
                            rotate: 0,
                            scale: 1,
                            transition: { ...SPRING, delay: delay + i * stagger },
                          },
                        }
                  }
                >
                  {char}
                </motion.span>
              );
            })}
            {w < words.length - 1 ? "\u00A0" : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/** Rotating word — springs the old word out and the next one in. */
export function WordCycle({
  words,
  className,
  interval = 2200,
  heavy = false,
  fitWords = false,
  fitBasis = 100,
  fitMax,
  tracking = 0,
}: {
  words: string[];
  className?: string;
  /** Milliseconds each word stays on screen. */
  interval?: number;
  /** Heavier swap: bigger travel, more overshoot, blur on the outgoing word. */
  heavy?: boolean;
  /**
   * Size each word individually so every one spans the same width, however
   * many letters it has. Anton is near-monospaced in caps, so character count
   * is a good enough proxy and needs no measuring in the browser.
   */
  fitWords?: boolean;
  /** Percentage of the container each fitted word should span. */
  fitBasis?: number;
  /** Optional ceiling (any CSS length) so the type stops growing on huge screens. */
  fitMax?: string;
  /** Letter-spacing applied by the caller, in em, so fitting can account for it. */
  tracking?: number;
}) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const count = words.length;

  useEffect(() => {
    if (reduce || count < 2) return;
    const id = window.setInterval(() => setI((prev) => (prev + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [reduce, count, interval]);

  // Per-letter advance widths for Anton caps, as a fraction of the font size.
  // Measured from the rendered face; used so each word can be sized to span
  // the same width without measuring in the browser on every render.
  const ADVANCE: Record<string, number> = {
    A: 0.485,
    B: 0.479,
    C: 0.474,
    D: 0.493,
    E: 0.412,
    F: 0.399,
    G: 0.485,
    H: 0.499,
    I: 0.227,
    J: 0.466,
    K: 0.472,
    L: 0.397,
    M: 0.746,
    N: 0.498,
    O: 0.486,
    P: 0.472,
    Q: 0.494,
    R: 0.477,
    S: 0.461,
    T: 0.396,
    U: 0.474,
    V: 0.469,
    W: 0.712,
    X: 0.484,
    Y: 0.446,
    Z: 0.41,
    " ": 0.234,
  };
  const wordWidth = (word: string) =>
    [...word.toUpperCase()].reduce((sum, ch) => sum + (ADVANCE[ch] ?? 0.47), 0) +
    tracking * word.length;
  const fitSize = (word: string) => {
    const size = `${(fitBasis / wordWidth(word)).toFixed(2)}cqw`;
    return fitMax ? `min(${size}, ${fitMax})` : size;
  };

  if (reduce) {
    return (
      <span className={className} style={fitWords ? { fontSize: fitSize(words[0]) } : undefined}>
        {words[0]}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-grid",
        verticalAlign: "bottom",
        ...(fitWords ? { containerType: "inline-size", width: "100%" } : null),
      }}
    >
      {words.map((word, idx) => (
        <motion.span
          key={word}
          aria-hidden={idx === i ? undefined : "true"}
          style={{
            gridArea: "1 / 1",
            display: "inline-block",
            ...(fitWords ? { fontSize: fitSize(word), whiteSpace: "nowrap" } : null),
          }}
          initial={false}
          animate={
            idx === i
              ? { opacity: 1, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }
              : heavy
                ? { opacity: 0, y: "-0.9em", rotate: 10, scale: 0.7, filter: "blur(10px)" }
                : { opacity: 0, y: "-0.45em", rotate: 5, scale: 0.85, filter: "blur(0px)" }
          }
          transition={heavy ? SPRING_HEAVY : SPRING}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/** Infinite horizontal band. Decorative, so it is hidden from screen readers. */
export function Marquee({
  items,
  className,
  itemClassName,
  duration = 26,
  separator = "\u00B7",
}: {
  items: string[];
  className?: string;
  itemClassName?: string;
  /** Seconds for one full loop. */
  duration?: number;
  separator?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const run = [...items, ...items];

  const row = (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {run.map((item, i) => (
        <span key={`${item}-${i}`} className={itemClassName}>
          {item}
          <span style={{ padding: "0 0.75em", opacity: 0.55 }}>{separator}</span>
        </span>
      ))}
    </span>
  );

  if (reduce) {
    return (
      <div className={className} aria-hidden="true" style={{ overflow: "hidden" }}>
        <span style={{ display: "inline-flex", whiteSpace: "nowrap" }}>{row}</span>
      </div>
    );
  }

  return (
    <div className={className} aria-hidden="true" style={{ overflow: "hidden" }}>
      <motion.div
        style={{ display: "inline-flex", whiteSpace: "nowrap", willChange: "transform" }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        {row}
        {row}
      </motion.div>
    </div>
  );
}

export default AnimatedText;
