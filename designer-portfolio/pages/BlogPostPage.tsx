import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimatedPage from '../components/AnimatedPage';
import { useStore } from '../store';
import { ArrowLeft } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import Editable from '../components/Editable';

const BlogPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const posts = useStore((state) => state.content.posts);
  const postIndex = posts.findIndex((p) => p.id === id);
  const post = posts[postIndex];
  
  const postPath = `posts.${postIndex}`;

  if (!post) {
    return (
      <AnimatedPage>
        <PageContainer>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
            <p className="text-secondary mb-8">Sorry, we couldn't find the post you're looking for.</p>
            <Link to="/blog" className="text-accent font-semibold" data-interactive>
              Back to all posts
            </Link>
          </div>
        </PageContainer>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageContainer>
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/blog" className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-8" data-interactive>
              <ArrowLeft size={18} />
              <span>All Posts</span>
            </Link>
            <Editable as="h1" path={`${postPath}.title`} className="text-4xl md:text-5xl font-heading font-black mb-4" />
            <div className="flex items-center space-x-4 text-secondary mb-8">
              <span>By <Editable path={`${postPath}.author`} /></span>
              <span>&middot;</span>
              <Editable path={`${postPath}.date`} />
            </div>
          </motion.div>
          
          <motion.img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-auto object-cover rounded-lg mb-12 shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            data-editable-path={`${postPath}.imageUrl`}
          />

          <motion.div
            className="prose prose-lg max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Editable as="p" path={`${postPath}.excerpt`} className="lead text-xl" />
            <Editable as="p" path={`${postPath}.content`} />
          </motion.div>

          <motion.div 
            className="mt-12 pt-8 border-t border-surface"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h4 className="text-lg font-bold mb-2 text-primary">Tags:</h4>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <span key={tag} className="text-sm bg-overlay px-3 py-1 rounded-full">
                  <Editable path={`${postPath}.tags.${index}`} />
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </PageContainer>
    </AnimatedPage>
  );
};

export default BlogPostPage;