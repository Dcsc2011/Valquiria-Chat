import React from 'react';

interface LogoProps {
  size?: number;
  rounded?: boolean;
}

export default function Logo({ size = 40, rounded = true }: LogoProps) {
  return (
    <img
      src="/favicon-192.png"
      alt="Valquíria Chat"
      width={size}
      height={size}
      className={rounded ? 'rounded-full object-cover' : 'object-contain'}
      style={{ width: size, height: size }}
    />
  );
}
