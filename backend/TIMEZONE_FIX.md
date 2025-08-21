# 🔧 Solução para Problema de Timezone (5 horas de diferença - Virginia)

## Problema Identificado
O servidor estava gravando datas com **5 horas de diferença** devido ao Railway estar hospedado em **US East (Virginia, USA)** que está no fuso horário **UTC-5**.

### Detalhes do Problema:
- **Seu horário local**: 23:42 (UTC-3, Horário de Brasília)
- **Horário gravado**: 02:42 (UTC+0, que é 5 horas a mais que Virginia)
- **Railway (Virginia)**: UTC-5
- **Diferença real**: 5 horas (não 3 como pensávamos inicialmente)

## Solução Implementada

### 1. Configuração de Timezone no MySQL
- Forçamos o timezone para UTC (`+00:00`) em todas as conexões
- Configuramos o pool de conexões para usar UTC absoluto
- Aplicamos configurações específicas para o Railway (Virginia)

### 2. Correção dos CONVERT_TZ Incorretos
**PROBLEMA CRÍTICO IDENTIFICADO**: Vários métodos estavam usando `CONVERT_TZ(m.criado_em, '+00:00', 'America/Sao_Paulo')` incorretamente, causando **adição** de horas em vez de subtração.

**Arquivos Corrigidos**:
- `backend/models/movimentacaoModel.js` - `listarTodos()`, `listarPorCaixa()`, `historicoPorAluno()`
- `backend/models/caixaModel.js` - `listarTodos()`
- `backend/models/logModel.js` - `listar()`
- `backend/controllers/boxController.js` - `listarPorAluno()`, `criarBox()`, `atualizarBox()`
- `backend/controllers/logController.js` - `listarLogs()`
- `backend/routes/logRoutes.js` - Filtros de data

**Solução**: Removemos `CONVERT_TZ` e usamos apenas `DATE_FORMAT(m.criado_em, '%Y-%m-%d %H:%i:%s')`

### 3. Configuração Específica para Virginia
- **Railway Location**: US East (Virginia, USA) - UTC-5
- **Target Timezone**: UTC (+00:00) forçado
- **Configuração Agressiva**: SET global e session timezone para UTC

### 4. Arquivos Modificados
- `backend/database.js` - Configuração do pool MySQL
- `backend/middlewares/timezoneMiddleware.js` - Middleware para forçar UTC
- `backend/config/railway.js` - Configurações específicas do Railway (Virginia)
- `backend/index.js` - Aplicação do middleware

### 5. Script de Verificação
Execute para verificar se o timezone está correto:
```bash
cd backend
node scripts/fixTimezone.js
```

## Como Funciona

1. **Gravação**: Todas as datas são gravadas em UTC no banco ✅
2. **Leitura**: As datas são exibidas diretamente do UTC (sem conversão incorreta) ✅
3. **Consistência**: Garantimos que não há diferença de horário ✅
4. **Virginia**: Forçamos UTC para evitar interferência do timezone local

## Verificação

Após o deploy, verifique:
1. ✅ Se as datas estão sendo gravadas corretamente na entrada da caixa
2. ✅ Se o relatório de movimentação por Aluno mostra horário correto (sem +5h)
3. ✅ Se o histórico de movimentações continua funcionando normalmente
4. ✅ Se o script `fixTimezone.js` mostra "✅ Timezone configurado corretamente"
5. ✅ Se `NOW()` e `UTC_TIMESTAMP()` retornam valores iguais

## Rollback

Se necessário, remova:
- `backend/middlewares/timezoneMiddleware.js`
- `backend/config/railway.js`
- As configurações de timezone em `database.js`
- O middleware em `index.js`
- **IMPORTANTE**: Reverta as correções dos `CONVERT_TZ` nos modelos

## Notas Importantes

- **Railway Location**: US East (Virginia, USA) - UTC-5
- **Problema**: Virginia estava interferindo no timezone do MySQL
- **Solução**: Forçar UTC absoluto em todas as conexões
- **ANTES**: `CONVERT_TZ(m.criado_em, '+00:00', 'America/Sao_Paulo')` causava +5h
- **AGORA**: `DATE_FORMAT(m.criado_em, '%Y-%m-%d %H:%i:%s')` exibe horário correto
- O Railway agora deve gravar e exibir datas corretamente sem diferença de horário
