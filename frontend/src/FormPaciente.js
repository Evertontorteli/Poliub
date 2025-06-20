// src/components/FormPaciente.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function FormPaciente({ onNovoPaciente, pacienteEditando, onFimEdicao }) {
  const [numeroProntuario, setNumeroProntuario] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [mensagem, setMensagem] = useState('');

  // Carrega dados quando estiver editando
  useEffect(() => {
    if (pacienteEditando) {
      setNumeroProntuario(pacienteEditando.numero_prontuario || '');
      setNome(pacienteEditando.nome || '');
      setTelefone(formatarTelefone(pacienteEditando.telefone || ''));
    } else {
      setNumeroProntuario('');
      setNome('');
      setTelefone('');
    }
    setMensagem('');
  }, [pacienteEditando]);

  // Validações de campo
  function validarNomeCompleto(valor) {
    const partes = valor.trim().split(/\s+/);
    if (partes.length < 2) return false;
    return partes.every(p => p.length >= 2 && /^[A-Za-zÀ-ÖØ-öø-ÿ]+$/.test(p));
  }

  function formatarTelefone(campo) {
    const digitos = campo.replace(/\D/g, '');
    if (digitos.length <= 2) {
      return digitos.replace(/^(\d{0,2})/, '($1');
    }
    if (digitos.length <= 6) {
      return digitos.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    }
    return digitos.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  }

  const handleNomeChange = e => setNome(e.target.value);
  const handleTelefoneChange = e => setTelefone(formatarTelefone(e.target.value));
  const handleNumeroChange = e => setNumeroProntuario(e.target.value);

  const handleSubmit = async e => {
    e.preventDefault();
    setMensagem('');

    if (!validarNomeCompleto(nome)) {
      setMensagem('Informe nome e sobrenome, cada um com ao menos 2 letras.');
      return;
    }

    const somenteDigitos = telefone.replace(/\D/g, '');
    if (!(somenteDigitos.length === 10 || somenteDigitos.length === 11)) {
      setMensagem('Telefone inválido. Use 10 ou 11 dígitos.');
      return;
    }

    const dados = {
      numero_prontuario: numeroProntuario.trim() || null,
      nome: nome.trim(),
      telefone: somenteDigitos
    };

    try {
      if (pacienteEditando) {
        await axios.put(`/api/pacientes/${pacienteEditando.id}`, dados);
        setMensagem('Paciente atualizado com sucesso!');
        onNovoPaciente();
      } else {
        await axios.post('/api/pacientes', dados);
        setMensagem('Paciente cadastrado com sucesso!');
        onNovoPaciente();
        setNome('');
        setTelefone('');
        setNumeroProntuario('');
      }
    } catch {
      setMensagem(pacienteEditando
        ? 'Erro ao atualizar paciente.'
        : 'Erro ao cadastrar paciente.'
      );
    }
  };

  return (
    <div className="bg-white mx-auto max-w-lg rounded-2xl p-6">
      <form onSubmit={handleSubmit} autoComplete="off">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {pacienteEditando ? 'Editar Paciente' : 'Novo Paciente'}
        </h2>

        {/* Número do Prontuário (opcional) */}
        <div className="mb-6 max-w-xs">
          <label htmlFor="numero_prontuario" className="block mb-2 font-medium text-gray-700">
            Número do Prontuário <small>(opcional)</small>
          </label>
          <input
            id="numero_prontuario"
            name="numero_prontuario"
            type="text"
            maxLength={8}
            value={numeroProntuario}
            onChange={handleNumeroChange}
            placeholder="Até 8 caracteres"
            className="w-full border rounded px-3 py-2 mt-1"
          />
        </div>

        {/* Nome */}
        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700">
            Nome e Sobrenome
            <input
              className="w-full border rounded px-3 py-2 mt-1"
              required
              value={nome}
              onChange={handleNomeChange}
              placeholder="Nome e sobrenome"
              type="text"
            />
          </label>
        </div>

        {/* Telefone */}
        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700">
            Telefone
            <input
              className="w-full border rounded px-3 py-2 mt-1"
              required
              value={telefone}
              onChange={handleTelefoneChange}
              placeholder="(XX) XXXXX-XXXX"
              type="tel"
            />
          </label>
        </div>

        {/* Botões */}
        <div className="flex flex-col md:flex-row gap-4">
          <button
            type="submit"
            className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold py-2 px-6 rounded-full"
          >
            {pacienteEditando ? 'Atualizar' : 'Cadastrar'}
          </button>
          {pacienteEditando && (
            <button
              type="button"
              className="bg-[#DA3648] text-white hover:bg-[#BC3140] px-4 py-2 rounded-full"
              onClick={onFimEdicao}
            >
              Cancelar
            </button>
          )}
        </div>

        {/* Feedback */}
        {mensagem && (
          <p className="mt-4 text-red-600">
            {mensagem}
          </p>
        )}
      </form>
    </div>
  );
}

export default FormPaciente;
