'use client';

import { useState } from 'react';
import type { ReviewWithAuthor } from '@/types/admin';
import Link from 'next/link';
import { 
  Star, 
  MessageSquarePlus, 
  CheckCircle2, 
  Quote, 
  Sparkles, 
  X, 
  Send,
  User,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';

interface ReviewsClientProps {
  initialReviews: ReviewWithAuthor[];
  userCourses: { id: string; title: string }[];
  isAuthenticated: boolean;
}

export default function ReviewsClient({ initialReviews, userCourses, isAuthenticated }: ReviewsClientProps) {
  const { t, locale } = useI18n();
  const [reviews] = useState<ReviewWithAuthor[]>(initialReviews);
  const [showModal, setShowModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(userCourses[0]?.id || '');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : '5.0';

  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    stars: r,
    count: reviews.filter((rev) => rev.rating === r).length,
    percentage: totalReviews > 0 ? (reviews.filter((rev) => rev.rating === r).length / totalReviews) * 100 : 0,
  }));

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error(t('reviews.errSelectCourse'));
      return;
    }
    if (content.length < 10) {
      toast.error(t('reviews.errMinLength'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: selectedCourseId,
          rating,
          content,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('reviews.errGeneric'));

      toast.success(t('reviews.submitSuccess'));
      setShowModal(false);
      setContent('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('reviews.errSubmit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={14} />
            {t('reviews.badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            {t('reviews.pageTitle')}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {t('reviews.pageSubtitle')}
          </p>
        </div>

        {isAuthenticated && userCourses.length > 0 ? (
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 flex-shrink-0"
          >
            <MessageSquarePlus size={18} />
            {t('reviews.leaveReview')}
          </button>
        ) : !isAuthenticated ? (
          <Link
            href="/login?returnTo=/reviews"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl transition"
          >
            {t('reviews.loginToReview')}
          </Link>
        ) : null}
      </div>

      {/* Ratings Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8">
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-6 border-b md:border-b-0 md:border-r border-white/5">
          <div className="text-5xl sm:text-6xl font-black text-white font-mono">{averageRating}</div>
          <div className="flex items-center gap-1 my-3 text-amber-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={20} className="fill-amber-400" />
            ))}
          </div>
          <span className="text-xs text-white/50">{t('reviews.verifiedCount', { n: totalReviews })}</span>
        </div>

        <div className="md:col-span-8 flex flex-col justify-center space-y-3">
          {ratingCounts.map((item) => (
            <div key={item.stars} className="flex items-center gap-4 text-xs font-mono">
              <span className="text-white/60 w-12 flex items-center gap-1">
                {item.stars} <Star size={12} className="fill-amber-400 text-amber-400" />
              </span>
              <div className="flex-1 h-2 bg-black rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="text-white/40 w-8 text-right">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.length === 0 ? (
          <div className="col-span-full py-16 text-center text-white/40">
            {t('reviews.empty')}
          </div>
        ) : (
          reviews.map((r, i) => (
            <motion.div
              key={r.id || i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-emerald-500/20 transition duration-300 relative group"
            >
              <div>
                {/* Rating Stars */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(r.rating)].map((_, idx) => (
                      <Star key={idx} size={16} className="fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    {new Date(r.created_at).toLocaleDateString(locale)}
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-white/80 text-sm leading-relaxed mb-6 italic">
                  &ldquo;{r.content}&rdquo;
                </p>
              </div>

              {/* User Meta */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center font-bold text-emerald-400 text-sm overflow-hidden">
                    {r.profiles?.avatar_url ? (
                      <img src={r.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      r.profiles?.full_name?.charAt(0) || <User size={18} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm leading-tight flex items-center gap-1.5">
                      {r.profiles?.full_name || t('reviews.defaultStudent')}
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    </h4>
                    <span className="text-[10px] text-white/40 font-mono block">
                      {r.courses?.title || t('reviews.graduate')}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal for Submitting Review */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121212] border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition"
              >
                <X size={20} />
              </button>

              <div className="mb-6">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold">{t('reviews.modalBadge')}</span>
                <h2 className="text-2xl font-black text-white mt-1">{t('reviews.modalTitle')}</h2>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">{t('reviews.selectCourse')}</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {userCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">{t('reviews.rateIt')}</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="p-2 bg-black/40 hover:bg-white/10 rounded-xl transition"
                      >
                        <Star
                          size={28}
                          className={s <= rating ? 'fill-amber-400 text-amber-400' : 'text-white/20'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">{t('reviews.yourReview')}</label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('reviews.reviewPlaceholder')}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  {isSubmitting ? t('reviews.submitting') : t('reviews.submitReview')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
