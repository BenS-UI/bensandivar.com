import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
    node: any;
    inline?: boolean;
    className?: string;
    children: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ node, inline, className, children, ...props }) => {
    const [hasCopied, setHasCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    const copyToClipboard = () => {
        navigator.clipboard.writeText(codeString);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    return !inline && match ? (
        <div className="relative bg-[#282c34] rounded-md my-4 text-left">
            <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300 transition-colors"
                aria-label="Copy code"
            >
                {hasCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <pre className="p-4 overflow-x-auto text-sm text-white">
                <code className={className} {...props}>
                    {children}
                </code>
            </pre>
        </div>
    ) : (
        <code className={className} {...props}>
            {children}
        </code>
    );
};

interface MarkdownRendererProps {
    content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code: CodeBlock
            }}
            className="prose prose-sm max-w-none text-secondary"
        >
            {content}
        </ReactMarkdown>
    );
};

export default MarkdownRenderer;