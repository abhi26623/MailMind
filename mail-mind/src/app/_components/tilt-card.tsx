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
        className={`relative w-full rounded-2xl border border-transparent bg-white transition-all ease-out preserve-3d ${
          isHovered ? 'shadow-none ring-0 duration-75' : 'shadow-[0_20px_50px_-24px_rgba(14,165,233,0.18)] duration-500'
        }`}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isHovered ? 1.02 : 1})`,
        }}
      >
        {/* Soft ambient lift without a dark outline */}
        <div 
          className={`absolute -inset-2 rounded-[1.5rem] bg-sky-100/30 blur-2xl transition-opacity pointer-events-none -z-10 ${
            isHovered ? 'opacity-40 duration-300' : 'opacity-0 duration-500'
          }`} 
        />
        {children}
      </div>
    </div>
  );
}
