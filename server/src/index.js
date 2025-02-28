import express from "express";
import cors from "cors";
import axios from "axios";
import { WebSocketServer } from "ws";

const app = express();
const PORT = process.env.PORT || 8000;
const OSRM_SERVER = "http://router.project-osrm.org";

app.use(cors());
app.use(express.json());

const wss = new WebSocketServer({ port: 8080 });

let riderLocation = { lat: 28.6139, lng: 77.2090 };
const destination = { lat: 28.5355, lng: 77.3910 };
const MIN_REQUEST_INTERVAL = 5000;
let lastRequestTime = 0;

const fetchRouteWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { timeout: 15000 });
      return response.data;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === retries - 1) return null;
    }
  }
  return null;
};

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    try {
      const now = Date.now();
      if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
        return;
      }
      lastRequestTime = now;

      const messageString = message.toString("utf-8");
      console.log("Received location update:", messageString);

      const { latitude, longitude } = JSON.parse(messageString);
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        ws.send(JSON.stringify({ error: "Invalid location data" }));
        return;
      }

      riderLocation = { lat: latitude, lng: longitude };

      const osrmUrl = `${OSRM_SERVER}/route/v1/driving/${longitude},${latitude};${destination.lng},${destination.lat}?overview=full&steps=true&geometries=geojson`;
      console.log("Requesting route from OSRM:", osrmUrl);

      const osrmData = await fetchRouteWithRetry(osrmUrl);
      if (!osrmData || !osrmData.routes || osrmData.routes.length === 0) {
        throw new Error("No route found or OSRM server not responding.");
      }

      const route = osrmData.routes[0];

      ws.send(
        JSON.stringify({
          distance: `${(route.distance / 1000).toFixed(2)} km`,
          duration: `${Math.round(route.duration / 60)} min`,
          routePath: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        })
      );
    } catch (error) {
      console.error("Error handling message:", error.message);
      ws.send(JSON.stringify({ error: "Failed to process request", details: error.message }));
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
