"use client";

import React, { useRef, useState } from "react";

export function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate mouse position relative to the center of the card
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    
    // Calculate rotation (max 10 degrees on each side for greater effect)
    const rY = (mouseX / (width / 2)) * 10;
    const rX = (mouseY / (height / 2)) * -10;
    
    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseEnter = () => setIsHovered(true);
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      className="relative w-full"
      style={{ perspective: "1200px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={ref}
        className={`relative w-full rounded-2xl border border-forest-900/10 bg-white transition-all ease-out preserve-3d ${
          isHovered ? 'shadow-[0_40px_80px_-20px_rgba(26,35,26,0.3)] ring-4 ring-forest-500/20 duration-75' : 'shadow-[0_30px_60px_-15px_rgba(26,35,26,0.15)] duration-500'
        }`}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isHovered ? 1.02 : 1})`,
        }}
      >
        {/* Outline glow effect that follows hover */}
        <div 
          className={`absolute -inset-2 rounded-[1.5rem] bg-gradient-to-tr from-wheat-500/0 via-wheat-500/40 to-forest-500/50 blur-xl transition-opacity pointer-events-none -z-10 ${
            isHovered ? 'opacity-100 duration-300' : 'opacity-0 duration-500'
          }`} 
        />
        {children}
      </div>
    </div>
  );
}
