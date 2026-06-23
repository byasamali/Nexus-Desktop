import { motion, useScroll, useTransform } from 'framer-motion';
import Head from 'next/head';
import { useRef } from 'react';

const DOWNLOAD_LINK = "https://github.com/byasamali/pratiket_setup/releases/latest/download/Pratiket_Setup.exe";

const MAIN_FEATURES = [
  {
    id: 'floating',
    title: 'Yüzen Panel Teknolojisi',
    desc: 'Diğer programların (TEBEOS, Eczanem vb.) üzerinde her zaman aktif olan akıllı sihirbaz. Ekran değiştirmeden anında işlem.',
    icon: '✨',
    color: '#6366f1'
  },
  {
    id: 'its',
    title: 'Akıllı ITS Karekod Parser',
    desc: 'Karmaşık karekodları saniyeler içinde çözer, ilaç bilgilerini veritabanından anında çeker. Hatayı sıfıra indirir.',
    icon: '🔍',
    color: '#06b6d4'
  },
  {
    id: 'modes',
    title: 'Görsel & Yaşlı Modu',
    desc: 'İşitme/görme güçlüğü çeken veya okuma yazma bilmeyen hastalar için ikonlu ve dev puntolu tarif desteği.',
    icon: '👴',
    color: '#8b5cf6'
  }
];

const SECONDARY_FEATURES = [
  { title: '6 Dil Desteği', desc: 'Arapça, Rusça, İngilizce ve dahası.', icon: '🌍' },
  { title: 'Otomatik Dozaj', desc: '"3*1" girişini profesyonel cümleye çevirir.', icon: '✍️' },
  { title: 'Aç/Tok Algılama', desc: 'Veritabanından otomatik kullanım bilgisi.', icon: '🍽️' },
  { title: 'WhatsApp Entegrasyonu', desc: 'Hastaya dijital bilgi kartı gönderimi.', icon: '📱' },
  { title: 'Bulut Yedekleme', desc: 'Ayarlarınız ve verileriniz her zaman güvende.', icon: '☁️' },
  { title: 'Hızlı Kurulum', desc: 'Sadece 10 saniyede hazır, tak-çalıştır.', icon: '🚀' },
];

export default function PratiketSuperior() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} style={s.root}>
      <Head>
        <title>Pratiket | Geleceğin Eczane Etiketleme Sistemi</title>
        <meta name="description" content="Eczaneniz için en hızlı, en akıllı ve en profesyonel tarif etiketi çözümü." />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* GLOW DECOR */}
      <div style={s.glowTop} />

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.logo}>
            <div style={s.logoMark}>P</div>
            <span style={s.logoText}>Pratiket<span style={{ color: '#6366f1' }}>.</span></span>
          </div>
          <div style={s.navLinks}>
            <a href="#ozellikler" style={s.navLink}>Özellikler</a>
            <a href="#teknoloji" style={s.navLink}>Teknoloji</a>
            <a href={DOWNLOAD_LINK} style={s.navCTA}>Ücretsiz Başla</a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={s.hero}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={s.heroContent}
        >
          <div style={s.badge}>🚀 YENİ NESİL ECZACILIK</div>
          <h1 style={s.heroTitle}>
            Etiketlemede <br />
            <span style={s.heroGradient}>Sınırları Zorlayın.</span>
          </h1>
          <p style={s.heroSub}>
            Pratiket, karmaşık süreçleri basitleştirir. Yüzen panel teknolojisi ve akıllı algoritmalarıyla
            eczanenize hem hız hem de prestij katar.
          </p>
          <div style={s.heroBtns}>
            <motion.a
              href={DOWNLOAD_LINK}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={s.btnPrimary}
            >
              Hemen İndir — Ücretsiz
            </motion.a>
            <a href="#demo" style={s.btnSecondary}>Özellikleri Keşfet</a>
          </div>
        </motion.div>

        {/* FLOATING WINDOW SIMULATION */}
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={s.heroVisual}
        >
          <div style={s.windowMock}>
            <div style={s.windowHeader}>
              <div style={{ display: 'flex', gap: 6 }}><div style={s.dot} /><div style={s.dot} /><div style={s.dot} /></div>
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Pratiket Hızlı Panel</span>
            </div>
            <div style={s.windowBody}>
              <div style={s.skeletonRow} />
              <div style={s.skeletonRowShort} />
              <div style={s.printButton}>Barkodu Yazdır</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* TRUST LOGOS */}
      <div style={s.trustRow}>
        <span style={s.trustText}>TAM ENTEGRASYON:</span>
        <div style={s.trustLogos}>
          {['Medula', 'TEBEOS', 'Eczanem', 'RxMedia', 'Itriyat'].map(t => (
            <span key={t} style={s.trustLogo}>{t}</span>
          ))}
        </div>
      </div>

      {/* MAIN FEATURES GRID */}
      <section id="ozellikler" style={s.featuresSection}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Neden Pratiket?</h2>
          <p style={s.sectionSub}>Rakiplerinin ötesinde, eczacının tam ihtiyacı olan özellikler.</p>
        </div>

        <div style={s.mainGrid}>
          {MAIN_FEATURES.map((f, i) => (
            <motion.div
              key={f.id}
              whileHover={{ y: -10 }}
              style={s.mainCard}
            >
              <div style={{ ...s.iconBox, backgroundColor: f.color + '15', color: f.color }}>{f.icon}</div>
              <h3 style={s.cardTitle}>{f.title}</h3>
              <p style={s.cardDesc}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECONDARY FEATURES LIST */}
      <section style={s.secondarySection}>
        <div style={s.secondaryGrid}>
          {SECONDARY_FEATURES.map((f, i) => (
            <div key={i} style={s.miniCard}>
              <span style={{ fontSize: 24, marginBottom: 12, display: 'block' }}>{f.icon}</span>
              <h4 style={s.miniTitle}>{f.title}</h4>
              <p style={s.miniDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={s.finalCta}>
        <div style={s.ctaContainer}>
          <h2 style={s.ctaTitle}>Profesyonelliğe Bugün Geçiş Yapın.</h2>
          <p style={s.ctaSub}>Karmaşık etiketlerle vedalaşın, Pratiket ile fark yaratın.</p>
          <a href={DOWNLOAD_LINK} style={s.btnPrimaryLarge}>Pratiket'i Şimdi İndir</a>
          <div style={{ marginTop: 20, color: '#94a3b8', fontSize: 13 }}>
            ✓ 10 Saniyede Kurulum • ✓ Kredi Kartı Gerekmez • ✓ Sınırsız İlaç Veritabanı
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerTop}>
            <div style={s.logo}>
              <div style={s.logoMark}>P</div>
              <span style={s.logoText}>Pratiket</span>
            </div>
            <div style={s.footerLinks}>
              <a href="#">Kullanım Kılavuzu</a>
              <a href="#">Destek</a>
              <a href="#">Eczacı Topluluğu</a>
            </div>
          </div>
          <div style={s.footerBottom}>
            <p>© 2026 Pratiket Lab. Ecz. Burak YAŞAMALI tarafından meslektaşları için geliştirilmiştir.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const s = {
  root: {
    backgroundColor: '#020617',
    color: '#f8fafc',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    minHeight: '100vh',
    overflowX: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -200,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100vw',
    height: '600px',
    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(2,6,23,0) 70%)',
    pointerEvents: 'none',
  },
  nav: {
    height: 80,
    display: 'flex',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  navInner: {
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 24px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoMark: {
    width: 32, height: 32, borderRadius: 8,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  logoText: { fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 32 },
  navLink: { color: '#94a3b8', fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: '0.2s' },
  navCTA: {
    background: '#fff', color: '#020617', padding: '10px 20px', borderRadius: 8,
    fontSize: 14, fontWeight: 700, textDecoration: 'none'
  },
  hero: {
    padding: '120px 24px 80px',
    maxWidth: 1200,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: 40,
    alignItems: 'center',
  },
  badge: {
    display: 'inline-block', padding: '6px 12px', borderRadius: 6,
    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
    color: '#818cf8', fontSize: 12, fontWeight: 700, marginBottom: 24, letterSpacing: '0.05em'
  },
  heroTitle: {
    fontSize: 'clamp(44px, 5vw, 84px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-3px', marginBottom: 24
  },
  heroGradient: {
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
  },
  heroSub: {
    fontSize: 18, color: '#94a3b8', lineHeight: 1.6, maxWidth: 500, marginBottom: 40
  },
  heroBtns: { display: 'flex', gap: 16 },
  btnPrimary: {
    padding: '16px 32px', borderRadius: 12, background: '#6366f1', color: '#fff',
    fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 10px 20px -5px rgba(99,102,241,0.4)'
  },
  btnSecondary: {
    padding: '16px 32px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc',
    fontSize: 16, fontWeight: 700, textDecoration: 'none'
  },
  heroVisual: {
    position: 'relative', display: 'flex', justifyContent: 'center'
  },
  windowMock: {
    width: 320, background: '#1e293b', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)', overflow: 'hidden'
  },
  windowHeader: {
    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between'
  },
  dot: { width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' },
  windowBody: { padding: 24 },
  skeletonRow: { height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 12 },
  skeletonRowShort: { height: 12, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 24 },
  printButton: {
    padding: '10px', background: '#6366f1', borderRadius: 8, color: '#fff',
    textAlign: 'center', fontSize: 12, fontWeight: 700
  },
  trustRow: {
    maxWidth: 1200, margin: '40px auto 100px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 32
  },
  trustText: { fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.1em' },
  trustLogos: { display: 'flex', gap: 40, opacity: 0.4 },
  trustLogo: { fontSize: 18, fontWeight: 800, color: '#94a3b8' },
  featuresSection: { padding: '100px 24px', maxWidth: 1200, margin: '0 auto' },
  sectionHeader: { textAlign: 'center', marginBottom: 80 },
  sectionTitle: { fontSize: 44, fontWeight: 800, marginBottom: 16, letterSpacing: '-1.5px' },
  sectionSub: { fontSize: 18, color: '#94a3b8' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 },
  mainCard: {
    padding: 40, borderRadius: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
    transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  iconBox: {
    width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, marginBottom: 24
  },
  cardTitle: { fontSize: 24, fontWeight: 700, marginBottom: 16 },
  cardDesc: { fontSize: 16, color: '#94a3b8', lineHeight: 1.6 },
  secondarySection: { padding: '80px 24px', background: 'rgba(255,255,255,0.01)' },
  secondaryGrid: {
    maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40
  },
  miniCard: { textAlign: 'center' },
  miniTitle: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  miniDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.5 },
  finalCta: { padding: '120px 24px', textAlign: 'center' },
  ctaContainer: {
    maxWidth: 800, margin: '0 auto', padding: '80px 40px', borderRadius: 40,
    background: 'linear-gradient(180deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0) 100%)',
    border: '1px solid rgba(99,102,241,0.1)'
  },
  ctaTitle: { fontSize: 40, fontWeight: 800, marginBottom: 16, letterSpacing: '-1.5px' },
  ctaSub: { fontSize: 18, color: '#94a3b8', marginBottom: 40 },
  btnPrimaryLarge: {
    padding: '20px 48px', borderRadius: 16, background: '#fff', color: '#020617',
    fontSize: 18, fontWeight: 800, textDecoration: 'none', transition: '0.2s',
    display: 'inline-block'
  },
  footer: { padding: '80px 24px 40px', borderTop: '1px solid rgba(255,255,255,0.05)' },
  footerInner: { maxWidth: 1200, margin: '0 auto' },
  footerTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 60, alignItems: 'center' },
  footerLinks: { display: 'flex', gap: 32 },
  footerBottom: { borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 40, textAlign: 'center', fontSize: 14, color: '#475569' }
};