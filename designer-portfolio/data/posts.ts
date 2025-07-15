
import type { Post } from '../types';

export const posts: Post[] = [
  {
    id: 'design-thinking-deep-dive',
    title: 'A Deep Dive into Design Thinking',
    author: 'Ben Sandivar',
    date: 'October 26, 2023',
    excerpt: 'Design thinking is more than a buzzword; it’s a powerful framework for innovation. Let\'s explore its five stages...',
    content: 'Design thinking is an iterative process in which we seek to understand the user, challenge assumptions, and redefine problems in an attempt to identify alternative strategies and solutions that might not be instantly apparent with our initial level of understanding. The five stages are: Empathize, Define, Ideate, Prototype, and Test. This post breaks down each stage with real-world examples and practical tips for implementation in your own projects.',
    imageUrl: 'https://picsum.photos/seed/blog1/800/450',
    tags: ['Design Thinking', 'Process', 'UI/UX'],
  },
  {
    id: 'color-psychology-in-ui',
    title: 'The Psychology of Color in UI Design',
    author: 'Ben Sandivar',
    date: 'September 15, 2023',
    excerpt: 'Colors evoke emotions and can significantly impact user experience. Choosing the right color palette is crucial for any digital product.',
    content: 'From the calming effect of blue to the urgency of red, colors play a vital role in how users perceive and interact with your application. In this article, we delve into the psychology behind different colors and how they can be strategically used in UI design to guide user behavior, enhance usability, and strengthen brand identity. We\'ll look at case studies from popular apps and websites to see these principles in action.',
    imageUrl: 'https://picsum.photos/seed/blog2/800/450',
    tags: ['UI Design', 'Color Theory', 'Psychology'],
  },
  {
    id: 'future-of-interaction-design',
    title: 'The Future is Now: Trends in Interaction Design',
    author: 'Ben Sandivar',
    date: 'August 02, 2023',
    excerpt: 'From voice interfaces to AR, interaction design is evolving at a rapid pace. Here are the trends to watch.',
    content: 'The way we interact with technology is constantly changing. Keyboards and mice are being supplemented by voice, gestures, and even augmented reality overlays. This post explores the cutting-edge trends in interaction design, including conversational UI, micro-interactions, haptic feedback, and the integration of AI to create more personalized and predictive user experiences. We\'ll discuss the challenges and opportunities these new paradigms present for designers.',
    imageUrl: 'https://picsum.photos/seed/blog3/800/450',
    tags: ['Interaction Design', 'Trends', 'Future Tech'],
  },
];