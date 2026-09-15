import "dotenv/config";
import { createServer } from "http";
import app from "./app.js";
import { initSocket } from "./services/socket.service.js";

const httpServer = createServer(app);
const PORT = process.env["PORT"] ?? 3001;

initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`StellFlow API running on port ${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/api-docs`);
  console.log(`WebSocket server ready`);
});

export default app;
