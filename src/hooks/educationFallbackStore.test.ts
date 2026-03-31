import { afterEach, describe, expect, it } from 'vitest';

import {
  addFallbackCourse,
  enrollFallbackCourse,
  getFallbackCourses,
} from './educationFallbackStore';

describe('educationFallbackStore', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('adds fallback courses locally', () => {
    const initialCount = getFallbackCourses().length;

    expect(
      addFallbackCourse({
        title: 'Novo curso local',
        description: 'Descricao',
        duration: '1h',
        category: 'Gestão',
        level: 'basico',
        format: 'online',
      }),
    ).toBe(true);

    expect(getFallbackCourses()).toHaveLength(initialCount + 1);
  });

  it('updates progress when enrolling in a fallback course', () => {
    const course = getFallbackCourses().find((entry) => entry.progress === 0) || getFallbackCourses()[0];

    expect(enrollFallbackCourse(course.id)).toBe(true);
    expect(getFallbackCourses().find((entry) => entry.id === course.id)?.progress).toBeGreaterThan(0);
  });
});
