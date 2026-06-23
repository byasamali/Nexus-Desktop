import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const REGISTER_FIELDS = [
  { name: 'fullName',      placeholder: 'Ad Soyad',      type: 'text',     icon: '👤' },
  { name: 'pharmacyName', placeholder: 'Eczane Adı',     type: 'text',     icon: '🏥' },
  { name: 'gln',          placeholder: 'GLN Numarası',   type: 'text',     icon: '🔢' },
  { name: 'phone',        placeholder: 'Cep Telefonu',   type: 'tel',      icon: '📱' },
];

const BENEFITS = [
  { icon: '🧠', text: 'Yapay zeka destekli sipariş önerileri' },
  { icon: '📊', text: 'Gerçek zamanlı stok analitiği' },
  { icon: '🛡️', text: 'Miad & ölü stok takibi' },
  { icon: '🔒', text: 'Güvenli Supabase altyapısı' },
];

export default function RegisterLogin() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' | 'error'
  const [formData, setFormData] = useState({
    fullName: '', pharmacyName: '', gln: '', phone: '', email: '', password: '',
  });

  useEffect(() => {
    if (router.isReady && router.query.mode === 'login') setIsLogin(true);
  }, [router.isReady, router.query.mode]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setMessage({ text: '', type: '' });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: formData.email, password: formData.password });
      if (error) { setMessage({ text: error.message, type: 'error' }); return; }
      if (data.user) {
        const { error: insertError } = await supabase.from('eczaneler').insert({
          id: data.user.id, ad_soyad: formData.fullName, eczane_adi: formData.pharmacyName,
          gln: formData.gln, email: formData.email, telefon: formData.phone,
        });
        if (insertError) setMessage({ text: insertError.message, type: 'error' });
        else {
          setMessage({ text: 'Kayıt başarılı! Admin onayı bekleniyor.', type: 'success' });
          setFormData({ fullName: '', pharmacyName: '', gln: '', phone: '', email: '', password: '' });
        }
      }
    } catch { setMessage({ text: 'Bir hata oluştu', type: 'error' }); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
      if (error) { setMessage({ text: error.message, type: 'error' }); return; }
      const { data: eczane } = await supabase.from('eczaneler').select('onaylandi_mi').eq('id', data.user.id).single();
      if (!eczane?.onaylandi_mi) {
        setMessage({ text: 'Hesabınız henüz admin tarafından onaylanmadı.', type: 'error' });
        await supabase.auth.signOut();
      } else {
        setMessage({ text: 'Giriş başarılı! Yönlendiriliyorsunuz...', type: 'success' });
        setTimeout(() => router.push('/dashboard'), 1000);
      }
    } catch { setMessage({ text: 'Bir hata oluştu', type: 'error' }); }
    finally { setLoading(false); }
  };

  const switchMode = (login) => {
    setIsLogin(login);
    setMessage({ text: '', type: '' });
    setFormData({ fullName: '', pharmacyName: '', gln: '', phone: '', email: '', password: '' });
    router.replace(login ? '/register?mode=login' : '/register', undefined, { shallow: true });
  };

  return (
    <div style={s.root}>
      <Head>
        <title>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'} | Nexus</title>
        <meta name="description" content="Nexus eczane yönetim platformuna kayıt olun veya giriş yapın." />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.layout}>

        {/* LEFT PANEL — branding */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={s.leftPanel}
        >
          <a href="/" style={s.logo}>
            <div style={s.logoMark}>🌾</div>
            <span style={s.logoText}>Farm<span style={{ color: '#0d9488' }}>Teknoloji</span></span>
          </a>

          <div style={s.leftContent}>
            <div style={s.leftBadge}>Nexus Pro →</div>
            <h2 style={s.leftTitle}>
              Eczanenizi<br />
              <span style={s.leftGradient}>akıllılaştırın.</span>
            </h2>
            <p style={s.leftSub}>
              Yapay zeka destekli sipariş önerilerinden gerçek zamanlı stok analitiğine — tek platform.
            </p>

            <div style={s.benefitsList}>
              {BENEFITS.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                  style={s.benefitRow}
                >
                  <span style={s.benefitIcon}>{b.icon}</span>
                  <span style={s.benefitText}>{b.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <p style={s.leftFooter}>© 2026 Farm Teknoloji · Ecz. Burak YAŞAMALI</p>
        </motion.div>

        {/* RIGHT PANEL — form */}
        <div style={s.rightPanel}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={s.formCard}
          >
            {/* Tabs */}
            <div style={s.tabs}>
              <button
                onClick={() => switchMode(false)}
                style={{ ...s.tab, ...(isLogin ? s.tabInactive : s.tabActive) }}
              >
                Kayıt Ol
              </button>
              <button
                onClick={() => switchMode(true)}
                style={{ ...s.tab, ...(isLogin ? s.tabActive : s.tabInactive) }}
              >
                Giriş Yap
              </button>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={s.formTitle}>{isLogin ? 'Tekrar hoş geldiniz' : 'Hesap oluşturun'}</h1>
              <p style={s.formSub}>{isLogin ? 'Devam etmek için giriş yapın' : 'Ücretsiz başlayın, admin onayı gerekir'}</p>
            </div>

            {/* Form */}
            <form onSubmit={isLogin ? handleLogin : handleRegister} style={s.form}>
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="register-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}
                  >
                    {REGISTER_FIELDS.map((field) => (
                      <div key={field.name} style={s.inputWrap}>
                        <span style={s.inputIcon}>{field.icon}</span>
                        <input
                          type={field.type}
                          name={field.name}
                          placeholder={field.placeholder}
                          value={formData[field.name]}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          style={s.input}
                        />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={s.inputWrap}>
                <span style={s.inputIcon}>✉️</span>
                <input type="email" name="email" placeholder="E-posta adresi" value={formData.email} onChange={handleChange} required disabled={loading} style={s.input} />
              </div>
              <div style={s.inputWrap}>
                <span style={s.inputIcon}>🔑</span>
                <input type="password" name="password" placeholder="Şifre" value={formData.password} onChange={handleChange} required disabled={loading} style={s.input} />
              </div>

              {/* Message */}
              <AnimatePresence>
                {message.text && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      ...s.message,
                      background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                      color: message.type === 'success' ? '#166534' : '#991b1b',
                    }}
                  >
                    {message.type === 'success' ? '✓ ' : '✗ '}{message.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <span style={s.spinner} /> İşlem yapılıyor...
                  </span>
                ) : isLogin ? 'Giriş Yap →' : 'Kayıt Ol →'}
              </motion.button>
            </form>

            {/* Switch */}
            <p style={s.switchText}>
              {isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}{' '}
              <button onClick={() => switchMode(!isLogin)} style={s.switchBtn}>
                {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
              </button>
            </p>

            <p style={{ textAlign: 'center', marginTop: 8 }}>
              <a href="/" style={{ ...s.switchBtn, fontSize: 13 }}>← Ana Sayfaya Dön</a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, sans-serif",
    background: '#f8fafc',
    overflowX: 'hidden',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    minHeight: '100vh',
  },

  /* Left */
  leftPanel: {
    background: '#0f172a',
    padding: '48px 56px',
    display: 'flex', flexDirection: 'column',
    position: 'relative', overflow: 'hidden',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 'auto' },
  logoMark: { fontSize: 22 },
  logoText: { fontSize: 17, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.5px' },
  leftContent: { margin: 'auto 0', paddingBlock: 60 },
  leftBadge: {
    display: 'inline-block', padding: '5px 14px', borderRadius: 999,
    background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)',
    color: '#2dd4bf', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
    marginBottom: 20,
  },
  leftTitle: {
    fontSize: 48, fontWeight: 900, color: '#f8fafc',
    letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 20,
  },
  leftGradient: {
    background: 'linear-gradient(135deg, #2dd4bf, #6366f1)',
    backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  leftSub: { fontSize: 15, color: '#94a3b8', lineHeight: 1.7, marginBottom: 40, maxWidth: 360 },
  benefitsList: { display: 'flex', flexDirection: 'column', gap: 14 },
  benefitRow: { display: 'flex', alignItems: 'center', gap: 12 },
  benefitIcon: { fontSize: 18 },
  benefitText: { fontSize: 14, fontWeight: 600, color: '#cbd5e1' },
  leftFooter: { fontSize: 12, color: '#475569', marginTop: 'auto', paddingTop: 40 },

  /* Right */
  rightPanel: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '48px 28px', background: '#f8fafc',
  },
  formCard: {
    width: '100%', maxWidth: 420,
    background: '#fff', borderRadius: 24,
    border: '1px solid #e2e8f0',
    padding: '40px 36px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },

  /* Tabs */
  tabs: {
    display: 'flex', gap: 6, marginBottom: 32,
    background: '#f1f5f9', borderRadius: 12, padding: 4,
  },
  tab: {
    flex: 1, padding: '10px', borderRadius: 9, border: 'none',
    fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
  },
  tabActive: { background: '#fff', color: '#0f172a', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  tabInactive: { background: 'transparent', color: '#94a3b8' },

  /* Headings */
  formTitle: { fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 4 },
  formSub: { fontSize: 14, color: '#94a3b8', fontWeight: 500 },

  /* Form */
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
    padding: '0 14px', transition: 'border-color 0.2s',
  },
  inputIcon: { fontSize: 16, flexShrink: 0 },
  input: {
    flex: 1, padding: '13px 0', border: 'none', background: 'transparent',
    fontSize: 14, color: '#0f172a', outline: 'none', fontFamily: 'inherit',
  },
  message: {
    padding: '12px 14px', borderRadius: 10,
    fontSize: 13, fontWeight: 600, textAlign: 'center',
  },
  submitBtn: {
    marginTop: 8, padding: '15px 24px', borderRadius: 12,
    background: '#0d9488', color: '#fff', border: 'none',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(13,148,136,0.3)',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  spinner: {
    display: 'inline-block', width: 16, height: 16,
    border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  switchText: { textAlign: 'center', fontSize: 14, color: '#64748b', marginTop: 20 },
  switchBtn: { background: 'none', border: 'none', color: '#0d9488', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit', padding: 0, textDecoration: 'none' },
};