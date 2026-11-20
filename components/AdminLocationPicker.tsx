import { useEffect, useRef, useState } from 'react';
import type { CircleMarker, LeafletMouseEvent, Map as LeafletMap } from 'leaflet';
import type { DestinationCoordinates } from '../lib/destinationCoordinates';

type Props = {
  coordinates: DestinationCoordinates | null;
  onChange: (coordinates: DestinationCoordinates) => void;
};

export default function AdminLocationPicker({ coordinates, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const coordinatesRef = useRef(coordinates);
  const onChangeRef = useRef(onChange);
  const [mapError, setMapError] = useState(false);

  coordinatesRef.current = coordinates;
  onChangeRef.current = onChange;

  useEffect(() => {
    let active = true;

    import('leaflet').then((leaflet) => {
      if (!active || !containerRef.current) return;
      const L = leaflet.default;
      const initial = coordinatesRef.current;
      const map = L.map(containerRef.current).setView(
        initial ? [initial.latitude, initial.longitude] : [12.8797, 121.774],
        initial ? 11 : 5,
      );
      mapRef.current = map;
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      });
      tiles.on('tileerror', () => { if (active) setMapError(true); });
      tiles.addTo(map);
      markerRef.current = L.circleMarker([0, 0], {
        radius: 9,
        color: '#fff',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 1,
      });
      if (initial) {
        markerRef.current.setLatLng([initial.latitude, initial.longitude]).addTo(map);
      }
      map.on('click', (event: LeafletMouseEvent) => {
        const point = event.latlng.wrap();
        onChangeRef.current({
          latitude: Number(point.lat.toFixed(6)),
          longitude: Number(point.lng.toFixed(6)),
        });
      });
    }).catch((error) => {
      console.error('Failed to load the location picker:', error);
      if (active) setMapError(true);
    });

    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (coordinates) {
      const point: [number, number] = [coordinates.latitude, coordinates.longitude];
      marker.setLatLng(point).addTo(map);
      if (!map.getBounds().contains(point)) {
        map.setView(point, Math.max(map.getZoom(), 11));
      }
    } else {
      marker.remove();
    }
  }, [coordinates?.latitude, coordinates?.longitude]);

  return (
    <>
      {mapError && <p role="alert">Could not load the map or some map tiles. Enter latitude and longitude below instead.</p>}
      <div className="admin-location-map" ref={containerRef} aria-label="Map for selecting the destination location" />
    </>
  );
}
