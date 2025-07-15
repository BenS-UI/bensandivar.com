
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  return mousePosition;
};


const CustomCursor = () => {
    const { x, y } = useMousePosition();
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const handleMouseEnter = () => setIsHovering(true);
        const handleMouseLeave = () => setIsHovering(false);

        const interactiveElements = document.querySelectorAll('a, button, [data-interactive]');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', handleMouseEnter);
            el.addEventListener('mouseleave', handleMouseLeave);
        });

        return () => {
            interactiveElements.forEach(el => {
                el.removeEventListener('mouseenter', handleMouseEnter);
                el.removeEventListener('mouseleave', handleMouseLeave);
            });
        };
    }, []);

    return (
        <div className="hidden lg:block">
            <motion.div
                className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full border-2 border-accent"
                animate={{ 
                    x: x - 16, 
                    y: y - 16,
                    scale: isHovering ? 1.5 : 1,
                    opacity: isHovering ? 0.5 : 1,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.5 }}
                style={{ width: '32px', height: '32px' }}
            />
            <motion.div
                className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full bg-accent"
                animate={{ x: x - 4, y: y - 4 }}
                transition={{ type: 'spring', stiffness: 1000, damping: 50 }}
                style={{ width: '8px', height: '8px' }}
            />
        </div>
    );
};

export default CustomCursor;
