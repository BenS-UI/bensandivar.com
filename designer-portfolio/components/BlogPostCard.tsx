import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { Post } from '../types';
import { ArrowRight } from 'lucide-react';
import Editable from './Editable';

interface BlogPostCardProps {
  post: Post;
  postPath: string;
}

const BlogPostCard: React.FC<BlogPostCardProps> = ({ post, postPath }) => {
  return (
    <Link to={`/post/${post.id}`} className="block group" data-interactive>
      <motion.div className="bg-surface rounded-lg overflow-hidden h-full flex flex-col shadow-xl">
        <div className="overflow-hidden">
            <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-56 object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
            data-editable-path={`${postPath}.imageUrl`}
            />
        </div>
        <div className="p-6 flex flex-col flex-grow">
          <Editable as="p" path={`${postPath}.date`} className="text-sm text-secondary mb-2" />
          <Editable as="h3" path={`${postPath}.title`} className="text-xl font-bold text-primary mb-3 flex-grow" />
          <Editable as="p" path={`${postPath}.excerpt`} className="text-secondary text-sm mb-4" />
          <div className="mt-auto flex justify-between items-center text-accent font-semibold text-sm">
            Read More
            <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" size={16} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default BlogPostCard;