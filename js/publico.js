// =============================================
// AgendaFácil — publico.js
// Lógica da página pública (cliente agenda aqui)
// =============================================

const SLOTS_PADRAO = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];

let pubSelected = { servico: null, data: null, hora: null };
let pubStep = 0;

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  const cfg = DB.getConfig();
  document.getElementById('pub-nome-negocio').textContent = cfg.nome;
  document.getElementById('pub-sub-negocio').textContent = cfg.endereco + ' · ' + cfg.horario;
  document.title = cfg.nome + ' — Agendamento Online';

  setDataHoje();
  renderServicos();
  goStep(0);
});

// ---------- DATA ----------
function setDataHoje() {
  const hoje = new Date();
  const iso = hoje.toISOString().slice(0, 10);
  pubSelected.data = iso;
  const fmt = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('pub-data-label').textContent = fmt;
}

// ---------- PASSO 0: SERVIÇOS ----------
function renderServicos() {
  const servicos = DB.getServicos();
  const grid = document.getElementById('service-grid');
  if (!servicos.length) {
    grid.innerHTML = '<p style="color:var(--text2);font-size:14px">Nenhum serviço cadastrado ainda.</p>';
    return;
  }
  grid.innerHTML = servicos.map(s => `
    <div class="service-card" onclick="selectServico(${s.id}, this)">
      <div class="service-name">${s.nome}</div>
      <div class="service-info">${s.duracao} min</div>
      <div class="service-price">R$ ${s.preco.toFixed(2).replace('.', ',')}</div>
    </div>`).join('');
}

function selectServico(id, el) {
  document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const servicos = DB.getServicos();
  pubSelected.servico = servicos.find(s => s.id === id);
}

// ---------- PASSO 1: HORÁRIOS ----------
function renderHorarios() {
  const ocupados = DB.getHorariosOcupados(pubSelected.data);
  const container = document.getElementById('time-slots');
  container.innerHTML = SLOTS_PADRAO.map(h => {
    const indisponivel = ocupados.includes(h);
    return `<div class="slot${indisponivel ? ' unavailable' : ''}" onclick="${indisponivel ? '' : `selectHora('${h}', this)`}">${h}</div>`;
  }).join('');
}

function selectHora(hora, el) {
  document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  pubSelected.hora = hora;
}

// ---------- PASSO 2: RESUMO ----------
function renderResumo() {
  document.getElementById('confirm-summary').innerHTML = `
    <div class="confirm-row"><span>Serviço</span><span>${pubSelected.servico.nome}</span></div>
    <div class="confirm-row"><span>Data</span><span>${formatDataBR(pubSelected.data)}</span></div>
    <div class="confirm-row"><span>Horário</span><span>${pubSelected.hora}</span></div>
    <div class="confirm-row"><span>Valor</span><span>R$ ${pubSelected.servico.preco.toFixed(2).replace('.', ',')}</span></div>`;
}

// ---------- NAVEGAÇÃO DE PASSOS ----------
function goStep(step) {
  document.querySelectorAll('.pub-step').forEach(el => el.style.display = 'none');
  document.getElementById('pub-step-' + step).style.display = 'block';
  updateDots(step);
  pubStep = step;
}

function updateDots(step) {
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById('dot' + i);
    if (!d) continue;
    d.classList.remove('active', 'done');
    if (i < step) d.classList.add('done');
    else if (i === step) d.classList.add('active');
  }
}

function pubNext(step) {
  if (step === 0) {
    if (!pubSelected.servico) { notify('Escolha um serviço!', 'error'); return; }
    renderHorarios();
    goStep(1);
  } else if (step === 1) {
    if (!pubSelected.hora) { notify('Escolha um horário!', 'error'); return; }
    renderResumo();
    goStep(2);
  }
}

function pubVoltar(step) {
  goStep(step);
}

// ---------- CONFIRMAÇÃO FINAL ----------
function pubConfirm() {
  const nome = document.getElementById('pub-nome-cliente').value.trim();
  const tel = document.getElementById('pub-telefone').value.trim();

  if (!nome) { notify('Digite seu nome!', 'error'); return; }
  if (!tel || tel.length < 8) { notify('Digite um telefone válido!', 'error'); return; }

  // Verifica se horário ainda está livre
  const ocupados = DB.getHorariosOcupados(pubSelected.data);
  if (ocupados.includes(pubSelected.hora)) {
    notify('Ops! Esse horário acabou de ser reservado. Escolha outro.', 'error');
    goStep(1);
    renderHorarios();
    return;
  }

  const agendamento = {
    clienteNome: nome,
    clienteTelefone: tel,
    servicoId: pubSelected.servico.id,
    servicoNome: pubSelected.servico.nome,
    preco: pubSelected.servico.preco,
    data: pubSelected.data,
    hora: pubSelected.hora,
  };

  const salvo = DB.saveAgendamento(agendamento);

  // Monta resumo de sucesso
  document.getElementById('success-summary').innerHTML = `
    <div class="confirm-row"><span>Nome</span><span>${nome}</span></div>
    <div class="confirm-row"><span>Serviço</span><span>${pubSelected.servico.nome}</span></div>
    <div class="confirm-row"><span>Data</span><span>${formatDataBR(pubSelected.data)}</span></div>
    <div class="confirm-row"><span>Horário</span><span>${pubSelected.hora}</span></div>
    <div class="confirm-row"><span>Valor</span><span>R$ ${pubSelected.servico.preco.toFixed(2).replace('.', ',')}</span></div>`;

  // Link do WhatsApp para o negócio
  const cfg = DB.getConfig();
  const msg = encodeURIComponent(`Olá! Confirmando meu agendamento:\n📌 Serviço: ${pubSelected.servico.nome}\n📅 Data: ${formatDataBR(pubSelected.data)}\n🕐 Horário: ${pubSelected.hora}\n👤 Nome: ${nome}`);
  document.getElementById('btn-whatsapp').href = `https://wa.me/55${cfg.telefone.replace(/\D/g,'')}?text=${msg}`;

  goStep(3);
}

function pubReset() {
  pubSelected = { servico: null, data: null, hora: null };
  setDataHoje();
  renderServicos();
  document.getElementById('pub-nome-cliente').value = '';
  document.getElementById('pub-telefone').value = '';
  goStep(0);
}

// ---------- HELPERS ----------
function formatDataBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function notify(msg, tipo = 'success') {
  const n = document.getElementById('notif');
  n.textContent = msg;
  n.className = 'notif show' + (tipo === 'error' ? ' error' : '');
  setTimeout(() => n.classList.remove('show'), 2800);
}
