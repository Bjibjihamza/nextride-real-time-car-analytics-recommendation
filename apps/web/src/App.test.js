import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the NextRide brand in the navbar', () => {
  render(<App />);
  const brand = screen.getAllByText(/Next/i).find((el) => el.closest('.navbar-brand'));
  expect(brand).toBeInTheDocument();
});
