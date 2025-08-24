// backend/services/upload/mega.js

// Serviço de upload baseado em megajs
// Instale: npm i megajs

function safeRequire(name) {
	try { return require(name); } catch (e) {
		const err = new Error(`Dependência ausente: ${name}. Instale com: npm i ${name}`);
		err.code = 'DEPENDENCY_MISSING';
		throw err;
	}
}

async function connect({ email, password }) {
	const mega = safeRequire('megajs');
	return await new Promise((resolve, reject) => {
		const storage = new mega.Storage({ email, password }, (err) => err && reject(err));
		storage.on('ready', () => resolve(storage));
		storage.on('error', reject);
	});
}

function findChildByName(children, name) {
	return (children || []).find((c) => (c.name || '').toLowerCase() === String(name).toLowerCase());
}

async function ensureFolder(storage, folderPath) {
	const parts = String(folderPath || '/Backups').replace(/^\/+/, '').split('/').filter(Boolean);
	let current = storage.root;
	for (const part of parts) {
		let next = findChildByName(current.children || [], part);
		if (!next) {
			next = await new Promise((resolve, reject) => {
				current.mkdir({ name: part }, (err, folder) => err ? reject(err) : resolve(folder));
			});
		}
		current = next;
	}
	return current; // pasta final
}

async function uploadFile(zipPath, filename, cfg) {
	const fs = require('fs');
	if (!fs.existsSync(zipPath)) throw new Error('Arquivo de backup não encontrado para upload.');
	if (!cfg || !cfg.email || !cfg.password) {
		throw new Error('Configuração do Mega inválida. Forneça email e password.');
	}
	const storage = await connect({ email: cfg.email, password: cfg.password });
	let folder;
	try {
		folder = await ensureFolder(storage, cfg.folder || '/Backups');
	} catch (e) {
		// fallback para raiz se não conseguir criar/abrir pasta
		folder = storage.root;
	}

	const size = fs.statSync(zipPath).size;
	const stream = fs.createReadStream(zipPath);

	const uploaded = await new Promise((resolve, reject) => {
		let timedOut = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			try { stream.destroy(new Error('timeout')); } catch {}
			reject(new Error('Upload para Mega expirou (timeout).'));
		}, Number(process.env.MEGA_UPLOAD_TIMEOUT_MS || 10 * 60 * 1000)); // 10min padrão

		function done(err, result) {
			clearTimeout(timeout);
			if (timedOut) return;
			return err ? reject(err) : resolve(result);
		}

		const targetHasUpload = typeof folder.upload === 'function';
		const startUpload = (target) => {
			try {
				const up = target.upload ? target.upload({ name: filename, size }) : null;
				if (!up) return done(new Error('API do Mega indisponível para upload neste alvo.'));
				stream.pipe(up);
				up.on('complete', () => done(null, { ok: true, name: filename, size }));
				up.on('error', (e) => done(e));
				stream.on('error', (e) => done(e));
			} catch (e) {
				done(e);
			}
		};

		if (targetHasUpload) startUpload(folder);
		else startUpload(storage.root);
	});

	try { storage.close && storage.close(); } catch {}
	return { ok: true, filename, size: uploaded.size || size };
}

async function cleanupOlderThanDays({ email, password, folder, days = 30, prefix = 'backup_' }) {
	const ms = Number(days) * 24 * 60 * 60 * 1000;
	const now = Date.now();
	const storage = await connect({ email, password });
	const target = await ensureFolder(storage, folder || '/Backups');

	const deletions = [];
	for (const child of target.children || []) {
		if (child.directory) continue;
		const name = child.name || '';
		if (!name.startsWith(prefix)) continue;
		const ts = child.timestamp ? child.timestamp * 1000 : now;
		if (now - ts > ms) {
			await new Promise((resolve, reject) => child.delete((err) => err ? reject(err) : resolve()));
			deletions.push(name);
		}
	}
	try { storage.close && storage.close(); } catch {}
	return { ok: true, deleted: deletions };
}

async function testConnection(cfg) {
	try {
		const storage = await connect({ email: cfg.email, password: cfg.password });
		await ensureFolder(storage, cfg.folder || '/Backups');
		try { storage.close && storage.close(); } catch {}
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e.message };
	}
}

module.exports = { uploadFile, cleanupOlderThanDays, testConnection };
