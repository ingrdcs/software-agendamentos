// =============================================
// AgendaFácil — db.js
// Banco de dados usando localStorage
// Troque as funções aqui por chamadas de API
// quando migrar para backend real
// =============================================

const DB = {

  // ---------- CONFIGURAÇÕES ----------
  getConfig() {
    const defaults = {
      nome: 'Meu Negócio',
      telefone: '(27) 9 9999-0000',
      endereco: 'Serra, ES',
      horario: '08:00 - 18:00',
      notifWhatsapp: true,
      notifLembrete: true,
      aceitarOnline: true,
    };
    const saved = localStorage.getItem('af_config');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  },

  saveConfig(data) {
    localStorage.setItem('af_config', JSON.stringify(data));
  },

  // ---------- SERVIÇOS ----------
  getServicos() {
    const saved = localStorage.getItem('af_servicos');
    if (saved) return JSON.parse(saved);
    // Dados iniciais
    const defaults = [
      { id: 1, nome: 'Consulta', duracao: 45, preco: 80 },
      { id: 2, nome: 'Avaliação', duracao: 30, preco: 50 },
      { id: 3, nome: 'Retorno', duracao: 20, preco: 30 },
      { id: 4, nome: 'Serviço Plus', duracao: 60, preco: 120 },
    ];
    localStorage.setItem('af_servicos', JSON.stringify(defaults));
    return defaults;
  },

  saveServicos(servicos) {
    localStorage.setItem('af_servicos', JSON.stringify(servicos));
  },

  // ---------- CLIENTES ----------
  getClientes() {
    const saved = localStorage.getItem('af_clientes');
    return saved ? JSON.parse(saved) : [];
  },

  saveCliente(cliente) {
    const clientes = this.getClientes();
    const existe = clientes.find(c => c.telefone === cliente.telefone);
    if (existe) {
      existe.visitas = (existe.visitas || 0) + 1;
      existe.ultimaVisita = new Date().toISOString();
    } else {
      cliente.id = Date.now();
      cliente.visitas = 1;
      cliente.ultimaVisita = new Date().toISOString();
      cliente.cor = this._randomColor();
      clientes.push(cliente);
    }
    localStorage.setItem('af_clientes', JSON.stringify(clientes));
    return existe || cliente;
  },

  deleteCliente(id) {
    const clientes = this.getClientes().filter(c => c.id !== id);
    localStorage.setItem('af_clientes', JSON.stringify(clientes));
  },

  // ---------- AGENDAMENTOS ----------
  getAgendamentos() {
    const saved = localStorage.getItem('af_agendamentos');
    return saved ? JSON.parse(saved) : [];
  },

  getAgendamentosHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    return this.getAgendamentos()
      .filter(a => a.data === hoje)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  },

  getAgendamentosSemana() {
    const agora = new Date();
    const inicio = new Date(agora);
    inicio.setDate(agora.getDate() - agora.getDay());
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    return this.getAgendamentos().filter(a => {
      const d = new Date(a.data + 'T00:00:00');
      return d >= inicio && d <= fim;
    });
  },

  getHorariosOcupados(data) {
    return this.getAgendamentos()
      .filter(a => a.data === data && a.status !== 'cancelled')
      .map(a => a.hora);
  },

  saveAgendamento(agendamento) {
    const agendamentos = this.getAgendamentos();
    agendamento.id = Date.now();
    agendamento.criadoEm = new Date().toISOString();
    agendamento.status = 'pending';
    agendamentos.push(agendamento);
    localStorage.setItem('af_agendamentos', JSON.stringify(agendamentos));
    // Salva/atualiza cliente
    this.saveCliente({ nome: agendamento.clienteNome, telefone: agendamento.clienteTelefone });
    return agendamento;
  },

  updateStatusAgendamento(id, status) {
    const agendamentos = this.getAgendamentos();
    const ag = agendamentos.find(a => a.id === id);
    if (ag) {
      ag.status = status;
      localStorage.setItem('af_agendamentos', JSON.stringify(agendamentos));
    }
  },

  deleteAgendamento(id) {
    const agendamentos = this.getAgendamentos().filter(a => a.id !== id);
    localStorage.setItem('af_agendamentos', JSON.stringify(agendamentos));
  },

  // ---------- HELPERS ----------
  _randomColor() {
    const colors = ['#7c5cfc','#2dd98f','#ff5c7c','#ffb547','#b088ff','#60a5fa','#f472b6'];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  getReceitaMes() {
    const mes = new Date().toISOString().slice(0, 7);
    const ags = this.getAgendamentos().filter(a => a.data.startsWith(mes) && a.status === 'confirmed');
    return ags.reduce((sum, a) => sum + (a.preco || 0), 0);
  },

  // ---------- RESET (para testes) ----------
  resetTudo() {
    localStorage.removeItem('af_config');
    localStorage.removeItem('af_servicos');
    localStorage.removeItem('af_clientes');
    localStorage.removeItem('af_agendamentos');
  }
};
