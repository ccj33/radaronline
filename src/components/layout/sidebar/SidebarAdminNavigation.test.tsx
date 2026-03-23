import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SidebarAdminNavigation } from './SidebarAdminNavigation';

describe('SidebarAdminNavigation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mantem o flyout de microrregioes aberto por um pequeno atraso ao sair do item', () => {
    vi.useFakeTimers();

    render(
      <SidebarAdminNavigation
        isOpen
        adminActiveTab="dashboard"
        onAdminTabChange={vi.fn()}
        onSelectMicroregiao={vi.fn()}
      />
    );

    const trigger = screen.getByTestId('sidebar-admin-micro-trigger');
    const flyout = screen.getByTestId('sidebar-admin-micro-flyout');

    expect(flyout).toHaveAttribute('aria-hidden', 'true');

    fireEvent.mouseEnter(trigger);

    expect(flyout).toHaveAttribute('aria-hidden', 'false');

    fireEvent.mouseLeave(trigger);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(flyout).toHaveAttribute('aria-hidden', 'false');

    fireEvent.mouseEnter(flyout);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(flyout).toHaveAttribute('aria-hidden', 'false');

    fireEvent.mouseLeave(flyout);

    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(flyout).toHaveAttribute('aria-hidden', 'true');
  });
});
