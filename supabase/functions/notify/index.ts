import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  role: 'Admin' | 'HR' | 'Finance';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: NotificationRequest = await req.json();

    if (!body.role || !body.priority || !body.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: role, priority, message" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const validRoles = ['Admin', 'HR', 'Finance'];
    const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];

    if (!validRoles.includes(body.role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be Admin, HR, or Finance" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!validPriorities.includes(body.priority)) {
      return new Response(
        JSON.stringify({ error: "Invalid priority. Must be HIGH, MEDIUM, or LOW" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        role: body.role,
        priority: body.priority,
        message: body.message,
        status: 'sent',
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to create notification",
          details: error.message,
          status: 'failed'
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification: data,
        message: "Notification created successfully"
      }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
