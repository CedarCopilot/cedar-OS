'use client';

import './sunlit.css';
import { createContext, memo, useContext, useEffect } from 'react';

// interface LocationData {
//   latitude: number;
//   longitude: number;
// }

interface SunlitContextType {
	mode: 'light' | 'dark';
	toggleMode: () => void;
}

const SunlitContext = createContext<SunlitContextType>({
	mode: 'light',
	toggleMode: () => {},
});

export const useSunlitMode = () => useContext(SunlitContext);

interface SunlitBackgroundProps {
	mode?: 'light' | 'dark';
	onModeChange?: (mode: 'light' | 'dark') => void;
}

const SunlitBackgroundComponent = memo(
	({ mode = 'light', onModeChange }: SunlitBackgroundProps) => {
		useEffect(() => {
			document.body.classList.add('animation-ready');
			if (mode === 'dark') {
				document.body.classList.add('night');
			} else {
				document.body.classList.remove('night');
			}
		}, [mode]);

		const toggleMode = () => {
			const newMode = mode === 'dark' ? 'light' : 'dark';
			onModeChange?.(newMode);
		};

		// const toggle = useCallback(() => {
		//   document.body.classList.add('animation-ready');
		//   document.body.classList.toggle('night');
		// }, []);

		// useEffect(() => {
		//   const handleKeyDown = (event: KeyboardEvent) => {
		//     if (event.code === 'Space') {
		//       event.preventDefault();
		//       toggle();
		//     }
		//   };

		//   document.addEventListener('keydown', handleKeyDown);
		//   document.addEventListener('click', toggle);

		//   return () => {
		//     document.removeEventListener('keydown', handleKeyDown);
		//     document.removeEventListener('click', toggle);
		//   };
		// }, [toggle]);

		return (
			<SunlitContext.Provider value={{ mode, toggleMode }}>
				<div id='dappled-light'>
					<div className='grain'></div>
					<div id='glow'></div>
					<div id='glow-bounce'></div>
					<div className='perspective'>
						<div id='leaves'>
							<svg style={{ width: 0, height: 0, position: 'absolute' }}>
								<defs>
									<filter
										id='wind'
										x='-20%'
										y='-20%'
										width='140%'
										height='140%'>
										<feTurbulence type='fractalNoise' numOctaves='2' seed='1'>
											<animate
												attributeName='baseFrequency'
												dur='16s'
												keyTimes='0;0.33;0.66;1'
												values='0.005 0.003;0.01 0.009;0.008 0.004;0.005 0.003'
												repeatCount='indefinite'
											/>
										</feTurbulence>
										<feDisplacementMap in='SourceGraphic'>
											<animate
												attributeName='scale'
												dur='20s'
												keyTimes='0;0.25;0.5;0.75;1'
												values='45;55;75;55;45'
												repeatCount='indefinite'
											/>
										</feDisplacementMap>
									</filter>
								</defs>
							</svg>
						</div>
						<div className='vertical-shutter'></div>
						<div id='blinds'>
							<div className='shutters'>
								{[...Array(23)].map((_, i) => (
									<div key={i} className='shutter'></div>
								))}
							</div>
							<div className='vertical'>
								<div className='bar'></div>
								<div className='bar'></div>
							</div>
						</div>
					</div>
					<div id='progressive-blur'>
						{[...Array(4)].map((_, i) => (
							<div key={i} />
						))}
					</div>
				</div>
			</SunlitContext.Provider>
		);
	}
);

SunlitBackgroundComponent.displayName = 'SunlitBackground';

export const SunlitBackground = SunlitBackgroundComponent;
