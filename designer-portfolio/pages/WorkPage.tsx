import React from 'react';
import { motion } from 'framer-motion';
import AnimatedPage from '../components/AnimatedPage';
import PageContainer from '../components/PageContainer';
import ProjectCarousel from '../components/ProjectCarousel';
import { Project } from '../types';
import { useStore } from '../store';
import Editable from '../components/Editable';

const WorkPage = () => {
  const { title, description } = useStore(state => state.content.work);
  const projects = useStore(state => state.content.projects);

  const projectsByCategory = projects.reduce<Record<string, Project[]>>((acc, project) => {
    const category = project.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(project);
    return acc;
  }, {});

  return (
    <AnimatedPage>
      <PageContainer>
        <motion.h1 
          className="text-4xl md:text-6xl font-heading font-black text-center mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Editable as="h1" path="work.title" />
        </motion.h1>
        <motion.p 
          className="text-lg text-secondary text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Editable as="p" path="work.description" />
        </motion.p>

        <div className="space-y-8">
          {Object.entries(projectsByCategory).map(([category, categoryProjects]) => (
            <ProjectCarousel key={category} title={category} projects={categoryProjects} />
          ))}
        </div>
      </PageContainer>
    </AnimatedPage>
  );
};

export default WorkPage;