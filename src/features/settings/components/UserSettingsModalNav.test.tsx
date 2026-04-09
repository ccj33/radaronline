import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserSettingsModalNav } from './UserSettingsModalNav';

describe('UserSettingsModalNav', () => {
  it('renderiza a navegacao em pilha e permite trocar de secao', () => {
    const setActiveTab = vi.fn();

    render(
      <UserSettingsModalNav
        activeTab="profile"
        onClose={vi.fn()}
        setActiveTab={setActiveTab}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Secoes de configuracoes' })).toHaveClass('flex-col');
    expect(screen.getByRole('button', { name: /Aparencia/i })).toBeInTheDocument();
    expect(screen.queryByText(/Ajustes da conta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No celular, as secoes ficam empilhadas/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Notificacoes/i }));

    expect(setActiveTab).toHaveBeenCalledWith('notifications');
  }, 15000);
});
