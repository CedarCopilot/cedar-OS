// Animation spring configurations for different cursor interactions
export const SPRING_CONFIGS = {
	// Standard spring configuration for normal cursor movements
	STANDARD: {
		type: 'spring' as 'spring' | 'tween',
		stiffness: 40,
		damping: 15,
		mass: 3,
		duration: 2,
	},

	// Configuration for cursor fadeout animations
	FADEOUT: {
		type: 'tween' as 'spring' | 'tween',
		duration: 0.5,
	},

	// Configuration for edge pointer animations
	EDGE_POINTER: {
		type: 'spring' as 'spring' | 'tween',
		stiffness: 40,
		damping: 15,
		mass: 3,
		duration: 0.5,
	},

	// Configuration for drag cursor animations
	DRAG: {
		type: 'tween' as 'spring' | 'tween',
		ease: 'easeInOut',
		duration: 2.5, // Increased total animation time to allow for pauses
	},
};

// Animation timing constants for drag cursor
export const DRAG_ANIMATION_TIMINGS = {
	// Time to stay in open hand state before closing (initial pause)
	INITIAL_OPEN_DURATION: 300,

	// Time to stay in closed fist state before starting movement
	CLOSED_BEFORE_MOVE_DURATION: 200,
};
