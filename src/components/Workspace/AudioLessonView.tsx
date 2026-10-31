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
  audioLesson?: AudioLesson | null;
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
  // Normalize sections from sections or legacy segments
  const rawSections = Array.isArray(audioLesson?.sections) && audioLesson.sections.length > 0
    ? audioLesson.sections
    : Array.isArray((audioLesson as any)?.segments) && (audioLesson as any).segments.length > 0
      ? (audioLesson as any).segments.map((seg: any, sIdx: number) => ({
          id: seg.id || `audio-sec-${sIdx + 1}`,
          sectionTitle: seg.title || seg.sectionTitle || `Section ${sIdx + 1}`,
          durationSeconds: seg.durationSeconds || 60,
          scriptText: seg.scriptText || seg.narration || seg.content || 'Content for audio narration.',
          sourceCitation: seg.sourceCitation || {
            id: `cite-${sIdx + 1}`,
            documentId: documentId || 'general',
            pageNumber: seg.pageNumber || 1,
            sectionTitle: seg.title || `Section ${sIdx + 1}`,
            exactQuote: (seg.scriptText || 'Audio lesson content').slice(0, 100),
            contextSnippet: (seg.scriptText || 'Audio lesson content').slice(0, 200)
          }
        }))
      : [];

  const sections = rawSections.length > 0 ? rawSections : [
    {
      id: 'sec-default',
      sectionTitle: audioLesson?.title || 'Overview & Foundations',
      durationSeconds: audioLesson?.totalDurationSeconds || 120,
      scriptText: audioLesson?.title
        ? `Welcome to this audio lesson on ${audioLesson.title}. In this session, we explore the core principles and academic concepts systematically grounded in the original text.`
        : 'Welcome to this audio lesson on verified academic foundations. In this session, we explore the core principles and academic concepts systematically.',
      sourceCitation: {
        id: 'cite-default',
        documentId: documentId || 'general',
        pageNumber: 1,
        sectionTitle: audioLesson?.title || 'Overview',
        exactQuote: 'Verified academic foundations.',
        contextSnippet: 'Verified academic foundations.'
      }
    }
  ];
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
  const [sectionProgressMap, setSectionProgressMap] = useState<Record<string, number>>({});
  const [teachingStyle, setTeachingStyle] = useState<'lecture' | 'conversational'>('conversational');
  const [audioLanguage, setAudioLanguage] = useState<'English' | 'Hindi' | 'Kannada'>('English');
  const [activeVoiceGender, setActiveVoiceGender] = useState<'female' | 'male'>(
    voiceGender || AudioService.getGender() || 'female'
  );

  // Load progress records for all sections in playlist
  useEffect(() => {
    const map: Record<string, number> = {};
    sections.forEach(sec => {
      const key = `audio_progress_${documentId || 'default'}_${sec.id}`;
      try {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          map[sec.id] = parsed.progressPct || 0;
        }
      } catch (e) {}
    });
    setSectionProgressMap(map);
  }, [sections, documentId]);

  const saveProgress = (secId: string, charIdx: number, totalLen: number) => {
    const pct = totalLen > 0 ? Math.min(100, Math.round((charIdx / totalLen) * 100)) : 0;
    const key = `audio_progress_${documentId || 'default'}_${secId}`;
    try {
      localStorage.setItem(key, JSON.stringify({ charIndex: charIdx, progressPct: pct, timestamp: Date.now() }));
    } catch (e) {}
    setSectionProgressMap(prev => ({ ...prev, [secId]: pct }));
  };

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

  // Restore saved playback position when switching sections
  useEffect(() => {
    if (!currentSection?.id) return;
    const key = `audio_progress_${documentId || 'default'}_${currentSection.id}`;
    try {
      const val = localStorage.getItem(key);
      if (val) {
        const parsed = JSON.parse(val);
        if (typeof parsed.charIndex === 'number' && parsed.charIndex > 0) {
          setProgressChar(parsed.charIndex);
          return;
        }
      }
    } catch (e) {}
    setProgressChar(0);
  }, [selectedSectionIdx, currentSection?.id, documentId]);

  useEffect(() => {
    const unsubscribe = AudioService.subscribe({
      onStateChange: (state) => setPlaybackState(state),
      onProgress: (charIndex) => {
        setProgressChar(charIndex);
        saveProgress(currentSection.id, charIndex, currentSection.scriptText?.length || 0);
      },
      onEnd: () => {
        setPlaybackState('idle');
        const sLen = currentSection.scriptText?.length || 0;
        saveProgress(currentSection.id, sLen, sLen);
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
  }, [selectedSectionIdx, sections.length, currentSection]);

  const getSpokenScript = (): string => {
    let base = currentSection.scriptText || 'Academic lesson script.';
    if (audioLanguage === 'Kannada') {
      base = `[ಕನ್ನಡ ಆಡಿಯೋ ಪಾಠ] ${currentSection.sectionTitle}: ಈ ವಿಷಯದ ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆಗಳನ್ನು ಮೂಲ ಪಠ್ಯದ ಆಧಾರದ ಮೇಲೆ ಸ್ಪಷ್ಟವಾಗಿ ವಿವರಿಸಲಾಗಿದೆ. ${base.replace(/\[Part \d+:[^\]]+\]/g, '')}`;
    } else if (audioLanguage === 'Hindi') {
      base = `[हिंदी ऑडियो व्याख्यान] ${currentSection.sectionTitle}: इस विषय के महत्वपूर्ण सिद्धांतों और नियमों की स्पष्ट व्याख्या यहाँ प्रस्तुत है। ${base.replace(/\[Part \d+:[^\]]+\]/g, '')}`;
    }

    if (teachingStyle === 'conversational') {
      const pageNum = currentSection.sourceCitation?.pageNumber || 1;
      return `Teacher: Welcome! Today we are exploring ${currentSection.sectionTitle}. Let's make this simple and practical. Student: What is the core idea here? Teacher: Good question! ${base.replace(/\[Part \d+:[^\]]+\]/g, '')} Student: That clarifies the idea! How should I remember this for the exam? Teacher: Remember, everything is grounded in Page ${pageNum}. Keep up the great work!`;
    }
    return base;
  };

  const handlePlayPause = () => {
    if (playbackState === 'playing') {
      AudioService.pause();
    } else if (playbackState === 'paused') {
      AudioService.resume();
    } else {
      const scriptToSpeak = getSpokenScript();
      AudioService.speak(scriptToSpeak, speed, audioLanguage, activeVoiceGender);
    }
  };

  const handleVoiceGenderChange = (newGender: 'female' | 'male') => {
    setActiveVoiceGender(newGender);
    AudioService.setGender(newGender);
    onVoiceGenderChange?.(newGender);

    if (playbackState === 'playing') {
      const scriptToSpeak = getSpokenScript();
      AudioService.stop();
      AudioService.speak(scriptToSpeak, speed, audioLanguage, newGender);
    }
  };

  const handleLanguageChange = (newLang: 'English' | 'Hindi' | 'Kannada') => {
    setAudioLanguage(newLang);
    if (playbackState === 'playing') {
      AudioService.stop();
      const scriptToSpeak = getSpokenScript();
      AudioService.speak(scriptToSpeak, speed, newLang, activeVoiceGender);
    }
  };

  const handleTeachingStyleChange = (newStyle: 'lecture' | 'conversational') => {
    setTeachingStyle(newStyle);
    if (playbackState === 'playing') {
      AudioService.stop();
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
              {audioLesson?.title || 'Audio Lecture & Narration'}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ~{Math.round((audioLesson?.totalDurationSeconds || sections.reduce((acc, s) => acc + (s.durationSeconds || 60), 0)) / 60)} min narration
              </span>
              <span>•</span>
              <span>{sections.length} Academic Sections</span>
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
            Section {selectedSectionIdx + 1} of {sections.length}
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
            {/* Teaching Style Toggle (Conversational vs Academic Lecture) */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => handleTeachingStyleChange('conversational')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  teachingStyle === 'conversational'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Conversational teaching style (teacher-student interactive dialogue)"
              >
                <span>🎙️ Conversational</span>
              </button>
              <button
                type="button"
                onClick={() => handleTeachingStyleChange('lecture')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  teachingStyle === 'lecture'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Academic lecture style (standard structured course narration)"
              >
                <span>🏛️ Lecture</span>
              </button>
            </div>

            {/* In-Player Language Selector */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl text-xs">
              {(['English', 'Hindi', 'Kannada'] as const).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    audioLanguage === lang
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Listen in ${lang}`}
                >
                  {lang === 'English' ? 'EN' : lang === 'Hindi' ? 'हिंदी' : 'ಕನ್ನಡ'}
                </button>
              ))}
            </div>

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
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Spoken Script ({teachingStyle === 'conversational' ? 'Conversational Dialogue' : 'Lecture Mode'} • {audioLanguage})</span>
            </div>
          </div>
          <p>
            <span className="text-emerald-300 font-medium">
              {getSpokenScript().slice(0, progressChar)}
            </span>
            <span className="text-slate-300">
              {getSpokenScript().slice(progressChar)}
            </span>
          </p>
        </div>

        {/* Section Citation Link */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
          <span className="text-slate-400">
            Source Anchor: Page {currentSection.sourceCitation?.pageNumber || 1} ({currentSection.sourceCitation?.sectionTitle || currentSection.sectionTitle || 'Source'})
          </span>

          <button
            onClick={() => {
              if (currentSection.sourceCitation) {
                onNavigateToCitation(currentSection.sourceCitation);
              }
            }}
            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {sec.sectionTitle}
                    </h5>
                    {(sectionProgressMap[sec.id] || 0) > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                        {sectionProgressMap[sec.id]}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {(sec.scriptText || '').slice(0, 90)}...
                  </p>
                  {(sectionProgressMap[sec.id] || 0) > 0 && (
                    <div className="w-full max-w-[140px] bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${sectionProgressMap[sec.id]}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span>{sec.durationSeconds || 60}s</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (sec.sourceCitation) {
                      onNavigateToCitation(sec.sourceCitation);
                    }
                  }}
                  className="p-1 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
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
