/**
 * Framework entry point
 * Initializes Firebase and loads the app
 */

// Import Firebase initialization first
import "./core/firebase-init.js";

// Dynamic import of the app entry point
// In development, Vite will handle this
// In production, this would load from Firestore
const loadApp = async () => {
  try {
    // For now, directly import the app
    // Later this will be replaced with dynamic loading from Firestore
    await import("/app/app.jsx");
  } catch (error) {
    console.error("Failed to load app:", error);
    document.getElementById("app").innerHTML = `
      <div style="padding: 2rem; font-family: system-ui;">
        <h1>Failed to load app</h1>
        <p>${error.message}</p>
      </div>
    `;
  }
};

loadApp();

