import { motion } from 'framer-motion';
import Head from 'next/head';
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

/* ─── Veri ─── */
const PRODUCTS = [
  {
    href: '/dashboard',
    name: 'Nexus',
    badge: 'Web SaaS',
    tagline: 'AI Destekli Sipariş & Stok Platformu',
    description:
      'Eczanenizin satış verilerini yapay zeka ile analiz edin. Hangi ürünü, ne zaman, ne kadar sipariş vermeniz gerektiğini otomatik öğrenin. Ölü stok, miad riski, nöbet hazırlık ve kardeş eczane ağı — hepsi tek panelde.',
    color: '#0d9488',      // teal-600
    bg: '#f0fdfa',         // teal-50
    border: '#99f6e4',     // teal-200
    icon: '🧠',
    cta: 'Dashboard\'a Gir',
    features: ['Yapay Zeka Sipariş Önerisi', 'Miad & Ölü Stok Takibi', 'Analitik Raporlar', 'Kardeş Eczane Ağı'],
    type: 'web',
  },
  {
    href: '/pratiket',
    name: 'Pratiket',
    badge: 'Windows Uygulaması',
    tagline: 'Profesyonel Tarif Etiketi & CRM',
    description:
      'Medula ile tam entegre çalışır. İlaç tariflerini saniyeler içinde şık etiketlere dönüştürür. Çoklu dil desteği (TR, EN, AR, RU, DE, BG), sürükle-bırak tasarımcı ve hasta takibi ile eczanenize kurumsal kimlik kazandırır.',
    color: '#4f46e5',      // indigo-600
    bg: '#eef2ff',         // indigo-50
    border: '#c7d2fe',     // indigo-200
    icon: '🖨️',
    cta: 'Pratiket\'i İncele',
    features: ['Tek Tıkla Etiket Basma', '6 Dil Desteği', 'Gelişmiş CRM', 'Eczane Ağ Desteği'],
    type: 'desktop',
  },
  {
    href: '/farmonex',
    name: 'Farmonex',
    badge: 'Windows Uygulaması',
    tagline: 'Proaktif SUT Denetim Asistanı',
    description:
      'Medula reçetelerini 500\'den fazla aktif SUT kuralına göre anlık analiz eder. SGK kesintilerini daha oluşmadan önler. İlaç etkileşim uyarıları, gelişmiş hesaplayıcılar ve kritik bildirimlerle eczanenizi korur.',
    color: '#059669',      // emerald-600
    bg: '#ecfdf5',         // emerald-50
    border: '#a7f3d0',     // emerald-200
    icon: '🛡️',
    cta: 'Farmonex\'i İncele',
    features: ['Otomatik SUT Denetimi', 'Kesinti Önleme', 'İlaç Etkileşim Uyarısı', 'Gelişmiş Hesaplayıcılar'],
    type: 'desktop',
  },
];

/* ─── Bileşenler ─── */
function ProductCard({ product, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: index * 0.12, ease: 'easeOut' }}
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 24,
        padding: '40px 36px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.25s, transform 0.25s',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={{ boxShadow: '0 16px 40px rgba(0,0,0,0.08)', y: -4 }}
    >
      {/* Colored top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: product.color, borderRadius: '24px 24px 0 0',
      }} />

      {/* Icon + badge row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16,
          background: product.bg, border: `1px solid ${product.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>
          {product.icon}
        </div>
        <span style={{
          padding: '5px 12px', borderRadius: 999,
          background: product.bg, border: `1px solid ${product.border}`,
          color: product.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}>
          {product.badge}
        </span>
      </div>

      {/* Title */}
      <div>
        <h3 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', marginBottom: 4, letterSpacing: '-0.5px' }}>
          {product.name}
        </h3>
        <p style={{ fontSize: 14, fontWeight: 600, color: product.color }}>
          {product.tagline}
        </p>
      </div>

      {/* Description */}
      <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, flexGrow: 1 }}>
        {product.description}
      </p>

      {/* Feature list */}
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
        {product.features.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569', fontWeight: 500 }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: product.bg, border: `1px solid ${product.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: product.color, fontSize: 11, flexShrink: 0,
            }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <motion.a
        href={product.href}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          marginTop: 8,
          padding: '14px 24px',
          borderRadius: 12,
          background: product.color,
          color: '#fff',
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
          textAlign: 'center',
          boxShadow: `0 4px 14px ${product.color}44`,
          display: 'block',
        }}
      >
        {product.cta} →
      </motion.a>
    </motion.div>
  );
}

/* ─── Ana Sayfa ─── */
export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    const isWails = typeof window !== 'undefined' && window.go !== undefined;
    if (isWails) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div style={s.root}>
      <Head>
        <title>Pratikecza | Nexus · Pratiket · Farmonex</title>
        <meta name="description" content="Pratikecza — eczane yönetimini dijitalleştiren üç güçlü yazılım: Nexus (AI sipariş), Pratiket (tarif etiketi), Farmonex (SUT denetimi)." />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      {/* ── NAV ── */}
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={s.nav}
      >
        <div style={s.navInner}>
          {/* Logo */}
          <div style={s.logo}>
            <div style={s.logoMark}>💊</div>
            <span style={s.logoText}>Pratik<span style={{ color: '#0d9488' }}>ecza</span></span>
          </div>

          {/* Links */}
          <nav style={s.navLinks}>
            <a href="/pratiket" style={s.navLink}>Pratiket</a>
            <a href="/farmonex" style={s.navLink}>Farmonex</a>
          </nav>

          <div style={s.navActions}>
            <motion.a
              href="/register?mode=login"
              whileHover={{ color: '#0d9488' }}
              style={s.navGhost}
            >
              Giriş Yap
            </motion.a>
            <motion.a
              href="/register"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={s.navCTA}
            >
              Ücretsiz Başla
            </motion.a>
          </div>
        </div>
      </motion.header>

      {/* ── HERO ── */}
      <section style={s.hero}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto', padding: '0 24px' }}
        >
          <div style={s.heroBadge}>
            Ecz. Burak YAŞAMALI tarafından geliştirilmiştir
          </div>
          <h1 style={s.heroTitle}>
            Eczaneniz için
            <br />
            <span style={s.heroGradient}>3 Güçlü Çözüm</span>
          </h1>
          <p style={s.heroSub}>
            Yapay zeka destekli sipariş yönetiminden tarif etiketi basmaya, SUT denetiminden stok analitiğine —
            eczane yazılımlarının en kapsamlı paketi.
          </p>
          <div style={s.heroBtns}>
            <motion.a
              href="/register"
              whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(13,148,136,0.4)' }}
              whileTap={{ scale: 0.97 }}
              style={s.heroPrimary}
            >
              Nexus'u Ücretsiz Dene
            </motion.a>
            <motion.a
              href="#urunler"
              whileHover={{ borderColor: '#94a3b8', color: '#334155' }}
              style={s.heroSecondary}
            >
              Ürünleri Keşfet ↓
            </motion.a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={s.statsRow}
        >
          {[
            { n: '3', label: 'Yazılım Ürünü' },
            { n: '500+', label: 'Aktif Eczane' },
            { n: '7/24', label: 'Çalışır Durumda' },
            { n: '100%', label: 'Yerel Geliştirme' },
          ].map((st, i) => (
            <div key={i} style={s.stat}>
              <div style={s.statNum}>{st.n}</div>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── ÜRÜNLER ── */}
      <section id="urunler" style={s.products}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <p style={s.sectionEye}>Ürünlerimiz</p>
          <h2 style={s.sectionTitle}>Eczanenizin İhtiyaç Duyduğu Her Şey</h2>
          <p style={s.sectionSub}>
            Birbirinden bağımsız veya birlikte kullanılabilen yazılımlar.
            Her biri kendi alanının uzmanı.
          </p>
        </motion.div>

        <div style={s.productGrid}>
          {PRODUCTS.map((p, i) => (
            <ProductCard key={p.name} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* ── HAKKINDA ── */}
      <section style={s.about}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={s.aboutCard}
        >
          <div style={s.aboutIconWrap}>👨‍⚕️</div>
          <div style={s.aboutText}>
            <h2 style={s.aboutTitle}>Eczacıdan Eczacıya</h2>
            <p style={s.aboutBody}>
              Bu yazılımlar bir belirti tedavisinden değil, sahada yaşanan gerçek sorunlardan doğdu.
              Günlük operasyonun ağırlığını taşırken ihtiyaç duyulan araçları geliştirdim.
              Her özellik, eczane pratiğinden süzülerek tasarlandı.
            </p>
            <div style={s.aboutAuthor}>
              <strong>Ecz. Burak YAŞAMALI</strong>
              <span> — Geliştirici & Eczacı</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section style={s.ctaSection}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          style={s.ctaBox}
        >
          <h2 style={s.ctaTitle}>Bugün Başlamak İçin Bir Neden Yok mu?</h2>
          <p style={s.ctaSub}>
            Kayıt ücretsiz. Kurulum yok. Nexus dashboard'una dakikalar içinde erişin.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.a
              href="/register"
              whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(13,148,136,0.4)' }}
              whileTap={{ scale: 0.97 }}
              style={s.ctaPrimary}
            >
              Ücretsiz Kayıt Ol
            </motion.a>
            <motion.a
              href="/register?mode=login"
              whileHover={{ borderColor: '#94a3b8', color: '#334155' }}
              style={s.ctaGhost}
            >
              Giriş Yap
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={{ ...s.logo, justifyContent: 'center' }}>
            <div style={s.logoMark}>💊</div>
            <span style={s.logoText}>Pratik<span style={{ color: '#0d9488' }}>ecza</span></span>
          </div>
          <nav style={s.footerNav}>
            <a href="/dashboard" style={s.footerLink}>Nexus</a>
            <a href="/pratiket" style={s.footerLink}>Pratiket</a>
            <a href="/farmonex" style={s.footerLink}>Farmonex</a>
            <a href="/register" style={s.footerLink}>Kayıt Ol</a>
          </nav>
          <p style={s.copyright}>
            © 2026 Pratikecza · Ecz. Burak YAŞAMALI tarafından geliştirilmiştir.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Stiller ─── */
const s = {
  root: {
    minHeight: '100vh',
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: "'Inter', -apple-system, sans-serif",
    overflowX: 'hidden',
  },

  /* nav */
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid #e2e8f0',
  },
  navInner: {
    maxWidth: 1200, margin: '0 auto', padding: '0 28px',
    height: 68, display: 'flex', alignItems: 'center', gap: 32,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto', textDecoration: 'none' },
  logoMark: { fontSize: 24 },
  logoText: { fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' },
  navLinks: { display: 'flex', gap: 28 },
  navLink: { fontSize: 14, fontWeight: 600, color: '#64748b', textDecoration: 'none' },
  navActions: { display: 'flex', gap: 12, alignItems: 'center' },
  navGhost: { fontSize: 14, fontWeight: 600, color: '#64748b', textDecoration: 'none', padding: '8px 14px', transition: 'color 0.2s' },
  navCTA: {
    fontSize: 14, fontWeight: 700, textDecoration: 'none',
    padding: '10px 22px', borderRadius: 10,
    background: '#0d9488', color: '#fff',
    boxShadow: '0 2px 10px rgba(13,148,136,0.3)',
    transition: 'all 0.2s',
  },

  /* hero */
  hero: {
    padding: '96px 24px 80px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56,
    background: 'linear-gradient(180deg, #fff 0%, #f8fafc 100%)',
  },
  heroBadge: {
    display: 'inline-block',
    padding: '6px 16px', borderRadius: 999,
    background: '#f0fdfa', border: '1px solid #99f6e4',
    color: '#0d9488', fontSize: 12, fontWeight: 700,
    letterSpacing: '0.02em', marginBottom: 24,
  },
  heroTitle: {
    fontSize: 'clamp(42px, 7vw, 80px)',
    fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2.5px',
    color: '#0f172a', marginBottom: 20,
  },
  heroGradient: {
    background: 'linear-gradient(135deg, #0d9488 0%, #6366f1 100%)',
    backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  heroSub: {
    fontSize: 18, color: '#64748b', lineHeight: 1.75,
    maxWidth: 580, margin: '0 auto 36px',
  },
  heroBtns: { display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' },
  heroPrimary: {
    padding: '16px 36px', borderRadius: 12,
    background: '#0d9488', color: '#fff',
    fontWeight: 700, fontSize: 15, textDecoration: 'none',
    boxShadow: '0 4px 16px rgba(13,148,136,0.3)',
    transition: 'all 0.2s', display: 'flex', alignItems: 'center',
  },
  heroSecondary: {
    padding: '16px 36px', borderRadius: 12,
    border: '1px solid #e2e8f0', color: '#64748b',
    fontWeight: 700, fontSize: 15, textDecoration: 'none',
    background: '#fff', transition: 'all 0.2s',
  },
  statsRow: {
    display: 'flex', gap: 0,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  stat: {
    padding: '28px 48px', textAlign: 'center',
    borderRight: '1px solid #e2e8f0',
  },
  statNum: { fontSize: 32, fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' },
  statLabel: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 },

  /* products */
  products: { maxWidth: 1200, margin: '0 auto', padding: '96px 28px' },
  sectionEye: { fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0d9488', marginBottom: 12 },
  sectionTitle: { fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, color: '#0f172a', letterSpacing: '-1.5px', marginBottom: 16 },
  sectionSub: { fontSize: 17, color: '#64748b', maxWidth: 520, margin: '0 auto' },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 28,
  },

  /* about */
  about: { background: '#fff', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '80px 28px' },
  aboutCard: {
    maxWidth: 860, margin: '0 auto',
    display: 'flex', gap: 40, alignItems: 'flex-start',
    background: '#f8fafc', borderRadius: 24,
    border: '1px solid #e2e8f0', padding: '48px 48px',
  },
  aboutIconWrap: { fontSize: 48, flexShrink: 0 },
  aboutText: { display: 'flex', flexDirection: 'column', gap: 12 },
  aboutTitle: { fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' },
  aboutBody: { fontSize: 16, color: '#64748b', lineHeight: 1.75 },
  aboutAuthor: { fontSize: 14, color: '#94a3b8' },

  /* cta */
  ctaSection: { padding: '80px 28px' },
  ctaBox: {
    maxWidth: 720, margin: '0 auto', textAlign: 'center',
    background: '#0f172a', borderRadius: 28,
    padding: '72px 48px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
  },
  ctaTitle: { fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: '#f8fafc', letterSpacing: '-1.5px', marginBottom: 16 },
  ctaSub: { fontSize: 16, color: '#94a3b8', marginBottom: 40 },
  ctaPrimary: {
    padding: '16px 36px', borderRadius: 12,
    background: '#0d9488', color: '#fff',
    fontWeight: 700, fontSize: 15, textDecoration: 'none',
    boxShadow: '0 4px 16px rgba(13,148,136,0.4)',
    transition: 'all 0.2s',
  },
  ctaGhost: {
    padding: '16px 36px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#94a3b8', fontWeight: 700, fontSize: 15, textDecoration: 'none',
    transition: 'all 0.2s',
  },

  /* footer */
  footer: { background: '#fff', borderTop: '1px solid #e2e8f0', padding: '48px 28px' },
  footerInner: { maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 },
  footerNav: { display: 'flex', gap: 28 },
  footerLink: { fontSize: 14, fontWeight: 600, color: '#94a3b8', textDecoration: 'none' },
  copyright: { fontSize: 13, color: '#cbd5e1', textAlign: 'center' },
};