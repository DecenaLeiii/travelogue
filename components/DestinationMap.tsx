'use client';

import { useEffect, useRef } from 'react';
import { isDestinationCoordinates } from '../lib/destinationCoordinates';

interface DestinationMapProps {
  destination: {
    name: string;
    latitude?: number;
    longitude?: number;
    region?: string;
  };
}

let L: any;

export default function DestinationMap({ destination }: DestinationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    // Don't render if no coordinates
    if (!isDestinationCoordinates(destination)) {
      return;
    }

    if (!mapContainerRef.current) {
      return;
    }

    // Dynamically import Leaflet on client side
    import('leaflet').then((leaflet) => {
      L = leaflet.default;

      // Initialize map if not already created
      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current).setView(
          [destination.latitude, destination.longitude],
          11
        );

        // Add OpenStreetMap tiles (FREE, no API key needed)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);
      } else {
        // Update existing map center
        mapRef.current.setView([destination.latitude, destination.longitude], 11);
      }

      // Remove existing marker if present
      if (markerRef.current) {
        mapRef.current.removeLayer(markerRef.current);
      }

      // Add new marker with popup
      const popupContent = `<div style="text-align: center; font-weight: 600;">
        ${destination.name}
        ${destination.region ? `<br/><span style="font-size: 12px; color: #666;">${destination.region}</span>` : ''}
      </div>`;

      markerRef.current = L.marker([destination.latitude, destination.longitude], {
        icon: L.icon({
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxNiIgZmlsbD0iI2ZmNmI2YiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20],
        }),
      })
        .bindPopup(popupContent)
        .addTo(mapRef.current)
        .openPopup();
    });
  }, [destination.latitude, destination.longitude, destination.name, destination.region]);

  if (!isDestinationCoordinates(destination)) {
    return null;
  }

  return (
    <div className="destination-map-container">
      <div className="destination-map" ref={mapContainerRef} />
    </div>
  );
}
