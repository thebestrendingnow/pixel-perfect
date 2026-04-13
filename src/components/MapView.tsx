import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Hotel } from '@/types/hotel';

interface MapViewProps {
  hotels: Hotel[];
}

const MapView = ({ hotels }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current).setView([33.749, -84.388], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing markers
    mapInstance.current.eachLayer(layer => {
      if (layer instanceof L.Marker) layer.remove();
    });

    hotels.forEach(hotel => {
      const marker = L.marker([hotel.latitude, hotel.longitude])
        .addTo(mapInstance.current!)
        .bindPopup(`
          <div style="font-family: Sora, sans-serif; min-width: 180px;">
            <strong style="font-size: 14px;">${hotel.name}</strong>
            <br/><span style="color: #666;">${hotel.city}</span>
            <br/><strong style="color: #2d8a9e; font-size: 16px;">$${hotel.pricePerNight}/night</strong>
            <br/><span>⭐ ${hotel.rating} (${hotel.reviewCount} reviews)</span>
            <br/><a href="/hotel/${hotel.id}" style="color: #2d8a9e; text-decoration: underline; cursor: pointer;">View Details →</a>
          </div>
        `);
    });

    if (hotels.length > 0) {
      const bounds = L.latLngBounds(hotels.map(h => [h.latitude, h.longitude]));
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hotels]);

  return (
    <div
      ref={mapRef}
      className="h-[500px] w-full rounded-xl border border-border overflow-hidden"
    />
  );
};

export default MapView;
