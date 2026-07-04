'use client'
import { useEffect } from 'react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, title, message, confirmLabel='Ya, Lanjutkan', cancelLabel='Batal', confirmColor='#EF4444', onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div onClick={onCancel} style={{position:'fixed',inset:0,background:'rgba(13,27,42,0.6)',backdropFilter:'blur(6px)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',boxSizing:'border-box'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'20px',width:'100%',maxWidth:'400px',boxShadow:'0 32px 80px rgba(0,0,0,0.25)',boxSizing:'border-box'}}>
        <div style={{padding:'28px 24px 0'}}>
          <h3 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:'20px',fontWeight:800,color:'#0D1B2A',margin:'0 0 10px',lineHeight:1.3}}>{title}</h3>
          <p style={{fontSize:'15px',color:'#5A7090',lineHeight:1.65,margin:0}}>{message}</p>
        </div>
        <div style={{padding:'24px',display:'flex',gap:'10px'}}>
          <button onClick={onCancel} style={{flex:1,padding:'12px 16px',border:'1.5px solid #DDE5EF',borderRadius:'12px',background:'white',color:'#5A7090',fontWeight:600,fontSize:'15px',cursor:'pointer',fontFamily:'inherit'}}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{flex:1,padding:'12px 16px',border:'none',borderRadius:'12px',background:confirmColor,color:'white',fontWeight:700,fontSize:'15px',cursor:'pointer',fontFamily:'inherit'}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
