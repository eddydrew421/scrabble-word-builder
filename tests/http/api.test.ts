import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../src/http/app.js";
import { createContainer } from "../../src/composition.js";

describe("GET /api/v1/solve", () => {

  let app: Express;
  
  beforeAll(async () => { app = createApp(await createContainer()); });

  it("returns 200 with a JSend success envelope", async () => {
    const res = await request(app).get("/api/v1/solve").query({ rack: "AIDOORW", word: "WIZ" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      data: { word: "WIZARD", score: 19, policy: "consumes-all-board-letters" },
    });
  });

  it("returns 200 with word: null when nothing is playable", async () => {
    const res = await request(app).get("/api/v1/solve").query({ rack: "BB" });
    expect(res.status).toBe(200);
    expect(res.body.data.word).toBeNull();
  });

  it("returns 400 VALIDATION_FAILED when rack is absent", async () => {
    const res = await request(app).get("/api/v1/solve");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 422 TILE_LIMIT_EXCEEDED for a semantically illegal request", async () => {
    const res = await request(app).get("/api/v1/solve").query({ rack: "AIDOORZ", word: "QUIZ" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("TILE_LIMIT_EXCEEDED");
  });

  it("rejects a repeated rack parameter (array injection)", async () => {
    const res = await request(app).get("/api/v1/solve?rack=AB&rack=CD");
    expect(res.status).toBe(400);
  });

  it("echoes an inbound correlation id", async () => {
    const res = await request(app)
      .get("/api/v1/solve").query({ rack: "RAT" }).set("x-request-id", "abc-123");
    expect(res.headers["x-request-id"]).toBe("abc-123");
  });

  it("returns 404 for an unknown endpoint", async () => {
    const res = await request(app).get("/api/v2/solve");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});