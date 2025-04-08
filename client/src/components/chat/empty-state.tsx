import { Button } from '@/components/ui/button';
import { Code } from 'lucide-react';

interface EmptyStateProps {
  onExampleSelect: (example: string) => void;
}

export function EmptyState({ onExampleSelect }: EmptyStateProps) {
  const examples = [
    {
      title: 'Explain React hooks',
      description: 'How do they work and what are the common patterns?'
    },
    {
      title: 'Debug a Node.js memory leak',
      description: 'Show me approaches to diagnose and fix memory issues'
    },
    {
      title: 'Create a Docker multi-container setup',
      description: 'With Node.js, MongoDB and Redis'
    },
    {
      title: 'Optimize PostgreSQL queries',
      description: 'Best practices for indexing and query performance'
    }
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-10">
      <div className="bg-primary/10 dark:bg-primary/20 rounded-full p-4 mb-4">
        <Code className="h-8 w-8 text-primary" />
      </div>
      
      <h2 className="text-2xl font-semibold mb-2">How can I help you code today?</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Ask me about programming, development tools, or any technical questions.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        {examples.map((example, index) => (
          <Button
            key={index}
            variant="outline"
            className="h-auto flex flex-col items-start p-4 gap-1"
            onClick={() => onExampleSelect(example.title)}
          >
            <span className="font-medium text-base">{example.title}</span>
            <span className="text-sm text-muted-foreground">{example.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
