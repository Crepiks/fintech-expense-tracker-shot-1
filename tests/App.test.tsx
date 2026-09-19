import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from '../src/App';

it('renders the application landmark', () => {
  render(<App />);
  expect(screen.getByRole('main', { name: 'Pocket Ledger' })).toBeInTheDocument();
});
