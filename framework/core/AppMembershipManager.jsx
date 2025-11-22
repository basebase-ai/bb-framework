/**
 * AppMembershipManager
 * 
 * Framework-level component that automatically manages app membership for all users.
 * Wraps every app and ensures membership records are created/updated before rendering.
 * 
 * App developers don't need to use this - it's automatic!
 */

import React from 'react';
import { useAppMembership } from '../hooks/useAppMembership.js';

export function AppMembershipManager({ appId, children }) {
  const { membership, loading, error, hasAccess } = useAppMembership(appId);

  // Still checking membership
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f8f9fa',
        color: '#495057',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e9ecef',
          borderTopColor: '#228be6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem',
        }}></div>
        <div style={{ fontSize: '1.125rem', fontWeight: '500' }}>
          Loading app...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error or no access
  if (error || !hasAccess) {
    const errorMessage = error?.message || 'Access denied. You do not have permission to access this app.';
    const isInviteOnly = errorMessage.includes('invitation');
    
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f8f9fa',
        padding: '2rem',
      }}>
        <div style={{
          maxWidth: '600px',
          padding: '2rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h1 style={{
            color: '#fa5252',
            margin: '0 0 1rem',
            fontSize: '1.5rem',
          }}>
            {isInviteOnly ? 'Access Restricted' : 'Error Loading App'}
          </h1>
          <p style={{
            color: '#495057',
            margin: '0 0 1rem',
            lineHeight: '1.6',
          }}>
            {errorMessage}
          </p>
          {isInviteOnly && (
            <p style={{
              color: '#868e96',
              margin: '0',
              fontSize: '0.875rem',
              lineHeight: '1.6',
            }}>
              Please contact the app owner to request access.
            </p>
          )}
          {error && (
            <details style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '4px',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                Technical Details
              </summary>
              <pre style={{
                margin: '1rem 0 0',
                padding: '0',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                color: '#212529',
              }}>
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  // User has access - render the app!
  console.log(`✅ User has access to app "${appId}" (role: ${membership?.role}, tier: ${membership?.tier})`);
  return <>{children}</>;
}

