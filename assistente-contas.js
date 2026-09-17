// Assistente unificado de criação/configuração de contas de anúncios.
// Reaproveita os OAuth oficiais já existentes e nunca solicita senha, CAPTCHA,
// código de segurança ou dados de cartão dentro da Plataforma de Leads.
(function () {
  "use strict";

  const STORAGE_KEY = "plataforma_leads_assistente_contas_v1";
  const plataformas = {
    meta: {
      nome: "Meta Ads",
      icone: "∞",
      descricao: "Uma conta de anúncios para Facebook e Instagram.",
      observacao: "Página e Instagram são vinculados depois da autorização.",
      urlOficial: "https://business.facebook.com/settings/ad-accounts"
    },
    google: {
      nome: "Google Ads",
      icone: "🔴",
      descricao: "Conta para Pesquisa, Display, formulários e WhatsApp elegível.",
      observacao: "O Google pode exigir confirmação de identidade e pagamento.",
      urlOficial: "https://ads.google.com/aw/accounts"
    },
    tiktok: {
      nome: "TikTok Ads",
      icone: "🎵",
      descricao: "Conta de anunciante vinculada ao TikTok Business Center.",
      observacao: "O TikTok pode solicitar verificação empresarial e cobrança.",
      urlOficial: "https://business.tiktok.com/"
    }
  };

  let estado = {
    etapa: 1,
    plataformas: ["meta"],
    dados: {},
    status: {},
    capacidades: {},
    carregando: false,
    salvamento: "local"
  };
  let salvamentoTimer = null;
  let interagiuDesdeAbertura = false;
  const monitor = {
    ativo: false,
    pausado: false,
    preparada: null,
    limiteAtingido: false,
    plataforma: null,
    stream: null,
    video: null,
    timer: null,
    analisando: false,
    resultado: null,
    erro: "",
    preview: "",
    assinatura: null,
    ultimaAnalise: 0,
    analises: 0,
    checklist: {},
    historico: []
  };

  const esc = (valor) => typeof window.escaparHtml === "function"
    ? window.escaparHtml(String(valor ?? ""))
    : String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

  function aberto() {
    const modal = document.getElementById("assistente_contas_modal");
    return Boolean(modal && modal.style.display !== "none");
  }

  function contextoMonitor() {
    const r = monitor.resultado;
    if (!r) return "";
    return [r.pagina, r.etapa, r.resumo, r.proxima_acao].filter(Boolean).join(" | ").slice(0, 1200);
  }

  function definirFaixaMonitor(ativa) {
    monitor.stream?.getVideoTracks?.().forEach(track => { track.enabled = ativa; });
  }

  function pararMonitorTela(renderizar = true) {
    if (monitor.timer) clearInterval(monitor.timer);
    monitor.timer = null;
    monitor.stream?.getTracks?.().forEach(track => track.stop());
    if (monitor.video) monitor.video.srcObject = null;
    Object.assign(monitor, {
      ativo: false,
      pausado: false,
      preparada: null,
      limiteAtingido: false,
      plataforma: null,
      stream: null,
      video: null,
      analisando: false,
      resultado: null,
      erro: "",
      preview: "",
      assinatura: null,
      ultimaAnalise: 0,
      analises: 0,
      checklist: {},
      historico: []
    });
    if (renderizar && aberto()) render();
  }

  function assinaturaCanvas(canvas) {
    const mini = document.createElement("canvas");
    mini.width = 16;
    mini.height = 9;
    const ctx = mini.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, mini.width, mini.height);
    const pixels = ctx.getImageData(0, 0, mini.width, mini.height).data;
    const assinatura = [];
    for (let i = 0; i < pixels.length; i += 4) {
      assinatura.push(Math.round((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3));
    }
    return assinatura;
  }

  function telaMudou(nova) {
    if (!monitor.assinatura || monitor.assinatura.length !== nova.length) return true;
    const diferenca = nova.reduce((total, valor, i) => total + Math.abs(valor - monitor.assinatura[i]), 0) / nova.length;
    return diferenca >= 4.5;
  }

  function capturarTelaMonitor() {
    const video = monitor.video;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
    const limiteLargura = 1280;
    const limiteAltura = 800;
    const escala = Math.min(1, limiteLargura / video.videoWidth, limiteAltura / video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * escala));
    canvas.height = Math.max(1, Math.round(video.videoHeight * escala));
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return {
      imagem: canvas.toDataURL("image/jpeg", 0.72),
      assinatura: assinaturaCanvas(canvas)
    };
  }

  function carregarRascunho() {
    try {
      const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!salvo || typeof salvo !== "object") return;
      estado.etapa = Math.min(3, Math.max(1, Number(salvo.etapa) || 1));
      estado.plataformas = Array.isArray(salvo.plataformas)
        ? salvo.plataformas.filter(p => plataformas[p])
        : ["meta"];
      estado.dados = salvo.dados && typeof salvo.dados === "object" ? salvo.dados : {};
      if (!estado.plataformas.length) estado.plataformas = ["meta"];
    } catch (_) {}
  }

  function atualizarIndicadorSalvamento() {
    const el = document.getElementById("assistente_contas_salvamento");
    if (!el) return;
    const textos = {
      salvando: "Salvando na sua conta...",
      salvo: "✓ Salvo na sua conta",
      local: "Salvo neste dispositivo",
      erro: "Salvo neste dispositivo — servidor indisponível"
    };
    el.textContent = textos[estado.salvamento] || textos.local;
    el.dataset.estado = estado.salvamento;
  }

  async function persistirRascunhoServidor() {
    const token = localStorage.getItem("token");
    if (!token) return;
    estado.salvamento = "salvando";
    atualizarIndicadorSalvamento();
    try {
      const res = await fetch(`${API}/assistente-contas-anuncios`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          etapa: estado.etapa,
          plataformas: estado.plataformas,
          dados: estado.dados
        })
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      estado.salvamento = "salvo";
    } catch (_) {
      estado.salvamento = "erro";
    }
    atualizarIndicadorSalvamento();
  }

  function salvarRascunho(opcoes = {}) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        etapa: estado.etapa,
        plataformas: estado.plataformas,
        dados: estado.dados,
        atualizado_em: new Date().toISOString()
      }));
    } catch (_) {}
    if (salvamentoTimer) clearTimeout(salvamentoTimer);
    if (opcoes.imediato) persistirRascunhoServidor();
    else salvamentoTimer = setTimeout(persistirRascunhoServidor, 650);
  }

  async function carregarRascunhoServidor() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/assistente-contas-anuncios`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Falha ao carregar");
      const data = await res.json();
      const salvo = data?.rascunho;
      if (salvo && typeof salvo === "object") {
        if (interagiuDesdeAbertura) {
          salvarRascunho();
          return;
        }
        estado.etapa = Math.min(3, Math.max(1, Number(salvo.etapa) || 1));
        estado.plataformas = Array.isArray(salvo.plataformas)
          ? salvo.plataformas.filter(p => plataformas[p])
          : ["meta"];
        if (!estado.plataformas.length) estado.plataformas = ["meta"];
        estado.dados = salvo.dados && typeof salvo.dados === "object" ? salvo.dados : {};
        estado.salvamento = "salvo";
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(salvo));
        } catch (_) {}
        if (aberto()) render();
      } else {
        salvarRascunho();
      }
    } catch (_) {
      estado.salvamento = "erro";
      atualizarIndicadorSalvamento();
    }
  }

  function capturarFormulario() {
    document.querySelectorAll("#assistente_contas_corpo [data-assistente-campo]").forEach(el => {
      if (el.name) estado.dados[el.name] = el.value;
    });
  }

  function renderEtapas() {
    const el = document.getElementById("assistente_contas_etapas");
    if (!el) return;
    const nomes = ["Escolher plataformas", "Dados da empresa", "Conectar e acompanhar"];
    el.innerHTML = nomes.map((nome, i) => {
      const numero = i + 1;
      const classe = numero === estado.etapa ? "ativa" : numero < estado.etapa ? "concluida" : "";
      return `<div class="assistente-contas-etapa ${classe}"><span>${numero < estado.etapa ? "✓" : numero}</span><b>${nome}</b></div>`;
    }).join("");
  }

  function renderPlataformas() {
    return `
      <p class="assistente-contas-intro">
        Escolha onde deseja anunciar. Você pode configurar uma rede agora e continuar as demais depois sem perder o progresso.
      </p>
      <div class="assistente-plataformas-grid">
        ${Object.entries(plataformas).map(([id, p]) => {
          const selecionada = estado.plataformas.includes(id);
          return `
            <label class="assistente-plataforma-opcao ${selecionada ? "selecionada" : ""}" onclick="event.preventDefault();assistenteSelecionarPlataforma('${id}')">
              <input type="checkbox" ${selecionada ? "checked" : ""}>
              <div class="assistente-plataforma-topo">
                <span class="assistente-plataforma-icone">${p.icone}</span>
                <span class="assistente-plataforma-check">✓</span>
              </div>
              <h3>${p.nome}</h3>
              <p>${p.descricao}</p>
              <small>${p.observacao}</small>
            </label>`;
        }).join("")}
      </div>
      <div class="assistente-contas-aviso">
        Facebook e Instagram usam a mesma conta de anúncios da Meta. A plataforma não criará duas contas separadas para essas redes.
      </div>`;
  }

  function valor(nome, padrao = "") {
    return esc(estado.dados[nome] ?? padrao);
  }

  function optionSelected(nome, opcao, padrao = "") {
    return String(estado.dados[nome] ?? padrao) === opcao ? "selected" : "";
  }

  function renderDados() {
    return `
      <p class="assistente-contas-intro">
        Estes dados serão reutilizados durante a configuração. Revise tudo com atenção: moeda e fuso horário podem não ser alteráveis depois que a conta for criada.
      </p>
      <div class="assistente-form-grid">
        <div class="assistente-campo">
          <label>Nome ou razão social *</label>
          <input data-assistente-campo name="nome_legal" value="${valor("nome_legal")}" oninput="assistenteSalvarCampoDados(this)" placeholder="Ex.: Imobiliária Horizonte Ltda.">
        </div>
        <div class="assistente-campo">
          <label>Nome comercial</label>
          <input data-assistente-campo name="nome_comercial" value="${valor("nome_comercial")}" oninput="assistenteSalvarCampoDados(this)" placeholder="Ex.: Horizonte Imóveis">
        </div>
        <div class="assistente-campo">
          <label>CPF ou CNPJ</label>
          <input data-assistente-campo name="documento" value="${valor("documento")}" oninput="assistenteSalvarCampoDados(this)" placeholder="Do titular ou da empresa">
        </div>
        <div class="assistente-campo">
          <label>Segmento</label>
          <input data-assistente-campo name="segmento" value="${valor("segmento")}" oninput="assistenteSalvarCampoDados(this)" placeholder="Ex.: Corretor de imóveis">
        </div>
        <div class="assistente-campo">
          <label>E-mail responsável *</label>
          <input data-assistente-campo type="email" name="email" value="${valor("email")}" oninput="assistenteSalvarCampoDados(this)" placeholder="contato@empresa.com.br">
        </div>
        <div class="assistente-campo">
          <label>Telefone / WhatsApp *</label>
          <input data-assistente-campo name="telefone" value="${valor("telefone")}" oninput="assistenteSalvarCampoDados(this)" placeholder="(11) 99999-9999">
        </div>
        <div class="assistente-campo largo">
          <label>Site</label>
          <input data-assistente-campo type="url" name="site" value="${valor("site")}" oninput="assistenteSalvarCampoDados(this)" placeholder="https://suaempresa.com.br">
        </div>
        <div class="assistente-campo largo">
          <label>Endereço comercial</label>
          <input data-assistente-campo name="endereco" value="${valor("endereco")}" oninput="assistenteSalvarCampoDados(this)" placeholder="Rua, número, bairro, cidade, estado e CEP">
        </div>
        <div class="assistente-campo">
          <label>País</label>
          <select data-assistente-campo name="pais" onchange="assistenteSalvarCampoDados(this)">
            <option value="BR" ${optionSelected("pais", "BR", "BR")}>Brasil</option>
          </select>
        </div>
        <div class="assistente-campo">
          <label>Moeda</label>
          <select data-assistente-campo name="moeda" onchange="assistenteSalvarCampoDados(this)">
            <option value="BRL" ${optionSelected("moeda", "BRL", "BRL")}>Real brasileiro (BRL)</option>
            <option value="USD" ${optionSelected("moeda", "USD")}>Dólar americano (USD)</option>
          </select>
        </div>
        <div class="assistente-campo largo">
          <label>Fuso horário</label>
          <select data-assistente-campo name="fuso" onchange="assistenteSalvarCampoDados(this)">
            <option value="America/Sao_Paulo" ${optionSelected("fuso", "America/Sao_Paulo", "America/Sao_Paulo")}>Brasília — America/Sao_Paulo</option>
            <option value="America/Manaus" ${optionSelected("fuso", "America/Manaus")}>Manaus — America/Manaus</option>
            <option value="America/Rio_Branco" ${optionSelected("fuso", "America/Rio_Branco")}>Rio Branco — America/Rio_Branco</option>
          </select>
        </div>
      </div>
      <div class="assistente-contas-aviso">
        O rascunho fica salvo neste navegador. Senha, código de segurança, CAPTCHA e cartão nunca são solicitados nem armazenados pela Plataforma de Leads.
      </div>`;
  }

  function statusDa(plataforma) {
    return estado.status[plataforma] || {
      estado: "pendente",
      titulo: "Verificando conexão",
      detalhe: "Aguarde enquanto consultamos a plataforma."
    };
  }

  function renderMonitorTela() {
    if (!monitor.ativo || !monitor.plataforma) return "";
    const p = plataformas[monitor.plataforma];
    const r = monitor.resultado;
    const campos = Object.values(monitor.checklist || {});
    const alertas = Array.isArray(r?.alertas) ? r.alertas : [];
    const historico = Array.isArray(monitor.historico) ? monitor.historico : [];
    const status = monitor.pausado
      ? "Pausado"
      : monitor.analisando
      ? "Analisando a tela..."
      : r?.concluido
      ? "Verificação concluída"
      : "Acompanhamento ativo";

    return `
      <section id="assistente_monitor_tela" class="assistente-monitor ${monitor.pausado ? "pausado" : ""}" aria-live="polite">
        <div class="assistente-monitor-topo">
          <div>
            <b>👁 Verificador de tela — ${esc(p.nome)}</b>
            <span>${esc(status)} · a imagem é analisada, mas não é salva no banco da plataforma</span>
          </div>
          <span class="assistente-monitor-pulso ${monitor.pausado ? "pausado" : ""}"></span>
        </div>
        <div class="assistente-monitor-grid">
          <div class="assistente-monitor-preview">
            <video id="assistente_monitor_video" autoplay muted playsinline></video>
            ${monitor.pausado ? `<div class="assistente-monitor-preview-aviso">Compartilhamento pausado</div>` : ""}
          </div>
          <div class="assistente-monitor-orientacao">
            ${monitor.erro ? `<div class="assistente-monitor-erro">${esc(monitor.erro)}</div>` : ""}
            ${!r ? `
              <strong>Preparando a primeira conferência</strong>
              <p>Deixe visível a página oficial. O assistente identificará a etapa e revisará os campos apresentados.</p>
            ` : `
              <div class="assistente-monitor-etapa">${esc(r.pagina || p.nome)} · ${esc(r.etapa || "Etapa identificada")}</div>
              <strong>${esc(r.resumo || "Tela verificada")}</strong>
              <div class="assistente-monitor-proxima"><b>Próxima ação</b>${esc(r.proxima_acao || "Continue pela página oficial.")}</div>
              <div class="assistente-monitor-confianca">Confiança da leitura: ${Math.round(Math.max(0, Math.min(1, Number(r.confianca) || 0)) * 100)}%</div>
            `}
          </div>
        </div>
        ${campos.length ? `
          <div class="assistente-monitor-subtitulo">Checklist acumulado desta sessão · ${campos.length} item(ns) conferido(s)</div>
          <div class="assistente-monitor-checklist">
            ${campos.map(campo => `
              <div class="assistente-monitor-campo ${esc(campo.status)}">
                <span>${campo.status === "preenchido" ? "✓" : campo.status === "faltando" ? "!" : campo.status === "atencao" ? "⚠" : "–"}</span>
                <div><b>${esc(campo.nome)}</b><small>${esc(campo.orientacao || "")}</small></div>
              </div>`).join("")}
          </div>` : ""}
        ${historico.length > 1 ? `
          <div class="assistente-monitor-historico">
            <b>Etapas reconhecidas</b>
            ${historico.slice(-6).map(item => `<span>${esc(item.etapa)}${item.concluido ? " ✓" : ""}</span>`).join("")}
          </div>` : ""}
        ${alertas.length ? `<div class="assistente-monitor-alertas">${alertas.map(alerta => `<div>⚠ ${esc(alerta)}</div>`).join("")}</div>` : ""}
        ${r?.sensivel && monitor.pausado ? `<div class="assistente-monitor-sensivel"><b>Proteção ativada:</b> foi detectada uma etapa sensível. A captura foi pausada. Conclua senha, código, CAPTCHA, documento ou pagamento pessoalmente e só depois retome.</div>` : ""}
        <div class="assistente-monitor-acoes">
          <button class="assistente-btn-secundario" onclick="assistenteAlternarPausaTela()">${monitor.limiteAtingido ? "↻ Iniciar nova sessão" : monitor.pausado ? "▶ Retomar verificação" : "⏸ Pausar"}</button>
          <button class="assistente-btn-primario" onclick="assistenteAnalisarTelaAgora()" ${monitor.analisando || monitor.pausado ? "disabled" : ""}>${monitor.analisando ? "Analisando..." : "🔎 Analisar agora"}</button>
          <button class="assistente-btn-secundario" onclick="assistentePararMonitorTela()">■ Encerrar compartilhamento</button>
        </div>
        <div class="assistente-monitor-privacidade">
          Compartilhe somente a janela oficial de ${esc(p.nome)}. Pause antes de digitar senha, cartão, documento, CAPTCHA ou código de segurança.
        </div>
      </section>`;
  }

  function renderPreparoMonitor() {
    if (!monitor.preparada || monitor.ativo) return "";
    const p = plataformas[monitor.preparada];
    if (!p) return "";
    return `
      <section id="assistente_monitor_preparo" class="assistente-monitor-preparo" aria-live="polite">
        <div>
          <b>1. A página oficial de ${esc(p.nome)} foi aberta.</b>
          <span>Deixe essa página aberta, volte aqui e inicie a verificação. O navegador mostrará a lista de janelas; escolha somente a janela oficial de ${esc(p.nome)}.</span>
        </div>
        <button class="assistente-btn-primario" onclick="assistenteAcompanharTela('${esc(monitor.preparada)}')">2. Começar verificação</button>
        <small>Pause antes de digitar senha, cartão, documento, CAPTCHA ou código de segurança.</small>
      </section>`;
  }

  function renderStatus() {
    if (estado.carregando && !Object.keys(estado.status).length) {
      return `<div style="padding:42px;text-align:center;color:#94a3b8;"><span class="spinner-toggle"></span> Verificando suas contas...</div>`;
    }

    return `
      <p class="assistente-contas-intro">
        Continue cada rede pela autorização oficial. Ao retornar, o assistente identifica automaticamente a conexão e mostra o próximo passo.
      </p>
      <div class="assistente-status-lista">
        ${estado.plataformas.map(id => {
          const p = plataformas[id];
          const s = statusDa(id);
          const capacidade = estado.capacidades[id] || {};
          const acao = s.estado === "desconectado"
            ? `<button class="assistente-btn-primario" onclick="assistenteIniciarConexao('${id}', this)">Autorizar ${p.nome}</button>`
            : `<button class="assistente-btn-primario" onclick="assistenteAbrirDetalhes('${id}')">${s.estado === "ok" ? "Ver conta" : "Continuar configuração"}</button>`;
          const gerenciadoras = Array.isArray(capacidade.gerenciadoras) ? capacidade.gerenciadoras : [];
          const seletorGerenciadora = id === "google" && capacidade.automatico && gerenciadoras.length
            ? `<select id="assistente_google_mcc" class="assistente-select-mcc" aria-label="Conta de administrador Google Ads">
                ${gerenciadoras.map(conta => `<option value="${esc(conta.customer_id)}">${esc(conta.nome)} (${esc(conta.customer_id)})</option>`).join("")}
              </select>`
            : "";
          const criar = id === "google" && capacidade.automatico
            ? `${seletorGerenciadora}<button class="assistente-btn-secundario" onclick="assistenteCriarContaGoogle(this)">✨ Criar conta automaticamente</button>`
            : `<button class="assistente-btn-secundario" onclick="assistenteAbrirTutorial('${id}')">Continuar criação oficial</button>`;
          const compartilhamentoDisponivel = Boolean(navigator.mediaDevices?.getDisplayMedia);
          const acompanhar = compartilhamentoDisponivel
            ? `<button class="assistente-btn-secundario assistente-btn-monitor" onclick="assistenteAcompanharTela('${id}', this)">${monitor.ativo && monitor.plataforma === id ? "👁 Tela acompanhada" : monitor.preparada === id ? "▶ Começar verificação" : "👁 Verificar cada detalhe"}</button>`
            : `<span class="assistente-monitor-indisponivel">Verificação visual disponível no computador com Chrome ou Edge atualizado. O restante do assistente continua funcionando normalmente.</span>`;
          return `
            <div class="assistente-status-card">
              <div class="assistente-status-identidade"><span>${p.icone}</span>${p.nome}</div>
              <div class="assistente-status-texto">
                <strong>${esc(s.titulo)}</strong>
                <small>${esc(s.detalhe)}</small>
                <span class="assistente-status-selo ${s.classe || "pendente"}">${s.estado === "ok" ? "✓" : s.estado === "desconectado" ? "○" : "!"} ${esc(s.rotulo || "Em andamento")}</span>
                ${capacidade.titulo ? `<div class="assistente-capacidade ${capacidade.automatico ? "automatica" : "oficial"}"><b>${esc(capacidade.titulo)}</b><span>${esc(capacidade.detalhe || "")}</span></div>` : ""}
              </div>
              <div class="assistente-status-acoes">
                ${acao}
                ${criar}
                ${acompanhar}
              </div>
            </div>`;
        }).join("")}
      </div>
      ${renderPreparoMonitor()}
      ${renderMonitorTela()}
      <div class="assistente-contas-aviso">
        O verificador acompanha somente a janela que você escolher e cruza a leitura visual com o status real das integrações. Login, aceite de termos, verificação empresarial e pagamento continuam sendo concluídos pelo titular na página oficial.
      </div>`;
  }

  function renderFooter() {
    const footer = document.getElementById("assistente_contas_footer");
    if (!footer) return;
    const etapa = estado.etapa;
    footer.innerHTML = `
      <div class="assistente-contas-footer-esq">
        ${etapa > 1 ? `<button class="assistente-btn-secundario" onclick="assistenteIrParaEtapa(${etapa - 1})">← Voltar</button>` : `<button class="assistente-btn-secundario" onclick="fecharAssistenteContasAnuncios()">Continuar depois</button>`}
        <span id="assistente_contas_salvamento" class="assistente-salvamento" data-estado="${esc(estado.salvamento)}"></span>
      </div>
      <div class="assistente-contas-footer-dir">
        ${etapa === 3
          ? `<button class="assistente-btn-secundario" onclick="assistenteCopiarDados()">📋 Copiar dados</button><button class="assistente-btn-secundario" onclick="carregarAssistenteContasAnuncios()">↻ Verificar novamente</button><button class="assistente-btn-sucesso" onclick="fecharAssistenteContasAnuncios()">Concluir</button>`
          : `<button class="assistente-btn-primario" onclick="assistenteIrParaEtapa(${etapa + 1})">Continuar →</button>`}
      </div>`;
  }

  function render() {
    renderEtapas();
    const corpo = document.getElementById("assistente_contas_corpo");
    if (!corpo) return;
    corpo.innerHTML = estado.etapa === 1 ? renderPlataformas() : estado.etapa === 2 ? renderDados() : renderStatus();
    renderFooter();
    atualizarIndicadorSalvamento();
    const preview = document.getElementById("assistente_monitor_video");
    if (preview && monitor.stream) {
      preview.srcObject = monitor.stream;
      preview.play().catch(() => {});
    }
  }

  async function carregarStatus(opcoes = {}) {
    if (!localStorage.getItem("token")) return;
    estado.carregando = true;
    if (aberto() && estado.etapa === 3) render();

    const token = localStorage.getItem("token");
    let mapa = {};
    let metaCompleto = null;
    try {
      // A verificação de permissões externas pode levar alguns segundos. Ela é
      // carregada em paralelo para nunca segurar a exibição das conexões.
      fetch(`${API}/assistente-contas-anuncios/capacidades`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(async resCapacidades => {
        if (!resCapacidades.ok) return;
        const dataCapacidades = await resCapacidades.json();
        estado.capacidades = dataCapacidades?.capacidades || {};
        if (aberto() && estado.etapa === 3) render();
      }).catch(() => {});

      const res = await fetch(`${API}/conexoes`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        (data?.conexoes || data || []).forEach(c => { if (c?.plataforma) mapa[c.plataforma] = c; });
      }
      if (mapa.meta?.status === "conectado") {
        const resMeta = await fetch(`${API}/meta/status-completo`, { headers: { Authorization: `Bearer ${token}` } });
        if (resMeta.ok) metaCompleto = await resMeta.json();
      }
    } catch (_) {}

    const novoStatus = {};
    estado.plataformas.forEach(id => {
      const conn = mapa[id];
      if (conn?.status !== "conectado") {
        novoStatus[id] = {
          estado: "desconectado",
          classe: "pendente",
          rotulo: "Aguardando autorização",
          titulo: "Autorize o acesso com segurança",
          detalhe: "O login e o consentimento serão feitos diretamente na página oficial."
        };
        return;
      }

      const contaSelecionada = id === "meta"
        ? Boolean(metaCompleto?.conta_anuncios || conn?.conta?.conta_anuncios_id || conn?.conta_anuncios_id)
        : id === "google"
        ? Boolean(conn?.conta?.customer_id)
        : Boolean(conn?.conta?.advertiser_id);

      if (!contaSelecionada) {
        novoStatus[id] = {
          estado: "configurar",
          classe: "warn",
          rotulo: "Conta de anúncios pendente",
          titulo: "Escolha ou crie uma conta de anúncios",
          detalhe: "A autorização foi concluída, mas ainda falta selecionar a conta que será usada."
        };
        return;
      }

      const metaPendente = id === "meta" && metaCompleto && !metaCompleto.pronto_para_anunciar;
      novoStatus[id] = metaPendente
        ? {
            estado: "configurar",
            classe: "warn",
            rotulo: "Revisão necessária",
            titulo: "Conta encontrada, com ajustes pendentes",
            detalhe: "Abra a conta para revisar Página, Instagram, termos ou pagamento."
          }
        : {
            estado: "ok",
            classe: "ok",
            rotulo: "Conta conectada",
            titulo: "Conta de anúncios configurada",
            detalhe: "A Plataforma de Leads já reconhece a conta selecionada nesta rede."
          };
    });

    estado.status = novoStatus;
    estado.carregando = false;
    if (aberto()) render();
    if (!opcoes.silencioso && typeof window.carregarHub === "function") await window.carregarHub();
  }

  async function analisarTelaMonitor(opcoes = {}) {
    if (!monitor.ativo || monitor.pausado || monitor.analisando || !monitor.plataforma) return;
    if (monitor.analises >= 60) {
      monitor.pausado = true;
      monitor.limiteAtingido = true;
      definirFaixaMonitor(false);
      monitor.erro = "A sessão atingiu o limite de verificações. Inicie uma nova sessão para continuar acompanhando esta mesma janela.";
      if (aberto()) render();
      return;
    }

    const captura = capturarTelaMonitor();
    if (!captura) {
      monitor.erro = "A janela compartilhada ainda não forneceu uma imagem. Mantenha-a aberta e tente novamente.";
      if (aberto()) render();
      return;
    }

    const mudou = telaMudou(captura.assinatura);
    const venceuRevisao = Date.now() - monitor.ultimaAnalise > 45000;
    if (!opcoes.forcar && !mudou && !venceuRevisao) return;

    monitor.assinatura = captura.assinatura;
    monitor.analisando = true;
    monitor.erro = "";
    if (aberto()) render();

    let timeoutAnalise = null;
    try {
      const token = localStorage.getItem("token");
      const controller = new AbortController();
      timeoutAnalise = setTimeout(() => controller.abort(), 35000);
      const res = await fetch(`${API}/assistente-contas-anuncios/analisar-tela`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          plataforma: monitor.plataforma,
          imagem: captura.imagem,
          contexto_anterior: contextoMonitor()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "A leitura visual não respondeu agora.");
      monitor.resultado = data.analise || null;
      monitor.ultimaAnalise = Date.now();
      monitor.analises += 1;
      (Array.isArray(monitor.resultado?.campos) ? monitor.resultado.campos : []).forEach(campo => {
        const chave = String(campo?.nome || "").trim().toLocaleLowerCase("pt-BR");
        if (!chave) return;
        monitor.checklist[chave] = {
          nome: String(campo.nome || "Campo"),
          status: String(campo.status || "atencao"),
          orientacao: String(campo.orientacao || "")
        };
      });
      const ultimaEtapa = monitor.historico[monitor.historico.length - 1];
      if (monitor.resultado?.etapa && ultimaEtapa?.etapa !== monitor.resultado.etapa) {
        monitor.historico.push({
          etapa: monitor.resultado.etapa,
          concluido: Boolean(monitor.resultado.concluido)
        });
        monitor.historico = monitor.historico.slice(-12);
      } else if (ultimaEtapa && monitor.resultado?.concluido) {
        ultimaEtapa.concluido = true;
      }
      if (monitor.resultado?.sensivel) {
        monitor.pausado = true;
        definirFaixaMonitor(false);
      }
    } catch (err) {
      monitor.erro = err?.name === "AbortError"
        ? "A análise demorou mais que o esperado. A próxima verificação tentará novamente."
        : err?.message || "Não foi possível analisar esta tela.";
    } finally {
      if (timeoutAnalise) clearTimeout(timeoutAnalise);
      monitor.analisando = false;
      if (aberto()) render();
    }
  }

  window.assistenteAcompanharTela = async function (plataforma) {
    const configuracao = plataformas[plataforma];
    if (!configuracao) return;
    if (monitor.ativo && monitor.plataforma === plataforma) {
      document.getElementById("assistente_monitor_tela")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert("A verificação visual não está disponível neste navegador. Continue usando o assistente normalmente ou abra a plataforma em um computador com Chrome ou Edge atualizado.");
      return;
    }

    if (monitor.preparada !== plataforma) {
      if (monitor.ativo) pararMonitorTela(false);
      const janelaOficial = window.open(
        configuracao.urlOficial,
        `assistente_${plataforma}`,
        "popup=yes,width=1280,height=860,resizable=yes,scrollbars=yes"
      );
      if (!janelaOficial) {
        alert(`O navegador bloqueou a abertura de ${configuracao.nome}. Libere pop-ups para este site e tente novamente.`);
        return;
      }
      monitor.preparada = plataforma;
      monitor.erro = "";
      if (aberto()) {
        render();
        setTimeout(() => document.getElementById("assistente_monitor_preparo")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      }
      return;
    }

    let novoStream = null;
    try {
      novoStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "window",
          frameRate: { ideal: 1, max: 2 },
          width: { ideal: 1280 },
          height: { ideal: 800 }
        },
        audio: false,
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include"
      });

      pararMonitorTela(false);
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = novoStream;
      await video.play();

      Object.assign(monitor, {
        ativo: true,
        pausado: false,
        preparada: null,
        limiteAtingido: false,
        plataforma,
        stream: novoStream,
        video,
        analisando: false,
        resultado: null,
        erro: "",
        assinatura: null,
        ultimaAnalise: 0,
        analises: 0,
        checklist: {},
        historico: []
      });
      const faixaCompartilhada = novoStream.getVideoTracks()[0];
      faixaCompartilhada?.addEventListener("ended", () => {
        if (monitor.stream === novoStream) pararMonitorTela(true);
      }, { once: true });
      monitor.timer = setInterval(() => analisarTelaMonitor({ forcar: false }), 12000);
      if (aberto()) render();
      setTimeout(() => analisarTelaMonitor({ forcar: true }), 1000);
    } catch (err) {
      novoStream?.getTracks?.().forEach(track => track.stop());
      if (err?.name !== "NotAllowedError") {
        const mensagem = err?.name === "InvalidStateError"
          ? "O navegador perdeu a autorização do clique. Volte ao assistente e clique novamente em ‘Começar verificação’."
          : err?.message || "Não foi possível iniciar o compartilhamento da janela.";
        alert(mensagem);
      }
    }
  };

  window.assistenteAlternarPausaTela = function () {
    if (!monitor.ativo) return;
    if (monitor.limiteAtingido) {
      Object.assign(monitor, {
        pausado: false,
        limiteAtingido: false,
        analisando: false,
        resultado: null,
        erro: "",
        assinatura: null,
        ultimaAnalise: 0,
        analises: 0,
        checklist: {},
        historico: []
      });
      definirFaixaMonitor(true);
      if (aberto()) render();
      setTimeout(() => analisarTelaMonitor({ forcar: true }), 600);
      return;
    }
    monitor.pausado = !monitor.pausado;
    definirFaixaMonitor(!monitor.pausado);
    monitor.erro = monitor.pausado ? "Verificação pausada pelo usuário." : "";
    if (aberto()) render();
    if (!monitor.pausado) setTimeout(() => analisarTelaMonitor({ forcar: true }), 600);
  };

  window.assistenteAnalisarTelaAgora = function () {
    analisarTelaMonitor({ forcar: true });
  };

  window.assistentePararMonitorTela = function () {
    pararMonitorTela(true);
  };

  window.abrirAssistenteContasAnuncios = function () {
    interagiuDesdeAbertura = false;
    carregarRascunho();
    const modal = document.getElementById("assistente_contas_modal");
    if (!modal) return;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    render();
    carregarRascunhoServidor();
    carregarStatus({ silencioso: true });
  };

  window.fecharAssistenteContasAnuncios = function () {
    capturarFormulario();
    salvarRascunho({ imediato: true });
    pararMonitorTela(false);
    const modal = document.getElementById("assistente_contas_modal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
  };

  window.assistenteSelecionarPlataforma = function (plataforma) {
    if (!plataformas[plataforma]) return;
    interagiuDesdeAbertura = true;
    const selecionadas = new Set(estado.plataformas);
    if (selecionadas.has(plataforma)) selecionadas.delete(plataforma);
    else selecionadas.add(plataforma);
    estado.plataformas = [...selecionadas];
    salvarRascunho();
    render();
  };

  window.assistenteSalvarCampoDados = function (el) {
    if (!el?.name) return;
    interagiuDesdeAbertura = true;
    estado.dados[el.name] = el.value;
    salvarRascunho();
  };

  window.assistenteIrParaEtapa = function (etapa) {
    interagiuDesdeAbertura = true;
    capturarFormulario();
    if (etapa === 2 && !estado.plataformas.length) {
      alert("Selecione ao menos uma plataforma.");
      return;
    }
    if (etapa === 3) {
      const obrigatorios = [["nome_legal", "nome ou razão social"], ["email", "e-mail"], ["telefone", "telefone"]];
      const faltante = obrigatorios.find(([campo]) => !String(estado.dados[campo] || "").trim());
      if (faltante) {
        alert(`Preencha o campo ${faltante[1]} para continuar.`);
        return;
      }
    }
    estado.etapa = Math.min(3, Math.max(1, etapa));
    salvarRascunho();
    render();
    if (estado.etapa === 3) carregarStatus();
  };

  window.carregarAssistenteContasAnuncios = carregarStatus;

  window.assistenteIniciarConexao = function (plataforma, btn) {
    if (typeof window.conectarPlataforma === "function") window.conectarPlataforma(plataforma, btn);
  };

  window.assistenteAbrirDetalhes = function (plataforma) {
    window.fecharAssistenteContasAnuncios();
    setTimeout(() => window.toggleIntegDetalhes?.(plataforma), 0);
  };

  window.assistenteAbrirTutorial = function (plataforma) {
    window.fecharAssistenteContasAnuncios();
    if (plataforma === "meta") window.abrirPassoMetaAnuncios?.();
    else if (plataforma === "google") window.abrirPassoGoogleConta?.();
    else if (plataforma === "tiktok") window.abrirPassoTikTokConta?.();
  };

  window.assistenteCriarContaGoogle = async function (btn) {
    capturarFormulario();
    const seletor = document.getElementById("assistente_google_mcc");
    const managerCustomerId = seletor?.value || "";
    const nome = String(estado.dados.nome_comercial || estado.dados.nome_legal || "").trim();
    if (!managerCustomerId || !nome) {
      alert("Informe os dados da empresa e escolha a conta de administrador do Google Ads.");
      return;
    }
    const confirmar = confirm(
      `Criar agora a conta “${nome}” no Google Ads?\n\n` +
      "Ela será vinculada à conta de administrador escolhida. Moeda e fuso horário não poderão ser alterados depois."
    );
    if (!confirmar) return;

    const token = localStorage.getItem("token");
    const textoOriginal = btn?.textContent || "Criar conta automaticamente";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Criando conta...";
    }
    try {
      await persistirRascunhoServidor();
      const res = await fetch(`${API}/assistente-contas-anuncios/google/criar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nome,
          moeda: estado.dados.moeda || "BRL",
          fuso: estado.dados.fuso || "America/Sao_Paulo",
          manager_customer_id: managerCustomerId
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "O Google Ads não autorizou a criação da conta.");
      alert(`Conta Google Ads criada e selecionada com sucesso.\nID: ${data.customer_id}\n\nAgora configure o pagamento no Google Ads.`);
      await carregarStatus();
    } catch (err) {
      alert(err?.message || "Não foi possível criar a conta do Google Ads.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = textoOriginal;
      }
    }
  };

  window.assistenteCopiarDados = async function () {
    const d = estado.dados;
    const texto = [
      `Nome legal: ${d.nome_legal || ""}`,
      `Nome comercial: ${d.nome_comercial || ""}`,
      `CPF/CNPJ: ${d.documento || ""}`,
      `Segmento: ${d.segmento || ""}`,
      `E-mail: ${d.email || ""}`,
      `Telefone: ${d.telefone || ""}`,
      `Site: ${d.site || ""}`,
      `Endereço: ${d.endereco || ""}`,
      `País: ${d.pais || "BR"}`,
      `Moeda: ${d.moeda || "BRL"}`,
      `Fuso horário: ${d.fuso || "America/Sao_Paulo"}`
    ].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      alert("Dados da empresa copiados. Cole-os na página oficial quando a rede solicitar.");
    } catch (_) {
      prompt("Copie os dados abaixo:", texto);
    }
  };

  // Quando o usuário volta da página oficial, reconsulta as conexões sem
  // depender de acesso ao conteúdo da janela OAuth (que é de outro domínio).
  window.addEventListener("focus", () => {
    if (aberto() && estado.etapa === 3) {
      setTimeout(() => carregarStatus({ silencioso: true }), 350);
      if (monitor.ativo && !monitor.pausado) setTimeout(() => analisarTelaMonitor({ forcar: true }), 900);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && aberto() && estado.etapa === 3) {
      carregarStatus({ silencioso: true });
      if (monitor.ativo && !monitor.pausado) setTimeout(() => analisarTelaMonitor({ forcar: true }), 900);
    }
  });
  window.addEventListener("beforeunload", () => pararMonitorTela(false));
})();
