# API & WebSocket Reference

The UNIXL platform relies on Express REST & WebSocket routes, Next.js ORPC fetch procedures, and FastAPI endpoints.

---

## 🟢 1. Express REST Server Endpoints (`apps/server` at `http://localhost:5000/api/v1`)

### Workflow Endpoints (`/workflows`)
* `GET /workflows?userId={id}` — List workflows for user.
* `GET /workflows/:id` — Fetch specific workflow definition.
* `POST /workflows` — Create workflow (`userId`, `name`, `description`).
* `PATCH /workflows/:id` — Update workflow (`name`, `definition`, `isPublic`).
* `DELETE /workflows/:id?userId={id}` — Delete workflow.

### Desk Block Endpoints (`/desk`)
* `GET /desk/:projectWorkflowId/blocks` — List blocks in project.
* `POST /desk/:projectWorkflowId/blocks` — Create new desk block.
* `POST /desk/:projectWorkflowId/reorder` — Update block orders.
* `GET /desk/blocks/:blockId` — Get block by ID.
* `PATCH /desk/blocks/:blockId/inputs` — Update text/checkbox inputs.
* `PATCH /desk/blocks/:blockId/output` — Update output preview dataset.
* `POST /desk/blocks/:blockId/commit` — Commit block output data to MasterSheet.
* `DELETE /desk/blocks/:blockId` — Remove block.

### Team Collaboration Endpoints (`/team`)
* `POST /team/invite` — Invite collaborator (`masterSheetId`, `invitedEmail`, `permission`, `reservedColumns`).
* `GET /team/invites/pending` — Get pending invitations.
* `GET /team/:masterSheetId/collaborators` — Get sheet collaborators list.
* `POST /team/invites/:shareId/accept` — Accept invitation.
* `POST /team/invites/:shareId/reject` — Reject invitation.
* `PATCH /team/invites/:shareId/columns` — Update reserved columns.
* `DELETE /team/collaborators/:shareId` — Remove collaborator.

---

## 📡 2. Real-Time WebSockets (`ws://localhost:5000/ws`)

### Connection URL
`ws://localhost:5000/ws?userId={userId}`

### Inbound Events (Client to Server)
```json
{ "type": "AUTHENTICATE", "userId": "usr_12345" }
```
```json
{ "type": "PING" }
```

### Outbound Events (Server to Client)
```json
{ "type": "CONNECTED", "message": "Real-time notifications WebSocket connected" }
```
```json
{ "type": "PONG" }
```
```json
{
  "type": "NOTIFICATION",
  "data": {
    "id": "notif_1",
    "title": "New Collaboration Invite",
    "message": "User A invited you to edit MasterSheet B"
  }
}
```

---

## 🐍 3. FastAPI Python Endpoints (`apps/pyp` at `http://localhost:8000`)

* `GET /health` — Health check endpoint.
* `POST /upload` — Upload CSV, XLSX, PDF, PPTX file; returns JSON records.
* `POST /process` — Attendance processor; returns CSV file stream.
* `POST /calculate` — Math operations (`SUM`, `AVERAGE`, `MULTIPLY`, `ADD`) across DataFrame columns.
* `POST /formula` — Evaluates dynamic formula expressions over table rows.
* `POST /transform` — Pivot, filter, or re-shape tabular dataset.

---

## ⚡ 4. Next.js ORPC Procedures (`apps/dashboard` at `/rpc`)

* `users.list` — Fetches user listings.

---

## 🔗 Related Notes
* [[Apps/Server]] — Express server implementation details.
* [[Apps/Pyp-Python-AI]] — Python data engine implementation.
* [[Apps/Dashboard]] — Frontend client integration.
