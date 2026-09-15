import type { GenerateSchedulesRequest, GenerateSchedulesResponse } from '../types/schedule.ts'
import { apiPost } from './api.ts'

export function generateSchedules(request: GenerateSchedulesRequest): Promise<GenerateSchedulesResponse> {
  return apiPost<GenerateSchedulesResponse>('/api/schedules/generate', request)
}
