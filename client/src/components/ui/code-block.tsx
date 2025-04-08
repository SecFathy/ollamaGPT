import React, { useEffect, useState, useRef } from 'react';
import { Clipboard, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { useMounted } from '@/hooks/use-mobile';

interface CodeBlockProps {
  language: string;
  content: string;
  className?: string;
}

export function CodeBlock({ language, content, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const mounted = useMounted();
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (mounted && preRef.current) {
      highlightCode();
    }
  }, [content, language, mounted]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (copied) {
      timeout = setTimeout(() => setCopied(false), 2000);
    }
    return () => clearTimeout(timeout);
  }, [copied]);

  const highlightCode = async () => {
    if (typeof window !== 'undefined' && preRef.current) {
      const { default: hljs } = await import('highlight.js/lib/core');
      
      // Register commonly used languages
      const languages = [
        { name: 'javascript', import: () => import('highlight.js/lib/languages/javascript') },
        { name: 'typescript', import: () => import('highlight.js/lib/languages/typescript') },
        { name: 'python', import: () => import('highlight.js/lib/languages/python') },
        { name: 'bash', import: () => import('highlight.js/lib/languages/bash') },
        { name: 'shell', import: () => import('highlight.js/lib/languages/shell') },
        { name: 'json', import: () => import('highlight.js/lib/languages/json') },
        { name: 'html', import: () => import('highlight.js/lib/languages/xml') },
        { name: 'css', import: () => import('highlight.js/lib/languages/css') },
        { name: 'markdown', import: () => import('highlight.js/lib/languages/markdown') },
        { name: 'java', import: () => import('highlight.js/lib/languages/java') },
        { name: 'cpp', import: () => import('highlight.js/lib/languages/cpp') },
        { name: 'c', import: () => import('highlight.js/lib/languages/c') },
        { name: 'go', import: () => import('highlight.js/lib/languages/go') },
        { name: 'rust', import: () => import('highlight.js/lib/languages/rust') },
        { name: 'sql', import: () => import('highlight.js/lib/languages/sql') },
        { name: 'xml', import: () => import('highlight.js/lib/languages/xml') },
      ];

      // Try to load the language
      try {
        const langName = language.toLowerCase();
        const langDef = languages.find(l => l.name === langName);
        
        if (langDef) {
          const langModule = await langDef.import();
          hljs.registerLanguage(langName, langModule.default);
          
          // Use highlighting
          if (preRef.current.querySelector('code')) {
            hljs.highlightElement(preRef.current.querySelector('code')!);
          }
        }
      } catch (error) {
        console.warn('Failed to load highlight.js language:', language);
      }
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
  };

  return (
    <div className={cn('relative group rounded-md', className)}>
      <div className="absolute right-2 top-2 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleCopyCode}
          className="h-8 w-8 bg-muted/50 hover:bg-muted"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Clipboard className="h-4 w-4" />
          )}
          <span className="sr-only">Copy code</span>
        </Button>
      </div>
      <div className="absolute top-0 left-0 px-3 py-1 text-xs text-muted-foreground font-mono rounded-tl-md rounded-br-md bg-muted">
        {language}
      </div>
      <pre
        ref={preRef} 
        className={cn(
          'p-4 pt-8 rounded-md overflow-x-auto bg-code-bg text-foreground',
          language === 'bash' || language === 'shell' 
            ? 'bg-secondary text-secondary-foreground' 
            : 'bg-code-bg'
        )}
      >
        <code className={`language-${language || 'plaintext'}`}>{content}</code>
      </pre>
    </div>
  );
}
