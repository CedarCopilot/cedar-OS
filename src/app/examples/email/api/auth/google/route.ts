import { NextResponse } from 'next/server';
import { getAuthUrl } from '../../../lib/gmail/auth';

export async function GET() {
	try {
		// Generate a random state for security
		const state = Math.random().toString(36).substring(7);

		// Store state in a cookie for verification later
		const response = NextResponse.redirect(getAuthUrl(state));
		response.cookies.set('gmail_auth_state', state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 10, // 10 minutes
		});

		return response;
	} catch (error) {
		console.error('Error initiating Google auth:', error);
		return NextResponse.redirect('/examples/email?error=auth_failed');
	}
}
