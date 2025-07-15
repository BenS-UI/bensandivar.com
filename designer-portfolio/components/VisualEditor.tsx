import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, X, Bot, User } from 'lucide-react';
import { useStore } from '../store';
import { findDifferences } from '../utils/diff';
import { generateCodeForChanges } from '../services/ai';
import MarkdownRenderer from './MarkdownRenderer';

interface Message {
  sender: 'user' | 'ai';
  content: string;
}

const VisualEditor = () => {
  const isEditorActive = useStore((state) => state.isEditorActive);
  const toggleEditor = useStore((state) => state.toggleEditor);
  const content = useStore((state) => state.content);
  const initialContent = useStore((state) => state.initialContentSnapshot);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditorActive) {
      setIsOpen(true);
      setMessages([
        { sender: 'ai', content: "Hello! I'm your AI visual editor. Edit any text on the page, then ask me to 'generate the code' to see the updates." },
      ]);
    } else {
      setIsOpen(false);
    }
  }, [isEditorActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleGenerateCode = async () => {
    const userMessage: Message = { sender: 'user', content: "Generate the code for my changes." };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const differences = findDifferences(initialContent, content);
    const aiResponse = await generateCodeForChanges(differences);

    const aiMessage: Message = { sender: 'ai', content: aiResponse };
    setMessages(prev => [...prev, aiMessage]);
    setIsLoading(false);
  };
  
  return (
    <>
      <div className="fixed bottom-6 right-6 z-[10001]">
        <button
          onClick={toggleEditor}
          className="bg-accent text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300"
          aria-label="Toggle Visual Editor"
          data-interactive
        >
          {isEditorActive ? <X size={28} /> : <Wand2 size={28} />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed bottom-28 right-6 w-[450px] max-w-[90vw] h-[600px] max-h-[70vh] bg-surface rounded-lg shadow-2xl border border-white/10 z-[10000] flex flex-col"
          >
            <div className="p-4 border-b border-overlay flex-shrink-0">
              <h3 className="font-heading font-bold text-lg text-primary">Visual Editor Chatbot</h3>
            </div>
            
            <div className="flex-grow p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                    {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0"><Bot size={18} /></div>}
                    <div className={`p-3 rounded-lg max-w-[85%] ${msg.sender === 'ai' ? 'bg-overlay' : 'bg-accent text-white'}`}>
                      {msg.sender === 'ai' ? <MarkdownRenderer content={msg.content} /> : <p className="text-sm">{msg.content}</p>}
                    </div>
                    {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center flex-shrink-0"><User size={18} /></div>}
                  </div>
                ))}
                {isLoading && (
                   <div className="flex items-start gap-3">
                     <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0"><Bot size={18} /></div>
                     <div className="p-3 rounded-lg bg-overlay">
                       <div className="flex items-center space-x-1">
                          <span className="w-2 h-2 bg-secondary rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                          <span className="w-2 h-2 bg-secondary rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                          <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
                       </div>
                     </div>
                   </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-overlay flex-shrink-0">
                <button
                    onClick={handleGenerateCode}
                    disabled={isLoading}
                    className="w-full bg-accent text-white px-4 py-2.5 rounded-md font-semibold flex items-center justify-center gap-2 transition-colors duration-200 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Generating...' : 'Generate Code for Changes'}
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VisualEditor;