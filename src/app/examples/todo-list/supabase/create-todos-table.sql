-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  category TEXT NOT NULL CHECK (category IN ('development', 'sales-marketing', 'personal', 'errands')),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on date for better query performance
CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category);

-- Enable Row Level Security
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now (you can make this more restrictive based on your auth setup)
CREATE POLICY "Allow all operations on todos" ON todos
  FOR ALL
  USING (true)
  WITH CHECK (true); 