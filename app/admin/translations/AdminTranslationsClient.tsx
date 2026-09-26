'use client';

import { useMemo, useState } from 'react';
import { Languages, Save, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type Entity = 'course' | 'module' | 'lesson';
type Locale = 'ru' | 'en';

interface EntityRow {
  entity: Entity;
  id: string;
  label: string;
  courseId: string;
}

interface Translation {
  entity: Entity;
  entity_id: string;
  locale: Locale;
  title?: string | null;
  short_description?: string | null;
  description?: string | null;
  summary?: string | null;
}

const ENTITY_LABEL: Record<Entity, string> = {
  course: 'Kurs',
  module: 'Modul',
  lesson: 'Dars',
};

export default function AdminTranslationsClient({
  courses,
  entities,
  initialTranslations,
}: {
  courses: { id: string; title: string }[];
  entities: EntityRow[];
  initialTranslations: Translation[];
}) {
  const [translations, setTranslations] = useState<Translation[]>(initialTranslations);
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [locale, setLocale] = useState<Locale>('ru');
  const [selected, setSelected] = useState<EntityRow | null>(null);
  const [draft, setDraft] = useState<Translation | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => entities.filter((e) => e.courseId === courseId),
    [entities, courseId]
  );

  const findTranslation = (row: EntityRow, loc: Locale) =>
    translations.find((t) => t.entity === row.entity && t.entity_id === row.id && t.locale === loc);

  const select = (row: EntityRow, loc: Locale = locale) => {
    const existing = findTranslation(row, loc);
    setSelected(row);
    setDraft({
      entity: row.entity,
      entity_id: row.id,
      locale: loc,
      title: existing?.title ?? '',
      short_description: existing?.short_description ?? '',
      description: existing?.description ?? '',
      summary: existing?.summary ?? '',
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Saqlab bo‘lmadi');

      setTranslations((prev) => [
        ...prev.filter(
          (t) => !(t.entity === draft.entity && t.entity_id === draft.entity_id && t.locale === draft.locale)
        ),
        data.translation,
      ]);
      toast.success('Tarjima saqlandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft || !selected) return;
    if (!confirm('Tarjimani o‘chirasizmi? Sahifa o‘zbekcha matnga qaytadi.')) return;

    setSaving(true);
    try {
      const params = new URLSearchParams({
        entity: draft.entity,
        id: draft.entity_id,
        locale: draft.locale,
      });
      const res = await fetch(`/api/admin/translations?${params}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'O‘chirib bo‘lmadi');

      setTranslations((prev) =>
        prev.filter(
          (t) => !(t.entity === draft.entity && t.entity_id === draft.entity_id && t.locale === draft.locale)
        )
      );
      select(selected, draft.locale);
      toast.success('Tarjima o‘chirildi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: 'title' | 'short_description' | 'description' | 'summary',
    label: string,
    multiline = false
  ) => (
    <div>
      <label className="block text-[11px] font-mono uppercase text-white/60 mb-1.5 font-bold">{label}</label>
      {multiline ? (
        <textarea
          rows={4}
          value={draft?.[key] ?? ''}
          onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
          placeholder="Bo‘sh qoldirilsa — o‘zbekcha matn ishlatiladi"
          className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white transition"
        />
      ) : (
        <input
          type="text"
          value={draft?.[key] ?? ''}
          onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
          placeholder="Bo‘sh qoldirilsa — o‘zbekcha matn ishlatiladi"
          className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white transition"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
          <Languages size={26} /> Kurs kontenti tarjimasi
        </h1>
        <p className="text-white/50 text-sm mt-1">
          O&apos;zbekcha matn asosiy hisoblanadi. Bu yerda faqat ruscha va inglizcha variantlar
          kiritiladi — to&apos;ldirilmagan maydon o&apos;zbekchaga qaytadi.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setSelected(null);
            setDraft(null);
          }}
          className="bg-black border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-white"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          {(['ru', 'en'] as Locale[]).map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc);
                if (selected) select(selected, loc);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition border ${
                locale === loc
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-white/70 border-white/15 hover:border-white/40'
              }`}
            >
              {loc === 'ru' ? 'Русский' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="bg-[#000000] border border-white/10 rounded-3xl p-12 text-center text-white/50">
          Kurslar hali yaratilmagan.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6">
          {/* Entity list */}
          <div className="bg-[#000000] border border-white/15 rounded-3xl p-4 space-y-1 max-h-[600px] overflow-y-auto">
            {visible.map((row) => {
              const has = Boolean(findTranslation(row, locale));
              const active = selected?.entity === row.entity && selected?.id === row.id;
              return (
                <button
                  key={`${row.entity}:${row.id}`}
                  onClick={() => select(row)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-2 ${
                    active ? 'bg-white text-black' : 'hover:bg-white/5 text-white/80'
                  } ${row.entity === 'lesson' ? 'pl-8' : row.entity === 'module' ? 'pl-5' : ''}`}
                >
                  <span
                    className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      active ? 'bg-black/10 text-black' : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {ENTITY_LABEL[row.entity]}
                  </span>
                  <span className="text-xs truncate flex-1">{row.label}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      has ? 'bg-emerald-400' : active ? 'bg-black/20' : 'bg-white/15'
                    }`}
                    title={has ? 'Tarjima mavjud' : 'Tarjima yo‘q'}
                  />
                </button>
              );
            })}
          </div>

          {/* Editor */}
          <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 space-y-5">
            {!draft ? (
              <div className="h-full flex items-center justify-center text-center text-white/40 text-sm py-16">
                Chapdan kurs, modul yoki darsni tanlang.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-white/40 block">
                      {ENTITY_LABEL[draft.entity]} · {draft.locale === 'ru' ? 'Русский' : 'English'}
                    </span>
                    <h2 className="text-sm font-bold text-white truncate">{selected?.label}</h2>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={save}
                      disabled={saving}
                      className="px-4 py-2 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5"
                    >
                      {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Saqlash
                    </button>
                    {findTranslation(selected!, draft.locale) && (
                      <button
                        onClick={remove}
                        disabled={saving}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 rounded-xl transition"
                        aria-label="Tarjimani o‘chirish"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {field('title', 'Sarlavha')}
                  {draft.entity !== 'module' && field('short_description', 'Qisqa tavsif', true)}
                  {field('description', 'Tavsif', true)}
                  {draft.entity === 'lesson' && field('summary', 'Dars xulosasi', true)}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
