'use client';

import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailView } from './components/EmailView';
import { ComposeEmail } from './components/ComposeEmail';
import { GmailConnect } from './components/GmailConnect';
import { useEmailStore } from './store/emailStore';
import { CedarCopilot } from 'cedar-os';
import { SidePanelCedarChat } from '@/chatComponents/SidePanelCedarChat';
import { Mail } from 'lucide-react';
import type { ProviderConfig } from 'cedar-os';

export default function EmailPage() {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const { selectedEmailIds, emails } = useEmailStore();

	const selectedEmail =
		selectedEmailIds.length === 1
			? emails.find((email) => email.id === selectedEmailIds[0])
			: null;

	// Configure Mastra as the LLM provider
	const llmProvider: ProviderConfig = {
		provider: 'mastra',
		baseURL: process.env.NEXT_PUBLIC_MASTRA_URL || 'http://localhost:4112',
		// apiKey is optional for local Mastra instances
		apiKey: process.env.NEXT_PUBLIC_MASTRA_API_KEY,
	};

	return (
		<CedarCopilot llmProvider={llmProvider}>
			<SidePanelCedarChat
				side='right'
				title='Email Assistant'
				collapsedLabel='Need help with your emails?'
				showCollapsedButton={true}
				companyLogo={<Mail className='w-6 h-6 text-blue-600' />}
				dimensions={{
					width: 400,
					minWidth: 350,
					maxWidth: 600,
				}}
				resizable={true}
				className='z-50'>
				<div className='relative h-screen flex flex-col bg-white dark:bg-gray-900'>
					<Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

					<div className='relative flex-1 flex overflow-hidden'>
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
			</SidePanelCedarChat>
		</CedarCopilot>
	);
}
