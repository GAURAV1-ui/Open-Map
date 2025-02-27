import React, { useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const icon = new L.Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const destination: [number, number] = [28.5355, 77.3910];

const Map: React.FC = () => {
    const [riderLocation, setRiderLocation] = useState<[number,number]>([28.7041, 77.1025]);


  return (
    <div>
      <MapContainer center={riderLocation} zoom={14} style={{ height: "600px", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={riderLocation} icon={icon} />
        <Marker position={destination} icon={icon} />
      </MapContainer>
    </div>
  );
};

export default Map;
