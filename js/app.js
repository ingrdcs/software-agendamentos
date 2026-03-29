// =============================================
// AgendaFácil — app.js (v2)
// =============================================

// ---------- NAVEGAÇÃO ----------
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  event.target.classList.add('active');
  if (id === 'dashboard')    renderDashboard();
  if (id === 'agendamentos') renderAgendamentos();
  if (id === 'clientes')     renderClientes();
  if (id === 'config')       renderConfig();
}

// ---------- BADGE (corrigido) ----------
function atualizarBadge() {
  const pendentes = DB.getAgendamentos().filter(a => a.status === 'pending').length;
  const el = document.getElementById('badge-count');
  if (el) {
    el.textContent = pendentes;
    el.style.display = pendentes > 0 ? 'inline' : 'none';
  }
}

// ---------- NOTIFICAÇÕES ----------
function notify(msg, tipo = 'success') {
  const n = document.getElementById('notif');
  n.textContent = msg;
  n.className = 'notif show' + (tipo === 'error' ? ' error' : '');
  setTimeout(() => n.classList.remove('show'), 3000);
}

// ---------- WHATSAPP AUTOMÁTICO ----------
function enviarWhatsAppConfirmacao(ag) {
  const cfg = DB.getConfig();
  if (!cfg.notifWhatsapp) return;
  const tel = ag.clienteTelefone.replace(/\D/g, '');
  if (!tel) return;
  const msg = encodeURIComponent(
    `Olá, ${ag.clienteNome}! ✅\n\n` +
    `Seu agendamento foi *CONFIRMADO*:\n` +
    `📌 Serviço: ${ag.servicoNome}\n` +
    `📅 Data: ${formatData(ag.data)}\n` +
    `🕐 Horário: ${ag.hora}\n` +
    `💰 Valor: R$ ${ag.preco.toFixed(2).replace('.', ',')}\n\n` +
    `📍 ${cfg.endereco}\n\n` +
    `Qualquer dúvida, estamos aqui! 😊\n— ${cfg.nome}`
  );
  window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
}

function enviarWhatsAppConcluido(ag) {
  const cfg = DB.getConfig();
  const tel = ag.clienteTelefone.replace(/\D/g, '');
  if (!tel) return;
  const msg = encodeURIComponent(
    `Olá, ${ag.clienteNome}! 🎉\n\n` +
    `Seu atendimento foi *CONCLUÍDO* com sucesso!\n` +
    `📌 Serviço: ${ag.servicoNome}\n\n` +
    `Obrigado pela preferência! Esperamos te ver em breve. 💜\n— ${cfg.nome}`
  );
  window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const hoje = DB.getAgendamentosHoje();
  const semana = DB.getAgendamentosSemana();
  const clientes = DB.getClientes();
  const receita = DB.getReceitaMes();

  document.getElementById('stat-hoje').textContent = hoje.length;
  document.getElementById('stat-semana').textContent = semana.length;
  document.getElementById('stat-receita').textContent = 'R$ ' + receita.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  document.getElementById('stat-clientes').textContent = clientes.length;

  atualizarBadge();
  renderMiniAgenda(hoje);
  renderCal();
}

function renderMiniAgenda(agendamentos) {
  const container = document.getElementById('dash-agenda');
  const ativos = agendamentos.filter(a => a.status !== 'cancelled');
  if (!ativos.length) {
    container.innerHTML = '<div class="empty-state">Nenhum agendamento para hoje</div>';
    return;
  }
  container.innerHTML = ativos.slice(0, 6).map(a => `
    <div class="agenda-row">
      <div class="agenda-time">${a.hora}</div>
      <div>
        <div class="agenda-name">${a.clienteNome}</div>
        <div class="agenda-service">📱 ${a.clienteTelefone}</div>
      </div>
      <div class="agenda-service">${a.servicoNome}</div>
      <div>${statusPill(a.status)}</div>
      <div style="display:flex;gap:4px">${acoes(a)}</div>
    </div>`).join('');
}

// ---------- AGENDAMENTOS ----------
function renderAgendamentos() {
  const filtro = document.getElementById('filtro-status')?.value || 'all';
  let ags = DB.getAgendamentos().sort((a, b) => {
    if (a.data !== b.data) return b.data.localeCompare(a.data);
    return a.hora.localeCompare(b.hora);
  });
  if (filtro !== 'all') ags = ags.filter(a => a.status === filtro);

  const container = document.getElementById('all-appointments');
  if (!ags.length) {
    container.innerHTML = '<div class="empty-state">Nenhum agendamento encontrado</div>';
    return;
  }
  container.innerHTML = ags.map(a => `
    <div class="agenda-row" id="row-${a.id}">
      <div class="agenda-time">${a.hora}</div>
      <div>
        <div class="agenda-name">${a.clienteNome}</div>
        <div class="agenda-service">📱 ${a.clienteTelefone} · ${formatData(a.data)}</div>
      </div>
      <div class="agenda-service">${a.servicoNome}</div>
      <div>${statusPill(a.status)}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">${acoes(a)}</div>
    </div>`).join('');
}

function statusPill(status) {
  const map = {
    pending:   '<span class="status-pill pending"><span class="dot"></span>Pendente</span>',
    confirmed: '<span class="status-pill confirmed"><span class="dot"></span>Confirmado</span>',
    done:      '<span class="status-pill done"><span class="dot"></span>Finalizado</span>',
    cancelled: '<span class="status-pill cancelled"><span class="dot"></span>Cancelado</span>',
  };
  return map[status] || '';
}

function acoes(a) {
  if (a.status === 'cancelled' || a.status === 'done') {
    return `<button class="action-btn btn-delete" onclick="deletarAg(${a.id})">🗑</button>`;
  }
  let html = '';
  if (a.status === 'pending') {
    html += `<button class="action-btn btn-confirm" onclick="confirmarAg(${a.id})">✓ Confirmar</button>`;
  }
  if (a.status === 'confirmed') {
    html += `<button class="action-btn btn-done" onclick="finalizarAg(${a.id})">✔ Finalizar</button>`;
  }
  html += `<button class="action-btn btn-cancel" onclick="cancelarAg(${a.id})">Cancelar</button>`;
  html += `<button class="action-btn btn-delete" onclick="deletarAg(${a.id})">🗑</button>`;
  return html;
}

// ---------- AÇÕES ----------
function confirmarAg(id) {
  DB.updateStatusAgendamento(id, 'confirmed');
  const ag = DB.getAgendamentos().find(a => a.id === id);
  atualizarBadge();
  renderAgendamentos();
  renderDashboard();
  notify('✓ Confirmado! Abrindo WhatsApp...');
  setTimeout(() => { if (ag) enviarWhatsAppConfirmacao(ag); }, 600);
}

function finalizarAg(id) {
  DB.updateStatusAgendamento(id, 'done');
  const ag = DB.getAgendamentos().find(a => a.id === id);
  atualizarBadge();
  renderAgendamentos();
  renderDashboard();
  notify('🎉 Atendimento finalizado!');
  setTimeout(() => { if (ag) enviarWhatsAppConcluido(ag); }, 600);
}

function cancelarAg(id) {
  if (!confirm('Cancelar este agendamento?')) return;
  DB.updateStatusAgendamento(id, 'cancelled');
  atualizarBadge();
  renderAgendamentos();
  renderDashboard();
  notify('Agendamento cancelado.');
}

function deletarAg(id) {
  if (!confirm('Excluir permanentemente?')) return;
  DB.deleteAgendamento(id);
  atualizarBadge();
  renderAgendamentos();
  renderDashboard();
  notify('Excluído.');
}

// ---------- CLIENTES ----------
function renderClientes() {
  const clientes = DB.getClientes();
  const container = document.getElementById('client-list');
  if (!clientes.length) {
    container.innerHTML = '<div class="empty-state">Nenhum cliente cadastrado ainda</div>';
    return;
  }
  const ags = DB.getAgendamentos();
  container.innerHTML = clientes.map(c => {
    const totalAgs = ags.filter(a => a.clienteTelefone === c.telefone).length;
    const ultima = c.ultimaVisita ? formatData(c.ultimaVisita.slice(0, 10)) : '—';
    return `<div class="client-row">
      <div class="avatar" style="background:${c.cor}22;color:${c.cor}">${c.nome[0].toUpperCase()}</div>
      <div class="client-info">
        <div class="client-name">${c.nome}</div>
        <div class="client-meta">📱 ${c.telefone}</div>
      </div>
      <div class="client-stats">
        <strong>${totalAgs}</strong>visitas · último: ${ultima}
      </div>
      <button class="action-btn btn-delete" style="margin-left:12px" onclick="deletarCliente(${c.id})">🗑</button>
    </div>`;
  }).join('');
}

function deletarCliente(id) {
  if (!confirm('Excluir este cliente?')) return;
  DB.deleteCliente(id);
  renderClientes();
  notify('Cliente removido.');
}

// ---------- CONFIGURAÇÕES ----------
function renderConfig() {
  const cfg = DB.getConfig();
  document.getElementById('cfg-nome').value = cfg.nome;
  document.getElementById('cfg-telefone').value = cfg.telefone;
  document.getElementById('cfg-endereco').value = cfg.endereco;
  document.getElementById('cfg-horario').value = cfg.horario;
  document.getElementById('tog-whatsapp').checked = cfg.notifWhatsapp;
  document.getElementById('tog-lembrete').checked = cfg.notifLembrete;
  document.getElementById('tog-online').checked = cfg.aceitarOnline;
  renderServicosConfig();
}

function salvarConfig() {
  const cfg = {
    nome: document.getElementById('cfg-nome').value,
    telefone: document.getElementById('cfg-telefone').value,
    endereco: document.getElementById('cfg-endereco').value,
    horario: document.getElementById('cfg-horario').value,
    notifWhatsapp: document.getElementById('tog-whatsapp').checked,
    notifLembrete: document.getElementById('tog-lembrete').checked,
    aceitarOnline: document.getElementById('tog-online').checked,
  };
  DB.saveConfig(cfg);
  notify('✓ Configurações salvas!');
}

function renderServicosConfig() {
  const servicos = DB.getServicos();
  document.getElementById('services-config').innerHTML = servicos.map(s => `
    <div class="service-item" data-id="${s.id}">
      <input placeholder="Nome do serviço" value="${s.nome}" class="svc-nome">
      <input placeholder="Duração (min)" value="${s.duracao}" class="svc-dur" style="max-width:100px">
      <input placeholder="Preço (R$)" value="${s.preco}" class="svc-preco" style="max-width:100px">
      <button class="remove-btn" onclick="removerServico(${s.id})">×</button>
    </div>`).join('');
}

function salvarServicos() {
  const items = document.querySelectorAll('#services-config .service-item');
  const servicos = Array.from(items).map(item => ({
    id: parseInt(item.dataset.id),
    nome: item.querySelector('.svc-nome').value,
    duracao: parseInt(item.querySelector('.svc-dur').value) || 30,
    preco: parseFloat(item.querySelector('.svc-preco').value) || 0,
  })).filter(s => s.nome.trim());
  DB.saveServicos(servicos);
  notify('✓ Serviços salvos!');
}

function adicionarServico() {
  const servicos = DB.getServicos();
  servicos.push({ id: Date.now(), nome: '', duracao: 30, preco: 0 });
  DB.saveServicos(servicos);
  renderServicosConfig();
  document.querySelector('#services-config .service-item:last-child .svc-nome').focus();
}

function removerServico(id) {
  const servicos = DB.getServicos().filter(s => s.id !== id);
  DB.saveServicos(servicos);
  renderServicosConfig();
}

// ---------- CALENDÁRIO ----------
let calMes, calAno;

function renderCal() {
  const now = new Date();
  if (calMes === undefined) { calMes = now.getMonth(); calAno = now.getFullYear(); }
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const firstDay = new Date(calAno, calMes, 1).getDay();
  const daysInMonth = new Date(calAno, calMes + 1, 0).getDate();
  const ags = DB.getAgendamentos();
  const diasComAg = new Set(
    ags.filter(a => a.data.startsWith(`${calAno}-${String(calMes + 1).padStart(2, '0')}`))
       .map(a => parseInt(a.data.slice(8)))
  );
  let html = `<div class="cal-header">
    <button class="cal-nav" onclick="calNav(-1)">‹</button>
    <span class="cal-title">${months[calMes]} ${calAno}</span>
    <button class="cal-nav" onclick="calNav(1)">›</button>
  </div><div class="cal-grid">`;
  ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(d => html += `<div class="cal-day-name">${d}</div>`);
  const prevDays = new Date(calAno, calMes, 0).getDate();
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day other-month">${prevDays - firstDay + i + 1}</div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === now.getDate() && calMes === now.getMonth() && calAno === now.getFullYear();
    html += `<div class="cal-day${isToday ? ' today' : ''}${diasComAg.has(d) ? ' has-event' : ''}">${d}</div>`;
  }
  html += '</div>';
  document.getElementById('mini-cal').innerHTML = html;
}

function calNav(dir) {
  calMes += dir;
  if (calMes > 11) { calMes = 0; calAno++; }
  if (calMes < 0)  { calMes = 11; calAno--; }
  renderCal();
}

// ---------- HELPERS ----------
function formatData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  atualizarBadge();
});
