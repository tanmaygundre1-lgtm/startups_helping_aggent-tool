import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CandidateForm from '../components/forms/CandidateForm';

test('CandidateForm renders input fields', () => {
    render(<CandidateForm />);
    expect(screen.getByPlaceholderText('Full Name')).toBeDefined();
});
