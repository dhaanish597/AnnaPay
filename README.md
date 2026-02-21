# Payroll Notification System

A full-stack notification system for payroll applications with role-based routing, priority levels, and real-time updates.

## Features

- Role-based notification routing (Admin, HR, Finance)
- Priority levels (HIGH, MEDIUM, LOW)
- Real-time notification updates
- Filter notifications by priority, status, and role
- Clean admin dashboard
- REST API endpoint for sending notifications

## Tech Stack

**Backend:**
- Supabase (Database + Edge Functions)
- PostgreSQL with Row Level Security
- REST API

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS
- Vite
- Lucide React (icons)

## Project Structure

```
project/
├── supabase/
│   └── functions/
│       └── notify/
│           └── index.ts          # POST /notify endpoint
├── src/
│   ├── components/
│   │   ├── NotificationDashboard.tsx
│   │   └── NotificationForm.tsx
│   ├── lib/
│   │   └── supabase.ts           # Supabase client
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── README.md
```

## Setup

1. Create a `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

## API Usage

### POST /notify

Send a notification to a specific role with priority.

**Endpoint:**
```
POST https://your-project.supabase.co/functions/v1/notify
```

**Headers:**
```
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "Admin",
  "priority": "HIGH",
  "message": "Monthly payroll processed successfully"
}
```

**Valid Values:**
- `role`: "Admin", "HR", "Finance"
- `priority`: "HIGH", "MEDIUM", "LOW"
- `message`: Any text string

**Response:**
```json
{
  "success": true,
  "notification": {
    "id": "uuid",
    "role": "Admin",
    "priority": "HIGH",
    "message": "Monthly payroll processed successfully",
    "status": "sent",
    "created_at": "2024-01-01T12:00:00Z"
  },
  "message": "Notification created successfully"
}
```

## Database Schema

The system uses a single `notifications` table:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| role | text | Target role (Admin, HR, Finance) |
| priority | text | Priority level (HIGH, MEDIUM, LOW) |
| message | text | Notification message |
| status | text | Delivery status (sent, failed) |
| created_at | timestamptz | Creation timestamp |

## Security

- Row Level Security (RLS) enabled on all tables
- Authenticated users can view and create notifications
- Edge function accessible without JWT for external integrations
- CORS enabled for cross-origin requests

## Features Showcase

1. **Create Notifications**: Use the form at the top to create new notifications
2. **Real-time Updates**: Notifications appear instantly without page refresh
3. **Filter by Priority**: View HIGH, MEDIUM, or LOW priority notifications
4. **Filter by Status**: View sent or failed notifications
5. **Filter by Role**: View notifications for specific roles (Admin, HR, Finance)
6. **Visual Indicators**: Color-coded badges for priorities, roles, and status

## Development

Build for production:
```bash
npm run build
```

Type check:
```bash
npm run typecheck
```

Lint:
```bash
npm run lint
```
