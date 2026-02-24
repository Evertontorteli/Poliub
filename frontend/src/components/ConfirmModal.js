import React from "react";
import Modal from "react-modal";
import { AlertTriangle } from "lucide-react";

Modal.setAppElement("#root");

/**
 * Modal de confirmação/aviso padrão do sistema.
 * @param {boolean} isOpen
 * @param {function} onClose - Chamado ao cancelar ou fechar
 * @param {function} onConfirm - Chamado ao confirmar
 * @param {string} title - Título do aviso
 * @param {string} message - Mensagem de confirmação
 * @param {string} confirmLabel - Texto do botão de confirmar (ex: "Desativar")
 * @param {string} cancelLabel - Texto do botão cancelar (ex: "Cancelar")
 * @param {string} variant - "warning" (amarelo) ou "danger" (vermelho)
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "warning",
}) {
  const isDanger = variant === "danger";
  const confirmBtnClass = isDanger
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-amber-600 hover:bg-amber-700 text-white";
  const iconBg = isDanger ? "bg-red-100" : "bg-amber-100";
  const iconColor = isDanger ? "text-red-600" : "text-amber-600";

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[60]"
      className="bg-white rounded-xl shadow-xl p-0 w-full max-w-md outline-none mx-4"
    >
      <div className="p-6">
        <div className={`flex items-center gap-3 mb-4 ${iconBg} rounded-lg p-3 w-fit`}>
          <AlertTriangle className={`shrink-0 ${iconColor}`} size={24} aria-hidden />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-700 mb-6 pl-1">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg font-medium transition ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
