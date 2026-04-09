import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Action, Activity, Objective, TeamMember } from '../../types';

const optimizedViewSpy = vi.fn();
const hubHomeSpy = vi.fn();

vi.mock('../../features/dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-view" />,
  OptimizedView: (props: { objectives: Objective[]; activities: Record<number, Activity[]> }) => {
    optimizedViewSpy(props);
    return <div data-testid="optimized-view" />;
  },
}));

vi.mock('../../features/hub/home/HubHomePage', () => ({
  HubHomePage: (props: { onNavigate: (nav: 'forums' | 'mentorship' | 'education' | 'repository') => void }) => {
    hubHomeSpy(props);
    return (
      <button type="button" data-testid="hub-home-view" onClick={() => props.onNavigate('forums')}>
        Abrir Hub
      </button>
    );
  },
}));

import { MainViewContentSwitch } from './MainViewContentSwitch';

function createObjective(id: number, microregiaoId?: string): Objective {
  return {
    id,
    title: `Objetivo ${id}`,
    status: 'on-track',
    microregiaoId,
  };
}

function createActivity(id: string, microregiaoId?: string): Activity {
  return {
    id,
    title: `Atividade ${id}`,
    description: `Descricao ${id}`,
    microregiaoId,
  };
}

function createAction(): Action {
  return {
    uid: 'MR001::1.1.1',
    id: '1.1.1',
    activityId: '1.1',
    microregiaoId: 'MR001',
    title: 'Acao teste',
    status: 'Atrasado',
    startDate: '2026-01-01',
    plannedEndDate: '2026-01-10',
    endDate: '',
    progress: 0,
    raci: [],
    tags: [],
    notes: '',
    comments: [],
  };
}

function createTeamMember(): TeamMember {
  return {
    id: 'team-1',
    name: 'Pessoa Teste',
    role: 'Gestora',
    email: 'pessoa.teste@example.com',
    municipio: 'Belo Horizonte',
    microregiaoId: 'MR001',
  };
}

describe('MainViewContentSwitch', () => {
  afterEach(() => {
    cleanup();
    optimizedViewSpy.mockClear();
    hubHomeSpy.mockClear();
    vi.unstubAllEnvs();
  });

  it('passa apenas objetivos e atividades filtrados para a Visao Rapida', async () => {
    const filteredObjectives = [createObjective(1, 'MR001')];
    const filteredActivities = { 1: [createActivity('1.1', 'MR001')] };

    render(
      <MainViewContentSwitch
        chartContainerRef={createRef<HTMLDivElement>()}
        containerWidth={1280}
        currentMicroId="MR001"
        currentNav="strategy"
        userId="user-1"
        currentTeam={[createTeamMember()]}
        expandedActionUid={null}
        filteredActivities={filteredActivities}
        filteredObjectives={filteredObjectives}
        ganttActions={[createAction()]}
        ganttRange="all"
        ganttStatusFilter="all"
        handleUpdateActionPatch={vi.fn()}
        involvedAreaFilter=""
        isEditMode={false}
        isMobile={false}
        isSaving={false}
        microActions={[createAction()]}
        objectives={[createObjective(1, 'MR001'), createObjective(2, 'MR002')]}
        activities={{
          1: [createActivity('1.1', 'MR001')],
          2: [createActivity('2.1', 'MR002')],
        }}
        readOnly={false}
        requireMobileObjectiveSelection={false}
        responsibleFilter=""
        searchTerm=""
        selectedActivity=""
        selectedObjective={1}
        statusFilter="all"
        viewMode="optimized"
        checkCanCreate={() => true}
        checkCanDelete={() => true}
        checkCanEdit={() => true}
        onCommunityNavigate={vi.fn()}
        onAddComment={vi.fn(async () => null)}
        onAddMember={vi.fn(async () => null)}
        onBulkImport={vi.fn(async () => {})}
        onCreateAction={vi.fn()}
        onDashboardNavigate={vi.fn()}
        onDeleteAction={vi.fn()}
        onExpandAction={vi.fn()}
        onGanttActionClick={vi.fn()}
        onOpenRoadmapSettings={vi.fn()}
        onRemoveMember={vi.fn(async () => false)}
        onAddRaci={vi.fn()}
        onRemoveRaci={vi.fn()}
        onSaveAction={vi.fn(async () => {})}
        onSetGanttRange={vi.fn()}
        onSetGanttStatusFilter={vi.fn()}
        onSetInvolvedAreaFilter={vi.fn()}
        onSetResponsibleFilter={vi.fn()}
        onSetSearchTerm={vi.fn()}
        onSetStatusFilter={vi.fn()}
        onShowToast={vi.fn()}
        onUpdateAction={vi.fn()}
        onUpdateActivity={vi.fn()}
        onUpdateObjectiveField={vi.fn()}
        onUpdateTeam={vi.fn()}
      />
    );

    await screen.findByTestId('optimized-view');

    expect(optimizedViewSpy).toHaveBeenCalled();
    const lastCall = optimizedViewSpy.mock.calls[optimizedViewSpy.mock.calls.length - 1];

    expect(lastCall?.[0]).toMatchObject({
      objectives: filteredObjectives,
      activities: filteredActivities,
    });
  });

  it('abre a nova entrada do Hub e permite navegar para os modulos comunitarios', async () => {
    const onCommunityNavigate = vi.fn();

    render(
      <MainViewContentSwitch
        chartContainerRef={createRef<HTMLDivElement>()}
        containerWidth={1280}
        currentMicroId="MR001"
        currentNav="hub"
        userId="user-1"
        currentTeam={[createTeamMember()]}
        expandedActionUid={null}
        filteredActivities={{}}
        filteredObjectives={[]}
        ganttActions={[createAction()]}
        ganttRange="all"
        ganttStatusFilter="all"
        handleUpdateActionPatch={vi.fn()}
        involvedAreaFilter=""
        isEditMode={false}
        isMobile={false}
        isSaving={false}
        microActions={[createAction()]}
        objectives={[]}
        activities={{}}
        readOnly={false}
        requireMobileObjectiveSelection={false}
        responsibleFilter=""
        searchTerm=""
        selectedActivity=""
        selectedObjective={0}
        statusFilter="all"
        viewMode="table"
        checkCanCreate={() => true}
        checkCanDelete={() => true}
        checkCanEdit={() => true}
        onCommunityNavigate={onCommunityNavigate}
        onAddComment={vi.fn(async () => null)}
        onAddMember={vi.fn(async () => null)}
        onBulkImport={vi.fn(async () => {})}
        onCreateAction={vi.fn()}
        onDashboardNavigate={vi.fn()}
        onDeleteAction={vi.fn()}
        onExpandAction={vi.fn()}
        onGanttActionClick={vi.fn()}
        onOpenRoadmapSettings={vi.fn()}
        onRemoveMember={vi.fn(async () => false)}
        onAddRaci={vi.fn()}
        onRemoveRaci={vi.fn()}
        onSaveAction={vi.fn(async () => {})}
        onSetGanttRange={vi.fn()}
        onSetGanttStatusFilter={vi.fn()}
        onSetInvolvedAreaFilter={vi.fn()}
        onSetResponsibleFilter={vi.fn()}
        onSetSearchTerm={vi.fn()}
        onSetStatusFilter={vi.fn()}
        onShowToast={vi.fn()}
        onUpdateAction={vi.fn()}
        onUpdateActivity={vi.fn()}
        onUpdateObjectiveField={vi.fn()}
        onUpdateTeam={vi.fn()}
      />
    );

    const hubButton = await screen.findByTestId('hub-home-view', {}, { timeout: 5000 });
    fireEvent.click(hubButton);

    expect(hubHomeSpy).toHaveBeenCalled();
    expect(onCommunityNavigate).toHaveBeenCalledWith('forums');
  });

  it('mantem o Hub nativo acessivel mesmo quando a flag legada estiver ativa', async () => {
    vi.stubEnv('VITE_DISABLE_UNSUPPORTED_HUB_MODULES', 'true');

    render(
      <MainViewContentSwitch
        chartContainerRef={createRef<HTMLDivElement>()}
        containerWidth={1280}
        currentMicroId="MR001"
        currentNav="hub"
        userId="user-1"
        currentTeam={[createTeamMember()]}
        expandedActionUid={null}
        filteredActivities={{}}
        filteredObjectives={[]}
        ganttActions={[createAction()]}
        ganttRange="all"
        ganttStatusFilter="all"
        handleUpdateActionPatch={vi.fn()}
        involvedAreaFilter=""
        isEditMode={false}
        isMobile={false}
        isSaving={false}
        microActions={[createAction()]}
        objectives={[]}
        activities={{}}
        readOnly={false}
        requireMobileObjectiveSelection={false}
        responsibleFilter=""
        searchTerm=""
        selectedActivity=""
        selectedObjective={0}
        statusFilter="all"
        viewMode="table"
        checkCanCreate={() => true}
        checkCanDelete={() => true}
        checkCanEdit={() => true}
        onCommunityNavigate={vi.fn()}
        onAddComment={vi.fn(async () => null)}
        onAddMember={vi.fn(async () => null)}
        onBulkImport={vi.fn(async () => {})}
        onCreateAction={vi.fn()}
        onDashboardNavigate={vi.fn()}
        onDeleteAction={vi.fn()}
        onExpandAction={vi.fn()}
        onGanttActionClick={vi.fn()}
        onOpenRoadmapSettings={vi.fn()}
        onRemoveMember={vi.fn(async () => false)}
        onAddRaci={vi.fn()}
        onRemoveRaci={vi.fn()}
        onSaveAction={vi.fn(async () => {})}
        onSetGanttRange={vi.fn()}
        onSetGanttStatusFilter={vi.fn()}
        onSetInvolvedAreaFilter={vi.fn()}
        onSetResponsibleFilter={vi.fn()}
        onSetSearchTerm={vi.fn()}
        onSetStatusFilter={vi.fn()}
        onShowToast={vi.fn()}
        onUpdateAction={vi.fn()}
        onUpdateActivity={vi.fn()}
        onUpdateObjectiveField={vi.fn()}
        onUpdateTeam={vi.fn()}
      />
    );

    const hubEntries = await screen.findAllByTestId('hub-home-view', {}, { timeout: 5000 });

    expect(hubEntries.length).toBeGreaterThan(0);
    expect(hubHomeSpy).toHaveBeenCalled();
  });
});
