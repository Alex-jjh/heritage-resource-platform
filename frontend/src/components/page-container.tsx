interface PageContainerProps {
  children: React.ReactNode;
  /** Narrower width for form pages */
  narrow?: boolean;
  className?: string;
}

export function PageContainer({ children, narrow, className }: PageContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-6 py-8 sm:px-10 lg:px-20 xl:px-32 ${
        narrow ? "max-w-4xl" : ""
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
