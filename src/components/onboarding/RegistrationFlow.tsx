import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { AgeGroup, EligibleAgeGroup, UserProfile } from '../../types/hub.ts';
import { AVATAR_OPTIONS, AvatarVisual } from '../common/AvatarVisual.tsx';
import { useHub } from '../../context/HubContext.tsx';
import { soundFx } from '../../utils/soundFx.ts';

const AGE_GROUPS: Array<{ id: AgeGroup; label: string; desc: string }> = [
  { id: '13-15', label: '13–15 yosh', desc: 'O‘smirlar toifasi' },
  { id: '16-17', label: '16–17 yosh', desc: 'Yoshlar o‘yin ligasi' },
  { id: '18-24', label: '18–24 yosh', desc: 'Kiber sport va 1v1 arenalar' },
  { id: '25-34', label: '25–34 yosh', desc: 'Strategik va taktik o‘yinlar' },
  { id: '35+', label: '35+ yosh', desc: 'Klassik mantiq va zehn o‘yinlari' },
];

export const RegistrationFlow: React.FC = () => {
  const { setSession, notify } = useHub();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
  const [underageBlocked, setUnderageBlocked] = useState(false);
  const [ageError, setAgeError] = useState('');

  // Step 2: Username
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    valid: boolean;
    available: boolean;
    message: string;
  }>({ checking: false, valid: false, available: false, message: '' });

  // Step 3: Privacy-first Age Assurance
  const [birthYear, setBirthYear] = useState<string>('2002');
  const [privacyConsent, setPrivacyConsent] = useState(true);
  const [assuranceToken, setAssuranceToken] = useState<string>('');
  const [assuranceLoading, setAssuranceLoading] = useState(false);
  const [assuranceError, setAssuranceError] = useState('');

  // Step 4: Avatar & Profile Creation
  const [avatarId, setAvatarId] = useState('cyber_helmet');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Debounced live username uniqueness check
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameStatus({ checking: false, valid: false, available: false, message: '' });
      return;
    }
    setUsernameStatus((s) => ({ ...s, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        setUsernameStatus({
          checking: false,
          valid: Boolean(data.valid),
          available: Boolean(data.available),
          message: data.message || '',
        });
      } catch {
        setUsernameStatus({
          checking: false,
          valid: false,
          available: false,
          message: 'Tekshirishda xatolik yuz berdi.',
        });
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [username]);

  const handleAgeSelect = async (age: AgeGroup) => {
    soundFx.click();
    setSelectedAge(age);
    setAgeError('');
    try {
      const res = await fetch('/api/auth/age-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageGroup: age }),
      });
      const data = await res.json();
      if (!res.ok || !data.allowed) {
        setUnderageBlocked(true);
        setAgeError(
          data.message ||
            'Sizning yoshingiz ushbu platformadan foydalanish uchun yetarli emas.'
        );
        return;
      }
      setUnderageBlocked(false);
    } catch {
      if (age === '13-15') {
        setUnderageBlocked(true);
        setAgeError('Sizning yoshingiz ushbu platformadan foydalanish uchun yetarli emas.');
      }
    }
  };

  const proceedFromStep1 = () => {
    if (!selectedAge || selectedAge === '13-15' || underageBlocked) return;
    soundFx.click();
    setStep(2);
  };

  const proceedFromStep2 = () => {
    if (!usernameStatus.valid || !usernameStatus.available) return;
    soundFx.click();
    setStep(3);
  };

  const verifyAgeAssurance = async () => {
    if (!selectedAge || selectedAge === '13-15') return;
    setAssuranceLoading(true);
    setAssuranceError('');
    try {
      const res = await fetch('/api/auth/age-assurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ageGroup: selectedAge,
          birthYear: Number(birthYear),
          privacyConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        if (data.underageBlocked) {
          setUnderageBlocked(true);
        }
        setAssuranceError(data.message || 'Tasdiqlash amalga oshmadi.');
        return;
      }
      soundFx.collect();
      setAssuranceToken(data.assuranceToken);
      setStep(4);
    } catch {
      setAssuranceError('Tarmoq xatoligi. Qayta urinib ko‘ring.');
    } finally {
      setAssuranceLoading(false);
    }
  };

  const completeProfile = async () => {
    if (!selectedAge || selectedAge === '13-15' || !assuranceToken) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ageGroup: selectedAge as EligibleAgeGroup,
          username: username.trim(),
          avatarId,
          assuranceToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Ro‘yxatdan o‘tishda xatolik.');
        return;
      }
      soundFx.victory();
      setSession(data.user as UserProfile, data.token as string);
      notify(`Xush kelibsiz, ${data.user.username}!`, 'success');
    } catch {
      setSubmitError('Server bilan aloqa uzildi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06070A] text-slate-100 relative overflow-hidden flex items-center justify-center p-4 sm:p-6">
      {/* Ambient cinematic background */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/src/assets/images/hero_gaming_arena_1795273637113.jpg"
          alt="UZBEK GAMING HUB fon rasmi"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06070A]/80 via-[#06070A]/90 to-[#06070A]" />
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-[#FF6B00]/12 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-[#00D2FF]/12 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#00D2FF] p-[1.5px]">
              <div className="w-full h-full bg-[#090B11] rounded-[7px] flex items-center justify-center font-display font-bold text-sm text-white">
                UZ
              </div>
            </div>
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              UZBEK GAMING HUB
            </span>
          </div>
          <p className="text-sm text-slate-400">
            O‘zbekistonning keyingi avlod 3D brauzer o‘yinlari va 1v1 kiber arena ekotizimi
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { num: 1, label: 'Yosh toifasi' },
            { num: 2, label: 'Foydalanuvchi nomi' },
            { num: 3, label: 'Yosh tasdiqlash' },
            { num: 4, label: 'Profil yaratish' },
          ].map((s) => {
            const active = step === s.num;
            const done = step > s.num;
            return (
              <div
                key={s.num}
                className={`px-3 py-2 rounded-lg border text-xs transition-colors ${
                  active
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-white font-semibold'
                    : done
                    ? 'border-[#00D2FF]/50 bg-[#00D2FF]/10 text-[#7DD3FC]'
                    : 'border-white/10 bg-[#0E1118]/80 text-slate-500'
                }`}
              >
                <span className="font-mono mr-1.5">0{s.num}.</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Main Card */}
        <div className="bg-[#0D1017]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {/* STEP 1: AGE SELECTION */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <p className="text-xs font-mono text-[#00D2FF] mb-1">1-BOSQICH · YOSH TEKSHIRUVI</p>
                  <h1 className="font-display text-2xl font-bold text-white">
                    Yoshingiz toifasini tanlang
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    O‘yin kutubxonasi va tavsiyalar yosh toifangizga mos ravishda shakllantiriladi.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {AGE_GROUPS.map((ag) => {
                    const isSelected = selectedAge === ag.id;
                    const isRestricted = ag.id === '13-15';
                    return (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => handleAgeSelect(ag.id)}
                        className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? isRestricted
                              ? 'border-red-500 bg-red-500/10'
                              : 'border-[#FF6B00] bg-[#FF6B00]/12'
                            : 'border-white/10 bg-[#121620] hover:border-white/25'
                        }`}
                      >
                        <div>
                          <div className="font-display font-bold text-base text-white">
                            {ag.label}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{ag.desc}</div>
                        </div>
                        {isSelected && (
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              isRestricted ? 'bg-red-500 text-white' : 'bg-[#FF6B00] text-white'
                            }`}
                          >
                            {isRestricted ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {underageBlocked && (
                  <div className="mb-6 p-4 rounded-xl border border-red-500/40 bg-red-950/40 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-200">
                        {ageError ||
                          'Sizning yoshingiz ushbu platformadan foydalanish uchun yetarli emas.'}
                      </p>
                      <p className="text-xs text-red-300/80 mt-1">
                        Platformadan faqat 16 yosh va undan katta foydalanuvchilar foydalanishi mumkin.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!selectedAge || selectedAge === '13-15' || underageBlocked}
                    onClick={proceedFromStep1}
                    className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF7D1F] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors whitespace-nowrap"
                  >
                    <span>Davom etish</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: USERNAME */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <p className="text-xs font-mono text-[#00D2FF] mb-1">2-BOSQICH · O‘YINCHI NOMI</p>
                  <h1 className="font-display text-2xl font-bold text-white">
                    Noyob foydalanuvchi nomini kiriting
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Bu nom 1v1 arenada, turnirlarda va global reyting jadvalida ko‘rinadi.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Foydalanuvchi nomi (lotin harflari, raqamlar va _)
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={username}
                      maxLength={20}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masalan: AmirTemur_01"
                      className="w-full px-4 py-3.5 rounded-xl bg-[#121620] border border-white/15 focus:border-[#00D2FF] focus:outline-none text-white font-mono text-base transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono">
                      {usernameStatus.checking ? (
                        <span className="text-slate-400">Tekshirilmoqda...</span>
                      ) : usernameStatus.valid && usernameStatus.available ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Bo‘sh
                        </span>
                      ) : username.trim().length > 0 ? (
                        <span className="text-amber-400">Band / Noto‘g‘ri</span>
                      ) : null}
                    </div>
                  </div>
                  {usernameStatus.message && (
                    <p
                      className={`text-xs mt-2 ${
                        usernameStatus.valid && usernameStatus.available
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {usernameStatus.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Orqaga</span>
                  </button>
                  <button
                    type="button"
                    disabled={!usernameStatus.valid || !usernameStatus.available || usernameStatus.checking}
                    onClick={proceedFromStep2}
                    className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF7D1F] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors whitespace-nowrap"
                  >
                    <span>Davom etish</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PRIVACY-FIRST AGE ASSURANCE */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <p className="text-xs font-mono text-[#00D2FF] mb-1">
                    3-BOSQICH · MAXFIYLIKKA ASOSLANGAN YOSH TASDIQLASH
                  </p>
                  <h1 className="font-display text-2xl font-bold text-white">
                    Xavfsiz yosh muvofiqligi tekshiruvi
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Pasport rasmi, ID karta surati yoki hujjat raqami talab qilinmaydi va saqlanmaydi.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#111724] border border-[#00D2FF]/25 mb-5 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#00D2FF] shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-white block mb-0.5">UzTrust AgeGate himoyasi:</strong>
                    Tizim faqat yosh muvofiqligi (16+) natijasini tasdiqlovchi shifrlangan ruxsat tokenini qaytaradi. Shaxsiy hujjatlar administratorlarga yoki boshqa o‘yinchilarga hech qachon ko‘rsatilmaydi.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      Tug‘ilgan yilingiz (faqat muvofiqlik tekshiruvi uchun)
                    </label>
                    <input
                      type="number"
                      min={1940}
                      max={2020}
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#121620] border border-white/15 focus:border-[#00D2FF] focus:outline-none text-white font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-[#121620] cursor-pointer w-full">
                      <input
                        type="checkbox"
                        checked={privacyConsent}
                        onChange={(e) => setPrivacyConsent(e.target.checked)}
                        className="mt-1 accent-[#FF6B00]"
                      />
                      <span className="text-xs text-slate-300">
                        Maxfiylik siyosati va halol o‘yin qoidalariga roziman
                      </span>
                    </label>
                  </div>
                </div>

                {assuranceError && (
                  <div className="mb-5 p-3.5 rounded-xl border border-red-500/40 bg-red-950/40 text-xs text-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{assuranceError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Orqaga</span>
                  </button>
                  <button
                    type="button"
                    disabled={assuranceLoading || !privacyConsent}
                    onClick={verifyAgeAssurance}
                    className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 bg-[#00D2FF] hover:bg-[#38BDF8] disabled:opacity-40 text-[#06070A] transition-colors whitespace-nowrap"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{assuranceLoading ? 'Tekshirilmoqda...' : 'Yoshni tasdiqlash'}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: PROFILE CREATION */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <p className="text-xs font-mono text-[#00D2FF] mb-1">4-BOSQICH · SHAXSIY PROFIL</p>
                  <h1 className="font-display text-2xl font-bold text-white">
                    O‘yinchi avatari va profilni yakunlang
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Profil yaratilgandan so‘ng barcha o‘yinlar va 1v1 arena ochiladi.
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
                  {AVATAR_OPTIONS.map((av) => {
                    const selected = avatarId === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          soundFx.click();
                          setAvatarId(av.id);
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                          selected
                            ? 'border-[#FF6B00] bg-[#FF6B00]/15'
                            : 'border-white/10 bg-[#121620] hover:border-white/25'
                        }`}
                      >
                        <AvatarVisual avatarId={av.id} size="md" />
                        <span className="text-[11px] text-slate-300 text-center leading-tight">
                          {av.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Profile Preview Strip */}
                <div className="p-4 rounded-xl bg-[#121620] border border-white/10 flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3.5">
                    <AvatarVisual avatarId={avatarId} size="md" />
                    <div>
                      <div className="font-display font-bold text-lg text-white">{username}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>Yosh toifasi: {selectedAge}</span>
                        <span>·</span>
                        <span className="text-emerald-400">Tasdiqlangan</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Boshlang‘ich daraja</div>
                    <div className="font-mono text-sm font-semibold text-[#FF6B00]">
                      Bronze · +100 XP
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200">
                    {submitError}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Orqaga</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={completeProfile}
                    className="px-7 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF7D1F] disabled:opacity-50 text-white transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{submitting ? 'Yaratilmoqda...' : 'Platformaga kirish'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
