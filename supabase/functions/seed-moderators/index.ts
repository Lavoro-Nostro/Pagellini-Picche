import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const moderators = [
  { username: 'new', password: '12341234', name: 'New', teamName: 'New Picche' },
  { username: 'reali', password: '23452345', name: 'Reali', teamName: 'Picche Reali' },
  { username: 'black', password: '34563456', name: 'Black', teamName: 'Black Picche' }
]

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

    const results = []

    for (const mod of moderators) {
      const email = `${mod.username}@asdpicche.local`
      
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email === email)
      
      let userId: string

      if (existingUser) {
        // Update the existing user's password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { password: mod.password }
        )
        
        if (updateError) {
          results.push({ username: mod.username, error: updateError.message })
          continue
        }
        
        userId = existingUser.id
        
        // Update profile username if needed
        await supabaseAdmin
          .from('profiles')
          .update({ username: mod.username, name: mod.name })
          .eq('id', userId)

        results.push({ username: mod.username, status: 'updated', userId })
      } else {
        // Create new user
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: mod.password,
          email_confirm: true,
          user_metadata: { username: mod.username, name: mod.name }
        })

        if (createError) {
          results.push({ username: mod.username, error: createError.message })
          continue
        }

        userId = authData.user.id

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            username: mod.username,
            name: mod.name
          })

        if (profileError) {
          console.error('Profile error:', profileError)
        }

        // Create user role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'moderator'
          })

        if (roleError) {
          console.error('Role error:', roleError)
        }

        results.push({ username: mod.username, status: 'created', userId })
      }

      // Create or update team for this moderator
      const { data: existingTeam } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('moderator_id', userId)
        .single()

      if (!existingTeam) {
        await supabaseAdmin
          .from('teams')
          .insert({
            name: mod.teamName,
            moderator_id: userId
          })
      } else {
        await supabaseAdmin
          .from('teams')
          .update({ name: mod.teamName })
          .eq('id', existingTeam.id)
      }
    }

    // Now assign existing players to "new" moderator's team
    const { data: newModTeam } = await supabaseAdmin
      .from('teams')
      .select('id, moderator_id')
      .eq('name', 'New Picche')
      .single()

    if (newModTeam) {
      // Get all players (users with player role) that don't have a team
      const { data: players } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'player')

      if (players) {
        for (const player of players) {
          await supabaseAdmin
            .from('profiles')
            .update({ team_id: newModTeam.id })
            .eq('id', player.user_id)
            .is('team_id', null)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
