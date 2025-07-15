import React from 'react';
import { motion } from 'framer-motion';
import AnimatedPage from '../components/AnimatedPage';
import BlogPostCard from '../components/BlogPostCard';
import PageContainer from '../components/PageContainer';
import { useStore } from '../store';
import Editable from '../components/Editable';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

const BlogPage = () => {
  const { title, description } = useStore(state => state.content.blog);
  const posts = useStore(state => state.content.posts);

  return (
    <AnimatedPage>
      <PageContainer>
        <motion.h1
          className="text-4xl md:text-6xl font-heading font-black text-center mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Editable as="h1" path="blog.title" />
        </motion.h1>
        <motion.p
          className="text-lg text-secondary text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Editable as="p" path="blog.description" />
        </motion.p>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {posts.map((post, index) => (
            <motion.div key={post.id} variants={itemVariants}>
              <BlogPostCard post={post} postPath={`posts.${index}`} />
            </motion.div>
          ))}
        </motion.div>
      </PageContainer>
    </AnimatedPage>
  );
};

export default BlogPage;