/**
 * Route hook for accessing current route information
 * 
 * Usage:
 *   const { path, params, query, navigate, replace, back } = useRoute();
 *   
 *   // Access route parameters (from /post/:slug)
 *   console.log(params.slug);
 *   
 *   // Access query string (?edit=true)
 *   console.log(query.edit);
 *   
 *   // Navigate programmatically
 *   navigate("/post/my-slug");
 *   navigate("/search", { query: { q: "hello" } });
 */

import { useState, useEffect, useContext, createContext, useCallback } from "react";

/**
 * @typedef {Object} RouteContextValue
 * @property {string} path - Current pathname
 * @property {Record<string, string>} params - Route parameters extracted from path
 * @property {Record<string, string>} query - Query string parameters
 * @property {(path: string, options?: { query?: Record<string, string>, replace?: boolean }) => void} navigate - Navigate to a new path
 * @property {(path: string, options?: { query?: Record<string, string> }) => void} replace - Replace current history entry
 * @property {() => void} back - Go back in history
 * @property {() => void} forward - Go forward in history
 */

/** @type {React.Context<RouteContextValue | null>} */
export const RouteContext = createContext(null);

/**
 * Parse query string into object
 * @param {string} search - Query string including ?
 * @returns {Record<string, string>}
 */
export function parseQueryString(search) {
  /** @type {Record<string, string>} */
  const query = {};
  if (!search || search === "?") return query;
  
  const params = new URLSearchParams(search);
  params.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}

/**
 * Build query string from object
 * @param {Record<string, string>} query
 * @returns {string}
 */
export function buildQueryString(query) {
  const entries = Object.entries(query).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries).toString();
}

/**
 * Match a path pattern against a pathname
 * Supports:
 *   - Exact: /about
 *   - Params: /post/:slug
 *   - Optional params: /edit/:slug?
 *   - Wildcards: /files/*
 * 
 * @param {string} pattern - Route pattern
 * @param {string} pathname - Current pathname
 * @returns {{ match: boolean, params: Record<string, string> }}
 */
export function matchPath(pattern, pathname) {
  /** @type {Record<string, string>} */
  const params = {};
  
  // Normalize paths (remove trailing slashes except for root)
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const normalizedPattern = pattern === "/" ? "/" : pattern.replace(/\/+$/, "");
  
  // Handle wildcard routes
  if (normalizedPattern.endsWith("/*")) {
    const prefix = normalizedPattern.slice(0, -2);
    if (normalizedPath === prefix || normalizedPath.startsWith(prefix + "/")) {
      params["*"] = normalizedPath.slice(prefix.length + 1) || "";
      return { match: true, params };
    }
    return { match: false, params: {} };
  }
  
  // Handle catch-all wildcard
  if (normalizedPattern === "*") {
    params["*"] = normalizedPath;
    return { match: true, params };
  }
  
  // Split into segments
  const patternParts = normalizedPattern.split("/").filter(Boolean);
  const pathParts = normalizedPath.split("/").filter(Boolean);
  
  // Check if pattern has optional params at the end
  const hasOptionalEnd = patternParts.length > 0 && 
    patternParts[patternParts.length - 1].endsWith("?");
  
  // Calculate min required segments
  let minRequired = patternParts.filter(p => !p.endsWith("?")).length;
  
  // Path must have at least minRequired segments and at most pattern length
  if (pathParts.length < minRequired || 
      (!hasOptionalEnd && pathParts.length > patternParts.length)) {
    // Allow if pattern has optional params and path is shorter
    if (!hasOptionalEnd || pathParts.length > patternParts.length) {
      return { match: false, params: {} };
    }
  }
  
  // Match each segment
  for (let i = 0; i < patternParts.length; i++) {
    let patternPart = patternParts[i];
    const pathPart = pathParts[i];
    const isOptional = patternPart.endsWith("?");
    
    if (isOptional) {
      patternPart = patternPart.slice(0, -1); // Remove ?
    }
    
    // Check if this is a parameter
    if (patternPart.startsWith(":")) {
      const paramName = patternPart.slice(1);
      if (pathPart !== undefined) {
        params[paramName] = decodeURIComponent(pathPart);
      } else if (!isOptional) {
        return { match: false, params: {} };
      }
      // Optional param without value is fine
    } else {
      // Literal segment must match
      if (pathPart !== patternPart) {
        if (isOptional && pathPart === undefined) {
          // Optional literal not present - that's okay
          continue;
        }
        return { match: false, params: {} };
      }
    }
  }
  
  // Make sure we consumed all path parts (unless pattern allows more via optional)
  if (pathParts.length > patternParts.length) {
    return { match: false, params: {} };
  }
  
  return { match: true, params };
}

/**
 * Hook to access route context
 * Must be used inside an AppRouter
 * @returns {RouteContextValue}
 */
export function useRoute() {
  const context = useContext(RouteContext);
  
  if (!context) {
    // Fallback for components not inside AppRouter - use basic routing
    console.warn("[useRoute] Used outside of AppRouter. Using fallback behavior.");
    return useFallbackRoute();
  }
  
  return context;
}

/**
 * Fallback route hook when not inside AppRouter
 * Provides basic functionality without route matching
 * @returns {RouteContextValue}
 */
function useFallbackRoute() {
  const [path, setPath] = useState(window.location.pathname);
  const [query, setQuery] = useState(() => parseQueryString(window.location.search));
  
  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
      setQuery(parseQueryString(window.location.search));
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  
  const navigate = useCallback((/** @type {string} */ newPath, options = {}) => {
    const queryStr = options.query ? buildQueryString(options.query) : "";
    const fullPath = newPath + queryStr;
    
    if (options.replace) {
      window.history.replaceState({}, "", fullPath);
    } else {
      window.history.pushState({}, "", fullPath);
    }
    setPath(newPath);
    setQuery(options.query || {});
  }, []);
  
  const replace = useCallback((/** @type {string} */ newPath, options = {}) => {
    navigate(newPath, { ...options, replace: true });
  }, [navigate]);
  
  const back = useCallback(() => {
    window.history.back();
  }, []);
  
  const forward = useCallback(() => {
    window.history.forward();
  }, []);
  
  return {
    path,
    params: {},
    query,
    navigate,
    replace,
    back,
    forward,
  };
}

