const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection pool
const db = process.env.MYSQL_PUBLIC_URL
  ? mysql.createPool(process.env.MYSQL_PUBLIC_URL)
  : mysql.createPool({
      host: process.env.MYSQLHOST || "localhost",
      port: process.env.MYSQLPORT || 3306,
      user: process.env.MYSQLUSER || "root",
      password:
        process.env.MYSQLPASSWORD ||
        process.env.DB_PASSWORD ||
        "YOUR_MYSQL_PASSWORD",
      database:
        process.env.MYSQLDATABASE ||
        "support_ticket_system",
    });
// JWT secret
const JWT_SECRET =
  process.env.JWT_SECRET || "support-ticket-system-secret";

// Test database connection
async function testDatabaseConnection() {
  console.log("Database configuration:", {
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT,
    user: process.env.MYSQLUSER,
    database: process.env.MYSQLDATABASE,
    hasPassword: Boolean(process.env.MYSQLPASSWORD),
  });

  try {
    const connection = await db.getConnection();

    console.log("MySQL database connected successfully.");

    connection.release();
  } catch (error) {
    console.error("MySQL connection failed.");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error errno:", error.errno);
    console.error("Error sqlState:", error.sqlState);
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authentication token required",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Invalid authentication token",
    });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid or expired token",
    });
  }
}

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Support Ticket System API is running",
  });
});

// Database health check
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      status: "OK",
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      database: "disconnected",
      error: error.message,
    });
  }
});

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role = "customer" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (!["customer", "agent"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users
       (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [name, email, passwordHash, role]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: result.insertId,
        name,
        email,
        role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const [users] = await db.query(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

// Get current user
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user",
      error: error.message,
    });
  }
});

// Get all tickets
app.get("/api/tickets", authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.created_by,
        t.assigned_to,
        t.created_at,
        t.updated_at,
        creator.name AS creator_name,
        creator.email AS creator_email,
        agent.name AS agent_name
      FROM tickets t
      LEFT JOIN users creator
        ON t.created_by = creator.id
      LEFT JOIN users agent
        ON t.assigned_to = agent.id
    `;

    const params = [];

    // Customers see only their own tickets
    if (req.user.role === "customer") {
      query += " WHERE t.created_by = ?";
      params.push(req.user.id);
    }

    query += " ORDER BY t.created_at DESC";

    const [tickets] = await db.query(query, params);

    res.json(tickets);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch tickets",
      error: error.message,
    });
  }
});

// Get single ticket
app.get("/api/tickets/:id", authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;

    const [tickets] = await db.query(
      `
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.created_by,
        t.assigned_to,
        t.created_at,
        t.updated_at,
        creator.name AS creator_name,
        creator.email AS creator_email,
        agent.name AS agent_name
      FROM tickets t
      LEFT JOIN users creator
        ON t.created_by = creator.id
      LEFT JOIN users agent
        ON t.assigned_to = agent.id
      WHERE t.id = ?
      `,
      [ticketId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    const ticket = tickets[0];

    // Customer can only view own ticket
    if (
      req.user.role === "customer" &&
      ticket.created_by !== req.user.id
    ) {
      return res.status(403).json({
        message: "You do not have permission to view this ticket",
      });
    }

    const [comments] = await db.query(
      `
      SELECT
        tc.id,
        tc.ticket_id,
        tc.user_id,
        tc.comment,
        tc.created_at,
        u.name AS user_name,
        u.role AS user_role
      FROM ticket_comments tc
      JOIN users u
        ON tc.user_id = u.id
      WHERE tc.ticket_id = ?
      ORDER BY tc.created_at ASC
      `,
      [ticketId]
    );

    res.json({
      ticket,
      comments,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch ticket",
      error: error.message,
    });
  }
});

// Create ticket
app.post("/api/tickets", authenticateToken, async (req, res) => {
  try {
    const { title, description, priority = "medium" } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
      });
    }

    const validPriorities = [
      "low",
      "medium",
      "high",
      "urgent",
    ];

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO tickets
      (title, description, status, priority, created_by)
      VALUES (?, ?, 'open', ?, ?)
      `,
      [title, description, priority, req.user.id]
    );

    const [tickets] = await db.query(
      "SELECT * FROM tickets WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Ticket created successfully",
      ticket: tickets[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create ticket",
      error: error.message,
    });
  }
});

// Add comment

app.get("/api/tickets/:id/comments", authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;

    // Check that the ticket exists
    const [tickets] = await db.execute(
      "SELECT * FROM tickets WHERE id = ?",
      [ticketId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        error: "Ticket not found",
      });
    }

    // Customers can only view comments on their own tickets
    if (
      req.user.role === "customer" &&
      tickets[0].created_by !== req.user.id
    ) {
      return res.status(403).json({
        error: "Forbidden",
      });
    }

    const [comments] = await db.execute(
      `SELECT 
        ticket_comments.id,
        ticket_comments.ticket_id,
        ticket_comments.comment,
        ticket_comments.created_at,
        users.name AS user_name
       FROM ticket_comments
       JOIN users ON ticket_comments.user_id = users.id
       WHERE ticket_comments.ticket_id = ?
       ORDER BY ticket_comments.created_at ASC`,
      [ticketId]
    );

    res.json({
      comments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);

    res.status(500).json({
      error: "Failed to fetch comments",
    });
  }
});
app.post(
  "/api/tickets/:id/comments",
  authenticateToken,
  async (req, res) => {
    try {
      const ticketId = req.params.id;
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({
          message: "Comment is required",
        });
      }

      const [tickets] = await db.query(
        "SELECT id, created_by FROM tickets WHERE id = ?",
        [ticketId]
      );

      if (tickets.length === 0) {
        return res.status(404).json({
          message: "Ticket not found",
        });
      }

      if (
        req.user.role === "customer" &&
        tickets[0].created_by !== req.user.id
      ) {
        return res.status(403).json({
          message: "You cannot comment on this ticket",
        });
      }

      const [result] = await db.query(
        `
        INSERT INTO ticket_comments
        (ticket_id, user_id, comment)
        VALUES (?, ?, ?)
        `,
        [ticketId, req.user.id, comment]
      );

      res.status(201).json({
        message: "Comment added successfully",
        commentId: result.insertId,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to add comment",
        error: error.message,
      });
    }
  }
);

// Update ticket
app.put("/api/tickets/:id", authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status, priority, assigned_to } = req.body;

    if (req.user.role !== "agent") {
      return res.status(403).json({
        message: "Only agents can update tickets",
      });
    }

    const validStatuses = [
      "open",
      "in_progress",
      "resolved",
      "closed",
    ];

    const validPriorities = [
      "low",
      "medium",
      "high",
      "urgent",
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority",
      });
    }

    const [result] = await db.query(
      `
      UPDATE tickets
      SET
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        assigned_to = COALESCE(?, assigned_to)
      WHERE id = ?
      `,
      [status || null, priority || null, assigned_to || null, ticketId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    res.json({
      message: "Ticket updated successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update ticket",
      error: error.message,
    });
  }
});
app.get("/api/users/agents", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "agent") {
      return res.status(403).json({
        message: "Only agents can view the agent list",
      });
    }

    const [agents] = await db.query(`
      SELECT id, name, email
      FROM users
      WHERE role = 'agent'
      ORDER BY name ASC
    `);

    res.json({
      agents,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch agents",
      error: error.message,
    });
  }
});

// Start server
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`Support Ticket API running on port ${PORT}`);
    await testDatabaseConnection();
  });
}

module.exports = app;
module.exports.db = db;