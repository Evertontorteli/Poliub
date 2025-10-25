// src/components/FormPaciente.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from './context/AuthContext';
import PaginaTratamento from './pages/PaginaTratamento';
import EncaminhamentosPaciente from './components/EncaminhamentosPaciente';
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
  // Estado da aba Anamnese
  const [modelosAnamnese, setModelosAnamnese] = useState([]);
  const [modelosLoading, setModelosLoading] = useState(false);
  const [modelosErro, setModelosErro] = useState('');
  const [selectedModeloId, setSelectedModeloId] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [perguntasAnamnese, setPerguntasAnamnese] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [savingAnamnese, setSavingAnamnese] = useState(false);
  const cardColors = ['#5956D6', '#2B8FF2', '#ECAD21', '#03A400', '#DA5D5C', '#926AFF', '#568BEF', '#ECAD21', '#FF7FAF', '#926AFF', '#009AF3'];

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

  // Carrega modelos quando abre aba Anamnese
  useEffect(() => {
    if (abaAtiva !== 'anamnese' || !pacienteEditando) return;
    let alive = true;
    (async () => {
      try {
        setModelosErro('');
        setModelosLoading(true);
        const { data } = await axios.get('/api/anamnese/modelos');
        if (!alive) return;
        setModelosAnamnese(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setModelosErro('Não foi possível carregar os modelos de anamnese.');
        setModelosAnamnese([]);
      } finally {
        if (alive) setModelosLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [abaAtiva, pacienteEditando?.id]);

  async function selecionarModelo(m) {
    setSelectedModeloId(m.id);
    setSelectedModelo(m);
    setPerguntasAnamnese([]);
    setRespostas({});
    try {
      const { data } = await axios.get(`/api/anamnese/modelos/${m.id}/perguntas`);
      setPerguntasAnamnese(Array.isArray(data) ? data : []);
    } catch {
      setPerguntasAnamnese([]);
    }
  }

  function renderPergunta(p) {
    const key = String(p.id);
    const tipo = p.tipo || 'snn';
    if (tipo === 'texto') {
      return (
        <textarea className="w-full border rounded px-3 py-2" value={respostas[key]?.texto || ''} onChange={e => setRespostas(r => ({ ...r, [key]: { ...r[key], texto: e.target.value } }))} placeholder="Resposta" />
      );
    }
    if (tipo === 'snn' || tipo === 'snn_texto') {
      return (
        <div className="space-y-2">
          <div className="flex gap-4 items-center">
            {['sim','nao','nao_sei'].map(opt => (
              <label key={opt} className="inline-flex items-center gap-2">
                <input type="radio" name={`p-${key}`} checked={(respostas[key]?.opcao || '') === opt} onChange={() => setRespostas(r => ({ ...r, [key]: { ...r[key], opcao: opt } }))} />
                <span className="text-sm text-gray-800">{opt === 'sim' ? 'Sim' : opt === 'nao' ? 'Não' : 'Não sei'}</span>
              </label>
            ))}
          </div>
          {tipo === 'snn_texto' && (
            <textarea className="w-full border rounded px-3 py-2" value={respostas[key]?.texto || ''} onChange={e => setRespostas(r => ({ ...r, [key]: { ...r[key], texto: e.target.value } }))} placeholder="Observações" />
          )}
        </div>
      );
    }
    return null;
  }

  async function salvarAnamnesePaciente() {
    setSavingAnamnese(true);
    try {
      toast.dismiss && toast.dismiss();
      toast.success('Anamnese preenchida (rascunho UI). Persistência será conectada.');
    } finally {
      setSavingAnamnese(false);
    }
  }

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
    <div className="bg-white mx-auto w-full rounded-2xl p-6 h-full" style={{ scrollbarGutter: 'stable both-edges' }}>

      {/* Abas no topo */}
      <div className="flex border-b mb-6 gap-6">
        <button
          className={`relative pb-2 text-sm md:text-base transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:rounded after:transition-all after:duration-200 after:ease-out after:w-0 focus:outline-none
            ${abaAtiva === 'dados' ? 'text-[#0095DA] font-bold after:w-full after:bg-[#0095DA]' : 'text-gray-600 hover:text-gray-800 hover:after:w-full hover:after:bg-gray-300'}`}
          onClick={() => setAbaAtiva('dados')}
        >
          Dados do Paciente
        </button>
        {pacienteEditando && (
          <>
            {/* Anamnese como segunda opção */}
            <button
              className={`relative pb-2 text-sm md:text-base transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:rounded after:transition-all after:duration-200 after:ease-out after:w-0 focus:outline-none
                ${abaAtiva === 'anamnese' ? 'text-[#0095DA] font-bold after:w-full after:bg-[#0095DA]' : 'text-gray-600 hover:text-gray-800 hover:after:w-full hover:after:bg-gray-300'}`}
              onClick={() => setAbaAtiva('anamnese')}
            >
              Anamnese
            </button>
            <button
              className={`relative pb-2 text-sm md:text-base transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:rounded after:transition-all after:duration-200 after:ease-out after:w-0 focus:outline-none
                ${abaAtiva === 'encaminhamentos' ? 'text-[#0095DA] font-bold after:w-full after:bg-[#0095DA]' : 'text-gray-600 hover:text-gray-800 hover:after:w-full hover:after:bg-gray-300'}`}
              onClick={() => setAbaAtiva('encaminhamentos')}
            >
              Encaminhamentos
            </button>
            <button
              className={`relative pb-2 text-sm md:text-base transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-[1px] after:h-[2px] after:rounded after:transition-all after:duration-200 after:ease-out after:w-0 focus:outline-none
                ${abaAtiva === 'tratamento' ? 'text-[#0095DA] font-bold after:w-full after:bg-[#0095DA]' : 'text-gray-600 hover:text-gray-800 hover:after:w-full hover:after:bg-gray-300'}`}
              onClick={() => setAbaAtiva('tratamento')}
            >
              Tratamento
            </button>
          </>
        )}
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === 'dados' && (
        <form onSubmit={handleSubmit} autoComplete="off">
          <h2 className="text-2xl font-bold mb-6 text-[#0095DA]">
            {pacienteEditando ? 'Editar Paciente' : 'Novo Paciente'}
          </h2>

          {/* Tipo de paciente / Nº Prontuário / Nº Gaveta - na mesma linha */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="group">
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
            {!isAluno && (
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
            )}
            {!isAluno && (
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
            )}
          </div>

          {/* Nome e Telefone na mesma linha */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="group md:col-span-2">
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
            <div className="group md:col-span-1">
              <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600 whitespace-nowrap">
                {formData.tipo_paciente === 'NORMAL' ? (
                  'Telefone'
                ) : (
                  <>
                    Telefone <small>(opcional)</small>
                  </>
                )}
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
          </div>

          {/* Campos do responsável (opcionais; exibidos quando não NORMAL) */}
          {formData.tipo_paciente !== 'NORMAL' && (
            <div className="mb-6 rounded-xl p-3 border-2 border-blue-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className={`block mb-2 font-medium transition-colors group-focus-within:text-blue-600 text-gray-700`}>
                    Nome do responsável <small>(opcional)</small>
                  </label>
                  <input
                    type="text"
                    name="responsavel_nome"
                    value={formData.responsavel_nome}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="group">
                  <label className={`block mb-2 font-medium transition-colors group-focus-within:text-blue-600 text-gray-700`}>
                    Telefone do responsável <small>(opcional)</small>
                  </label>
                  <input
                    type="tel"
                    name="responsavel_telefone"
                    value={formData.responsavel_telefone}
                    onChange={e => setFormData(fd => ({ ...fd, responsavel_telefone: formatarTelefone(e.target.value) }))}
                    placeholder="(XX) XXXXX-XXXX"
                    className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
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
              {/* RG / CPF / Data de Nascimento / Idade (mesma linha) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              {/* CEP / Endereço / Nº - mesma linha; Nº compacto */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                <div className="group md:col-span-2">
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
                <div className="group md:col-span-3">
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
                <div className="group md:col-span-1">
                  <label className="block mb-2 font-medium text-gray-700 transition-colors group-focus-within:text-blue-600 whitespace-nowrap">
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
              </div>
              {/* Cidade */}
              <div className="group mb-6">
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

          {/* Botões - alinhamento e respiro padronizados com FormAluno */}
          <div className="flex gap-4 pt-6 pb-6">
            <button
              type="submit"
              className="bg-[#1A1C2C] hover:bg-[#3B4854] text-white font-bold px-6 py-2 rounded-full"
            >
              {pacienteEditando ? 'Atualizar' : 'Cadastrar'}
            </button>
            {pacienteEditando && (
              <button
                type="button"
                onClick={onFimEdicao}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-full"
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
      {abaAtiva === 'encaminhamentos' && pacienteEditando && (
        <div className="p-2">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Encaminhamentos</h2>
          <div className="border rounded-lg p-4 bg-white">
            <p className="text-gray-600">Em breve: cadastro e acompanhamento de encaminhamentos entre disciplinas para este paciente.</p>
          </div>
        </div>
      )}

      {/* Aba Encaminhamentos */}
      {abaAtiva === 'encaminhamentos' && pacienteEditando && (
        <EncaminhamentosPaciente pacienteId={pacienteEditando.id} />
      )}

      {/* Aba Tratamento */}
      {abaAtiva === 'tratamento' && pacienteEditando && (
        <PaginaTratamento pacienteSelecionado={pacienteEditando} />
      )}

      {/* Aba Anamnese */}
      {abaAtiva === 'anamnese' && pacienteEditando && (
        <div className="p-2">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Anamnese</h2>
          {!selectedModeloId ? (
            <div className="border rounded-lg p-4 bg-white">
              {modelosLoading && <div className="text-gray-500">Carregando modelos…</div>}
              {modelosErro && <div className="text-red-600 mb-2">{modelosErro}</div>}
              {!modelosLoading && !modelosErro && (
                modelosAnamnese.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {modelosAnamnese.map((m, idx) => (
                      <div key={m.id} className="relative border rounded-lg bg-white p-3 overflow-hidden">
                        <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: cardColors[idx % cardColors.length] }} aria-hidden="true" />
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-gray-800" title={m.nome}>{m.nome}</div>
                            <div className="text-xs text-gray-600 mt-1">Atualizado em: {m.updated_at ? new Date(m.updated_at).toLocaleString('pt-BR') : '-'}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button onClick={() => selecionarModelo(m)} className="px-3 py-2 rounded text-white bg-[#0095DA] hover:brightness-110">Selecionar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600">Nenhum modelo disponível.</div>
                )
              )}
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-gray-600">Modelo selecionado</div>
                  <div className="text-lg font-semibold text-gray-800">{selectedModelo?.nome || '-'}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded border" onClick={() => { setSelectedModeloId(null); setSelectedModelo(null); setPerguntasAnamnese([]); setRespostas({}); }}>Trocar modelo</button>
                  <button className="px-3 py-2 rounded text-white bg-[#0095DA] hover:brightness-110 disabled:opacity-60" disabled={savingAnamnese} onClick={salvarAnamnesePaciente}>
                    {savingAnamnese ? 'Salvando…' : 'Salvar anamnese'}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {perguntasAnamnese.length === 0 && (
                  <div className="text-gray-500">Sem perguntas neste modelo.</div>
                )}
                {perguntasAnamnese.map((p, i) => (
                  <div key={p.id} className="border rounded-md p-3">
                    <div className="text-xs text-gray-600 mb-1">Pergunta {i + 1}</div>
                    <div className="font-medium text-gray-900 mb-2">{p.titulo}</div>
                    {renderPergunta(p)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default FormPaciente;
