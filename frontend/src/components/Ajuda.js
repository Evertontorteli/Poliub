import React from 'react';
import { MessageCircle, Phone, } from 'lucide-react';

export default function Ajuda() {
  const contatos = [
    { icon: <Phone size={32} />, label: 'Policlínica (Ramal 01)', link: 'tel:+551727861140' },
    { icon: <MessageCircle size={32} className="text-[#25D366]" />, label: 'Melissa (Secretária)', link: 'https://wa.me/5517997664221' },
    { icon: <MessageCircle size={32} className="text-[#25D366]" />, label: 'José Antônio (Secretário de Apoio)', link: 'https://wa.me/5518996794681' },
    { icon: <MessageCircle size={32} className="text-[#25D366]" />, label: 'Everton Torteli (Desenvolvedor)', link: 'https://wa.me/5517997190024' },
    
    //{ icon: <LifeBuoy size={32} />, label: 'Suporte ao cliente', link: '/suporte' },
    //{ icon: <Laptop size={32} />, label: 'Acesso Remoto', link: '/acesso-remoto' },
  ];

  return (
    <div className="max-w-auto mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-center mb-2">Entre em contato conosco</h1>
      <p className="text-center text-sm text-gray-600 mb-8">
        Horário de atendimento:<br/>
        Segunda a Sexta: 08:00 às 12:00 e 13:00 às 22:00
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {contatos.map((c, i) => (
          <a
            key={i}
            href={c.link}
            target={c.link.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow hover:shadow-md transition"
          >
            <div className="mb-3">{c.icon}</div>
            <span className="text-center text-sm font-medium text-gray-800">{c.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
