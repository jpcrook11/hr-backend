const express = require('express');
const { google } = require('googleapis');

async function migrateData() {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'your-credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SPREADSHEET_ID = '1QV3SEu5BssvTLps-Sb8i5a54Wos5wpLasYO9-5TweEo';

    try {
        // 1. First, let's get all existing data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G',
        });

        const rows = response.data.values || [];

        // 2. Create new array with reorganized data
        const newRows = rows.map(row => {
            // Skip header row if it exists
            if (row[0] === 'firstName') {
                return ['First Name', 'Last Name', 'Company', 'Email', 'Display Name', 'Score', 'Timestamp'];
            }

            // Current format: firstName, lastName, company, email, score, displayName, timestamp
            // New format: firstName, lastName, company, email, displayName, score, timestamp
            return [
                row[0] || '',                // First Name
                row[1] || '',                // Last Name
                row[2] || '',                // Company
                row[3] || '',                // Email
                row[5] || '',                // Display Name (was in position 6)
                row[4] || '',                // Score (was in position 5)
                row[6] || new Date().toISOString()  // Timestamp
            ];
        });

        // 3. Clear existing data
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G',
        });

        // 4. Write reorganized data
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: newRows
            }
        });

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Error during migration:', error);
    }
}

// Run the migration
migrateData();