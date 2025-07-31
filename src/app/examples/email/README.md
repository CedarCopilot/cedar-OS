# Gmail-like Email App

A fully functional email application built with Next.js, TypeScript, and Tailwind CSS that replicates Gmail's user interface and functionality.

## Features

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

1. Navigate to the email app:

   ```bash
   http://localhost:3000/examples/email
   ```

2. The app comes with mock data pre-loaded

3. Try these features:
   - Click "Compose" to write a new email
   - Click on any email to view it
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
