import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { ModelOption } from '@/lib/types';

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
}

export function ModelSelector({ models, selectedModel, onModelSelect }: ModelSelectorProps) {
  const selectedModelName = models.find(m => m.id === selectedModel)?.name || selectedModel;

  return (
    <div className="flex justify-center border-b border-border py-2 bg-background/80 backdrop-blur-sm">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <span>Model: {selectedModelName}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {models.map(model => (
            <DropdownMenuItem
              key={model.id}
              className="cursor-pointer"
              onClick={() => onModelSelect(model.id)}
            >
              {model.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
