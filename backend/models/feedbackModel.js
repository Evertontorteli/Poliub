const { getConnection } = require('../database');

async function ensureSchema() {
  const conn = await getConnection();
  try {
    const [[dbRow]] = await conn.query('SELECT DATABASE() AS db');
    const db = dbRow.db;
    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'feedbacks'`,
      [db]
    );
    if (tables.length === 0) {
      await conn.query(
        `CREATE TABLE feedbacks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          user_role VARCHAR(32) NULL,
          nps_score TINYINT NULL,
          comment TEXT NULL,
          page VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_created_at (created_at),
          INDEX idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }
  } finally {
    conn.release();
  }
}

const Feedback = {
  inserir: async ({ userId, userRole, npsScore, comment, page }) => {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        'INSERT INTO feedbacks (user_id, user_role, nps_score, comment, page) VALUES (?,?,?,?,?)',
        [userId || null, userRole || null, npsScore ?? null, comment || null, page || null]
      );
      return { id: result.insertId };
    } finally {
      conn.release();
    }
  },

  listar: async ({ limit = 100, offset = 0, startDate, endDate, userRole, minScore, maxScore, userId, q, orderBy, orderDir } = {}) => {
    const conn = await getConnection();
    try {
      const where = [];
      const params = [];
      if (startDate) { where.push('DATE(created_at) >= ?'); params.push(startDate); }
      if (endDate) { where.push('DATE(created_at) <= ?'); params.push(endDate); }
      if (userRole) { where.push('user_role = ?'); params.push(userRole); }
      if (userId) { where.push('user_id = ?'); params.push(Number(userId)); }
      if (minScore != null) { where.push('nps_score >= ?'); params.push(Number(minScore)); }
      if (maxScore != null) { where.push('nps_score <= ?'); params.push(Number(maxScore)); }
      if (q) { where.push('(comment LIKE ? OR page LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
      const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
      // Ordenação segura
      let orderSql = 'ORDER BY created_at DESC';
      const allowed = {
        created_at: 'created_at',
        nps_score: 'nps_score',
        user_role: 'user_role'
      };
      const col = allowed[String(orderBy || '').toLowerCase()];
      if (col) {
        const dir = String(orderDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        orderSql = `ORDER BY ${col} ${dir}`;
      }

      params.push(Number(limit), Number(offset));
      const [rows] = await conn.query(
        `SELECT * FROM feedbacks ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
        params
      );
      return rows;
    } finally {
      conn.release();
    }
  },

  resumo: async ({ days = 30, startDate, endDate } = {}) => {
    const conn = await getConnection();
    try {
      let whereSql = 'WHERE 1=1';
      const params = [];
      if (startDate) { whereSql += ' AND DATE(created_at) >= ?'; params.push(startDate); }
      if (endDate) { whereSql += ' AND DATE(created_at) <= ?'; params.push(endDate); }
      if (!startDate && !endDate) { whereSql += ' AND created_at >= (NOW() - INTERVAL ? DAY)'; params.push(Number(days)); }
      const [rows] = await conn.query(
        `SELECT 
           COUNT(*) AS total,
           AVG(nps_score) AS avg_nps,
           SUM(CASE WHEN nps_score BETWEEN 9 AND 10 THEN 1 ELSE 0 END) AS promoters,
           SUM(CASE WHEN nps_score BETWEEN 7 AND 8 THEN 1 ELSE 0 END) AS passives,
           SUM(CASE WHEN nps_score BETWEEN 0 AND 6 THEN 1 ELSE 0 END) AS detractors
         FROM feedbacks
         ${whereSql}`,
        params
      );
      const r = rows[0] || {};
      const promoters = Number(r.promoters || 0);
      const detractors = Number(r.detractors || 0);
      const total = Number(r.total || 0);
      const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
      return { total, avg_nps: r.avg_nps ? Number(r.avg_nps) : null, promoters, passives: Number(r.passives || 0), detractors, nps };
    } finally {
      conn.release();
    }
  }
};

module.exports = { ...Feedback, ensureSchema };


