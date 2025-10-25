import React from 'react';
import Modal from 'react-modal';

Modal.setAppElement('#root'); // Para acessibilidade

export default function ModalCustom({ isOpen, onRequestClose, onClose, children, size = 'md', shouldCloseOnOverlayClick = true, shouldCloseOnEsc = true }) {
  const handleClose = onRequestClose || onClose;
  const contentSizeClasses =
    size === 'xl' ? 'w-full max-w-6xl h-[85vh]'
    : size === 'lg' ? 'w-full max-w-5xl h-[78vh]'
    : size === 'sm' ? 'w-full max-w-md'
    : 'w-full max-w-3xl h-[72vh]';
  const innerClasses =
    size === 'sm'
      ? 'overflow-y-auto pt-2 pb-20 px-8 w-full'
      : 'overflow-y-auto pt-2 pb-20 px-8 w-full h-full';
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick={shouldCloseOnOverlayClick}
      shouldCloseOnEsc={shouldCloseOnEsc}
      overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
      className={`
        bg-white rounded-xl shadow-lg p-0
        w-full
        ${contentSizeClasses}
        flex flex-col outline-none relative
      `}
      // w-auto: a largura acompanha o conteúdo!
      // max-w-3xl: limita o tamanho máximo (ajuste para o que você quiser)
      // min-w-[240px]: evita que fique muito pequeno
    >
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-2xl"
        aria-label="Fechar"
      >×</button>
      <div className={innerClasses}>
        {children}
      </div>
    </Modal>
  );
}
