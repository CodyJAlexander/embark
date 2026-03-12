import type { SVGProps } from 'react';

interface Props extends SVGProps<SVGSVGElement> {
  className?: string;
}

export function SparkIcon({ className = 'w-5 h-5', ...props }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
    </svg>
  );
}
