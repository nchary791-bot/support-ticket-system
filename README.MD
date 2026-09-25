# Support Ticket System

A full-stack Support Ticket System built with React, Node.js, Express, and MySQL.

## Features

- Customer registration and login
- Agent login
- JWT-based authentication
- Role-based access control
- Customers can create and view their tickets
- Agents can view and manage tickets
- Ticket status and priority updates
- Ticket assignment to agents
- Ticket comments
- MySQL database integration
- REST API
- Postman API collection
- Jest and Supertest automated API tests

## Technologies Used

### Frontend
- React
- Axios
- CSS

### Backend
- Node.js
- Express.js
- MySQL
- JWT
- bcrypt
- CORS

### Testing
- Jest
- Supertest
- Postman

## Project Structure

```text
support-ticket-system/
├── backend/
├── frontend/
├── database/
├── tests/
├── postman_collection.json
└── README.md
## Database Setup

1. Open MySQL.
2. Run `database/schema.sql`.
3. Run `database/seed.sql`.

The database used by the application is:

```text
support_ticket_system