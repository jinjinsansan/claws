interface CardProps {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

export default function Card({
  children,
  className = "",
  highlight = false,
}: CardProps) {
  return (
    <div
      className={`bg-surface rounded-xl border ${
        highlight ? "border-primary" : "border-border"
      } p-4 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
