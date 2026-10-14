import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'green' | 'red' | 'amber' | 'emerald' | 'crimson' | 'cyan';
  onClick?: () => void;
  hoverScale?: number;
}

export const MotionCard: React.FC<MotionCardProps> = ({
  children,
  className = '',
  glowColor = 'green',
  onClick,
  hoverScale = 1.015,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse coordinate motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for rotation
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['6deg', '-6deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-6deg', '6deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const glowStyles: Record<string, string> = {
    green: 'hover:border-emerald-400/70 hover:shadow-[0_0_30px_rgba(0,255,102,0.2)]',
    emerald: 'hover:border-emerald-400/70 hover:shadow-[0_0_30px_rgba(0,255,102,0.2)]',
    cyan: 'hover:border-emerald-400/70 hover:shadow-[0_0_30px_rgba(0,255,102,0.2)]',
    red: 'hover:border-rose-500/80 hover:shadow-[0_0_30px_rgba(255,23,68,0.25)]',
    crimson: 'hover:border-rose-500/80 hover:shadow-[0_0_30px_rgba(255,23,68,0.25)]',
    amber: 'hover:border-amber-400/70 hover:shadow-[0_0_30px_rgba(255,183,3,0.2)]',
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{ scale: hoverScale }}
      transition={{ duration: 0.15 }}
      className={`relative rounded-xl bg-[#070b07]/90 backdrop-blur-md border border-emerald-900/30 transition-all duration-200 cursor-pointer overflow-hidden ${glowStyles[glowColor] || glowStyles.green} ${className}`}
    >
      {/* Carbon matrix sheen overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300 bg-radial from-emerald-500/[0.05] via-transparent to-transparent" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};
