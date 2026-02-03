import { useState } from 'react';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  
  // adminPanelMode: null = hidden, 'create' = new upload, 'edit' = edit current
  const [adminPanelMode, setAdminPanelMode] = useState<'create' | 'edit' | null>(null);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newCount = prev + 1;
      if (newCount === 3) {
        if (isAdmin) {
          setAdminPanelMode('create');
        } else {
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
    setAdminPanelMode('create');
  };

  const closeLoginModal = () => setShowLoginModal(false);
  const closeAdminPanel = () => setAdminPanelMode(null);

  return {
    isAdmin,
    showLoginModal,
    adminPanelMode,
    setAdminPanelMode,
    handleLogoClick,
    login,
    closeLoginModal,
    closeAdminPanel
  };
};