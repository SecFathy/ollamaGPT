import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { llmSetupSchema, LlmSetup, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";

// Create a combined schema for setup
const setupSchema = z.object({
  // User credentials
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  
  // Application and LLM Settings
  appName: z.string().min(2, "Application name must be at least 2 characters"),
  modelName: z.string().min(3, "Model name must be at least 3 characters"),
  ollamaUrl: z.string().url("Must be a valid URL"),
  modelDisplayName: z.string().min(2, "Display name must be at least 2 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Check if setup is already completed
  const { data: setupStatus, isLoading: checkingSetup } = useQuery({
    queryKey: ['/api/setup/status'],
    queryFn: async () => {
      const res = await fetch('/api/setup/status');
      if (!res.ok) throw new Error("Failed to check setup status");
      return res.json();
    },
    retry: false,
  });
  
  // If setup is completed, redirect to login
  if (setupStatus?.isCompleted && !checkingSetup) {
    return <Redirect to="/auth" />;
  }
  
  // Form hook
  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      appName: "Ahmed LLM",
      modelName: "deepseek-coder-v2",
      ollamaUrl: "http://13.40.186.0:11434/api/generate",
      modelDisplayName: "DeepSeek Coder",
    },
    mode: "onChange",
  });
  
  // Steps data
  const steps = [
    {
      id: "account",
      name: "Create Admin Account",
      fields: ["username", "password", "confirmPassword"],
    },
    {
      id: "llm",
      name: "Configure LLM",
      fields: ["appName", "modelName", "ollamaUrl", "modelDisplayName"],
    },
  ];
  
  // Get current step fields
  const currentStepFields = steps[currentStep].fields;
  
  // Setup mutation
  const setupMutation = useMutation({
    mutationFn: async (data: SetupFormValues) => {
      const { confirmPassword, ...setupData } = data;
      const res = await apiRequest("POST", "/api/setup", setupData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Setup completed!",
        description: "Your chat assistant is ready to use.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/setup/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Setup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Continue to next step
  const continueToNextStep = () => {
    const fieldsToValidate = currentStepFields;
    form.trigger(fieldsToValidate as any).then((isValid) => {
      if (isValid) {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          // Submit the form on the last step
          form.handleSubmit(onSubmit)();
        }
      }
    });
  };
  
  // Go back to previous step
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Submit handler
  const onSubmit = (values: SetupFormValues) => {
    setupMutation.mutate(values);
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text mb-2">
            DeepSeek Coder Assistant
          </h1>
          <p className="text-muted-foreground">
            Complete the initial setup to get started
          </p>
        </div>
        
        {/* Steps indicator */}
        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                className="flex flex-col items-center"
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    index === currentStep 
                      ? "bg-primary text-primary-foreground" 
                      : index < currentStep 
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-xs text-muted-foreground">{step.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep].name}</CardTitle>
            <CardDescription>
              {currentStep === 0 
                ? "Create your admin account to manage the chat assistant"
                : "Configure your LLM settings for the chat assistant"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Account setup fields */}
                {currentStep === 0 && (
                  <>
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="admin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                {/* LLM setup fields */}
                {currentStep === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="appName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Application Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Ahmed LLM" {...field} />
                          </FormControl>
                          <FormDescription>
                            The name of your LLM application
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="modelName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model Name</FormLabel>
                          <FormControl>
                            <Input placeholder="deepseek-coder-v2" {...field} />
                          </FormControl>
                          <FormDescription>
                            The name of the Ollama model to use (e.g., deepseek-coder-v2)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="ollamaUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ollama URL</FormLabel>
                          <FormControl>
                            <Input placeholder="http://localhost:11434/api/generate" {...field} />
                          </FormControl>
                          <FormDescription>
                            The URL for your Ollama API endpoint
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="modelDisplayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="DeepSeek Coder" {...field} />
                          </FormControl>
                          <FormDescription>
                            A friendly name to display for your LLM in the UI
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 0 || setupMutation.isPending}
            >
              Back
            </Button>
            <Button
              onClick={continueToNextStep}
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : currentStep === steps.length - 1 ? (
                "Complete Setup"
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}