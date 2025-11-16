// src/pages/Popup.tsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider"; // <-- NEW
import { Settings as SettingsIcon, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

// NEW default settings for local state
const defaultQuickSettings = {
  focusMode: false,
  motionBlocker: false,
  largerTargets: false,
  readAloud: false,
  fontSize: 100, // <-- NEW
};

const Popup = () => {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(true);
  const [quickSettings, setQuickSettings] = useState(defaultQuickSettings);

  useEffect(() => {
    // 1. Load settings from chrome.storage
    chrome.runtime.sendMessage({ action: 'getSettings' }, (result) => {
      if (result) {
        const parsed = result;
        setEnabled(parsed.enabled);
        setQuickSettings({
          focusMode: parsed.cognitive?.focusMode || false,
          motionBlocker: parsed.visual?.motionBlocker || false,
          largerTargets: parsed.motor?.largerTargets || false,
          readAloud: parsed.visual?.readAloud || false,
          fontSize: parsed.visual?.fontSize || 100, // <-- NEW
        });
      }
    });

    // 2. Listen for changes from other parts
    const listener = (request: any) => {
      if (request.action === 'settingsUpdated') {
        const parsed = request.settings;
        setEnabled(parsed.enabled);
        setQuickSettings({
          focusMode: parsed.cognitive?.focusMode || false,
          motionBlocker: parsed.visual?.motionBlocker || false,
          largerTargets: parsed.motor?.largerTargets || false,
          readAloud: parsed.visual?.readAloud || false,
          fontSize: parsed.visual?.fontSize || 100, // <-- NEW
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);
  
  // 3. Helper to save to chrome.storage
  const updateStorageSettings = (newSettings: object) => {
     chrome.runtime.sendMessage(
      { action: 'saveSettings', settings: newSettings },
      () => {} // No toast needed
    );
  }

  // 4. Generic handler for ALL controls
  const handleSettingChange = (key: keyof typeof quickSettings, value: any) => {
    const newQuickSettings = { ...quickSettings, [key]: value };
    setQuickSettings(newQuickSettings);

    chrome.runtime.sendMessage({ action: 'getSettings' }, (result) => {
        const settings = result || {};
        const updatedSettings = {
          ...settings,
          cognitive: { 
            ...settings.cognitive, 
            focusMode: newQuickSettings.focusMode
          },
          visual: { 
            ...settings.visual, 
            motionBlocker: newQuickSettings.motionBlocker,
            readAloud: newQuickSettings.readAloud,
            fontSize: newQuickSettings.fontSize, // <-- NEW
          },
          motor: { 
            ...settings.motor, 
            largerTargets: newQuickSettings.largerTargets,
          },
        };
        updateStorageSettings(updatedSettings);
    });
  };

  const handleEnabledToggle = (checked: boolean) => {
    setEnabled(checked);
    chrome.runtime.sendMessage({ action: 'getSettings' }, (result) => {
        const settings = result || {};
        settings.enabled = checked;
        updateStorageSettings(settings);
    });
  };

  const openChatInterface = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('index.html#/')
    });
  };

  return (
    <div className="w-[380px] bg-background p-4 space-y-4">
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
            
            {/* --- NEW FONT SIZE SLIDER --- */}
            <Card className="p-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">Font Size</p>
                    <span className="text-xs text-muted-foreground">
                      {quickSettings.fontSize}%
                    </span>
                  </div>
                  <Slider
                    value={[quickSettings.fontSize]}
                    onValueChange={([value]) => handleSettingChange("fontSize", value)}
                    min={50}
                    max={300}
                    step={10}
                  />
                </div>
            </Card>
            {/* --- END FONT SIZE SLIDER --- */}

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Focus Mode</p>
                  <p className="text-xs text-muted-foreground">Hide distractions</p>
                </div>
                <Switch
                  checked={quickSettings.focusMode}
                  onCheckedChange={(checked) => handleSettingChange("focusMode", checked)}
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
                  onCheckedChange={(checked) => handleSettingChange("motionBlocker", checked)}
                />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Read Aloud</p>
                  <p className="text-xs text-muted-foreground">Click text to read</p>
                </div>
                <Switch
                  checked={quickSettings.readAloud}
                  onCheckedChange={(checked) => handleSettingChange("readAloud", checked)}
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
                  onCheckedChange={(checked) => handleSettingChange("largerTargets", checked)}
                />
              </div>
            </Card>

          </div>

          <Button 
            className="w-full" 
            variant="outline" 
            onClick={openChatInterface}
          >
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
