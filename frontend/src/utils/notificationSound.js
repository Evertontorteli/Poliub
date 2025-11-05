// Utilitário para tocar som de notificação
export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Cria um som de notificação simples (dois tons curtos)
    const duration = 0.2; // duração de cada tom em segundos
    const frequency1 = 800; // frequência do primeiro tom (Hz)
    const frequency2 = 600; // frequência do segundo tom (Hz)
    const volume = 0.3; // volume (0 a 1)
    
    // Primeiro tom
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    
    oscillator1.frequency.value = frequency1;
    oscillator1.type = 'sine';
    
    gainNode1.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode1.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode1.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    
    oscillator1.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + duration);
    
    // Segundo tom (um pouco depois)
    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.frequency.value = frequency2;
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode2.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
      gainNode2.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + duration);
    }, duration * 1000 + 50);
  } catch (error) {
    // Silenciosamente ignora erros (navegador pode não suportar ou usuário pode ter bloqueado)
    console.debug('Não foi possível tocar som de notificação:', error);
  }
}

