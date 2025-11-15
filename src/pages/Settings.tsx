// src/pages/Settings.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Brain, Eye, Hand, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Settings {
  enabled: boolean;
  cognitive: {
    simplifier: boolean;
    focusMode: boolean;
    chatbotEnabled: boolean;
  };
  visual: {
    contrast: number;
    motionBlocker: boolean;
    altTextGenerator: boolean;
    readAloud: boolean;
  };
  motor: {
    largerTargets: boolean;
    voiceCommands: boolean;
    gestureControls: boolean;
  };
}

const defaultSettings: Settings = {
  enabled: true,
  cognitive: {
    simplifier: false,
    focusMode: false,
    chatbotEnabled: true,
  },
  visual: {
    contrast: 100,
    motionBlocker: false,
    altTextGenerator: false,
    readAloud: false,
  },
  motor: {
    largerTargets: false,
    voiceCommands: false,
    gestureControls: false,
  },
};

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // 1. Load settings from chrome.storage
  useEffect(() => {
    chrome.storage.local.get("extensionSettings", (result) => {
      if (result.extensionSettings) {
        setSettings(result.extensionSettings);
      }
    });

    // Listen for changes from other parts (like the chatbot)
    const listener = (request: any) => {
      if (request.action === 'settingsUpdated') {
        setSettings(request.settings);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // 2. Save settings to chrome.storage
  const handleSave = () => {
    chrome.runtime.sendMessage(
      { action: 'saveSettings', settings: settings },
      (response) => {
        if (response.success) {
          toast({
            title: "Settings saved",
            description: "Your preferences have been updated successfully",
          });
        }
      }
    );
  };
  
  // Generic handler to update nested state
  const handleSettingChange = (category: keyof Settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as object),
        [key]: value
      }
    }));
  };

  const handleReset = () => {
    // This logic is from your Onboarding.tsx, to reset preferences
    localStorage.setItem("onboardingComplete", "false"); 
    toast({
      title: "Onboarding Reset",
      description: "You will be asked to set your needs again.",
    });
    navigate("/onboarding");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ... Header remains the same ... */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">
              Customize your accessibility preferences
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            {/* ... Extension Status ... */}
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Extension Status
              </h2>
              <p className="text-sm text-muted-foreground">
                Enable or disable all accessibility features
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enabled: checked })
              }
            />
          </div>
        </Card>

        <Card className="p-6">
          {/* ... Cognitive Adaptation ... */}
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-cognitive" />
            <h2 className="text-2xl font-semibold text-foreground">
              Cognitive Adaptation
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">AI Chatbot</p>
              <Switch
                checked={settings.cognitive.chatbotEnabled}
                onCheckedChange={(checked) =>
                  handleSettingChange('cognitive', 'chatbotEnabled', checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">Text Simplifier</p>
              <Switch
                checked={settings.cognitive.simplifier}
                onCheckedChange={(checked) =>
                  handleSettingChange('cognitive', 'simplifier', checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">Focus Mode</p>
              <Switch
                checked={settings.cognitive.focusMode}
                onCheckedChange={(checked) =>
                  handleSettingChange('cognitive', 'focusMode', checked)
                }
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          {/* ... Visual Adaptation ... */}
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-visual" />
            <h2 className="text-2xl font-semibold text-foreground">
              Visual Adaptation
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-foreground">Contrast Level</p>
                <span className="text-sm text-muted-foreground">
                  {settings.visual.contrast}%
                </span>
              </div>
              <Slider
                value={[settings.visual.contrast]}
                onValueChange={([value]) =>
                  handleSettingChange('visual', 'contrast', value)
                }
                min={100} max={300} step={10}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">Motion Blocker</p>
              <Switch
                checked={settings.visual.motionBlocker}
                onCheckedChange={(checked) =>
                  handleSettingChange('visual', 'motionBlocker', checked)
                }
              />
            </div>
            {/* ... Other visual settings ... */}
          </div>
        </Card>
        
        <Card className="p-6">
          {/* ... Motor Adaptation ... */}
          <div className="flex items-center gap-3 mb-4">
            <Hand className="w-6 h-6 text-motor" />
            <h2 className="text-2xl font-semibold text-foreground">
              Motor Adaptation
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">Larger Click Targets</p>
              <Switch
                checked={settings.motor.largerTargets}
                onCheckedChange={(checked) =>
                  handleSettingChange('motor', 'largerTargets', checked)
                }
              />
            </div>
            {/* ... Other motor settings ... */}
          </div>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={handleReset}>
            Reset Onboarding
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
