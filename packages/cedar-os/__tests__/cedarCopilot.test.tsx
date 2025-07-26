import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { CedarCopilot } from '@/components/CedarCopilot';
import { useCedarStore } from '@/store/CedarStore';
import { v4 as uuidV4 } from 'uuid';
import { act } from 'react-dom/test-utils';
import { LoginStep } from '@/store/onboardingSlice';

/* --- TEST SETUP -------------------------------------------------- */
process.env.NEXT_PUBLIC_CEDAR_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_CEDAR_SUPABASE_KEY = 'anon';

jest.mock('@/components/triggers/TriggersListener', () => () => null);
/* ----------------------------------------------------------------- */

jest.mock('uuid');

const mockedUuid = uuidV4 as jest.MockedFunction<typeof uuidV4>;

const productId = 'prod-test';

describe('CedarCopilot – userId handling', () => {
	beforeEach(() => {
		localStorage.clear();
		mockedUuid.mockReturnValue('generated-uuid');
	});

	it('generates a userId, saves to store, Supabase, and localStorage when none supplied', async () => {
		const validateMock = jest
			.fn()
			.mockResolvedValue({ success: true, error: null });
		useCedarStore.setState({ validateOrCreateProductUser: validateMock });

		render(<CedarCopilot productId={productId}>hi</CedarCopilot>);

		await waitFor(() => {
			expect(useCedarStore.getState().userId).toBe('generated-uuid');
		});

		expect(localStorage.getItem('cedar_user_id')).toBe('generated-uuid');
		await waitFor(() => expect(validateMock).toHaveBeenCalled());
	});

	it('overrides anonymous userId when real id is later supplied and cleans localStorage', async () => {
		const updateMock = jest
			.fn()
			.mockResolvedValue({ success: true, error: null });
		useCedarStore.setState({ updateProductUserId: updateMock });

		// First render without userId
		const { rerender } = render(
			<CedarCopilot productId={productId}>hi</CedarCopilot>
		);

		await waitFor(() =>
			expect(useCedarStore.getState().userId).toBe('generated-uuid')
		);

		// Now supply real id
		rerender(
			<CedarCopilot productId={productId} userId='real-user'>
				hi
			</CedarCopilot>
		);

		await waitFor(() =>
			expect(useCedarStore.getState().userId).toBe('real-user')
		);

		expect(updateMock).toHaveBeenCalledWith('generated-uuid', 'real-user');
		expect(localStorage.getItem('cedar_user_id')).toBe('real-user');
	});
});

// Onboarding slice email persistence
describe('OnboardingSlice – email persistence', () => {
	it('calls addEmailToProductUser when login step value is set', () => {
		const addEmailMock = jest
			.fn()
			.mockResolvedValue({ success: true, error: null });

		// Prime store with required overrides
		useCedarStore.setState({
			userId: 'real-user',
			productId,
			addEmailToProductUser: addEmailMock,
			onboardingSteps: [
				{
					id: 'login-1',
					type: 'login',
					title: 'Login',
				} as LoginStep,
			],
			stepNum: 0,
		});

		act(() => {
			useCedarStore.getState().setOnboardingStepValue('user@enterprise.com');
		});

		expect(addEmailMock).toHaveBeenCalledWith('user@enterprise.com');
	});
});
