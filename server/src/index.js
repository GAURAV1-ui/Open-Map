import "dotenv/config";
import express from "express";
import axios from "axios";
import { WebSocketServer } from "ws";
import cors from "cors";


const app = express();
const PORT = process.env.PORT || 8000;
const OSRM_SERVER = "http://router.project-osrm.org"; 

app.use(cors());
app.use(express.json());

const wss = new WebSocketServer({ port: 8080 });
let riderLocation = { lat: 28.6139, lng: 77.2090 }; 
const destination = { lat: 28.5355, lng: 77.3910 }; 

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    const { latitude, longitude } = JSON.parse(message);
    riderLocation = { lat: latitude, lng: longitude }; 

    try {
      const osrmUrl = `${OSRM_SERVER}/route/v1/driving/${longitude},${latitude};${destination.lng},${destination.lat}?overview=full&steps=true&geometries=geojson`;
      const osrmResponse = await axios.get(osrmUrl);
     
      const route = osrmResponse.data.routes[0];
      route.geometry.coordinates.map(([lng, lat]) => console.log([lat, lng]))

      ws.send(
        JSON.stringify({
          distance: (route.distance / 1000).toFixed(2) + " km",
          duration: Math.round(route.duration / 60) + " min",
          routePath: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        })
      );
    } catch (error) {
      console.error(error);
      ws.send(JSON.stringify({ error: "Error fetching route data" }));
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
