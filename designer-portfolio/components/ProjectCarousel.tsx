import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Project } from '../types';
import ProjectCard from './ProjectCard';
import { useStore } from '../store';

interface ProjectCarouselProps {
  title: string;
  projects: Project[];
}

const ProjectCarousel: React.FC<ProjectCarouselProps> = ({ title, projects }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const allProjects = useStore(state => state.content.projects);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo =
        direction === 'left'
          ? scrollLeft - clientWidth * 0.8
          : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-8 last:mb-0">
      <h2 className="text-2xl md:text-3xl font-bold mb-4">{title}</h2>
      <div className="relative group">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto space-x-4 md:space-x-6 py-4 scrollbar-hide snap-x snap-mandatory"
        >
          {projects.map((project, index) => {
            const projectIndex = allProjects.findIndex(p => p.id === project.id);
            return (
                <motion.div
                  key={project.id}
                  className="snap-start flex-shrink-0 w-[60vw] md:w-[25vw] lg:w-[20vw]"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <ProjectCard project={project} projectPath={`projects.${projectIndex}`} />
                </motion.div>
            )
          })}
        </div>
        <button
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-6 z-10 w-12 h-12 rounded-full bg-surface/50 backdrop-blur-sm flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 disabled:opacity-0"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-6 z-10 w-12 h-12 rounded-full bg-surface/50 backdrop-blur-sm flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 disabled:opacity-0"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default ProjectCarousel;