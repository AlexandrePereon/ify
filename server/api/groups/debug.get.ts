import { groupService } from '~/server/services/groups'

export default defineEventHandler(async (event) => {
  const groups = groupService.getAllGroups()
  
  return {
    totalGroups: groups.length,
    groups: groups.map(group => ({
      id: group.id,
      code: group.code,
      name: group.name,
      adminId: group.admin.id,
      membersCount: group.members.length,
      members: group.members.map(m => ({ id: m.id, name: m.name })),
      hasTokens: !!group.admin.spotifyTokens,
      createdAt: group.createdAt,
      lastActivity: group.lastActivity,
      connectedStreams: group.eventStreams.size
    }))
  }
})