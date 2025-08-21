// backend/scripts/fixTimezone.js

/**
 * Script para verificar e corrigir timezone do banco de dados
 * Railway está em Virginia (UTC-5), precisamos forçar UTC
 * Execute: node scripts/fixTimezone.js
 */

const { initDb, getConnection } = require('../database');

async function checkAndFixTimezone() {
  console.log('🔍 Verificando configuração de timezone do banco...');
  console.log('📍 Railway está em US East (Virginia, USA) - UTC-5');
  console.log('🎯 Objetivo: Forçar UTC (+00:00) para evitar problemas de timezone\n');
  
  try {
    // Inicializa o banco primeiro
    console.log('🚀 Inicializando conexão com o banco...');
    await initDb();
    
    const conn = await getConnection();
    
    try {
      // Verifica timezone atual
      const [timezoneResult] = await conn.query('SELECT @@global.time_zone, @@session.time_zone, @@system_time_zone');
      console.log('📊 Timezone atual:');
      console.log(`   Global: ${timezoneResult[0]['@@global.time_zone']}`);
      console.log(`   Session: ${timezoneResult[0]['@@session.time_zone']}`);
      console.log(`   System: ${timezoneResult[0]['@@system_time_zone']}`);
      
      // Verifica se o timezone está correto
      if (timezoneResult[0]['@@session.time_zone'] !== '+00:00') {
        console.log('\n⚠️  Configurando timezone para UTC...');
        
        // Configura timezone para UTC (mais agressivo)
        await conn.query("SET time_zone = '+00:00'");
        await conn.query("SET SESSION time_zone = '+00:00'");
        await conn.query("SET @@session.time_zone = '+00:00'");
        await conn.query("SET @@global.time_zone = '+00:00'");
        
        // Verifica novamente
        const [newTimezoneResult] = await conn.query('SELECT @@session.time_zone, @@global.time_zone');
        console.log(`✅ Timezone configurado:`);
        console.log(`   Session: ${newTimezoneResult[0]['@@session.time_zone']}`);
        console.log(`   Global: ${newTimezoneResult[0]['@@global.time_zone']}`);
      } else {
        console.log('\n✅ Timezone já está configurado corretamente para UTC');
      }
      
      // Testa com uma data atual
      const [dateResult] = await conn.query('SELECT NOW() as NOW, UTC_TIMESTAMP() as UTC_TIMESTAMP, SYSDATE() as SYSDATE');
      console.log('\n📅 Teste de datas:');
      console.log(`   NOW(): ${dateResult[0].NOW}`);
      console.log(`   UTC_TIMESTAMP(): ${dateResult[0].UTC_TIMESTAMP}`);
      console.log(`   SYSDATE(): ${dateResult[0].SYSDATE}`);
      
      // Verifica se são iguais (deveriam ser se timezone estiver correto)
      if (dateResult[0].NOW.getTime() === dateResult[0].UTC_TIMESTAMP.getTime()) {
        console.log('✅ Datas estão sincronizadas - timezone configurado corretamente');
      } else {
        console.log('⚠️  Datas não estão sincronizadas - verificar configuração');
        const diffMs = Math.abs(dateResult[0].NOW.getTime() - dateResult[0].UTC_TIMESTAMP.getTime());
        const diffHours = diffMs / (1000 * 60 * 60);
        console.log(`   Diferença: ${diffHours.toFixed(2)} horas`);
      }
      
      // Teste específico para Virginia
      console.log('\n🌍 Teste específico para Railway (Virginia):');
      const [virginiaTest] = await conn.query(`
        SELECT 
          TIMESTAMP('2024-01-01 23:42:00') as horario_brasilia,
          CONVERT_TZ(TIMESTAMP('2024-01-01 23:42:00'), '-03:00', '+00:00') as horario_utc,
          CONVERT_TZ(TIMESTAMP('2024-01-01 23:42:00'), '-03:00', '-05:00') as horario_virginia
      `);
      console.log(`   Horário Brasília (23:42): ${virginiaTest[0].horario_brasilia}`);
      console.log(`   Horário UTC: ${virginiaTest[0].horario_utc}`);
      console.log(`   Horário Virginia: ${virginiaTest[0].horario_virginia}`);
      
    } finally {
      conn.release();
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar timezone:', error.message);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  checkAndFixTimezone()
    .then(() => {
      console.log('\n✅ Verificação de timezone concluída');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na verificação:', error);
      process.exit(1);
    });
}

module.exports = { checkAndFixTimezone };
