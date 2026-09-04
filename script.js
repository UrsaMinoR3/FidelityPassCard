(function () {
  const STORAGE_KEY = 'fpc_state_v1';
  const STAMPS_PER_CARD = 10;

  const el = {
    card: document.getElementById('card'),
    clienteName: document.getElementById('clienteName'),
    stampGrid: document.getElementById('stampGrid'),
    totalVal: document.getElementById('totalVal'),
    completedVal: document.getElementById('completedVal'),
    progressNote: document.getElementById('progressNote'),
    logBtn: document.getElementById('logBtn'),
    editBtn: document.getElementById('editBtn'),
    resetBtn: document.getElementById('resetBtn'),
    toast: document.getElementById('toast'),
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { name: '', total: 0 };
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  let state = loadState();

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove('show'), 1800);
  }

  function renderStamps(progress) {
    el.stampGrid.innerHTML = '';
    for (let i = 0; i < STAMPS_PER_CARD; i++) {
      const div = document.createElement('div');
      div.className = 'stamp' + (i < progress ? ' filled' : '');
      div.innerHTML = '<span class="glyph">' + (i < progress ? '★' : '☆') + '</span>';
      el.stampGrid.appendChild(div);
    }
  }

  function render() {
    el.clienteName.textContent = state.name && state.name.trim() ? state.name.trim() : 'Editar nombre';
    const completed = Math.floor(state.total / STAMPS_PER_CARD);
    const progress = state.total % STAMPS_PER_CARD;

    el.totalVal.textContent = state.total;
    el.completedVal.textContent = completed;
    renderStamps(progress);

    if (progress === 0 && state.total > 0) {
      el.progressNote.textContent = '¡Tarjeta completa! Empezando una nueva 🎉';
    } else {
      el.progressNote.textContent = progress + ' / ' + STAMPS_PER_CARD + ' para la próxima tarjeta';
    }
  }

  function logSalida() {
    state.total += 1;
    saveState(state);
    render();

    const justCompleted = state.total % STAMPS_PER_CARD === 0;
    el.card.classList.remove('celebrate');
    void el.card.offsetWidth;
    el.card.classList.add('celebrate');

    if (justCompleted) {
      showToast('🎉 ¡Tarjeta completa! Van ' + Math.floor(state.total / STAMPS_PER_CARD));
    } else {
      showToast('Salida registrada ✓');
    }
  }

  function editName() {
    const current = state.name || '';
    const next = window.prompt('Nombre en la tarjeta:', current);
    if (next === null) return;
    state.name = next.trim();
    saveState(state);
    render();
  }

  function resetAll() {
    const ok = window.confirm('¿Reiniciar el contador de salidas a cero? Esto no se puede deshacer.');
    if (!ok) return;
    state.total = 0;
    saveState(state);
    render();
    showToast('Contador reiniciado');
  }

  el.logBtn.addEventListener('click', logSalida);
  el.editBtn.addEventListener('click', editName);
  el.clienteName.addEventListener('click', editName);
  el.clienteName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editName(); }
  });
  el.resetBtn.addEventListener('click', resetAll);

  render();
})();
