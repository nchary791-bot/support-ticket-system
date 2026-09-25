USE support_ticket_system;

-- Insert sample users
INSERT INTO users (name, email, password_hash, role)
VALUES
(
    'John Customer',
    'customer@example.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'customer'
),
(
    'Sarah Agent',
    'agent@example.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'agent'
);

-- Insert sample ticket
INSERT INTO tickets (
    title,
    description,
    status,
    priority,
    created_by
)
VALUES
(
    'Unable to login',
    'I am unable to login to my account even though I am using the correct password.',
    'open',
    'high',
    1
);

-- Insert sample comment
INSERT INTO ticket_comments (
    ticket_id,
    user_id,
    comment
)
VALUES
(
    1,
    2,
    'Hello John, I have received your ticket and will investigate the login issue.'
);