import { motion } from 'framer-motion';
import Head from 'next/head';

const DL = "https://github.com/byasamali/Farmonex_Setup/releases/latest/download/FarmonexSut_Setup.exe";

const FEATURES = [
  { icon: '📋', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', title: 'Otomatik SUT Denetimi', desc: "Medula ekranından reçeteyi çektiğiniz anda 500'den fazla aktif SUT kuralı denetlenir. Hiçbir şey gözden kaçmaz." },
  { icon: '🧮', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', title: 'Gelişmiş Hesaplayıcılar', desc: 'WHO Z-Skor, Mama dozu ve Alkol seyreltme hesaplamalarını hatasız yapar. Bilimsel doğrulukla, saniyeler içinde.' },
  { icon: '⚠️', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', title: 'Kritik Uyarı Sistemi', desc: 'İlaç etkileşimleri ve gebelik riskleri için proaktif bildirimler. Büyük sorunları küçükken yakalar.' },
];

export default function Farmonex() {
  return (
    <div style={s.root}>
      <Head>
        <title>Farmonex | Proaktif SUT Denetim Asistanı</title>
        <meta name="description" content="Eczanenizde kesintileri engelleyen proaktif SUT denetim asistanı." />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      {/* NAV */}
      <motion.header initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} style={s.nav}>
        <div style={s.navInner}>
          <a href="/" style={s.logo}>
            <div style={{ ...s.logoMark, background: '#059669' }}>🛡️</div>
            <span style={s.logoText}>Farmo<span style={{ color: '#059669' }}>nex</span></span>
          </a>
          <nav style={s.navLinks}>
            <a href="#ozellikler" style={s.navLink}>Özellikler</a>
            <a href="#karsilastirma" style={s.navLink}>Farmonex Farkı</a>
          </nav>
          <motion.a href={DL} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{ ...s.navCTA, background: '#059669' }}>
            ⬇️ Uygulamayı İndir
          </motion.a>
        </div>
      </motion.header>

      {/* HERO */}
      <section style={s.hero}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ ...s.badge, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669' }}>⚡ Proaktif SUT Denetimi</div>
          <h1 style={s.heroTitle}>
            Eczanenizde Kesintilere<br />
            <span style={{ background: 'linear-gradient(135deg, #059669, #2563eb)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Son Verme Vakti
            </span>
          </h1>
          <p style={s.heroSub}>
            Medula reçetelerini SUT kurallarına göre anlık analiz edin.
            Farmonex, karmaşık hesaplamaları saniyeler içinde yapar ve kesinti risklerini proaktif olarak engeller.
          </p>
          <div style={s.heroBtns}>
            <motion.a href={DL} target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(5,150,105,0.4)' }} whileTap={{ scale: 0.97 }}
              style={{ ...s.heroPrimary, background: '#059669', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
              ⬇️ Hemen İndir ve Kur
            </motion.a>
            <motion.a href="#karsilastirma" whileHover={{ borderColor: '#94a3b8', color: '#334155' }} style={s.heroSecondary}>
              Farkı Gör ↓
            </motion.a>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} style={s.statsRow}>
          {[{ n: '500+', l: 'Aktif SUT Kuralı' }, { n: 'Anlık', l: 'Denetim' }, { n: 'Sıfır', l: 'Kesinti Hedefi' }, { n: '%100', l: 'Medula Uyumlu' }].map((st, i) => (
            <div key={i} style={{ ...s.stat, borderRight: i < 3 ? '1px solid #e2e8f0' : 'none' }}>
              <div style={{ ...s.statNum, color: '#059669' }}>{st.n}</div>
              <div style={s.statLabel}>{st.l}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* FEATURES */}
      <section id="ozellikler" style={s.section}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ ...s.sectionEye, color: '#059669' }}>Özellikler</p>
          <h2 style={s.sectionTitle}>Dijital Meslektaşınızla Tanışın</h2>
          <p style={s.sectionSub}>SUT mevzuatını sizin yerinize takip ediyor, eczanenizi koruyoruz.</p>
        </motion.div>
        <div style={s.featureGrid}>
          {FEATURES.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }} whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(0,0,0,0.08)' }}
              style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: `4px solid ${f.color}`, borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.25s' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: f.bg, border: `1px solid ${f.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section id="karsilastirma" style={{ background: '#f8fafc', padding: '80px 28px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ ...s.sectionEye, color: '#059669' }}>Karşılaştırma</p>
            <h2 style={s.sectionTitle}>Farmonex Farkı</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 24, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '48px 40px', background: '#fff', borderRight: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 28 }}>Geleneksel Yöntem</h4>
              {['Manuel mevzuat takibi', 'İnsan hatasına açık hesaplar', 'SGK kesinti riski'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: '#94a3b8', marginBottom: 20 }}>
                  <span>✗</span> {item}
                </div>
              ))}
            </div>
            <div style={{ padding: '48px 40px', background: '#059669' }}>
              <h4 style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 28 }}>Farmonex ile</h4>
              {['Saniyeler içinde kontrol', 'Bilimsel veri tutarlılığı', 'Sıfır kesinti hedefi'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
                  <span>✓</span> {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 28px', maxWidth: 780, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 28, padding: '72px 48px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🛡️</div>
          <h2 style={{ ...s.sectionTitle, marginBottom: 16 }}>Eczanenizi Bugün Geleceğe Hazırlayın</h2>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 36, lineHeight: 1.7 }}>
            Farmonex'i hemen indirip kurulumu tamamlayarak SUT kesintilerine karşı proaktif koruma sağlamaya başlayın.
          </p>
          <motion.a href={DL} target="_blank" rel="noopener noreferrer"
            whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(5,150,105,0.5)' }} whileTap={{ scale: 0.97 }}
            style={{ display: 'inline-flex', padding: '16px 36px', borderRadius: 12, background: '#059669', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 16px rgba(5,150,105,0.4)', transition: 'all 0.2s' }}>
            Şimdi İndir →
          </motion.a>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '48px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ ...s.logo, justifyContent: 'center', textDecoration: 'none' }}>
            <div style={{ ...s.logoMark, background: '#059669' }}>🛡️</div>
            <span style={s.logoText}>Farmo<span style={{ color: '#059669' }}>nex</span></span>
          </a>
          <p style={{ fontSize: 13, color: '#cbd5e1', textAlign: 'center', lineHeight: 1.6 }}>
            © 2026 Farmonex Akıllı Eczane Çözümleri<br />
            Ecz. Burak YAŞAMALI tarafından geliştirilmiştir.
          </p>
          <a href="/" style={{ fontSize: 13, color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>← Ana Sayfaya Dön</a>
        </div>
      </footer>
    </div>
  );
}

const s = {
  root: { minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: "'Inter', -apple-system, sans-serif", overflowX: 'hidden' },
  nav: { position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid #e2e8f0' },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 28px', height: 68, display: 'flex', alignItems: 'center', gap: 32 },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto', textDecoration: 'none' },
  logoMark: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  logoText: { fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' },
  navLinks: { display: 'flex', gap: 28 },
  navLink: { fontSize: 14, fontWeight: 600, color: '#64748b', textDecoration: 'none' },
  navCTA: { fontSize: 14, fontWeight: 700, textDecoration: 'none', padding: '10px 22px', borderRadius: 10, color: '#fff', transition: 'all 0.2s' },
  hero: { padding: '96px 24px 72px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 52, background: 'linear-gradient(180deg, #fff 0%, #f8fafc 100%)' },
  badge: { display: 'inline-block', padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', marginBottom: 24 },
  heroTitle: { fontSize: 'clamp(38px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', color: '#0f172a', marginBottom: 20 },
  heroSub: { fontSize: 17, color: '#64748b', lineHeight: 1.75, maxWidth: 560, margin: '0 auto 32px' },
  heroBtns: { display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' },
  heroPrimary: { padding: '16px 36px', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', transition: 'all 0.2s' },
  heroSecondary: { padding: '16px 36px', borderRadius: 12, border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: 15, textDecoration: 'none', background: '#fff', transition: 'all 0.2s' },
  statsRow: { display: 'flex', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' },
  stat: { padding: '24px 40px', textAlign: 'center' },
  statNum: { fontSize: 28, fontWeight: 900, letterSpacing: '-1px' },
  statLabel: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 },
  section: { maxWidth: 1100, margin: '0 auto', padding: '80px 28px' },
  sectionEye: { fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 },
  sectionTitle: { fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: '#0f172a', letterSpacing: '-1.5px', marginBottom: 16 },
  sectionSub: { fontSize: 16, color: '#64748b', maxWidth: 500, margin: '0 auto' },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 },
};