import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Course,
  Trail,
  EducationStats,
  CourseCategory,
  CourseLevel,
  CourseFormat,
} from '../types/education.types';
import {
  addFallbackCourse,
  addFallbackTrail,
  enrollFallbackCourse,
  getFallbackCourses,
  getFallbackTrails,
  subscribeToEducationFallbackUpdates,
} from './educationFallbackStore';
import { isHubBackendUnavailable, normalizeHubError } from './hubFallbackUtils';

function mapCourse(row: Record<string, unknown>): Course {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    duration: row.duration as string,
    enrolled: (row.enrolled as number) || 0,
    category: row.category as CourseCategory,
    level: row.level as CourseLevel,
    format: row.format as CourseFormat,
    url: row.url as string | null,
    progress: (row.progress as number) || 0,
    createdAt: row.created_at as string,
  };
}

function mapTrail(row: Record<string, unknown>): Trail {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    coursesCount: (row.courses_count as number) || 0,
    totalHours: (row.total_hours as number) || 0,
    enrolled: (row.enrolled as number) || 0,
    progress: (row.progress as number) || 0,
    createdAt: row.created_at as string,
  };
}

export interface CourseFormData {
  title: string;
  description: string;
  duration: string;
  category: CourseCategory;
  level: CourseLevel;
  format: CourseFormat;
  url?: string;
}

export interface TrailFormData {
  title: string;
  description: string;
  coursesCount: number;
  totalHours: number;
}

export function useEducacao() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const loadFallbackData = useCallback(() => {
    const fallbackCourses = getFallbackCourses();
    const fallbackTrails = getFallbackTrails();

    setCourses(fallbackCourses);
    setTrails(fallbackTrails);
    setEnrolledCourses(fallbackCourses.filter((course) => course.progress > 0));
    setIsFallback(true);
    setError(null);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [coursesRes, trailsRes] = await Promise.all([
        supabase.from('courses').select('*').order('created_at', { ascending: false }),
        supabase.from('trails').select('*').order('created_at', { ascending: false }),
      ]);

      if (coursesRes.error) {
        throw coursesRes.error;
      }

      if (trailsRes.error) {
        throw trailsRes.error;
      }

      const mappedCourses = (coursesRes.data || []).map(mapCourse);
      const mappedTrails = (trailsRes.data || []).map(mapTrail);

      setCourses(mappedCourses);
      setTrails(mappedTrails);
      setEnrolledCourses(mappedCourses.filter((course) => course.progress > 0));
      setIsFallback(false);
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        loadFallbackData();
      } else {
        setCourses([]);
        setTrails([]);
        setEnrolledCourses([]);
        setIsFallback(false);
        setError(normalizeHubError(err, 'O modulo de educacao esta em modo local.'));
      }
    } finally {
      setLoading(false);
    }
  }, [loadFallbackData]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    return subscribeToEducationFallbackUpdates(() => {
      if (isFallback) {
        loadFallbackData();
      }
    });
  }, [isFallback, loadFallbackData]);

  const stats: EducationStats = {
    totalCourses: courses.length,
    totalTrails: trails.length,
    inProgress: enrolledCourses.filter((course) => course.progress > 0 && course.progress < 100).length,
    completed: enrolledCourses.filter((course) => course.progress >= 100).length,
  };

  const addCourse = useCallback(async (data: CourseFormData): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase.from('courses').insert({
        title: data.title,
        description: data.description,
        duration: data.duration,
        category: data.category,
        level: data.level,
        format: data.format,
        url: data.url || null,
      });

      if (dbError) {
        throw dbError;
      }

      await fetchData();
      return true;
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        const success = addFallbackCourse(data);
        if (success) {
          loadFallbackData();
        }
        return success;
      }

      return false;
    }
  }, [fetchData, loadFallbackData]);

  const addTrail = useCallback(async (data: TrailFormData): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase.from('trails').insert({
        title: data.title,
        description: data.description,
        courses_count: data.coursesCount,
        total_hours: data.totalHours,
      });

      if (dbError) {
        throw dbError;
      }

      await fetchData();
      return true;
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        const success = addFallbackTrail(data);
        if (success) {
          loadFallbackData();
        }
        return success;
      }

      return false;
    }
  }, [fetchData, loadFallbackData]);

  const enrollInCourse = useCallback(async (courseId: string): Promise<boolean> => {
    try {
      const course = courses.find((entry) => entry.id === courseId);
      const { error: dbError } = await supabase
        .from('courses')
        .update({ enrolled: (course?.enrolled || 0) + 1 })
        .eq('id', courseId);

      if (dbError) {
        throw dbError;
      }

      await fetchData();
      return true;
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        const success = enrollFallbackCourse(courseId);
        if (success) {
          loadFallbackData();
        }
        return success;
      }

      return false;
    }
  }, [courses, fetchData, loadFallbackData]);

  return {
    courses,
    trails,
    enrolledCourses,
    loading,
    error,
    isFallback,
    stats,
    addCourse,
    addTrail,
    enrollInCourse,
    refetch: fetchData,
  };
}
