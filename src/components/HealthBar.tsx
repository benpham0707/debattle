
import React from 'react';

interface HealthBarProps {
  health: number;
  maxHealth: number;
}

export const HealthBar = ({ health, maxHealth }: HealthBarProps) => {
  const percentage = (health / maxHealth) * 100;
  
  const getHealthColor = () => {
    if (percentage > 70) return 'bg-comic-green';
    if (percentage > 30) return 'bg-comic-yellow';
    return 'bg-comic-red';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-comic-dark">HP</span>
        <span className="text-sm font-bold text-comic-dark">{health}/{maxHealth}</span>
      </div>
      
      <div className="w-full h-6 bg-gray-200 comic-border relative overflow-hidden">
        <div 
          className={`h-full ${getHealthColor()} transition-all duration-500 ease-out relative`}
          style={{ width: `${percentage}%` }}
        >
          {/* Comic book style inner glow */}
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
        
        {/* Health bar segments for comic effect */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-black/20" />
          ))}
        </div>
      </div>
    </div>
  );
};
