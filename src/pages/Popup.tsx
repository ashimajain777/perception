// src/pages/Popup.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Popup = () => {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(true);
  const [quickSettings, setQuickSettings] = useState({
    focusMode: false,
    motionBlocker: false,
    largerTargets: false,
  });

  // 1. Load settings from chrome.storage
  useEffect(() => {
    chrome.storage.local.get("extensionSettings", (result) => {
      if (result.extensionSettings) {
        const parsed = result.extensionSettings;
        setEnabled(parsed.enabled);
        setQuickSettings({
          focusMode: parsed.cognitive?.focusMode || false,
          motionBlocker: parsed.visual?.motionBlocker || false,
          largerTargets: parsed.motor?.largerTargets || false,
        });
      }
    });

    // Listen for changes from other parts (like the chatbot)
    const listener = (request: any) => {
      if (request.action === 'settingsUpdated') {
        const parsed = request.settings;
        setEnabled(parsed.enabled);
        setQuickSettings({
          focusMode: parsed.cognitive?.focusMode || false,
          motionBlocker: parsed.visual?.motionBlocker || false,
          largerTargets: parsed.motor?.largerTargets || false,
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // 2. Helper to save to chrome.storage
  const updateStorageSettings = (newSettings: object) => {
     chrome.runtime.sendMessage(
      { action: 'saveSettings', settings: newSettings },
      () => {} // We don't need a toast in the quick popup
    );
  }

  const handleToggle = (key: keyof typeof quickSettings) => {
    const newQuickSettings = { ...quickSettings, [key]: !quickSettings[key] };
    setQuickSettings(newQuickSettings);

    chrome.storage.local.get("extensionSettings", (result) => {
        const settings = result.extensionSettings || {};
        const updatedSettings = {
          ...settings,
          cognitive: { ...settings.cognitive, focusMode: newQuickSettings.focusMode },
          visual: { ...settings.visual, motionBlocker: newQuickSettings.motionBlocker },
          motor: { ...settings.motor, largerTargets: newQuickSettings.largerTargets },
        };
        updateStorageSettings(updatedSettings);
    });
  };

  const handleEnabledToggle = (checked: boolean) => {
    setEnabled(checked);
    chrome.storage.local.get("extensionSettings", (result) => {
        const settings = result.extensionSettings || {};
        settings.enabled = checked;
        updateStorageSettings(settings);
    });
  };

  return (
    <div className="w-[380px] bg-background p-4 space-y-4">
      {/* ... JSX remains the same as your original file ... */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">AccessAI</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
        >
          <SettingsIcon className="w-5 h-5" />
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Extension Active</p>
            <p className="text-sm text-muted-foreground">
              {enabled ? "All features enabled" : "Extension disabled"}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleEnabledToggle} />
        </div>
      </Card>

      {enabled && (
        <>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Controls
            </h2>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Focus Mode</p>
                  <p className="text-xs text-muted-foreground">Hide distractions</p>
                </div>
                <Switch
                  checked={quickSettings.focusMode}
                  onCheckedChange={() => handleToggle("focusMode")}
                />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Motion Blocker</p>
                  <p className="text-xs text-muted-foreground">Reduce animations</p>
                </div>
                <Switch
                  checked={quickSettings.motionBlocker}
                  onCheckedChange={() => handleToggle("motionBlocker")}
                />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Larger Targets</p>
                  <p className="text-xs text-muted-foreground">Easier clicking</p>
                </div>
                <Switch
                  checked={quickSettings.largerTargets}
                  onCheckedChange={() => handleToggle("largerTargets")}
                />
              </div>
            </Card>
          </div>

          <Button className="w-full" variant="outline" disabled>
            <MessageSquare className="w-4 h-4 mr-2" />
            Open AI Assistant
          </Button>
        </>
      )}

      <div className="pt-2 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm"
          onClick={() => navigate("/settings")}
        >
          View All Settings →
        </Button>
      </div>
    </div>
  );
};

export default Popup;
