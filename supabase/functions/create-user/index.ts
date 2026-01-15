import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
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

    // Get the authorization header to verify the caller is a moderator
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the caller
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if caller is a moderator
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single()

    if (roleError || roleData?.role !== 'moderator') {
      return new Response(
        JSON.stringify({ error: 'Only moderators can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the moderator's team
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

    const { username, password, name, role = 'player', player_role = null } = await req.json()

    if (!username || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Username, password and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the auth user with email format
    const email = `${username}@asdpicche.local`
    
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, name }
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // Create profile with team_id and player_role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        username,
        name,
        team_id: teamData.id,
        player_role: player_role
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: 'Failed to create profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user role
    const { error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role
      })

    if (userRoleError) {
      console.error('Error creating user role:', userRoleError)
      // Rollback
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: 'Failed to create user role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
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
