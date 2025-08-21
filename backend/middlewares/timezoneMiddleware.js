// backend/middlewares/timezoneMiddleware.js

/**
 * Middleware para configurar timezone UTC em todas as conexões do banco
 * Railway está em Virginia (UTC-5), forçamos UTC para evitar problemas
 * Agora opcional: habilite com ENABLE_TZ_MIDDLEWARE=true
 */
const timezoneMiddleware = async (req, res, next) => {
	try {
		// Só executa se explicitamente habilitado
		if (process.env.ENABLE_TZ_MIDDLEWARE !== 'true') {
			return next();
		}

		if (req.app.locals.db) {
			const conn = await req.app.locals.db.getConnection();
			try {
				await conn.query("SET time_zone = '+00:00'");
				await conn.query("SET SESSION time_zone = '+00:00'");
				await conn.query("SET @@session.time_zone = '+00:00'");
				await conn.query("SET @@global.time_zone = '+00:00'");
			} finally {
				conn.release();
			}
		}
		return next();
	} catch (_err) {
		// Silencioso: não falha a requisição por causa de timezone
		return next();
	}
};

module.exports = timezoneMiddleware;
