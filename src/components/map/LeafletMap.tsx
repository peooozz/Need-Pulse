'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORY_CONFIG, Need } from '@/lib/types';

interface LeafletMapProps {
  needs: Need[];
  selectedNeedId: string | null;
  onNeedClick: (need: Need) => void;
}

export default function LeafletMap({ needs, selectedNeedId, onNeedClick }: LeafletMapProps) {
  // Center roughly over India
  const center: [number, number] = [22.0, 79.0];
  const zoom = 5;

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%', borderRadius: '1rem', background: '#09090b' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      {/* City Names and Borders Layer */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        zIndex={2}
      />
      {needs.map((need) => {
        const cat = CATEGORY_CONFIG[need.category];
        const isSelected = selectedNeedId === need.id;
        
        return (
          <CircleMarker
            key={need.id}
            center={[need.location.lat, need.location.lng]}
            radius={isSelected ? Math.max(8, need.urgency * 1.5) : Math.max(5, need.urgency * 1.2)}
            pathOptions={{
              fillColor: cat.color,
              fillOpacity: isSelected ? 0.9 : 0.6,
              color: isSelected ? '#ffffff' : cat.color,
              weight: isSelected ? 2 : 1
            }}
            eventHandlers={{
              click: () => onNeedClick(need),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <strong>{cat.emoji} {need.locationName}</strong><br/>
              Urgency: {need.urgency}/10
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
