'use client';

import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailView } from './components/EmailView';
import { ComposeEmail } from './components/ComposeEmail';
import { GmailConnect } from './components/GmailConnect';
import { useEmailStore } from './store/emailStore';

export default function EmailPage() {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const { selectedEmailIds, emails } = useEmailStore();

	const selectedEmail =
		selectedEmailIds.length === 1
			? emails.find((email) => email.id === selectedEmailIds[0])
			: null;

	return (
		<div className='h-screen flex flex-col bg-white dark:bg-gray-900'>
			<Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

			<div className='flex-1 flex overflow-hidden'>
				<Sidebar isOpen={sidebarOpen} />

				<main className='flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 p-2'>
					<GmailConnect />

					<div className='flex-1 flex'>
						{selectedEmail ? (
							<EmailView
								email={selectedEmail}
								onClose={() => useEmailStore.getState().clearSelection()}
							/>
						) : (
							<EmailList />
						)}
					</div>
				</main>
			</div>

			<ComposeEmail />
		</div>
	);
}
