const { DataTypes } = require('sequelize'); // ou mysql2 se não usar ORM
const sequelize = require('../database');

const Box = sequelize.define('Box', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  aluno_id: { type: DataTypes.INTEGER, allowNull: false },
  conteudo: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'boxes', timestamps: true, createdAt: 'criado_em', updatedAt: false });

module.exports = Box;
