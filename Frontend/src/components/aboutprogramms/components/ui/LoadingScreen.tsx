import { useEffect, useState } from 'react';

export const LoadingScreen = () => {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsHidden(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`loading-screen ${isHidden ? 'hidden' : ''}`}>
      <div className="loading-spinner" />
    </div>
  );
};