import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, HelpCircle, CheckCircle2, BookOpen, ArrowRight, CornerDownLeft } from 'lucide-react';
import { AcademicDocument, SourceCitation } from '../../types';
import { AiTutorService } from '../../services/aiTutorService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: SourceCitation[];
}

interface CortexCompanionChatProps {
  document: AcademicDocument;
  onNavigateToCitation?: (citation: SourceCitation) => void;
  fullContextEnabled: boolean;
  onToggleFullContext: (enabled: boolean) => void;
}

export const CortexCompanionChat: React.FC<CortexCompanionChatProps> = ({
  document,
  onNavigateToCitation,
  fullContextEnabled,
  onToggleFullContext
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'user',
      content: 'Can you explain the pathophysiology of multiple sclerosis (MS)?',
      timestamp: 'Just now'
    },
    {
      id: 'msg-init-2',
      sender: 'assistant',
      content: `Multiple sclerosis (MS) is a chronic autoimmune disease characterized by the immune system attacking the central nervous system (CNS), which includes the brain and spinal cord. This attack primarily targets myelin, the protective sheath surrounding nerve fibers, leading to demyelination and subsequent neurological dysfunction.

Key Aspects of MS Pathophysiology:
1. Autoimmune Response: In MS, the immune system mistakenly identifies components of the CNS as foreign, initiating an inflammatory response. This involves the activation of T-cells and B-cells crossing the blood-brain barrier.
2. Demyelination: T-cells release pro-inflammatory cytokines that recruit macrophages. These attack myelin sheaths and destroy oligodendrocytes (the myelin-producing cells of the CNS).
3. Saltatory Conduction Failure: In healthy myelinated neurons, impulses jump rapidly between nodes of Ranvier. Loss of myelin dissipates electrical charges, causing conduction delays or complete conduction block.
4. Axonal Sclerosis: Chronic inflammation leads to irreversible axonal degeneration and glial scar formation (sclerotic plaques).
5. Clinical Symptoms: Visual disturbances (optic neuritis), muscle weakness, spasticity, ataxia, and neuropathic pain.`,
      timestamp: 'Just now',
      citations: [
        {
          id: 'cite-ms-patho',
          documentId: document.id,
          pageNumber: 2,
          sectionTitle: 'Elements of Neurophysiology & Pathophysiology of Multiple Sclerosis',
          exactQuote: 'Multiple sclerosis (MS) is a chronic autoimmune disease characterized by the immune system attacking the central nervous system (CNS)...',
          contextSnippet: 'Key Aspects of MS Pathophysiology: Autoimmune response, demyelination, and axonal degeneration.'
        }
      ]
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      // Use AiTutorService to generate strictly grounded, cited answer
      const tutorResult = AiTutorService.answerQuestion(document, query);
      let replyContent = tutorResult.answerMarkdown;
      if (tutorResult.keyTakeaways && tutorResult.keyTakeaways.length > 0) {
        replyContent += `\n\n**Key Takeaways:**\n` + tutorResult.keyTakeaways.map(t => `• ${t}`).join('\n');
      }

      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: tutorResult.citations
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 450);
  };

  const sampleQuestions = [
    'Explain this in simpler words.',
    'Why is this formula used?',
    'Give another example.',
    'Explain this diagram.',
    'Compare these two concepts.',
    'Summarize this topic for revision'
  ];

  return (
    <div className="h-full flex flex-col bg-[#0b1120] text-slate-100 font-sans select-text border-l border-slate-800">
      {/* Top Header Bar matching Learning Cortex Screenshot */}
      <div className="px-5 py-3.5 border-b border-slate-800/80 bg-[#090d16] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span className="text-xs font-bold text-slate-200">Full Context</span>
          <div
            className="flex items-center cursor-pointer"
            onClick={() => onToggleFullContext(!fullContextEnabled)}
            title="When active, the entire document, diagrams, and lecture notes are provided to the reasoning engine."
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <div className={`w-9 h-5 flex items-center rounded-full p-0.5 duration-300 cursor-pointer ${
              fullContextEnabled ? 'bg-blue-600' : 'bg-slate-700'
            }`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                fullContextEnabled ? 'translate-x-4' : ''
              }`} />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>LEARNOVA Cortex</span>
          </span>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1 ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Sender Name / Avatar Header */}
              <div className={`flex items-center space-x-1.5 text-xs text-slate-400 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isUser
                    ? 'bg-gradient-to-tr from-amber-500 to-pink-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}>
                  {isUser ? 'You' : 'Cortex'}
                </div>
                <span className="font-semibold text-slate-300">{isUser ? 'You' : 'Cortex'}</span>
                <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text ${
                  isUser
                    ? 'bg-slate-800/90 text-slate-100 rounded-tr-xs border border-slate-700'
                    : 'bg-[#131c31] text-slate-200 rounded-tl-xs border border-blue-950/70 shadow-lg'
                }`}
              >
                {msg.content}

                {/* Grounding Citation Footer if available */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Verified Source:
                    </span>
                    {msg.citations.map((cite, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => onNavigateToCitation && onNavigateToCitation(cite)}
                        className="px-2 py-0.5 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-800/60 text-[10px] font-bold text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
                        title={cite.exactQuote}
                      >
                        <BookOpen className="w-2.5 h-2.5" />
                        <span>Page {cite.pageNumber} • {cite.sectionTitle.slice(0, 24)}...</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs pl-2">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white animate-pulse">
              C
            </div>
            <span>Cortex is formulating grounded response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 border-t border-slate-800/60 bg-[#090d16]/70 flex items-center space-x-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold shrink-0">
          Suggestions:
        </span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800/80 hover:bg-blue-900/60 text-slate-300 hover:text-blue-200 border border-slate-700 hover:border-blue-700 whitespace-nowrap transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box Footer */}
      <div className="p-3 bg-[#090d16] border-t border-slate-800">
        <div className="flex items-center bg-[#131c31] border border-slate-700/80 rounded-2xl px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none py-1.5"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0 ml-2"
            title="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
