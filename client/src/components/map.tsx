import React, { useState, useEffect } from "react";
import {
  TileLayer,
  FeatureGroup,
  Polygon,
  Circle,
  Rectangle,
  Marker,
  Polyline,
} from "react-leaflet";
import { MapContainer } from "react-leaflet";
import useWebSocket from "react-use-websocket";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";

interface Shape {
  type: "polygon" | "rectangle" | "circle";
  coordinates?: [number, number][];
  center?: [number, number];
  radius?: number;
}

const icon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const Map: React.FC = () => {
  const [riderLocation, setRiderLocation] = useState<[number, number]>([
    28.7041, 77.1025,
  ]);
  const [destination, setDestination] = useState<[number, number]>([
    28.7041, 77.2,
  ]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [path, setPath] = useState<[number, number][]>([]);
  const [time, setTime] = useState<string | null>(null);

  const { sendJsonMessage } = useWebSocket("ws://localhost:8080", {
    onOpen: () => console.log("✅ WebSocket Connected"),
    shouldReconnect: () => true,
  });

  const handleCreated = (e: any) => {
    const { layer, layerType } = e;
    let shapeData: Shape | null = null;

    if (layerType === "polygon") {
      shapeData = {
        type: "polygon",
        coordinates: layer
          .getLatLngs()[0]
          .map((latlng: any) => [latlng.lat, latlng.lng]),
      };
    } else if (layerType === "circle") {
      shapeData = {
        type: "circle",
        center: [layer.getLatLng().lat, layer.getLatLng().lng],
        radius: layer.getRadius(),
      };
    } else if (layerType === "rectangle") {
      shapeData = {
        type: "rectangle",
        coordinates: layer
          .getLatLngs()[0]
          .map((latlng: any) => [latlng.lat, latlng.lng]),
      };
    }

    if (shapeData) {
      setShapes((prev) => [...prev, shapeData]);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setRiderLocation([latitude, longitude]);

          sendJsonMessage({ latitude, longitude, shapes });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [shapes, sendJsonMessage]);

  useEffect(() => {
    const fetchRoute = async () => {
      const url = `https://router.project-osrm.org/route/v1/driving/${riderLocation[1]},${riderLocation[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes.length > 0) {
          setPath(
            data.routes[0].geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng]
            )
          );
          setTime((data.routes[0].duration / 60).toFixed(2));
          setDestination([
            data.waypoints[1].location[1],
            data.waypoints[1].location[0],
          ]);
        }
      } catch (error) {
        console.error("Error fetching route:", error);
      }
    };
    fetchRoute();
  }, [riderLocation, destination]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "10px" }}>
      <h2>Real-Time Tracking</h2>
      <p>Time {time ? `${time} minutes` : "Calculating..."}</p>
      <p>
        Distance:{" "}
        {path.length > 0 && (path[path.length - 1][0] * 111).toFixed(2)} km
      </p>

      <div style={{ width: "100%", height: "600px" }}>
        <MapContainer
          center={riderLocation}
          zoom={14}
          style={{ width: "100%", height: "100%", borderRadius: "10px" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={riderLocation} icon={icon} />
          <Marker position={destination} icon={icon} />
          {path.length > 0 && <Polyline positions={path} color="blue" />}

          <FeatureGroup>
            <EditControl
              position="topright"
              onCreated={handleCreated}
              draw={{
                marker: false,
                polygon: true,
                rectangle: true,
                circle: true,
              }}
            />
          </FeatureGroup>

          {shapes.map((shape, index) => {
            if (shape.type === "circle") {
              return (
                <Circle
                  key={index}
                  center={shape.center!}
                  radius={shape.radius!}
                  color="red"
                />
              );
            } else if (shape.type === "rectangle") {
              return (
                <Rectangle
                  key={index}
                  bounds={shape.coordinates!}
                  color="red"
                />
              );
            } else {
              return (
                <Polygon
                  key={index}
                  positions={shape.coordinates!}
                  color="red"
                />
              );
            }
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default Map;
