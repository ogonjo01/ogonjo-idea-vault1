// src/hooks/useUserProfile.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/lib/supabase_types' // Corrected import path

type Profile = Database['public']['Tables']['profiles']['Row']

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
    } else {
      fetchOrUpsertProfile()
    }
  }, [user])

  const fetchOrUpsertProfile = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1️⃣ Try fetching an existing profile
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id,email,full_name,avatar_url,role,plan,created_at,updated_at')
        .eq('id', user!.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Unknown fetch error (not "row not found")
        throw fetchError
      }

      if (data) {
        // Found it!
        setProfile(data)
      } else {
        // 2️⃣ No row yet — upsert a new one
        const payload = {
          id: user!.id,
          email: user!.email!,
          full_name: (user!.user_metadata as any)?.full_name || null,
          avatar_url: (user!.user_metadata as any)?.avatar_url || null,
          role: 'user',
          plan: 'free',
          updated_at: new Date().toISOString(),
        }

        const { data: upserted, error: upsertError } = await supabase
          .from('profiles')
          .upsert(payload, { onConflict: 'id' })
          .select('id,email,full_name,avatar_url,role,plan,created_at,updated_at')
          .single()

        if (upsertError) throw upsertError
        setProfile(upserted)
      }
    } catch (err: any) {
      console.error('useUserProfile error:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return false
    setError(null)

    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('id,email,full_name,avatar_url,role,plan,created_at,updated_at')
        .single()

      if (updateError) throw updateError
      setProfile(data)
      return true
    } catch (err: any) {
      console.error('updateProfile error:', err)
      setError(err.message || 'Failed to update profile')
      return false
    }
  }

  const getLikedIdeas = async () => {
    if (!user) return []
    try {
      const { data, error: likesError } = await supabase
        .from('idea_likes')
        .select('idea_id,business_ideas(id,title,category,thumbnail,views,likes,is_featured,created_at)')
        .eq('user_id', user.id)

      if (likesError) throw likesError
      return data?.map(record => record.business_ideas).filter(Boolean) || []
    } catch (err) {
      console.error('getLikedIdeas error:', err)
      return []
    }
  }

  const getUploadedIdeas = async () => {
    if (!user) return []
    try {
      const { data, error: uploadError } = await supabase
        .from('business_ideas')
        .select('id,title,category,thumbnail,views,likes,is_featured,created_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (uploadError) throw uploadError
      return data || []
    } catch (err) {
      console.error('getUploadedIdeas error:', err)
      return []
    }
  }

  const isAdmin = () => profile?.role === 'admin'

  return {
    profile,
    loading,
    error,
    updateProfile,
    getLikedIdeas,
    getUploadedIdeas,
    isAdmin,
    refetch: fetchOrUpsertProfile,
  }
}