<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no" />
  <meta name="theme-color" content="#07100a" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="GrowLog" />
  <title>GrowLog</title>
  <link rel="manifest" href="manifest.json" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Familjen+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
<div id="app">

  <!-- HEADER -->
  <header id="app-header">
    <div class="header-left">
      <button class="back-btn hidden" id="back-btn" onclick="App.goBack()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div class="logo" id="header-logo">
        <span class="logo-mark">✦</span>
        <span class="logo-text">GrowLog</span>
      </div>
      <div class="header-title hidden" id="header-title"></div>
    </div>
    <div class="header-right" id="header-actions"></div>
  </header>

  <!-- SCREENS -->
  <main id="main">

    <!-- ── HOME ── -->
    <section class="screen active" id="screen-home">
      <div id="home-hero-content"></div>

      <div class="kpi-strip">
        <div class="kpi-item"><div class="kpi-val" id="kpi-plants">0</div><div class="kpi-lbl">plantas</div></div>
        <div class="kpi-item"><div class="kpi-val" id="kpi-logs">0</div><div class="kpi-lbl">registros</div></div>
        <div class="kpi-item"><div class="kpi-val" id="kpi-days">—</div><div class="kpi-lbl">dias máx.</div></div>
      </div>

      <div class="alert-strip hidden" id="alert-strip"></div>

      <div class="section-label">Plantas</div>
      <div class="plant-list" id="plant-list"></div>

      <button class="fab" onclick="Modals.openPlant()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </section>

    <!-- ── PLANT DETAIL ── -->
    <section class="screen" id="screen-detail">
      <!-- Hero -->
      <div class="plant-hero">
        <div class="plant-hero-top">
          <div class="plant-hero-stage">
            <div class="hero-stage-dot" id="hero-stage-dot"></div>
            <span class="hero-stage-label" id="hero-stage-label">—</span>
            <button class="btn ghost sm" onclick="Modals.openStage()" style="margin-left:8px;padding:4px 10px;font-size:11px">editar</button>
          </div>
        </div>
        <div class="plant-hero-numbers">
          <div class="hero-num-block">
            <div class="hero-num accent" id="hero-days">—</div>
            <div class="hero-num-lbl">dias</div>
          </div>
          <div class="hero-divider"></div>
          <div class="hero-num-block">
            <div class="hero-num" id="hero-weeks">—</div>
            <div class="hero-num-lbl">semana</div>
          </div>
        </div>
      </div>

      <div class="detail-alert hidden" id="detail-alert"></div>

      <!-- Status cards -->
      <div class="status-cards">
        <div class="wcard hidden" id="watering-card"></div>
        <div class="countdown-card hidden" id="countdown-card">
          <div class="countdown-top">
            <span class="countdown-eyebrow">colheita estimada</span>
            <span class="countdown-date" id="countdown-date">—</span>
          </div>
          <div class="countdown-bottom">
            <span class="countdown-days" id="countdown-days">—</span>
            <span class="countdown-unit" id="countdown-unit">dias</span>
          </div>
          <div class="countdown-bar-wrap"><div class="countdown-bar" id="countdown-bar"></div></div>
        </div>
        <div class="vpd-card hidden" id="vpd-card">
          <div>
            <span class="vpd-eyebrow">VPD último registro</span>
            <div class="vpd-left">
              <span class="vpd-val" id="vpd-val">—</span>
              <span class="vpd-unit">kPa</span>
            </div>
          </div>
          <div class="vpd-zone" id="vpd-zone"></div>
        </div>
      </div>

      <!-- Primary action -->
      <div class="primary-action">
        <button class="primary-action-btn" onclick="Modals.openEntry()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Registrar
        </button>
      </div>
      <div class="secondary-actions">
        <button class="sec-btn" onclick="Modals.openEntry('water')"><span class="sec-icon">💧</span>Rega</button>
        <button class="sec-btn" onclick="Modals.openEntry('climate')"><span class="sec-icon">🌡️</span>Clima</button>
        <button class="sec-btn" onclick="App.exportPlantCSV()"><span class="sec-icon">📊</span>CSV</button>
      </div>

      <!-- Tabs -->
      <div class="detail-tabs">
        <button class="dtab active" data-tab="timeline" onclick="DetailTabs.switch('timeline')">Timeline</button>
        <button class="dtab" data-tab="list" onclick="DetailTabs.switch('list')">Registros</button>
        <button class="dtab" data-tab="genealogy" onclick="DetailTabs.switch('genealogy')">Genealogia</button>
      </div>

      <div class="detail-tab-content active" id="tab-timeline">
        <div class="cycle-timeline" id="cycle-timeline"></div>
      </div>
      <div class="detail-tab-content" id="tab-list">
        <div class="entries-list" id="entries-list"></div>
      </div>
      <div class="detail-tab-content" id="tab-genealogy"></div>
    </section>

    <!-- ── STATS ── -->
    <section class="screen" id="screen-stats">
      <div id="stats-screen"><div class="empty-hint" style="padding:40px">Sem dados ainda.</div></div>
    </section>

    <!-- ── LIBRARY ── -->
    <section class="screen" id="screen-library">
      <div class="library-screen">
        <div class="lib-tabs">
          <button class="lib-tab active" data-tab="substrates" onclick="Library.switchTab('substrates')">🪨 Substratos</button>
          <button class="lib-tab" data-tab="recipes"    onclick="Library.switchTab('recipes')">📋 Receitas</button>
          <button class="lib-tab" data-tab="nutrients"  onclick="Library.switchTab('nutrients')">🧪 Nutrientes</button>
        </div>

        <div class="lib-content active" id="lib-substrates">
          <button class="lib-add-btn" onclick="Library.openItem('substrates')">＋ Novo substrato</button>
          <div id="lib-substrates-list"></div>
        </div>
        <div class="lib-content" id="lib-recipes">
          <button class="lib-add-btn" onclick="Library.openItem('recipes')">＋ Nova receita</button>
          <div id="lib-recipes-list"></div>
        </div>
        <div class="lib-content" id="lib-nutrients">
          <button class="lib-add-btn" onclick="Library.openItem('nutrients')">＋ Novo nutriente</button>
          <div id="lib-nutrients-list"></div>
        </div>
      </div>
    </section>

  </main>

  <!-- BOTTOM NAV -->
  <nav class="bnav">
    <button class="bnav-item active" data-screen="home" onclick="App.goTo('home')">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>Início</span>
    </button>
    <button class="bnav-item" data-screen="detail" id="bnav-detail" onclick="App.goTo('detail')" style="display:none">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <span>Planta</span>
    </button>
    <button class="bnav-item" data-screen="library" onclick="App.goTo('library')">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      <span>Biblioteca</span>
    </button>
    <button class="bnav-item" data-screen="stats" onclick="App.goTo('stats')">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <span>Analytics</span>
    </button>
  </nav>
</div>

<!-- ══════════════ MODAIS ══════════════ -->

<!-- PLANTA (tabs: Básico · Solo · Setup · Genealogia) -->
<div class="overlay" id="modal-plant">
  <div class="sheet tall">
    <div class="sheet-drag"></div>
    <h2 class="sheet-title" id="mp-title">Nova Planta</h2>
    <div class="ptabs">
      <button class="ptab-btn active" data-tab="basico"  onclick="Modals.switchPlantTab('basico')">🌱 Básico</button>
      <button class="ptab-btn"        data-tab="solo"    onclick="Modals.switchPlantTab('solo')">🪱 Solo</button>
      <button class="ptab-btn"        data-tab="setup"   onclick="Modals.switchPlantTab('setup')">💡 Setup</button>
      <button class="ptab-btn"        data-tab="gene"    onclick="Modals.switchPlantTab('gene')">🌿 Origem</button>
    </div>

    <!-- Básico -->
    <div class="ptab-content active" id="ptab-basico">
      <div class="field-group">
        <label class="field-label">Nome / Strain</label>
        <input class="field-input" id="mp-name" type="text" placeholder="Ex: Lemon Drizzle #2" autocomplete="off" />
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Tipo</label>
          <div class="pill-group" id="mp-type-group">
            <button class="pill active" data-v="auto">🔄 Auto</button>
            <button class="pill" data-v="foto">📸 Foto</button>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Data início</label>
          <input class="field-input" id="mp-date" type="date" />
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Ciclo de rega</label>
        <p class="field-hint" style="margin-bottom:8px">Regas com nutriente + sem nutriente</p>
        <div class="cycle-inputs">
          <div class="cycle-input-group">
            <input class="field-input cycle-num" id="mp-cycle-with" type="number" min="1" max="10" value="2" />
            <span class="cycle-label">💧🧪 com</span>
          </div>
          <div class="cycle-sep">+</div>
          <div class="cycle-input-group">
            <input class="field-input cycle-num" id="mp-cycle-without" type="number" min="1" max="10" value="1" />
            <span class="cycle-label">💧 sem</span>
          </div>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Semanas Veg.</label>
          <input class="field-input" id="mp-veg-weeks" type="number" min="1" max="20" placeholder="Ex: 4" />
        </div>
        <div class="field-group">
          <label class="field-label">Semanas Flor.</label>
          <input class="field-input" id="mp-flower-weeks" type="number" min="1" max="20" placeholder="Ex: 8" />
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Observações</label>
        <textarea class="field-input" id="mp-obs" rows="2" placeholder="Genética, banco de sementes..."></textarea>
      </div>
    </div>

    <!-- Solo -->
    <div class="ptab-content" id="ptab-solo">
      <div class="field-group">
        <label class="field-label">Tipo</label>
        <div class="pill-group wrap" id="soil-type-group">
          <button class="pill active" data-v="inerte">🪨 Inerte</button>
          <button class="pill" data-v="organico">🌿 Orgânico</button>
          <button class="pill" data-v="organomineral">⚗️ Organomineral</button>
          <button class="pill" data-v="coco">🌴 Coco</button>
        </div>
      </div>
      <div id="soil-inert-fields">
        <div class="field-group">
          <label class="field-label">Substrato / Marca</label>
          <input class="field-input" id="soil-brand" type="text" placeholder="Ex: Coco 70% + perlita 30%" />
        </div>
        <div class="field-group">
          <label class="field-label">Notas</label>
          <textarea class="field-input" id="soil-notes" rows="3" placeholder="pH de lavagem, fornecedor..."></textarea>
        </div>
      </div>
      <div id="soil-organic-fields" class="hidden">
        <div class="field-group">
          <label class="field-label">Receita do solo</label>
          <textarea class="field-input" id="soil-recipe" rows="6" placeholder="Ex:&#10;40% terra preta&#10;20% húmus de minhoca&#10;20% perlita&#10;10% fibra de coco&#10;10% bokashi"></textarea>
        </div>
        <div class="field-group">
          <label class="field-label">Notas</label>
          <textarea class="field-input" id="soil-notes-org" rows="2" placeholder="Correção, maturação, pH..."></textarea>
        </div>
      </div>
    </div>

    <!-- Setup -->
    <div class="ptab-content" id="ptab-setup">
      <div class="setup-group">
        <div class="setup-group-title">💡 Iluminação</div>
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">LED Modelo</label>
            <input class="field-input" id="setup-led-model" type="text" placeholder="Ex: QB240" />
          </div>
          <div class="field-group">
            <label class="field-label">Chip LED</label>
            <input class="field-input" id="setup-led-type" type="text" placeholder="Ex: LM301H" />
          </div>
        </div>
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Potência (W)</label>
            <input class="field-input" id="setup-led-watts" type="number" placeholder="Ex: 120" />
          </div>
        </div>
      </div>
      <div class="setup-group">
        <div class="setup-group-title">📅 Fotoperíodo</div>
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">LED liga</label>
            <input class="field-input" id="setup-photo-on" type="time" />
          </div>
          <div class="field-group">
            <label class="field-label">LED apaga</label>
            <input class="field-input" id="setup-photo-off" type="time" />
          </div>
        </div>
      </div>
      <div class="setup-group">
        <div class="setup-group-title">🌬️ Clima</div>
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Exaustor</label>
            <input class="field-input" id="setup-exhaust" type="text" placeholder='Ex: 4" 190m³/h' />
          </div>
          <div class="field-group">
            <label class="field-label">Ventilador</label>
            <input class="field-input" id="setup-fan" type="text" placeholder="Ex: clip fan 15cm" />
          </div>
        </div>
      </div>
      <div class="setup-group">
        <div class="setup-group-title">🤖 Automações e Sensores</div>
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Timer / Automação</label>
            <input class="field-input" id="setup-timer" type="text" placeholder="Ex: Sonoff timer 18/6" />
          </div>
          <div class="field-group">
            <label class="field-label">Tomada inteligente</label>
            <input class="field-input" id="setup-smart-plug" type="text" placeholder="Ex: Tasmota + MQTT" />
          </div>
        </div>
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Automação de rega</label>
            <input class="field-input" id="setup-irrigation-auto" type="text" placeholder="Ex: timer gotejador" />
          </div>
          <div class="field-group">
            <label class="field-label">Sensor de CO₂</label>
            <input class="field-input" id="setup-co2" type="text" placeholder="Ex: SCD30" />
          </div>
        </div>
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Sensor VPD/UR/T°</label>
            <input class="field-input" id="setup-vpd-sensor" type="text" placeholder="Ex: SHT31, AHT20" />
          </div>
          <div class="field-group">
            <label class="field-label">Sensor de luz</label>
            <input class="field-input" id="setup-light-sensor" type="text" placeholder="Ex: BH1750, Lux-meter" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Câmera</label>
          <input class="field-input" id="setup-camera" type="text" placeholder="Ex: Reolink, timelapse" />
        </div>
      </div>
      <div class="setup-group">
        <div class="setup-group-title">📐 Estrutura</div>
        <div class="field-group">
          <label class="field-label">Tamanho da tenda</label>
          <input class="field-input" id="setup-tent-size" type="text" placeholder="Ex: 60×60×140 cm" />
        </div>
        <div class="field-group">
          <label class="field-label">Notas do setup</label>
          <textarea class="field-input" id="setup-notes" rows="2" placeholder="Filtro de carvão, controlador de temp..."></textarea>
        </div>
      </div>
    </div>

    <!-- Origem/Genealogia -->
    <div class="ptab-content" id="ptab-gene">
      <div class="field-group">
        <label class="field-label">Planta mãe</label>
        <p class="field-hint" style="margin-bottom:8px">Selecione se esta planta é um clone ou filha de outra.</p>
        <select class="field-input" id="mp-parent">
          <option value="">— sem planta mãe —</option>
        </select>
      </div>
      <p class="field-hint">A árvore genealógica completa fica visível na aba <strong>Genealogia</strong> da planta.</p>
    </div>

    <div class="sheet-actions">
      <button class="btn ghost" onclick="Modals.close('modal-plant')">Cancelar</button>
      <button class="btn accent" onclick="Modals.savePlant()">Salvar planta</button>
    </div>
  </div>
</div>

<!-- ESTÁGIO -->
<div class="overlay" id="modal-stage">
  <div class="sheet">
    <div class="sheet-drag"></div>
    <h2 class="sheet-title">Estágio</h2>
    <div class="field-group">
      <label class="field-label">Estágio atual</label>
      <div class="pill-group wrap" id="stage-pill-group">
        <button class="pill" data-v="germinacao">🌰 Germinação</button>
        <button class="pill" data-v="plantula">🌱 Plântula</button>
        <button class="pill active" data-v="vegetativo">🍃 Vegetativo</button>
        <button class="pill" data-v="floracao">🌸 Floração</button>
        <button class="pill" data-v="colheita">✂️ Colheita</button>
      </div>
    </div>
    <p class="field-hint">Dias e semana são automáticos. Preencha abaixo só para sobrescrever.</p>
    <div class="field-row">
      <div class="field-group">
        <label class="field-label">Dias (override)</label>
        <input class="field-input" id="ms-days" type="number" min="0" placeholder="Automático" />
      </div>
      <div class="field-group">
        <label class="field-label">Semana (override)</label>
        <input class="field-input" id="ms-weeks" type="number" min="1" placeholder="Automático" />
      </div>
    </div>
    <div class="sheet-actions">
      <button class="btn ghost" onclick="Modals.close('modal-stage')">Cancelar</button>
      <button class="btn accent" onclick="Modals.saveStage()">Salvar</button>
    </div>
  </div>
</div>

<!-- REGISTRO -->
<div class="overlay" id="modal-entry">
  <div class="sheet tall">
    <div class="sheet-drag"></div>
    <h2 class="sheet-title" id="me-title">Novo Registro</h2>

    <div class="action-type-grid" id="action-type-grid">
      <button class="atype-btn active" data-v="geral"       onclick="ActionType.select(this)"><span>📋</span>Geral</button>
      <button class="atype-btn"        data-v="rega"        onclick="ActionType.select(this)"><span>💧</span>Rega</button>
      <button class="atype-btn"        data-v="clima"       onclick="ActionType.select(this)"><span>🌡️</span>Clima</button>
      <button class="atype-btn"        data-v="luz"         onclick="ActionType.select(this)"><span>💡</span>Luz</button>
      <button class="atype-btn"        data-v="poda"        onclick="ActionType.select(this)"><span>✂️</span>Poda</button>
      <button class="atype-btn"        data-v="lst"         onclick="ActionType.select(this)"><span>🪢</span>LST</button>
      <button class="atype-btn"        data-v="defoliacao"  onclick="ActionType.select(this)"><span>🍃</span>Defol.</button>
      <button class="atype-btn"        data-v="transplante" onclick="ActionType.select(this)"><span>🪴</span>Transpl.</button>
      <button class="atype-btn"        data-v="flush"       onclick="ActionType.select(this)"><span>🚿</span>Flush</button>
      <button class="atype-btn"        data-v="runoff"      onclick="ActionType.select(this)"><span>🧪</span>Runoff</button>
    </div>

    <div class="field-row">
      <div class="field-group">
        <label class="field-label">Data</label>
        <input class="field-input" id="ef-date" type="date" onchange="Entry.autoProgress()" />
      </div>
      <div class="field-group">
        <label class="field-label">Hora</label>
        <input class="field-input" id="ef-time" type="time" />
      </div>
    </div>
    <div class="auto-progress">
      <span class="ap-badge" id="ef-days-auto">—</span>
      <span class="ap-badge accent" id="ef-weeks-auto">—</span>
    </div>
    <div class="field-group">
      <label class="field-label">Estágio</label>
      <div class="pill-group wrap" id="entry-stage-group">
        <button class="pill" data-v="germinacao">🌰 Germ.</button>
        <button class="pill" data-v="plantula">🌱 Plântula</button>
        <button class="pill active" data-v="vegetativo">🍃 Veg.</button>
        <button class="pill" data-v="floracao">🌸 Flor.</button>
        <button class="pill" data-v="colheita">✂️ Colh.</button>
      </div>
    </div>

    <!-- Ambiente -->
    <div class="fsec" id="ef-ambiente">
      <div class="fsec-title">🌡️ Ambiente</div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Temperatura (°C)</label>
          <input class="field-input" id="ef-temp" type="number" step="0.1" placeholder="25.5" oninput="VPD.recalc()" />
        </div>
        <div class="field-group">
          <label class="field-label">Umidade (%)</label>
          <input class="field-input" id="ef-ur" type="number" step="1" placeholder="60" oninput="VPD.recalc()" />
        </div>
      </div>
      <div class="computed-row">
        <span class="computed-label">VPD</span>
        <span class="computed-val dim" id="ef-vpd-auto">— preencha T° e UR</span>
        <span class="computed-val dim" id="ef-vpd-zone">—</span>
      </div>
    </div>

    <!-- Luz -->
    <div class="fsec hidden" id="ef-luz">
      <div class="fsec-title">💡 Luz</div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Lux</label>
          <input class="field-input" id="ef-lux" type="number" placeholder="30000" oninput="Light.recalc()" />
        </div>
        <div class="field-group">
          <label class="field-label">Dimmer (%)</label>
          <input class="field-input" id="ef-dimmer" type="number" min="0" max="100" placeholder="80" />
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Distância (cm)</label>
          <input class="field-input" id="ef-dist" type="number" placeholder="30" />
        </div>
        <div class="field-group">
          <label class="field-label">LED liga</label>
          <input class="field-input" id="ef-ledon" type="time" oninput="Light.recalc()" />
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">LED apaga</label>
        <input class="field-input" id="ef-ledoff" type="time" oninput="Light.recalc()" />
      </div>
      <div class="computed-row"><span class="computed-label">PPFD</span><span class="computed-val dim" id="ef-ppfd-auto">—</span></div>
      <div class="computed-row"><span class="computed-label">DLI</span><span class="computed-val dim" id="ef-dli-auto">—</span></div>
      <div class="light-feedback hidden" id="light-feedback"></div>
    </div>

    <!-- Rega -->
    <div class="fsec hidden" id="ef-rega">
      <div class="fsec-title">💧 Rega</div>
      <div class="toggle-row">
        <span class="toggle-label">Registrar rega</span>
        <button class="toggle-btn" id="tgl-water" role="switch" aria-checked="false" onclick="UI.toggle('tgl-water','water-fields')"><span class="toggle-thumb"></span></button>
      </div>
      <div class="toggle-section" id="water-fields">
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Volume (ml)</label>
            <input class="field-input" id="ef-water" type="number" placeholder="500" />
          </div>
          <div class="field-group">
            <label class="field-label">pH da água</label>
            <input class="field-input" id="ef-ph" type="number" step="0.1" placeholder="6.0" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">EC</label>
          <input class="field-input" id="ef-ec" type="number" step="0.1" placeholder="1.4" />
        </div>
        <div class="toggle-row" style="margin-top:8px">
          <span class="toggle-label">Nutrientes</span>
          <button class="toggle-btn" id="tgl-nut" role="switch" aria-checked="false" onclick="UI.toggle('tgl-nut','nut-fields')"><span class="toggle-thumb"></span></button>
        </div>
        <div class="toggle-section" id="nut-fields">
          <div class="field-row">
            <div class="field-group autocomplete-wrap">
              <label class="field-label">Nutriente</label>
              <input class="field-input" id="nut-name" type="text" placeholder="Nome ou busca na biblioteca" autocomplete="off" />
              <div class="autocomplete-list hidden" id="nut-autocomplete"></div>
            </div>
            <div class="field-group">
              <label class="field-label">ml/L</label>
              <input class="field-input" id="nut-qty" type="number" step="0.1" placeholder="2" />
            </div>
          </div>
          <button class="btn ghost sm" onclick="Entry.addNutrient()">＋ Adicionar</button>
          <div class="nut-tags" id="nut-tags"></div>
        </div>
      </div>
      <!-- Campo de substrato aplicado -->
      <div class="field-group" style="margin-top:12px">
        <label class="field-label">Substrato (da biblioteca)</label>
        <select class="field-input" id="ef-substrate-sel"><option value="">— sem seleção —</option></select>
      </div>
    </div>

    <!-- Poda -->
    <div class="fsec hidden" id="af-poda">
      <div class="fsec-title">✂️ Poda / Defoliação</div>
      <div class="field-group">
        <label class="field-label">Técnica</label>
        <div class="pill-group wrap" id="af-poda-type">
          <button class="pill active" data-v="topping">Topping</button>
          <button class="pill" data-v="fimming">Fimming</button>
          <button class="pill" data-v="defoliacao">Defoliação</button>
          <button class="pill" data-v="lollipopping">Lollipopping</button>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Nós removidos</label>
        <input class="field-input" id="af-poda-nodes" type="number" min="0" placeholder="2" />
      </div>
    </div>

    <!-- LST -->
    <div class="fsec hidden" id="af-lst">
      <div class="fsec-title">🪢 LST</div>
      <div class="field-group">
        <label class="field-label">Técnica</label>
        <div class="pill-group wrap" id="af-lst-type">
          <button class="pill active" data-v="lst">LST</button>
          <button class="pill" data-v="scrog">SCROG</button>
          <button class="pill" data-v="supercrop">Supercrop</button>
          <button class="pill" data-v="mainlining">Mainlining</button>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Descrição</label>
        <input class="field-input" id="af-lst-desc" type="text" placeholder="Dobrei o topo principal" />
      </div>
    </div>

    <!-- Transplante -->
    <div class="fsec hidden" id="af-transplante">
      <div class="fsec-title">🪴 Transplante</div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">De (L)</label>
          <input class="field-input" id="af-tp-from" type="number" step="0.5" placeholder="1" />
        </div>
        <div class="field-group">
          <label class="field-label">Para (L)</label>
          <input class="field-input" id="af-tp-to" type="number" step="0.5" placeholder="5" />
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Substrato novo</label>
        <input class="field-input" id="af-tp-substrate" type="text" placeholder="Coco + perlita 70/30" />
      </div>
    </div>

    <!-- Flush -->
    <div class="fsec hidden" id="af-flush">
      <div class="fsec-title">🚿 Flush</div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">Volume (L)</label>
          <input class="field-input" id="af-flush-vol" type="number" step="0.5" placeholder="5" />
        </div>
        <div class="field-group">
          <label class="field-label">pH</label>
          <input class="field-input" id="af-flush-ph" type="number" step="0.1" placeholder="6.0" />
        </div>
      </div>
    </div>

    <!-- Runoff -->
    <div class="fsec hidden" id="af-runoff">
      <div class="fsec-title">🧪 Runoff</div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label">pH Runoff</label>
          <input class="field-input" id="af-ro-ph" type="number" step="0.1" placeholder="6.1" />
        </div>
        <div class="field-group">
          <label class="field-label">EC Runoff</label>
          <input class="field-input" id="af-ro-ec" type="number" step="0.1" placeholder="1.8" />
        </div>
      </div>
    </div>

    <div class="field-group" style="margin-top:16px">
      <label class="field-label">Observações</label>
      <textarea class="field-input" id="ef-obs" rows="3" placeholder="Notas livres..."></textarea>
    </div>
    <div class="sheet-actions">
      <button class="btn ghost" onclick="Modals.close('modal-entry')">Cancelar</button>
      <button class="btn accent" onclick="Modals.saveEntry()">Salvar registro</button>
    </div>
  </div>
</div>

<!-- DETALHE DO REGISTRO -->
<div class="overlay" id="modal-entry-detail">
  <div class="sheet">
    <div class="sheet-drag"></div>
    <h2 class="sheet-title">Registro</h2>
    <div id="entry-detail-body"></div>
    <div class="sheet-actions">
      <button class="btn danger" id="entry-detail-del">🗑 Excluir</button>
      <button class="btn ghost" id="entry-detail-edit">✏️ Editar</button>
      <button class="btn accent" onclick="Modals.close('modal-entry-detail')">Fechar</button>
    </div>
  </div>
</div>

<!-- CONFIRM -->
<div class="overlay" id="modal-confirm">
  <div class="sheet confirm-sheet">
    <div class="sheet-drag"></div>
    <h2 class="sheet-title" id="confirm-title">Confirmar</h2>
    <p class="confirm-msg" id="confirm-msg"></p>
    <div class="sheet-actions">
      <button class="btn ghost" onclick="UI.resolveConfirm(false)">Cancelar</button>
      <button class="btn accent" onclick="UI.resolveConfirm(true)">Confirmar</button>
    </div>
  </div>
</div>

<!-- DADOS -->
<div class="overlay" id="modal-ie">
  <div class="sheet">
    <div class="sheet-drag"></div>
    <h2 class="sheet-title">Dados</h2>
    <div class="ie-grid">
      <button class="ie-btn" onclick="App.exportBackup()"><span class="ie-icon">💾</span><div><div class="ie-label">Backup JSON</div><span class="ie-sub">Exportar todos os dados</span></div></button>
      <label class="ie-btn"><span class="ie-icon">📥</span><div><div class="ie-label">Importar Backup</div><span class="ie-sub">Restaurar de JSON</span></div><input type="file" accept=".json" style="display:none" onchange="App.importBackup(event)" /></label>
      <button class="ie-btn" onclick="App.exportAll()"><span class="ie-icon">📊</span><div><div class="ie-label">Exportar CSV</div><span class="ie-sub">Todas as plantas</span></div></button>
    </div>
    <p class="field-hint" style="margin-top:12px">💡 Faça backup regularmente para não perder seus dados.</p>
    <div class="sheet-actions"><button class="btn accent" onclick="Modals.close('modal-ie')">Fechar</button></div>
  </div>
</div>

<!-- RELATÓRIO DE COLHEITA -->
<div class="overlay" id="modal-harvest">
  <div class="sheet tall">
    <div class="sheet-drag"></div>
    <h2 class="sheet-title">🏆 Relatório de Colheita</h2>
    <p class="sheet-subtitle" id="hr-plant-name"></p>
    <div class="hr-section"><div class="hr-section-title">Resumo do ciclo</div><div id="hr-summary"></div></div>
    <div class="hr-section"><div class="hr-section-title">Médias ambientais</div><div id="hr-averages"></div></div>
    <div class="hr-section"><div class="hr-section-title">Linha do tempo</div><div id="hr-timeline"></div></div>
    <div class="hr-section">
      <div class="hr-section-title">Resultado</div>
      <div class="field-row">
        <div class="field-group"><label class="field-label">Peso úmido (g)</label><input class="field-input" id="hr-yield-wet" type="number" step="0.1" placeholder="120" /></div>
        <div class="field-group"><label class="field-label">Peso seco (g)</label><input class="field-input" id="hr-yield-dry" type="number" step="0.1" placeholder="28" /></div>
      </div>
      <div class="field-group">
        <label class="field-label">Avaliação</label>
        <div class="pill-group" id="hr-rating-group">
          <button class="pill" data-v="1">1⭐</button><button class="pill" data-v="2">2⭐</button>
          <button class="pill" data-v="3">3⭐</button><button class="pill active" data-v="4">4⭐</button>
          <button class="pill" data-v="5">5⭐</button>
        </div>
      </div>
      <div class="field-group"><label class="field-label">Notas finais</label><textarea class="field-input" id="hr-notes" rows="3" placeholder="O que aprendeu neste ciclo?"></textarea></div>
    </div>
    <div class="sheet-actions">
      <button class="btn ghost" onclick="HarvestReport.exportCSV()">📤 Exportar</button>
      <button class="btn accent" onclick="HarvestReport.save()">Salvar relatório</button>
    </div>
  </div>
</div>

<!-- BIBLIOTECA — modal item -->
<div class="overlay" id="modal-lib-item">
  <div class="sheet">
    <div class="sheet-drag"></div>
    <h2 class="sheet-title" id="lib-modal-title">Novo item</h2>
    <div class="field-group">
      <label class="field-label">Nome</label>
      <input class="field-input" id="lib-item-name" type="text" placeholder="Ex: Coco Amafibra 98" autocomplete="off" />
    </div>

    <!-- Substrato -->
    <div id="lib-fields-substrate">
      <div class="field-group">
        <label class="field-label">Tipo</label>
        <div class="pill-group wrap" id="lib-soil-type">
          <button class="pill active" data-v="inerte">🪨 Inerte</button>
          <button class="pill" data-v="organico">🌿 Orgânico</button>
          <button class="pill" data-v="organomineral">⚗️ Organomineral</button>
          <button class="pill" data-v="coco">🌴 Coco</button>
        </div>
      </div>
      <div class="field-group"><label class="field-label">Marca / Fornecedor</label><input class="field-input" id="lib-item-brand" type="text" placeholder="Ex: Amafibra, Canna" /></div>
      <div class="field-group"><label class="field-label">Notas</label><textarea class="field-input" id="lib-item-notes" rows="3" placeholder="pH de lavagem, proporções ideais..."></textarea></div>
    </div>

    <!-- Receita -->
    <div id="lib-fields-recipe" class="hidden">
      <div class="field-group"><label class="field-label">Receita</label><textarea class="field-input" id="lib-item-recipe" rows="6" placeholder="Ex:&#10;40% terra preta&#10;20% húmus&#10;20% perlita&#10;10% bokashi&#10;10% coco coir"></textarea></div>
      <div class="field-group"><label class="field-label">Notas</label><textarea class="field-input" id="lib-item-notes" rows="2" placeholder="Correção pH, maturação..."></textarea></div>
    </div>

    <!-- Nutriente -->
    <div id="lib-fields-nutrient" class="hidden">
      <div class="field-group">
        <label class="field-label">Tipo</label>
        <div class="pill-group wrap" id="lib-nut-type">
          <button class="pill active" data-v="mineral">⚗️ Mineral</button>
          <button class="pill" data-v="organico">🌿 Orgânico</button>
          <button class="pill" data-v="adubo">🌱 Adubo sólido</button>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group"><label class="field-label">Dose mín. (ml/L)</label><input class="field-input" id="lib-item-dose-min" type="number" step="0.1" placeholder="0.5" /></div>
        <div class="field-group"><label class="field-label">Dose máx. (ml/L)</label><input class="field-input" id="lib-item-dose-max" type="number" step="0.1" placeholder="2.0" /></div>
      </div>
      <div class="field-group"><label class="field-label">Notas</label><textarea class="field-input" id="lib-item-notes" rows="2" placeholder="NPK, fabricante, uso recomendado..."></textarea></div>
    </div>

    <div class="sheet-actions">
      <button class="btn danger" id="lib-del-btn" onclick="Library.deleteItem()" style="display:none">🗑</button>
      <button class="btn ghost" onclick="Modals.close('modal-lib-item')">Cancelar</button>
      <button class="btn accent" onclick="Library.saveItem()">Salvar</button>
    </div>
  </div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<script src="app.js"></script>
</body>
</html>
