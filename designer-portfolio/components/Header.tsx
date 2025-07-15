import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useStore } from '../store';
import Editable from './Editable';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  const headerContent = useStore(state => state.content.header);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  }, [location.pathname]);

  const linkClass = (isActive: boolean) =>
    `relative text-sm font-medium transition-colors duration-300 ${
      isActive ? 'text-accent' : 'text-primary hover:text-accent'
    }`;

  const mobileLinkClass = (isActive: boolean) =>
    `block py-4 text-2xl text-center ${
      isActive ? 'text-accent' : 'text-primary'
    }`;

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled || !isHomePage
          ? 'bg-surface/80 backdrop-blur-sm shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6 py-5 flex justify-between items-center">
        <NavLink to="/">
          <img
            src={headerContent.logoUrl}
            alt="Ben Sandivar Logo"
            className="h-8 w-auto"
            data-editable-path="header.logoUrl"
          />
        </NavLink>

        <nav className="hidden md:flex items-center space-x-8">
          {headerContent.navLinks.map((link, index) => (
            <NavLink key={link.to} to={link.to}>
              {({ isActive }) => (
                <span className={linkClass(isActive)}>
                  <Editable path={`header.navLinks.${index}.label`} />
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent"
                      layoutId="underline"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="z-50 relative text-primary">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: '0%' }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="fixed inset-0 bg-base h-screen md:hidden flex flex-col justify-center"
          >
            <nav className="flex flex-col items-center">
              {headerContent.navLinks.map((link, index) => (
                <NavLink key={link.to} to={link.to} onClick={() => setIsOpen(false)}>
                  {({ isActive }) => (
                     <span className={mobileLinkClass(isActive)}>
                        <Editable path={`header.navLinks.${index}.label`} />
                     </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;