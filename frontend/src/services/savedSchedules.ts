import type { SaveScheduleRequest, SavedScheduleDetail, SavedScheduleSummary } from '../types/savedSchedule.ts'
import { apiDelete, apiGet, apiPost } from './api.ts'

// Every saved-schedule endpoint requires login, so each call sends the JWT ({ auth: true }).

export function listSavedSchedules(): Promise<SavedScheduleSummary[]> {
  return apiGet<SavedScheduleSummary[]>('/api/schedules/saved', { auth: true })
}

export function getSavedSchedule(id: number): Promise<SavedScheduleDetail> {
  return apiGet<SavedScheduleDetail>(`/api/schedules/saved/${id}`, { auth: true })
}

export function saveSchedule(request: SaveScheduleRequest): Promise<SavedScheduleDetail> {
  return apiPost<SavedScheduleDetail>('/api/schedules/saved', request, { auth: true })
}

export function deleteSavedSchedule(id: number): Promise<void> {
  return apiDelete(`/api/schedules/saved/${id}`, { auth: true })
}
