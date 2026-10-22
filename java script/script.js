'use strict';

/* ============================================================
   «ПОСЛЕДНИЙ БОКАЛ» — детективная игра

   Файл разделён на части:
   1) ДАННЫЕ     — улики, места, подозреваемые, концовки
                   (тексты можно менять, не трогая логику)
   2) СОСТОЯНИЕ  — что игрок уже нашёл и узнал
   3) ИНТЕРФЕЙС  — отрисовка (функции render...)
   4) ЛОГИКА     — осмотр мест, допросы, открытие подозреваемого
   5) ФИНАЛ      — обвинение и выбор концовки
   ============================================================ */


/* ============================================================
   1. ДАННЫЕ
   ============================================================ */

/* Улики (инвентарь).
   cat — роль улики в обвинении доктора Левина:
         motive = мотив, means = средство, opportunity = возможность.
   Чтобы обвинение было убедительным, нужно покрыть все три. */
const CLUES = {
  watch: {
    name: 'Разбитые часы', icon: '🕰️',
    text: 'Настенные часы в кабинете остановились ровно на 22:15. Стекло разбито, будто их задели при падении или борьбе. Похоже, это время смерти Воронова.'
  },
  glass: {
    name: 'Бокал с коньяком', icon: '🥃', cat: 'means',
    text: 'На столе бокал с остатками коньяка. Запах странный: к коньяку примешан горький химический оттенок. На столешнице два кольца от донышек, значит, был ещё один бокал, и его кто-то унёс.'
  },
  notebook: {
    name: 'Записная книжка', icon: '📓', cat: 'motive',
    text: 'Последняя запись Воронова: «Б. Л. годами выписывал липовые рецепты и выводил деньги клиники. Всё проверил, доказательства готовы. Завтра иду в полицию».'
  },
  bank: {
    name: 'Банковские выписки', icon: '🏦', cat: 'motive',
    text: 'Из сейфа: выписки по счетам клиники «Белый кедр». Крупные суммы регулярно уходили на личный счёт Бориса Левина. Воронов был главным вкладчиком клиники и всё это отследил.'
  },
  letter: {
    name: 'Письмо Лидии', icon: '✉️',
    text: 'Смятое письмо: «Дядя, мне срочно нужны деньги, иначе меня выселят из мастерской. Прошу, не откажи». Подпись: Лидия.'
  },
  will: {
    name: 'Завещание', icon: '📜',
    text: 'Дом достаётся племяннице Лидии, дворецкому Игнату назначена пожизненная рента, садовнику Фёдору — небольшая сумма. Доктор в завещании не упомянут.'
  },
  footprints: {
    name: 'Следы в оранжерее', icon: '👞', cat: 'opportunity',
    text: 'Узкие отпечатки кожаных туфель 43 размера ведут от окна кабинета через оранжерею к калитке. Садовник Фёдор носит резиновые сапоги 45 размера, это точно не его следы.'
  },
  key: {
    name: 'Ключ от сейфа', icon: '🗝️',
    text: 'Маленький ключ, спрятанный в горшке с геранью. Судя по бородке, он подходит к сейфу в кабинете.'
  },
  vial: {
    name: 'Пустой флакон', icon: '🧪', cat: 'means',
    text: 'Пустой флакон из мусорного ведра на кухне. На остатке этикетки читается: «Клиника «Белый кедр»». Это сильнодействующий препарат, который выдают только врачам клиники.'
  }
};

/* Места. items — предметы, которые можно осмотреть.
   requires — улика-«ключ», без которой предмет не открыть.
   unlockAsk — место открывается, когда задан вопрос "id подозреваемого:номер вопроса". */
const PLACES = [
  {
    id: 'study', name: 'Кабинет', icon: '📚',
    desc: 'Кабинет Воронова. Здесь его и нашли. Тяжёлые шторы, запах коньяка и старых книг. Дверь не взломана, окно приоткрыто.',
    items: [
      { label: 'Настенные часы', icon: '🕰️', clue: 'watch' },
      { label: 'Письменный стол', icon: '🥃', clue: 'glass' },
      { label: 'Ящик стола', icon: '🗄️', clue: 'notebook' },
      { label: 'Сейф за картиной', icon: '🔐', clue: 'bank', requires: 'key', lockedText: 'Сейф заперт. Без ключа его не открыть.' }
    ]
  },
  {
    id: 'lounge', name: 'Гостиная', icon: '🛋️',
    desc: 'Гостиная. В камине тлеют обрывки бумаги, а на бюро лежит стопка документов.',
    items: [
      { label: 'Камин', icon: '🔥', clue: 'letter' },
      { label: 'Бюро с документами', icon: '🗂️', clue: 'will' }
    ]
  },
  {
    id: 'greenhouse', name: 'Оранжерея', icon: '🌿',
    desc: 'Оранжерея. Окно кабинета выходит прямо сюда. Земля на дорожке влажная, и на ней хорошо видны отпечатки.',
    items: [
      { label: 'Дорожка у окна', icon: '👣', clue: 'footprints' },
      { label: 'Горшок с геранью', icon: '🪴', clue: 'key' }
    ]
  },
  {
    id: 'kitchen', name: 'Кухня', icon: '🍳',
    desc: 'Кухня. Здесь убирали после ужина, мусор ещё не вынесли.',
    unlockAsk: 'ignat:1',
    lockedHint: 'Кухня пока закрыта. Возможно, кто-то из прислуги подскажет, где ещё стоит искать.',
    items: [
      { label: 'Мусорное ведро', icon: '🗑️', clue: 'vial' }
    ]
  }
];

/* Подозреваемые.
   questions — вопросы (a — ответ).
   reactions — реакция на предъявленную улику (hot: true = человек занервничал).
   У скрытого подозреваемого есть needs — улики, после которых он появляется. */
const SUSPECTS = {
  ignat: {
    name: 'Игнат Платонович', role: 'Дворецкий', icon: '🎩',
    story: 'Служит в доме двадцать пять лет и знает все привычки хозяина. Говорит, что вечером разносил чай, а в десять ушёл к себе.',
    questions: [
      { q: 'Где вы были в 22:15?', a: 'В своей комнате, сэр, готовился ко сну. Около четверти одиннадцатого слышал наверху грохот, но решил, что хозяин опять уронил книги.' },
      { q: 'Кто был в доме вечером?', a: 'Мисс Лидия приезжала к ужину и уехала раньше. Позже хозяин принимал кого-то в кабинете, я не видел кого. Я лишь унёс на кухню поднос и пустые флаконы, велел всё оставить как есть до утра. Загляните туда, если нужно.' },
      { q: 'Что вам оставил хозяин?', a: 'Пожизненную ренту, это правда. Но я бы не тронул хозяина и волоса, сэр.' }
    ],
    defaultReaction: { t: 'Простите, сэр, мне нечего сказать по этому поводу.' },
    reactions: {
      watch: { t: 'Грохот был примерно в это время. Часы, должно быть, упали тогда же.' },
      glass: { t: 'Хозяин пил коньяк из одного и того же бокала. Второй я подавал только гостям. Значит, у него был гость.' },
      will: { t: 'Хозяин был ко мне щедр. Но зачем убивать человека, который кормил меня четверть века?' },
      vial: { t: 'Это не из нашей аптечки, сэр. Хозяин лекарств не принимал, он не любил докторов.' }
    }
  },

  lidia: {
    name: 'Лидия Воронова', role: 'Племянница', icon: '🎨',
    story: 'Художница, единственная родственница. Приехала на ужин и говорит, что уехала в 21:45. Её мастерской грозит выселение за долги.',
    questions: [
      { q: 'Где вы были в 22:15?', a: 'Ехала домой на такси. Можете проверить у водителя. Я уехала после ссоры.' },
      { q: 'Зачем вы приезжали к дяде?', a: 'Просила денег. Он отказал, мы поругались, и я хлопнула дверью. Теперь я жалею об этом каждую минуту.' },
      { q: 'Были ли у дяди враги?', a: 'Не знаю. Он говорил, что скоро разоблачит одного «очень уважаемого человека». Имени не назвал.' }
    ],
    defaultReaction: { t: 'Я не понимаю, при чём тут это.' },
    reactions: {
      letter: { t: 'Да, это моё письмо. Я просила в долг. Но убить? Ни за что, я любила дядю!' },
      will: { t: 'Дом достанется мне? Я не знала! Клянусь, я не знала об этом.' },
      glass: { t: 'Я пила чай, не коньяк. Бокалов не касалась.' },
      watch: { t: 'В это время я уже была в такси.' },
      notebook: { t: '«Б. Л.»... Не знаю такого. Хотя дядя дружил с кем-то из клиники, кажется.' }
    }
  },

  fedor: {
    name: 'Фёдор Никитич', role: 'Садовник', icon: '🧤',
    story: 'Работает десять лет, человек молчаливый и вспыльчивый. Ночует в сторожке. Недавно хозяин пригрозил его уволить.',
    questions: [
      { q: 'Где вы были в 22:15?', a: 'В сторожке, слушал радио. Правда, выходил покурить: показалось, у оранжереи кто-то ходит. Но было холодно, я не пошёл смотреть.' },
      { q: 'Вы ссорились с хозяином?', a: 'Было дело. Грозился уволить из-за теплицы. Но я не убийца, я цветы выращиваю.' },
      { q: 'Что вы видели у оранжереи?', a: 'Тень. Лица не разглядел. Походка такая... городская, неторопливая. Наш брат так не ходит.' }
    ],
    defaultReaction: { t: 'Моё дело — сад, барин. В этом я не разбираюсь.' },
    reactions: {
      footprints: { t: 'Это не мои следы. Я хожу в сапогах, 45-й размер. Сапоги у порога, можете сравнить.' },
      key: { t: 'Хозяин прятал ключ в горшке с геранью. Я видел, но никому не говорил. Не моё это дело.' },
      will: { t: 'Мне пара тысяч... Не густо. Из-за такого убивать? Нет.' }
    }
  },

  /* Скрытый подозреваемый. Появляется, когда найдены ВСЕ улики из needs. */
  boris: {
    name: 'Борис Левин', role: 'Семейный врач', icon: '🩺',
    needs: ['notebook', 'vial'],
    story: 'Врач семьи Вороновых и совладелец клиники «Белый кедр». Обходителен, спокоен, всегда безупречно одет.',
    questions: [
      { q: 'Где вы были вечером?', a: 'На дежурстве в клинике, до полуночи. Любой коллега подтвердит.' },
      { q: 'Какие у вас были отношения с Вороновым?', a: 'Деловые и дружеские. Он вкладывал деньги в клинику. Такой потери я не ожидал.' },
      { q: 'Чем болел Воронов?', a: 'Давление, ничего серьёзного. Такая внезапная смерть для меня шок.' }
    ],
    defaultReaction: { t: 'Не понимаю, какое отношение это имеет ко мне.' },
    reactions: {
      vial: { t: 'Таких флаконов у нас тысячи. Любой мог его достать.', hot: true },
      notebook: { t: '«Б. Л.»? Мало ли на свете людей с такими инициалами...', hot: true },
      bank: { t: 'Это... инвестиции. Всё абсолютно законно. Я не обязан отчитываться.', hot: true },
      footprints: { t: 'Смешно. Сорок третий размер носит половина города.' },
      glass: { t: 'Не понимаю, при чём здесь я.' },
      will: { t: 'Меня в завещании нет, как видите. Мне ничего не нужно.' }
    }
  }
};

/* Концовки. type: win / mid / lose — цвет экрана. */
const ENDINGS = {
  boris_full: {
    n: 1, type: 'win', badge: '🏆', title: 'Дело раскрыто',
    text: [
      'Вы выложили перед Левиным улики одну за другой. Мотив: Воронов собирался передать полиции доказательства хищений. Средство: препарат, который выдают только в клинике «Белый кедр». Возможность: следы туфель 43 размера от окна кабинета до калитки.',
      'Алиби «дежурство» рассыпалось: выяснилось, что в тот вечер он ушёл из клиники ещё в половине десятого. Левин молча снял часы и положил на стол: он понял, что игра окончена.',
      'Лидия сохранила дом и открыла в нём галерею памяти дяди. Игнат остался хранить кабинет, а Фёдор вырастил в оранжерее новые розы.'
    ]
  },
  boris_partial: {
    n: 2, type: 'mid', badge: '⚖️', title: 'Убийца пойман, но...',
    text: [
      'Вы назвали верное имя. Левина задержали, но обвинение держится лишь на двух опорах из трёх. Адвокат доказывает, что одни улики косвенные, а другие мог оставить кто угодно.',
      'Суд признаёт доктора виновным в хищениях и в причинении смерти, но срок оказывается мягче, чем он заслуживал. Дело закрыто, но вы чувствуете: для полной победы не хватило одного звена цепочки.',
      'Подсказка для следующей игры: хорошее обвинение объясняет мотив, средство и возможность.'
    ]
  },
  boris_weak: {
    n: 3, type: 'lose', badge: '🕊️', title: 'Доктор на свободе',
    text: [
      'Вы обвинили настоящего убийцу, но улик, которые связывают именно его с преступлением, оказалось слишком мало. Левин вежливо улыбнулся, а его адвокат разнёс обвинение за полчаса.',
      'Через неделю клиника «Белый кедр» закрылась, а доктор исчез за границей. Дело о смерти Воронова так и осталось без приговора.'
    ]
  },
  ignat_wrong: {
    n: 4, type: 'lose', badge: '🎩', title: 'Верный слуга за решёткой',
    text: [
      'Игнат Платонович молча выслушал обвинение и только спросил: «Вы уверены, сэр?». Он не сопротивлялся и не просил адвоката.',
      'Через месяц нашлись свидетели: в ту ночь он действительно не выходил из своей комнаты. Но настоящий убийца к тому времени был уже далеко. Дворецкий был оправдан, но дело раскрыто не было.'
    ]
  },
  lidia_wrong: {
    n: 5, type: 'lose', badge: '🎨', title: 'Сломанная жизнь',
    text: [
      'Лидию арестовали на глазах у соседей. Письмо с просьбой о деньгах и завещание сделали своё дело: пресса уже назвала её «наследницей-убийцей».',
      'Водитель такси подтвердил её алиби слишком поздно. Репутация художницы была разрушена, мастерскую пришлось продать. Настоящий убийца остался на свободе.'
    ]
  },
  fedor_wrong: {
    n: 6, type: 'lose', badge: '🧤', title: 'Не тот человек',
    text: [
      'Фёдор не стал спорить, только бросил: «Сапоги мои у порога, барин. Сорок пятый размер». Вы не обратили на это внимания.',
      'Экспертиза доказала: следы у окна оставил не он. Садовника отпустили, но обиды он не простил и уехал из города, а дело о смерти Воронова вернулось на исходную точку.'
    ]
  },
  none: {
    n: 7, type: 'mid', badge: '🗄️', title: 'Дело повисло',
    text: [
      'Вы не рискнули обвинить кого-либо. Полиция, не получив от вас внятных выводов, списала смерть Воронова на несчастный случай и закрыла дело.',
      'Бокал вымыли, часы выбросили, а правда осталась там же, где и была: в тёмном кабинете на втором этаже.'
    ]
  }
};


/* ============================================================
   2. СОСТОЯНИЕ ИГРЫ
   ============================================================ */

const state = {
  clues: [],                                     // найденные улики (id)
  asked: new Set(),                              // заданные вопросы: "ignat:0"
  shown: new Set(),                              // предъявленные улики: "ignat>will"
  suspects: new Set(['ignat', 'lidia', 'fedor']),// открытые подозреваемые
  dialogs: {},                                   // история допросов по каждому
  journal: [],                                   // записи дневника
  notified: new Set(),                           // места, о которых уже сообщили
  place: 'study',                                // текущее место
  newSuspect: null,                              // подсветка нового подозреваемого
  accuse: { suspect: null, proofs: [] }          // выбор в окне обвинения
};

const $ = (sel) => document.querySelector(sel);
const hasClue = (id) => state.clues.includes(id);
const isPlaceOpen = (p) => !p.unlockAsk || state.asked.has(p.unlockAsk);


/* ============================================================
   3. ИНТЕРФЕЙС
   ============================================================ */

function toast(text, type = 'info') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = text;
  $('#toasts').appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 400);
  }, 3300);
}

function openModal(html, wide = false) {
  $('#modalBody').innerHTML = html;
  $('#modal').className = 'overlay show' + (wide ? ' wide' : '');
  $('#modalBox').scrollTop = 0;
}

function closeModal() {
  $('#modal').classList.remove('show');
}

function renderPlaces() {
  const box = $('#placeTabs');
  box.innerHTML = '';
  PLACES.forEach((p) => {
    const open = isPlaceOpen(p);
    const b = document.createElement('button');
    b.className = 'tab' + (state.place === p.id ? ' active' : '') + (open ? '' : ' locked');
    b.textContent = (open ? p.icon : '🔒') + ' ' + p.name;
    b.onclick = () => {
      if (!open) { toast(p.lockedHint, 'warn'); return; }
      state.place = p.id;
      renderPlaces();
      renderScene();
    };
    box.appendChild(b);
  });
}

function renderScene() {
  const p = PLACES.find((x) => x.id === state.place);
  $('#scene').innerHTML = `<p class="scene-desc">${p.desc}</p><div class="items" id="items"></div>`;
  const items = $('#items');

  p.items.forEach((it) => {
    const found = hasClue(it.clue);
    const locked = it.requires && !hasClue(it.requires) && !found;
    const b = document.createElement('button');
    b.className = 'item' + (found ? ' found' : '') + (locked ? ' locked' : '');
    b.innerHTML =
      `<span class="item-ico">${locked ? '🔒' : it.icon}</span>` +
      `<span class="item-name">${it.label}</span>` +
      `<small>${found ? '✔ ' + CLUES[it.clue].name : locked ? 'Закрыто' : 'Осмотреть'}</small>`;
    b.onclick = () => examine(it);
    items.appendChild(b);
  });
}

function renderSuspects() {
  const box = $('#suspects');
  box.innerHTML = '';

  state.suspects.forEach((id) => {
    const s = SUSPECTS[id];
    const b = document.createElement('button');
    b.className = 'suspect' + (state.newSuspect === id ? ' new' : '');
    b.innerHTML =
      `<span class="ava">${s.icon}</span>` +
      `<span><b>${s.name}</b><small>${s.role}</small></span>`;
    b.onclick = () => {
      if (state.newSuspect === id) state.newSuspect = null;
      openSuspect(id);
      renderSuspects();
    };
    box.appendChild(b);
  });

  // Карточка-«загадка», пока скрытый подозреваемый не открыт
  if (!state.suspects.has('boris')) {
    const needs = SUSPECTS.boris.needs;
    const got = needs.filter(hasClue).length;
    const d = document.createElement('div');
    d.className = 'suspect locked';
    d.innerHTML =
      `<span class="ava">❓</span>` +
      `<span><b>Неизвестный</b><small>Улики пока не указывают на других людей (связанных улик: ${got}/${needs.length})</small></span>`;
    box.appendChild(d);
  }
}

function renderInventory() {
  const box = $('#inventory');
  box.innerHTML = '';
  if (!state.clues.length) {
    box.innerHTML = '<p class="empty">Пока пусто. Осмотрите места: кабинет, гостиную, оранжерею.</p>';
    return;
  }
  state.clues.forEach((id) => {
    const c = CLUES[id];
    const b = document.createElement('button');
    b.className = 'clue-card';
    b.innerHTML = `<span>${c.icon}</span>${c.name}`;
    b.onclick = () => showClue(id);
    box.appendChild(b);
  });
}

function renderJournal() {
  const box = $('#journal');
  if (!state.journal.length) {
    box.innerHTML = '<p class="empty">Здесь будут записи о ваших находках и допросах.</p>';
    return;
  }
  box.innerHTML = '';
  [...state.journal].reverse().forEach((e) => {
    const d = document.createElement('div');
    d.className = 'entry ' + e.type;
    d.textContent = e.text;
    box.appendChild(d);
  });
}

function updateProgress() {
  const total = Object.keys(CLUES).length;
  $('#clueCount').textContent = state.clues.length;
  $('#clueTotal').textContent = total;
  $('#clueBar').style.width = (state.clues.length / total * 100) + '%';
}

function renderAll() {
  renderPlaces();
  renderScene();
  renderSuspects();
  renderInventory();
  renderJournal();
  updateProgress();
}

function addJournal(type, text) {
  state.journal.push({ type, text });
  renderJournal();
}


/* ============================================================
   4. ЛОГИКА: осмотр, улики, допросы
   ============================================================ */

function examine(item) {
  // Уже находили: просто показываем улику ещё раз
  if (hasClue(item.clue)) { showClue(item.clue); return; }

  // Предмет закрыт, нужна другая улика (например, ключ)
  if (item.requires && !hasClue(item.requires)) {
    toast(item.lockedText, 'warn');
    return;
  }

  addClue(item.clue);
}

function addClue(id) {
  state.clues.push(id);
  const c = CLUES[id];
  toast('Новая улика: ' + c.name, 'clue');
  addJournal('clue', `Найдено: ${c.name}. ${c.text}`);
  checkUnlocks();
  renderAll();
  showClue(id);
}

function showClue(id) {
  const c = CLUES[id];
  openModal(
    `<div class="big-ico">${c.icon}</div>` +
    `<h3>${c.name}</h3>` +
    `<p>${c.text}</p>` +
    `<div class="modal-actions"><button class="btn" id="okBtn">Понятно</button></div>`
  );
  $('#okBtn').onclick = closeModal;
}

/* Проверяем условия: открылся ли новый подозреваемый или новое место */
function checkUnlocks() {
  const b = SUSPECTS.boris;
  if (!state.suspects.has('boris') && b.needs.every(hasClue)) {
    state.suspects.add('boris');
    state.newSuspect = 'boris';
    toast('Появился новый подозреваемый: доктор Левин!', 'event');
    addJournal('event', 'Улики указывают на человека, о котором раньше никто не говорил: семейного врача Бориса Левина.');
  }

  PLACES.forEach((p) => {
    if (p.unlockAsk && state.asked.has(p.unlockAsk) && !state.notified.has(p.id)) {
      state.notified.add(p.id);
      toast('Открыто новое место: ' + p.name, 'event');
      addJournal('event', 'Открыто новое место: ' + p.name + '.');
    }
  });
}

/* ----- Допрос ----- */

function pushDialog(id, side, text, hot = false) {
  (state.dialogs[id] = state.dialogs[id] || []).push({ side, text, hot });
}

function openSuspect(id) {
  const s = SUSPECTS[id];
  openModal(
    `<div class="sus-head"><span class="ava">${s.icon}</span><div><h3>${s.name}</h3><p>${s.role}</p></div></div>` +
    `<p class="story">${s.story}</p>` +
    `<div class="dialog" id="dialog"></div>` +
    `<h4>Задать вопрос</h4><div class="qlist" id="qlist"></div>` +
    `<h4>Предъявить улику</h4><div class="chips" id="clist"></div>`,
    true
  );
  renderInterrogation(id);
}

function renderInterrogation(id) {
  const s = SUSPECTS[id];

  // История разговора
  const dlg = $('#dialog');
  dlg.innerHTML = '';
  (state.dialogs[id] || []).forEach((m) => {
    const d = document.createElement('div');
    d.className = 'bubble ' + m.side + (m.hot ? ' hot' : '');
    d.textContent = m.text;
    dlg.appendChild(d);
  });
  dlg.scrollTop = dlg.scrollHeight;

  // Вопросы
  const ql = $('#qlist');
  ql.innerHTML = '';
  s.questions.forEach((q, i) => {
    const b = document.createElement('button');
    b.className = 'qbtn' + (state.asked.has(id + ':' + i) ? ' done' : '');
    b.textContent = q.q;
    b.onclick = () => ask(id, i);
    ql.appendChild(b);
  });

  // Улики из инвентаря
  const cl = $('#clist');
  cl.innerHTML = '';
  if (!state.clues.length) {
    cl.innerHTML = '<p class="note">У вас пока нет улик.</p>';
  }
  state.clues.forEach((cid) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = CLUES[cid].icon + ' ' + CLUES[cid].name;
    b.onclick = () => present(id, cid);
    cl.appendChild(b);
  });
}

function ask(id, i) {
  const s = SUSPECTS[id];
  const q = s.questions[i];
  const key = id + ':' + i;

  pushDialog(id, 'q', q.q);
  pushDialog(id, 'a', q.a);

  if (!state.asked.has(key)) {
    state.asked.add(key);
    addJournal('talk', `${s.name}: «${q.a}»`);
  }
  checkUnlocks();
  renderPlaces();
  renderInterrogation(id);
}

function present(id, clueId) {
  const s = SUSPECTS[id];
  const r = s.reactions[clueId] || s.defaultReaction;
  const key = id + '>' + clueId;

  pushDialog(id, 'q', '📎 Предъявлена улика: ' + CLUES[clueId].name);
  pushDialog(id, 'a', r.t, !!r.hot);

  if (!state.shown.has(key)) {
    state.shown.add(key);
    if (s.reactions[clueId]) {
      addJournal(r.hot ? 'hot' : 'talk',
        `${s.name} о улике «${CLUES[clueId].name}»: «${r.t}»` + (r.hot ? ' (занервничал)' : ''));
    }
  }
  renderInterrogation(id);
}


/* ============================================================
   5. ФИНАЛ: обвинение и концовки
   ============================================================ */

function showBrief() {
  openModal(
    `<div class="big-ico">📁</div>` +
    `<h3>Дело № 1021: «Последний бокал»</h3>` +
    `<p>Загородный особняк. В кабинете найден мёртвым коллекционер Артур Воронов. Перед ним стоял бокал с коньяком, а настенные часы разбиты. Дверь не взломана, окно приоткрыто.</p>` +
    `<p>Полиция передала дело вам. Ваша задача: найти улики, допросить подозреваемых и вычислить виновного.</p>` +
    `<h4>Как играть</h4>` +
    `<p class="note">• Осматривайте места и собирайте улики в инвентарь.<br>` +
    `• Допрашивайте подозреваемых и предъявляйте им улики: реакция может выдать лжеца.<br>` +
    `• Круг подозреваемых может расшириться, если улики укажут на нового человека.<br>` +
    `• Когда будете готовы, выдвиньте обвинение. От вашего решения зависит финал.</p>` +
    `<div class="modal-actions"><button class="btn" id="startBtn">Начать расследование</button></div>`
  );
  $('#startBtn').onclick = closeModal;
}

function openAccuse() {
  state.accuse = { suspect: null, proofs: [] };
  openModal(
    `<h3>⚖️ Обвинение</h3>` +
    `<p class="note">Выбор необратим: после обвинения игра закончится.</p>` +
    `<h4>1. Кто виновен?</h4><div class="acc-sus" id="accSus"></div>` +
    `<h4>2. Чем докажете? (до 3 улик, выбрано: <span id="accCount">0</span>)</h4>` +
    `<p class="note">Сильное обвинение объясняет мотив, средство и возможность.</p>` +
    `<div class="chips" id="accProofs"></div>` +
    `<div class="modal-actions">` +
    `<button class="btn ghost" id="accCancel">Вернуться к расследованию</button>` +
    `<button class="btn danger" id="accGo" disabled>Выдвинуть обвинение</button>` +
    `</div>` +
    `<div style="text-align:center"><button class="link" id="accNone">Закрыть дело без обвинения</button></div>`,
    true
  );
  $('#accCancel').onclick = closeModal;
  $('#accGo').onclick = resolveAccusation;
  $('#accNone').onclick = () => { closeModal(); showEnding('none'); };
  renderAccuse();
}

function renderAccuse() {
  const acc = state.accuse;

  const susBox = $('#accSus');
  susBox.innerHTML = '';
  state.suspects.forEach((id) => {
    const s = SUSPECTS[id];
    const b = document.createElement('button');
    b.className = 'acc-card' + (acc.suspect === id ? ' selected' : '');
    b.innerHTML = `<span class="ava">${s.icon}</span><b>${s.name}</b><small>${s.role}</small>`;
    b.onclick = () => { acc.suspect = id; renderAccuse(); };
    susBox.appendChild(b);
  });

  const proofBox = $('#accProofs');
  proofBox.innerHTML = '';
  if (!state.clues.length) {
    proofBox.innerHTML = '<p class="note">У вас нет ни одной улики.</p>';
  }
  state.clues.forEach((cid) => {
    const on = acc.proofs.includes(cid);
    const b = document.createElement('button');
    b.className = 'chip' + (on ? ' on' : '');
    b.textContent = CLUES[cid].icon + ' ' + CLUES[cid].name;
    b.onclick = () => {
      if (on) {
        acc.proofs = acc.proofs.filter((x) => x !== cid);
      } else if (acc.proofs.length < 3) {
        acc.proofs.push(cid);
      } else {
        toast('Можно выбрать не больше трёх улик', 'warn');
      }
      renderAccuse();
    };
    proofBox.appendChild(b);
  });

  $('#accCount').textContent = acc.proofs.length;
  $('#accGo').disabled = !acc.suspect;
}

/* Выбор концовки:
   — обвинён доктор: смотрим, сколько разных категорий (мотив/средство/возможность)
     покрыли выбранные улики;
   — обвинён кто-то другой: отдельная «неверная» концовка для каждого. */
function resolveAccusation() {
  const { suspect, proofs } = state.accuse;
  closeModal();

  let key;
  if (suspect === 'boris') {
    const cats = new Set(proofs.map((c) => CLUES[c].cat).filter(Boolean));
    key = cats.size >= 3 ? 'boris_full' : cats.size === 2 ? 'boris_partial' : 'boris_weak';
  } else {
    key = suspect + '_wrong';
  }
  showEnding(key);
}

function showEnding(key) {
  const e = ENDINGS[key];
  const box = $('#ending');
  box.className = 'ending show ' + e.type;
  box.innerHTML =
    `<div class="ending-card">` +
    `<div class="ending-badge">${e.badge}</div>` +
    `<h2>${e.title}</h2>` +
    e.text.map((t) => `<p>${t}</p>`).join('') +
    `<div class="ending-stats">` +
    `<span>🔎 Улик: ${state.clues.length}/${Object.keys(CLUES).length}</span>` +
    `<span>💬 Вопросов: ${state.asked.size}</span>` +
    `<span>🏁 Концовка ${e.n} из ${Object.keys(ENDINGS).length}</span>` +
    `</div>` +
    `<div class="modal-actions"><button class="btn" id="againBtn">Сыграть заново</button></div>` +
    `</div>`;
  $('#againBtn').onclick = () => location.reload();
}


/* ============================================================
   ЗАПУСК
   ============================================================ */

$('#btnAccuse').onclick = openAccuse;
$('#btnBrief').onclick = showBrief;
$('#modalClose').onclick = closeModal;
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// Переключение «Инвентарь / Дневник»
document.querySelectorAll('#notesPanel .tab').forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll('#notesPanel .tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const showInv = tab.dataset.tab === 'inventory';
    $('#inventory').hidden = !showInv;
    $('#journal').hidden = showInv;
  };
});

renderAll();
showBrief();
