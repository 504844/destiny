import { useState } from 'react';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newCount = prev + 1;
      if (newCount === 3) {
        if (isAdmin) {
          // If already admin, just toggle the console
          setIsConsoleOpen(prev => !prev);
        } else {
          // If not admin, ask for password
          setShowLoginModal(true);
        }
        return 0;
      }
      return newCount;
    });
  };

  const login = () => {
    setIsAdmin(true);
    setShowLoginModal(false);
    setIsConsoleOpen(true);
  };

  const closeLoginModal = () => setShowLoginModal(false);
  const toggleConsole = () => setIsConsoleOpen(prev => !prev);
  const closeConsole = () => setIsConsoleOpen(false);

  return {
    isAdmin,
    showLoginModal,
    isConsoleOpen,
    handleLogoClick,
    login,
    closeLoginModal,
    toggleConsole,
    closeConsole
  };
};