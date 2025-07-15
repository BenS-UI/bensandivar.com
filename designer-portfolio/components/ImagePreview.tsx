import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImagePreviewProps {
  imageUrl: string | null;
  position: { x: number; y: number };
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl, position }) => {
  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: position.x + 20,
            y: position.y + 20,
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.5 }}
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9999,
            maxWidth: '300px',
            maxHeight: '300px',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            border: '2px solid white',
            background: '#1F2937',
          }}
        >
          <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImagePreview;