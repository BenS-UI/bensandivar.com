import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { Project } from '../types';
import Editable from './Editable';

interface ProjectCardProps {
  project: Project;
  projectPath: string;
}

const cardVariants = {
  rest: { y: 0 },
  hover: { 
    y: -8,
    scale: 1.05,
    zIndex: 10,
    boxShadow: '0px 20px 30px rgba(0,0,0,0.2)',
  }
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project, projectPath }) => {
  return (
    <Link to={`/project/${project.id}`} className="block h-full" data-interactive>
      <motion.div
        variants={cardVariants}
        whileHover="hover"
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="aspect-[16/9] rounded-lg overflow-hidden relative shadow-lg bg-surface cursor-pointer h-full"
      >
        <img
          src={project.imageUrl}
          alt={project.title}
          className="absolute inset-0 w-full h-full object-cover"
          data-editable-path={`${projectPath}.imageUrl`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4 text-white">
          <Editable as="h3" path={`${projectPath}.title`} className="font-bold text-lg" />
          <Editable as="p" path={`${projectPath}.category`} className="text-sm text-gray-300" />
        </div>
      </motion.div>
    </Link>
  );
};

export default ProjectCard;