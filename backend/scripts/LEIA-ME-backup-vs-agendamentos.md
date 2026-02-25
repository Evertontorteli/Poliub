# Por que os agendamentos sumiram se o backup é o mesmo e o log tem criação?

O backup do sistema faz **dump completo** do banco (todas as tabelas, incluindo `agendamentos` e `logs`) no **mesmo** arquivo `.sql`. Mesmo assim, depois de restaurar, pode acontecer de:

- a tabela **`logs`** ter registros de "criou agendamento"
- e a tabela **`agendamentos`** não ter esses registros (ou estar vazia para certo período)

As causas mais prováveis são as abaixo.

---

## 1. Restauração com erro só na tabela `agendamentos`

Na hora de **restaurar** o `.sql` (importar no MySQL), os `INSERT` da tabela **`agendamentos`** podem **falhar** sem o MySQL avisar de forma óbvia, e o resto do script (incluindo `logs`) continua. Isso costuma acontecer por:

- **Chave estrangeira (FK):** se `agendamentos` referencia `pacientes`, `alunos` ou `disciplinas`, e no momento do `INSERT` o registro referenciado ainda não existir (ordem das tabelas no dump), o MySQL pode rejeitar a linha e seguir em frente.
- **Duplicata de chave:** se o dump tiver `INSERT` com IDs que já existem no banco onde você está restaurando, esses inserts falham e os registros “novos” não entram.

**O que fazer:** ao restaurar, use um cliente que mostre erros (por exemplo o próprio MySQL na linha de comando) e confira se aparecem mensagens de erro referentes à tabela `agendamentos`. Exemplo:

```bash
mysql -u usuario -p nome_do_banco < backup_xxx.sql
# Ver se há linhas de erro após a execução
```

---

## 2. Conferir se os agendamentos estão DENTRO do arquivo de backup

Às vezes o backup foi gerado **quando a tabela `agendamentos` já estava vazia** (ou já sem os de 2025), e os logs eram de uma época em que ainda existiam criações. Nesse caso, o “mesmo” backup já nasce sem esses agendamentos.

**O que fazer:** abra o arquivo `.sql` do backup (ou o `.zip` descompactado) e procure:

1. **`INSERT INTO \`agendamentos\``**  
   - Existem linhas de INSERT para agendamentos?  
   - Essas linhas contêm datas de 2025?

2. **`INSERT INTO \`logs\``**  
   - Existem logs com "criou" e "agendamento"?

- Se no **mesmo** arquivo existem **logs de criação** mas **não existem** os `INSERT INTO agendamentos` correspondentes (ou não existem inserts de 2025), então o backup foi gerado quando esses agendamentos já não estavam mais no banco (por exemplo já tinham sido deletados).
- Se os **dois** existem no arquivo (logs e inserts em `agendamentos` com 2025), então o problema é na **restauração** (item 1 acima).

---

## 3. Ordem das tabelas no dump e FKs

O `mysqldump` grava as tabelas em uma ordem que pode não ser a ideal para **restaurar** em um banco que já tem estrutura e outras tabelas. Se você restaura em um banco que já tem `pacientes`, `alunos`, `disciplinas` mas **esvazia** só `agendamentos` antes de importar, em geral não há problema. Se você restaura **tudo** em cima de um banco já existente, conflitos de FK ou de chave primária podem fazer parte dos `INSERT INTO agendamentos` falharem.

**Sugestão:** ao restaurar, prefira fazer em um banco **novo** (ou dropar e recriar o schema) e importar o `.sql` inteiro de uma vez, para preservar a consistência entre `logs` e `agendamentos`.

---

## 4. Resumo prático

| Situação | O que provavelmente aconteceu |
|----------|-------------------------------|
| No **.sql** tem INSERT em `agendamentos` com 2025 e tem logs "criou" | Backup está correto; ao restaurar, alguns INSERT em `agendamentos` podem ter falhado (FK, duplicata, etc.). |
| No **.sql** **não** tem INSERT em `agendamentos` de 2025, mas tem logs "criou" | O backup foi gerado quando esses agendamentos já não estavam no banco (já tinham sido deletados antes do backup). |
| Backup é o mesmo e você restaurou em **outro** banco | Pode haver diferença de dados (por exemplo, outro ambiente); confira se está usando o mesmo banco que a aplicação. |

Rode também o **`diagnostico-agendamentos-vs-logs.sql`** no banco **atual** (onde a aplicação aponta): ele mostra quantos agendamentos existem hoje, quantos logs de criação e exclusão existem, e quais IDs foram criados (estão no log) mas não existem mais na tabela `agendamentos`.
