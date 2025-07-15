import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimatedPage from '../components/AnimatedPage';
import { useStore } from '../store';
import { ArrowLeft } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import Editable from '../components/Editable';
import ImagePreview from '../components/ImagePreview';

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const projects = useStore(state => state.content.projects);
  const projectIndex = projects.findIndex((p) => p.id === id);
  const project = projects[projectIndex];
  
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  
  const projectPath = `projects.${projectIndex}`;

  if (!project) {
    return (
      <AnimatedPage>
        <PageContainer>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Project Not Found</h1>
            <p className="text-secondary mb-8">Sorry, we couldn't find the project you're looking for.</p>
            <Link to="/work" className="text-accent font-semibold" data-interactive>
              Back to all projects
            </Link>
          </div>
        </PageContainer>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <ImagePreview imageUrl={hoveredImage} position={mousePosition} />
      <PageContainer>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/work" className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-8" data-interactive>
              <ArrowLeft size={18} />
              <span>All Projects</span>
            </Link>
            <Editable as="p" path={`${projectPath}.category`} className="text-accent font-semibold mb-2" />
            <Editable as="h1" path={`${projectPath}.title`} className="text-4xl md:text-6xl font-heading font-black mb-4" />
            <div className="flex items-center space-x-4 text-secondary mb-8">
              <Editable as="span" path={`${projectPath}.year`} />
              <span>&middot;</span>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, tagIndex) => (
                  <span key={tag} className="text-xs bg-overlay px-2 py-1 rounded-full">
                    <Editable path={`${projectPath}.tags.${tagIndex}`} />
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
          
          <motion.img
            src={project.imageUrl}
            alt={project.title}
            className="w-full h-auto object-cover rounded-lg mb-12 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            data-editable-path={`${projectPath}.imageUrl`}
          />

          <motion.div
            className="prose prose-lg max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Editable as="p" path={`${projectPath}.description`} className="lead text-xl" />
            <Editable as="p" path={`${projectPath}.longDescription`} />
          </motion.div>
          
          {project.galleryImages && project.galleryImages.length > 0 && (
            <motion.div 
              className="mt-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <h3 className="text-3xl font-bold mb-8 text-center text-primary">Project Gallery</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {project.galleryImages.map((imgUrl, index) => (
                  <motion.a
                    key={index}
                    href={imgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden shadow-lg group aspect-video"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                    data-interactive
                    onMouseEnter={() => setHoveredImage(imgUrl)}
                    onMouseLeave={() => setHoveredImage(null)}
                    onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
                  >
                    <img
                      src={imgUrl}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      alt={`Project gallery image ${index + 1}`}
                      data-editable-path={`${projectPath}.galleryImages.${index}`}
                    />
                  </motion.a>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </PageContainer>
    </AnimatedPage>
  );
};

export default ProjectDetailPage;