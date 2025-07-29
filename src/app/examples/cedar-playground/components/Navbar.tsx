'use client';

import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import Toggle3D from '@/components/ui/toggle3d';
import { useStyling } from 'cedar-os';
import { GithubIcon, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
	const { styling, toggleDarkMode } = useStyling();

	return (
		<nav className='sticky top-0 left-0 right-0 z-50 border-b transition-colors duration-300 bg-white/95 backdrop-blur-sm border-gray-200 dark:bg-gray-900/95 dark:border-gray-800'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex items-center justify-between h-16'>
					{/* Logo and Brand */}
					<div className='flex items-center gap-2'>
						<Image
							src={
								styling.darkMode
									? '/cedar-logo-dark.png'
									: '/cedar-logo-light.png'
							}
							alt='Cedar Logo'
							width={70}
							height={24}
						/>
					</div>

					{/* Navigation Menu */}
					<NavigationMenu>
						<NavigationMenuList>
							<NavigationMenuItem>
								<NavigationMenuLink
									asChild
									className={navigationMenuTriggerStyle()}>
									<Link
										href='https://docs.cedarcopilot.com'
										target='_blank'
										rel='noopener noreferrer'
										className='dark:text-gray-200 dark:hover:text-white'>
										Docs
									</Link>
								</NavigationMenuLink>
							</NavigationMenuItem>

							<NavigationMenuItem>
								<NavigationMenuLink
									asChild
									className={navigationMenuTriggerStyle()}>
									<Link
										href='https://github.com/CedarCopilot/cedar'
										target='_blank'
										rel='noopener noreferrer'
										className='flex items-center gap-2 dark:text-gray-200 dark:hover:text-white'>
										<GithubIcon className='w-4 h-4' />
									</Link>
								</NavigationMenuLink>
							</NavigationMenuItem>

							<NavigationMenuItem>
								<NavigationMenuLink
									asChild
									className={navigationMenuTriggerStyle()}>
									<Link
										href='#'
										className='dark:text-gray-200 dark:hover:text-white'>
										Blog
									</Link>
								</NavigationMenuLink>
							</NavigationMenuItem>
						</NavigationMenuList>
					</NavigationMenu>

					{/* Dark Mode Toggle */}
					<div className='flex items-center gap-3'>
						<span className='text-sm font-medium text-gray-600 dark:text-gray-300'>
							<Sun className='w-4 h-4' />
						</span>
						<Toggle3D
							checked={styling.darkMode}
							onChange={toggleDarkMode}
							coloured={false}
						/>
						<span className='text-sm font-medium text-gray-600 dark:text-gray-300'>
							<Moon className='w-4 h-4' />
						</span>
					</div>
				</div>
			</div>
		</nav>
	);
}
