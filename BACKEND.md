# Backend Documentation

## Overview

The backend is built using Supabase Edge Functions (Deno runtime) and PostgreSQL database with Row Level Security.

## Architecture

```
Backend Components:
├── Database (PostgreSQL)
│   └── notifications table
├── Edge Functions (Deno)
│   └── notify function
└── REST API
    └── POST /notify
```

## Database

### Notifications Table

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('Admin', 'HR', 'Finance')),
  priority text NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  created_at timestamptz DEFAULT now()
);
```

### Security Policies

Row Level Security (RLS) is enabled with the following policies:

1. **Read**: Authenticated users can view all notifications
2. **Insert**: Authenticated and anonymous users can create notifications
3. **Update**: Authenticated users can update notification status

## Edge Function: notify

### Location
`supabase/functions/notify/index.ts`

### Method
POST

### Authentication
No JWT verification required (publicly accessible)

### Request Format

```typescript
{
  role: 'Admin' | 'HR' | 'Finance',
  priority: 'HIGH' | 'MEDIUM' | 'LOW',
  message: string
}
```

### Response Format

**Success (201):**
```json
{
  "success": true,
  "notification": {
    "id": "uuid",
    "role": "Admin",
    "priority": "HIGH",
    "message": "Your message",
    "status": "sent",
    "created_at": "timestamp"
  },
  "message": "Notification created successfully"
}
```

**Error (400/500):**
```json
{
  "error": "Error description",
  "details": "Detailed error message"
}
```

### Validation

The function validates:
- All required fields are present (role, priority, message)
- Role is one of: Admin, HR, Finance
- Priority is one of: HIGH, MEDIUM, LOW

### CORS

All CORS headers are configured to allow cross-origin requests:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey`

## Example API Calls

### Using cURL

```bash
curl -X POST https://your-project.supabase.co/functions/v1/notify \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Finance",
    "priority": "HIGH",
    "message": "Quarterly payroll review required"
  }'
```

### Using JavaScript/TypeScript

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/notify`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    role: 'HR',
    priority: 'MEDIUM',
    message: 'New employee onboarding documents ready'
  })
});

const data = await response.json();
```

### Using Python

```python
import requests

url = f"{SUPABASE_URL}/functions/v1/notify"
headers = {
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "role": "Admin",
    "priority": "LOW",
    "message": "System maintenance scheduled"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

## Error Handling

The function handles the following error cases:

1. **Invalid Method**: Returns 405 for non-POST requests
2. **Missing Fields**: Returns 400 if role, priority, or message is missing
3. **Invalid Role**: Returns 400 if role is not Admin, HR, or Finance
4. **Invalid Priority**: Returns 400 if priority is not HIGH, MEDIUM, or LOW
5. **Database Error**: Returns 500 if notification creation fails

## Environment Variables

The following environment variables are automatically configured in Supabase:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for backend operations
- `SUPABASE_ANON_KEY`: Anonymous key for client operations

## Deployment

Edge functions are automatically deployed. No manual deployment steps required.

## Testing

Test the endpoint using the admin dashboard or any HTTP client:

1. Open the admin dashboard
2. Fill in the notification form
3. Click "Send Notification"
4. Check the notifications list below

Or use tools like:
- Postman
- Thunder Client
- cURL
- httpie
