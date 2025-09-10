// src/components/FormPaciente.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from './context/AuthContext';
import PaginaTratamento from './pages/PaginaTratamento';
import 'react-toastify/dist/ReactToastify.css';

function FormPaciente({ onNovoPaciente, pacienteEditando, onFimEdicao }) {
  const { user } = useAuth();
  const isAluno = user?.role === 'aluno';

  const [numeroProntuario, setNumeroProntuario] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('dados'); // <-- State das abas
  const [formData, setFormData] = useState({
    tipo_paciente: 'NORMAL',
    numero_gaveta: '',
    rg: '',
    cpf: '',
    cep: '',
    data_nascimento: '',
    idade: '',
    endereco: '',
    numero: '',
    cidade: '',
    observacao: '',
    responsavel_nome: '',
    responsavel_telefone: ''
  });

  useEffect(() => {
    if (pacienteEditando) {
      setNumeroProntuario(pacienteEditando.numero_prontuario || '');
      setNome(pacienteEditando.nome || '');
      setTelefone(formatarTelefone(pacienteEditando.telefone || ''));
      setFormData({
        tipo_paciente: pacienteEditando.tipo_paciente || 'NORMAL',
        numero_gaveta: pacienteEditando.numero_gaveta || '',
        rg: pacienteEditando.rg || '',
        cpf: pacienteEditando.cpf || '',
        cep: pacienteEditando.cep || '',
        data_nascimento: pacienteEditando.data_nascimento
          ? pacienteEditando.data_nascimento.slice(0, 10)
          : '',
        idade: pacienteEditando.idade || '',
        endereco: pacienteEditando.endereco || '',
        numero: pacienteEditando.numero || '',
        cidade: pacienteEditando.cidade || '',
        observacao: pacienteEditando.observacao || '',
        responsavel_nome: pacienteEditando.responsavel_nome || '',
        responsavel_telefone: formatarTelefone(pacienteEditando.responsavel_telefone || '')
      });
      setAbaAtiva('dados'); // sempre inicia na aba Dados
    } else {
      resetForm();
      setAbaAtiva('dados');
    }
    setMensagemErro('');
  }, [pacienteEditando]);

  function resetForm() {
    setNumeroProntuario('');
    setNome('');
    setTelefone('');
    setFormData({
      tipo_paciente: 'NORMAL',
      numero_gaveta: '',
      rg: '',
      cpf: '',
      cep: '',
      data_nascimento: '',
      idade: '',
      endereco: '',
      numero: '',
      cidade: '',
      observacao: '',
      responsavel_nome: '',
      responsavel_telefone: ''
    });
  }

  function formatarTelefone(campo) {
    const d = campo.replace(/\D/g, '');
    if (!d) return '';
    if (d.length <= 2) return d.replace(/^(\d{0,2})/, '($1');
    if (d.length <= 6) return d.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  }

  function calcularIdade(dataStr) {
    const hoje = new Date();
    const nasc = new Date(dataStr);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    if (
      hoje.getMonth() < nasc.getMonth() ||
      (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
    ) {
      idade--;
    }
    return idade;
  }

  function validarCPF(cpf) {
    const str = cpf.replace(/\D/g, '');
    if (str.length !== 11) return false;
    if (/^(\d)\1+$/.test(str)) return false;
    const calc = pos => {
      let sum = 0;
      for (let i = 0; i < pos; i++) {
        sum += parseInt(str.charAt(i)) * (pos + 1 - i);
      }
      let res = (sum * 10) % 11;
      return res === 10 ? 0 : res;
    };
    return (
      calc(9) === parseInt(str.charAt(9)) &&
      calc(10) === parseInt(str.charAt(10))
    );
  }

  function validarNomeCompleto(valor) {
    const partes = valor.trim().split(/\s+/);
    if (partes.length < 2) return false;
    return partes.every(p => p.length >= 2);
  }

  async function handleCepBlur() {
    const cepLimpo = formData.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    try {
      const { data } = await axios.get(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );
      if (!data.erro) {
        setFormData(fd => ({
          ...fd,
          endereco: data.logradouro || '',
          cidade: data.localidade || ''
        }));
      }
    } catch {
      /* ignora */
    }
  }

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(fd => ({ ...fd, [name]: value }));
  };

  const handleDateChange = e => {
    const val = e.target.value;
    setFormData(fd => ({
      ...fd,
      data_nascimento: val,
      idade: val ? calcularIdade(val) : ''
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMensagemErro('');

    if (!validarNomeCompleto(nome)) {
      setMensagemErro('Digite o nome completo (nome e sobrenome, pelo menos 2 letras cada).');
      return;
    }

    const tipo = (formData.tipo_paciente || 'NORMAL').toUpperCase();
    const somenteDigitos = telefone.replace(/\D/g, '');
    const respDigitos = (formData.responsavel_telefone || '').replace(/\D/g, '');

    if (tipo === 'NORMAL') {
      if (somenteDigitos.length !== 10 && somenteDigitos.length !== 11) {
        setMensagemErro('Telefone obrigatório (10 ou 11 dígitos) para paciente NORMAL.');
        return;
      }
    } else {
      if (somenteDigitos && (somenteDigitos.length !== 10 && somenteDigitos.length !== 11)) {
        setMensagemErro('Telefone inválido. Use 10 ou 11 dígitos.');
        return;
      }
      if (respDigitos && (respDigitos.length !== 10 && respDigitos.length !== 11)) {
        setMensagemErro('Telefone do responsável inválido. Use 10 ou 11 dígitos.');
        return;
      }
    }

    // Validação telefone duplicado
    try {
      if (somenteDigitos) {
        const { data } = await axios.get(`/api/pacientes?telefone=${somenteDigitos}`);
        const existeOutro = Array.isArray(data) && data.some(p =>
          String(p.id) !== String(pacienteEditando?.id)
        );
        if (existeOutro) {
          setMensagemErro('Já existe um paciente cadastrado com este telefone.');
          return;
        }
      }
    } catch (err) {
      // ignora erro do endpoint
    }

    if (!isAluno && formData.cpf && !validarCPF(formData.cpf)) {
      setMensagemErro('CPF inválido.');
      return;
    }

    const dados = {
      numero_prontuario: isAluno ? null : (numeroProntuario.trim() || null),
      nome: nome.trim(),
      telefone: somenteDigitos || null,
      numero_gaveta: isAluno ? null : (formData.numero_gaveta || null),
      rg: isAluno ? null : (formData.rg || null),
      cpf: isAluno ? null : (formData.cpf || null),
      cep: isAluno ? null : (formData.cep || null),
      data_nascimento: isAluno ? null : (formData.data_nascimento || null),
      idade: isAluno ? null : (formData.idade || null),
      endereco: isAluno ? null : (formData.endereco || null),
      numero: isAluno ? null : (formData.numero || null),
      cidade: formData.cidade || null,
      observacao: isAluno ? null : (formData.observacao || null),
      tipo_paciente: formData.tipo_paciente || 'NORMAL',
      responsavel_nome: formData.responsavel_nome || null,
      responsavel_telefone: respDigitos || null,
    };

    try {
      if (pacienteEditando) {
        await axios.put(`/api/pacientes/${pacienteEditando.id}`, dados);
        toast.success(`Paciente ${nome.trim()} atualizado com sucesso!`);
        setTimeout(() => onNovoPaciente(), 500);
      } else {
        await axios.post('/api/pacientes', dados);
        toast.success(`Paciente ${nome.trim()} cadastrado com sucesso!`);
        resetForm();
        setNome('');
        setTelefone('');
        setNumeroProntuario('');
        setTimeout(() => onNovoPaciente(), 500);
      }
    } catch (err) {
      let msg = 'Erro ao cadastrar/atualizar paciente.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.error) {
          msg = err.response.data.error;
        } else if (err.response.data.message) {
          msg = err.response.data.message;
        }
      } else if (err.message) {
        msg = err.message;
      }
      setMensagemErro(msg);
    }
  };

  return (
    <div className="bg-white mx-auto max-w-auto rounded-2xl p-6">

      {/* Abas no topo */}
      <div className="flex border-b mb-6 gap-6">
        <button
          className={`relative pb-2 text-sm md:text-base transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:rounded after:transition-all after:duration-200 after:ease-out after:w-0 focus:outline-none
            ${abaAtiva === 'dados' ? 'text-gray-900 after:w-full after:bg-blue-300' : 'text-gray-600 hover:text-gray-800 hover:after:w-full hover:after:bg-gray-300'}`}
          onClick={() => setAbaAtiva('dados')}
        >
          Dados
        </button>
        <button
          className={`relative pb-2 text-sm md:text-base transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:rounded after:transition-all after:duration-200 after:ease-out after:w-0 focus:outline-none
            ${abaAtiva === 'tratamento' ? 'text-gray-900 after:w-full after:bg-blue-300' : 'text-gray-600 hover:text-gray-800 hover:after:w-full hover:after:bg-gray-300'}`}
          onClick={() => setAbaAtiva('tratamento')}
          disabled={!pacienteEditando}
        >
          Tratamento
        </button>
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === 'dados' && (
        <form onSubmit={handleSubmit} autoComplete="off">
          <h2 className="text-2xl font-bold mb-6 text-[#0095DA]">
            {pacienteEditando ? 'Editar Paciente' : 'Novo Paciente'}
          </h2>

          {/* Tipo de paciente */}
          <div className="mb-2 group">
            <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
              Tipo de paciente
            </label>
            <select
              name="tipo_paciente"
              value={formData.tipo_paciente}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="NORMAL">Normal</option>
              <option value="PEDIATRICO">Pediátrico</option>
              <option value="GERIATRICO">Geriátrico</option>
            </select>
            {formData.tipo_paciente !== 'NORMAL' && (
              <p className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded mt-2 px-3 py-2 text-sm">
                Para pacientes pediátricos e geriátricos o telefone é opcional.
              </p>
            )}
          </div>

          {/* Campos visíveis só para outros perfis */}
          {!isAluno && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="group">
                <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                  Número do Prontuário <small>(opcional)</small>
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={numeroProntuario}
                  onChange={e => setNumeroProntuario(e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="group">
                <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                  Nº Gaveta <small>(opcional)</small>
                </label>
                <input
                  type="text"
                  name="numero_gaveta"
                  value={formData.numero_gaveta}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          )}

          {/* Nome */}
          <div className="mb-6 group">
            <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
              Nome e Sobrenome
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          {/* Telefone */}
          <div className="mb-6 group">
            <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
              {formData.tipo_paciente === 'NORMAL' ? 'Telefone' : 'Telefone (opcional)'}
            </label>
            <input
              type="tel"
              required={formData.tipo_paciente === 'NORMAL'}
              value={telefone}
              onChange={e => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(XX) XXXXX-XXXX"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Campos do responsável (opcionais; exibidos quando não NORMAL) */}
          {formData.tipo_paciente !== 'NORMAL' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="group">
                <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                  Nome do responsável <small>(opcional)</small>
                </label>
                <input
                  type="text"
                  name="responsavel_nome"
                  value={formData.responsavel_nome}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="group">
                <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                  Telefone do responsável <small>(opcional)</small>
                </label>
                <input
                  type="tel"
                  name="responsavel_telefone"
                  value={formData.responsavel_telefone}
                  onChange={e => setFormData(fd => ({ ...fd, responsavel_telefone: formatarTelefone(e.target.value) }))}
                  placeholder="(XX) XXXXX-XXXX"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          )}

          {/* Cidade (opcional) visível também para Aluno) */}
          {isAluno && (
            <div className="mb-6 group">
              <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                Cidade <small>(opcional)</small>
              </label>
              <input
                type="text"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          )}

          {/* Restante dos campos apenas se NÃO for aluno */}
          {!isAluno && (
            <>
              {/* RG / CPF */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="group">
                  <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                    RG <small>(opcional)</small>
                  </label>
                  <input
                    type="text"
                    name="rg"
                    value={formData.rg}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="group">
                  <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                    CPF <small>(opcional)</small>
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    placeholder="000.000.000-00"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              {/* Nasc. / Idade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="group">
                  <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                    Data de Nascimento <small>(opcional)</small>
                  </label>
                  <input
                    type="date"
                    name="data_nascimento"
                    value={formData.data_nascimento}
                    onChange={handleDateChange}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="group">
                  <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                    Idade
                  </label>
                  <input
                    type="number"
                    readOnly
                    name="idade"
                    value={formData.idade}
                    className="w-full bg-gray-100 border rounded px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>
              {/* CEP */}
              <div className="mb-6 group">
                <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                  CEP <small>(opcional)</small>
                </label>
                <input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              {/* Endereço / Nº / Cidade */}
              <div className="mb-6 group">
                <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                  Endereço <small>(opcional)</small>
                </label>
                <input
                  type="text"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="group">
                  <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                    Número <small>(opcional)</small>
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="group">
                  <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                    Cidade <small>(opcional)</small>
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              {/* Observações */}
              <div className="mb-6 group">
                <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600">
                  Observações <small>(opcional)</small>
                </label>
                <textarea
                  name="observacao"
                  value={formData.observacao}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </>
          )}

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
                onClick={onFimEdicao}
                className="bg-[#DA3648] hover:bg-[#BC3140] text-white px-4 py-2 rounded-full"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* MENSAGEM DE ERRO AO FINAL DO MODAL */}
          {mensagemErro && (
            <div className="mt-4 text-center">
              <span className="text-red-600 font-semibold">{mensagemErro}</span>
            </div>
          )}
        </form>
      )}

      {/* Aba Tratamento */}
      {abaAtiva === 'tratamento' && pacienteEditando && (
        <PaginaTratamento pacienteSelecionado={pacienteEditando} />
      )}

    </div>
  );
}

export default FormPaciente;
