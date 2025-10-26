// src/components/TelaCaixas.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash } from 'lucide-react';
import { toast } from 'react-toastify';

const POR_PAGINA = 100;

function generateEAN13() {
  let base = '';
  for (let i = 0; i < 12; i++) {
    base += Math.floor(Math.random() * 10);
  }
  const sum = base
    .split('')
    .map((d, i) => Number(d) * (i % 2 === 0 ? 1 : 3))
    .reduce((a, b) => a + b, 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
}

export default function TelaCaixas() {
  const [caixas, setCaixas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagina, setPagina] = useState(1);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');

  useEffect(() => {
    fetchCaixas();
  }, []);

  function fetchCaixas() {
    setCarregando(true);
    axios
      .get('/api/caixas')
      .then(res => setCaixas(res.data))
      .catch(() => setCaixas([]))
      .finally(() => setCarregando(false));
  }

  // Modal helpers
  function openModal(caixa = null) {
    if (caixa) {
      setEditingId(caixa.id);
      setNome(caixa.nome);
      setCodigo(caixa.codigo_barras || '');
    } else {
      setEditingId(null);
      setNome('');
      setCodigo('');
    }
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setNome('');
    setCodigo('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      nome,
      codigo_barras: codigo.trim() !== '' ? codigo.trim() : generateEAN13()
    };

    if (editingId) {
      axios
        .put(`/api/caixas/${editingId}`, payload)
        .then(() => {
          toast.success('Caixa atualizada com sucesso!');
          closeModal();
          fetchCaixas();
        })
        .catch(() => toast.error('Erro ao atualizar caixa.'));
    } else {
      axios
        .post('/api/caixas', payload)
        .then(() => {
          toast.success('Caixa cadastrada com sucesso!');
          closeModal();
          fetchCaixas();
        })
        .catch(() => toast.error('Erro ao cadastrar caixa.'));
    }
  }

  function handleDelete(id) {
    const caixa = caixas.find(c => c.id === id);
    if (!caixa) return;
    if (window.confirm(`Deletar a caixa: ${caixa.nome}?`)) {
      axios
        .delete(`/api/caixas/${id}`)
        .then(() => {
          setCaixas(prev => prev.filter(c => c.id !== id));
          toast.success(`Caixa: ${caixa.nome} eliminada com sucesso.`);
        })
        .catch(() => toast.error('Erro ao deletar caixa.'));
    }
  }

  // Pesquisa e paginação
  const filteredCaixas = caixas.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.nome.toLowerCase().includes(term) ||
      (c.codigo_barras || '').toLowerCase().includes(term) ||
      String(c.id).includes(term)
    );
  });

  const totalPaginas = Math.max(1, Math.ceil(filteredCaixas.length / POR_PAGINA));
  const inicio = (pagina - 1) * POR_PAGINA;
  const fim = inicio + POR_PAGINA;
  const caixasPagina = filteredCaixas.slice(inicio, fim);

  useEffect(() => { setPagina(1); }, [searchTerm, caixas.length]);

  if (carregando) return <p>Carregando caixas...</p>;
  if (caixas.length === 0) return <p>Nenhuma caixa cadastrada.</p>;

  return (
    <div className="mx-auto py-2 px-2">
      {/* Botão novo no topo */}
      <div className="flex justify-between px-2 items-center mb-4">
        <h1 className="text-2xl font-medium">Lista de Caixas</h1>
        <button
          onClick={() => openModal()}
          className="bg-[#0095DA] hover:brightness-110 text-white px-4 py-2 rounded-full"
        >
          Nova Caixa
        </button>
      </div>

      <div className="bg-white rounded-2xl p-2 shadow">
        {/* Pesquisa */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Pesquisar por ID, nome ou código de barras"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        {/* Paginação topo */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="text-blue-600 hover:underline rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <span>
            Página {pagina} de {totalPaginas} &nbsp;
            <small>({filteredCaixas.length} caixas)</small>
          </span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="text-blue-600 hover:underline rounded disabled:opacity-50"
          >
            Próxima
          </button>
        </div>

        <hr className="border-t border-gray-200 my-2" />

        {/* Tabela (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                <th className="px-3 py-2 text-left font-semibold border-b">ID</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Nome</th>
                <th className="px-3 py-2 text-left font-semibold border-b">Código de Barras</th>
                <th className="px-3 py-2 text-right font-semibold border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {caixasPagina.map((c, idx) => (
                <React.Fragment key={c.id}>
                  <tr className="border-none hover:bg-gray-50 transition">
                    <td className="px-3 py-2 text-gray-500">{c.id}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{c.nome}</td>
                    <td className="px-3 py-2 text-gray-800">{c.codigo_barras}</td>
                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                      <button
                        onClick={() => openModal(c)}
                        className="p-2 rounded hover:bg-blue-100 text-blue-800 transition"
                        title="Editar caixa"
                        aria-label="Editar caixa"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-2 rounded hover:bg-red-100 text-red-700 transition"
                        title="Deletar caixa"
                        aria-label="Deletar caixa"
                      >
                        <Trash size={18} />
                      </button>
                    </td>
                  </tr>
                  {/* Separador entre linhas, exceto a última */}
                  {idx !== caixasPagina.length - 1 && (
                    <tr>
                      <td colSpan={4}>
                        <hr className="border-t border-gray-200 my-0" />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lista em card (mobile) */}
        <div className="md:hidden space-y-3">
          {caixasPagina.map((c, idx) => (
            <div
              key={c.id}
              className="bg-gray-50 rounded-xl px-4 py-3 shadow-sm border border-gray-200"
            >
              <div className="flex justify-between mb-1 text-xs text-gray-500">
                <span>#{inicio + idx + 1}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(c)}
                    className="p-1 rounded hover:bg-blue-100 text-blue-800"
                    title="Editar caixa"
                    aria-label="Editar caixa"
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1 rounded hover:bg-red-100 text-red-700"
                    title="Deletar caixa"
                    aria-label="Deletar caixa"
                  >
                    <Trash size={17} />
                  </button>
                </div>
              </div>
              <div>
                <b>ID:</b> <span className="text-gray-800">{c.id}</span>
              </div>
              <div>
                <b>Nome:</b> <span className="text-gray-800">{c.nome}</span>
              </div>
              <div>
                <b>Código de Barras:</b> <span className="text-gray-800">{c.codigo_barras}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Paginação embaixo */}
        <div className="flex justify-between items-center my-4">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="text-blue-600 hover:underline rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="text-blue-600 hover:underline rounded disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-6 text-[#0095DA]">
              {editingId ? 'Editar Caixa' : 'Cadastrar Caixa'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Nome da Caixa</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Código de Barras (opcional)</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  placeholder="Deixe em branco para gerar automaticamente"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="submit"
                  className="bg-[#0095DA] hover:brightness-110 text-white px-6 py-2 rounded-full"
                >
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-[#DA3648] hover:bg-[#BC3140] text-white px-4 py-2 rounded-full"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
