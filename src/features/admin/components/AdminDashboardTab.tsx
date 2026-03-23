import { Dispatch, SetStateAction } from 'react';
import { Action, TeamMember } from '../../../types';
import { User } from '../../../types/auth.types';
import {
  AdminOverview,
  ComparisonEngine,
  DashboardFilters,
  DashboardFiltersState,
  MinasMicroMap,
  RankingPanel,
  WorkforcePanel,
} from '../dashboard';
import { AdminPanelTab } from '../adminPanel.types';

interface AdminDashboardTabProps {
  actions: Action[];
  users: User[];
  teams: Record<string, TeamMember[]>;
  dashboardFilters: DashboardFiltersState;
  pendingRegistrationsCount: number;
  setDashboardFilters: Dispatch<SetStateAction<DashboardFiltersState>>;
  onTabChange: (tab: AdminPanelTab) => void;
  onViewMicrorregiao: (microId: string) => void;
}

export function AdminDashboardTab({
  actions,
  users,
  teams,
  dashboardFilters,
  pendingRegistrationsCount,
  setDashboardFilters,
  onTabChange,
  onViewMicrorregiao,
}: AdminDashboardTabProps) {
  return (
    <div className="space-y-6">
      <DashboardFilters filters={dashboardFilters} onChange={setDashboardFilters} />

      {dashboardFilters.isCompareMode ? (
        <ComparisonEngine
          compareLevel={dashboardFilters.compareLevel}
          entityA={dashboardFilters.entityA}
          entityB={dashboardFilters.entityB}
          actions={actions}
          users={users}
        />
      ) : (
        <>
          <AdminOverview
            actions={actions}
            users={users}
            teams={teams}
            filters={dashboardFilters}
            onTabChange={(tab) => onTabChange(tab)}
            pendingCount={pendingRegistrationsCount}
            onViewMicro={onViewMicrorregiao}
          >
            <MinasMicroMap
              actions={actions}
              onMacroSelect={(macroId) =>
                setDashboardFilters((previous) => ({
                  ...previous,
                  selectedMacroId: macroId,
                  selectedMicroId: null,
                  selectedMunicipioCode: null,
                }))
              }
              onMicroSelect={(microId) =>
                setDashboardFilters((previous) => ({
                  ...previous,
                  selectedMicroId: microId,
                }))
              }
              onNavigateToObjectives={onViewMicrorregiao}
              selectedMacroId={dashboardFilters.selectedMacroId}
              selectedMicroId={dashboardFilters.selectedMicroId}
            />
          </AdminOverview>

          <div className="pt-8 border-t border-slate-200 dark:border-slate-700">
            <WorkforcePanel
              users={users}
              selectedMacroId={dashboardFilters.selectedMacroId}
              selectedMicroId={dashboardFilters.selectedMicroId}
              onViewMicrorregiao={onViewMicrorregiao}
            />
          </div>

          <div id="ranking-section" className="pt-8 border-t border-slate-200 dark:border-slate-700 scroll-mt-24">
            <RankingPanel actions={actions} onViewMicrorregiao={onViewMicrorregiao} />
          </div>
        </>
      )}
    </div>
  );
}
