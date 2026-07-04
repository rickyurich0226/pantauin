import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cara Dapat Notifikasi Tender Pemerintah Langsung ke WhatsApp',
  description: 'Tidak perlu cek LPSE manual setiap hari. Pantau.in otomatis memindai ribuan paket tender dari seluruh LPSE Indonesia dan kirim notifikasi ke WhatsApp begitu ada tender baru sesuai bidang kamu.',
  openGraph: {
    title: 'Cara Dapat Notifikasi Tender Pemerintah Langsung ke WhatsApp',
    description: 'Tidak perlu cek LPSE manual setiap hari. Pantau.in otomatis memindai ribuan paket tender dari seluruh LPSE Indonesia dan kirim notifikasi ke WhatsApp begitu ada tender baru sesuai bidang kamu.',
    url: 'https://pantau.in/blog/notifikasi-tender-pemerintah-whatsapp',
    siteName: 'Pantau.in',
    type: 'article',
    publishedTime: '2025-06-20',
  },
  alternates: {
    canonical: 'https://pantau.in/blog/notifikasi-tender-pemerintah-whatsapp',
  },
}

export default function BlogPost() {
  return (
    <div style={{maxWidth:'720px',margin:'0 auto',padding:'40px 20px'}}>
      <div style={{marginBottom:'32px'}}>
        <a href="/blog" style={{fontSize:'13px',color:'#1560BD',textDecoration:'none',fontWeight:600}}>Kembali ke Blog</a>
      </div>
      <div style={{marginBottom:'24px'}}>
        <span style={{fontSize:'12px',color:'#9EB3C8'}}>2025-06-20</span>
      </div>
      <h1 style={{fontSize:'clamp(22px,4vw,32px)',fontWeight:800,color:'#0D1B2A',lineHeight:1.3,marginBottom:'16px'}}>
        Cara Dapat Notifikasi Tender Pemerintah Langsung ke WhatsApp
      </h1>
      <p style={{fontSize:'16px',color:'#5A7090',lineHeight:1.7,marginBottom:'32px',borderBottom:'1px solid #E8EEF5',paddingBottom:'24px'}}>
        Tidak perlu cek LPSE manual setiap hari. Pantau.in otomatis memindai ribuan paket tender dari seluruh LPSE Indonesia dan kirim notifikasi ke WhatsApp begitu ada tender baru sesuai bidang kamu.
      </p>
      <div style={{fontSize:'15px',color:'#374151',lineHeight:1.8}}>
        <h2 style={{fontWeight:700,fontSize:"18px",color:"#0D1B2A",margin:"24px 0 8px"}}>Problem Kontraktor: Tender Terlewat Sama Dengan Peluang Hilang</h2>
        <p>Indonesia memiliki ratusan portal LPSE dari tingkat kabupaten hingga kementerian. Tidak mungkin mengecek semuanya setiap hari secara manual. Akibatnya, banyak kontraktor melewatkan tender yang sangat cocok dengan kapasitas mereka.</p>
        <h2 style={{fontWeight:700,fontSize:"18px",color:"#0D1B2A",margin:"24px 0 8px"}}>Berapa Banyak LPSE yang Dipantau?</h2>
        <p>Pantau.in saat ini memantau 76+ sumber aktif termasuk LPSE kabupaten dan kota, LPSE kementerian, dan portal pengadaan lainnya. Semua dipindai setiap 5 menit secara otomatis.</p>
        <h2 style={{fontWeight:700,fontSize:"18px",color:"#0D1B2A",margin:"24px 0 8px"}}>Cara Setup Notifikasi Tender ke WhatsApp</h2>
        <p>Daftar di pantau.in, pilih profil Kontraktor, masukkan lokasi operasional misalnya Jawa Barat atau Surabaya, tentukan keyword spesifik seperti jenis pekerjaan atau nilai proyek, lalu di Settings masukkan nomor WhatsApp dan aktifkan notifikasi.</p>
        <h2 style={{fontWeight:700,fontSize:"18px",color:"#0D1B2A",margin:"24px 0 8px"}}>Contoh Keyword Tender yang Efektif</h2>
        <p>Gunakan keyword seperti "tender jalan aspal Jawa Barat 2025", "pengadaan meja kursi sekolah Surabaya", atau "renovasi gedung RSUD Bandung". Semakin spesifik, semakin relevan notifikasi yang kamu terima.</p>
      </div>
      <div style={{marginTop:'48px',padding:'24px',background:'#E8F0FB',borderRadius:'16px',textAlign:'center'}}>
        <h3 style={{fontWeight:800,fontSize:'18px',color:'#0D1B2A',marginBottom:'8px'}}>Siap Mulai Memantau?</h3>
        <p style={{color:'#5A7090',fontSize:'14px',marginBottom:'16px'}}>Daftar gratis dan terima notifikasi pertama dalam 5 menit.</p>
        <a href="/register" style={{display:'inline-block',padding:'12px 28px',background:'#1560BD',color:'white',borderRadius:'10px',fontWeight:700,textDecoration:'none',fontSize:'14px'}}>
          Daftar Gratis Sekarang
        </a>
      </div>
    </div>
  )
}
