'use client';

import { useState } from 'react';
import type { LocalFaq } from '@/types/admin';
import { useI18n } from '@/lib/i18n';
import { ChevronDown, Search } from 'lucide-react';

export default function FAQClient({ faqs }: { faqs: LocalFaq[] }) {
  const { locale, t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  const getQuestion = (faq: LocalFaq) => {
    if (locale === 'ru' && faq.question_ru) return faq.question_ru;
    if (locale === 'en' && faq.question_en) return faq.question_en;
    return faq.question_uz;
  };

  const getAnswer = (faq: LocalFaq) => {
    if (locale === 'ru' && faq.answer_ru) return faq.answer_ru;
    if (locale === 'en' && faq.answer_en) return faq.answer_en;
    return faq.answer_uz;
  };

  const filteredFaqs = faqs.filter(faq => {
    if (!searchQuery) return true;
    const q = getQuestion(faq).toLowerCase();
    const a = getAnswer(faq).toLowerCase();
    const search = searchQuery.toLowerCase();
    return q.includes(search) || a.includes(search);
  });

  return (
    <div>
      <div className="relative mb-12 max-w-xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-white/30" />
        </div>
        <input
          type="text"
          placeholder={t('faq.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#111] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/30 focus:outline-none focus:border-[#28c840] transition-colors"
        />
      </div>

      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="text-center p-8 text-white/50 bg-[#111] border border-white/[0.05] rounded-2xl">
            {t('common.noData')}
          </div>
        ) : (
          filteredFaqs.map(faq => {
            const isOpen = openId === faq.id;
            return (
              <div 
                key={faq.id} 
                className={`bg-[#111] border transition-all rounded-2xl overflow-hidden ${
                  isOpen ? 'border-white/20 shadow-[0_0_20px_rgba(40,200,64,0.05)]' : 'border-white/[0.05] hover:border-white/10'
                }`}
              >
                <button
                  onClick={() => toggle(faq.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className={`font-bold pr-8 ${isOpen ? 'text-[#28c840]' : 'text-white'}`}>
                    {getQuestion(faq)}
                  </span>
                  <ChevronDown 
                    size={20} 
                    className={`text-white/50 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180 text-[#28c840]' : ''}`} 
                  />
                </button>
                
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="text-white/60 leading-relaxed pt-2 border-t border-white/[0.05]">
                    {getAnswer(faq)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
