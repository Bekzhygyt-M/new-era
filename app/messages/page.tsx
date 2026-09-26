'use client';

import { useState, useEffect } from 'react';
import UserSidebar from '@/components/dashboard/UserSidebar';
import UserHeader from '@/components/dashboard/UserHeader';
import DashboardFooter from '@/components/dashboard/DashboardFooter';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

interface ChatMessage {
  id: string;
  sender: 'admin' | 'user';
  text: string;
  time: string;
}

export default function MessagesPage() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [inputVal, setInputVal] = useState('');

  useEffect(() => {
    fetch('/api/messages')
      .then((res) => res.json())
      .then((data) => setMessages(data?.messages || []))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user' as const,
      text: inputVal,
      time: new Date().toLocaleTimeString().slice(0, 5),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    toast.success(t('messages.sent'));

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMsg),
      });
    } catch (e) {}

    setTimeout(() => {
      const reply = {
        id: (Date.now() + 1).toString(),
        sender: 'admin' as const,
        text: 'Xabaringiz qabul qilindi. Tez orada mentorlarimiz sizga javob berishadi.',
        time: new Date().toLocaleTimeString().slice(0, 5),
      };
      setMessages((prev) => [...prev, reply]);
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reply),
      }).catch(() => {});
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row font-sans text-white selection:bg-white selection:text-black">
      <UserSidebar activeTab="messages" />

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-[#050505]">
        <UserHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] w-full mx-auto">
          {/* Header */}
          <div className="pb-4 border-b border-white/10">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase">{t('messages.title')}</h1>
            <p className="text-xs sm:text-sm text-white/50">{t('messages.subtitle')}</p>
          </div>

          {/* Chat Container */}
          <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col h-[520px]">
            {/* Chat Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold font-mono">
                NE
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{t('messages.mentorSupport')}</span>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                </h4>
                <span className="text-[10px] text-white/50 font-mono">{t('messages.onlineCentre')}</span>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {loaded && messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 px-6">
                  <p className="text-sm font-bold text-white">Yozishmalar hali boshlanmagan</p>
                  <p className="text-xs text-white/50 mt-1.5 max-w-xs leading-relaxed">
                    Savolingizni yozing — administrator javob berganda shu yerda ko&apos;rasiz.
                  </p>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 ${
                      m.sender === 'user'
                        ? 'bg-white text-black font-semibold rounded-tr-sm shadow-xl font-mono'
                        : 'bg-[#0a0a0a] border border-white/15 text-white/90 rounded-tl-sm font-mono'
                    }`}
                  >
                    <p className="leading-relaxed font-sans">{m.text}</p>
                    <span className={`text-[9px] font-mono block text-right ${m.sender === 'user' ? 'text-black/60 font-bold' : 'text-white/40'}`}>
                      {m.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="pt-2 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Savolingizni yozing..."
                className="flex-1 bg-[#080808] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white transition font-mono"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-black text-xs rounded-xl transition flex items-center gap-1 shadow-xl uppercase font-mono tracking-wider"
              >
                <Send size={14} />
                <span className="hidden sm:inline">{t('messages.send')}</span>
              </button>
            </form>
          </div>

          <DashboardFooter />
        </div>
      </main>
    </div>
  );
}
