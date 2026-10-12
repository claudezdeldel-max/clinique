"use client";

import { useState, useEffect } from 'react';
import { useQueue } from '@/hooks/use-queue';
import type { QueueItem } from '@/types/queue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Activity,
  Megaphone,
  Clock,
  Building2,
  Zap,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';

export default function QueueDisplayPage() {
  const {
    queue,
    activeCalledItem,
    audioEnabled,
    anonymizeMode,
    wakeLockActive,
    setAudioEnabled,
    setAnonymizeMode,
    dismissCallout,
    testAudio,
  } = useQueue({ enableAudio: true, isDisplayMode: true });

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light'); // Default to clean bright light theme
  const [audioActivated, setAudioActivated] = useState<boolean>(false);

  // Live ticking clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto dismiss popup banner after 10 seconds so main TV screen stays visible
  useEffect(() => {
    if (activeCalledItem) {
      const timer = setTimeout(() => {
        dismissCallout();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeCalledItem, dismissCallout]);

  // Handle native browser fullscreen API toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch((err) => {
        console.warn('Error enabling fullscreen', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false));
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Queue categorization
  const calledItems = queue.filter(
    (q) => q.status === 'called' || q.status === 'in_progress'
  );
  const waitingItems = queue.filter((q) => q.status === 'waiting');

  const getDisplayName = (item: QueueItem) => {
    if (anonymizeMode) {
      const parts = item.patient_name.trim().split(' ');
      const initials = parts.map((n) => n[0]).join('.');
      return `M./Mme ${initials}`;
    }
    return item.patient_name;
  };

  const isLight = themeMode === 'light';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans select-none overflow-hidden transition-colors duration-300 antialiased ${
        isLight
          ? 'bg-slate-100 text-slate-900'
          : 'bg-slate-950 text-slate-50'
      }`}
    >
      {/* Top TV Header Banner */}
      <header
        className={`px-8 py-4 border-b flex items-center justify-between shadow-lg transition-colors ${
          isLight
            ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white border-blue-600'
            : 'bg-slate-900/90 text-white border-slate-800 backdrop-blur'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white shadow-inner">
            <Activity className="size-7 animate-pulse text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">
                RadioMed OS <span className="font-light text-cyan-200">| Clinique de Radiologie</span>
              </h1>
              <Badge className="bg-emerald-400/20 text-emerald-300 border-emerald-400/30 text-xs px-2.5 py-0.5 font-bold">
                ● ÉCRAN SALLE D'ATTENTE EN DIRECT
              </Badge>
            </div>
            <p className="text-xs text-blue-100/90 font-medium mt-0.5">
              Service d'Imagerie Médicale & Diagnostic IRM / CT / Échographie
            </p>
          </div>
        </div>

        {/* TV Clock & Controls */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-extrabold font-mono tracking-wider text-cyan-300 drop-shadow">
              {currentTime || '00:00:00'}
            </div>
            <div className="text-xs text-blue-100 capitalize font-medium">
              {currentDate}
            </div>
          </div>

          <div className="h-8 w-px bg-white/20" />

          {/* Interactive Toolbar */}
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur border border-white/20 p-1.5 rounded-xl">
            {/* Audio Toggle button */}
            <Button
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                setAudioActivated(true);
                testAudio();
              }}
              variant="ghost"
              size="sm"
              className={`h-9 px-3 gap-2 text-xs font-bold rounded-lg transition-all ${
                audioEnabled
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Activer les annonces sonores et synthèse vocale"
            >
              {audioEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4 opacity-70" />}
              {audioEnabled ? 'Gong & Voix Actifs' : 'Activer le Son'}
            </Button>

            {/* Theme Toggle Button */}
            <Button
              onClick={() => setThemeMode(isLight ? 'dark' : 'light')}
              variant="ghost"
              size="sm"
              className="h-9 px-3 gap-2 text-xs font-bold bg-white/10 text-white hover:bg-white/20 rounded-lg"
              title="Basculer thème clair / sombre"
            >
              {isLight ? <Moon className="size-4 text-amber-300" /> : <Sun className="size-4 text-amber-400" />}
              {isLight ? 'Thème Sombre' : 'Thème Lumineux'}
            </Button>

            {/* Privacy Mode Toggle */}
            <Button
              onClick={() => setAnonymizeMode(!anonymizeMode)}
              variant="ghost"
              size="sm"
              className={`h-9 px-3 gap-2 text-xs font-bold rounded-lg transition-all ${
                anonymizeMode
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Masquer les noms complets sur l'écran public"
              
            >
              {anonymizeMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {anonymizeMode ? 'Mode RGPD' : 'Noms Affichés'}
            </Button>

            {/* Native Fullscreen API button */}
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              className="h-9 px-3 gap-2 text-xs font-bold bg-white/10 text-white hover:bg-white/20 rounded-lg"
              title="Bascule Plein Écran TV"
            >
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              {isFullscreen ? 'Quitter Plein Écran' : 'Plein Écran'}
            </Button>
          </div>
        </div>
      </header>

      {/* Notice Banner if Audio is muted */}
      {!audioActivated && (
        <div className="bg-amber-500 text-amber-950 font-medium px-8 py-2 flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-950 animate-bounce" />
            <span>
              <strong>Configuration Écran TV :</strong> Cliquez sur <strong>"Activer le Son"</strong> pour entendre le gong sonore et l'appel vocal lors du passage des patients.
            </span>
          </div>
          <Button
            onClick={() => {
              setAudioActivated(true);
              testAudio();
            }}
            size="sm"
            className="h-7 px-3 text-xs bg-amber-950 text-amber-100 hover:bg-amber-900 font-bold"
          >
            Tester Gong & Activer
          </Button>
        </div>
      )}

      {/* Main Broadcast Content Grid */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: APPELS EN COURS & SALLES D'EXAMEN (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-4 rounded-full bg-blue-600 animate-ping" />
              <h2 className={`text-2xl font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Appels En Cours & Salles d'Imagerie
              </h2>
            </div>
            <Badge className={`${isLight ? 'bg-blue-100 text-blue-800' : 'bg-slate-800 text-blue-300'} px-3 py-1 font-bold text-xs`}>
              {calledItems.length} patient(s) appelé(s)
            </Badge>
          </div>

          {calledItems.length === 0 ? (
            <div
              className={`rounded-3xl border p-12 text-center flex flex-col items-center justify-center min-h-[360px] shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <Building2 className={`size-16 mb-4 ${isLight ? 'text-slate-300' : 'text-slate-700'} animate-pulse`} />
              <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Aucun appel en cours pour l'instant
              </h3>
              <p className={`text-base mt-2 max-w-md ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Veuillez patienter en salle d'attente. Votre numéro de ticket s'affichera ici dès que votre salle d'examen sera disponible.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {calledItems.map((item) => {
                const isJustCalled = activeCalledItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`relative overflow-hidden rounded-3xl p-6 border transition-all duration-300 shadow-xl flex items-center justify-between gap-6 ${
                      isLight
                        ? isJustCalled
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 ring-4 ring-blue-400/30 scale-[1.02]'
                          : 'bg-white border-slate-200 text-slate-900 hover:border-blue-300'
                        : isJustCalled
                          ? 'bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900 border-blue-400 ring-4 ring-blue-500/30 scale-[1.02] text-white'
                          : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  >
                    {/* Glowing highlight indicator */}
                    {isJustCalled && (
                      <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-cyan-400 via-amber-300 to-emerald-400 animate-pulse" />
                    )}

                    <div className="flex items-center gap-6">
                      {/* Ticket Badge */}
                      <div
                        className={`flex flex-col items-center justify-center px-6 py-4 rounded-2xl min-w-[130px] border font-mono ${
                          isLight && !isJustCalled
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-white/20 border-white/30 text-white'
                        }`}
                      >
                        <span className="text-xs uppercase font-bold tracking-wider opacity-80">TICKET</span>
                        <span className="text-4xl font-black tracking-wider mt-0.5">
                          {item.ticket_number}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl font-black tracking-tight">
                            {getDisplayName(item)}
                          </span>
                          {item.priority === 'urgent' && (
                            <Badge className="bg-red-600 text-white font-bold text-xs px-2.5 py-0.5">
                              🔴 Urgence
                            </Badge>
                          )}
                        </div>

                        <p className={`text-lg mt-1 font-semibold ${isLight && !isJustCalled ? 'text-slate-600' : 'text-blue-100'}`}>
                          {item.modality_name}
                        </p>
                        <p className={`text-xs mt-0.5 ${isLight && !isJustCalled ? 'text-slate-500' : 'text-white/80'}`}>
                          Radiologue référent : {item.doctor_name || 'Dr. Marc Laurent'}
                        </p>
                      </div>
                    </div>

                    {/* Room Callout Target */}
                    <div
                      className={`text-right shrink-0 px-6 py-4 rounded-2xl border ${
                        isLight && !isJustCalled
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-black/30 border-white/20'
                      }`}
                    >
                      <span className={`text-xs font-bold uppercase tracking-wider block ${isLight && !isJustCalled ? 'text-emerald-800' : 'text-cyan-200'}`}>
                        SE PRÉSENTER EN :
                      </span>
                      <span className={`text-3xl font-black tracking-wide mt-1 block ${isLight && !isJustCalled ? 'text-emerald-700' : 'text-emerald-300'}`}>
                        {item.room_name}
                      </span>
                      <span className={`text-xs font-bold mt-1 block ${isLight && !isJustCalled ? 'text-slate-500' : 'text-white/70'}`}>
                        {item.status === 'called' ? '⚡ Vient d\'être appelé' : 'En consultation'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Metrics Banner */}
          <div
            className={`p-6 rounded-3xl border flex items-center justify-between text-xs shadow-sm ${
              isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-blue-600 shrink-0" />
              <span>
                Temps d'attente estimé moyen : <strong className={isLight ? 'text-slate-900' : 'text-white'}>10 à 15 minutes</strong> selon le type d'examen scanner/IRM.
              </span>
            </div>
            {wakeLockActive && (
              <Badge variant="outline" className={`${isLight ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-700 text-slate-300'} text-xs font-semibold`}>
                🖥️ Anti-Veille Écran TV Actif
              </Badge>
            )}
          </div>
        </section>

        {/* Right Column: PATIENTS SUIVANTS EN ATTENTE (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Megaphone className="size-6 text-amber-500" />
              <h2 className={`text-2xl font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Prochains Patients
              </h2>
            </div>
            <Badge className={`${isLight ? 'bg-amber-100 text-amber-900' : 'bg-slate-800 text-amber-300'} px-3 py-1 font-bold text-xs`}>
              {waitingItems.length} en attente
            </Badge>
          </div>

          <div
            className={`rounded-3xl border p-6 flex flex-col gap-4 shadow-xl min-h-[480px] ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            {waitingItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <CheckCircle2 className={`size-14 mb-3 ${isLight ? 'text-slate-300' : 'text-slate-700'}`} />
                <p className={`text-lg font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  File d'attente traitée
                </p>
                <p className={`text-xs mt-1 max-w-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Les nouveaux arrivants enregistrés à l'accueil s'afficheront automatiquement ici.
                </p>
              </div>
            ) : (
              waitingItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    item.priority === 'urgent'
                      ? isLight
                        ? 'bg-red-50 border-red-200'
                        : 'bg-red-950/40 border-red-500/40'
                      : isLight
                        ? 'bg-slate-50 border-slate-200 hover:border-blue-300'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`size-9 rounded-full font-mono text-sm font-black flex items-center justify-center shrink-0 ${
                        isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xl text-blue-600">
                          {item.ticket_number}
                        </span>
                        <span className={`font-bold text-lg ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          {getDisplayName(item)}
                        </span>
                        {item.priority === 'urgent' && (
                          <Badge className="bg-red-600 text-white text-[10px] px-2 font-bold">
                            Urgence
                          </Badge>
                        )}
                      </div>
                      <span className={`text-xs block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {item.modality_name}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-xs px-3 py-1 font-bold ${
                      isLight ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-slate-700 text-slate-300'
                    }`}
                  >
                    {item.room_name}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Dramatic Callout Popup Banner (Displays when secretary calls a patient) */}
      {activeCalledItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="max-w-3xl w-full rounded-3xl bg-slate-900 border-4 border-blue-500 shadow-2xl p-10 text-center flex flex-col items-center gap-6 relative overflow-hidden ring-8 ring-blue-500/30 text-white">
            {/* Pulsating background glow */}
            <div className="absolute size-96 bg-blue-600/30 rounded-full blur-3xl -z-10 animate-pulse" />

            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-600 text-white font-black text-base tracking-wider uppercase shadow-lg animate-bounce">
              <Megaphone className="size-6" />
              PATIENT APPELÉ — VEUILLEZ VOUS PRÉSENTER
            </div>

            <div className="space-y-1">
              <div className="text-sm font-mono uppercase font-bold text-cyan-300 tracking-widest">
                NUMÉRO DE TICKET
              </div>
              <div className="text-7xl font-black font-mono tracking-widest text-white drop-shadow-lg">
                {activeCalledItem.ticket_number}
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-4xl font-black text-white">
                {getDisplayName(activeCalledItem)}
              </h2>
              <p className="text-2xl text-cyan-200 font-semibold">
                {activeCalledItem.modality_name}
              </p>
            </div>

            <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white p-6 rounded-2xl shadow-xl mt-2">
              <span className="text-xs uppercase font-extrabold text-emerald-100 tracking-wider block">
                SALLE D'IMAGERIE D'ACCUEIL :
              </span>
              <span className="text-5xl font-black tracking-wide block mt-1">
                {activeCalledItem.room_name}
              </span>
              <span className="text-base text-emerald-100 block mt-2 font-medium">
                Médecin : {activeCalledItem.doctor_name || 'Prof. Marc Laurent'}
              </span>
            </div>

            <Button
              onClick={dismissCallout}
              variant="outline"
              size="lg"
              className="mt-4 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white font-bold"
            >
              Fermer la notification
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
