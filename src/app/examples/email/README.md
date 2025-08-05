# Gmail-like Email App with Real Gmail Integration

A fully functional email application built with Next.js, TypeScript, and Tailwind CSS that replicates Gmail's user interface and functionality. Now with **real Gmail integration** - connect your Gmail account to read and send actual emails!

## Features

### 🆕 Gmail Integration

- **OAuth Authentication**: Secure Google sign-in
- **Read Real Emails**: Fetch emails from your Gmail inbox
- **Send Emails**: Compose and send emails through Gmail
- **Labels Support**: Access your Gmail labels
- **Secure Token Storage**: OAuth tokens stored securely

### Core Functionality

- **Inbox Management**: View, read, and manage emails with a clean interface
- **Email Composition**: Full-featured compose window with To, Cc, Bcc fields
- **Search**: Search emails by subject, body, sender
- **Labels**: Organize emails with customizable labels
- **Starred & Important**: Mark emails as starred or important
- **Trash & Spam**: Move emails to trash or mark as spam

### UI/UX Features

- **Gmail-like Interface**: Familiar layout with sidebar navigation
- **Dark Mode Support**: Full dark mode theme
- **Responsive Design**: Works on desktop and tablet sizes
- **Density Settings**: Choose between comfortable, cozy, or compact view
- **Keyboard Shortcuts**: (Coming soon)
- **Drag & Drop**: (Coming soon)

### Email Actions

- Mark as read/unread
- Star/unstar emails
- Apply/remove labels
- Archive emails
- Delete emails
- Reply, Reply All, Forward

## Technical Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **UI Components**: Custom components with shadcn/ui

## Project Structure

```
email/
├── components/
│   ├── Header.tsx        # Top navigation bar with search
│   ├── Sidebar.tsx       # Left sidebar with navigation
│   ├── EmailList.tsx     # Main email list view
│   └── ComposeEmail.tsx  # Compose email modal
├── store/
│   └── emailStore.ts     # Zustand store for state management
├── types/
│   └── index.ts          # TypeScript type definitions
├── layout.tsx            # Root layout
└── page.tsx              # Main page component
```

## Getting Started

### Basic Setup (Mock Data)

1. Navigate to the email app:

   ```bash
   http://localhost:3000/examples/email
   ```

2. The app comes with mock data pre-loaded

3. Try these features:
   - Click "Compose" to write a new email
   - Click on any email to view it

### Gmail Integration Setup

To connect your real Gmail account:

1. **Set up Google Cloud Project**

   - Follow the detailed instructions in [GMAIL_SETUP.md](./GMAIL_SETUP.md)
   - Create OAuth 2.0 credentials
   - Enable Gmail API

2. **Configure Environment Variables**

   - Copy `env.example` to `.env.local` in the project root
   - Add your Google Client ID and Secret

   ```bash
   cp src/app/examples/email/env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Connect Your Gmail**
   - Click "Connect Gmail Account" in the app
   - Authorize the app to access your Gmail
   - Your real emails will appear!

### Security Note

- Never commit your `.env.local` file
- In production, use secure token storage (database)
- Implement token refresh for long sessions
  - Use the search bar to find emails
  - Star important emails
  - Switch between different views (Inbox, Sent, Drafts, etc.)

## Mock Data

The app includes 50 mock emails with realistic data including:

- Various senders with avatars
- Different subjects and body content
- Random dates within the last 30 days
- Some with attachments
- Mixed read/unread status

## Future Enhancements

- Email threading/conversation view
- Rich text editor for compose
- Attachment upload functionality
- Keyboard shortcuts
- Drag and drop to apply labels
- Multiple email selection with shift+click
- Email filters and rules
- Integration with real email APIs
- Progressive Web App (PWA) support
