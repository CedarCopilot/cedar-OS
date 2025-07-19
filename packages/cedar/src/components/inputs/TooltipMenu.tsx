import React, { useEffect, useRef } from 'react';
import { Trash2, RefreshCw, Edit2 } from 'lucide-react';

interface TooltipMenuProps {
	position: { x: number; y: number };
	onDelete: () => void;
	onReverse: () => void;
	onEdit: () => void;
	onClose: () => void;
}

const TooltipMenu: React.FC<TooltipMenuProps> = ({
	position,
	onDelete,
	onReverse,
	onEdit,
	onClose,
}) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				onClose();
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [onClose]);

	return (
		<div
			ref={ref}
			style={{
				position: 'fixed',
				left: position.x,
				top: position.y,
				zIndex: 10,
			}}
			className='flex bg-white shadow rounded p-1 nodrag nopan'>
			<button onClick={onDelete} className='p-1 hover:bg-gray-100 rounded'>
				<Trash2 size={16} />
			</button>
			<button onClick={onReverse} className='p-1 hover:bg-gray-100 rounded'>
				<RefreshCw size={16} />
			</button>
			<button onClick={onEdit} className='p-1 hover:bg-gray-100 rounded'>
				<Edit2 size={16} />
			</button>
		</div>
	);
};

export default TooltipMenu;
