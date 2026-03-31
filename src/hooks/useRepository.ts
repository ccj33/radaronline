import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Material, MaterialType, MaterialCategory } from '../types/repository.types';
import {
  addFallbackMaterial,
  getFallbackMaterials,
  subscribeToRepositoryFallbackUpdates,
} from './repositoryFallbackStore';
import { isHubBackendUnavailable, normalizeHubError } from './hubFallbackUtils';

function mapMaterial(row: Record<string, unknown>): Material {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    type: row.type as MaterialType,
    category: row.category as MaterialCategory,
    author: row.author as string,
    fileUrl: row.file_url as string | null,
    fileSize: row.file_size as number | null,
    downloads: (row.downloads as number) || 0,
    views: (row.views as number) || 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export interface MaterialFormData {
  title: string;
  description: string;
  type: MaterialType;
  category: MaterialCategory;
  author: string;
  url?: string;
}

export function useRepository() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const loadFallbackData = useCallback(() => {
    setMaterials(getFallbackMaterials());
    setError(null);
    setIsFallback(true);
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) {
        throw dbError;
      }

      setMaterials((data || []).map(mapMaterial));
      setIsFallback(false);
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        loadFallbackData();
      } else {
        setMaterials([]);
        setIsFallback(false);
        setError(normalizeHubError(err, 'A biblioteca esta em modo local.'));
      }
    } finally {
      setLoading(false);
    }
  }, [loadFallbackData]);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    return subscribeToRepositoryFallbackUpdates(() => {
      if (isFallback) {
        loadFallbackData();
      }
    });
  }, [isFallback, loadFallbackData]);

  const addMaterial = useCallback(async (data: MaterialFormData): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase.from('materials').insert({
        title: data.title,
        description: data.description,
        type: data.type,
        category: data.category,
        author: data.author,
        file_url: data.url || null,
      });

      if (dbError) {
        throw dbError;
      }

      await fetchMaterials();
      return true;
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        const success = addFallbackMaterial(data);
        if (success) {
          loadFallbackData();
        }
        return success;
      }

      return false;
    }
  }, [fetchMaterials, loadFallbackData]);

  const stats = {
    total: materials.length,
    byType: {
      video: materials.filter((material) => material.type === 'video').length,
      manual: materials.filter((material) => material.type === 'manual').length,
      faq: materials.filter((material) => material.type === 'faq').length,
      template: materials.filter((material) => material.type === 'template').length,
      legislacao: materials.filter((material) => material.type === 'legislacao').length,
    },
  };

  return { materials, loading, error, isFallback, stats, addMaterial, refetch: fetchMaterials };
}
