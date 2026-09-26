'use client';

import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string;
  className?: string;
}

export default function Logo({
  size = 'md',
  showText = true,
  href = '/',
  className = '',
}: LogoProps) {
  const sizeMap = {
    sm: { img: 'w-7 h-7', text: 'text-sm' },
    md: { img: 'w-9 h-9', text: 'text-lg' },
    lg: { img: 'w-12 h-12', text: 'text-2xl' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`flex items-center gap-3 select-none group ${className}`}>
      {/* Circular Emblem Container with Chrome & Cyber Violet Glow */}
      <div className={`relative ${currentSize.img} rounded-full overflow-hidden p-[1.5px] bg-gradient-to-tr from-purple-500 via-white/50 to-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.6)]`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center">
          <img
            src="/logo.png"
            alt="NEW ERA Logo"
            className="w-full h-full object-cover scale-110 rounded-full"
            onError={(e) => {
              // Fallback if image fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>


      {/* Brand Text */}
      {showText && (
        <div className={`font-black tracking-widest font-mono text-white flex items-center ${currentSize.text}`}>
          <span>NEW</span>
          <span className="text-purple-400 mx-0.5">.</span>
          <span className="bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
            ERA
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
