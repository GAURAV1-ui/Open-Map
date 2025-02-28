import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import useWebSocket from "react-use-websocket";
import L from "leaflet";

const SERVER_URL = "ws://localhost:8080";

const Map = () => {
  const [position, setPosition] = useState<[number, number]>([28.6139, 77.2090]);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const drawnItems = useRef<L.FeatureGroup>(null);

  const { sendJsonMessage, lastJsonMessage } = useWebSocket(SERVER_URL, {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastJsonMessage) {
      const data = JSON.parse(JSON.stringify(lastJsonMessage));
      if (data.routePath) {
        setRoutePath(data.routePath);
        setDistance(data.distance);
        setDuration(data.duration);
      }
    }
  }, [lastJsonMessage]);

  useEffect(() => {
    const sendLocationUpdate = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setPosition([latitude, longitude]);
          sendJsonMessage({ latitude, longitude });
        },
        (error) => console.error("Error getting location:", error),
        { enableHighAccuracy: true }
      );
    };

    sendLocationUpdate();
    const interval = setInterval(sendLocationUpdate, 5000);
    return () => clearInterval(interval);
  }, [sendJsonMessage]);

  const handleDrawCreate = (e: any) => {
    const layer = e.layer;
    if (drawnItems.current) {
      drawnItems.current.addLayer(layer);
    }
    console.log("New shape drawn:", layer.toGeoJSON());
  };

  const handleDrawDelete = (e: any) => {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      if (drawnItems.current) {
        drawnItems.current.removeLayer(layer);
      }
    });
  };

  return (
    <div>
      <h2 className="text-center">Live Rider Tracking</h2>
      <p>Distance: {distance} | Duration: {duration}</p>

      <MapContainer center={position} zoom={12} style={{ height: "500px", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={position} />

        {routePath.length > 0 && <Polyline positions={routePath} color="blue" />}

        <FeatureGroup ref={drawnItems}>
          <EditControl
            position="topright"
            onCreated={handleDrawCreate}
            onDeleted={handleDrawDelete}
            draw={{
              rectangle: true,
              circle: true,
              polygon: true,
              polyline: false,
              marker: false,
            }}
          />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
};

export default Map;
