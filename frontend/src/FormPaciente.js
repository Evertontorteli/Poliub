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
    numero_gaveta: '',
    rg: '',
    cpf: '',
    cep: '',
    data_nascimento: '',
    idade: '',
    endereco: '',
    numero: '',
    cidade: '',
    observacao: ''
  });

  useEffect(() => {
    if (pacienteEditando) {
      setNumeroProntuario(pacienteEditando.numero_prontuario || '');
      setNome(pacienteEditando.nome || '');
      setTelefone(formatarTelefone(pacienteEditando.telefone || ''));
      setFormData({
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
        observacao: pacienteEditando.observacao || ''
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
      numero_gaveta: '',
      rg: '',
      cpf: '',
      cep: '',
      data_nascimento: '',
      idade: '',
      endereco: '',
      numero: '',
      cidade: '',
      observacao: ''
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

    const somenteDigitos = telefone.replace(/\D/g, '');
    if (somenteDigitos.length !== 10 && somenteDigitos.length !== 11) {
      setMensagemErro('Telefone inválido. Use 10 ou 11 dígitos.');
      return;
    }

    // Validação telefone duplicado
    try {
      const { data } = await axios.get(`/api/pacientes?telefone=${somenteDigitos}`);
      const existeOutro = Array.isArray(data) && data.some(p =>
        String(p.id) !== String(pacienteEditando?.id)
      );
      if (existeOutro) {
        setMensagemErro('Já existe um paciente cadastrado com este telefone.');
        return;
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
      telefone: somenteDigitos,
      numero_gaveta: isAluno ? null : (formData.numero_gaveta || null),
      rg: isAluno ? null : (formData.rg || null),
      cpf: isAluno ? null : (formData.cpf || null),
      cep: isAluno ? null : (formData.cep || null),
      data_nascimento: isAluno ? null : (formData.data_nascimento || null),
      idade: isAluno ? null : (formData.idade || null),
      endereco: isAluno ? null : (formData.endereco || null),
      numero: isAluno ? null : (formData.numero || null),
      cidade: isAluno ? null : (formData.cidade || null),
      observacao: isAluno ? null : (formData.observacao || null),
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
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 focus:outline-none ${abaAtiva === 'dados'
            ? 'border-b-2 border-[#1A1C2C] font-bold text-[#1A1C2C]'
            : 'text-gray-500'
            }`}
          onClick={() => setAbaAtiva('dados')}
        >
          Dados
        </button>
        <button
          className={`py-2 px-4 focus:outline-none ${abaAtiva === 'tratamento'
            ? 'border-b-2 border-[#1A1C2C] font-bold text-[#1A1C2C]'
            : 'text-gray-500'
            }`}
          onClick={() => setAbaAtiva('tratamento')}
          disabled={!pacienteEditando}
        >
          Tratamento
        </button>
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === 'dados' && (
        <form onSubmit={handleSubmit} autoComplete="off">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            {pacienteEditando ? 'Editar Paciente' : 'Novo Paciente'}
          </h2>

          {/* Campos visíveis só para outros perfis */}
          {!isAluno && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Número do Prontuário <small>(opcional)</small>
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={numeroProntuario}
                  onChange={e => setNumeroProntuario(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Nº Gaveta <small>(opcional)</small>
                </label>
                <input
                  type="text"
                  name="numero_gaveta"
                  value={formData.numero_gaveta}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          )}

          {/* Nome */}
          <div className="mb-6">
            <label className="block mb-2 font-medium text-gray-700">
              Nome e Sobrenome
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          {/* Telefone */}
          <div className="mb-6">
            <label className="block mb-2 font-medium text-gray-700">
              Telefone
            </label>
            <input
              type="tel"
              required
              value={telefone}
              onChange={e => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(XX) XXXXX-XXXX"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* Restante dos campos apenas se NÃO for aluno */}
          {!isAluno && (
            <>
              {/* RG / CPF */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block mb-2 font-medium text-gray-700">
                    RG <small>(opcional)</small>
                  </label>
                  <input
                    type="text"
                    name="rg"
                    value={formData.rg}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700">
                    CPF <small>(opcional)</small>
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    placeholder="000.000.000-00"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              {/* Nasc. / Idade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block mb-2 font-medium text-gray-700">
                    Data de Nascimento <small>(opcional)</small>
                  </label>
                  <input
                    type="date"
                    name="data_nascimento"
                    value={formData.data_nascimento}
                    onChange={handleDateChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700">
                    Idade
                  </label>
                  <input
                    type="number"
                    readOnly
                    name="idade"
                    value={formData.idade}
                    className="w-full bg-gray-100 border rounded px-3 py-2"
                  />
                </div>
              </div>
              {/* CEP */}
              <div className="mb-6">
                <label className="block mb-2 font-medium text-gray-700">
                  CEP <small>(opcional)</small>
                </label>
                <input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              {/* Endereço / Nº / Cidade */}
              <div className="mb-6">
                <label className="block mb-2 font-medium text-gray-700">
                  Endereço <small>(opcional)</small>
                </label>
                <input
                  type="text"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block mb-2 font-medium text-gray-700">
                    Número <small>(opcional)</small>
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700">
                    Cidade <small>(opcional)</small>
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              {/* Observações */}
              <div className="mb-6">
                <label className="block mb-2 font-medium text-gray-700">
                  Observações <small>(opcional)</small>
                </label>
                <textarea
                  name="observacao"
                  value={formData.observacao}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 h-24"
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
        <PaginaTratamento pacienteId={pacienteEditando.id} />
      )}
    </div>
  );
}

export default FormPaciente;
