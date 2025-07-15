import React from 'react';
import { motion } from 'framer-motion';
import AnimatedPage from '../components/AnimatedPage';
import PageContainer from '../components/PageContainer';
import { useStore } from '../store';
import Editable from '../components/Editable';

const SkillBadge = ({ path }: { path: string }) => (
  <motion.div
    className="bg-overlay px-4 py-2 rounded-full text-secondary"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: Math.random() * 0.5 }}
  >
    <Editable path={path} />
  </motion.div>
);

const AboutPage = () => {
  const content = useStore((state) => state.content.about);

  return (
    <AnimatedPage>
      <PageContainer>
        <div className="max-w-4xl mx-auto">
          <motion.h1
            className="text-4xl md:text-6xl font-heading font-black text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Editable as="h1" path="about.title" />
          </motion.h1>

          <div className="grid md:grid-cols-5 gap-12 items-center">
            <motion.div
              className="md:col-span-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <img
                src={content.imageUrl}
                alt="Ben Sandivar"
                className="rounded-full w-48 h-48 md:w-full md:h-auto mx-auto object-cover shadow-2xl"
                data-editable-path="about.imageUrl"
              />
            </motion.div>
            <motion.div
              className="md:col-span-3 prose prose-lg max-w-none"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              <Editable as="h2" path="about.heading" className="text-3xl font-bold text-primary mb-4" />
              <Editable as="p" path="about.p1" />
              <Editable as="p" path="about.p2" />
            </motion.div>
          </div>
          
          <motion.div 
            className="mt-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h3 className="text-3xl font-bold text-center mb-8 text-primary">
              <Editable path="about.skillsTitle" />
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {content.skills.map((skill, index) => (
                <SkillBadge key={index} path={`about.skills.${index}`} />
              ))}
            </div>
          </motion.div>
        </div>
      </PageContainer>
    </AnimatedPage>
  );
};

export default AboutPage;