import { groupService } from '~/server/services/groups'

// Periodically drop groups that have had no connected client for a while, so
// abandoned sessions (closed tabs, crashes) don't leak memory or keep polling
// Spotify. All state is in-memory, so this is the only reaper there is.
const CLEANUP_INTERVAL_MS = 60 * 1000 // every minute

export default defineNitroPlugin(() => {
  const timer = setInterval(() => {
    try {
      const removed = groupService.cleanupInactiveGroups()
      if (removed > 0) {
        console.log(`[cleanup] Removed ${removed} inactive group(s)`)
      }
    } catch (error) {
      console.error('[cleanup] Error during inactive group cleanup:', error)
    }
  }, CLEANUP_INTERVAL_MS)

  // Don't keep the process alive just for the reaper.
  if (typeof timer.unref === 'function') timer.unref()
})
