/**
 * Basebase Homepage Design Gallery
 * 5 distinct homepage concepts for evaluation
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";

// ============================================================================
// DESIGN 1: "Sunrise Warmth" - Light, warm, friendly (inspired by Lovable/Base44)
// ============================================================================
function Design1Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FFFAF5 0%, #FFF4ED 40%, #FFE8D6 100%)',
      fontFamily: "'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Fun background shapes */}
      <div style={{
        position: 'absolute',
        top: '5%',
        right: '10%',
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(251, 146, 60, 0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: '5%',
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(248, 113, 113, 0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(50px)',
      }} />

      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 48px',
        maxWidth: 1400,
        margin: '0 auto',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #F97316, #EF4444)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: 'white',
          }}>✦</div>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#7C2D12' }}>Basebase</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <a href="#" style={{ color: '#9A3412', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>Apps</a>
          <a href="#" style={{ color: '#9A3412', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>Pricing</a>
          <a href="#" style={{ color: '#9A3412', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>Docs</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '10px 20px', border: 'none', background: 'transparent', color: '#7C2D12', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Sign In</button>
          <button style={{ padding: '12px 26px', border: 'none', background: 'linear-gradient(135deg, #F97316, #EF4444)', color: 'white', borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)' }}>Get Started Free</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 24px 60px', maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          background: 'white',
          borderRadius: 50,
          marginBottom: 28,
          fontSize: 15,
          color: '#EA580C',
          fontWeight: 600,
          boxShadow: '0 4px 20px rgba(249, 115, 22, 0.15)',
        }}>
          <span style={{ fontSize: 18 }}>🎉</span> Join 10,000+ creators building apps
        </div>
        <h1 style={{
          fontSize: 58,
          fontWeight: 700,
          color: '#7C2D12',
          lineHeight: 1.1,
          marginBottom: 24,
          letterSpacing: '-0.02em',
        }}>
          Build apps that<br />
          <span style={{
            background: 'linear-gradient(135deg, #F97316, #EF4444, #DC2626)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>just work ✨</span>
        </h1>
        <p style={{ fontSize: 20, color: '#9A3412', lineHeight: 1.6, marginBottom: 40, maxWidth: 550, margin: '0 auto 40px', opacity: 0.85 }}>
          Skip the boring stuff. Describe what you want and get a real, working app in minutes. It's actually fun!
        </p>

        {/* Chat Input */}
        <div style={{
          background: 'white',
          borderRadius: 24,
          padding: 8,
          boxShadow: '0 8px 32px rgba(249, 115, 22, 0.15)',
          maxWidth: 560,
          margin: '0 auto 32px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px' }}>
            <span style={{ fontSize: 22 }}>💭</span>
            <input
              type="text"
              placeholder="What do you want to create today?"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: '#7C2D12' }}
            />
            <button style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #F97316, #EF4444)',
              border: 'none',
              borderRadius: 16,
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
            }}>Create →</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['🚀 Quick start', '💰 Free forever', '🎨 Beautiful apps'].map((tag, i) => (
            <span key={i} style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 20,
              fontSize: 14,
              color: '#C2410C',
              fontWeight: 500,
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Solution Gallery */}
      <div style={{ padding: '50px 48px', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.05em', color: '#EA580C', marginBottom: 28, textAlign: 'center' }}>
          ✨ FROM THE COMMUNITY
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            { name: 'CRM Dashboard', emoji: '📊', bg: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)' },
            { name: 'Habit Tracker', emoji: '🎯', bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' },
            { name: 'Team Wiki', emoji: '📚', bg: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)' },
            { name: 'Event Planner', emoji: '🎉', bg: 'linear-gradient(135deg, #FEE2E2, #FECACA)' },
          ].map((app, i) => (
            <div key={i} style={{
              background: 'white',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}>
              <div style={{
                height: 90,
                background: app.bg,
                borderRadius: 14,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
              }}>{app.emoji}</div>
              <h3 style={{ fontSize: 16, color: '#7C2D12', marginBottom: 4, fontWeight: 600 }}>{app.name}</h3>
              <p style={{ fontSize: 13, color: '#EA580C', opacity: 0.7 }}>Free to use ✓</p>
            </div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #F97316, #EF4444)',
        color: 'white',
        border: 'none',
        borderRadius: 50,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
        zIndex: 100,
        boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
      }}>← Back to Gallery</button>
    </div>
  );
}

// ============================================================================
// DESIGN 2: "Midnight Developer" - Dark, green accent (inspired by Neon/Supabase)
// ============================================================================
function Design2Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 48px',
        maxWidth: 1400,
        margin: '0 auto',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#10B981', borderRadius: 6 }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>Basebase</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: 14 }}>Product</a>
          <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: 14 }}>Community</a>
          <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: 14 }}>Pricing</a>
          <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: 14 }}>Docs</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '10px 20px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>Sign In</button>
          <button style={{ padding: '10px 24px', border: 'none', background: '#10B981', color: 'white', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Start Building</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '120px 24px 80px', maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 64,
          fontWeight: 700,
          color: 'white',
          lineHeight: 1.1,
          marginBottom: 24,
          letterSpacing: '-0.03em',
        }}>
          Build in minutes.<br />
          <span style={{ color: '#10B981' }}>Deploy instantly.</span>
        </h1>
        <p style={{ fontSize: 20, color: '#71717A', lineHeight: 1.6, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
          Everything pre-connected. Database, auth, APIs, AI—all wired up and ready. Just describe your app and go.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 80 }}>
          <button style={{
            padding: '16px 32px',
            background: '#10B981',
            border: 'none',
            color: 'white',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
          }}>Start Building Free →</button>
          <button style={{
            padding: '16px 32px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            borderRadius: 8,
            fontSize: 16,
            cursor: 'pointer',
          }}>View Gallery</button>
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, textAlign: 'left' }}>
          {[
            { icon: '⚡', title: 'Zero Config', desc: 'No API keys to copy. No services to connect. It just works.' },
            { icon: '🌍', title: '1000+ Apps', desc: 'Browse and remix community apps. Free to use and customize.' },
            { icon: '🚀', title: 'Production Ready', desc: 'Real apps, real users. Share with colleagues in minutes.' },
          ].map((f, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: 24,
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, color: 'white', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#71717A', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '10px 20px',
        background: '#10B981',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        zIndex: 100,
      }}>← Back to Gallery</button>
    </div>
  );
}

// ============================================================================
// DESIGN 3: "Electric Creative" - Dark, orange/vibrant (inspired by Replit)
// ============================================================================
function Design3Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#18181B',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 48px',
        maxWidth: 1400,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#F97316', borderRadius: 4 }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>basebase</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: 14 }}>Explore</a>
          <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: 14 }}>Create</a>
          <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: 14 }}>Learn</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '10px 20px', border: 'none', background: 'transparent', color: 'white', fontSize: 14, cursor: 'pointer' }}>Log in</button>
          <button style={{ padding: '10px 24px', border: 'none', background: '#F97316', color: 'white', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Sign up</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '100px 24px 60px', maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 52,
          fontWeight: 600,
          color: 'white',
          lineHeight: 1.2,
          marginBottom: 20,
        }}>
          Turn your ideas into apps
        </h1>
        <p style={{ fontSize: 18, color: '#A1A1AA', lineHeight: 1.6, marginBottom: 48 }}>
          What will you create? The possibilities are endless.
        </p>

        {/* Interactive Prompt Builder */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 32,
          maxWidth: 700,
          margin: '0 auto 48px',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: 24, color: '#71717A', lineHeight: 1.8 }}>
            Make me <span style={{ color: 'white', borderBottom: '2px solid #F97316' }}>a productivity tool</span><br />
            for <span style={{ color: 'white', borderBottom: '2px solid #8B5CF6' }}>small teams</span><br />
            that helps <span style={{ color: 'white', borderBottom: '2px solid #10B981' }}>track tasks and deadlines</span>
          </p>
          <button style={{
            marginTop: 24,
            padding: '14px 28px',
            background: 'white',
            border: 'none',
            color: '#18181B',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>Start building with AI ▶</button>
        </div>

        <p style={{ fontSize: 14, color: '#52525B' }}>
          Loved by 50,000+ creators • No coding required
        </p>
      </div>

      {/* Floating App Previews */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        padding: '0 48px',
        perspective: '1000px',
      }}>
        {[
          { bg: '#EDE9FE', title: 'Budget Tracker' },
          { bg: '#D1FAE5', title: 'Team Dashboard' },
          { bg: '#FEE2E2', title: 'Recipe App' },
        ].map((app, i) => (
          <div key={i} style={{
            width: 200,
            height: 280,
            background: app.bg,
            borderRadius: 12,
            padding: 16,
            transform: `rotateY(${(i - 1) * 5}deg) translateZ(${i === 1 ? 20 : 0}px)`,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={{ height: 20, background: 'rgba(0,0,0,0.1)', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 60, background: 'rgba(0,0,0,0.05)', borderRadius: 8, marginBottom: 8 }} />
            <div style={{ height: 12, background: 'rgba(0,0,0,0.08)', borderRadius: 4, width: '80%', marginBottom: 4 }} />
            <div style={{ height: 12, background: 'rgba(0,0,0,0.08)', borderRadius: 4, width: '60%' }} />
            <p style={{ marginTop: 12, fontSize: 12, color: '#52525B', fontWeight: 500 }}>{app.title}</p>
          </div>
        ))}
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '10px 20px',
        background: '#F97316',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        zIndex: 100,
      }}>← Back to Gallery</button>
    </div>
  );
}

// ============================================================================
// DESIGN 4: "Clean Canvas" - Minimal white (inspired by Vercel)
// ============================================================================
function Design4Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 48px',
        maxWidth: 1400,
        margin: '0 auto',
        borderBottom: '1px solid #E5E5E5',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: '#000', borderRadius: 4 }} />
          <span style={{ fontSize: 18, fontWeight: 600, color: '#000' }}>Basebase</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          <a href="#" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>Apps</a>
          <a href="#" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>Docs</a>
          <a href="#" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>Pricing</a>
          <a href="#" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>Enterprise</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '8px 16px', border: '1px solid #E5E5E5', background: 'white', color: '#000', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>Log In</button>
          <button style={{ padding: '8px 16px', border: 'none', background: '#000', color: 'white', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>Sign Up</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '140px 24px 100px', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 64,
          fontWeight: 700,
          color: '#000',
          lineHeight: 1.1,
          marginBottom: 24,
          letterSpacing: '-0.04em',
        }}>
          Apps that work.<br />
          From day one.
        </h1>
        <p style={{ fontSize: 20, color: '#666', lineHeight: 1.6, marginBottom: 40, maxWidth: 540, margin: '0 auto 40px' }}>
          Basebase pre-connects your database, auth, APIs, and AI so you can ship in minutes, not months.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button style={{
            padding: '14px 28px',
            background: '#000',
            border: 'none',
            color: 'white',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>▲ Start Building</button>
          <button style={{
            padding: '14px 28px',
            background: 'white',
            border: '1px solid #E5E5E5',
            color: '#000',
            borderRadius: 8,
            fontSize: 15,
            cursor: 'pointer',
          }}>Browse 1,200+ Apps</button>
        </div>
      </div>

      {/* Feature Grid */}
      <div style={{ padding: '0 48px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#E5E5E5', border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { title: 'No API Keys', desc: 'All services pre-connected and ready to use' },
            { title: 'Community Apps', desc: 'Start from 1,200+ free, customizable templates' },
            { title: 'Enterprise Ready', desc: 'Production-grade apps for real teams' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'white', padding: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#000', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: '#FAFAFA', padding: '80px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', marginBottom: 48 }}>How It Works</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 80, maxWidth: 900, margin: '0 auto' }}>
          {[
            { num: '01', title: 'Describe', desc: 'Tell us what you want to build' },
            { num: '02', title: 'Generate', desc: 'AI creates your full-stack app' },
            { num: '03', title: 'Ship', desc: 'Share with your team instantly' },
          ].map((step, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>{step.num}</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#000', marginBottom: 4 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#666' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '10px 20px',
        background: '#000',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        zIndex: 100,
      }}>← Back to Gallery</button>
    </div>
  );
}

// ============================================================================
// DESIGN 5: "Gradient Dream" - Colorful, playful (inspired by Lovable's gradients)
// ============================================================================
function Design5Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EEF2FF 0%, #FCE7F3 50%, #FEF3C7 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Gradient blobs */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(167, 139, 250, 0.3) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(251, 146, 60, 0.25) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }} />

      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 48px',
        maxWidth: 1400,
        margin: '0 auto',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            borderRadius: 10,
          }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B' }}>Basebase</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <a href="#" style={{ color: '#4B5563', textDecoration: 'none', fontSize: 15 }}>Discover</a>
          <a href="#" style={{ color: '#4B5563', textDecoration: 'none', fontSize: 15 }}>Create</a>
          <a href="#" style={{ color: '#4B5563', textDecoration: 'none', fontSize: 15 }}>Pricing</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '10px 20px', border: 'none', background: 'transparent', color: '#1E1B4B', fontSize: 15, cursor: 'pointer' }}>Log in</button>
          <button style={{ padding: '10px 24px', border: 'none', background: '#1E1B4B', color: 'white', borderRadius: 24, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '100px 24px 60px', maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: 'white',
          borderRadius: 24,
          marginBottom: 32,
          fontSize: 14,
          color: '#6366F1',
          fontWeight: 500,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <span style={{ fontSize: 16 }}>🎉</span> Now with AI superpowers
        </div>
        <h1 style={{
          fontSize: 60,
          fontWeight: 700,
          color: '#1E1B4B',
          lineHeight: 1.1,
          marginBottom: 24,
          letterSpacing: '-0.02em',
        }}>
          Create apps that<br />
          <span style={{
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>spark joy</span>
        </h1>
        <p style={{ fontSize: 20, color: '#6B7280', lineHeight: 1.6, marginBottom: 48 }}>
          No coding. No complexity. Just describe your dream app and watch it come to life. Share it with anyone in minutes.
        </p>

        {/* Chat Input */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          maxWidth: 600,
          margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
            <span style={{ fontSize: 20 }}>✨</span>
            <input
              type="text"
              placeholder="What would you like to create today?"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 17, color: '#1E1B4B' }}
            />
            <button style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              border: 'none',
              borderRadius: 16,
              color: 'white',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
            }}>Create</button>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['📊 Dashboard', '📝 Task Manager', '💬 Team Chat', '📅 Event Planner'].map((tag, i) => (
            <button key={i} style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 20,
              fontSize: 14,
              color: '#4B5563',
              cursor: 'pointer',
            }}>{tag}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 64,
        padding: '60px 24px',
        position: 'relative',
        zIndex: 10,
      }}>
        {[
          { num: '50,000+', label: 'Happy creators' },
          { num: '1,200+', label: 'Community apps' },
          { num: '< 5 min', label: 'Time to first app' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#1E1B4B' }}>{stat.num}</div>
            <div style={{ fontSize: 14, color: '#6B7280' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '10px 20px',
        background: '#1E1B4B',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        zIndex: 100,
      }}>← Back to Gallery</button>
    </div>
  );
}

// ============================================================================
// DESIGN 6: "Terminal Hacker" - Dark, monospace, CLI aesthetic
// ============================================================================
function Design6Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D1117',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', monospace",
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 48px',
        maxWidth: 1400,
        margin: '0 auto',
        borderBottom: '1px solid #30363D',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#3FB950', fontSize: 18 }}>▶</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF3' }}>basebase</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="#" style={{ color: '#8B949E', textDecoration: 'none', fontSize: 13 }}>~/apps</a>
          <a href="#" style={{ color: '#8B949E', textDecoration: 'none', fontSize: 13 }}>~/docs</a>
          <a href="#" style={{ color: '#8B949E', textDecoration: 'none', fontSize: 13 }}>~/pricing</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '8px 16px', border: '1px solid #30363D', background: 'transparent', color: '#E6EDF3', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>login</button>
          <button style={{ padding: '8px 16px', border: 'none', background: '#238636', color: 'white', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '100px 48px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <span style={{ color: '#8B949E', fontSize: 14 }}>$ describe your-app</span>
        </div>
        <h1 style={{
          fontSize: 48,
          fontWeight: 400,
          color: '#E6EDF3',
          lineHeight: 1.3,
          marginBottom: 24,
        }}>
          <span style={{ color: '#3FB950' }}>Build</span> production apps<br />
          <span style={{ color: '#58A6FF' }}>without</span> the boilerplate
        </h1>
        <p style={{ fontSize: 16, color: '#8B949E', lineHeight: 1.7, marginBottom: 40, maxWidth: 600 }}>
          Zero config. Zero API keys. Just describe what you need and ship it. Database, auth, and AI pre-connected.
        </p>

        {/* Terminal Input */}
        <div style={{
          background: '#161B22',
          border: '1px solid #30363D',
          borderRadius: 8,
          padding: 20,
          maxWidth: 600,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F85149' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#D29922' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3FB950' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#3FB950' }}>$</span>
            <input
              type="text"
              placeholder="basebase create 'a task tracker for my team'"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 14,
                color: '#E6EDF3',
                background: 'transparent',
                fontFamily: 'inherit',
              }}
            />
            <span style={{ color: '#3FB950', animation: 'blink 1s infinite' }}>▌</span>
          </div>
        </div>

        {/* Code Stats */}
        <div style={{ display: 'flex', gap: 40, marginTop: 48 }}>
          {[
            { label: 'apps.created', value: '50,000+' },
            { label: 'avg.deploy_time', value: '< 5min' },
            { label: 'community.size', value: '10k+' },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: 12, color: '#58A6FF' }}>{stat.label}</div>
              <div style={{ fontSize: 24, color: '#E6EDF3', fontWeight: 500 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '10px 20px',
        background: '#238636',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        zIndex: 100,
      }}>← back</button>
    </div>
  );
}

// ============================================================================
// DESIGN 7: "Soft Cloud" - Light, pastel, calming
// ============================================================================
function Design7Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 50%, #F5F3FF 100%)',
      fontFamily: "'DM Sans', 'Inter', -apple-system, sans-serif",
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 48px',
        maxWidth: 1400,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 20,
          }}>☁</div>
          <span style={{ fontSize: 22, fontWeight: 600, color: '#1E3A5F' }}>Basebase</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <a href="#" style={{ color: '#64748B', textDecoration: 'none', fontSize: 15 }}>Explore</a>
          <a href="#" style={{ color: '#64748B', textDecoration: 'none', fontSize: 15 }}>Create</a>
          <a href="#" style={{ color: '#64748B', textDecoration: 'none', fontSize: 15 }}>Learn</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '12px 24px', border: 'none', background: 'white', color: '#1E3A5F', borderRadius: 50, fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>Sign in</button>
          <button style={{ padding: '12px 28px', border: 'none', background: 'linear-gradient(135deg, #60A5FA, #A78BFA)', color: 'white', borderRadius: 50, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Start free</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '100px 24px 80px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          background: 'white',
          borderRadius: 50,
          marginBottom: 32,
          fontSize: 14,
          color: '#7C3AED',
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}>
          <span>💫</span> Your apps, effortlessly
        </div>
        <h1 style={{
          fontSize: 56,
          fontWeight: 700,
          color: '#1E3A5F',
          lineHeight: 1.15,
          marginBottom: 24,
        }}>
          Build with ease.<br />
          <span style={{
            background: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Share with joy.</span>
        </h1>
        <p style={{ fontSize: 19, color: '#64748B', lineHeight: 1.7, marginBottom: 40 }}>
          Everything you need is already connected. Just describe your idea and watch it become a real, working app you can share with anyone.
        </p>

        {/* Soft Input */}
        <div style={{
          background: 'white',
          borderRadius: 24,
          padding: 10,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          maxWidth: 560,
          margin: '0 auto 32px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px' }}>
            <span style={{ fontSize: 24, opacity: 0.5 }}>💭</span>
            <input
              type="text"
              placeholder="I want to build..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 17, color: '#1E3A5F' }}
            />
            <button style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
              border: 'none',
              borderRadius: 18,
              color: 'white',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
            }}>Create</button>
          </div>
        </div>

        {/* Floating cards preview */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 60 }}>
          {[
            { color: '#DBEAFE', icon: '📊', title: 'Analytics' },
            { color: '#E0E7FF', icon: '📝', title: 'Notes' },
            { color: '#FCE7F3', icon: '💬', title: 'Chat' },
          ].map((card, i) => (
            <div key={i} style={{
              width: 120,
              padding: 20,
              background: card.color,
              borderRadius: 20,
              textAlign: 'center',
              transform: `translateY(${i === 1 ? -10 : 0}px)`,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontSize: 14, color: '#1E3A5F', fontWeight: 500 }}>{card.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
        color: 'white',
        border: 'none',
        borderRadius: 50,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        zIndex: 100,
      }}>← Back</button>
    </div>
  );
}

// ============================================================================
// DESIGN 8: "Brutalist Code" - Light, bold monospace, raw
// ============================================================================
function Design8Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFDF5',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 48px',
        maxWidth: 1400,
        margin: '0 auto',
        borderBottom: '3px solid #000',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ color: '#FFFDF5', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18 }}>B</span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#000', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em' }}>BASEBASE</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <a href="#" style={{ color: '#000', textDecoration: 'none', fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>APPS</a>
          <a href="#" style={{ color: '#000', textDecoration: 'none', fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>DOCS</a>
          <a href="#" style={{ color: '#000', textDecoration: 'none', fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>PRICING</a>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '12px 24px', border: '3px solid #000', background: 'transparent', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>LOG IN</button>
          <button style={{ padding: '12px 24px', border: '3px solid #000', background: '#000', color: '#FFFDF5', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>START →</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '100px 48px 80px', maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 72,
          fontWeight: 900,
          color: '#000',
          lineHeight: 1.0,
          marginBottom: 32,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '-0.03em',
        }}>
          APPS THAT<br />
          <span style={{ background: '#FACC15', padding: '0 8px' }}>JUST WORK.</span>
        </h1>
        <p style={{ fontSize: 20, color: '#000', lineHeight: 1.6, marginBottom: 48, maxWidth: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          No config. No API keys. No BS.<br />
          Describe → Build → Ship.
        </p>

        {/* Code Block Input */}
        <div style={{
          background: '#000',
          padding: 24,
          maxWidth: 600,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>// What do you want to build?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#FACC15' }}>→</span>
            <input
              type="text"
              placeholder='"A CRM for my small business"'
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 16,
                color: '#fff',
                background: 'transparent',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginTop: 64, border: '3px solid #000' }}>
          {[
            { num: '1,200+', label: 'FREE APPS' },
            { num: '< 5 MIN', label: 'TO DEPLOY' },
            { num: '0', label: 'API KEYS NEEDED' },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: 32,
              borderRight: i < 2 ? '3px solid #000' : 'none',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#000', fontFamily: "'JetBrains Mono', monospace" }}>{stat.num}</div>
              <div style={{ fontSize: 12, color: '#666', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '10px 20px',
        background: '#000',
        color: '#FFFDF5',
        border: '3px solid #000',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        zIndex: 100,
      }}>← BACK</button>
    </div>
  );
}

// ============================================================================
// DESIGN 9: "Neon Nights" - Dark, cyberpunk, neon gradients
// ============================================================================
function Design9Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0F0F1A 0%, #1A0A2E 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow effects */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '30%',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute',
        top: '40%',
        right: '20%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 60%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
      }} />

      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 48px',
        maxWidth: 1400,
        margin: '0 auto',
        position: 'relative',
        zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)',
            borderRadius: 8,
          }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>basebase</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <a href="#" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 }}>Apps</a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 }}>Create</a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 }}>Pricing</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '10px 20px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Sign in</button>
          <button style={{ padding: '10px 24px', border: 'none', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '120px 24px 80px', maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <h1 style={{
          fontSize: 64,
          fontWeight: 700,
          color: 'white',
          lineHeight: 1.1,
          marginBottom: 24,
          letterSpacing: '-0.02em',
        }}>
          Build the future.<br />
          <span style={{
            background: 'linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Ship it tonight.</span>
        </h1>
        <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 48 }}>
          No APIs to configure. No databases to provision. Just pure creation. Describe your app and watch it materialize.
        </p>

        {/* Neon Input */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 8,
          maxWidth: 600,
          margin: '0 auto',
          boxShadow: '0 0 40px rgba(139, 92, 246, 0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
              boxShadow: '0 0 12px #8B5CF6',
            }} />
            <input
              type="text"
              placeholder="Describe your dream app..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: 'white', background: 'transparent' }}
            />
            <button style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
            }}>Create →</button>
          </div>
        </div>

        {/* Glowing feature pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 48 }}>
          {['Zero Config', 'Instant Deploy', 'AI-Powered'].map((feat, i) => (
            <div key={i} style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 50,
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)',
            }}>{feat}</div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        zIndex: 100,
      }}>← Back</button>
    </div>
  );
}

// ============================================================================
// DESIGN 10: "Paper Editorial" - Cream, serif, editorial feel
// ============================================================================
function Design10Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF9F6',
      fontFamily: "'Georgia', 'Times New Roman', serif",
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 64px',
        maxWidth: 1400,
        margin: '0 auto',
        borderBottom: '1px solid #E5E2DB',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28, fontWeight: 400, color: '#2D2A26', fontStyle: 'italic' }}>Basebase</span>
        </div>
        <div style={{ display: 'flex', gap: 40 }}>
          <a href="#" style={{ color: '#6B6760', textDecoration: 'none', fontSize: 15, fontFamily: "'JetBrains Mono', monospace" }}>Apps</a>
          <a href="#" style={{ color: '#6B6760', textDecoration: 'none', fontSize: 15, fontFamily: "'JetBrains Mono', monospace" }}>Docs</a>
          <a href="#" style={{ color: '#6B6760', textDecoration: 'none', fontSize: 15, fontFamily: "'JetBrains Mono', monospace" }}>About</a>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button style={{ padding: '10px 20px', border: 'none', background: 'transparent', color: '#2D2A26', fontSize: 15, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>Sign in</button>
          <button style={{ padding: '10px 24px', border: '1.5px solid #2D2A26', background: 'transparent', color: '#2D2A26', fontSize: 15, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '120px 64px 100px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{
          fontSize: 12,
          color: '#9B9690',
          marginBottom: 24,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          The app builder for everyone
        </div>
        <h1 style={{
          fontSize: 64,
          fontWeight: 400,
          color: '#2D2A26',
          lineHeight: 1.15,
          marginBottom: 32,
          fontStyle: 'italic',
          maxWidth: 700,
        }}>
          Ideas deserve to become real.
        </h1>
        <p style={{ fontSize: 22, color: '#6B6760', lineHeight: 1.7, marginBottom: 48, maxWidth: 550 }}>
          We've connected everything you need—database, authentication, AI—so you can focus on what matters: building something meaningful.
        </p>

        {/* Editorial Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingBottom: 16,
          borderBottom: '2px solid #2D2A26',
          maxWidth: 500,
        }}>
          <input
            type="text"
            placeholder="What would you like to create?"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 18,
              color: '#2D2A26',
              background: 'transparent',
              fontFamily: 'inherit',
              fontStyle: 'italic',
            }}
          />
          <button style={{
            padding: '12px 28px',
            background: '#2D2A26',
            border: 'none',
            color: '#FAF9F6',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
          }}>Begin →</button>
        </div>

        {/* Features in columns */}
        <div style={{ display: 'flex', gap: 64, marginTop: 80 }}>
          {[
            { title: 'Community', desc: 'Over 1,200 free apps built by creators like you. Use, remix, and make them your own.' },
            { title: 'Connected', desc: 'Database, auth, APIs, AI—all pre-wired and ready. No configuration required.' },
            { title: 'Instant', desc: 'From idea to shareable app in minutes. Real production apps, not prototypes.' },
          ].map((f, i) => (
            <div key={i} style={{ flex: 1 }}>
              <h3 style={{
                fontSize: 14,
                color: '#2D2A26',
                marginBottom: 12,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>{f.title}</h3>
              <p style={{ fontSize: 16, color: '#6B6760', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '10px 20px',
        background: '#2D2A26',
        color: '#FAF9F6',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        zIndex: 100,
      }}>← Back</button>
    </div>
  );
}

// ============================================================================
// DESIGN 11: "Apple Minimal" - Clean, sleek, premium whitespace
// ============================================================================
function Design11Full({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif",
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 48px',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#1D1D1F" />
            <path d="M7 12h10M12 7v10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <a href="#" style={{ color: '#1D1D1F', textDecoration: 'none', fontSize: 14, fontWeight: 400 }}>Apps</a>
          <a href="#" style={{ color: '#1D1D1F', textDecoration: 'none', fontSize: 14, fontWeight: 400 }}>Features</a>
          <a href="#" style={{ color: '#1D1D1F', textDecoration: 'none', fontSize: 14, fontWeight: 400 }}>Pricing</a>
        </div>
        <div>
          <a href="#" style={{ color: '#0066CC', textDecoration: 'none', fontSize: 14, fontWeight: 400 }}>Get started →</a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '140px 24px 100px', maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 80,
          fontWeight: 600,
          color: '#1D1D1F',
          lineHeight: 1.05,
          marginBottom: 20,
          letterSpacing: '-0.03em',
        }}>
          Basebase
        </h1>
        <p style={{
          fontSize: 28,
          fontWeight: 400,
          color: '#1D1D1F',
          lineHeight: 1.2,
          marginBottom: 16,
          letterSpacing: '-0.01em',
        }}>
          Build beautifully. Ship instantly.
        </p>
        <p style={{
          fontSize: 21,
          color: '#86868B',
          lineHeight: 1.4,
          marginBottom: 40,
          maxWidth: 500,
          margin: '0 auto 40px',
          fontWeight: 400,
        }}>
          Everything you need. Nothing you don't.
        </p>

        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
          <a href="#" style={{
            padding: '18px 32px',
            background: '#0066CC',
            color: 'white',
            borderRadius: 980,
            fontSize: 17,
            fontWeight: 400,
            textDecoration: 'none',
          }}>Start building</a>
          <a href="#" style={{
            padding: '18px 32px',
            color: '#0066CC',
            fontSize: 17,
            fontWeight: 400,
            textDecoration: 'none',
          }}>Watch the film ›</a>
        </div>
      </div>

      {/* Product showcase area */}
      <div style={{
        maxWidth: 1000,
        margin: '0 auto 120px',
        padding: '0 48px',
      }}>
        <div style={{
          background: 'linear-gradient(180deg, #FBFBFD 0%, #F5F5F7 100%)',
          borderRadius: 28,
          padding: '60px 60px 0',
          overflow: 'hidden',
        }}>
          {/* Mock app interface */}
          <div style={{
            background: 'white',
            borderRadius: '12px 12px 0 0',
            boxShadow: '0 50px 100px rgba(0,0,0,0.1)',
            padding: 24,
            minHeight: 300,
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ width: 200 }}>
                {['Dashboard', 'Projects', 'Team', 'Settings'].map((item, i) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: i === 0 ? '#F5F5F7' : 'transparent',
                    fontSize: 14,
                    color: i === 0 ? '#1D1D1F' : '#86868B',
                    marginBottom: 4,
                  }}>{item}</div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 24, width: 180, background: '#F5F5F7', borderRadius: 6, marginBottom: 16 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 100, background: '#F5F5F7', borderRadius: 12 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature highlights */}
      <div style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '0 48px 120px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {[
            { title: 'Zero configuration', desc: 'Database, auth, and AI—all connected. Start creating immediately.' },
            { title: 'Instant deployment', desc: 'Share your app in seconds. No servers to manage.' },
            { title: 'Beautiful by default', desc: 'Every app looks stunning. No design skills required.' },
          ].map((f, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <h3 style={{
                fontSize: 24,
                fontWeight: 600,
                color: '#1D1D1F',
                marginBottom: 12,
                letterSpacing: '-0.01em',
              }}>{f.title}</h3>
              <p style={{
                fontSize: 17,
                color: '#86868B',
                lineHeight: 1.5,
              }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Community section */}
      <div style={{
        background: '#F5F5F7',
        padding: '100px 48px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 48,
          fontWeight: 600,
          color: '#1D1D1F',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          Explore 1,200+ apps
        </h2>
        <p style={{
          fontSize: 21,
          color: '#86868B',
          marginBottom: 32,
        }}>
          Built by creators. Free to use and customize.
        </p>
        <a href="#" style={{
          color: '#0066CC',
          fontSize: 21,
          textDecoration: 'none',
        }}>Browse the gallery ›</a>
      </div>

      {/* Back button */}
      <button onClick={onBack} style={{
        position: 'fixed',
        top: 20,
        left: 20,
        padding: '12px 20px',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(20px)',
        color: 'white',
        border: 'none',
        borderRadius: 980,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 400,
        zIndex: 100,
      }}>← Back</button>
    </div>
  );
}

// ============================================================================
// Mini Preview Cards
// ============================================================================
function MiniPreview({ design, onClick }) {
  const { id, name, description, colors, accent } = design;

  return (
    <div
      onClick={onClick}
      style={{
        background: colors.bg,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)';
      }}
    >
      {/* Mini Homepage Preview */}
      <div style={{ padding: 16, minHeight: 200 }}>
        {/* Mini nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, background: accent, borderRadius: 4 }} />
            <div style={{ width: 50, height: 8, background: colors.text, borderRadius: 4, opacity: 0.7 }} />
          </div>
          <div style={{ width: 40, height: 16, background: accent, borderRadius: 8 }} />
        </div>

        {/* Mini headline */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: '80%', height: 12, background: colors.text, borderRadius: 4, margin: '0 auto 8px', opacity: 0.8 }} />
          <div style={{ width: '60%', height: 12, background: accent, borderRadius: 4, margin: '0 auto 16px' }} />
          <div style={{ width: '70%', height: 6, background: colors.text, borderRadius: 3, margin: '0 auto 4px', opacity: 0.3 }} />
          <div style={{ width: '50%', height: 6, background: colors.text, borderRadius: 3, margin: '0 auto', opacity: 0.3 }} />
        </div>

        {/* Mini input */}
        <div style={{
          width: '75%',
          height: 28,
          background: colors.input,
          borderRadius: 8,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 6px',
        }}>
          <div style={{ width: 20, height: 16, background: accent, borderRadius: 4 }} />
        </div>
      </div>

      {/* Card Footer */}
      <div style={{
        padding: '16px 20px',
        background: colors.footer || 'rgba(0,0,0,0.03)',
        borderTop: `1px solid ${colors.border || 'rgba(0,0,0,0.06)'}`,
      }}>
        <h3 style={{
          fontSize: 16,
          fontWeight: 600,
          color: colors.footerText || '#1a1a1a',
          marginBottom: 4,
        }}>{name}</h3>
        <p style={{ fontSize: 13, color: colors.footerSubtext || '#666', lineHeight: 1.4 }}>{description}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Gallery App
// ============================================================================
function Gallery() {
  const [selectedDesign, setSelectedDesign] = useState(null);

  const designs = [
    {
      id: 1,
      name: 'Sunrise Warmth',
      description: 'Warm orange & red. Fun, vibrant, and welcoming.',
      colors: {
        bg: 'linear-gradient(180deg, #FFFAF5 0%, #FFE8D6 100%)',
        text: '#7C2D12',
        accent: 'linear-gradient(135deg, #F97316, #EF4444)',
        input: 'white',
        footer: 'white',
        border: '#FED7AA',
        footerText: '#7C2D12',
        footerSubtext: '#EA580C',
      },
      accent: '#F97316',
    },
    {
      id: 2,
      name: 'Midnight Developer',
      description: 'Dark, professional, with vibrant green accents. Developer-focused.',
      colors: {
        bg: '#0A0A0A',
        text: 'white',
        accent: '#10B981',
        input: 'rgba(255,255,255,0.1)',
        footer: 'rgba(255,255,255,0.03)',
        border: 'rgba(255,255,255,0.1)',
        footerText: 'white',
        footerSubtext: '#71717A',
      },
      accent: '#10B981',
    },
    {
      id: 3,
      name: 'Electric Creative',
      description: 'Bold, vibrant, and energetic. Appeals to creative builders.',
      colors: {
        bg: '#18181B',
        text: 'white',
        accent: '#F97316',
        input: 'rgba(255,255,255,0.08)',
        footer: 'rgba(255,255,255,0.03)',
        border: 'rgba(255,255,255,0.1)',
        footerText: 'white',
        footerSubtext: '#A1A1AA',
      },
      accent: '#F97316',
    },
    {
      id: 4,
      name: 'Clean Canvas',
      description: 'Minimal white. Sophisticated and enterprise-ready.',
      colors: {
        bg: '#FFFFFF',
        text: '#000000',
        accent: '#000000',
        input: '#F5F5F5',
        footer: '#FAFAFA',
        border: '#E5E5E5',
        footerText: '#1a1a1a',
        footerSubtext: '#666',
      },
      accent: '#000000',
    },
    {
      id: 5,
      name: 'Gradient Dream',
      description: 'Colorful gradients, playful and joyful. Sparks creativity.',
      colors: {
        bg: 'linear-gradient(135deg, #EEF2FF 0%, #FCE7F3 50%, #FEF3C7 100%)',
        text: '#1E1B4B',
        accent: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
        input: 'white',
        footer: 'rgba(255,255,255,0.6)',
        border: 'rgba(139, 92, 246, 0.2)',
        footerText: '#1E1B4B',
        footerSubtext: '#6B7280',
      },
      accent: '#8B5CF6',
    },
    {
      id: 6,
      name: 'Terminal Hacker',
      description: 'Dark CLI aesthetic with monospace font. For the code-curious.',
      colors: {
        bg: '#0D1117',
        text: '#E6EDF3',
        accent: '#3FB950',
        input: '#161B22',
        footer: 'rgba(255,255,255,0.02)',
        border: '#30363D',
        footerText: '#E6EDF3',
        footerSubtext: '#8B949E',
      },
      accent: '#3FB950',
    },
    {
      id: 7,
      name: 'Soft Cloud',
      description: 'Pastel blues and lavenders. Calming and approachable.',
      colors: {
        bg: 'linear-gradient(180deg, #F0F9FF 0%, #F5F3FF 100%)',
        text: '#1E3A5F',
        accent: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
        input: 'white',
        footer: 'rgba(255,255,255,0.7)',
        border: '#E0E7FF',
        footerText: '#1E3A5F',
        footerSubtext: '#64748B',
      },
      accent: '#60A5FA',
    },
    {
      id: 8,
      name: 'Brutalist Code',
      description: 'Raw, bold monospace. High contrast and unapologetic.',
      colors: {
        bg: '#FFFDF5',
        text: '#000000',
        accent: '#FACC15',
        input: '#000000',
        footer: '#FFFDF5',
        border: '#000000',
        footerText: '#000000',
        footerSubtext: '#666',
      },
      accent: '#000000',
    },
    {
      id: 9,
      name: 'Neon Nights',
      description: 'Cyberpunk vibes with glowing gradients. Futuristic and bold.',
      colors: {
        bg: 'linear-gradient(180deg, #0F0F1A 0%, #1A0A2E 100%)',
        text: 'white',
        accent: 'linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)',
        input: 'rgba(255,255,255,0.05)',
        footer: 'rgba(255,255,255,0.02)',
        border: 'rgba(255,255,255,0.1)',
        footerText: 'white',
        footerSubtext: 'rgba(255,255,255,0.5)',
      },
      accent: '#8B5CF6',
    },
    {
      id: 10,
      name: 'Paper Editorial',
      description: 'Elegant serif meets monospace. Warm and editorial.',
      colors: {
        bg: '#FAF9F6',
        text: '#2D2A26',
        accent: '#2D2A26',
        input: '#FAF9F6',
        footer: '#F5F4F1',
        border: '#E5E2DB',
        footerText: '#2D2A26',
        footerSubtext: '#6B6760',
      },
      accent: '#2D2A26',
    },
    {
      id: 11,
      name: 'Apple Minimal',
      description: 'Premium, sleek, beautiful whitespace. Elegance refined.',
      colors: {
        bg: '#FFFFFF',
        text: '#1D1D1F',
        accent: '#0066CC',
        input: '#F5F5F7',
        footer: '#F5F5F7',
        border: '#E8E8ED',
        footerText: '#1D1D1F',
        footerSubtext: '#86868B',
      },
      accent: '#0066CC',
    },
  ];

  const FullComponents = {
    1: Design1Full,
    2: Design2Full,
    3: Design3Full,
    4: Design4Full,
    5: Design5Full,
    6: Design6Full,
    7: Design7Full,
    8: Design8Full,
    9: Design9Full,
    10: Design10Full,
    11: Design11Full,
  };

  if (selectedDesign) {
    const FullComponent = FullComponents[selectedDesign];
    return <FullComponent onBack={() => setSelectedDesign(null)} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '48px 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#0F172A',
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}>
            Basebase Homepage Concepts
          </h1>
          <p style={{ fontSize: 18, color: '#64748B', maxWidth: 600, margin: '0 auto' }}>
            11 distinct design directions. Click any card to see the full homepage.
          </p>
        </div>

        {/* Gallery Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {designs.map((design) => (
            <MiniPreview
              key={design.id}
              design={design}
              onClick={() => setSelectedDesign(design.id)}
            />
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          textAlign: 'center',
          marginTop: 48,
          padding: 24,
          background: 'white',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
        }}>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 8 }}>
            <strong style={{ color: '#0F172A' }}>Key Messaging:</strong>
          </p>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
            • <strong>For non-technical users:</strong> No stress, no coding, just describe and build<br />
            • <strong>Community:</strong> 1000+ free apps to use, remix, and customize<br />
            • <strong>Speed:</strong> Production-ready apps in minutes, share instantly<br />
            • <strong>Zero friction:</strong> No API keys, no sign-ups to other services—it just works
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Mount
// ============================================================================
const container = document.getElementById("app");
let root;

function render() {
  if (!root) {
    root = createRoot(container);
  }
  root.render(<Gallery />);
}

render();

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    render();
  });
}

export default Gallery;
