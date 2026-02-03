import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 text-center text-xs text-zinc-800 pb-4">
      <p>&copy; {new Date().getFullYear()} DJ Destiny</p>
    </footer>
  );
};