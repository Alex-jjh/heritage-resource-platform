interface PageContainerProps {
  children: React.ReactNode;
  narrow?: boolean;
}

export function PageContainer({ children, narrow }: PageContainerProps) {
  return (
    <div className={narrow ? "max-w-xl mx-auto px-5 py-5" : "max-w-5xl mx-auto px-5 py-5"}>
      {children}
    </div>
  );
}
