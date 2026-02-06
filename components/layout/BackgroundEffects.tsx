import React, { useEffect, useState } from 'react';

interface BackgroundEffectsProps {
  color: string | null;
}

export const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({ color }) => {
  // We track the last valid color to prevent snapping to black when fading out,
  // or to allow smooth interpolation from Color A to Color B.
  const [displayColor, setDisplayColor] = useState<string>(color || '#000000');

  useEffect(() => {
    if (color) {
      setDisplayColor(color);
    }
  }, [color]);

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 transition-[background-color,opacity] duration-1000 ease-in-out will-change-[background-color,opacity]"
          style={{ 
            // We animate the solid color. 
            // If color is null, we keep the OLD color so it fades out of that color, not to white/black.
            backgroundColor: displayColor,
            
            // Opacity controls the visibility. 
            // If color exists, we show it (at 45% intensity). If null, we fade to 0.
            opacity: color ? 0.45 : 0,

            // We use a mask to create the spotlight shape on top of the solid color.
            // This allows the color property to animate freely while keeping the shape.
            maskImage: `
              radial-gradient(circle at 50% 0%, black 0%, transparent 70%), 
              radial-gradient(circle at 50% 100%, black 0%, transparent 60%)
            `,
            WebkitMaskImage: `
              radial-gradient(circle at 50% 0%, black 0%, transparent 70%), 
              radial-gradient(circle at 50% 100%, black 0%, transparent 60%)
            `
          }}
        />
      </div>
      
      {/* Texture Overlay (Grain/Grid) */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
          backgroundSize: '32px 32px' 
        }}
      />
    </>
  );
};