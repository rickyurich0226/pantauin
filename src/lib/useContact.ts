'use client'
import { useState, useEffect } from 'react'
export function useContact() {
  const [email, setEmail] = useState('pantau.inofficial@gmail.com')
  const [wa, setWa] = useState('https://wa.me/6287890144122')
  const [waLabel, setWaLabel] = useState('@pantauin')
  useEffect(() => {
    fetch('/api/superadmin/content').then(r=>r.ok?r.json():null).then(d=>{
      if(!d) return
      if(d.contact_email) setEmail(d.contact_email)
      if(d.contact_wa) setWa(d.contact_wa)
      if(d.contact_wa_label) setWaLabel(d.contact_wa_label)
    }).catch(()=>{})
  },[])
  return { email, wa, waLabel }
}
