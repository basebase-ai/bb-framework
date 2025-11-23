/**
 * Simple client-side router hook
 * 
 * Provides basic URL routing using the History API.
 * Apps can use this for simple routing needs without requiring
 * a heavy routing library.
 * 
 * Example:
 *   const { path, navigate, back } = useRouter();
 *   
 *   // Navigate to a new path
 *   navigate('/about');
 *   
 *   // Get current path
 *   console.log(path); // "/about"
 *   
 *   // Go back
 *   back();
 */

import { useState, useEffect } from "react";

export function useRouter() {
  const [path, setPath] = useState(window.location.pathname);

  // Listen for browser back/forward button
  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Navigate to a new path
  const navigate = (newPath) => {
    if (newPath !== path) {
      window.history.pushState({}, "", newPath);
      setPath(newPath);
    }
  };

  // Go back in history
  const back = () => {
    window.history.back();
  };

  // Go forward in history
  const forward = () => {
    window.history.forward();
  };

  // Replace current path (doesn't add to history)
  const replace = (newPath) => {
    window.history.replaceState({}, "", newPath);
    setPath(newPath);
  };

  return {
    path,
    navigate,
    back,
    forward,
    replace,
  };
}

