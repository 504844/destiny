import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Track, Week } from '../../../types';

interface TrendChartProps {
  tracks: Track[];
  weeks: Week[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ tracks, weeks }) => {
  // Process data: Sort chronologically and map to chart format
  const data = tracks
    .map(track => {
      const week = weeks.find(w => w.id === track.week_id);
      return {
        weekNumber: week?.week_number || 0,
        weekDate: week?.created_at, // For sorting
        position: track.position,
        title: track.title, // For tooltip
      };
    })
    .sort((a, b) => (new Date(a.weekDate || 0).getTime() - new Date(b.weekDate || 0).getTime()))
    .filter(d => d.weekNumber > 0); // Remove untracked weeks

  if (data.length < 2) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center border border-zinc-800 rounded-xl bg-zinc-900/30 text-zinc-500 text-sm">
        Nepakanka duomenų grafikui
      </div>
    );
  }

  // Calculate domain for Y-Axis (Inverted: 1 is top, Max is bottom)
  const maxPosition = Math.max(...data.map(d => d.position), 10); // At least 10 for scale

  return (
    <div className="w-full h-[250px] bg-zinc-900/30 rounded-xl border border-zinc-800 p-4 relative">
        <h4 className="absolute top-4 left-4 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">Karjeros Kreivė</h4>
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={data}
                margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                    dataKey="weekNumber" 
                    stroke="#52525b" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `Sav. ${val}`}
                />
                <YAxis 
                    reversed={true} // #1 is at the top
                    domain={[1, maxPosition + 2]} // Add padding
                    stroke="#52525b"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#e4e4e7' }}
                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '3 3' }}
                    formatter={(value: any, name: any, props: any) => [`#${value}`, props.payload.title]}
                    labelFormatter={(label) => `Savaitė ${label}`}
                />
                <Area 
                    type="monotone" 
                    dataKey="position" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPos)" 
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
  );
};
