const request = require("supertest");
const server = require("../server");
const app = server;
const db = server.db;

describe("Support Ticket System API", () => {
  test("GET /api/health should return database connected", async () => {
    const response = await request(app)
      .get("/api/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("OK");
    expect(response.body.database).toBe("connected");
  });

  test("POST /api/auth/login should reject invalid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "wrong@example.com",
        password: "wrongpassword",
      });

    expect(response.statusCode).toBe(401);
  });
  test("POST /api/tickets should create a ticket", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "agent@test.com",
        password: "agent@1234",
      });

    expect(loginResponse.statusCode).toBe(200);

    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({
        title: "Automated Test Ticket",
        description: "Ticket created by Jest and Supertest.",
        priority: "medium",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.ticket).toHaveProperty("id");
  });
  test("GET /api/tickets should reject requests without a token", async () => {
    const response = await request(app)
      .get("/api/tickets");

    expect(response.statusCode).toBe(401);
  });
    test("Customer should not be able to update a ticket", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "narendra@test.com",
        password: "Test@12345",
      });

    expect(loginResponse.statusCode).toBe(200);

    const response = await request(app)
      .put("/api/tickets/1")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({
        status: "resolved",
        priority: "high",
      });

    expect(response.statusCode).toBe(403);
  });
});
afterAll(async () => {
  await db.end();
});