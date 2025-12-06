/**
 * SignatureMap - Displays a map with pins for all signature locations
 */

import React, { useEffect, useRef, useState } from "react";
import { Paper, Text, Group, Stack, Loader, Center, Badge } from "@mantine/core";
import { IconMapPin, IconSignature } from "@tabler/icons-react";

// Leaflet CSS and JS loaded dynamically
let leafletLoaded = false;
const loadLeaflet = async () => {
  if (leafletLoaded) return window.L;

  // Load Leaflet CSS
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);

  // Load Leaflet JS
  const script = document.createElement("script");
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  document.head.appendChild(script);

  await new Promise((resolve) => {
    script.onload = resolve;
  });

  leafletLoaded = true;
  return window.L;
};

/**
 * @typedef {Object} SignatureMapProps
 * @property {Array} signatures - All signatures to display on map
 * @property {Map} signerProfiles - Map of user profiles by ID
 */

/**
 * @param {SignatureMapProps} props
 */
export function SignatureMap({ signatures, signerProfiles }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter signatures that have location data
  const signaturesWithLocation = signatures?.filter(
    (sig) => sig.location?.latitude && sig.location?.longitude
  ) || [];

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        const L = await loadLeaflet();

        if (!isMounted || !mapRef.current) return;

        // Clean up existing map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        // Create map centered on US
        const map = L.map(mapRef.current, {
          center: [39.8283, -98.5795], // Center of US
          zoom: 4,
          scrollWheelZoom: true,
        });

        mapInstanceRef.current = map;

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        // Custom icon for signature pins
        const signatureIcon = L.divIcon({
          className: "signature-marker",
          html: `<div style="
            background: #228be6;
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          ">
            <span style="transform: rotate(45deg); color: white; font-size: 14px;">✍</span>
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30],
        });

        // Add markers for each signature with location
        const markers = [];
        signaturesWithLocation.forEach((sig) => {
          const { latitude, longitude, city, region, country } = sig.location;
          const profile = signerProfiles?.get?.(sig.signerId);
          
          const locationParts = [];
          if (city) locationParts.push(city);
          if (region) locationParts.push(region);
          if (country && !region) locationParts.push(country);
          const locationStr = locationParts.join(", ") || `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;

          const signedDate = sig.signedAt?.toDate 
            ? sig.signedAt.toDate().toLocaleDateString() 
            : new Date(sig.signedAt).toLocaleDateString();

          const marker = L.marker([latitude, longitude], { icon: signatureIcon })
            .addTo(map)
            .bindPopup(`
              <div style="min-width: 150px; max-width: 250px; word-wrap: break-word; overflow-wrap: break-word;">
                <strong>${profile?.displayName || sig.signerName}</strong><br/>
                <span style="color: #666; font-size: 12px;">${sig.signerEmail}</span><br/>
                <hr style="margin: 5px 0; border: none; border-top: 1px solid #eee;"/>
                <span style="font-style: italic; font-family: cursive;">"${sig.signatureText}"</span><br/>
                <span style="color: #666; font-size: 11px;">📍 ${locationStr}</span><br/>
                <span style="color: #666; font-size: 11px;">📅 ${signedDate}</span>
              </div>
            `, {
              maxWidth: 250,
              autoPanPadding: [20, 20],
              autoPanPaddingTopLeft: [20, 20],
              autoPanPaddingBottomRight: [20, 20],
            });

          markers.push(marker);
        });

        // Fit bounds to show all markers if there are any
        if (markers.length > 0) {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.1));
          
          // But don't zoom in too far
          if (map.getZoom() > 10) {
            map.setZoom(10);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error initializing map:", err);
        setError("Failed to load map");
        setLoading(false);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [signaturesWithLocation.length]); // Re-init when signatures change

  // Update markers when signatures change without reinitializing map
  useEffect(() => {
    if (!mapInstanceRef.current || loading) return;

    const L = window.L;
    if (!L) return;

    // Clear existing markers (except tile layer)
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        layer.remove();
      }
    });

    // Custom icon
    const signatureIcon = L.divIcon({
      className: "signature-marker",
      html: `<div style="
        background: #228be6;
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        <span style="transform: rotate(45deg); color: white; font-size: 14px;">✍</span>
      </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30],
    });

    // Add new markers
    signaturesWithLocation.forEach((sig) => {
      const { latitude, longitude, city, region, country } = sig.location;
      const profile = signerProfiles?.get?.(sig.signerId);
      
      const locationParts = [];
      if (city) locationParts.push(city);
      if (region) locationParts.push(region);
      if (country && !region) locationParts.push(country);
      const locationStr = locationParts.join(", ") || `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;

      const signedDate = sig.signedAt?.toDate 
        ? sig.signedAt.toDate().toLocaleDateString() 
        : new Date(sig.signedAt).toLocaleDateString();

      L.marker([latitude, longitude], { icon: signatureIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="min-width: 150px; max-width: 250px; word-wrap: break-word; overflow-wrap: break-word;">
            <strong>${profile?.displayName || sig.signerName}</strong><br/>
            <span style="color: #666; font-size: 12px;">${sig.signerEmail}</span><br/>
            <hr style="margin: 5px 0; border: none; border-top: 1px solid #eee;"/>
            <span style="font-style: italic; font-family: cursive;">"${sig.signatureText}"</span><br/>
            <span style="color: #666; font-size: 11px;">📍 ${locationStr}</span><br/>
            <span style="color: #666; font-size: 11px;">📅 ${signedDate}</span>
          </div>
        `, {
          maxWidth: 250,
          autoPanPadding: [20, 20],
          autoPanPaddingTopLeft: [20, 20],
          autoPanPaddingBottomRight: [20, 20],
        });
    });
  }, [signatures, signerProfiles, loading]);

  if (error) {
    return (
      <Paper p="md" withBorder bg="red.0">
        <Text c="red">{error}</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder style={{ overflow: "hidden", position: "relative", zIndex: 1 }}>
      <style>{`
        /* Constrain Leaflet z-index to be below modals (modals use z-index 200-300) */
        .leaflet-container {
          z-index: 1 !important;
        }
        .leaflet-pane {
          z-index: 1 !important;
        }
        .leaflet-top,
        .leaflet-bottom {
          z-index: 1 !important;
        }
        .leaflet-control {
          z-index: 1 !important;
        }
        .leaflet-marker-pane {
          z-index: 1 !important;
        }
        .leaflet-overlay-pane {
          z-index: 1 !important;
        }
        .leaflet-shadow-pane {
          z-index: 1 !important;
        }
        .leaflet-popup {
          max-width: 250px !important;
          z-index: 150 !important;
        }
        .leaflet-popup-content-wrapper {
          max-width: 250px !important;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
      `}</style>
      <Group p="sm" bg="gray.0" justify="space-between">
        <Group gap="xs">
          <IconMapPin size={18} color="#228be6" />
          <Text fw={500} size="sm">Signature Locations</Text>
        </Group>
        <Badge variant="light" color="blue">
          {signaturesWithLocation.length} location{signaturesWithLocation.length !== 1 ? "s" : ""}
        </Badge>
      </Group>
      
      <div className="signature-map-container" style={{ position: "relative", height: 300, overflow: "hidden" }}>
        {loading && (
          <Center style={{ position: "absolute", inset: 0, zIndex: 1000, background: "rgba(255,255,255,0.8)" }}>
            <Stack align="center" gap="xs">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading map...</Text>
            </Stack>
          </Center>
        )}
        <div 
          ref={mapRef} 
          style={{ 
            height: "100%", 
            width: "100%",
            background: "#f0f0f0",
            position: "relative",
            overflow: "hidden",
          }} 
        />
      </div>

      {signaturesWithLocation.length === 0 && !loading && (
        <Center p="md">
          <Text size="sm" c="dimmed">
            No signature locations available yet. Location is captured when signers allow it.
          </Text>
        </Center>
      )}
    </Paper>
  );
}
