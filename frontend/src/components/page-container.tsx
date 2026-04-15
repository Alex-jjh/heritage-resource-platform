interface PageContainerProps {
  children: React.ReactNode;
  narrow?: boolean;
}

export function PageContainer({ children, narrow }: PageContainerProps) {
  return (
    <div className={narrow ? "container-narrow" : "container"}>
      {children}
    </div>
  );
}
