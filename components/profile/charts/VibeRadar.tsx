import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface VibeRadarProps {
  scores: {
    energy: number;
    mood: number;
    popularity: number;
    era: number;
    vocals: number;
  };
}

export const VibeRadar: React.FC<VibeRadarProps> = ({ scores }) => {
  const data = [
    { subject: 'Energy', A: scores.energy, fullMark: 100 },
    { subject: 'Mood', A: scores.mood, fullMark: 100 },
    { subject: 'Popularity', A: scores.popularity, fullMark: 100 },
    { subject: 'Era', A: scores.era, fullMark: 100 },
    { subject: 'Vocals', A: scores.vocals, fullMark: 100 },
  ];

  return (
    <div className="w-full h-[200px] sm:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Vibe"
            dataKey="A"
            stroke="#10b981" // emerald-500
            strokeWidth={2}
            fill="#10b981"
            fillOpacity={0.2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
