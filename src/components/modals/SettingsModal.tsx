import React from 'react';
import { BottomSheet } from '@/components/game/BottomSheet';
import {
  getSettingsSound,
  setSettingsSound,
  getSettingsAnimations,
  setSettingsAnimations,
  getSettingsHaptics,
  setSettingsHaptics,
} from '@/lib/storage';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Volume2, Sparkles, Vibrate } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [sound, setSound] = React.useState(getSettingsSound());
  const [animations, setAnimations] = React.useState(getSettingsAnimations());
  const [haptics, setHaptics] = React.useState(getSettingsHaptics());

  React.useEffect(() => {
    if (isOpen) {
      setSound(getSettingsSound());
      setAnimations(getSettingsAnimations());
      setHaptics(getSettingsHaptics());
    }
  }, [isOpen]);

  const handleSound = (v: boolean) => {
    setSound(v);
    setSettingsSound(v);
  };
  const handleAnimations = (v: boolean) => {
    setAnimations(v);
    setSettingsAnimations(v);
  };
  const handleHaptics = (v: boolean) => {
    setHaptics(v);
    setSettingsHaptics(v);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Configurações">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <Label htmlFor="setting-sound" className="font-display font-semibold">
              Som
            </Label>
          </div>
          <Switch id="setting-sound" checked={sound} onCheckedChange={handleSound} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <Label htmlFor="setting-animations" className="font-display font-semibold">
              Animações
            </Label>
          </div>
          <Switch id="setting-animations" checked={animations} onCheckedChange={handleAnimations} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Vibrate className="w-5 h-5 text-muted-foreground" />
            <Label htmlFor="setting-haptics" className="font-display font-semibold">
              Vibração
            </Label>
          </div>
          <Switch id="setting-haptics" checked={haptics} onCheckedChange={handleHaptics} />
        </div>
      </div>
    </BottomSheet>
  );
}
