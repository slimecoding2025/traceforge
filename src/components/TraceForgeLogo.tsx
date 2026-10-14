import React from 'react';
import logoImg from '../assets/images/traceforge_logo_1791928574658.jpg';

interface TraceForgeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const TraceForgeLogo: React.FC<TraceForgeLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { img: 'w-7 h-7', title: 'text-sm', sub: 'text-[9px]', badge: 'px-1 py-0.5 text-[8px]' },
    md: { img: 'w-9 h-9', title: 'text-base', sub: 'text-[10px]', badge: 'px-1.5 py-0.5 text-[9px]' },
    lg: { img: 'w-11 h-11', title: 'text-lg', sub: 'text-[11px]', badge: 'px-1.5 py-0.5 text-[10px]' },
    xl: { img: 'w-16 h-16', title: 'text-2xl', sub: 'text-xs', badge: 'px-2 py-0.5 text-xs' },
  };

  const dim = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* High-Tech Shield Emblem */}
      <div className="relative group shrink-0">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 via-emerald-400/20 to-emerald-600/30 rounded-xl blur-sm group-hover:blur-md transition-all opacity-80 group-hover:opacity-100" />
        <div className="relative rounded-lg p-0.5 bg-gradient-to-b from-[#00ff66]/40 via-[#0a1a0f] to-[#020502] border border-[#00ff66]/50 shadow-[0_0_15px_rgba(0,255,102,0.25)] overflow-hidden">
          <img
            src={logoImg}
            alt="TraceForge Defense Emblem"
            className={`${dim.img} object-contain rounded filter drop-shadow-[0_0_8px_rgba(0,255,102,0.4)] transition-transform duration-300 group-hover:scale-105`}
            onError={(e) => {
              // Fallback to static public path if asset bundle path differs
              (e.currentTarget as HTMLImageElement).src = '/traceforge-logo.jpg';
            }}
          />
        </div>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-[0.16em] uppercase text-white ${dim.title} font-mono`}
              style={{
                textShadow: '0 0 16px rgba(0,255,102,0.3)',
              }}
            >
              TRACE<span className="text-[#00ff66]">FORGE</span>
            </span>
            <span className={`font-mono font-bold text-black bg-[#00ff66] rounded uppercase tracking-wider ${dim.badge}`}>
              SOC
            </span>
          </div>
          <span className={`text-neutral-400 font-mono tracking-[0.22em] uppercase font-medium mt-0.5 ${dim.sub}`}>
            Cyber Defense Workbench
          </span>
        </div>
      )}
    </div>
  );
};
