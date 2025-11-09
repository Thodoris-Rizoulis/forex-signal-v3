import express from "express";
import cors from "cors";
import { ensureTables } from "./dbInit";
import { runDataFetcher } from "./services/dataFetcher";
import { runDataRetention } from "./services/dataRetention";
import { runTrendDetector } from "./services/TrendDetectorService";
import { config } from "./config";
import { createLogger } from "./utils/logger";
import currenciesRouter from "./routes/currencies";
import healthRouter from "./routes/health";
import pairsRouter from "./routes/pairs";
import strategiesRouter from "./routes/strategies";
import opportunitiesRouter from "./routes/opportunities";
import ratesRouter from "./routes/rates";
import testingRouter from "./routes/testing";
import consolidationsRouter from "./routes/consolidations";
import { webSocketService } from "./services/webSocketService";
import { runConsolidationService } from "./services/ConsolidationService";

const app = express();
const PORT = config.server.port;

app.use(cors());
app.use(express.json());

// API routes
app.use("/api", healthRouter);
app.use("/api/currencies", currenciesRouter);
app.use("/api/pairs", pairsRouter);
app.use("/api/strategies", strategiesRouter);
app.use("/api/opportunities", opportunitiesRouter);
app.use("/api/rates", ratesRouter);
app.use("/api/test", testingRouter);
app.use("/api/consolidations", consolidationsRouter);

async function startServer() {
  const logger = createLogger("app");
  try {
    // Ensure database tables exist before starting services
    await ensureTables();
    logger.info("Database tables initialized successfully");

    // Create HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Attach WebSocket service to the server
    webSocketService.attachToServer(server);

    runDataFetcher().catch((err) =>
      logger.error({ err }, "Error starting data fetcher")
    ); // Run in background
    runDataRetention().catch((err) =>
      logger.error({ err }, "Error starting data retention")
    ); // Run daily cleanup in background
    runTrendDetector().catch((err) =>
      logger.error({ err }, "Error starting trend detector")
    ); // Run trend detection in background
    runConsolidationService().catch((err: any) =>
      logger.error({ err }, "Error starting consolidation service")
    );
  } catch (err) {
    logger.error({ err }, "Error starting server");
    process.exit(1);
  }
}

startServer();
