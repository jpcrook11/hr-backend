const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();

// CORS configuration that works for both environments
app.use(cors({
  origin: ['https://jpcrook11.github.io', 'http://localhost:3000'],
  methods: ['GET', 'POST']
}));

app.use(express.json());

// Flexible credentials setup for both environments
let credentials;
try {
  // First try to load local credentials file
  credentials = require('./your-credentials.json');
} catch {
  // If that fails (like in production), use environment variable
  try {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } catch (error) {
    console.error('Error loading credentials:', error);
    process.exit(1);
  }
}

const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

// Spreadsheet ID from environment or fallback
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1QV3SEu5BssvTLps-Sb8i5a54Wos5wpLasYO9-5TweEo';

// Submit score endpoint
app.post('/api/submit-score', async (req, res) => {
  try {
    const { firstName, lastName, company, email, displayName, score, communicationOptIn } = req.body;
    
    // Validate input
    if (!firstName || !lastName || !company || !email || score === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Add to Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:H', // Updated range to include new column
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          firstName,
          lastName,
          company,
          email,
          displayName || '',
          score,
          new Date().toISOString(),
          communicationOptIn ? 'Yes' : 'No' // Add communication preference
        ]]
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save score. Please try again.' 
    });
  }
});

// Get leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:F',
    });

    const rows = response.data.values || [];
    
    // Skip header row if it exists and get top 10 scores
    const startIndex = rows[0]?.[0] === 'firstName' ? 1 : 0;
    const leaderboard = rows.slice(startIndex)
      .map(row => ({
        firstName: row[0],
        lastName: row[1],
        company: row[2],
        displayName: row[4] || '',
        score: parseInt(row[5]) || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch leaderboard' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});