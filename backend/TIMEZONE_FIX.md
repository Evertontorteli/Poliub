# 🔧 Solução para Problema de Timezone

Este documento registra como padronizamos o timezone do sistema.

- Banco e servidor operam em UTC.
- Conversões para exibição são feitas para `America/Sao_Paulo` quando necessário.
- No MySQL, usamos `SET time_zone = '+00:00'` por conexão e `DATE_FORMAT(CONVERT_TZ(...))` na leitura quando exibimos horários para o usuário.

Verificações úteis:
- `SELECT @@global.time_zone, @@session.time_zone, @@system_time_zone;`
- `SELECT NOW(), UTC_TIMESTAMP();` (devem coincidir)

Script utilitário: `backend/scripts/fixTimezone.js` ajuda a inspecionar e forçar a configuração localmente.
