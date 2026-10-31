import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Volume2,
  Radio,
  Clock,
  BookOpen,
  Share2,
  CheckCircle2,
  FastForward,
  Rewind
} from 'lucide-react';
import { AcademicDocument, ChapterPodcast, PodcastDialogueTurn, SourceCitation } from '../../types';
import { PodcastService } from '../../services/podcastService';

interface StudyPodcastViewProps {
  document: AcademicDocument;
  initialTopicId?: string;
  onNavigateToCitation: (citation: SourceCitation) => void;
}

export const StudyPodcastView: React.FC<StudyPodcastViewProps> = ({
  document,
  initialTopicId,
  onNavigateToCitation
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || 'overall');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTurnIdx, setCurrentTurnIdx] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const podcast: ChapterPodcast = useMemo(() => {
    return PodcastService.generateChapterPodcast(document, selectedTopicId);
  }, [document, selectedTopicId]);

  const activeTurn = podcast.dialogueTurns[currentTurnIdx] || podcast.dialogueTurns[0];

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playTurn = (index: number) => {
    if (index >= podcast.dialogueTurns.length) {
      setIsPlaying(false);
      setCurrentTurnIdx(0);
      return;
    }

    setCurrentTurnIdx(index);
    const turn = podcast.dialogueTurns[index];

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(turn.text);
      const voices = window.speechSynthesis.getVoices();

      if (turn.speaker === 'host') {
        const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha'));
        if (femaleVoice) utt.voice = femaleVoice;
        utt.pitch = 1.05;
        utt.rate = playbackSpeed;
      } else {
        const maleVoice = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('alex'));
        if (maleVoice) utt.voice = maleVoice;
        utt.pitch = 0.95;
        utt.rate = playbackSpeed * 1.05;
      }

      utt.onend = () => {
        if (isPlaying) {
          playTurn(index + 1);
        }
      };

      utt.onerror = () => {
        setIsPlaying(false);
      };

      currentUtteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playTurn(currentTurnIdx);
    }
  };

  const handleNextTurn = () => {
    const nextIdx = Math.min(podcast.dialogueTurns.length - 1, currentTurnIdx + 1);
    setCurrentTurnIdx(nextIdx);
    if (isPlaying) playTurn(nextIdx);
  };

  const handlePrevTurn = () => {
    const prevIdx = Math.max(0, currentTurnIdx - 1);
    setCurrentTurnIdx(prevIdx);
    if (isPlaying) playTurn(prevIdx);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 p-6 space-y-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <h2 className="text-xl font-black text-white">
              AI Study Podcast
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
              Two-Speaker Conversational Lesson
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Turn your study material into an engaging podcast between Dr. Maya (Professor) and Leo (Inquisitive Student), grounded in verified lecture notes.
          </p>
        </div>

        {activeTurn.citation && (
          <button
            type="button"
            onClick={() => onNavigateToCitation(activeTurn.citation!)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30 transition-all cursor-pointer self-start lg:self-auto"
            title="Inspect source page"
          >
            <span>Jump to Page {activeTurn.citation.pageNumber}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Podcast Player Hero Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-900/60 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5" />
              <span>Episode Topic:</span>
            </span>
            <h3 className="text-lg font-black text-white">
              {podcast.chapterTitle}
            </h3>
            <p className="text-xs text-slate-400">
              Hosted by Dr. Maya & Leo • ~{Math.ceil(podcast.durationEstimateSec / 60)} mins • {podcast.dialogueTurns.length} dialogue turns
            </p>
          </div>

          {/* Dual Speaker Indicator Avatars */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl border transition-all ${
              activeTurn.speaker === 'host'
                ? 'bg-purple-900/40 border-purple-500 shadow-md shadow-purple-500/20 scale-105'
                : 'bg-slate-900 border-slate-800 opacity-60'
            }`}>
              <div className="text-2xl text-center">👩‍🏫</div>
              <span className="text-[10px] font-bold text-purple-300 block text-center mt-0.5">Dr. Maya</span>
            </div>

            <div className={`p-2 rounded-2xl border transition-all ${
              activeTurn.speaker === 'cohost'
                ? 'bg-emerald-900/40 border-emerald-500 shadow-md shadow-emerald-500/20 scale-105'
                : 'bg-slate-900 border-slate-800 opacity-60'
            }`}>
              <div className="text-2xl text-center">🧑‍🎓</div>
              <span className="text-[10px] font-bold text-emerald-300 block text-center mt-0.5">Leo</span>
            </div>
          </div>
        </div>

        {/* Dynamic Wave Visualizer */}
        <div className="flex items-center justify-center gap-1 h-8 py-1">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full bg-emerald-500 transition-all duration-150 ${
                isPlaying ? 'animate-pulse' : 'opacity-30'
              }`}
              style={{
                height: isPlaying ? `${Math.max(15, (Math.sin(i * 0.8) + 1.2) * 14)}px` : '6px',
                animationDelay: `${(i % 5) * 120}ms`
              }}
            />
          ))}
        </div>

        {/* Audio Player Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevTurn}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Previous Dialogue Turn"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlayPause}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlaying ? 'Pause Podcast' : 'Play Episode'}</span>
            </button>

            <button
              onClick={handleNextTurn}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Next Dialogue Turn"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {[1.0, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Synchronized Interactive Transcript */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Episode Transcript ({podcast.dialogueTurns.length} turns):</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Click any dialogue card to jump audio to that point
          </span>
        </div>

        <div className="space-y-3">
          {podcast.dialogueTurns.map((turn, tIdx) => {
            const isActive = currentTurnIdx === tIdx;
            const isHost = turn.speaker === 'host';

            return (
              <div
                key={turn.id}
                onClick={() => {
                  setCurrentTurnIdx(tIdx);
                  if (isPlaying) playTurn(tIdx);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? isHost
                      ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/30'
                      : 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{turn.avatar}</span>
                    <div>
                      <span className={`text-xs font-bold ${isHost ? 'text-purple-300' : 'text-emerald-300'}`}>
                        {turn.speakerName}
                      </span>
                      {turn.emotion && (
                        <span className="text-[10px] text-slate-500 ml-1.5 capitalize">
                          ({turn.emotion})
                        </span>
                      )}
                    </div>
                  </div>

                  {turn.citation && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToCitation(turn.citation!);
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <span>p. {turn.citation.pageNumber}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-200 mt-2 pl-7 leading-relaxed">
                  {turn.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
