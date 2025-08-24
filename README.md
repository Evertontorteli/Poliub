# Poliub

## Backup

O sistema realiza backup do banco (dump .sql compactado em .zip) e permite envio automático para o Mega.

### Dependências (backend)
- `megajs`

Instalação:

```
cd backend
npm i megajs
```

### Configuração (app)
- Acesse Configurações > Backup
- No card Mega, habilite e informe:
  - E‑mail da conta Mega
  - Senha
  - Pasta (ex.: `/Backups`)
- Salve e clique em “Executar backup agora” para testar

Agendamento (opcional): defina dias/horários e timezone. O backup seguirá a mesma conta configurada no Mega.
