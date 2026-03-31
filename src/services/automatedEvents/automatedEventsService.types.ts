export type AutomatedEventType =
  | 'plan_completed'       // ação individual concluída
  | 'activity_completed'  // todas as ações de uma atividade concluídas
  | 'progress_milestone'  // microrregião atingiu 25/50/75/100% do plano
  | 'goal_reached'        // objetivo estratégico concluído
  | 'new_user'            // novo membro entrou na equipe
  | 'system_milestone';   // marco do sistema (primeiros acessos, etc.)

export interface AutomatedEvent {
  id: string;
  type: AutomatedEventType;
  municipality: string;
  title: string;
  details?: string;
  imageGradient: string;
  likes: number;
  footerContext?: string;
  timestamp: string;
  created_at: string;
  isActive: boolean;
}

export interface AutomatedEventRow {
  id: string;
  type: AutomatedEventType;
  municipality: string;
  title: string;
  details: string | null;
  image_gradient: string;
  likes: number;
  footer_context: string | null;
  created_at: string;
  is_active?: boolean | null;
}

export type RecordAutomatedEventInput = Omit<
  AutomatedEvent,
  'id' | 'timestamp' | 'created_at' | 'likes' | 'isActive'
>;
