import React from 'react';
import { motion } from 'framer-motion';
import AnimatedPage from '../components/AnimatedPage';
import { Mail, Phone, MapPin } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import { useStore } from '../store';
import Editable from '../components/Editable';

const ContactInfo = ({ icon: Icon, titlePath, contentPath }: { icon: React.ElementType, titlePath: string, contentPath: string }) => (
  <motion.div 
    className="flex items-start space-x-4"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="bg-overlay p-3 rounded-full">
      <Icon className="text-accent" size={24} />
    </div>
    <div>
      <Editable as="h3" path={titlePath} className="font-bold text-lg text-primary" />
      <Editable as="p" path={contentPath} className="text-secondary" />
    </div>
  </motion.div>
);

const ContactPage = () => {
  const content = useStore(state => state.content.contact);

  return (
    <AnimatedPage>
      <PageContainer>
        <motion.h1
          className="text-4xl md:text-6xl font-heading font-black text-center mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Editable as="h1" path="contact.title" />
        </motion.h1>
        <motion.p
          className="text-lg text-secondary text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Editable as="p" path="contact.description" />
        </motion.p>

        <div className="max-w-lg mx-auto space-y-8">
          <ContactInfo icon={Mail} titlePath="contact.email.title" contentPath="contact.email.value" />
          <ContactInfo icon={Phone} titlePath="contact.phone.title" contentPath="contact.phone.value" />
          <ContactInfo icon={MapPin} titlePath="contact.location.title" contentPath="contact.location.value" />
        </div>
        
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
            <a href={`mailto:${content.email.value}`} className="inline-block bg-accent text-white px-10 py-4 rounded-full font-semibold transition-transform duration-300 hover:scale-105" data-interactive>
                <Editable path="contact.cta" />
            </a>
        </motion.div>
      </PageContainer>
    </AnimatedPage>
  );
};

export default ContactPage;