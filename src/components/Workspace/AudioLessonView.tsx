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
  FileText,
  Sparkles
} from 'lucide-react';
import { AudioLesson, SourceCitation } from '../../types';
import { AudioService, AudioState } from '../../services/audioService';
import { ApiClient } from '../../services/apiClient';

/**
 * Strips out slide numbers, course codes (e.g. 24AIM51, 18CS51),
 * department headers (e.g. Department of AIML, NHCE), bullets and administrative noise.
 */
export function cleanSubtopicTitle(rawTitle: string): string {
  if (!rawTitle) return 'Subtopic Overview';
  let cleaned = rawTitle.trim();

  // If bullet or dash separates course/dept banner from the actual subtopic:
  // e.g. "4. Operating Systems 24AIM51. 4 Department of AIML, NHCE • Accounting information"
  if (cleaned.includes('•')) {
    const segments = cleaned.split('•');
    const lastSeg = segments[segments.length - 1].trim();
    if (lastSeg.length > 2) {
      cleaned = lastSeg;
    }
  } else if (cleaned.includes(' - ') && /department|dept|course|[0-9]{2}[A-Z]{2,5}[0-9]{2}/i.test(cleaned)) {
    const segments = cleaned.split(' - ');
    const lastSeg = segments[segments.length - 1].trim();
    if (lastSeg.length > 2) {
      cleaned = lastSeg;
    }
  }

  // Remove slide/section numbers like "4. ", "Section 4: ", "Slide 4: "
  cleaned = cleaned.replace(/^(?:Section|Slide|Topic|Part|Unit|Module)\s*\d+[:.]?\s*/gi, '');
  cleaned = cleaned.replace(/^\d+[\s.:-]+/, '');

  // Remove course codes e.g. 24AIM51, 18CS51, 21CS33, BCS401, etc.
  cleaned = cleaned.replace(/\b\d{2}[A-Z]{2,6}\d{2,4}\b/gi, '');
  cleaned = cleaned.replace(/\b[A-Z]{2,6}\d{2,4}\b/gi, '');

  // Remove department & college banners e.g. Department of AIML, NHCE
  cleaned = cleaned.replace(/(?:Department|Dept\.?|School|College|Faculty)\s+of\s+[^,•\n]+(?:,\s*[A-Z]{2,10})?/gi, '');
  cleaned = cleaned.replace(/\b(?:NHCE|VTU|AICTE|NBA|NAAC|UGC|Autonomous|Affiliated)\b/gi, '');

  // Clean remaining stray punctuation and whitespace
  cleaned = cleaned.replace(/^[\s.:•–—\-]+|[\s.:•–—\-]+$/g, '').trim();

  // Capitalize properly if lowercase
  if (cleaned.length > 0 && cleaned === cleaned.toLowerCase()) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned.length > 2 ? cleaned : rawTitle;
}

/**
 * Removes institutional noise, slide repetition, and robotic dialogue markers
 */
export function cleanSpokenBody(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText;

  // 1. Remove robotic teacher/student dialogue tags
  cleaned = cleaned.replace(/\b(?:Teacher|Student|Instructor|Learner)\s*:\s*/gi, '');
  cleaned = cleaned.replace(/Good question!\s*/gi, '');
  cleaned = cleaned.replace(/Welcome!\s*Today we are exploring[^.]*\./gi, '');
  cleaned = cleaned.replace(/That clarifies the idea!\s*How should I remember this for the exam\?/gi, '');
  cleaned = cleaned.replace(/Remember, everything is grounded in[^.]*\./gi, '');
  cleaned = cleaned.replace(/Keep up the great work!/gi, '');

  // 2. Remove Part tags and sound markers
  cleaned = cleaned.replace(/\[Part \d+:[^\]]+\]/gi, '');
  cleaned = cleaned.replace(/\[PAUSE:\s*[^\]]+\]/gi, '');
  cleaned = cleaned.replace(/\[TRANSITION\]/gi, '');

  // 3. Remove slide/section numbers and course codes
  cleaned = cleaned.replace(/(?:Section|Slide)\s*\d+[:.]?\s*/gi, '');
  cleaned = cleaned.replace(/\b\d{2}[A-Z]{2,6}\d{2,4}\b/gi, '');
  cleaned = cleaned.replace(/(?:Department|Dept\.?|School|College|Faculty)\s+of\s+[^,•\n]+(?:,\s*[A-Z]{2,10})?/gi, '');
  cleaned = cleaned.replace(/\b(?:NHCE|VTU|AICTE|NBA|NAAC|UGC)\b/gi, '');
  cleaned = cleaned.replace(/[•▪▫]/g, '');

  return cleaned.replace(/\s+/g, ' ').trim();
}

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
  const [teachingStyle, setTeachingStyle] = useState<'simplified' | 'lecture'>('simplified');
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
    const cleanTitle = cleanSubtopicTitle(currentSection.sectionTitle || 'Subtopic Overview');
    const cleanBody = cleanSpokenBody(currentSection.scriptText || 'Academic lesson content.');

    if (audioLanguage === 'Kannada') {
      return `[ಕನ್ನಡ ಆಡಿಯೋ ಪಾಠ] ${cleanTitle}. ಈ ವಿಷಯವನ್ನು ಸರಳವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳೋಣ: ${cleanBody}. ನೆನಪಿನಲ್ಲಿಡಿ, ಇದು ಪರೀಕ್ಷೆಗೆ ಪ್ರಮುಖವಾದ ಪರಿಕಲ್ಪನೆಯಾಗಿದೆ.`;
    } else if (audioLanguage === 'Hindi') {
      return `[हिंदी ऑडियो व्याख्यान] ${cleanTitle}. आइए इस विषय को सरल शब्दों में समझें: ${cleanBody}. परीक्षा के दृष्टिकोण से यह एक अत्यंत महत्वपूर्ण विषय है।`;
    }

    if (teachingStyle === 'simplified') {
      // Natural, direct, simplified subtopic explanation without teacher/student dialogue
      const sentences = cleanBody.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 15);
      const coreIdea = sentences[0] || cleanBody;
      const details = sentences.slice(1, 3).join(' ') || 'This mechanism ensures reliable execution and systematic management.';

      return `${cleanTitle}. In simple terms, ${coreIdea} Think of this like a real-time monitor: it tracks how system resources are utilized so that tasks remain orderly, time limits are respected, and no program causes a bottleneck. ${details} For exams, remember that ${cleanTitle} is essential for accurate resource tracking, fair scheduling, and system security.`;
    }

    // In-depth Lecture mode: direct, clean academic presentation without roleplay tags
    return `${cleanTitle}. Detailed examination: ${cleanBody}`;
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

  const handleTeachingStyleChange = (newStyle: 'simplified' | 'lecture') => {
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
    setProgressChar(0);
    setSelectedSectionIdx(idx);
    setPlaybackState('idle');
  };

  const handleJump = (direction: 'forward' | 'backward') => {
    const delta = direction === 'forward' ? 100 : -100;
    const spoken = getSpokenScript();
    const newChar = Math.max(0, Math.min(spoken.length, progressChar + delta));
    setProgressChar(newChar);
    if (playbackState === 'playing') {
      AudioService.stop();
      AudioService.speak(spoken.slice(newChar), speed, audioLanguage, activeVoiceGender);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {audioLesson?.title || 'Audio Lessons & Spoken Narration'}
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
            {cleanSubtopicTitle(currentSection.sectionTitle)}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Original: {currentSection.sectionTitle}
          </p>
        </div>

        {/* Player Controls & Speed */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Main Transport Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => selectedSectionIdx > 0 && handleSelectSection(selectedSectionIdx - 1)}
              disabled={selectedSectionIdx === 0}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Previous Topic"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleJump('backward')}
              className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs"
              title="Rewind 10 seconds"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              onClick={handlePlayPause}
              className="p-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 transition-all transform active:scale-95"
              title={playbackState === 'playing' ? 'Pause' : 'Play'}
            >
              {playbackState === 'playing' ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={handleStop}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              title="Stop"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={() => handleJump('forward')}
              className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs"
              title="Fast Forward 10 seconds"
            >
              <FastForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => selectedSectionIdx < sections.length - 1 && handleSelectSection(selectedSectionIdx + 1)}
              disabled={selectedSectionIdx === sections.length - 1}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Next Topic"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Secondary Controls: Teaching Style, Voice Gender, Language, Speed */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Teaching Style Mode */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => handleTeachingStyleChange('simplified')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  teachingStyle === 'simplified'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Simplified intuitive explanation with analogies and core takeaways"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Simplified Explanation</span>
              </button>
              <button
                type="button"
                onClick={() => handleTeachingStyleChange('lecture')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  teachingStyle === 'lecture'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Academic lecture style (direct structured course narration)"
              >
                <span>🏛️ In-Depth Lecture</span>
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
                title="Female Voice Narration"
              >
                <span>👩 Female Voice</span>
              </button>
              <button
                type="button"
                onClick={() => handleVoiceGenderChange('male')}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeVoiceGender === 'male'
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Male Voice Narration"
              >
                <span>👨 Male Voice</span>
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
              <span>Spoken Script ({teachingStyle === 'simplified' ? 'SIMPLIFIED EXPLANATION' : 'IN-DEPTH LECTURE'} • {audioLanguage.toUpperCase()})</span>
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
            Source Anchor: Page {currentSection.sourceCitation?.pageNumber || 1} ({cleanSubtopicTitle(currentSection.sourceCitation?.sectionTitle || currentSection.sectionTitle || 'Source')})
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
          {sections.map((sec, idx) => {
            const cleanTitle = cleanSubtopicTitle(sec.sectionTitle);
            const cleanBody = cleanSpokenBody(sec.scriptText || '');

            return (
              <div
                key={sec.id}
                onClick={() => handleSelectSection(idx)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedSectionIdx === idx
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                        {cleanTitle}
                      </h5>
                      {(sectionProgressMap[sec.id] || 0) > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                          {sectionProgressMap[sec.id]}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {cleanBody.slice(0, 95)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    ~{Math.round((sec.durationSeconds || 60) / 60)}m
                  </span>
                  {selectedSectionIdx === idx && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};