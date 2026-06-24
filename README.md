# Queue Cure - Patient Queue Management System

A real-time clinical queue management system with interactive, live-updating dashboards for both receptionist management and waiting lounge displays.

## Tech Stack
- **Frontend:** React, Vite 5, Tailwind CSS v4, Axios, Socket.IO Client, Lucide Icons.
- **Backend:** Node.js, Express.js, Mongoose, Socket.IO.
- **Database:** MongoDB Atlas (Cluster0).

---

## Getting Started

### 1. Set Workspace
Recommended: Set the directory `C:\Users\vigne\.gemini\antigravity-ide\scratch\queue-cure` as your active workspace.

### 2. Start Backend Server
The server is configured to connect to your MongoDB Atlas cluster and run on port `5000`.
To start the backend in dev/watch mode:
```bash
cd server
npm run dev
```

### 3. Start Frontend Client
The client runs on port `5173` by default.
To start the client dev server:
```bash
cd client
npm run dev
```

---

## Application Structure

- **`server/`**:
  - `models/Patient.js` - Patient schema (tokenNumber, name, status, duration, check-in, start, end times).
  - `controllers/patientController.js` - Logic for adding, calling next (protected from race conditions via local mutex lock), skipping, and computing dynamic average wait time.
  - `routes/patientRoutes.js` - Patient routes mapping.
  - `server.js` - Setup and Socket.IO server configurations.
- **`client/src/`**:
  - `pages/Reception.jsx` - Receptionist Command Center to add patients, call next, skip patients, and adjust fallback average times.
  - `pages/WaitingRoom.jsx` - Premium patient waiting lounge screen displaying "Now Serving", queue carousel, and personalized "Track Your Token" checker.
  - `services/api.js` - Axios API Client.
  - `services/socket.js` - Real-time Socket.IO configuration.

---

## Core Features & Logic

### 1. Concurrency/Race Condition protection
When multiple receptionists (or a fast double-click) request to call the next patient, the backend locks requests dynamically using an in-memory lock:
```javascript
let isProcessingNext = false;
```
If another request is running, it returns HTTP 429 to guarantee that only one transaction modifies the database active patient.

### 2. Dynamic Consultation Wait-Time Estimation
Wait times are computed dynamically based on the actual duration of completed sessions today:
$$\text{Average Duration} = \frac{\sum (\text{End Time} - \text{Start Time})}{\text{Total Completed Patients}}$$
- Fallback average is configurable in the Receptionist settings.
- If a patient tracks their token, their estimated wait time is:
$$\text{Estimated Wait} = \text{Tokens Ahead} \times \text{Dynamic Average Duration}$$
