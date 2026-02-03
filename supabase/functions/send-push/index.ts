import '../_shared/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single()

    if (roleError || roleData?.role !== 'moderator') {
      return new Response(
        JSON.stringify({ error: 'Only moderators can send notifications' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { teamId: requestedTeamId, title, message } = await req.json()

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'Title and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('moderator_id', caller.id)
      .single()

    if (teamError || !teamData) {
      return new Response(
        JSON.stringify({ error: 'Moderator team not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (requestedTeamId && requestedTeamId !== teamData.id) {
      return new Response(
        JSON.stringify({ error: 'Team mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const teamId = teamData.id

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('moderator_settings')
      .select('onesignal_app_id, onesignal_rest_api_key')
      .eq('team_id', teamId)
      .maybeSingle()

    if (settingsError || !settings?.onesignal_app_id || !settings?.onesignal_rest_api_key) {
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: players, error: playersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('team_id', teamId)

    if (playersError || !players?.length) {
      return new Response(
        JSON.stringify({ error: 'No players found for team' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const playerIds = players.map((p: { id: string }) => p.id)

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${settings.onesignal_rest_api_key}`,
      },
      body: JSON.stringify({
        app_id: settings.onesignal_app_id,
        include_external_user_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      return new Response(
        JSON.stringify({ error: `OneSignal API error: ${response.status}`, details: body }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
