import type { Course, Section } from '../types/course.ts'
import { apiGet } from './api.ts'

export function listCourses(): Promise<Course[]> {
  return apiGet<Course[]>('/api/courses')
}

export function searchCourses(query: string): Promise<Course[]> {
  // encodeURIComponent makes spaces and symbols safe to put in a URL ("CSCI 1302" -> "CSCI%201302").
  return apiGet<Course[]>(`/api/courses/search?q=${encodeURIComponent(query)}`)
}

export function getCourseSections(courseId: number): Promise<Section[]> {
  return apiGet<Section[]>(`/api/courses/${courseId}/sections`)
}
