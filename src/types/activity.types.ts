export type ActivityType =
    | 'login'
    | 'logout'
    | 'user_created'
    | 'user_updated'
    | 'user_deleted'
    | 'user_deactivated'
    | 'lgpd_accepted'
    | 'action_created'
    | 'action_updated'
    | 'action_deleted'
    | 'view_micro';

export interface ActivityLog {
    id: string;
    user_id: string;
    action_type: ActivityType;
    entity_type: 'auth' | 'action' | 'user' | 'view';
    entity_id?: string;
    metadata?: Record<string, any>;
    created_at: string;
    // Joined fields
    user?: {
        nome: string;
        role: string;
        avatar_id?: string;
        microregiao_id?: string;
    };
}
