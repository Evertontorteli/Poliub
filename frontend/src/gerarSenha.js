const bcrypt = require('bcryptjs');
const senhaDigitada = '123456'; // coloque a senha que você está tentando no frontend
const hashDoBanco = '$2a$12$M9FTwdFY2DeuHuDzORskteCDvHLh2nm9AWgMurAVOJoMqM5W7lWFG';

bcrypt.compare(senhaDigitada, hashDoBanco, (err, result) => {
  if (err) throw err;
  console.log('Match?', result); // true = senha bateu!
});
