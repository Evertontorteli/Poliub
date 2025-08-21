// backend/config/railway.js

/**
 * Configurações específicas para o Railway
 * Railway está hospedado em US East (Virginia, USA) - UTC-5
 * Precisamos forçar UTC para evitar problemas de timezone
 */

module.exports = {
  // Configurações de timezone para MySQL no Railway
  mysql: {
    timezone: '+00:00', // Força UTC absoluto
    dateStrings: false,
    // Configurações adicionais para garantir UTC
    initSql: [
      "SET time_zone = '+00:00'",
      "SET SESSION time_zone = '+00:00'",
      "SET @@session.time_zone = '+00:00'",
      "SET @@global.time_zone = '+00:00'"
    ]
  },
  
  // Configurações de ambiente
  env: {
    NODE_ENV: 'production',
    TZ: 'UTC' // Força UTC no Node.js também
  },
  
  // Configurações de aplicação
  app: {
    timezone: 'UTC',
    defaultLocale: 'pt-BR',
    // Informações sobre o timezone do Railway
    railwayTimezone: 'UTC-5 (Virginia, USA)',
    targetTimezone: 'UTC (forçado)'
  }
};
