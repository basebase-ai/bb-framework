/**
 * Production Entry Point
 * Dynamically loads app code from Firestore based on URL
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase.config.js';
import { getAppIdFromURL } from './loader/url-parser.js';
import { AppLoader } from './loader/app-loader.js';

// Import all framework hooks and utilities that apps might need
import { useAuth } from './hooks/useAuth.js';
import { useCollection } from './hooks/useCollection.js';
import { useDocument } from './hooks/useDocument.js';

// Show loading screen
function showLoading(message = 'Loading...') {
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f8f9fa;
      color: #495057;
    ">
      <div style="
        text-align: center;
        padding: 2rem;
      ">
        <div style="
          width: 48px;
          height: 48px;
          border: 4px solid #e9ecef;
          border-top-color: #228be6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        "></div>
        <div style="font-size: 1.125rem; font-weight: 500;">${message}</div>
      </div>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
}

// Show error screen
function showError(title, message, details) {
  document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f8f9fa;
      padding: 2rem;
    ">
      <div style="
        max-width: 600px;
        padding: 2rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <h1 style="
          color: #fa5252;
          margin: 0 0 1rem;
          font-size: 1.5rem;
        ">${title}</h1>
        <p style="
          color: #495057;
          margin: 0 0 1rem;
          line-height: 1.6;
        ">${message}</p>
        ${details ? `
          <details style="
            margin-top: 1rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 4px;
          ">
            <summary style="cursor: pointer; font-weight: 500;">Technical Details</summary>
            <pre style="
              margin: 1rem 0 0;
              padding: 0;
              font-size: 0.875rem;
              white-space: pre-wrap;
              word-wrap: break-word;
            ">${details}</pre>
          </details>
        ` : ''}
      </div>
    </div>
  `;
}

// Main initialization
async function init() {
  try {
    // Get app ID from URL
    const appId = getAppIdFromURL();
    
    if (!appId) {
      showError(
        'App Not Found',
        'No app ID specified in the URL.',
        'Please access this site using a valid app URL (e.g., your-app.basebase.io or basebase.io/your-app)'
      );
      return;
    }
    
    showLoading(`Loading ${appId}...`);
    
    // Initialize Firebase
    const firebaseApp = initializeApp(firebaseConfig);
    const auth = getAuth(firebaseApp);
    
    // Create app loader
    const loader = new AppLoader(firebaseApp);
    
    // Create framework exports that will be available to app code
    const frameworkExports = {
      useAuth: { useAuth },
      useCollection: { useCollection },
      useDocument: { useDocument },
      // Add more as needed
    };
    
    // Load and execute app
    const { appModule, appData, versionHash } = await loader.loadAndExecute(
      appId,
      frameworkExports
    );
    
    console.log(`✅ App loaded successfully`);
    console.log(`   Name: ${appData.name || appId}`);
    console.log(`   Version: ${versionHash}`);
    
    // The app module should have already mounted itself to the DOM
    // (via ReactDOM.render in its entry point)
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showError(
      'Failed to Load App',
      'An error occurred while loading the application.',
      error.stack || error.message
    );
  }
}

// Start the app
init();

