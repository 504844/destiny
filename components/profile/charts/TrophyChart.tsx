import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface TrophyChartProps {
  stats: {
    total: number;
    gold: number;
    silver: number;
    bronze: number;
  };
}

export const TrophyChart: React.FC<TrophyChartProps> = ({ stats }) => {
  const others = stats.total - (stats.gold + stats.silver + stats.bronze);
  
  const data = [
    { name: 'Auksas', value: stats.gold, color: '#eab308' }, // yellow-500
    { name: 'Sidabras', value: stats.silver, color: '#94a3b8' }, // slate-400
    { name: 'Bronza', value: stats.bronze, color: '#d97706' }, // amber-600
    { name: 'Kiti', value: others, color: '#27272a' }, // zinc-800
  ].filter(d => d.value > 0);

  const winRate = stats.total > 0 
    ? Math.round(((stats.gold + stats.silver + stats.bronze) / stats.total) * 100)
    : 0;

  return (
    <div className="w-full h-[250px] bg-zinc-900/30 rounded-xl border border-zinc-800 p-4 relative flex flex-col items-center justify-center">
        <h4 className="absolute top-4 left-4 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">Top 3 Rodiklis</h4>
        
        <div className="relative w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: '#e4e4e7' }}
                    />
                </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-white">{winRate}%</span>
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Medaliai</span>
            </div>
        </div>
    </div>
  );
};
