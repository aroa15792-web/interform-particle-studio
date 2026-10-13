(() => {
  'use strict';

  const notes = [
    { id: 1, title: '知识库架构概览', folder: '知识库', status: '活跃', updated: '今天', links: 5, tags: ['架构', '入口'], description: '从入口、笔记、链接到输出，梳理一个知识空间的基本结构。', order: 1 },
    { id: 2, title: '前端交互规范', folder: '设计系统', status: '活跃', updated: '今天', links: 3, tags: ['界面', '交互'], description: '记录导航、反馈、键盘操作与响应式布局的设计约定。', order: 2 },
    { id: 3, title: '任务交接流程', folder: '协作流程', status: '活跃', updated: '昨天', links: 2, tags: ['交接', '流程'], description: '把目标、当前状态、验证结果和下一步收拢到一份清晰的交接记录。', order: 4 },
    { id: 4, title: '数据口径说明', folder: '数据治理', status: '草稿', updated: '昨天', links: 4, tags: ['数据', '定义'], description: '为关键指标记录来源、统计范围与更新时间，方便后续复核。', order: 5 },
    { id: 5, title: '安全与权限边界', folder: '系统维护', status: '活跃', updated: '周一', links: 2, tags: ['权限', '安全'], description: '整理本地工具处理内容时的读取范围、写入条件与敏感信息边界。', order: 6 },
    { id: 6, title: '搜索与索引策略', folder: '知识库', status: '活跃', updated: '周一', links: 3, tags: ['搜索', '索引'], description: '从标题、主题和标签组织快速检索入口，并保留回到原文的路径。', order: 7 },
    { id: 7, title: '设计系统组件', folder: '设计系统', status: '草稿', updated: '上周', links: 2, tags: ['组件', '视觉'], description: '沉淀纸面排版、状态标签、密度控制和信息层级的复用规则。', order: 8 },
    { id: 8, title: '项目例会纪要', folder: '项目管理', status: '归档', updated: '上周', links: 2, tags: ['例会', '决议'], description: '用简短的结论、责任人与日期记录一次项目沟通。', order: 9 },
    { id: 9, title: '部署验证清单', folder: '系统维护', status: '活跃', updated: '上周', links: 1, tags: ['验证', '部署'], description: '区分页面可打开、交互可操作与真实数据接入等不同验收层次。', order: 10 },
    { id: 10, title: '季度项目计划', folder: '项目管理', status: '草稿', updated: '上周', links: 2, tags: ['计划', '里程碑'], description: '把目标拆成可交付的阶段，并为每一步标注可观察结果。', order: 11 },
    { id: 11, title: '动效参数记录', folder: '设计系统', status: '活跃', updated: '上周', links: 1, tags: ['动效', '粒子'], description: '记录粒子密度、运动节奏与减少动态效果时的替代呈现。', order: 12 },
    { id: 12, title: '本周复盘', folder: '协作流程', status: '草稿', updated: '上周', links: 1, tags: ['复盘', '总结'], description: '汇总已完成工作、证据与遗留问题，保持后续行动明确。', order: 13 }
  ];

  const tasks = [
    { id: 't1', title: '整理知识空间入口', folder: '知识库', due: '今天', done: false, order: 3 },
    { id: 't2', title: '核对设计组件的文字对比度', folder: '设计系统', due: '明天', done: false, order: 14 },
    { id: 't3', title: '补全搜索与筛选交互', folder: '知识库', due: '本周', done: false, order: 15 },
    { id: 't4', title: '确认权限说明', folder: '系统维护', due: '本周', done: false, order: 16 },
    { id: 't5', title: '优化移动端阅读布局', folder: '设计系统', due: '本周', done: false, order: 17 },
    { id: 't6', title: '建立任务状态示例', folder: '协作流程', due: '已完成', done: true, order: 18 },
    { id: 't7', title: '整理展示用笔记', folder: '项目管理', due: '已完成', done: true, order: 19 },
    { id: 't8', title: '校验页面离线资源', folder: '系统维护', due: '已完成', done: true, order: 20 }
  ];

  const paletteColors = {
    mint: ['#1e5e4b', '30,94,75'],
    blue: ['#253eb5', '37,62,181'],
    violet: ['#674476', '103,68,118'],
    gold: ['#b6562d', '182,86,45']
  };
  const storageKey = 'interform-studio-v2';
  const ids = Object.fromEntries([
    'activityList','noteRows','taskRows','folderFilter','globalSearch','detailCode','detailTitle','detailDescription',
    'detailStatus','detailFolder','detailUpdated','detailLinks','detailType','detailTags','noteCount','folderCount',
    'pendingCount','doneCount','linkCount','taskProgress','notesResultCount','focusNote',
    'overviewFocusSlot','notesFocusSlot','shapeName','overviewView','notesView','tasksView','densityRange','densityOutput',
    'drawerDensityRange','drawerDensityOutput','particleCount','drawerParticleCount',
    'settingsDrawer','settingsButton','closeSettings','drawerMotionToggle','motionButton','toast',
    'copyTitleButton','ambientCanvas','sphereCanvas','viewAllNotes'
  ].map(id => [id, document.getElementById(id)]));

  function readSaved() {
    try {
      const current = localStorage.getItem(storageKey);
      if (current) return JSON.parse(current) || {};
      const legacy = JSON.parse(localStorage.getItem('knowledge-particle-cockpit-v1') || '{}');
      return {taskDone: legacy.taskDone};
    }
    catch { return {}; }
  }
  const saved = readSaved();
  const state = {
    view: 'overview',
    selectedNote: notes[0],
    activityFilter: 'all',
    density: Math.max(.65, Math.min(1.6, Number(saved.density) || 1)),
    palette: Object.hasOwn(paletteColors, saved.palette) ? saved.palette : 'blue',
    motion: saved.motion !== false,
    shape: ['knot','sphere','wave'].includes(saved.shape) ? saved.shape : 'knot',
    taskDone: typeof saved.taskDone === 'object' && saved.taskDone ? saved.taskDone : {},
    engine: null,
    toastTimer: null
  };
  for (const task of tasks) if (typeof state.taskDone[task.id] === 'boolean') task.done = state.taskDone[task.id];

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({density: state.density, palette: state.palette, motion: state.motion, shape: state.shape, taskDone: state.taskDone})); }
    catch { /* The page remains usable if browser storage is unavailable. */ }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function matches(text) { return text.toLocaleLowerCase('zh-CN').includes(ids.globalSearch.value.trim().toLocaleLowerCase('zh-CN')); }
  function toast(message) {
    ids.toast.textContent = message;
    ids.toast.classList.add('is-visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => ids.toast.classList.remove('is-visible'), 2400);
  }

  function updateStats() {
    ids.noteCount.textContent = String(notes.length);
    ids.folderCount.textContent = String(new Set(notes.map(note => note.folder)).size);
    ids.pendingCount.textContent = String(tasks.filter(task => !task.done).length);
    ids.doneCount.textContent = String(tasks.filter(task => task.done).length);
    ids.linkCount.textContent = String(notes.reduce((sum, note) => sum + note.links, 0));
    ids.taskProgress.textContent = `${tasks.filter(task => task.done).length} / ${tasks.length} 项已完成`;
  }

  function selectNote(note, reveal = false) {
    state.selectedNote = note;
    ids.detailCode.textContent = `NOTE-${String(note.id).padStart(3, '0')}`;
    ids.detailTitle.textContent = note.title;
    ids.detailDescription.textContent = note.description;
    ids.detailStatus.textContent = note.status === '活跃' ? '活跃笔记' : note.status;
    ids.detailFolder.textContent = note.folder;
    ids.detailUpdated.textContent = note.updated;
    ids.detailLinks.textContent = `${note.links} 条`;
    ids.detailType.textContent = '笔记';
    ids.detailTags.replaceChildren(...note.tags.map(tag => el('span', '', tag)));
    document.querySelectorAll('[data-note-id]').forEach(row => row.classList.toggle('is-selected', Number(row.dataset.noteId) === note.id));
    if (reveal && state.view === 'overview' && matchMedia('(max-width:720px)').matches) switchView('notes');
    placeFocus();
    if (reveal && state.view === 'notes') ids.focusNote.scrollIntoView({block: 'nearest', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth'});
  }

  function switchView(view) {
    if (!['overview', 'notes', 'tasks'].includes(view)) return;
    state.view = view;
    document.body.dataset.view = view;
    for (const name of ['overview', 'notes', 'tasks']) {
      const node = ids[`${name}View`];
      node.hidden = name !== view;
      node.classList.toggle('is-visible', name === view);
    }
    document.querySelectorAll('.nav-item[data-view]').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    if (view === 'notes') renderNotes();
    if (view === 'tasks') renderTasks();
    if (view === 'overview') renderActivity();
    placeFocus();
    state.engine?.setMotion(state.motion && view === 'overview');
    requestAnimationFrame(() => requestAnimationFrame(updateParticleCount));
  }

  function placeFocus() {
    ids.focusNote.hidden = state.view === 'tasks';
    if (state.view === 'overview') ids.overviewFocusSlot.append(ids.focusNote);
    if (state.view === 'notes') {
      const selected = ids.noteRows.querySelector(`[data-note-id="${state.selectedNote.id}"]`);
      if (selected) selected.after(ids.focusNote); else ids.notesFocusSlot.append(ids.focusNote);
    }
  }

  function activityIcon(kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', kind === 'task' ? 'M8 12l3 3 5-6M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0' : 'M5 3h10l4 4v14H5zM14 3v5h5M9 12h6M9 16h6');
    svg.append(path); return svg;
  }

  function renderActivity() {
    let items = [
      ...notes.slice(0, 6).map(note => ({kind: 'note', record: note, order: note.order})),
      ...tasks.slice(0, 2).map(task => ({kind: 'task', record: task, order: task.order}))
    ].sort((a, b) => a.order - b.order);
    if (state.activityFilter !== 'all') items = items.filter(item => item.kind === (state.activityFilter === 'notes' ? 'note' : 'task'));
    items = items.filter(item => matches(`${item.record.title} ${item.record.folder}`));
    const rows = items.map(item => {
      const button = el('button', `activity-item${item.kind === 'note' && item.record.id === state.selectedNote.id ? ' is-selected' : ''}`);
      button.type = 'button';
      if (item.kind === 'note') button.dataset.noteId = String(item.record.id);
      const symbol = el('span', `activity-symbol${item.kind === 'task' ? ' task' : ''}`);
      symbol.append(activityIcon(item.kind));
      const copy = el('span', 'activity-copy');
      copy.append(el('strong', '', item.record.title), el('small', '', item.record.folder));
      const time = el('span', 'activity-time', item.kind === 'note' ? item.record.updated : item.record.due);
      button.append(symbol, copy, time);
      button.addEventListener('click', () => {
        if (item.kind === 'note') selectNote(item.record, true);
        else { switchView('tasks'); document.getElementById(`task-${item.record.id}`)?.scrollIntoView({block:'center',behavior:'smooth'}); toast('已定位到演示任务'); }
      });
      return button;
    });
    ids.activityList.replaceChildren(...(rows.length ? rows : [emptyState('没有匹配的活动', '试试其他关键词或筛选条件')]));
  }

  function emptyState(title, description) {
    const box = el('div', 'empty-state');
    box.append(el('strong', '', title), el('span', '', description));
    return box;
  }

  function renderNotes() {
    const folder = ids.folderFilter.value;
    const filtered = notes.filter(note => (folder === 'all' || note.folder === folder) && matches(`${note.title} ${note.folder} ${note.status} ${note.tags.join(' ')}`));
    const rows = filtered.map(note => {
      const row = el('button', `note-row${note.id === state.selectedNote.id ? ' is-selected' : ''}`);
      row.type = 'button'; row.dataset.noteId = String(note.id);
      const title = el('span'); title.append(el('strong', '', note.title), el('small', '', `NOTE-${String(note.id).padStart(3, '0')}`));
      const status = el('span'); status.append(el('span', `status-pill${note.status === '活跃' ? '' : ' draft'}`, note.status));
      row.append(title, el('span', '', note.folder), status, el('span', '', note.updated));
      row.addEventListener('click', () => selectNote(note, true));
      return row;
    });
    ids.noteRows.replaceChildren(...(rows.length ? rows : [emptyState('没有匹配的笔记', '调整搜索词或主题筛选')]));
    ids.notesResultCount.textContent = `显示 ${filtered.length} / ${notes.length} 篇演示笔记`;
    if (state.view === 'notes') placeFocus();
  }

  function renderTasks() {
    const filtered = tasks.filter(task => matches(`${task.title} ${task.folder} ${task.due}`));
    const rows = filtered.map(task => {
      const row = el('label', `task-row${task.done ? ' done' : ''}`);
      row.id = `task-${task.id}`;
      const checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.checked = task.done; checkbox.setAttribute('aria-label', task.title);
      const body = el('span', 'task-row-body'); body.append(el('strong', '', task.title), el('small', '', `${task.folder} · ${task.done ? '已完成' : task.due}`));
      row.append(checkbox, body, el('span', 'task-row-tag', task.done ? '完成' : '待办'));
      checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
        state.taskDone[task.id] = task.done;
        save(); updateStats(); renderTasks(); renderActivity();
        document.querySelector(`#task-${task.id} input`)?.focus({preventScroll: true});
        toast(task.done ? '任务已标记完成，仅更新本地演示' : '任务已恢复待办，仅更新本地演示');
      });
      return row;
    });
    ids.taskRows.replaceChildren(...(rows.length ? rows : [emptyState('没有匹配的任务', '调整搜索词查看其他演示任务')]));
  }

  function renderFolders() {
    const counts = new Map();
    for (const note of notes) counts.set(note.folder, (counts.get(note.folder) || 0) + 1);
    ids.folderFilter.append(...[...counts.keys()].sort().map(folder => {
      const option = el('option', '', folder); option.value = folder; return option;
    }));
  }

  function setDensity(value) {
    state.density = Math.max(.65, Math.min(1.6, Number(value) || 1));
    ids.densityRange.value = String(state.density);
    ids.drawerDensityRange.value = String(state.density);
    ids.densityOutput.textContent = `${Math.round(state.density * 100)}%`;
    ids.drawerDensityOutput.textContent = ids.densityOutput.textContent;
    state.engine?.setDensity(state.density);
    updateParticleCount(); save();
  }
  function setPalette(palette) {
    if (!paletteColors[palette]) return;
    state.palette = palette;
    const [hex] = paletteColors[palette];
    document.documentElement.style.setProperty('--particle-accent', hex);
    document.querySelectorAll('.palette-option').forEach(button => {
      button.classList.toggle('is-active', button.dataset.palette === palette);
      button.setAttribute('aria-pressed', String(button.dataset.palette === palette));
    });
    state.engine?.setPalette(palette);
    save();
  }
  function setMotion(enabled) {
    state.motion = Boolean(enabled);
    ids.motionButton.textContent = state.motion ? '暂停动效' : '继续动效';
    ids.motionButton.setAttribute('aria-pressed', String(!state.motion));
    ids.drawerMotionToggle.checked = state.motion;
    state.engine?.setMotion(state.motion && state.view === 'overview');
    save();
  }
  function updateParticleCount() {
    const count = state.engine?.getCount() || 0;
    const formatted = count ? new Intl.NumberFormat('zh-CN').format(count) : '加载中';
    ids.particleCount.textContent = formatted;
    ids.drawerParticleCount.textContent = formatted;
  }

  function openSettings() {
    ids.settingsDrawer.classList.add('is-open');
    ids.settingsDrawer.setAttribute('aria-hidden', 'false');
    ids.settingsDrawer.inert = false;
    ids.settingsButton.setAttribute('aria-expanded', 'true');
    ids.closeSettings.focus();
  }
  function closeSettings() {
    ids.settingsDrawer.classList.remove('is-open');
    ids.settingsDrawer.setAttribute('aria-hidden', 'true');
    ids.settingsDrawer.inert = true;
    ids.settingsButton.setAttribute('aria-expanded', 'false');
    ids.settingsButton.focus();
  }

  function bindEvents() {
    document.querySelectorAll('.nav-item[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
    document.querySelectorAll('.segment').forEach(button => button.addEventListener('click', () => {
      state.activityFilter = button.dataset.activityFilter;
      document.querySelectorAll('.segment').forEach(item => item.classList.toggle('is-active', item === button));
      renderActivity();
    }));
    ids.viewAllNotes.addEventListener('click', () => switchView('notes'));
    ids.globalSearch.addEventListener('input', () => { renderActivity(); renderNotes(); renderTasks(); });
    ids.folderFilter.addEventListener('change', renderNotes);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && ids.settingsDrawer.classList.contains('is-open')) closeSettings();
      if (event.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) { event.preventDefault(); ids.globalSearch.focus(); }
    });
    ids.settingsButton.addEventListener('click', () => ids.settingsDrawer.classList.contains('is-open') ? closeSettings() : openSettings());
    ids.closeSettings.addEventListener('click', closeSettings);
    document.addEventListener('pointerdown', event => {
      if (ids.settingsDrawer.classList.contains('is-open') && !ids.settingsDrawer.contains(event.target) && !ids.settingsButton.contains(event.target)) closeSettings();
    });
    ids.densityRange.addEventListener('input', event => setDensity(event.target.value));
    ids.drawerDensityRange.addEventListener('input', event => setDensity(event.target.value));
    document.querySelectorAll('.palette-option').forEach(button => button.addEventListener('click', () => setPalette(button.dataset.palette)));
    ids.motionButton.addEventListener('click', () => setMotion(!state.motion));
    ids.drawerMotionToggle.addEventListener('change', event => setMotion(event.target.checked));
    ids.copyTitleButton.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(state.selectedNote.title); toast('已复制演示笔记标题'); }
      catch { toast('浏览器限制了复制，可直接选择笔记标题'); }
    });
    document.querySelector('[data-home]').addEventListener('click', () => switchView('overview'));
    document.querySelectorAll('.shape-option').forEach(button => button.addEventListener('click', () => setShape(button.dataset.shape)));
    window.addEventListener('resize', () => requestAnimationFrame(() => requestAnimationFrame(updateParticleCount)), {passive: true});
  }

  function setShape(shape) {
    if (!['knot','sphere','wave'].includes(shape)) return;
    state.shape = shape;
    ids.shapeName.textContent = {knot:'共生环',sphere:'引力球',wave:'流动面'}[shape];
    document.querySelectorAll('.shape-option').forEach(button => {
      const active = button.dataset.shape === shape;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    state.engine?.setShape(shape); save();
  }
  function initParticles() {
    if (typeof window.createParticleEngine !== 'function') { toast('粒子模块未能加载'); return; }
    try {
      state.engine = window.createParticleEngine({backgroundCanvas: ids.ambientCanvas, sphereCanvas: ids.sphereCanvas, density: state.density, palette: state.palette, motion: state.motion, shape: state.shape});
      state.engine.setShape(state.shape);
      updateParticleCount();
    } catch (error) {
      console.error('粒子初始化失败', error);
      toast('粒子效果暂不可用，页面内容仍可操作');
    }
  }

  updateStats();
  renderFolders();
  selectNote(notes[0]);
  renderActivity();
  renderNotes();
  renderTasks();
  setDensity(state.density);
  setPalette(state.palette);
  setMotion(state.motion);
  bindEvents();
  setShape(state.shape);
  initParticles();
})();
