  // Histórico
  const fetchHistory = useCallback(() => {
    if (!pinValidated || !alunoNome) return
    axios.get('/api/movimentacoes')
      .then(r => {
        const hoje = new Date()
        const from = subDays(hoje, 30).toISOString().slice(0, 10)
        const to = hoje.toISOString().slice(0, 10)
        const fil = r.data.filter(m => {
          const d = new Date(m.criado_em).toISOString().slice(0, 10)
          return m.alunoNome === alunoNome && d >= from && d <= to
        })
        setHistorico(fil)
      })
      .catch(() => setHistorico([]))
  }, [alunoNome, pinValidated])
  useEffect(() => { fetchHistory() }, [fetchHistory])      
      
      {/* Histórico */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-bold mb-4">Histórico (últimos 30 dias)</h3>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                onClick={() => datePickerRef.current.setOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Calendar size={20} />
              </button>
              <DatePicker
                ref={datePickerRef}
                selected={filterDate ? new Date(filterDate) : null}
                onChange={d => setFilterDate(d.toISOString().slice(0, 10))}
                customInput={<></>}
                locale="pt-BR"
                dateFormat="dd/MM/yyyy"
              />
            </div>
            <div className="hidden md:grid grid-cols-6 gap-4 text-sm font-semibold text-gray-600 border-b pb-2 mb-2">
              <div>Caixa</div><div>Tipo</div><div>Aluno</div><div>Operador</div><div>Data</div><div className="text-right">Ações</div>
            </div>
            {(() => {
              const fil = historico.filter(m => {
                const txt = searchTerm.toLowerCase()
                const okTxt = [m.caixaNome, m.tipo, m.alunoNome, m.operadorNome]
                  .some(f => f.toLowerCase().includes(txt))
                const okDate = !filterDate || new Date(m.criado_em).toISOString().slice(0, 10) === filterDate
                return okTxt && okDate
              })
              if (!fil.length) return <p className="text-gray-500">Nenhuma movimentação.</p>
              return (
                <div className="space-y-4">
                  {fil.map(m => (
                    <div key={m.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-gray-50 rounded-xl p-4 items-center">
                      <div className="font-medium">{m.caixaNome}</div>
                      <div>{m.tipo}</div>
                      <div>{m.alunoNome}</div>
                      <div>{m.operadorNome}</div>
                      <div>{new Date(m.criado_em).toLocaleString()}</div>
                      <div className="flex justify-end gap-4 items-center">
                        <button
                          onClick={() => handlePrint({ id: m.caixa_id, nome: m.caixaNome, criado_em: m.criado_em })}
                          className="no-print text-blue-600"
                          title="Reimprimir etiqueta"
                        >
                          <QrCode size={18} />
                        </button>
                        <Edit2 onClick={() => handleEditHistory(m)} className="cursor-pointer" size={18} />
                        <Trash2 onClick={() => handleDeleteHistory(m.id)} className="cursor-pointer text-red-600" size={18} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>