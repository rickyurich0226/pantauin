import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cara Pantau Lowongan Kerja Fresh Graduate dan Dapat Notifikasi Otomatis',
  description: 'Jangan ketinggalan lowongan kerja fresh graduate lagi. Pantau ratusan sumber loker sekaligus dan dapat notifikasi WhatsApp saat ada lowongan yang sesuai jurusan dan kota kamu.',
  keywords: ['lowongan kerja fresh graduate', 'notifikasi loker otomatis', 'pantau lowongan kerja', 'alert loker fresh graduate', 'cari kerja otomatis WhatsApp'],
  alternates: { canonical: 'https://pantau.in/blog/cara-pantau-lowongan-kerja-fresh-graduate' },
  openGraph: {
    title: 'Cara Pantau Lowongan Kerja Fresh Graduate dan Dapat Notifikasi Otomatis',
    description: 'Jangan ketinggalan lowongan kerja fresh graduate lagi. Pantau ratusan sumber loker sekaligus dan dapat notifikasi WhatsApp saat ada lowongan yang sesuai jurusan dan kota kamu.',
    url: 'https://pantau.in/blog/cara-pantau-lowongan-kerja-fresh-graduate',
    type: 'article',
  }
}

export default function BlogArtikel() {
  return (
    <div style={{minHeight:'100vh',background:'#F0F4F9',fontFamily:'Inter,sans-serif'}}>
      <nav style={{background:'white',borderBottom:'1px solid #DDE5EF',padding:'16px clamp(16px,4vw,40px)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'22px',fontWeight:800,textDecoration:'none'}}>
          <span style={{color:'#0D1B2A'}}>pantau</span><span style={{color:'#0F6E56'}}>.in</span>
        </a>
        <a href="/register" style={{fontSize:'14px',fontWeight:700,color:'white',background:'#1560BD',padding:'8px 20px',borderRadius:'8px',textDecoration:'none'}}>Daftar Gratis</a>
      </nav>

      <article style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px'}}>
        <a href="/blog" style={{fontSize:'13px',color:'#5A7090',textDecoration:'none',display:'inline-block',marginBottom:'24px'}}>← Kembali ke Blog</a>

        <span style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:'#E1F5EE',color:'#0F6E56',display:'inline-block',marginBottom:'16px'}}>Lowongan Kerja</span>
        <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'clamp(24px,4vw,36px)',fontWeight:800,color:'#0D1B2A',lineHeight:1.3,marginBottom:'16px'}}>
          Cara Pantau Lowongan Kerja Fresh Graduate dan Dapat Notifikasi Otomatis
        </h1>
        <div style={{display:'flex',gap:'16px',color:'#9EB3C8',fontSize:'13px',marginBottom:'32px'}}>
          <span>10 Juli 2026</span><span>·</span><span>5 menit baca</span>
        </div>

        <div style={{background:'#E1F5EE',borderRadius:'12px',padding:'20px 24px',marginBottom:'32px',borderLeft:'4px solid #0F6E56'}}>
          <p style={{fontSize:'14px',color:'#0F6E56',fontWeight:500,margin:0}}>
            <strong>Ringkasan:</strong> Persaingan kerja fresh graduate makin ketat. Dengan monitoring otomatis, kamu bisa apply lebih cepat dari ribuan pelamar lain dan tingkatkan peluang diterima.
          </p>
        </div>
        
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"clamp(20px,3vw,26px)",fontWeight:700,color:"#0D1B2A",marginTop:"40px",marginBottom:"16px"}}>Realita Persaingan Kerja Fresh Graduate</h2>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}>Setiap tahun, lebih dari 1,7 juta fresh graduate Indonesia memasuki pasar kerja. Persaingan untuk posisi entry-level di perusahaan bonafit sangat ketat — satu posisi bisa mendapat ratusan hingga ribuan pelamar.</p>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}>Salah satu faktor yang sering diremehkan adalah waktu pengiriman lamaran. Banyak perusahaan melakukan seleksi berkas secara rolling — artinya siapa yang melamar lebih awal memiliki peluang lebih besar untuk dipanggil interview sebelum kuota terpenuhi.</p>
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"clamp(20px,3vw,26px)",fontWeight:700,color:"#0D1B2A",marginTop:"40px",marginBottom:"16px"}}>Sumber Lowongan yang Wajib Dipantau</h2>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}>Lowongan kerja tersebar di banyak platform yang berbeda:</p>
              <ul style={{paddingLeft:"22px",marginBottom:"16px"}}>
              <li style={{marginBottom:"8px",color:"#5A7090",lineHeight:1.8}}><strong style={{color:"#0D1B2A"}}>Job portal</strong>: Jobstreet, LinkedIn, Glints, Kalibrr, Indeed</li>
              <li style={{marginBottom:"8px",color:"#5A7090",lineHeight:1.8}}><strong style={{color:"#0D1B2A"}}>Website perusahaan</strong>: Banyak perusahaan besar posting lowongan lebih awal di website sendiri</li>
              <li style={{marginBottom:"8px",color:"#5A7090",lineHeight:1.8}}><strong style={{color:"#0D1B2A"}}>Media sosial</strong>: Instagram dan Twitter akun HR perusahaan sering posting lowongan</li>
              <li style={{marginBottom:"8px",color:"#5A7090",lineHeight:1.8}}><strong style={{color:"#0D1B2A"}}>BUMN dan pemerintah</strong>: Portal rekrutmen BUMN dan instansi pemerintah</li>
              <li style={{marginBottom:"8px",color:"#5A7090",lineHeight:1.8}}><strong style={{color:"#0D1B2A"}}>Campus hiring</strong>: Program rekrutmen khusus dari universitas</li>
              </ul>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}>Memantau semua sumber ini secara manual setiap hari sangat melelahkan dan tidak efisien.</p>
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"clamp(20px,3vw,26px)",fontWeight:700,color:"#0D1B2A",marginTop:"40px",marginBottom:"16px"}}>Cara Setup Pantauan Lowongan yang Tepat</h2>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}>Tips membuat pantauan lowongan yang efektif:</p>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px",whiteSpace:"pre-line"}}>1. <strong style={{color:"#0D1B2A"}}>Spesifik di posisi</strong>: 'Software Engineer entry level Jakarta' lebih baik dari sekadar 'programmer'
2. <strong style={{color:"#0D1B2A"}}>Sebutkan industri</strong>: 'Finance analyst perbankan' atau 'marketing FMCG Surabaya'
3. <strong style={{color:"#0D1B2A"}}>Tambahkan level pengalaman</strong>: Sertakan kata 'fresh graduate', '0-1 tahun pengalaman', atau 'junior'
4. <strong style={{color:"#0D1B2A"}}>Filter lokasi</strong>: Tentukan kota atau wilayah yang bisa kamu jangkau</p>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}>Dengan deskripsi yang tepat, kamu hanya mendapat notifikasi lowongan yang benar-benar relevan.</p>
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"clamp(20px,3vw,26px)",fontWeight:700,color:"#0D1B2A",marginTop:"40px",marginBottom:"16px"}}>Strategi Melamar Lebih Cepat</h2>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}>Saat notifikasi lowongan masuk, kecepatan adalah kunci:</p>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}><strong style={{color:"#0D1B2A"}}>Siapkan CV dan portofolio siap pakai</strong>: Jangan baru buat CV saat ada lowongan. Selalu punya versi terbaru yang tinggal disesuaikan.</p>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}><strong style={{color:"#0D1B2A"}}>Template cover letter</strong>: Punya 2-3 versi template untuk industri yang berbeda sehingga tinggal edit nama perusahaan dan posisi.</p>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}><strong style={{color:"#0D1B2A"}}>Akun job portal sudah lengkap</strong>: Pastikan profil di Jobstreet, LinkedIn, dan platform lain sudah 100% diisi sehingga lamaran bisa dikirim dalam hitungan menit.</p>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}><strong style={{color:"#0D1B2A"}}>Set reminder follow up</strong>: Jika dalam 1-2 minggu tidak ada kabar, kirim email follow up yang sopan.</p>
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"clamp(20px,3vw,26px)",fontWeight:700,color:"#0D1B2A",marginTop:"40px",marginBottom:"16px"}}>Apa yang Membedakan Pelamar yang Diterima?</h2>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}>Selain kecepatan melamar, ada beberapa faktor yang meningkatkan peluang diterima:</p>
              <ul style={{paddingLeft:"22px",marginBottom:"16px"}}>
              <li style={{marginBottom:"8px",color:"#5A7090",lineHeight:1.8}}>CV yang disesuaikan dengan job description (bukan CV generik)</li>
              <li style={{marginBottom:"8px",color:"#5A7090",lineHeight:1.8}}>Cover letter yang menunjukkan riset tentang perusahaan</li>
              <li style={{marginBottom:"8px",color:"#5A7090",lineHeight:1.8}}>Portofolio atau contoh kerja yang relevan</li>
              <li style={{marginBottom:"8px",color:"#5A7090",lineHeight:1.8}}>Profil LinkedIn yang aktif dan profesional</li>
              <li style={{marginBottom:"8px",color:"#5A7090",lineHeight:1.8}}>Referensi dari kenalan yang sudah bekerja di perusahaan tersebut</li>
              </ul>
              <p style={{fontSize:"16px",color:"#5A7090",lineHeight:1.8,marginBottom:"16px"}}>Pantau.in membantu kamu dengan faktor pertama — memastikan kamu tahu lebih dulu sehingga punya waktu lebih untuk mempersiapkan lamaran yang berkualitas.</p>

        <div style={{background:'linear-gradient(135deg,#0D1B2A,#1560BD)',borderRadius:'16px',padding:'32px',marginTop:'48px',textAlign:'center'}}>
          <h3 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'22px',fontWeight:800,color:'white',marginBottom:'12px'}}>
            Mulai Pantau Sekarang — Gratis
          </h3>
          <p style={{color:'rgba(255,255,255,0.8)',marginBottom:'24px',lineHeight:1.7}}>
            Bergabung dengan ribuan pengguna yang sudah mendapat peluang lebih cepat dengan Pantau.in
          </p>
          <a href="/register" style={{display:'inline-block',background:'white',color:'#1560BD',fontWeight:700,padding:'14px 32px',borderRadius:'10px',textDecoration:'none',fontSize:'15px'}}>
            Daftar Gratis Sekarang →
          </a>
        </div>
      </article>

      <footer style={{background:'#0D1B2A',color:'rgba(255,255,255,0.6)',textAlign:'center',padding:'24px',fontSize:'13px',marginTop:'60px'}}>
        <p>© 2026 Pantau.in — Sistem Intelijen Peluang Indonesia</p>
      </footer>
    </div>
  )
}
