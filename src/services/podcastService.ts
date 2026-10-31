import { AcademicDocument, ChapterPodcast, PodcastDialogueTurn, SourceCitation } from '../types';

export class PodcastService {
  /**
   * Generates a 2-speaker conversational podcast episode for a given chapter/document
   */
  public static generateChapterPodcast(document: AcademicDocument, chapterOrTopicId?: string): ChapterPodcast {
    const sections = document.sections || [];
    let sec = sections[0];
    if (chapterOrTopicId && chapterOrTopicId !== 'overall') {
      sec = sections.find(s => s.id === chapterOrTopicId || s.title.toLowerCase().includes(chapterOrTopicId.toLowerCase())) || sec;
    }

    const title = sec?.title || document.title;
    const pageNum = sec?.pageNumber || 1;
    const equations = sec?.equations || sections.flatMap(s => s.equations || []);
    const primaryEq = equations[0];

    const citation: SourceCitation = {
      id: `pod-cite-${Date.now()}`,
      documentId: document.id,
      pageNumber: pageNum,
      sectionTitle: title,
      exactQuote: sec?.content?.slice(0, 140) || document.summary.slice(0, 140),
      contextSnippet: sec?.content?.slice(0, 200) || document.summary
    };

    const hostName = 'Dr. Maya';
    const cohostName = 'Leo';

    const turns: PodcastDialogueTurn[] = [
      {
        id: 'turn-1',
        speaker: 'host',
        speakerName: hostName,
        avatar: '👩‍🏫',
        emotion: 'insightful',
        timestampSec: 0,
        text: `Welcome back to LEARNOVA Study Cast! Today we are exploring an essential topic from your notes: "${title}". Leo, when you first looked through Page ${pageNum}, what stood out to you?`,
        citation
      },
      {
        id: 'turn-2',
        speaker: 'cohost',
        speakerName: cohostName,
        avatar: '🧑‍🎓',
        emotion: 'curious',
        timestampSec: 14,
        text: `Honestly, Dr. Maya, at first glance it felt pretty intense! But as I read through, it seems the big puzzle is how the system keeps everything organized under strict constraints without breaking down.`,
        citation
      },
      {
        id: 'turn-3',
        speaker: 'host',
        speakerName: hostName,
        avatar: '👩‍🏫',
        emotion: 'insightful',
        timestampSec: 28,
        text: `Exactly right. The core breakthrough here is what we call the fundamental invariant. The original text on Page ${pageNum} specifies that boundary conditions are never left to chance. Every parameter is checked before any state change is allowed.`,
        citation
      },
      {
        id: 'turn-4',
        speaker: 'cohost',
        speakerName: cohostName,
        avatar: '🧑‍🎓',
        emotion: 'emphatic',
        timestampSec: 45,
        text: `So it is kind of like an air traffic control radar? If a plane is approaching without confirmed runway clearance, it can't just land—it enters a strictly monitored holding pattern!`,
        citation
      },
      {
        id: 'turn-5',
        speaker: 'host',
        speakerName: hostName,
        avatar: '👩‍🏫',
        emotion: 'humorous',
        timestampSec: 60,
        text: `That is actually a fantastic analogy! Just as air traffic controllers enforce minimum safe distances, ${title} enforces mathematical equilibrium. ${primaryEq ? `Notice the formula: ${primaryEq.latex}. That formula is precisely what computes the safe operating threshold.` : `It guarantees that no operation encounters an undefined state.`}`,
        citation
      },
      {
        id: 'turn-6',
        speaker: 'cohost',
        speakerName: cohostName,
        avatar: '🧑‍🎓',
        emotion: 'curious',
        timestampSec: 80,
        text: `And for students taking an exam on this, what is the single biggest trap or misconception that people run into?`,
        citation
      },
      {
        id: 'turn-7',
        speaker: 'host',
        speakerName: hostName,
        avatar: '👩‍🏫',
        emotion: 'insightful',
        timestampSec: 95,
        text: `Students often jump straight to calculating answers without checking the preconditions first. Always verify that your input variables fall within the allowable range on Page ${pageNum}. Once you verify the bounds, the rest of the problem solves itself cleanly.`,
        citation
      },
      {
        id: 'turn-8',
        speaker: 'cohost',
        speakerName: cohostName,
        avatar: '🧑‍🎓',
        emotion: 'emphatic',
        timestampSec: 115,
        text: `Check the preconditions first! Got it. That makes revision so much clearer. Thanks Dr. Maya!`,
        citation
      }
    ];

    const totalDurationSec = turns[turns.length - 1].timestampSec + 15;

    return {
      id: `podcast-${document.id}-${Date.now()}`,
      documentId: document.id,
      chapterTitle: title,
      durationEstimateSec: totalDurationSec,
      dialogueTurns: turns,
      keyTopicsDiscussed: [
        `Core theoretical foundations of ${title}`,
        `Analogy to air traffic control and boundary invariance`,
        `Common student traps and exam revision checkpoints`
      ],
      takeaways: [
        `Always verify preconditions before calculating solutions`,
        `Boundary conditions guarantee mathematical equilibrium`,
        `Sourced directly from Page ${pageNum} of lecture notes`
      ]
    };
  }

  /**
   * Helper to speak a dialogue turn using Web Speech API with dual-voice differentiation
   */
  public static playDialogueTurn(turn: PodcastDialogueTurn, onEnd?: () => void): SpeechSynthesisUtterance | null {
    if (!('speechSynthesis' in window)) return null;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(turn.text);

    // Pick voices or tweak pitch/rate to distinguish Host (Maya) and Co-host (Leo)
    const voices = window.speechSynthesis.getVoices();
    if (turn.speaker === 'host') {
      // Female, slightly lower/authoritative pitch
      const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha'));
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.pitch = 1.05;
      utterance.rate = 1.0;
    } else {
      // Male / energetic pitch
      const maleVoice = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('alex'));
      if (maleVoice) utterance.voice = maleVoice;
      utterance.pitch = 0.95;
      utterance.rate = 1.05;
    }

    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utterance);
    return utterance;
  }
}
