interface PageContainerProps {
  children: React.ReactNode;
  /** Narrower width for form pages */
  narrow?: boolean;
  wide?: boolean;
  className?: string;
  eyebrow?: string;
  title?: string;
  lede?: string;
  rightSlot?: React.ReactNode;
}

export function PageContainer({
  children,
  narrow,
  wide,
  className,
  eyebrow,
  title,
  lede,
  rightSlot,
}: PageContainerProps) {
  const maxWidth = narrow ? "max-w-[1100px]" : wide ? "max-w-[1400px]" : "max-w-[1400px]";

  return (
    <>
      {(eyebrow || title || lede || rightSlot) && (
        <header className="relative z-[2] border-b border-border bg-background/75">
          <div className={`mx-auto flex w-full ${maxWidth} flex-col gap-6 px-6 py-12 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-16`}>
            <div className="max-w-3xl">
              {eyebrow && <p className="heritage-eyebrow">- {eyebrow}</p>}
              {title && (
                <h1
                  className="mt-4 font-serif text-foreground"
                  style={{
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                    fontWeight: 500,
                    lineHeight: 1.1,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {title}
                </h1>
              )}
              {lede && (
                <p className="mt-4 max-w-2xl text-[0.95rem] leading-7 text-muted-foreground">
                  {lede}
                </p>
              )}
            </div>
            {rightSlot && <div className="flex flex-wrap gap-3">{rightSlot}</div>}
          </div>
        </header>
      )}

      <div className={`relative z-[2] mx-auto w-full ${maxWidth} px-6 py-10 lg:px-10 ${className ?? ""}`}>
        {children}
      </div>
    </>
  );
}
