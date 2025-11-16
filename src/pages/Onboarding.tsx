// src/pages/Onboarding.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Brain, Eye, Hand } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AccessibilityNeed {
  id: string;
  category: "cognitive" | "visual" | "motor";
  label: string;
  description: string;
}

const accessibilityNeeds: AccessibilityNeed[] = [
  // ... (same as before)
  {
    id: "adhd",
    category: "cognitive",
    label: "ADHD Support",
    description: "Focus mode, distraction reduction, and content simplification",
  },
  {
    id: "dyslexia",
    category: "cognitive",
    label: "Dyslexia Support",
    description: "Readable fonts, text spacing, and reading assistance",
  },
  {
    id: "cognitive-overload",
    category: "cognitive",
    label: "Cognitive Overload",
    description: "Simplified content, reduced visual complexity",
  },
  {
    id: "photosensitivity",
    category: "visual",
    label: "Photosensitivity",
    description: "Motion blocking, reduced flashing content",
  },
  {
    id: "low-vision",
    category: "visual",
    label: "Low Vision",
    description: "High contrast, magnification, screen reader support",
  },
  {
    id: "color-blindness",
    category: "visual",
    label: "Color Blindness",
    description: "Enhanced color contrast and alternative visual indicators",
  },
  {
    id: "motor-precision",
    category: "motor",
    label: "Motor Precision",
    description: "Larger click targets, keyboard navigation",
  },
  {
    id: "interaction-barriers",
    category: "motor",
    label: "Interaction Barriers",
    description: "Voice commands, gesture controls, simplified interactions",
  },
];

const categoryIcons = {
  cognitive: Brain,
  visual: Eye,
  motor: Hand,
};

const categoryColors = {
  cognitive: "text-cognitive",
  visual: "text-visual",
  motor: "text-motor",
};

const Onboarding = () => {
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleToggleNeed = (needId: string) => {
    setSelectedNeeds((prev) =>
      prev.includes(needId)
        ? prev.filter((id) => id !== needId)
        : [...prev, needId]
    );
  };

  const handleContinue = () => {
    if (selectedNeeds.length === 0) {
      toast({
        title: "Select at least one need",
        description: "Please choose the accessibility features you need",
        variant: "destructive",
      });
      return;
    }

    // 1. Get the default settings (which now include fontSize and fontStyle)
    chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
      if (chrome.runtime.lastError || !settings) {
         toast({ title: "Error", description: "Could not load default settings. Please reload.", variant: "destructive" });
         return;
      }
      
      // 2. Modify settings based on selected needs
      if (selectedNeeds.includes('adhd') || selectedNeeds.includes('cognitive-overload')) {
        settings.cognitive.focusMode = true;
      }
       // NEW: Set font for dyslexia
      if (selectedNeeds.includes('dyslexia')) {
        settings.visual.fontStyle = 'opendyslexic';
      }
      if (selectedNeeds.includes('photosensitivity')) {
        settings.visual.motionBlocker = true;
      }
      if (selectedNeeds.includes('low-vision')) {
        settings.visual.contrast = 150; // Set a default contrast
        settings.visual.fontSize = 120; // Set a slightly larger font
      }
      if (selectedNeeds.includes('motor-precision')) {
        settings.motor.largerTargets = true;
      }

      // 3. Save the *full settings object* to chrome.storage
      chrome.runtime.sendMessage({ action: 'saveSettings', settings: settings }, (response) => {
         if (response && response.success) {
            // 4. Save onboarding status to chrome.storage
            chrome.storage.local.set({ onboardingComplete: true }, () => {
              if (chrome.runtime.lastError) {
                toast({ title: "Error", description: "Could not save onboarding status.", variant: "destructive" });
                return;
              }
              toast({
                title: "Preferences saved!",
                description: "Your accessibility settings have been configured",
              });
              navigate("/");
            });
         } else {
           toast({ title: "Error", description: "Could not save settings.", variant: "destructive" });
         }
      });
    });
  };

  const groupedNeeds = {
    cognitive: accessibilityNeeds.filter((n) => n.category === "cognitive"),
    visual: accessibilityNeeds.filter((n) => n.category === "visual"),
    motor: accessibilityNeeds.filter((n) => n.category === "motor"),
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to AccessAI
          </h1>
          <p className="text-xl text-muted-foreground">
            Let's personalize your web experience
          </p>
        </div>

        <div className="space-y-6">
          {(Object.keys(groupedNeeds) as Array<keyof typeof groupedNeeds>).map((category) => {
            const Icon = categoryIcons[category];
            const colorClass = categoryColors[category];

            return (
              <Card key={category} className="p-6 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className={`w-6 h-6 ${colorClass}`} />
                  <h2 className="text-2xl font-semibold capitalize text-foreground">
                    {category} Adaptation
                  </h2>
                </div>
                <div className="space-y-3">
                  {groupedNeeds[category].map((need) => (
                    <label
                      key={need.id}
                      className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedNeeds.includes(need.id)}
                        onCheckedChange={() => handleToggleNeed(need.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-foreground">
                          {need.label}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {need.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleContinue}
            className="min-w-[200px] text-lg"
          >
            Continue to Extension
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
