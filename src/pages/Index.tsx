import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Settings, Zap, Brain, Eye, Hand, Sparkles } from "lucide-react";
import { AIChatbot } from "@/components/AIChatbot";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AIChatbot />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">AccessAI</h1>
            <p className="text-lg text-muted-foreground">
              Your AI-Powered Accessibility Companion
            </p>
          </div>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/settings")}
          >
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-cognitive/10 rounded-lg">
                <Brain className="w-6 h-6 text-cognitive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 text-foreground">
                  Cognitive Support
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Simplify complex content, reduce distractions, and get AI-powered
                  reading assistance
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Text Simplifier</li>
                  <li>• Focus Mode</li>
                  <li>• AI Chatbot Helper</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-visual/10 rounded-lg">
                <Eye className="w-6 h-6 text-visual" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 text-foreground">
                  Visual Adaptation
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Control contrast, block motion, and enhance visual content with AI
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Custom Contrast Control</li>
                  <li>• Motion Blocker</li>
                  <li>• AI Alt Text Generator</li>
                  <li>• Spatial Read-Aloud</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-motor/10 rounded-lg">
                <Hand className="w-6 h-6 text-motor" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 text-foreground">
                  Motor Assistance
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Make interactions easier with larger targets and smart navigation
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Larger Click Targets</li>
                  <li>• Button Targeting</li>
                  <li>• Voice Commands (Soon)</li>
                  <li>• Gesture Controls (Soon)</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="flex items-start gap-4">
            <Sparkles className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Powered by AI
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl">
                AccessAI uses advanced artificial intelligence to understand your needs
                and automatically adapt web content for the best accessibility experience.
                Our AI chatbot can help you navigate settings, explain features, and
                suggest personalized adjustments.
              </p>
              <div className="flex gap-4">
                <Button size="lg" disabled>
                  <Zap className="w-5 h-5 mr-2" />
                  Try AI Assistant
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/popup")}>
                  Open Quick Controls
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            AccessAI is currently in development. Some features are coming soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
