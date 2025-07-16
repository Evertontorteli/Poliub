import React from 'react';
import Modal from 'react-modal';

Modal.setAppElement('#root'); // Para acessibilidade

export default function modal({ isOpen, onRequestClose, children }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
      className=" bg-white rounded-xl shadow-lg p-0 w-full max-w-3xl max-h-[90vh] flex flex-auto outline-none relative"
    >
      <button
        onClick={onRequestClose}
        className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-2xl"
        aria-label="Fechar"
      >×</button>
      {/* Conteúdo rola se passar do limite */}
      <div className="overflow-y-auto pt-2 pb-8 px-8 w-full h-full" style={{ maxHeight: '90vh' }}>
        {children}
      </div>
    </Modal>
  );
}
