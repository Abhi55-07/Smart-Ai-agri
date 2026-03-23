import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
  const PORT = 3000;

  // Request logger for debugging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Host: ${req.headers.host}`);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  let lastImageReceivedAt: Date | null = null;
  let imageCount = 0;

  // Endpoint for n8n to send ESP32-CAM images
  app.post("/api/esp32-cam/image", (req, res) => {
    let { image } = req.body;
    if (!image) {
      console.error("ESP32-CAM Image Error: No image data in request body");
      return res.status(400).json({ error: "No image data provided" });
    }
    
    // Basic cleaning of the image string (remove quotes, equals signs, whitespace)
    if (typeof image === 'string') {
      image = image.trim().replace(/^["'=]+|["']+$/g, '').replace(/\s/g, '');
    }
    
    lastImageReceivedAt = new Date();
    imageCount++;

    // Broadcast the image to all connected clients
    io.emit("new-camera-image", { image });
    console.log(`[${imageCount}] Received new image from ESP32-CAM via n8n (${(image.length / 1024).toFixed(2)} KB)`);
    res.json({ status: "success", message: "Image broadcasted" });
  });

  let lastSensorData: any = null;
  let sensorHitCount = 0;
  const recentHits: any[] = [];

  // Direct Sensor API - Endpoint for hardware sensors (ESP32, ESP8266, etc.) to send data
  const handleSensorData = (req: express.Request, res: express.Response) => {
    // Support both POST body and GET query parameters
    let data = req.method === 'POST' ? req.body : req.query;
    
    // Log the raw request for debugging
    const hit = {
      timestamp: new Date().toISOString(),
      method: req.method,
      data: data,
      headers: req.headers['content-type'],
      clients: io.engine.clientsCount
    };
    recentHits.unshift(hit);
    if (recentHits.length > 10) recentHits.pop();

    console.log(`[Sensor API] Received hit #${++sensorHitCount} from ${req.ip}. Clients connected: ${io.engine.clientsCount}`);
    console.log("Raw Data:", JSON.stringify(data));
    
    // Handle cases where data might be wrapped in an array or object (common in n8n)
    if (Array.isArray(data) && data.length > 0) {
      data = data[0];
    }
    
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      data = data.data;
    }
    
    // Normalize data keys to camelCase expected by frontend
    const normalizedData: any = {};
    
    const getValue = (keys: string[]) => {
      for (const key of keys) {
        if (data[key] !== undefined && data[key] !== null) return data[key];
      }
      return undefined;
    };

    // Mapping common sensor field names
    const sm = getValue(['soilMoisture', 'soil_moisture', 'moisture', 'moist', 'sm', 'v1', 'V1']);
    if (sm !== undefined) normalizedData.soilMoisture = Number(sm);
    
    const ph = getValue(['phValue', 'ph_value', 'ph', 'ph_level', 'v2', 'V2', 'phMonitor', 'ph_monitor']);
    if (ph !== undefined) normalizedData.phValue = Number(ph);
    
    const temp = getValue(['temperature', 'temp', 't', 'v4', 'V4']);
    if (temp !== undefined) normalizedData.temperature = Number(temp);
    
    const hum = getValue(['humidity', 'humid', 'h', 'v5', 'V5']);
    if (hum !== undefined) normalizedData.humidity = Number(hum);
    
    const light = getValue(['light', 'lux', 'l', 'v6', 'V6']);
    if (light !== undefined) normalizedData.light = Number(light);
    
    const pump = getValue(['waterPumpStatus', 'pump_status', 'pump', 'v3', 'V3']);
    if (pump !== undefined) {
      if (typeof pump === 'string') {
        normalizedData.waterPumpStatus = ['true', 'on', '1', 'active'].includes(pump.toLowerCase());
      } else {
        normalizedData.waterPumpStatus = !!pump;
      }
    }

    lastSensorData = normalizedData;

    // Broadcast to all connected clients via Socket.io
    if (Object.keys(normalizedData).length > 0) {
      console.log("Broadcasting sensor update to clients:", JSON.stringify(normalizedData));
      io.emit("new-sensor-data", normalizedData);
    } else {
      console.log("No recognized keys found in data. Broadcasting raw data as fallback.");
      io.emit("new-sensor-data", data);
    }
    
    res.json({ 
      status: "success", 
      received: data, 
      normalized: normalizedData,
      clientsConnected: io.engine.clientsCount
    });
  };

  app.post("/api/sensor-data", handleSensorData);
  app.get("/api/sensor-data", handleSensorData);
  app.post("/api/n8n-sensor-data", handleSensorData);
  app.post("/api/soil", handleSensorData);
  app.get("/api/soil", handleSensorData);

  app.post("/api/environment", (req, res) => {
    const { temperature, humidity, timestamp } = req.body;
    console.log("Temperature:", temperature);
    console.log("Humidity:", humidity);
    console.log("Time:", timestamp);

    // Broadcast to frontend to keep it live
    if (temperature !== undefined || humidity !== undefined) {
      io.emit("new-sensor-data", {
        temperature: temperature !== undefined ? Number(temperature) : undefined,
        humidity: humidity !== undefined ? Number(humidity) : undefined
      });
    }

    res.json({ status: "received" });
  });

  // Debug endpoint to see recent sensor hits
  app.get("/api/debug/sensors", (req, res) => {
    res.json({
      totalHits: sensorHitCount,
      clientsConnected: io.engine.clientsCount,
      recentHits,
      lastNormalized: lastSensorData
    });
  });

  // Get camera status
  app.get("/api/camera-status", (req, res) => {
    res.json({
      lastImageReceivedAt,
      imageCount,
      isSocketConnected: io.engine.clientsCount > 0
    });
  });

  // Test endpoint to verify socket connection for images
  app.get("/api/test-socket", (req, res) => {
    // A small 10x10 green square
    const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAADklEQVR42mP8z8AARAwDAND4CQG9G99WAAAAAElFTkSuQmCC";
    io.emit("new-camera-image", { image: testImage });
    res.json({ status: "success", message: "Test image emitted" });
  });

  // Test endpoint to verify socket connection for sensor data
  app.get("/api/test-sensor", (req, res) => {
    const testData = {
      soilMoisture: Math.floor(Math.random() * 100),
      phValue: (Math.random() * 4 + 5).toFixed(1),
      temperature: Math.floor(Math.random() * 15 + 20),
      humidity: Math.floor(Math.random() * 40 + 40),
      light: Math.floor(Math.random() * 50 + 50),
      waterPumpStatus: Math.random() > 0.5
    };
    io.emit("new-sensor-data", testData);
    res.json({ status: "success", message: "Test sensor data emitted", data: testData });
  });

  // Proxy for n8n webhook to avoid CORS issues and hide URL
  app.post("/api/n8n-proxy", async (req, res) => {
    const n8nUrl = process.env.N8N_WEBHOOK_URL || "https://abhi55.app.n8n.cloud/webhook/pump-control";
    const { data } = req.body;
    
    if (!n8nUrl) {
      console.error("N8N_WEBHOOK_URL environment variable is missing");
      return res.status(500).json({ error: "Server configuration error" });
    }

    try {
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`n8n Proxy Error: ${response.status} ${errorText}`);
        return res.status(response.status).send(errorText);
      }

      const result = await response.text();
      res.send(result);
    } catch (error) {
      console.error('n8n Proxy Exception:', error);
      res.status(500).json({ error: "Failed to fetch from n8n" });
    }
  });

  // Sync from n8n (GET request to webhook)
  app.get("/api/n8n-sync", async (req, res) => {
    const n8nUrl = process.env.N8N_WEBHOOK_URL || "https://abhi55.app.n8n.cloud/webhook/pump-control";
    if (!n8nUrl) {
      return res.status(500).json({ error: "N8N_WEBHOOK_URL missing" });
    }
    try {
      const response = await fetch(n8nUrl);
      if (!response.ok) throw new Error(`n8n error: ${response.status}`);
      const data = await response.json();
      
      // Broadcast the received data if it looks like sensor data
      if (data && typeof data === 'object') {
        // If it's an array, take the first item
        const sensorData = Array.isArray(data) ? data[0] : data;
        io.emit("new-sensor-data", sensorData);
      }
      
      res.json({ status: "success", data });
    } catch (error) {
      console.error('n8n Sync Error:', error);
      res.status(500).json({ error: "Failed to sync from n8n. Ensure the n8n webhook supports GET requests." });
    }
  });

  // Proxy for Blynk API to hide token
  app.get("/api/blynk/get", async (req, res) => {
    const token = process.env.BLYNK_AUTH_TOKEN;
    const { pin } = req.query;
    
    if (!token) {
      return res.status(500).json({ error: "BLYNK_AUTH_TOKEN missing" });
    }

    try {
      const response = await fetch(`https://blynk.cloud/external/api/get?token=${token}&${pin}`);
      const data = await response.text();
      res.send(data);
    } catch (error) {
      res.status(500).json({ error: "Blynk fetch failed" });
    }
  });

  app.get("/api/blynk/update", async (req, res) => {
    const token = process.env.BLYNK_AUTH_TOKEN;
    const { pin, value } = req.query;
    
    if (!token) {
      return res.status(500).json({ error: "BLYNK_AUTH_TOKEN missing" });
    }

    try {
      const response = await fetch(`https://blynk.cloud/external/api/update?token=${token}&${pin}=${value}`);
      res.status(response.status).send(await response.text());
    } catch (error) {
      res.status(500).json({ error: "Blynk update failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true,
        host: true
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Background polling for DHT22 sensor data from n8n
  const pollDHT22 = async () => {
    const dhtUrl = process.env.N8N_DHT22_URL || "https://moonishly-epilithic-galilea.ngrok-free.dev/api/environment";
    try {
      const response = await fetch(dhtUrl);
      if (response.ok) {
        let data = await response.json();
        
        // Handle array or object wrapping
        if (Array.isArray(data) && data.length > 0) data = data[0];
        if (data.data && typeof data.data === 'object') data = data.data;

        const normalized: any = {};
        if (data.temperature !== undefined) normalized.temperature = Number(data.temperature);
        if (data.temp !== undefined) normalized.temperature = Number(data.temp);
        if (data.humidity !== undefined) normalized.humidity = Number(data.humidity);
        if (data.humid !== undefined) normalized.humidity = Number(data.humid);

        if (Object.keys(normalized).length > 0) {
          io.emit("new-sensor-data", normalized);
        }
      }
    } catch (error) {
      // Silently fail polling to avoid log spam
    }
  };

  // Poll every second as requested
  setInterval(pollDHT22, 1000);
}

startServer();
