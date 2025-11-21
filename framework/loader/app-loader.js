/**
 * App Loader - Fetches and loads app code from Firestore
 */

import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { ModuleLoader } from './module-loader.js';

export class AppLoader {
  constructor(firebaseApp) {
    this.db = getFirestore(firebaseApp);
    this.cache = this.loadCache();
  }

  /**
   * Load cache from localStorage
   */
  loadCache() {
    try {
      const cached = localStorage.getItem('__app_cache');
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('Failed to load cache:', error);
      return {};
    }
  }

  /**
   * Save to cache
   */
  saveCache(appId, versionHash, modules) {
    try {
      this.cache[appId] = { versionHash, modules, cachedAt: Date.now() };
      localStorage.setItem('__app_cache', JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save cache:', error);
    }
  }

  /**
   * Check if we have a valid cached version
   */
  getCached(appId, versionHash) {
    const cached = this.cache[appId];
    if (cached && cached.versionHash === versionHash) {
      console.log(`✅ Using cached version: ${versionHash}`);
      return cached.modules;
    }
    return null;
  }

  /**
   * Fetch app metadata and code from Firestore
   */
  async loadApp(appId) {
    try {
      console.log(`📡 Loading app: ${appId}`);
      
      // Get app document
      const appRef = doc(this.db, 'apps', appId);
      const appSnap = await getDoc(appRef);
      
      if (!appSnap.exists()) {
        throw new Error(`App "${appId}" not found`);
      }
      
      const appData = appSnap.data();
      const versionHash = appData.currentVersion;
      
      if (!versionHash) {
        throw new Error(`App "${appId}" has no published version`);
      }
      
      console.log(`📦 Version: ${versionHash}`);
      
      // Check cache first
      const cached = this.getCached(appId, versionHash);
      if (cached) {
        return { appData, modules: cached, versionHash };
      }
      
      // Fetch version from Firestore
      const versionRef = doc(this.db, 'apps', appId, 'versions', versionHash);
      const versionSnap = await getDoc(versionRef);
      
      if (!versionSnap.exists()) {
        throw new Error(`Version "${versionHash}" not found`);
      }
      
      const versionData = versionSnap.data();
      const modules = versionData.compiled || {};
      
      console.log(`✅ Loaded ${Object.keys(modules).length} modules`);
      
      // Debug: Check for import.meta in any module
      Object.entries(modules).forEach(([path, code]) => {
        if (code.includes('import.meta')) {
          console.warn(`⚠️ Module ${path} still contains import.meta`);
          console.log('First 500 chars:', code.substring(0, 500));
        }
      });
      
      // Save to cache
      this.saveCache(appId, versionHash, modules);
      
      return { appData, modules, versionHash };
    } catch (error) {
      console.error('Failed to load app:', error);
      throw error;
    }
  }

  /**
   * Load and execute app
   */
  async loadAndExecute(appId, frameworkExports) {
    const { appData, modules, versionHash } = await this.loadApp(appId);
    
    // Create module loader
    const loader = new ModuleLoader(modules, frameworkExports);
    
    // Load entry point (app.js)
    const entryPoint = appData.metadata?.entry || 'app.js';
    console.log(`🚀 Executing entry point: ${entryPoint}`);
    
    const appModule = loader.loadEntry(entryPoint);
    
    return {
      appModule,
      appData,
      versionHash,
      loader,
    };
  }
}

