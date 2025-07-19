# Multi-Column Todo List Editor

A Notion-like todo list application with multiple day columns, built with React, TypeScript, Tiptap v3, and Supabase. The app provides a rich text editing experience with drag-and-drop support for managing tasks across different days.

## Features

- **Multi-Column Layout**: Each day has its own Tiptap editor instance
- **Infinite Horizontal Scrolling**: Navigate through past and future days
- **Drag & Drop Support**: Reorder tasks with drag handles (Tiptap v3)
- **Task Management**:
  - Native checkbox support with Tiptap's task list extension
  - Check/uncheck todos with a single click
  - Edit todo titles inline
  - Automatic placeholder text for empty tasks
  - Nested task support with indentation
- **4 Task Categories per Day**:
  - 💻 Development
  - 📈 Sales & Marketing
  - 👤 Personal
  - 🏃 Errands
- **Rich Text Editing**:
  - Full keyboard navigation
  - Markdown-style shortcuts
  - Clean, distraction-free interface
- **Persistent Storage**: All todos are saved to Supabase
- **Auto-save**: Changes are automatically saved with debouncing
- **Visual Save Indicators**: See when your changes are being saved
- **Smart Scrolling**: Automatically scrolls to yesterday on load

## Setup

### 1. Database Setup

Run the SQL script in `supabase/create-todos-table.sql` in your Supabase project to create the necessary table:

```sql
-- See supabase/create-todos-table.sql for the complete script
```

### 2. Environment Variables

Make sure your Supabase environment variables are set up in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
```

### 3. Running the App

Navigate to the todo-list page at `/examples/todo-list` in your application.

## Architecture

- **Components**:
  - `page.tsx`: Main page component with save logic
  - `MultiColumnEditor`: Container for multiple day editors
  - `DayEditor`: Individual Tiptap editor for each day
  - Custom extensions for enhanced functionality
- **State Management**:
  - Uses Zustand for local state management
  - Integrates with Cedar for AI assistance
- **Data Persistence**:
  - Supabase for backend storage
  - Auto-save with debouncing
  - Optimistic updates for better UX

## Usage

1. **Adding Todos**: Click on any empty task line and start typing
2. **Completing Todos**: Click the checkbox to mark a todo as complete
3. **Editing Todos**: Click on any todo text to edit it inline
4. **Reordering Tasks**: Hover over a task to see the drag handle, then drag to reorder
5. **Navigating Days**: Scroll horizontally to view different days
6. **Keyboard Shortcuts**:
   - `Enter`: Create a new task
   - `Tab`: Indent task (create subtask)
   - `Shift+Tab`: Outdent task
   - `Cmd/Ctrl + A`: Select all in current editor

## Cedar Integration

The todo list is integrated with Cedar's AI capabilities through the ChatInput component. You can use natural language to:

- Add todos to specific categories and dates
- Mark todos as complete
- Query your todo list
- Get productivity insights
- Move tasks between days

## Editor Features

- **Drag Handles**: Hover over any task to reveal the drag handle
- **Placeholder Text**: Empty tasks show helpful placeholder text
- **Rich Text Support**: Full text formatting capabilities
- **Smooth Interactions**: Optimized for a fluid editing experience
- **Auto-focus**: Smart focus management for seamless task entry
- **Visual Feedback**: Selected tasks show a dashed outline when being dragged
