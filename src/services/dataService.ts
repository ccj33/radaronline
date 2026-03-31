import type { Action, ActionComment, ActionTag, RaciMember, TeamMember } from '../types';
import type { Announcement } from '../types/announcement.types';
import type { AutomatedEvent as AutomatedEventModel } from './automatedEventsService';
import * as actionsService from './actionsService';
import * as commentsService from './commentsService';
import * as teamsService from './teamsService';
import * as objectivesActivitiesService from './objectivesActivitiesService';
import * as tagsService from './tagsService';
import * as announcementsService from './announcementsService';
import * as automatedEventsService from './automatedEventsService';

// Legacy compatibility facade:
// keep this file as a stable API while feature services are modularized.

// =====================================
// ACTIONS - CRUD
// =====================================

export async function loadActions(microregiaoId?: string): Promise<Action[]> {
  return actionsService.loadActions(microregiaoId);
}

export async function loadActionComments(actionUid: string): Promise<ActionComment[]> {
  return commentsService.loadActionComments(actionUid);
}

export async function createAction(input: {
  microregiaoId: string;
  activityId: string;
  actionNumber: number;
  title?: string;
}): Promise<Action & { dbId: string }> {
  return actionsService.createAction(input);
}

export async function updateAction(
  uid: string,
  updates: Partial<Omit<Action, 'uid' | 'id' | 'activityId' | 'microregiaoId' | 'comments' | 'raci'>>
): Promise<Action> {
  return actionsService.updateAction(uid, updates);
}

export async function updateActionActivityId(uid: string, newActivityId: string): Promise<void> {
  return objectivesActivitiesService.updateActionActivityId(uid, newActivityId);
}

export async function upsertAction(action: Action): Promise<Action> {
  return actionsService.upsertAction(action);
}

export async function deleteAction(uid: string): Promise<void> {
  return actionsService.deleteAction(uid);
}

// =====================================
// RACI - CRUD
// =====================================

export async function addRaciMember(
  actionUid: string,
  memberName: string,
  role: 'R' | 'A' | 'C' | 'I'
): Promise<RaciMember> {
  return actionsService.addRaciMember(actionUid, memberName, role);
}

export async function removeRaciMember(actionUid: string, memberName: string): Promise<void> {
  return actionsService.removeRaciMember(actionUid, memberName);
}

// =====================================
// COMMENTS - CRUD
// =====================================

export async function addComment(
  actionUid: string,
  content: string,
  parentId?: string | null
): Promise<ActionComment> {
  return commentsService.addComment(actionUid, content, parentId);
}

export async function updateComment(commentId: string, content: string): Promise<void> {
  return commentsService.updateComment(commentId, content);
}

export async function deleteComment(commentId: string): Promise<void> {
  return commentsService.deleteComment(commentId);
}

// =====================================
// TEAMS - CRUD
// =====================================

export async function loadTeams(microregiaoId?: string): Promise<Record<string, TeamMember[]>> {
  return teamsService.loadTeams(microregiaoId);
}

export async function getUserTeamStatus(email: string): Promise<{ exists: boolean; municipio: string | null }> {
  return teamsService.getUserTeamStatus(email);
}

export async function saveUserMunicipality(
  microregiaoId: string,
  email: string,
  municipio: string,
  userName: string
): Promise<void> {
  return teamsService.saveUserMunicipality(microregiaoId, email, municipio, userName);
}

export async function addTeamMember(input: {
  microregiaoId: string;
  name: string;
  role: string;
  email?: string;
  municipio?: string;
}): Promise<TeamMember> {
  return teamsService.addTeamMember(input);
}

export async function removeTeamMember(memberId: string): Promise<void> {
  return teamsService.removeTeamMember(memberId);
}

// =====================================
// MENTIONS / NOTIFICATIONS
// =====================================

export async function createMentionNotification(
  mentionedUserName: string,
  actionTitle: string,
  authorName: string
): Promise<void> {
  return commentsService.createMentionNotification(mentionedUserName, actionTitle, authorName);
}

export async function processMentions(
  commentContent: string,
  actionTitle: string,
  authorName: string
): Promise<void> {
  return commentsService.processMentions(commentContent, actionTitle, authorName);
}

// =====================================
// PENDING REGISTRATIONS
// =====================================

export type { PendingRegistration } from './teamsService';

export async function loadPendingRegistrations(): Promise<import('./teamsService').PendingRegistration[]> {
  return teamsService.loadPendingRegistrations();
}

export async function deletePendingRegistration(id: string): Promise<void> {
  return teamsService.deletePendingRegistration(id);
}

// =====================================
// OBJECTIVES & ACTIVITIES
// =====================================

export async function loadObjectives(microregiaoId?: string): Promise<{
  id: number;
  title: string;
  status: 'on-track' | 'delayed';
  microregiaoId: string;
  eixo?: number;
  description?: string;
  eixoLabel?: string;
  eixoColor?: string;
}[]> {
  return objectivesActivitiesService.loadObjectives(microregiaoId);
}

export async function loadActivities(
  microregiaoId?: string
): Promise<Record<number, { id: string; title: string; description: string; microregiaoId?: string }[]>> {
  return objectivesActivitiesService.loadActivities(microregiaoId);
}

export async function createObjective(
  title: string,
  microregiaoId: string
): Promise<{ id: number; title: string; status: 'on-track' | 'delayed' }> {
  return objectivesActivitiesService.createObjective(title, microregiaoId);
}

export async function updateObjective(
  id: number,
  updates: {
    title?: string;
    status?: 'on-track' | 'delayed';
    eixo?: number;
    description?: string;
    eixoLabel?: string;
    eixoColor?: string;
  }
): Promise<void> {
  return objectivesActivitiesService.updateObjective(id, updates);
}

export async function deleteObjective(id: number): Promise<void> {
  return objectivesActivitiesService.deleteObjective(id);
}

export async function createActivity(
  objectiveId: number,
  id: string,
  title: string,
  microregiaoId: string,
  description: string = ''
): Promise<{ id: string; title: string; description: string }> {
  return objectivesActivitiesService.createActivity(objectiveId, id, title, microregiaoId, description);
}

export async function updateActivity(id: string, updates: { title?: string; description?: string }): Promise<void> {
  return objectivesActivitiesService.updateActivity(id, updates);
}

export async function deleteActivity(id: string): Promise<void> {
  return objectivesActivitiesService.deleteActivity(id);
}

// =====================================
// TAGS - CRUD
// =====================================

export async function loadTags(microId?: string): Promise<ActionTag[]> {
  return tagsService.loadTags(microId);
}

export async function toggleTagFavorite(tagId: string, microId: string): Promise<boolean> {
  return tagsService.toggleTagFavorite(tagId, microId);
}

export async function createTag(name: string): Promise<ActionTag> {
  return tagsService.createTag(name);
}

export async function addTagToAction(actionUid: string, tagId: string, actionDbUuid?: string): Promise<void> {
  return tagsService.addTagToAction(actionUid, tagId, actionDbUuid);
}

export async function removeTagFromAction(actionUid: string, tagId: string): Promise<void> {
  return tagsService.removeTagFromAction(actionUid, tagId);
}

export async function loadTagsForAction(actionUid: string): Promise<ActionTag[]> {
  return tagsService.loadTagsForAction(actionUid);
}

export async function deleteTag(tagId: string): Promise<void> {
  return tagsService.deleteTag(tagId);
}

// =====================================
// ANNOUNCEMENTS
// =====================================

export async function loadAnnouncements(microregiaoId?: string): Promise<Announcement[]> {
  return announcementsService.loadAnnouncements(microregiaoId);
}

export async function loadAllAnnouncementsForAdmin(): Promise<Announcement[]> {
  return announcementsService.loadAllAnnouncementsForAdmin();
}

export async function createAnnouncement(
  data: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>
): Promise<Announcement | null> {
  return announcementsService.createAnnouncement(data);
}

export async function updateAnnouncement(
  id: string,
  data: Partial<Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  return announcementsService.updateAnnouncement(id, data);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  return announcementsService.deleteAnnouncement(id);
}

export async function toggleAnnouncementActive(id: string, currentState: boolean): Promise<void> {
  return announcementsService.toggleAnnouncementActive(id, currentState);
}

// =====================================
// AUTOMATED EVENTS
// =====================================

export type { AutomatedEventType, AutomatedEvent } from './automatedEventsService';

export async function loadAutomatedEvents(limit: number = 6) {
  return automatedEventsService.loadAutomatedEvents(limit);
}

export async function recordAutomatedEvent(
  event: Omit<AutomatedEventModel, 'id' | 'timestamp' | 'created_at' | 'likes' | 'isActive'>
): Promise<void> {
  return automatedEventsService.recordAutomatedEvent(event);
}
