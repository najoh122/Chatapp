# ChatApp

A real-time WhatsApp-style chat app. Create an account, pick a contact and chat instantly.

## Features

- Register and log in (passwords are hashed, login lasts 7 days)
- One-to-one real-time messages
- Online status and typing indicator
- Unread message counts
- Saved chat history
- Installable app (PWA) with its own green chat icon
- Works on phone and desktop

## Built with

- **Client:** React + Vite
- **Server:** Node.js, Express, Socket.IO
- **Database:** MongoDB Atlas
- **Login:** JSON Web Tokens + bcrypt

## Run it on your computer

You need Node.js 20 or newer.

```
cd server
npm install
npm start
```

In a second terminal:

```
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Settings the server needs

Set these as environment variables, or in `server/.env` when running locally:

| Name | What it is |
|---|---|
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | A long random secret used to sign logins |
| `PORT` | Optional. Defaults to 3000 |

Never put these values in the code or on GitHub.

## Roadmap

- Group chats
- Photos and file sharing
- Read receipts
- Play Store version
