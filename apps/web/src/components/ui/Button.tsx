import { ButtonHTMLAttributes } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "outline";

type ButtonAsLink = {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
  href: string;
};

type ButtonAsButton = {
  variant?: ButtonVariant;
  className?: string;
  href?: undefined;
} & ButtonHTMLAttributes<HTMLButtonElement>;

type ButtonProps = ButtonAsLink | ButtonAsButton;

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary hover:bg-primary-light text-bg font-bold",
  secondary:
    "bg-surface hover:bg-border text-text-main font-bold border border-border",
  outline:
    "bg-transparent hover:bg-surface text-primary font-bold border border-primary",
};

function extractButtonProps(props: ButtonAsButton): ButtonHTMLAttributes<HTMLButtonElement> {
  const rest = { ...props };
  delete rest.variant;
  delete rest.className;
  delete rest.href;
  return rest;
}

export default function Button(props: ButtonProps) {
  const { variant = "primary", className = "", children } = props;
  const base = `inline-block py-3 px-8 rounded-lg text-lg transition-colors ${variants[variant]} ${className}`;

  if (props.href) {
    return (
      <Link href={props.href} className={base}>
        {children}
      </Link>
    );
  }

  const buttonProps = extractButtonProps(props as ButtonAsButton);

  return (
    <button className={base} {...buttonProps}>
      {children}
    </button>
  );
}
