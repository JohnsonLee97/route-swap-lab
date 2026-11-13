import "dotenv/config";
import {
  createPool,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

const app = express();

app.use(express.json());

const trialLinkSecret = process.env.TRIAL_LINK_SECRET ?? "";

if (!/^[a-f0-9]{64}$/i.test(trialLinkSecret)) {
  throw new Error("Set TRIAL_LINK_SECRET in backend/.env.");
}

const signingKey = Buffer.from(trialLinkSecret, "hex");

function createTripKey(trialId: number, traveller: "A" | "B") {
  return createHmac("sha256", signingKey)
    .update(`trip:${trialId}:${traveller}`)
    .digest("hex");
}

function hasTripKey(request: Request, trialId: number, traveller: "A" | "B") {
  const header = request.get("authorization") ?? "";
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(header);

  if (!match) return false;

  return timingSafeEqual(
    Buffer.from(match[1], "hex"),
    Buffer.from(createTripKey(trialId, traveller), "hex"),
  );
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

const db = createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.get("/api/db-health", async (_request, response) => {
  try {
    await db.query("SELECT 1");
    response.json({ database: "connected" });
  } catch (error) {
    console.error("MySQL connection failed:", error);
    response.status(503).json({ database: "unavailable" });
  }
});

app.get("/api/routes", async (_request, response) => {
  try {
    const [routes] = await db.query(
      "SELECT id, name, origin, destination FROM routes ORDER BY id",
    );

    response.json(routes);
  } catch (error) {
    console.error("Could not load routes:", error);
    response.status(500).json({ error: "Could not load routes" });
  }
});

app.post("/api/trials", async (request, response) => {
  const { routeAId, routeBId } = request.body ?? {};

  if (
    !Number.isSafeInteger(routeAId) ||
    !Number.isSafeInteger(routeBId) ||
    routeAId <= 0 ||
    routeBId <= 0 ||
    routeAId === routeBId
  ) {
    response.status(400).json({ error: "Choose two different routes." });
    return;
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO trials (route_a_id, route_b_id)
       SELECT a.id, b.id
       FROM routes AS a
       JOIN routes AS b
         ON a.origin = b.origin AND a.destination = b.destination
       WHERE a.id = ? AND b.id = ?`,
      [routeAId, routeBId],
    );

    if (result.affectedRows === 0) {
      response.status(400).json({
        error:
          "Choose two existing routes with the same start and destination.",
      });
      return;
    }

    response.status(201).json({
      id: result.insertId,
      routeAId,
      routeBId,
      tripKeys: {
        A: createTripKey(result.insertId, "A"),
        B: createTripKey(result.insertId, "B"),
      },
    });
  } catch (error) {
    console.error("Could not create trial:", error);
    response.status(500).json({ error: "Could not create trial." });
  }
});

app.post(
  "/api/trials/:id/trips/:traveller/start",
  async (request, response) => {
    const trialId = Number(request.params.id);
    const { traveller } = request.params;

    if (
      !Number.isInteger(trialId) ||
      trialId < 1 ||
      trialId > 4_294_967_295 ||
      (traveller !== "A" && traveller !== "B")
    ) {
      response
        .status(400)
        .json({ error: "Choose a valid trial and traveller." });
      return;
    }
    if (!hasTripKey(request, trialId, traveller)) {
      response
        .status(403)
        .json({ error: "Open your assigned traveller link." });
      return;
    }
    try {
      await db.execute(
        `INSERT INTO trips (trial_id, traveller)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE departed_at = departed_at`,
        [trialId, traveller],
      );

      response.json({ trialId, traveller, status: "started" });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ER_NO_REFERENCED_ROW_2"
      ) {
        response.status(404).json({ error: "Trial not found." });
        return;
      }

      console.error("Could not start trip:", error);
      response.status(500).json({ error: "Could not start trip." });
    }
  },
);

app.post(
  "/api/trials/:id/trips/:traveller/arrive",
  async (request, response) => {
    const trialId = Number(request.params.id);
    const { traveller } = request.params;

    if (
      !Number.isInteger(trialId) ||
      trialId < 1 ||
      trialId > 4_294_967_295 ||
      (traveller !== "A" && traveller !== "B")
    ) {
      response
        .status(400)
        .json({ error: "Choose a valid trial and traveller." });
      return;
    }

    try {
      await db.execute(
        `UPDATE trips
       SET arrived_at = CURRENT_TIMESTAMP(3)
       WHERE trial_id = ? AND traveller = ? AND arrived_at IS NULL`,
        [trialId, traveller],
      );

      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT TIMESTAMPDIFF(SECOND, departed_at, arrived_at) AS durationSeconds
       FROM trips
       WHERE trial_id = ? AND traveller = ? AND arrived_at IS NOT NULL`,
        [trialId, traveller],
      );

      const trip = rows[0];

      if (!trip) {
        response
          .status(409)
          .json({ error: "Start the trip before marking arrival." });
        return;
      }

      response.json({
        trialId,
        traveller,
        durationSeconds: trip.durationSeconds,
      });
    } catch (error) {
      console.error("Could not mark arrival:", error);
      response.status(500).json({ error: "Could not mark arrival." });
    }
  },
);

app.get("/api/trials/:id", async (request, response) => {
  const trialId = Number(request.params.id);

  if (!Number.isInteger(trialId) || trialId < 1 || trialId > 4_294_967_295) {
    response.status(400).json({ error: "Invalid trial ID." });
    return;
  }

  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT
         t.id,
         t.route_a_id AS routeAId,
         t.route_b_id AS routeBId,
         a.name AS routeA,
         b.name AS routeB,
         ta.departed_at IS NOT NULL AS startedA,
         tb.departed_at IS NOT NULL AS startedB,
         TIMESTAMPDIFF(SECOND, ta.departed_at, ta.arrived_at) AS durationA,
         TIMESTAMPDIFF(SECOND, tb.departed_at, tb.arrived_at) AS durationB
       FROM trials AS t
       JOIN routes AS a ON a.id = t.route_a_id
       JOIN routes AS b ON b.id = t.route_b_id
       LEFT JOIN trips AS ta ON ta.trial_id = t.id AND ta.traveller = 'A'
       LEFT JOIN trips AS tb ON tb.trial_id = t.id AND tb.traveller = 'B'
       WHERE t.id = ?`,
      [trialId],
    );

    const trial = rows[0];

    if (!trial) {
      response.status(404).json({ error: "Trial not found." });
      return;
    }

    response.json({
      id: trial.id,
      routeAId: trial.routeAId,
      routeBId: trial.routeBId,
      travellers: {
        A: {
          route: trial.routeA,
          started: Boolean(trial.startedA),
          durationSeconds: trial.durationA,
        },
        B: {
          route: trial.routeB,
          started: Boolean(trial.startedB),
          durationSeconds: trial.durationB,
        },
      },
    });
  } catch (error) {
    console.error("Could not load trial:", error);
    response.status(500).json({ error: "Could not load trial." });
  }
});

app.listen(3001, "127.0.0.1", () => {
  console.log("Route Swap Lab API running at http://127.0.0.1:3001");
});
