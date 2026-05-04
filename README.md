# Smart Campus Event, Society & Hackathon Management System

A MERN-based campus management platform for organizing college events, societies, hackathons, registrations, notifications, approvals, and student recommendations from one centralized system.

## Tech Stack

- MongoDB and Mongoose
- Express.js and Node.js
- React, Vite, and Tailwind CSS
- JWT authentication
- Nodemailer email notifications
- Redis-ready caching support

## Features

- Role-based authentication for students, society admins, and super admins
- Event, society, and hackathon management
- Approval workflow for campus activities
- Student registrations and dashboard views
- Personalized recommendation routes
- Email notification and reminder service support
- Demo seed data for quick local evaluation

## Project Structure

- `client` - React + Vite frontend
- `server` - Express API and MongoDB models
- `ai-service` - ai-service - planned separate AI service; current recommendations are handled through backend recommendation routes
- `docs` - planning and architecture notes

## Setup

1. Install Node.js and make sure MongoDB is available locally or through MongoDB Atlas.
2. Copy `server/.env.example` to `server/.env` and replace every placeholder with your own local values.
3. Copy `client/.env.example` to `client/.env`.
4. Install dependencies in both apps:

```bash
cd server
npm install

cd ../client
npm install
```

## Environment Files

`server/.env.example` contains placeholders only. Do not commit real secrets, connection strings, SMTP credentials, or JWT secrets.

`client/.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Run Locally

Start the API server:

```bash
cd server
npm run dev
```

The server runs on `http://localhost:5000` by default.

Start the client in another terminal:

```bash
cd client
npm run dev
```

The client runs on `http://localhost:5173` by default.

## Demo Data and Credentials

Seed the demo users, societies, and events:

```bash
cd server
npm run seed:demo
```

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@college.com` | `Super@123` |
| Society Admin | `codingadmin@college.com` | `Admin@123` |
| Society Admin | `cultureadmin@college.com` | `Admin@123` |
| Student | `student@college.com` | `Student@123` |

## Production Safety

- Keep `server/.env` and `client/.env` local only.
- Commit `.env.example` files with placeholders, never real credentials.
- Build output, logs, dependency folders, and editor files are ignored by `.gitignore`.

