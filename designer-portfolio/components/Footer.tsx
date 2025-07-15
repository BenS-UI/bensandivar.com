import React from 'react';
import { Github, Linkedin, Twitter } from 'lucide-react';
import Editable from './Editable';

const SocialLink = ({ href, icon: Icon }: { href: string; icon: React.ElementType }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary transition-colors duration-300">
    <Icon size={20} />
  </a>
);

const Footer = () => {
  return (
    <footer className="bg-transparent">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-secondary">
            <Editable path="footer.copyright" />
          </p>
          <div className="flex space-x-6">
            <SocialLink href="https://github.com" icon={Github} />
            <SocialLink href="https://linkedin.com" icon={Linkedin} />
            <SocialLink href="https://twitter.com" icon={Twitter} />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;