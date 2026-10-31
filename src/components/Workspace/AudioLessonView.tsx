import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  FastForward,
  Rewind,
  SkipForward,
  SkipBack,
  Clock,
  Headphones,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  Download,
  FileText
} from 'lucide-react';
import { AudioLesson, SourceCitation } from '../../types';
import { AudioService, AudioState } from '../../services/audioService';
import { ApiClient } from '../../services/apiClient';

interface AudioLessonViewProps {
  audioLesson: AudioLesson;
  documentId?: string;
  initialTopicId?: string;
  onNavigateToCitation: (citation: SourceCitation) => void;
  voiceGender?: 'female' | 'male';
  onVoiceGenderChange?: (gender: 'female' | 'male') => void;
}

export const AudioLessonView: React.FC<AudioLessonViewProps> = ({
  audioLesson,
  documentId,
  initialTopicId,
  onNavigateToCitation,
  voiceGender,
  onVoiceGenderChange
}) => {
  const sections = Array.isArray(audioLesson?.sections) ? audioLesson.sections : [];
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);

  useEffect(() => {
    if (initialTopicId && sections.length > 0) {
      const idx = sections.findIndex(s =>
        s.id === initialTopicId ||
        s.sectionTitle.toLowerCase().includes(initialTopicId.toLowerCase())
      );
      if (idx !== -1) {
        setSelectedSectionIdx(idx);
      }
    }
  }, [initialTopicId, sections]);
  const [playbackState, setPlaybackState] = useState<AudioState>('idle');
  const [speed, setSpeed] = useState<number>(1.0);
  const [progressChar, setProgressChar] = useState<number>(0);
  const [activeVoiceGender, setActiveVoiceGender] = useState<'female' | 'male'>(
    voiceGender || AudioService.getGender() || 'female'
  );

  useEffect(() => {
    if (voiceGender && voiceGender !== activeVoiceGender) {
      setActiveVoiceGender(voiceGender);
      AudioService.setGender(voiceGender);
    }
  }, [voiceGender]);

  const currentSection = sections[selectedSectionIdx] || sections[0] || {
    id: 'sec-default',
    sectionTitle: audioLesson?.title || 'Audio Lecture',
    durationSeconds: 120,
    scriptText: 'Welcome to this audio lesson on verified academic foundations.',
    sourceCitation: {
      id: 'cite-default',
      documentId: 'general',
      pageNumber: 1,
      sectionTitle: 'Overview',
      exactQuote: 'Verified academic foundations.',
      contextSnippet: 'Verified academic foundations.'
    }
  };

  useEffect(() => {
    const unsubscribe = AudioService.subscribe({
      onStateChange: (state) => setPlaybackState(state),
      onProgress: (charIndex) => setProgressChar(charIndex),
      onEnd: () => {
        setPlaybackState('idle');
        // Auto play next section if available
        if (selectedSectionIdx < sections.length - 1) {
          setSelectedSectionIdx(idx => idx + 1);
        }
      }
    });

    return () => {
      unsubscribe();
      AudioService.stop();
    };
  }, [selectedSectionIdx, sections.length]);

  const handlePlayPause = () => {
    if (playbackState === 'playing') {
      AudioService.pause();
    } else if (playbackState === 'paused') {
      AudioService.resume();
    } else {
      const detectedLang = /[\u0C80-\u0CFF]/.test(currentSection.scriptText)
        ? 'Kannada'
        : /[\u0900-\u097F]/.test(currentSection.scriptText)
        ? 'Hindi'
        : 'English';
      AudioService.speak(currentSection.scriptText, speed, detectedLang, activeVoiceGender);
    }
  };

  const handleVoiceGenderChange = (newGender: 'female' | 'male') => {
    setActiveVoiceGender(newGender);
    AudioService.setGender(newGender);
    onVoiceGenderChange?.(newGender);

    if (playbackState === 'playing') {
      const detectedLang = /[\u0C80-\u0CFF]/.test(currentSection.scriptText)
        ? 'Kannada'
        : /[\u0900-\u097F]/.test(currentSection.scriptText)
        ? 'Hindi'
        : 'English';
      AudioService.stop();
      AudioService.speak(currentSection.scriptText, speed, detectedLang, newGender);
    }
  };

  const handleStop = () => {
    AudioService.stop();
    setProgressChar(0);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    AudioService.setRate(newSpeed);
  };

  const handleSelectSection = (idx: number) => {
    AudioService.stop();
    setSelectedSectionIdx(idx);
    setProgressChar(0);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-6 space-y-6 overflow-y-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {audioLesson.title}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ~{Math.round(audioLesson.totalDurationSeconds / 60)} min narration
              </span>
              <span>•</span>
              <span>{audioLesson.sections.length} Academic Sections</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {documentId && (
            <>
              <a
                href={ApiClient.getExportUrl(documentId, 'wav', 'audio')}
                download
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Download 16-bit 44.1kHz PCM Audio (.wav)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>Download Audio (.wav)</span>
              </a>
              <a
                href={ApiClient.getExportUrl(documentId, 'audio_script', 'audio')}
                download
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Download Narration Script (.txt)"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Script (.txt)</span>
              </a>
            </>
          )}

          <span className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Verified Script
          </span>
        </div>
      </div>

      {/* Main Player Box */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl space-y-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            Section {selectedSectionIdx + 1} of {audioLesson.sections.length}
          </span>
          <h3 className="text-xl font-bold mt-1 text-slate-100">
            {currentSection.sectionTitle}
          </h3>
        </div>

        {/* Player Controls & Speed */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Main Transport Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => selectedSectionIdx > 0 && handleSelectSection(selectedSectionIdx - 1)}
              disabled={selectedSectionIdx === 0}
              className="p-2 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 transition-colors"
              title="Previous section"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlayPause}
              className="w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all transform hover:scale-105 active:scale-95"
              title={playbackState === 'playing' ? 'Pause narration' : 'Play narration'}
            >
              {playbackState === 'playing' ? (
                <Pause className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-white ml-0.5" />
              )}
            </button>

            <button
              onClick={handleStop}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Stop audio"
            >
              <Square className="w-5 h-5" />
            </button>

            <button
              onClick={() => selectedSectionIdx < sections.length - 1 && handleSelectSection(selectedSectionIdx + 1)}
              disabled={selectedSectionIdx === sections.length - 1}
              className="p-2 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 transition-colors"
              title="Next section"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Speed & Voice Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Gender-Adaptive Voice Toggle */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => handleVoiceGenderChange('female')}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeVoiceGender === 'female'
                    ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Girl / Female Teacher Voice Narration"
              >
                <span>👩 Girl's Voice</span>
              </button>
              <button
                type="button"
                onClick={() => handleVoiceGenderChange('male')}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeVoiceGender === 'male'
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Guy / Male Teacher Voice Narration"
              >
                <span>👨 Guy's Voice</span>
              </button>
            </div>

            {/* Speed Selection */}
            <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl text-xs">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    speed === s
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time reading transcript */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs sm:text-sm font-sans leading-relaxed text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Spoken Academic Script (Web Speech Synthesis)</span>
          </div>
          <p>
            <span className="text-emerald-300 font-medium">
              {currentSection.scriptText.slice(0, progressChar)}
            </span>
            <span className="text-slate-300">
              {currentSection.scriptText.slice(progressChar)}
            </span>
          </p>
        </div>

        {/* Section Citation Link */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
          <span className="text-slate-400">
            Source Anchor: Page {currentSection.sourceCitation.pageNumber} ({currentSection.sourceCitation.sectionTitle})
          </span>

          <button
            onClick={() => onNavigateToCitation(currentSection.sourceCitation)}
            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            <span>Jump to Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Playlist / Section Selector */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Audio Syllabus & Section Navigation
        </h4>

        <div className="space-y-2">
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              onClick={() => handleSelectSection(idx)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedSectionIdx === idx
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  selectedSectionIdx === idx
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {idx + 1}
                </span>

                <div>
                  <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {sec.sectionTitle}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {sec.scriptText.slice(0, 90)}...
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span>{sec.durationSeconds}s</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToCitation(sec.sourceCitation);
                  }}
                  className="p-1 hover:text-brand-600 dark:hover:text-brand-400"
                  title="Source passage"
                >
                  <Bookmark className="w-4 h-4 text-amber-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
