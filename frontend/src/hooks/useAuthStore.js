import { create }   from 'zustand'
import { persist }  from 'zustand/middleware'
import { api }      from '../lib/api.js'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user:  null,

      setToken: async (token) => {
        set({ token })
        try {
          const data = await api.get('/auth/me')
          set({ user: data.user })
        } catch {
          set({ token: null, user: null })
        }
      },

      logout: () => set({ token: null, user: null }),
    }),
    { name: 'intelliCodeRev-auth', partialize: s => ({ token: s.token }) }
  )
)
