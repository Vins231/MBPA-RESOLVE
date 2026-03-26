import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import session from "express-session";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Google OAuth configuration
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/api/auth/callback`
);

// Google Sheets configuration
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'mbpa-resolve-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    httpOnly: true,
  }
}));

// Helper to get sheet data
async function getSheetData(range: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const rows = response.data.values || [];
  if (rows.length === 0) return [];
  
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

// Helper to append sheet data
async function appendSheetData(range: string, values: any[]) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${range}!A1:Z1`,
  });
  const headers = response.data.values?.[0] || [];
  
  const row = headers.map(header => {
    const val = values.find(v => v[header] !== undefined)?.[header];
    return val !== undefined ? val : '';
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${range}!A2`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });
}

// Helper to update sheet data
async function updateSheetData(range: string, idField: string, idValue: string, updates: any) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${range}!A:Z`,
  });
  const rows = response.data.values || [];
  if (rows.length === 0) return;
  
  const headers = rows[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex === -1) return;
  
  const rowIndex = rows.findIndex(row => row[idIndex] === idValue);
  if (rowIndex === -1) return;
  
  const updatedRow = [...rows[rowIndex]];
  Object.keys(updates).forEach(key => {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1) {
      updatedRow[colIndex] = updates[key];
    }
  });
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${range}!A${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [updatedRow],
    },
  });
}

// Helper to delete sheet data
async function deleteSheetData(range: string, idField: string, idValue: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${range}!A:Z`,
  });
  const rows = response.data.values || [];
  if (rows.length === 0) return;
  
  const headers = rows[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex === -1) return;
  
  const rowIndex = rows.findIndex(row => row[idIndex] === idValue);
  if (rowIndex === -1) return;
  
  // Get sheet ID
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === range);
  if (!sheet) return;
  const sheetId = sheet.properties?.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1
          }
        }
      }]
    }
  });
}

// Auth Routes
app.post("/api/auth/demo", async (req, res) => {
  const { role } = req.body;
  const demoProfiles: any = {
    'Admin': { uid: 'demo-admin', name: 'Amit Sharma', role: 'Admin', email: 'admin@demo.app', mobile: '9820012345', society: 'Colaba', status: 'approved', isApproved: 'TRUE' },
    'Supervisor': { uid: 'demo-sup', name: 'Rajesh Patil', role: 'Supervisor', email: 'sup@demo.app', mobile: '9820054321', society: 'Colaba', status: 'approved', isApproved: 'TRUE' },
    'Technician': { uid: 'demo-tech', name: 'Suresh Kumar', role: 'Technician', email: 'tech@demo.app', mobile: '9820099887', society: 'Colaba', status: 'approved', isApproved: 'TRUE' },
    'Resident': { uid: 'demo-res', name: 'Priya Verma', role: 'Resident', email: 'res@demo.app', mobile: '9820011223', society: 'Colaba', status: 'approved', isApproved: 'TRUE' },
  };
  
  const profile = demoProfiles[role];
  if (!profile) return res.status(400).json({ error: "Invalid role" });
  
  (req.session as any).user = profile;
  res.json({ success: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { mobile, password } = req.body;
  const users = await getSheetData('Users');
  const profile = users.find(u => u.mobile === mobile);
  
  if (!profile) return res.status(401).json({ error: "User not found" });
  // In a real app, verify password here
  
  (req.session as any).user = profile;
  res.json({ success: true });
});

app.get("/api/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
  });
  res.json({ url });
});

app.get("/api/auth/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    (req.session as any).user = {
      uid: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      photoURL: userInfo.picture,
    };
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/auth/me", async (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  
  // Fetch profile from Sheets
  const users = await getSheetData('Users');
  const profile = users.find(u => u.uid === user.uid || u.email === user.email);
  
  res.json({ ...user, profile });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// User Routes
app.get("/api/users", async (req, res) => {
  const user = (req.session as any).user;
  if (!user || (user.role !== 'Admin' && user.role !== 'Supervisor')) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const users = await getSheetData('Users');
  res.json(users);
});

app.patch("/api/users/:uid", async (req, res) => {
  const user = (req.session as any).user;
  if (!user || (user.role !== 'Admin' && user.role !== 'Supervisor')) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { uid } = req.params;
  const updates = req.body;
  await updateSheetData('Users', 'uid', uid, updates);
  res.json({ success: true });
});

app.delete("/api/users/:uid", async (req, res) => {
  const user = (req.session as any).user;
  if (!user || user.role !== 'Admin') {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { uid } = req.params;
  await deleteSheetData('Users', 'uid', uid);
  res.json({ success: true });
});

app.post("/api/users/profile", async (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  
  const profileData = req.body;
  await appendSheetData('Users', [{
    uid: user.uid,
    email: user.email,
    name: user.name,
    ...profileData,
    createdAt: new Date().toISOString(),
    status: 'pending',
    role: 'Resident'
  }]);
  
  res.json({ success: true });
});

// Complaints Routes
app.get("/api/complaints", async (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  
  const { complaintId } = req.query;
  const complaints = await getSheetData('Complaints');
  
  if (complaintId) {
    return res.json(complaints.filter(c => c.complaintId === complaintId));
  }
  
  res.json(complaints);
});

app.post("/api/complaints", async (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  
  const complaintData = req.body;
  const newComplaint = {
    id: Math.random().toString(36).substr(2, 9),
    ...complaintData,
    authorUid: user.uid,
    authorName: user.name,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await appendSheetData('Complaints', [newComplaint]);
  res.json(newComplaint);
});

app.patch("/api/complaints/:id", async (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  
  const { id } = req.params;
  const updates = req.body;
  await updateSheetData('Complaints', 'id', id, { ...updates, updatedAt: new Date().toISOString() });
  res.json({ success: true });
});

app.get("/api/complaints/:id/timeline", async (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  
  const { id } = req.params;
  const timeline = await getSheetData('Timeline');
  res.json(timeline.filter(t => t.complaintId === id));
});

app.post("/api/complaints/:id/timeline", async (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  
  const { id } = req.params;
  const event = {
    complaintId: id,
    eventId: Math.random().toString(36).substr(2, 9),
    ...req.body,
    authorName: user.name,
    createdAt: new Date().toISOString(),
  };
  
  await appendSheetData('Timeline', [event]);
  res.json(event);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
