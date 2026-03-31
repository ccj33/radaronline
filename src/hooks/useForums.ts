import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Forum,
  ForumAuthor,
  ForumExpert,
  ForumReply,
  ForumTag,
  ForumTopic,
  ForumTopicStatus,
  ForumTopicType,
} from '../types/forum.types';
import {
  acceptFallbackReply,
  createFallbackReply,
  createFallbackTopic,
  getFallbackExperts,
  getFallbackForumBySlug,
  getFallbackForums,
  getFallbackReplies,
  getFallbackTopic,
  getFallbackTopics,
  incrementFallbackTopicViews,
  subscribeToForumFallbackUpdates,
  voteFallback,
} from './forumFallbackStore';

function getForumErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message.toLowerCase();
  }

  if (err instanceof Error) {
    return err.message.toLowerCase();
  }

  return String(err).toLowerCase();
}

function isHubBackendUnavailable(err: unknown): boolean {
  const message = getForumErrorMessage(err);

  return (
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('404') ||
    message.includes('not found')
  );
}

function normalizeForumError(err: unknown, fallbackMessage: string): string {
  if (isHubBackendUnavailable(err)) {
    return 'O Hub ainda nao foi provisionado no banco de dados.';
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallbackMessage;
}

function mapForum(row: Record<string, unknown>): Forum {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string,
    icon: row.icon as string,
    color: row.color as string,
    moderatorId: row.moderator_id as string | null,
    faqContent: row.faq_content as string | null,
    rules: row.rules as string | null,
    slaHours: row.sla_hours as number,
    topicsCount: row.topics_count as number,
    membersCount: row.members_count as number,
    isActive: row.is_active as boolean,
    displayOrder: row.display_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapTopic(row: Record<string, unknown>, author?: ForumAuthor): ForumTopic {
  return {
    id: row.id as string,
    forumId: row.forum_id as string,
    authorId: row.author_id as string,
    title: row.title as string,
    content: row.content as string,
    topicType: row.topic_type as ForumTopicType,
    status: row.status as ForumTopicStatus,
    isPinned: row.is_pinned as boolean,
    isFeatured: row.is_featured as boolean,
    isLocked: row.is_locked as boolean,
    bestReplyId: row.best_reply_id as string | null,
    viewsCount: row.views_count as number,
    repliesCount: row.replies_count as number,
    votesScore: row.votes_score as number,
    expiresAt: row.expires_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    author,
  };
}

function mapReply(row: Record<string, unknown>, author?: ForumAuthor): ForumReply {
  return {
    id: row.id as string,
    topicId: row.topic_id as string,
    authorId: row.author_id as string,
    parentReplyId: row.parent_reply_id as string | null,
    content: row.content as string,
    isAccepted: row.is_accepted as boolean,
    votesScore: row.votes_score as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    author,
  };
}

function mapAuthor(row: Record<string, unknown>): ForumAuthor {
  return {
    id: row.id as string,
    fullName: (row.nome as string | null) ?? (row.full_name as string | null) ?? null,
    avatarId: (row.avatar_id as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
  };
}

async function loadAuthors(authorIds: string[]): Promise<Map<string, ForumAuthor>> {
  if (!authorIds.length) {
    return new Map();
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, avatar_id')
      .in('id', authorIds);

    if (error) {
      throw error;
    }

    const fallbackEntries: Array<[string, ForumAuthor]> = authorIds.map((authorId) => [authorId, {
      id: authorId,
      fullName: null,
      avatarId: null,
      avatarUrl: null,
    }]);

    const mappedEntries = (data || []).map((author: Record<string, unknown>) => [author.id as string, mapAuthor(author)] as const);

    return new Map([...fallbackEntries, ...mappedEntries]);
  } catch {
    return new Map(authorIds.map((authorId): [string, ForumAuthor] => [authorId, {
      id: authorId,
      fullName: null,
      avatarId: null,
      avatarUrl: null,
    }]));
  }
}

export function useForums() {
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchForums = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('forums')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (dbError) {
        throw dbError;
      }

      setForums((data || []).map(mapForum));
      setIsFallback(false);
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        setForums(getFallbackForums());
        setError(null);
        setIsFallback(true);
      } else {
        setForums([]);
        setError(normalizeForumError(err, 'Erro ao carregar foruns.'));
        setIsFallback(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchForums();
  }, [fetchForums]);

  useEffect(() => subscribeToForumFallbackUpdates(() => {
    void fetchForums();
  }), [fetchForums]);

  return { forums, loading, error, isFallback, refetch: fetchForums };
}

export function useForum(slug: string) {
  const [forum, setForum] = useState<Forum | null>(null);
  const [tags, setTags] = useState<ForumTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForum = useCallback(async () => {
    if (!slug) {
      setForum(null);
      setTags([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('forums')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (dbError) {
        throw dbError;
      }

      if (!data) {
        setForum(null);
        setTags([]);
        setError('Forum nao encontrado.');
        return;
      }

      setForum(mapForum(data));

      const { data: tagsData, error: tagsError } = await supabase
        .from('forum_tags')
        .select('*')
        .eq('forum_id', data.id)
        .order('name');

      if (tagsError) {
        throw tagsError;
      }

      setTags((tagsData || []).map((tag: Record<string, unknown>) => ({
        id: tag.id as string,
        forumId: tag.forum_id as string,
        name: tag.name as string,
        slug: tag.slug as string,
        color: tag.color as string,
        usageCount: tag.usage_count as number,
        createdAt: tag.created_at as string,
      })));
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        setForum(getFallbackForumBySlug(slug));
        setTags([]);
        setError(null);
      } else {
        setForum(null);
        setTags([]);
        setError(normalizeForumError(err, 'Erro ao carregar forum.'));
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void fetchForum();
  }, [fetchForum]);

  useEffect(() => subscribeToForumFallbackUpdates(() => {
    void fetchForum();
  }), [fetchForum]);

  return { forum, tags, loading, error, refetch: fetchForum };
}

export function useForumTopics(forumId: string | undefined) {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    if (!forumId) {
      setTopics([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('forum_topics')
        .select('*')
        .eq('forum_id', forumId)
        .order('is_pinned', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (dbError) {
        throw dbError;
      }

      if (!data?.length) {
        setTopics([]);
        return;
      }

      const authorIds = [...new Set(data.map((topic: Record<string, unknown>) => topic.author_id as string).filter(Boolean))];
      const authorsMap = await loadAuthors(authorIds);

      setTopics(data.map((topic: Record<string, unknown>) => mapTopic(topic, authorsMap.get(topic.author_id as string))));
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        const fallbackTopics = getFallbackTopics(forumId);
        const authorIds = [...new Set(fallbackTopics.map(topic => topic.authorId).filter(Boolean))];
        const authorsMap = await loadAuthors(authorIds);

        setTopics(fallbackTopics.map(topic => ({
          ...topic,
          author: authorsMap.get(topic.authorId),
        })));
        setError(null);
      } else {
        setTopics([]);
        setError(normalizeForumError(err, 'Erro ao carregar topicos.'));
      }
    } finally {
      setLoading(false);
    }
  }, [forumId]);

  useEffect(() => {
    void fetchTopics();
  }, [fetchTopics]);

  useEffect(() => subscribeToForumFallbackUpdates(() => {
    void fetchTopics();
  }), [fetchTopics]);

  return { topics, loading, error, refetch: fetchTopics };
}

export function useForumTopic(topicId: string | undefined) {
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopic = useCallback(async () => {
    if (!topicId) {
      setTopic(null);
      setReplies([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('forum_topics')
        .select('*')
        .eq('id', topicId)
        .maybeSingle();

      if (dbError) {
        throw dbError;
      }

      if (!data) {
        setTopic(null);
        setReplies([]);
        setError('Topico nao encontrado.');
        return;
      }

      const authorId = data.author_id as string;
      const authorsMap = await loadAuthors(authorId ? [authorId] : []);
      setTopic(mapTopic(data, authorsMap.get(authorId)));

      const { data: repliesData, error: repliesError } = await supabase
        .from('forum_replies')
        .select('*')
        .eq('topic_id', topicId)
        .order('is_accepted', { ascending: false })
        .order('votes_score', { ascending: false })
        .order('created_at');

      if (repliesError) {
        throw repliesError;
      }

      if (!repliesData?.length) {
        setReplies([]);
      } else {
        const replyAuthorIds = [...new Set(repliesData.map((reply: Record<string, unknown>) => reply.author_id as string).filter(Boolean))];
        const replyAuthorsMap = await loadAuthors(replyAuthorIds);

        setReplies(repliesData.map((reply: Record<string, unknown>) => (
          mapReply(reply, replyAuthorsMap.get(reply.author_id as string))
        )));
      }

      void supabase
        .from('forum_topics')
        .update({ views_count: ((data.views_count as number) || 0) + 1 })
        .eq('id', topicId);
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        incrementFallbackTopicViews(topicId);

        const fallbackTopic = getFallbackTopic(topicId);
        const fallbackReplies = getFallbackReplies(topicId);

        if (!fallbackTopic) {
          setTopic(null);
          setReplies([]);
          setError('Topico nao encontrado.');
        } else {
          const authorIds = [
            fallbackTopic.authorId,
            ...fallbackReplies.map(reply => reply.authorId),
          ].filter(Boolean);
          const authorsMap = await loadAuthors([...new Set(authorIds)]);

          setTopic({
            ...fallbackTopic,
            author: authorsMap.get(fallbackTopic.authorId),
          });
          setReplies(fallbackReplies.map(reply => ({
            ...reply,
            author: authorsMap.get(reply.authorId),
          })));
          setError(null);
        }
      } else {
        setTopic(null);
        setReplies([]);
        setError(normalizeForumError(err, 'Erro ao carregar topico.'));
      }
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    void fetchTopic();
  }, [fetchTopic]);

  useEffect(() => subscribeToForumFallbackUpdates(() => {
    void fetchTopic();
  }), [fetchTopic]);

  return { topic, replies, loading, error, refetch: fetchTopic };
}

export function useForumExperts(forumId: string | undefined) {
  const [experts, setExperts] = useState<ForumExpert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!forumId) {
      setExperts([]);
      setLoading(false);
      return;
    }

    const fetchExperts = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('forum_experts')
          .select('*')
          .eq('forum_id', forumId)
          .eq('is_verified', true)
          .order('helpful_replies_count', { ascending: false })
          .limit(10);

        if (error) {
          throw error;
        }

        if (!data?.length) {
          setExperts([]);
          return;
        }

        const userIds = [...new Set(data.map((expert: Record<string, unknown>) => expert.user_id as string).filter(Boolean))];
        const usersMap = await loadAuthors(userIds);

        setExperts(data.map((expert: Record<string, unknown>) => ({
          id: expert.id as string,
          userId: expert.user_id as string,
          forumId: expert.forum_id as string,
          helpfulRepliesCount: expert.helpful_replies_count as number,
          acceptanceRate: expert.acceptance_rate as number,
          isVerified: expert.is_verified as boolean,
          createdAt: expert.created_at as string,
          user: usersMap.get(expert.user_id as string),
        })));
      } catch (err: unknown) {
        if (isHubBackendUnavailable(err)) {
          const fallbackExperts = getFallbackExperts(forumId);
          const userIds = [...new Set(fallbackExperts.map(expert => expert.userId).filter(Boolean))];
          const usersMap = await loadAuthors(userIds);

          setExperts(fallbackExperts.map(expert => ({
            ...expert,
            user: usersMap.get(expert.userId),
          })));
        } else {
          setExperts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchExperts();
    return subscribeToForumFallbackUpdates(() => {
      void fetchExperts();
    });
  }, [forumId]);

  return { experts, loading };
}

export function useCreateTopic(forumId: string | undefined) {
  const [creating, setCreating] = useState(false);

  const createTopic = useCallback(async (data: {
    title: string;
    content: string;
    topicType: ForumTopicType;
    authorId: string;
    tagIds?: string[];
  }) => {
    if (!forumId) {
      return null;
    }

    try {
      setCreating(true);

      const { data: result, error } = await supabase
        .from('forum_topics')
        .insert({
          forum_id: forumId,
          author_id: data.authorId,
          title: data.title,
          content: data.content,
          topic_type: data.topicType,
          status: 'open',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return result?.id as string | undefined;
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        return createFallbackTopic({
          forumId,
          authorId: data.authorId,
          title: data.title,
          content: data.content,
          topicType: data.topicType,
        });
      }

      return null;
    } finally {
      setCreating(false);
    }
  }, [forumId]);

  return { createTopic, creating };
}

export function useCreateReply(topicId: string | undefined) {
  const [creating, setCreating] = useState(false);

  const createReply = useCallback(async (content: string, authorId: string, parentReplyId?: string) => {
    if (!topicId) {
      return false;
    }

    try {
      setCreating(true);

      const { error } = await supabase
        .from('forum_replies')
        .insert({
          topic_id: topicId,
          author_id: authorId,
          content,
          parent_reply_id: parentReplyId || null,
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        return createFallbackReply({
          topicId,
          authorId,
          content,
          parentReplyId,
        });
      }

      return false;
    } finally {
      setCreating(false);
    }
  }, [topicId]);

  return { createReply, creating };
}

export function useAcceptForumReply(topicId: string | undefined) {
  const [updating, setUpdating] = useState(false);

  const acceptReply = useCallback(async (replyId: string) => {
    if (!topicId || !replyId) {
      return false;
    }

    try {
      setUpdating(true);

      const { error: clearError } = await supabase
        .from('forum_replies')
        .update({ is_accepted: false })
        .eq('topic_id', topicId);

      if (clearError) {
        throw clearError;
      }

      const { error: replyError } = await supabase
        .from('forum_replies')
        .update({ is_accepted: true })
        .eq('id', replyId);

      if (replyError) {
        throw replyError;
      }

      const { error: topicError } = await supabase
        .from('forum_topics')
        .update({
          best_reply_id: replyId,
          status: 'resolved',
        })
        .eq('id', topicId);

      if (topicError) {
        throw topicError;
      }

      return true;
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        return acceptFallbackReply(topicId, replyId);
      }

      return false;
    } finally {
      setUpdating(false);
    }
  }, [topicId]);

  return { acceptReply, updating };
}

export function useForumVote() {
  const vote = useCallback(async (
    userId: string,
    value: 1 | -1,
    target: { topicId?: string; replyId?: string },
  ) => {
    try {
      const { error } = await supabase
        .from('forum_votes')
        .upsert({
          user_id: userId,
          topic_id: target.topicId || null,
          reply_id: target.replyId || null,
          vote_value: value,
        }, { onConflict: target.topicId ? 'user_id,topic_id' : 'user_id,reply_id' });

      if (error) {
        throw error;
      }

      return true;
    } catch (err: unknown) {
      if (isHubBackendUnavailable(err)) {
        return voteFallback(userId, value, target);
      }

      return false;
    }
  }, []);

  return { vote };
}
