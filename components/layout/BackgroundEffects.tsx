import React from 'react';

interface BackgroundEffectsProps {
  color: string | null;
}

export const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({ color }) => {
  return (
    <>
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-1000 ease-in-out"
        style={{
          background: color 
            ? `radial-gradient(circle at 50% 10%, ${color}15 0%, transparent 60%), radial-gradient(circle at 50% 90%, ${color}10 0%, transparent 50%)`
            : 'transparent',
          opacity: color ? 1 : 0
        }}
      />
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      </div>
    </>
  );
};