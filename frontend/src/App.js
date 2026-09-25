import { useEffect, useState } from "react";
import api from "./api";
import "./App.css";
function App() {
  const [isRegistering, setIsRegistering] = useState(false);

  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [agents, setAgents] = useState([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState("medium");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * Check if a user is already logged in
   */
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      loadUser();
    }
  }, []);

  /*
   * Load logged-in user
   */
  const loadUser = async () => {
    try {
      const response = await api.get("/auth/me");

      setUser(response.data.user || response.data);
    } catch (error) {
      console.error("Error loading user:", error);

      localStorage.removeItem("token");
      localStorage.removeItem("role");

      setUser(null);
    }
  };

  /*
   * Load customer tickets
   */
  const loadTickets = async () => {
    try {
      const response = await api.get("/tickets");

      setTickets(response.data.tickets || response.data || []);
    } catch (error) {
      console.error("Error loading tickets:", error);
    }
  };
  const loadAgents = async () => {
  try {
    const response = await api.get("/users/agents");

    setAgents(
      response.data.users ||
        response.data.agents ||
        response.data ||
        []
    );
  } catch (error) {
    console.error("Error loading agents:", error);
  }
};

  /*
   * Load tickets when user becomes available
   */
  useEffect(() => {
    if (user) {
      loadTickets();
      if (user.role === "agent") {
        loadAgents();
      }
    }
  }, [user]);

  /*
   * Login
   */
  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", response.data.token);

      if (response.data.role) {
        localStorage.setItem("role", response.data.role);
      }

      /*
       * Load the complete user from /auth/me.
       * This makes sure user.role is available.
       */
      await loadUser();

      setMessage("Login successful!");

      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        error.response?.data?.error || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Register
   */
  const handleRegister = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        role: "customer",
      });

      setMessage("Registration successful! Please login.");

      setName("");
      setEmail("");
      setPassword("");

      setIsRegistering(false);
    } catch (error) {
      console.error("Registration error:", error);

      setMessage(
        error.response?.data?.error ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Create ticket
   */
  const handleCreateTicket = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      await api.post("/tickets", {
        title: ticketTitle,
        description: ticketDescription,
        priority: ticketPriority,
      });

      setTicketTitle("");
      setTicketDescription("");
      setTicketPriority("medium");

      setMessage("Ticket created successfully!");

      await loadTickets();
    } catch (error) {
      console.error("Ticket creation error:", error);

      setMessage(
        error.response?.data?.error ||
          "Failed to create ticket."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * View ticket details
   */
  const handleViewTicket = async (ticketId) => {
    try {
      setMessage("");

      const response = await api.get(`/tickets/${ticketId}`);

      console.log("Ticket details response:", response.data);

      const ticket = response.data.ticket || response.data;

      setSelectedTicket(ticket);

      /*
       * Load comments
       */
      const commentsResponse = await api.get(
        `/tickets/${ticketId}/comments`
      );

      setComments(
        commentsResponse.data.comments ||
          commentsResponse.data ||
          []
      );
    } catch (error) {
      console.error("Error loading ticket:", error);

      setMessage("Failed to load ticket details.");
    }
  };
  const handleUpdateTicket = async () => {
  if (!selectedTicket) {
    return;
  }

  try {
    setMessage("");

    await api.put(`/tickets/${selectedTicket.id}`, {
      status: selectedTicket.status,
      priority: selectedTicket.priority,
      assigned_to: selectedTicket.assigned_to,
    });

    setMessage("Ticket updated successfully.");

    await loadTickets();
  } catch (error) {
    console.error("Error updating ticket:", error);

    setMessage(
      error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update ticket."
    );
  }
};

  /*
   * Add comment
   */
  const handleAddComment = async (event) => {
    event.preventDefault();

    if (!newComment.trim() || !selectedTicket) {
      return;
    }

    try {
      setMessage("");

      await api.post(
        `/tickets/${selectedTicket.id}/comments`,
        {
          comment: newComment,
        }
      );

      setNewComment("");

      /*
       * Reload comments after adding
       */
      const commentsResponse = await api.get(
        `/tickets/${selectedTicket.id}/comments`
      );

      setComments(
        commentsResponse.data.comments ||
          commentsResponse.data ||
          []
      );

      setMessage("Comment added successfully.");
    } catch (error) {
      console.error("Error adding comment:", error);

      setMessage(
        error.response?.data?.error ||
          "Failed to add comment."
      );
    }
  };

  /*
   * Logout
   */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    setUser(null);
    setTickets([]);
    setSelectedTicket(null);
    setComments([]);

    setEmail("");
    setPassword("");
    setMessage("");
  };

  /*
   * =========================
   * AGENT DASHBOARD
   * =========================
   */
  if (user && user.role === "agent") {
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Support Ticket System</h1>
          <p>Agent Dashboard</p>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section agent-welcome">
          <h2>Welcome, {user.name}</h2>
          <p>{user.email}</p>

          <span className="agent-role-badge">
            Support Agent
          </span>
        </section>

        {message && (
          <p className="dashboard-message">
            {message}
          </p>
        )}

        <section className="agent-dashboard-card">
          <div className="tickets-heading">
            <div>
              <h2>All Support Tickets</h2>
              <p className="agent-ticket-subtitle">
                Manage customer support requests
              </p>
            </div>

            <button
              className="refresh-button"
              onClick={loadTickets}
            >
              Refresh
            </button>
          </div>

          <div className="ticket-list">
            {tickets.length === 0 ? (
              <p className="no-tickets">
                No support tickets available.
              </p>
            ) : (
              tickets.map((ticket) => (
                <div
                  className="ticket-card"
                  key={ticket.id}
                  onClick={() => handleViewTicket(ticket.id)}
                >
                  <div className="ticket-header">
                    <h3>{ticket.title}</h3>

                    <span
                      className={`status ${ticket.status}`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  <div className="ticket-info">
                    <p>
                      <strong>Customer:</strong>{" "}
                      {ticket.creator_name || "Unknown"}
                    </p>

                    <p>
                      <strong>Email:</strong>{" "}
                      {ticket.creator_email || "N/A"}
                    </p>

                    <p>
                      <strong>Priority:</strong>{" "}
                      {ticket.priority}
                    </p>

                    <p>
                      <strong>Created:</strong>{" "}
                      {ticket.created_at
                        ? new Date(
                            ticket.created_at
                          ).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>

                  <p className="ticket-description">
                    {ticket.description}
                  </p>

                  <button
                    className="view-ticket-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleViewTicket(ticket.id);
                    }}
                  >
                    View Ticket
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {selectedTicket && (
          <section className="agent-dashboard-card ticket-details">
            <button
              className="back-button"
              onClick={() => {
                setSelectedTicket(null);
                setComments([]);
                setMessage("");
              }}
            >
              ← Back to All Tickets
            </button>

            <h2>{selectedTicket.title}</h2>

            <div className="ticket-detail-row">
              <strong>Customer:</strong>
              <span>
                {selectedTicket.creator_name || "Unknown"}
              </span>
            </div>

            <div className="ticket-detail-row">
              <strong>Email:</strong>
              <span>
                {selectedTicket.creator_email || "N/A"}
              </span>
            </div>

            <div className="ticket-detail-row">
              <strong>Status:</strong>
              <span
                className={`status ${selectedTicket.status}`}
              >
                {selectedTicket.status}
              </span>
            </div>

            <div className="ticket-detail-row">
              <strong>Priority:</strong>
              <span>{selectedTicket.priority}</span>
            </div>
            <div className="agent-update-controls">
  <div className="agent-control">
    <label>Status</label>

    <select
      value={selectedTicket.status}
      onChange={(event) =>
        setSelectedTicket({
          ...selectedTicket,
          status: event.target.value,
        })
      }
    >
      <option value="open">Open</option>
      <option value="in_progress">In Progress</option>
      <option value="resolved">Resolved</option>
      <option value="closed">Closed</option>
    </select>
  </div>

  <div className="agent-control">
    <label>Priority</label>

    <select
      value={selectedTicket.priority}
      onChange={(event) =>
        setSelectedTicket({
          ...selectedTicket,
          priority: event.target.value,
        })
      }
    >
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="urgent">Urgent</option>
    </select>
  </div>
  <div className="agent-control">
  <label>Assigned Agent</label>

  <select
    value={selectedTicket.assigned_to || ""}
    onChange={(event) =>
      setSelectedTicket({
        ...selectedTicket,
        assigned_to: event.target.value
          ? Number(event.target.value)
          : null,
      })
    }
  >
    <option value="">Unassigned</option>

    {agents.map((agent) => (
      <option key={agent.id} value={agent.id}>
        {agent.name} ({agent.email})
      </option>
    ))}
  </select>
</div>

  <button
    className="update-ticket-button"
    onClick={handleUpdateTicket}
  >
    Update Ticket
  </button>
</div>

            <div className="ticket-detail-row">
              <strong>Created:</strong>
              <span>
                {selectedTicket.created_at
                  ? new Date(
                      selectedTicket.created_at
                    ).toLocaleString()
                  : "N/A"}
              </span>
            </div>

            <div className="ticket-detail-description">
              <h3>Description</h3>
              <p>{selectedTicket.description}</p>
            </div>

            <div className="ticket-comments">
              <h3>Comments</h3>

              {comments.length === 0 ? (
                <p className="no-comments">
                  No comments yet.
                </p>
              ) : (
                <div className="comments-list">
                  {comments.map((comment) => (
                    <div
                      className="comment-item"
                      key={comment.id}
                    >
                      <div className="comment-header">
                        <strong>
                          {comment.user_name ||
                            comment.name ||
                            "User"}
                        </strong>

                        <span>
                          {comment.created_at
                            ? new Date(
                                comment.created_at
                              ).toLocaleString()
                            : ""}
                        </span>
                      </div>

                      <p>{comment.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={handleAddComment}
                className="comment-form"
              >
                <textarea
                  value={newComment}
                  onChange={(event) =>
                    setNewComment(event.target.value)
                  }
                  placeholder="Reply to customer..."
                  rows="4"
                />

                <button type="submit">
                  Send Reply
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

  /*
   * =========================
   * CUSTOMER DASHBOARD
   * =========================
   */
  if (user && user.role === "customer") {
    return (
      <div className="dashboard-page">

        <header className="dashboard-header">
          <div>
            <h1>Support Ticket System</h1>
            <p>Customer Dashboard</p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="dashboard-content">

          {/* Welcome */}
          <section className="welcome-section">
            <h2>Welcome, {user.name}</h2>
            <p>{user.email}</p>
          </section>

          {/* Message */}
          {message && (
            <p className="dashboard-message">
              {message}
            </p>
          )}

          {/* Create Ticket */}
          <section className="dashboard-card">

            <h2>Create New Ticket</h2>

            <form onSubmit={handleCreateTicket}>

              <label>Title</label>

              <input
                type="text"
                value={ticketTitle}
                onChange={(event) =>
                  setTicketTitle(event.target.value)
                }
                placeholder="Enter ticket title"
                required
              />

              <label>Description</label>

              <textarea
                value={ticketDescription}
                onChange={(event) =>
                  setTicketDescription(event.target.value)
                }
                placeholder="Describe your issue"
                rows="5"
                required
              />

              <label>Priority</label>

              <select
                value={ticketPriority}
                onChange={(event) =>
                  setTicketPriority(event.target.value)
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              <button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Ticket"}
              </button>

            </form>
          </section>

          {/* My Tickets */}
          <section className="dashboard-card">

            <div className="tickets-heading">
              <h2>My Tickets</h2>

              <button
                className="refresh-button"
                onClick={loadTickets}
              >
                Refresh
              </button>
            </div>

            <div className="ticket-list">

              {tickets.length === 0 ? (
                <p className="no-tickets">
                  You haven't created any tickets yet.
                </p>
              ) : (
                tickets.map((ticket) => (
                  <div
                    className="ticket-card"
                    key={ticket.id}
                    onClick={() =>
                      handleViewTicket(ticket.id)
                    }
                  >

                    <div className="ticket-header">

                      <h3>{ticket.title}</h3>

                      <span
                        className={`status ${ticket.status}`}
                      >
                        {ticket.status}
                      </span>

                    </div>

                    <div className="ticket-info">

                      <p>
                        <strong>Priority:</strong>{" "}
                        {ticket.priority}
                      </p>

                      <p>
                        <strong>Created:</strong>{" "}
                        {ticket.created_at
                          ? new Date(
                              ticket.created_at
                            ).toLocaleString()
                          : "N/A"}
                      </p>

                    </div>

                    <p className="ticket-description">
                      {ticket.description}
                    </p>

                    <button
                      className="view-ticket-button"
                      onClick={(event) => {
                        event.stopPropagation();

                        handleViewTicket(ticket.id);
                      }}
                    >
                      View Details
                    </button>

                  </div>
                ))
              )}

            </div>
          </section>

          {/* Ticket Details */}
          {selectedTicket && (
            <section className="dashboard-card ticket-details">

              <button
                className="back-button"
                onClick={() => {
                  setSelectedTicket(null);
                  setComments([]);
                  setMessage("");
                }}
              >
                ← Back to My Tickets
              </button>

              <h2>{selectedTicket.title}</h2>

              <div className="ticket-detail-row">

                <strong>Status:</strong>

                <span
                  className={`status ${selectedTicket.status}`}
                >
                  {selectedTicket.status}
                </span>

              </div>

              <div className="ticket-detail-row">

                <strong>Priority:</strong>

                <span>
                  {selectedTicket.priority}
                </span>

              </div>

              <div className="ticket-detail-row">

                <strong>Created:</strong>

                <span>
                  {selectedTicket.created_at
                    ? new Date(
                        selectedTicket.created_at
                      ).toLocaleString()
                    : "N/A"}
                </span>

              </div>

              {/* Description */}
              <div className="ticket-detail-description">

                <h3>Description</h3>

                <p>
                  {selectedTicket.description}
                </p>

              </div>

              {/* Comments */}
              <div className="ticket-comments">

                <h3>Comments</h3>

                {comments.length === 0 ? (
                  <p className="no-comments">
                    No comments yet.
                  </p>
                ) : (
                  <div className="comments-list">

                    {comments.map((comment) => (
                      <div
                        className="comment-item"
                        key={comment.id}
                      >

                        <div className="comment-header">

                          <strong>
                            {comment.user_name ||
                              comment.name ||
                              "User"}
                          </strong>

                          <span>
                            {comment.created_at
                              ? new Date(
                                  comment.created_at
                                ).toLocaleString()
                              : ""}
                          </span>

                        </div>

                        <p>
                          {comment.comment}
                        </p>

                      </div>
                    ))}

                  </div>
                )}

                {/* Add Comment */}
                <form
                  onSubmit={handleAddComment}
                  className="comment-form"
                >

                  <textarea
                    value={newComment}
                    onChange={(event) =>
                      setNewComment(event.target.value)
                    }
                    placeholder="Write a reply..."
                    rows="4"
                  />

                  <button type="submit">
                    Add Comment
                  </button>

                </form>

              </div>

            </section>
          )}

        </main>
      </div>
    );
  }

  /*
   * =========================
   * LOGIN / REGISTER PAGE
   * =========================
   */
  return (
    <div className="login-page">

      <div className="login-container">

        <h1>Support Ticket System</h1>

        <p className="login-subtitle">
          {isRegistering
            ? "Create your customer account"
            : "Login to your account"}
        </p>

        {message && (
          <p className="login-message">
            {message}
          </p>
        )}

        <form
          onSubmit={
            isRegistering
              ? handleRegister
              : handleLogin
          }
        >

          {isRegistering && (
            <>
              <label>Name</label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Enter your name"
                required
              />
            </>
          )}

          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Enter your email"
            required
          />

          <label>Password</label>

          

<div className="password-input-container">
  <input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(event) =>
      setPassword(event.target.value)
    }
    placeholder="Enter your password"
    required
  />

  <button
    type="button"
    className="password-toggle"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? "Hide" : "Show"}
  </button>
</div>

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isRegistering
              ? "Register"
              : "Login"}
          </button>

        </form>

        <div className="register-text">

          {isRegistering ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setMessage("");
                }}
              >
                Login
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setMessage("");
                }}
              >
                Register
              </button>
            </>
          )}

        </div>

      </div>

    </div>
  );
}

export default App;