import { create } from 'zustand';
import { set, get, cloneDeep } from 'lodash-es';
import { projects as initialProjects } from './data/projects';
import { posts as initialPosts } from './data/posts';
import type { Project, Post } from './types';

interface ContentState {
  header: {
    logoUrl: string;
    navLinks: { to: string; label: string }[];
  };
  footer: {
    copyright: string;
  };
  home: {
    hero: {
      name: string;
      tagline: string;
      cta: string;
    };
    featured: {
      title: string;
      cta: string;
    };
  };
  work: {
    title: string;
    description: string;
  };
  about: {
    title: string;
    imageUrl: string;
    heading: string;
    p1: string;
    p2: string;
    skillsTitle: string;
    skills: string[];
  };
  blog: {
    title: string;
    description: string;
  };
  contact: {
    title: string;
    description: string;
    email: {
      title: string;
      value: string;
    };
    phone: {
      title: string;
      value: string;
    };
    location: {
      title: string;
      value: string;
    };
    cta: string;
  };
  projects: Project[];
  posts: Post[];
}

interface AppState {
  isEditorActive: boolean;
  content: ContentState;
  initialContentSnapshot: ContentState;
  toggleEditor: () => void;
  updateContent: (path: string, value: any) => void;
}

const initialContent: ContentState = {
  header: {
    logoUrl: 'https://raw.githubusercontent.com/BenS-UI/portfolio/refs/heads/main/B-logo-a.svg',
    navLinks: [
      { to: '/', label: 'Home' },
      { to: '/work', label: 'Work' },
      { to: '/about', label: 'About' },
      { to: '/blog', label: 'Blog' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  footer: {
    copyright: `© ${new Date().getFullYear()} Ben Sandivar. All Rights Reserved.`,
  },
  home: {
    hero: {
      name: 'Sandivar',
      tagline: "Unleash Creativity",
      cta: "View My Work",
    },
    featured: {
      title: "Featured Projects",
      cta: "See all projects",
    },
  },
  work: {
    title: "My Work",
    description: "Explore a curated selection of my projects. Each category showcases my journey and expertise in turning complex problems into beautiful, creative solutions.",
  },
  about: {
    title: "About Me",
    imageUrl: "https://raw.githubusercontent.com/BenS-UI/portfolio/refs/heads/main/Profile.png",
    heading: "I'm Ben, an educator and designer with a keen eye and a sharp mind. I combine multi-disciplinary skills and perspectives to elevate my work.",
    p1: "I've always tried to look at world from a new and different angle. This has trained my intuition skills. My thirst for knowledge, for better or for worse, is endless. I'm always willing to take on new challenges and learn skills I find intriging.",
    p2: "Whether I'm wireframing a new app, creating a brand identity, or coding a responsive website, my goal is always the same: to create work that is not only visually stunning but also solves real problems for real people.",
    skillsTitle: "Skillset",
    skills: [
      'Speed Learning', 'Teaching', 'Mnemonics', 'Graphic Design', 'Concept Art', 'Character Creation', 'Photo Editing',
      'Video Editing', 'Logo Creation', 'Branding', 'App Concept Creation', 'AI',
      'Prompt Engineering', 'Creative Writing', 'Songwriting & Poetry', 'Audio Engineering', 'Music Production', 'Cinematic Composition', 'Product Concept Creation', 'Creative Problem-Solving & Systems Thinking', 'Public Speaking & Communication', 'Project Management',
    ],
  },
  blog: {
    title: "From the Blog",
    description: "Thoughts on everything from design and technology to classical culture and the future.",
  },
  contact: {
    title: "Get In Touch",
    description: "Have a project in mind or just want to say hello? I'd love to hear from you.",
    email: { title: "Email", value: "bensandivar9@gmail.com" },
    phone: { title: "Phone", value: "+34 667 321 265" },
    location: { title: "Location", value: "A Coruña, Spain" },
    cta: "Send me an email",
  },
  projects: initialProjects,
  posts: initialPosts,
};

export const useStore = create<AppState>((setState) => ({
  isEditorActive: false,
  content: cloneDeep(initialContent),
  initialContentSnapshot: initialContent,
  toggleEditor: () => setState((state) => ({ isEditorActive: !state.isEditorActive })),
  updateContent: (path, value) => setState((state) => {
    const newContent = { ...state.content };
    set(newContent, path, value);
    return { content: newContent };
  }),
}));