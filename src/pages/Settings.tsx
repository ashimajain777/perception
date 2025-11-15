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

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({
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
  });

  useEffect(() => {
    const saved = localStorage.getItem("extensionSettings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("extensionSettings", JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully",
    });
  };

  const handleReset = () => {
    navigate("/onboarding");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
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
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-cognitive" />
            <h2 className="text-2xl font-semibold text-foreground">
              Cognitive Adaptation
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">AI Chatbot</p>
                <p className="text-sm text-muted-foreground">
                  Get help with accessibility features
                </p>
              </div>
              <Switch
                checked={settings.cognitive.chatbotEnabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    cognitive: { ...settings.cognitive, chatbotEnabled: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Text Simplifier</p>
                <p className="text-sm text-muted-foreground">
                  Rewrite complex text into simpler sentences
                </p>
              </div>
              <Switch
                checked={settings.cognitive.simplifier}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    cognitive: { ...settings.cognitive, simplifier: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Focus Mode</p>
                <p className="text-sm text-muted-foreground">
                  Hide ads and distracting visual elements
                </p>
              </div>
              <Switch
                checked={settings.cognitive.focusMode}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    cognitive: { ...settings.cognitive, focusMode: checked },
                  })
                }
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
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
                  setSettings({
                    ...settings,
                    visual: { ...settings.visual, contrast: value },
                  })
                }
                min={100}
                max={300}
                step={10}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Motion Blocker</p>
                <p className="text-sm text-muted-foreground">
                  Pause or slow down animations and GIFs
                </p>
              </div>
              <Switch
                checked={settings.visual.motionBlocker}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    visual: { ...settings.visual, motionBlocker: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">AI Alt Text</p>
                <p className="text-sm text-muted-foreground">
                  Generate descriptions for images
                </p>
              </div>
              <Switch
                checked={settings.visual.altTextGenerator}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    visual: { ...settings.visual, altTextGenerator: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Spatial Read-Aloud</p>
                <p className="text-sm text-muted-foreground">
                  Word-by-word reading with highlighting
                </p>
              </div>
              <Switch
                checked={settings.visual.readAloud}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    visual: { ...settings.visual, readAloud: checked },
                  })
                }
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Hand className="w-6 h-6 text-motor" />
            <h2 className="text-2xl font-semibold text-foreground">
              Motor Adaptation
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Larger Click Targets</p>
                <p className="text-sm text-muted-foreground">
                  Make buttons and links easier to click
                </p>
              </div>
              <Switch
                checked={settings.motor.largerTargets}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    motor: { ...settings.motor, largerTargets: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Voice Commands</p>
                <p className="text-sm text-muted-foreground">
                  Control navigation with voice (Coming Soon)
                </p>
              </div>
              <Switch
                checked={settings.motor.voiceCommands}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    motor: { ...settings.motor, voiceCommands: checked },
                  })
                }
                disabled
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Gesture Controls</p>
                <p className="text-sm text-muted-foreground">
                  Use gestures for complex actions (Coming Soon)
                </p>
              </div>
              <Switch
                checked={settings.motor.gestureControls}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    motor: { ...settings.motor, gestureControls: checked },
                  })
                }
                disabled
              />
            </div>
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
