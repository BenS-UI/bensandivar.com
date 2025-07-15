
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import WorkPage from './pages/WorkPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import ContactPage from './pages/ContactPage';
import CustomCursor from './components/CustomCursor';
import VisualEditor from './components/VisualEditor';
import { useStore } from './store';

const AppRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="work" element={<WorkPage />} />
          <Route path="project/:id" element={<ProjectDetailPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="post/:id" element={<BlogPostPage />} />
          <Route path="contact" element={<ContactPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const isEditorActive = useStore(state => state.isEditorActive);
  
  useEffect(() => {
    if (isEditorActive) {
      document.body.classList.add('visual-editor-active');
    } else {
      document.body.classList.remove('visual-editor-active');
    }
    return () => {
      document.body.classList.remove('visual-editor-active');
    };
  }, [isEditorActive]);

  return (
    <>
      <CustomCursor />
      <HashRouter>
        <AppRoutes />
      </HashRouter>
      <VisualEditor />
    </>
  );
}

export default App;
