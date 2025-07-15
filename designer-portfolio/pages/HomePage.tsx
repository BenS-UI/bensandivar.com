import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Player } from '@lottiefiles/react-lottie-player';
import AnimatedPage from '../components/AnimatedPage';
import ProjectCard from '../components/ProjectCard';
import { useStore } from '../store';
import Editable from '../components/Editable';

const ParallaxText = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef(null);
  // This hook needs a reference to a DOM element to track its scroll position.
  // The div wrapping the motion.div provides this stable reference.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-20%', '20%']);

  return (
    <div ref={ref}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
};

const HomePage = () => {
  const homeContent = useStore(state => state.content.home);
  const projects = useStore(state => state.content.projects);
  const featuredProjects = projects.slice(0, 2);
  const heroImageScroll = useScroll();
  const heroImageY = useTransform(heroImageScroll.scrollYProgress, [0, 1], ["0%", "25%"]);


  return (
    <AnimatedPage>
      <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
        <motion.img
          src="https://github.com/BenS-UI/portfolio/blob/main/Thoughtful%20(2).jpg?raw=true"
          alt="Abstract background"
          className="absolute inset-0 w-full h-full object-cover scale-125"
          style={{ y: heroImageY }}
        />
        <div className="absolute inset-0 bg-black/60"></div>

        <div className="container mx-auto px-6 text-center z-10">
          <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl opacity-20 pointer-events-none"
          >
              <Player
                  autoplay
                  loop
                  src="https://lottie.host/8a7a8d4a-388a-4952-8176-76495861935c/Jp4VymfC3e.json"
              />
          </motion.div>
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-heading font-black mb-4 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Ben <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 animate-gradient-x">
              <Editable path="home.hero.name" />
            </span>
          </motion.h1>
          <motion.p 
            className="max-w-2xl mx-auto text-lg md:text-xl text-gray-200 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Editable as="p" path="home.hero.tagline" />
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link to="/work" className="inline-flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-full font-semibold transition-transform duration-300 hover:scale-105" data-interactive>
              <Editable path="home.hero.cta" /> <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-20 md:py-32">
        <div className="container mx-auto px-6">
          <div className="bg-surface/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-8 sm:p-12 md:p-16">
            <motion.h2 
              className="text-4xl md:text-5xl font-heading font-black text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5 }}
            >
              <Editable as="h2" path="home.featured.title" />
            </motion.h2>
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {featuredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                >
                  <ParallaxText>
                    <ProjectCard project={project} projectPath={`projects.${projects.findIndex(p => p.id === project.id)}`} />
                  </ParallaxText>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-16">
              <Link to="/work" className="text-accent font-semibold inline-flex items-center gap-2 group" data-interactive>
                <Editable path="home.featured.cta" />
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </AnimatedPage>
  );
};

export default HomePage;