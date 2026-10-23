import type { CSSProperties, ReactNode } from "react";

/** Infinite horizontal text band. Static markup animated with CSS only. */
export function Marquee({
  items,
  className,
  itemClassName,
  duration = 26,
  separator = "·",
}: {
  items: string[];
  className?: string;
  itemClassName?: string;
  /** Seconds for one full loop. */
  duration?: number;
  separator?: ReactNode;
}) {
  const run = [...items, ...items];

  const row = (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {run.map((item, index) => (
        <span key={`${item}-${index}`} className={itemClassName}>
          {item}
          <span style={{ padding: "0 0.75em", opacity: 0.55 }}>{separator}</span>
        </span>
      ))}
    </span>
  );

  return (
    <div className={className} aria-hidden="true" style={{ overflow: "hidden" }}>
      <div
        className="anim-marquee"
        style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
      >
        {row}
        {row}
      </div>
    </div>
  );
}

export default Marquee;
