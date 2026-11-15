# Route Swap Lab

Route Swap Lab compares two routes between the same starting point and destination. Two travellers leave around the same time, record their departure and arrival, and compare their actual travel times. On the next trial, they can swap routes to see whether the result holds when a different person takes each route.

## How it works

1. The organiser chooses a different route for each traveller and selects **Create Trial**.
2. Each traveller opens their assigned link, selects **Start Trip** when leaving, and selects **Mark Arrived** at the destination.
3. The organiser's page updates automatically. When both travellers arrive, it shows their times and the difference.
4. Select **Swap Routes** to reverse the route selections, then select **Create Trial** to save the rematch.

The app measures time between button presses. Results reflect the conditions of each trial, including walking, waiting, and differences in departure times.

## Tech stack

| Part     | Technology                   |
| -------- | ---------------------------- |
| Frontend | React, TypeScript, Vite, CSS |
| API      | Express, TypeScript, Node.js |
| Database | MySQL with `mysql2`          |

## Run locally

### 1. Create the database

Use Node.js 26, npm, and a local MySQL server. Run the following SQL as a MySQL administrator on a fresh database. Use a password of your choice in place of `replace-with-your-password`.

```sql
CREATE DATABASE route_swap_lab CHARACTER SET utf8mb4;
USE route_swap_lab;

CREATE TABLE routes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  origin VARCHAR(150) NOT NULL,
  destination VARCHAR(150) NOT NULL
);

CREATE TABLE trials (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  route_a_id INT UNSIGNED NOT NULL,
  route_b_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (route_a_id) REFERENCES routes(id),
  FOREIGN KEY (route_b_id) REFERENCES routes(id),
  CHECK (route_a_id <> route_b_id)
);

ALTER TABLE trials
  ADD COLUMN previous_trial_id INT UNSIGNED NULL,
  ADD CONSTRAINT fk_trials_previous_trial
    FOREIGN KEY (previous_trial_id) REFERENCES trials(id);

CREATE TABLE trips (
  trial_id INT UNSIGNED NOT NULL,
  traveller ENUM('A', 'B') NOT NULL,
  departed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  arrived_at TIMESTAMP(3) NULL DEFAULT NULL,
  PRIMARY KEY (trial_id, traveller),
  FOREIGN KEY (trial_id) REFERENCES trials(id)
);

INSERT INTO routes (name, origin, destination) VALUES
  ('MRT route', 'Meeting point', 'Destination'),
  ('Bus route', 'Meeting point', 'Destination');

CREATE USER 'route_swap_app'@'127.0.0.1'
  IDENTIFIED BY 'replace-with-your-password';

GRANT SELECT, INSERT, UPDATE, DELETE
ON route_swap_lab.* TO 'route_swap_app'@'127.0.0.1';
```

### 2. Configure the backend

From the project root, create `backend/.env` with these values:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=route_swap_app
DB_PASSWORD="replace-with-your-password"
DB_NAME=route_swap_lab
TRIAL_LINK_SECRET=replace-with-64-hex-characters
```

Use the same database password as in the SQL above. Generate the signing secret with `openssl rand -hex 32`. Keep `backend/.env` local.

### 3. Start both servers

In one terminal, from the project root:

```bash
cd backend
npm ci
npm run dev
```

In a second terminal, from the project root:

```bash
cd frontend
npm ci
npm run dev
```

Open [Route Swap Lab](http://localhost:5174/). Vite forwards `/api` requests to Express on port `3001`. To check the database connection, open [`/api/db-health`](http://localhost:5174/api/db-health).

## Current status

The app is configured for local development.
