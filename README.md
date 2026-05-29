# APPLYTRACK: Automated Job Application Tracker

APPLYTRACK is a professional job application tracker and email scanner. It automates the process of managing internship and job applications by securely connecting to a user's mailbox, scanning for career-related correspondence, and compiling the data into a visual Kanban pipeline. It also features a response assistant to quickly generate professional email replies.

This project is built with Node.js, Express, MongoDB (with local JSON fallback), and a vanilla HTML/CSS/JS frontend styled with a modern dark theme.

## Features

*   **Automated IMAP Scanning:** Connects to any IMAP-enabled email account (Gmail, Outlook, Yahoo) to automatically fetch, parse, and categorize job-related emails (Applied, Assessment, Interview, Offer, Rejection).
*   **Visual Kanban Board:** Automatically plots extracted applications onto a drag-and-drop Kanban pipeline. Users can also manually add or edit applications.
*   **Response Assistant:** Generates professional email templates for common scenarios like interview scheduling, online assessment confirmation, offer acceptance, and rejection follow-ups.
*   **Demo Mode:** A pre-loaded sandbox mode with mock data for testing the UI without connecting a real email account.
*   **Secure Authentication:** User accounts are isolated. Passwords for user accounts are hashed using bcrypt.
*   **Data Encryption:** Sensitive IMAP credentials are encrypted at rest using AES-256-CBC.
*   **Flexible Database:** Supports MongoDB Atlas for cloud deployment or defaults to a local `database.json` file if no MongoDB URI is provided.

## Architecture and Security

For developers extending or reviewing the codebase, understanding the security and data flow is critical:

*   **IMAP Parsing Logic:** The server uses `imap-simple` and `mailparser`. To conserve memory, it first fetches only email headers to identify relevant emails using keywords (e.g., "application", "interview", "offer", sender domains like "greenhouse", "lever"). It only downloads full bodies for matches.
*   **AES-256 Encryption:** User IMAP app passwords are encrypted before being saved to the database (either MongoDB or local JSON). The application uses Node.js `crypto` module with the `aes-256-cbc` algorithm. The `ENCRYPTION_KEY` environment variable is used to derive a 32-byte key securely.
*   **Tenant Isolation:** All database queries (both read and write) are scoped by a unique `userId` extracted from the JWT token, ensuring users cannot access each other's data or email credentials.

## Getting Started

### Prerequisites

*   Node.js (v14 or higher recommended)
*   npm (Node Package Manager)
*   (Optional) MongoDB Atlas URI for cloud database storage

### Installation

1.  Clone the repository and navigate into the project directory.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration

Create a `.env` file in the root directory to configure the server. If not provided, the server will use local defaults.

```env
PORT=3001
JWT_SECRET=your_secure_jwt_secret_here
ENCRYPTION_KEY=your_32_character_secure_encryption_key_here
MONGODB_URI=your_mongodb_connection_string_here # Optional: Omit to use local database.json
```

### Running the Application

Start the server using Node:

```bash
npm start
```

For development mode (if using nodemon or similar, though standard start is provided):

```bash
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in your `.env`).

## Usage Guide

1.  **Sign Up / Log In:** Open the application in your browser and create an account.
2.  **IMAP Setup:** Navigate to the IMAP Settings panel. Enter your email address and an App Password (not your standard email password). Configure the IMAP host and port (e.g., `imap.gmail.com` and `993`). Turn off "Demo Mode" and save.
3.  **Sync Emails:** Click the "Sync Emails" button in the top navigation. The server will scan your inbox for the past 30 days (configurable in settings) and extract application data.
4.  **Manage Pipeline:** Go to the Application Tracker panel to view your Kanban board. Click on any application to edit its status, add notes, or manually create new entries.
5.  **Generate Responses:** Use the Response Assistant panel to draft quick, professional replies. Select the context (e.g., Interview Scheduling), input the company name and role, and copy the generated draft.
