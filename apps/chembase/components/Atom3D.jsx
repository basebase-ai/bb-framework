import React, { useState, useEffect, useRef, useMemo } from "react";
import { Box, Text, Button, Group } from "@mantine/core";
import { Icon3dRotate, IconAtom } from "@tabler/icons-react";

export function Atom3D({ protons, neutrons, electrons, showShells = true }) {
  const [rotation, setRotation] = useState({ x: -15, y: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [electronsMoving, setElectronsMoving] = useState(true);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Auto-rotation loop
  useEffect(() => {
    let animationFrame;
    const animate = () => {
      if (autoRotate && !isDragging) {
        setRotation(prev => ({ ...prev, y: prev.y + 0.2 }));
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [autoRotate, isDragging]);

  // Handle rotation via mouse drag
  const handleMouseDown = (e) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    
    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x + deltaY * 0.5)), // Clamp pitch
      y: prev.y + deltaX * 0.5
    }));
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsDragging(false);

  // --- ADVANCED NUCLEUS SIMULATION ---
  const particles = useMemo(() => {
    const totalParticles = protons + neutrons;
    const p = [];
    
    // 1. Initialize with random positions in a small cloud
    for (let i = 0; i < totalParticles; i++) {
      p.push({
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10,
        type: i < protons ? 'proton' : 'neutron',
        id: i,
        // Random jitter phase for animation
        delay: Math.random() * 2,
        duration: 0.5 + Math.random() * 0.5
      });
    }

    // 2. Physics Simulation (Repulsion + Centering)
    // We run this instantly to find the "Stable State"
    const iterations = 80;
    const particleSize = 26; // Visual size
    const spacing = particleSize * 1.1; // Desired distance between centers
    const centeringForce = 0.02; // Gravity/Strong Force pulling to center

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < totalParticles; i++) {
        let p1 = p[i];
        
        // Pull to center
        p1.x -= p1.x * centeringForce;
        p1.y -= p1.y * centeringForce;
        p1.z -= p1.z * centeringForce;

        // Repel neighbors
        for (let j = 0; j < totalParticles; j++) {
          if (i === j) continue;
          let p2 = p[j];
          
          let dx = p1.x - p2.x;
          let dy = p1.y - p2.y;
          let dz = p1.z - p2.z;
          let distSq = dx*dx + dy*dy + dz*dz;
          
          // Avoid division by zero
          if (distSq < 0.1) distSq = 0.1;

          if (distSq < spacing * spacing) {
            let dist = Math.sqrt(distSq);
            // Force vector
            let force = (spacing - dist) / dist * 0.5; // Spring constant
            
            let fx = dx * force;
            let fy = dy * force;
            let fz = dz * force;

            // Apply force
            p1.x += fx;
            p1.y += fy;
            p1.z += fz;
            
            // Newton's 3rd law (optimization) - apply opposite to neighbor? 
            // Simplified: just apply to p1, p2 will get its turn or we can do both.
            // Doing one side is stable enough for this visual.
          }
        }
      }
    }

    // 3. Sort by Z for painter's algorithm (rough depth sorting)
    return p.sort((a, b) => b.z - a.z); 
  }, [protons, neutrons]);

  // Billboarding: Counter-rotate to face screen
  const billboardTransform = `rotateY(${-rotation.y}deg) rotateX(${-rotation.x}deg)`;

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: "100%", 
        height: "500px", 
        perspective: "1000px",
        backgroundColor: "#050505", // Deep space black
        cursor: isDragging ? "grabbing" : "grab",
        overflow: "hidden",
        borderRadius: "12px",
        position: "relative",
        userSelect: "none",
        border: "1px solid #333"
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls Overlay */}
      <Group style={{ position: "absolute", top: 15, right: 15, zIndex: 10 }}>
        <Button 
          size="xs" 
          variant={electronsMoving ? "filled" : "default"} 
          color={electronsMoving ? "yellow" : "gray"}
          onClick={() => setElectronsMoving(!electronsMoving)}
          leftSection={<IconAtom size={14} />}
          radius="xl"
        >
          {electronsMoving ? "Motion: ON" : "Motion: OFF"}
        </Button>
        <Button 
          size="xs" 
          variant={autoRotate ? "filled" : "default"} 
          color={autoRotate ? "blue" : "gray"}
          onClick={() => setAutoRotate(!autoRotate)}
          leftSection={<Icon3dRotate size={14} />}
          radius="xl"
        >
          {autoRotate ? "Spinning" : "Paused"}
        </Button>
      </Group>

      <div
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transition: isDragging ? "none" : "transform 0.1s linear",
          position: "relative"
        }}
      >
        {/* Center Point */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transformStyle: "preserve-3d" }}>
          
          {/* NUCLEUS PARTICLES */}
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                transformStyle: "preserve-3d",
                // 1. Translate to physics position
                // 2. Apply Jitter (Translate)
                // 3. Billboard (Rotate)
                // Note: We apply jitter via CSS animation to avoid re-renders
                transform: `translate3d(${p.x}px, ${p.y}px, ${p.z}px)`, 
                zIndex: Math.floor(p.z * 10)
              }}
            >
              {/* The Visible Particle (Billboarding applied here) */}
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  transform: billboardTransform, // Face camera
                  background: p.type === 'proton' 
                    ? "radial-gradient(circle at 35% 35%, #ff8787, #e03131, #670909)" // Deep red 3D
                    : "radial-gradient(circle at 35% 35%, #f1f3f5, #adb5bd, #495057)", // Deep gray 3D
                  boxShadow: p.type === 'proton'
                    ? "0 0 15px rgba(255, 0, 0, 0.4), inset 0 0 5px rgba(0,0,0,0.5)"
                    : "0 0 10px rgba(255, 255, 255, 0.2), inset 0 0 5px rgba(0,0,0,0.5)",
                  animation: `jitter ${p.duration}s ease-in-out infinite alternate`,
                  animationDelay: `-${p.delay}s`
                }}
              >
                 {/* Symbol Text (Optional, maybe too small) */}
                 {/* <div style={{ textAlign: 'center', lineHeight: '26px', fontSize: '10px', opacity: 0.7, color: 'white', fontWeight: 'bold' }}>
                   {p.type === 'proton' ? '+' : ''}
                 </div> */}
              </div>
            </div>
          ))}

          {/* ELECTRON SHELLS */}
          {showShells && Array.from({ length: electrons }).map((_, i) => {
            let shellRadius = 110;
            let speed = 5;
            
            if (i >= 2) { shellRadius = 180; speed = 7; }
            if (i >= 10) { shellRadius = 250; speed = 9; }
            if (i >= 18) { shellRadius = 320; speed = 11; }

            // Golden Angle distribution for natural looking orbits
            const orbitTiltX = (i * 180 / Math.PI); 
            const orbitTiltY = (i * 137.5); // 137.5 is golden angle

            return (
              <div
                key={`shell-${i}`}
                style={{
                  position: "absolute",
                  transformStyle: "preserve-3d",
                  transform: `rotateX(${orbitTiltX}deg) rotateY(${orbitTiltY}deg)`
                }}
              >
                {/* Orbit Ring (Faint) */}
                <div style={{
                  position: "absolute",
                  top: -shellRadius,
                  left: -shellRadius,
                  width: shellRadius * 2,
                  height: shellRadius * 2,
                  borderRadius: "50%",
                  border: "1px solid rgba(51, 154, 240, 0.15)", 
                  boxShadow: "0 0 20px rgba(51, 154, 240, 0.05)",
                  transform: "rotateX(90deg)",
                  pointerEvents: "none"
                }} />

                {/* Electron */}
                <div style={{
                  position: "absolute",
                  top: 0, left: 0,
                  transformStyle: "preserve-3d",
                  animation: `spin ${speed}s linear infinite`,
                  animationPlayState: electronsMoving ? "running" : "paused",
                  animationDelay: `-${i * 2}s` // Offset starts
                }}
                >
                  <div style={{
                    position: "absolute",
                    transform: `translateX(${shellRadius}px)`,
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    // Billboard the electron too!
                    // Actually for electrons, a simple glowing sphere look works from all angles usually,
                    // but billboarding ensures the highlight stays correct.
                    // For performance with deep nesting, let's skip billboard on electron (it's fast moving)
                    // and just use a strong radial gradient.
                    background: "radial-gradient(circle at 40% 40%, #fff, #fcc419, #e67700)",
                    boxShadow: "0 0 15px #fcc419, 0 0 30px rgba(255, 212, 59, 0.4)",
                  }} />
                </div>
              </div>
            );
          })}

        </div>
      </div>

      <Text 
        c="dimmed" 
        size="sm" 
        style={{ 
          position: "absolute", 
          bottom: 20, 
          width: "100%",
          textAlign: "center",
          pointerEvents: "none",
          opacity: 0.7,
          letterSpacing: "1px"
        }}
      >
        DRAG TO ROTATE
      </Text>

      <style>{`
        @keyframes spin {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        @keyframes jitter {
          0% { transform: translate3d(0,0,0) ${billboardTransform}; }
          100% { transform: translate3d(1.5px, 1.5px, 0) ${billboardTransform}; }
        }
      `}</style>
    </div>
  );
}
