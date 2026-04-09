import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layoutId: _layoutId, whileTap: _whileTap, transition: _transition, initial: _initial, animate: _animate, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    nav: ({ children, transition: _transition, initial: _initial, animate: _animate, ...props }: any) => (
      <nav {...props}>{children}</nav>
    ),
  },
}));

import { MobileBottomNav } from './MobileBottomNav';

afterEach(() => {
  cleanup();
});

describe('MobileBottomNav', () => {
  it('leva o atalho Mural para o feed da micro no mobile', () => {
    const onNavChange = vi.fn();
    const onWorkspaceSelect = vi.fn();

    render(
      <MobileBottomNav
        currentNav="dashboard"
        currentWorkspace="planning"
        onNavChange={onNavChange}
        onViewModeChange={vi.fn()}
        onWorkspaceSelect={onWorkspaceSelect}
        onMenuOpen={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mural' }));

    expect(onWorkspaceSelect).toHaveBeenCalledWith('planning');
    expect(onNavChange).toHaveBeenCalledWith('news');
  }, 15000);

  it('leva o atalho Painel para o acompanhamento no mobile', () => {
    const onNavChange = vi.fn();
    const onWorkspaceSelect = vi.fn();
    const onViewModeChange = vi.fn();

    render(
      <MobileBottomNav
        currentNav="news"
        currentWorkspace="planning"
        onNavChange={onNavChange}
        onViewModeChange={onViewModeChange}
        onWorkspaceSelect={onWorkspaceSelect}
        onMenuOpen={vi.fn()}
      />,
    );

    const mainNavigation = screen.getByRole('navigation', { name: 'Navegacao principal' });
    fireEvent.click(within(mainNavigation).getAllByRole('button', { name: 'Painel' })[0]);

    expect(onWorkspaceSelect).toHaveBeenCalledWith('planning');
    expect(onNavChange).toHaveBeenCalledWith('dashboard');
    expect(onViewModeChange).not.toHaveBeenCalled();
  }, 15000);
});
