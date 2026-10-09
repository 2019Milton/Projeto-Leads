// Assistente unificado de criação/configuração de contas de anúncios.
// Reaproveita os OAuth oficiais já existentes e nunca solicita senha, CAPTCHA,
// código de segurança ou dados de cartão dentro da Plataforma de Leads.
(function () {
  "use strict";

  const STORAGE_LEGADO = "plataforma_leads_assistente_contas_v1";
  const { validarDadosAssistente } = window.AssistenteContasRegras;
  let sessaoToken = null;
  let chaveRascunho = null;
  let statusSequencia = 0;
  let filaSalvamento = Promise.resolve();
  let versaoRascunho = 0;
  let criandoGoogle = false;
  const sessaoValida = (token = sessaoToken) => Boolean(token && token === sessaoToken && token === localStorage.getItem("token"));
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
    acompanhamento: {},
    erros: {},
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
    historico: [],
    captura: null,
    controller: null,
    geracao: 0
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
    if (!r || r.sensivel) return "";
    return [r.pagina, r.etapa, r.resumo, r.proxima_acao].filter(Boolean).join(" | ").slice(0, 1200);
  }

  function definirFaixaMonitor(ativa) {
    monitor.stream?.getVideoTracks?.().forEach(track => { track.enabled = ativa; });
  }

  function pararMonitorTela(renderizar = true) {
    monitor.controller?.abort();
    const stream = monitor.stream;
    monitor.stream = null;
    stream?.getTracks?.().forEach(track => track.stop());
    if (monitor.video) monitor.video.srcObject = null;
    monitor.geracao += 1;
    Object.assign(monitor, { ativo: false, pausado: false, preparada: null, plataforma: null,
      video: null, analisando: false, resultado: null, erro: "", captura: null, controller: null,
      checklist: {}, historico: [], analises: 0 });
    if (renderizar && aberto()) render();
  }

  function capturarTelaMonitor() {
    const video = monitor.video;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
    const escala = Math.min(1, 1280 / video.videoWidth, 800 / video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * escala));
    canvas.height = Math.max(1, Math.round(video.videoHeight * escala));
    canvas.getContext("2d", { alpha: false }).drawImage(video, 0, 0, canvas.width, canvas.height);
    return { imagem: canvas.toDataURL("image/jpeg", 0.72) };
  }

  function normalizarPlataformaSelecionada(valor) {
    const primeiraValida = Array.isArray(valor)
      ? valor.find(plataforma => plataformas[plataforma])
      : null;
    return [primeiraValida || "meta"];
  }

  function prepararSessao() {
    const token = localStorage.getItem("token");
    if (token === sessaoToken && chaveRascunho) return true;
    if (salvamentoTimer) clearTimeout(salvamentoTimer);
    pararMonitorTela(false);
    statusSequencia += 1;
    sessaoToken = token;
    chaveRascunho = null;
    criandoGoogle = false;
    estado = { etapa: 1, plataformas: ["meta"], dados: {}, acompanhamento: {}, erros: {}, status: {}, capacidades: {}, carregando: false, salvamento: "local" };
    // O cache antigo não tem proprietário: nunca importá-lo para uma conta.
    try {
      localStorage.removeItem(STORAGE_LEGADO);
      const id = atob(token || "").split(":")[0];
      if (/^[1-9]\d*$/.test(id)) chaveRascunho = "plataforma_leads_assistente_contas_v2_" + id;
    } catch (_) {}
    return Boolean(token && chaveRascunho);
  }

  function aplicarRascunho(salvo) {
    estado.etapa = Math.min(3, Math.max(1, Number(salvo.etapa) || 1));
    estado.plataformas = normalizarPlataformaSelecionada(salvo.plataformas);
    estado.dados = salvo.dados && typeof salvo.dados === "object" ? salvo.dados : {};
    estado.acompanhamento = salvo.acompanhamento && typeof salvo.acompanhamento === "object" ? salvo.acompanhamento : {};
    if (estado.etapa === 3 && Object.keys(validarDadosAssistente(estado.dados)).length) estado.etapa = 2;
  }

  function dadosRascunho() {
    return { etapa: estado.etapa, plataformas: estado.plataformas, dados: estado.dados, acompanhamento: estado.acompanhamento };
  }

  function gravarLocal() {
    if (!sessaoValida() || !chaveRascunho) return;
    try { localStorage.setItem(chaveRascunho, JSON.stringify(dadosRascunho())); } catch (_) {}
  }

  function carregarRascunho() {
    if (!prepararSessao()) return false;
    try {
      const salvo = JSON.parse(localStorage.getItem(chaveRascunho) || "null");
      if (salvo && typeof salvo === "object") aplicarRascunho(salvo);
    } catch (_) {}
    return true;
  }

  function atualizarIndicadorSalvamento() {
    const el = document.getElementById("assistente_contas_salvamento");
    if (!el) return;
    const textos = { salvando: "Salvando na sua conta...", salvo: "✓ Salvo na sua conta",
      local: "Salvo neste dispositivo", erro: "Salvo neste dispositivo — tente salvar novamente" };
    el.textContent = textos[estado.salvamento] || textos.local;
    el.dataset.estado = estado.salvamento;
  }

  function persistirRascunhoServidor() {
    const token = sessaoToken;
    const versao = versaoRascunho;
    const body = JSON.stringify(dadosRascunho());
    const executar = async () => {
      if (!sessaoValida(token)) return false;
      estado.salvamento = "salvando";
      atualizarIndicadorSalvamento();
      try {
        const res = await fetch(API + "/assistente-contas-anuncios", {
          method: "PUT", signal: AbortSignal.timeout(15000),
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body
        });
        if (!sessaoValida(token)) return false;
        if (!res.ok) throw new Error("Falha ao salvar");
        if (versao === versaoRascunho) estado.salvamento = "salvo";
        atualizarIndicadorSalvamento();
        return true;
      } catch (_) {
        if (sessaoValida(token)) { estado.salvamento = "erro"; atualizarIndicadorSalvamento(); }
        return false;
      }
    };
    filaSalvamento = filaSalvamento.then(executar, executar);
    return filaSalvamento;
  }

  function salvarRascunho(opcoes = {}) {
    if (!sessaoValida()) return;
    versaoRascunho += 1;
    gravarLocal();
    if (salvamentoTimer) clearTimeout(salvamentoTimer);
    if (opcoes.imediato) persistirRascunhoServidor();
    else salvamentoTimer = setTimeout(persistirRascunhoServidor, 650);
  }

  async function carregarRascunhoServidor() {
    const token = sessaoToken;
    if (!sessaoValida(token)) return;
    try {
      const res = await fetch(API + "/assistente-contas-anuncios", {
        signal: AbortSignal.timeout(15000), headers: { Authorization: "Bearer " + token }
      });
      if (!res.ok) throw new Error("Falha ao carregar");
      const data = await res.json();
      if (!sessaoValida(token)) return;
      if (interagiuDesdeAbertura) return;
      if (data?.rascunho && typeof data.rascunho === "object") {
        aplicarRascunho(data.rascunho);
        estado.salvamento = "salvo";
        gravarLocal();
        if (aberto()) render();
        if (estado.etapa === 3) carregarStatus({ silencioso: true });
      }
    } catch (_) {
      if (sessaoValida(token)) { estado.salvamento = "erro"; atualizarIndicadorSalvamento(); }
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
    const nomes = ["Escolher plataforma", "Dados da empresa", "Conectar e acompanhar"];
    el.innerHTML = nomes.map((nome, i) => {
      const numero = i + 1;
      const classe = numero === estado.etapa ? "ativa" : numero < estado.etapa ? "concluida" : "";
      return `<div class="assistente-contas-etapa ${classe}"><span>${numero < estado.etapa ? "✓" : numero}</span><b>${nome}</b></div>`;
    }).join("");
  }

  function renderPlataformas() {
    return `
      <p class="assistente-contas-intro">
        Escolha uma plataforma para configurar agora. Depois você poderá voltar e criar outra conta sem preencher novamente os dados da empresa.
      </p>
      <div class="assistente-plataformas-grid">
        ${Object.entries(plataformas).map(([id, p]) => {
          const selecionada = estado.plataformas.includes(id);
          return `
            <label class="assistente-plataforma-opcao ${selecionada ? "selecionada" : ""}" onclick="event.preventDefault();assistenteSelecionarPlataforma('${id}')">
              <input type="radio" name="assistente_plataforma" ${selecionada ? "checked" : ""}>
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
        Uma conta é configurada por vez. Facebook e Instagram usam a mesma conta de anúncios da Meta, portanto não são criadas duas contas separadas para essas redes.
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
      ${Object.keys(estado.erros).length ? `<div class="assistente-form-erros" role="alert">Revise os campos indicados para continuar.</div>` : ""}
      <div class="assistente-form-grid">
        <div class="assistente-campo">
          <label for="assistente_campo_nome_legal">Nome ou razão social *</label>
          <input id="assistente_campo_nome_legal" aria-describedby="assistente_erro_nome_legal" aria-invalid="${Boolean(estado.erros.nome_legal)}" data-assistente-campo name="nome_legal" value="${valor("nome_legal")}" oninput="assistenteSalvarCampoDados(this)" placeholder="Ex.: Imobiliária Horizonte Ltda.">
          <small id="assistente_erro_nome_legal" class="assistente-erro-campo">${esc(estado.erros.nome_legal || "")}</small>
        </div>
        <div class="assistente-campo">
          <label for="assistente_campo_nome_comercial">Nome comercial</label>
          <input id="assistente_campo_nome_comercial" aria-describedby="assistente_erro_nome_comercial" aria-invalid="${Boolean(estado.erros.nome_comercial)}" data-assistente-campo name="nome_comercial" value="${valor("nome_comercial")}" oninput="assistenteSalvarCampoDados(this)" placeholder="Ex.: Horizonte Imóveis">
          <small id="assistente_erro_nome_comercial" class="assistente-erro-campo">${esc(estado.erros.nome_comercial || "")}</small>
        </div>
        <div class="assistente-campo">
          <label for="assistente_campo_documento">CPF ou CNPJ</label>
          <input id="assistente_campo_documento" aria-describedby="assistente_erro_documento" aria-invalid="${Boolean(estado.erros.documento)}" data-assistente-campo name="documento" value="${valor("documento")}" oninput="assistenteSalvarCampoDados(this)" placeholder="Do titular ou da empresa">
          <small id="assistente_erro_documento" class="assistente-erro-campo">${esc(estado.erros.documento || "")}</small>
        </div>
        <div class="assistente-campo">
          <label for="assistente_campo_segmento">Segmento</label>
          <input id="assistente_campo_segmento" aria-describedby="assistente_erro_segmento" aria-invalid="${Boolean(estado.erros.segmento)}" data-assistente-campo name="segmento" value="${valor("segmento")}" oninput="assistenteSalvarCampoDados(this)" placeholder="Ex.: Corretor de imóveis">
          <small id="assistente_erro_segmento" class="assistente-erro-campo">${esc(estado.erros.segmento || "")}</small>
        </div>
        <div class="assistente-campo">
          <label for="assistente_campo_email">E-mail responsável *</label>
          <input id="assistente_campo_email" aria-describedby="assistente_erro_email" aria-invalid="${Boolean(estado.erros.email)}" data-assistente-campo type="email" name="email" value="${valor("email")}" oninput="assistenteSalvarCampoDados(this)" placeholder="contato@empresa.com.br">
          <small id="assistente_erro_email" class="assistente-erro-campo">${esc(estado.erros.email || "")}</small>
        </div>
        <div class="assistente-campo">
          <label for="assistente_campo_telefone">Telefone / WhatsApp *</label>
          <input id="assistente_campo_telefone" aria-describedby="assistente_erro_telefone" aria-invalid="${Boolean(estado.erros.telefone)}" data-assistente-campo name="telefone" value="${valor("telefone")}" oninput="assistenteSalvarCampoDados(this)" placeholder="(11) 99999-9999">
          <small id="assistente_erro_telefone" class="assistente-erro-campo">${esc(estado.erros.telefone || "")}</small>
        </div>
        <div class="assistente-campo largo">
          <label for="assistente_campo_site">Site</label>
          <input id="assistente_campo_site" aria-describedby="assistente_erro_site" aria-invalid="${Boolean(estado.erros.site)}" data-assistente-campo type="url" name="site" value="${valor("site")}" oninput="assistenteSalvarCampoDados(this)" placeholder="https://suaempresa.com.br">
          <small id="assistente_erro_site" class="assistente-erro-campo">${esc(estado.erros.site || "")}</small>
        </div>
        <div class="assistente-campo largo">
          <label for="assistente_campo_endereco">Endereço comercial</label>
          <input id="assistente_campo_endereco" aria-describedby="assistente_erro_endereco" aria-invalid="${Boolean(estado.erros.endereco)}" data-assistente-campo name="endereco" value="${valor("endereco")}" oninput="assistenteSalvarCampoDados(this)" placeholder="Rua, número, bairro, cidade, estado e CEP">
          <small id="assistente_erro_endereco" class="assistente-erro-campo">${esc(estado.erros.endereco || "")}</small>
        </div>
        <div class="assistente-campo">
          <label for="assistente_campo_pais">País</label>
          <select id="assistente_campo_pais" aria-describedby="assistente_erro_pais" aria-invalid="${Boolean(estado.erros.pais)}" data-assistente-campo name="pais" onchange="assistenteSalvarCampoDados(this)">
            <option value="BR" ${optionSelected("pais", "BR", "BR")}>Brasil</option>
          </select>
          <small id="assistente_erro_pais" class="assistente-erro-campo">${esc(estado.erros.pais || "")}</small>
        </div>
        <div class="assistente-campo">
          <label for="assistente_campo_moeda">Moeda</label>
          <select id="assistente_campo_moeda" aria-describedby="assistente_erro_moeda" aria-invalid="${Boolean(estado.erros.moeda)}" data-assistente-campo name="moeda" onchange="assistenteSalvarCampoDados(this)">
            <option value="BRL" ${optionSelected("moeda", "BRL", "BRL")}>Real brasileiro (BRL)</option>
            <option value="USD" ${optionSelected("moeda", "USD")}>Dólar americano (USD)</option>
          </select>
          <small id="assistente_erro_moeda" class="assistente-erro-campo">${esc(estado.erros.moeda || "")}</small>
        </div>
        <div class="assistente-campo largo">
          <label for="assistente_campo_fuso">Fuso horário</label>
          <select id="assistente_campo_fuso" aria-describedby="assistente_erro_fuso" aria-invalid="${Boolean(estado.erros.fuso)}" data-assistente-campo name="fuso" onchange="assistenteSalvarCampoDados(this)">
            <option value="America/Sao_Paulo" ${optionSelected("fuso", "America/Sao_Paulo", "America/Sao_Paulo")}>Brasília — America/Sao_Paulo</option>
            <option value="America/Manaus" ${optionSelected("fuso", "America/Manaus")}>Manaus — America/Manaus</option>
            <option value="America/Rio_Branco" ${optionSelected("fuso", "America/Rio_Branco")}>Rio Branco — America/Rio_Branco</option>
          </select>
          <small id="assistente_erro_fuso" class="assistente-erro-campo">${esc(estado.erros.fuso || "")}</small>
        </div>
      </div>
      <div class="assistente-contas-aviso">
        O rascunho e as etapas observadas ficam salvos na sua conta e neste dispositivo. Este formulário não solicita senha, código de segurança ou cartão. A validação de formato não confirma a titularidade dos dados.
      </div>`;
  }

  function statusDa(plataforma) {
    return estado.status[plataforma] || {
      estado: "pendente",
      titulo: "Verificando conexão",
      detalhe: "Aguarde enquanto consultamos a plataforma."
    };
  }

  function renderHistoricoAcompanhamento(plataforma) {
    const salvo = estado.acompanhamento[plataforma];
    if (!salvo) return "";
    const campos = Array.isArray(salvo.checklist) ? salvo.checklist : [];
    const historico = Array.isArray(salvo.historico) ? salvo.historico : [];
    if (!campos.length && !historico.length) return "";
    return `<details class="assistente-historico-salvo">
      <summary>Etapas observadas anteriormente · ${esc(plataformas[plataforma].nome)}</summary>
      <p>Este histórico permite retomar a orientação. Ele não comprova que a configuração continua válida; a conexão é consultada novamente.</p>
      <div class="assistente-monitor-checklist">${campos.map(c => `<div class="assistente-monitor-campo ${esc(c.status)}"><span>${c.status === "preenchido" ? "✓" : "!"}</span><div><b>${esc(c.nome)}</b><small>${esc({preenchido:"Observado preenchido",faltando:"Pendente na última leitura",atencao:"Revisar",nao_aplicavel:"Não se aplicava à etapa"}[c.status] || "Revisar")}</small></div></div>`).join("")}</div>
      <div class="assistente-monitor-historico">${historico.map(h => `<span>${esc(h.etapa)}</span>`).join("")}</div>
    </details>`;
  }

  function renderMonitorTela() {
    if (!monitor.ativo || !monitor.plataforma) return "";
    const p = plataformas[monitor.plataforma];
    const r = monitor.resultado;
    const status = monitor.analisando ? "Analisando a imagem aprovada" : monitor.captura ? "Prévia local — ainda não enviada" : monitor.pausado ? "Prévia pausada" : "Prévia local — sem envio automático";
    return `
      <section id="assistente_monitor_tela" class="assistente-monitor" aria-live="polite">
        <div class="assistente-monitor-topo"><div><b>👁 Revisão de tela — ${esc(p.nome)}</b><span>${esc(status)}</span></div></div>
        <div class="assistente-monitor-grid">
          <div class="assistente-monitor-preview">
            ${monitor.captura ? `<img src="${monitor.captura.imagem}" alt="Imagem capturada localmente para sua revisão antes do envio">` : `<video id="assistente_monitor_video" autoplay muted playsinline></video>${monitor.pausado ? '<div class="assistente-monitor-preview-aviso">Prévia pausada</div>' : ''}`}
          </div>
          <div class="assistente-monitor-orientacao">
            ${monitor.erro ? `<div class="assistente-monitor-erro" role="alert">${esc(monitor.erro)}</div>` : ""}
            ${monitor.captura ? `<strong>Revise esta imagem antes de enviar</strong><p>Apenas esta imagem congelada será enviada à IA. Se houver senha, código, cartão, documento ou outro dado pessoal, descarte a imagem.</p>
              <label class="assistente-confirmar-imagem"><input id="assistente_confirmar_imagem" type="checkbox" ${monitor.analisando ? "disabled" : ""}> Revisei a imagem: não há dados sensíveis e autorizo o envio à IA.</label>` : r ? `
              <div class="assistente-monitor-etapa">${esc(r.pagina || p.nome)} · ${esc(r.etapa || "Etapa observada")}</div>
              <strong>${esc(r.resumo || "Imagem analisada")}</strong>
              <div class="assistente-monitor-proxima"><b>Próxima ação sugerida</b>${esc(r.proxima_acao || "Continue na página oficial.")}</div>
              <p>A leitura desta imagem não confirma a conexão nem a autorização para anunciar. Consulte o estado da integração acima.</p>
              ${r.sensivel ? '<div class="assistente-monitor-erro">A imagem continha uma etapa sensível. Conclua essa etapa pessoalmente e não envie capturas com esses dados.</div>' : ""}` : `<strong>Compartilhamento somente neste navegador</strong><p>Capture uma imagem, confira a prévia e envie apenas se ela não mostrar dados sensíveis. Nada é enviado automaticamente ao mudar de tela.</p>`}
          </div>
        </div>
        <div class="assistente-monitor-acoes">
          ${monitor.captura ? `<button class="assistente-btn-primario" onclick="assistenteEnviarImagem()" ${monitor.analisando ? "disabled" : ""}>${monitor.analisando ? "Analisando..." : "Enviar imagem revisada"}</button><button class="assistente-btn-secundario" onclick="assistenteDescartarImagem()" ${monitor.analisando ? "disabled" : ""}>Descartar imagem</button>` : `<button class="assistente-btn-secundario" onclick="assistenteAlternarPausaTela()">${monitor.pausado ? "Retomar prévia" : "Pausar prévia"}</button><button class="assistente-btn-primario" onclick="assistenteAnalisarTelaAgora()" ${monitor.pausado ? "disabled" : ""}>Capturar imagem para revisar</button>`}
          <button class="assistente-btn-secundario" onclick="assistentePararMonitorTela()">Encerrar compartilhamento</button>
        </div>
        <div class="assistente-monitor-privacidade">Pause antes de digitar informações pessoais. Imagens aprovadas são enviadas ao provedor de IA; não são guardadas no histórico do assistente. A detecção de conteúdo sensível pela IA acontece após o envio.</div>
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
          <span>Deixe essa página aberta, volte aqui e inicie a verificação. O navegador mostrará a lista de janelas; escolha somente a janela oficial de ${esc(p.nome)}. A prévia fica local até você revisar e enviar uma imagem.</span>
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
          const acao = s.estado === "erro"
            ? `<button class="assistente-btn-primario" onclick="carregarAssistenteContasAnuncios()">Tentar verificar novamente</button>`
            : s.estado === "pendente"
            ? `<button class="assistente-btn-secundario" disabled>Verificando...</button>`
            : s.estado === "desconectado"
            ? `<button class="assistente-btn-primario" onclick="assistenteIniciarConexao('${id}', this)">Autorizar ${p.nome}</button>`
            : `<button class="assistente-btn-primario" onclick="assistenteAbrirDetalhes('${id}')">${s.estado === "ok" ? "Ver conta" : "Continuar configuração"}</button>`;
          const gerenciadoras = Array.isArray(capacidade.gerenciadoras) ? capacidade.gerenciadoras : [];
          const seletorGerenciadora = id === "google" && capacidade.automatico && gerenciadoras.length
            ? `<select id="assistente_google_mcc" class="assistente-select-mcc" aria-label="Conta de administrador Google Ads">
                ${gerenciadoras.map(conta => `<option value="${esc(conta.customer_id)}">${esc(conta.nome)} (${esc(conta.customer_id)})</option>`).join("")}
              </select>`
            : "";
          const criar = id === "google" && capacidade.automatico
            ? `${seletorGerenciadora}<button class="assistente-btn-secundario" onclick="assistenteCriarContaGoogle(this)" ${criandoGoogle ? "disabled" : ""}>${criandoGoogle ? "Solicitação em andamento..." : "✨ Solicitar criação da conta"}</button>`
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
                ${s.itens?.length ? `<ul class="assistente-status-requisitos">${s.itens.map(item => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}
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
      ${estado.plataformas.map(renderHistoricoAcompanhamento).join("")}
      <div class="assistente-contas-aviso">
        A conexão é conferida pelas integrações. A IA orienta a partir das imagens que você revisar e enviar; não confirma titularidade nem conclui a configuração por você. Login, termos, verificação empresarial e pagamento são concluídos na página oficial.
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
          ? `<button class="assistente-btn-secundario" onclick="assistenteCopiarDados()">📋 Copiar dados</button><button class="assistente-btn-secundario" onclick="carregarAssistenteContasAnuncios()">↻ Verificar novamente</button><button class="assistente-btn-sucesso" onclick="fecharAssistenteContasAnuncios()">Salvar e fechar</button>`
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
    const token = sessaoToken;
    if (!sessaoValida(token)) return;
    const sequencia = ++statusSequencia;
    const ids = [...estado.plataformas];
    const atual = () => sessaoValida(token) && sequencia === statusSequencia;
    const consultar = async caminho => {
      const res = await fetch(API + caminho, { signal: AbortSignal.timeout(25000), headers: { Authorization: "Bearer " + token } });
      const data = await res.json();
      if (!res.ok || data?.error || data?.erro) throw new Error("Consulta indisponível");
      return data;
    };
    estado.carregando = true;
    estado.status = {};
    if (aberto() && estado.etapa === 3) render();
    consultar("/assistente-contas-anuncios/capacidades").then(data => {
      if (!atual()) return;
      estado.capacidades = data?.capacidades || {};
      if (aberto() && estado.etapa === 3) render();
    }).catch(() => {
      if (!atual()) return;
      estado.capacidades = {};
      if (aberto() && estado.etapa === 3) render();
    });
    const erroStatus = { estado: "erro", classe: "warn", rotulo: "Verificação indisponível", titulo: "Não foi possível confirmar a conexão", detalhe: "Tente verificar novamente. Uma conta salva não confirma que o acesso continua válido." };
    const resultados = {};
    try {
      const resposta = await consultar("/conexoes");
      const lista = resposta?.conexoes || resposta;
      if (!Array.isArray(lista)) throw new Error("Lista de conexões inválida");
      await Promise.all(ids.map(async id => {
        const conn = lista.find(item => item?.plataforma === id);
        if (conn?.status !== "conectado") {
          resultados[id] = { estado: "desconectado", classe: "pendente", rotulo: "Aguardando autorização", titulo: "Autorize o acesso com segurança", detalhe: "O login e o consentimento são feitos diretamente na página oficial." };
          return;
        }
        const contaId = id === "meta" ? conn.conta?.conta_anuncios_id || conn.conta_anuncios_id : id === "google" ? conn.conta?.customer_id : conn.conta?.advertiser_id;
        if (!contaId) {
          resultados[id] = { estado: "configurar", classe: "warn", rotulo: "Conta de anúncios pendente", titulo: "Escolha ou crie uma conta de anúncios", detalhe: "Há uma autorização registrada. Selecione a conta para verificar o acesso atual." };
          return;
        }
        try {
          const data = await consultar("/" + id + "/status-completo");
          const itens = [];
          let revisar = false;
          if (data.conectado !== true) throw new Error("Acesso não confirmado");
          if (id === "meta") {
            const conta = data.conta_anuncios;
            if (!conta?.id || String(conta.id).replace(/^act_/, "") !== String(contaId).replace(/^act_/, "")) throw new Error("Conta não confirmada");
            revisar = conta.ativa !== true;
            itens.push(conta.ativa === true ? "Conta de anúncios ativa na Meta." : "A conta precisa de revisão na Meta antes de anunciar.");
            itens.push(conta.pagamento_habilitado === true && !conta.saldo_observacao && !conta.pendencia_pagamento ? "Pagamento identificado; confira eventuais limites no faturamento." : "Pagamento ou saldo ainda precisa de conferência no faturamento.");
            itens.push(data.paginas?.length ? "Página do Facebook encontrada; confira a Página usada na campanha." : "Página do Facebook ainda precisa ser vinculada ou autorizada.");
            itens.push(data.instagram_utilizavel_na_conta === true ? "Instagram disponível para esta conta." : "Para anunciar no Instagram, confira o vínculo e a autorização do perfil.");
            itens.push("Termos de Lead Ads, permissões e WhatsApp: confira conforme o destino dos seus leads e faça um teste de recebimento.");
          } else if (id === "google") {
            if (!data.conta || String(data.customer_id) !== String(contaId)) throw new Error("Conta não confirmada");
            revisar = data.conta.gerenciadora === true || data.conta.status !== "ENABLED";
            itens.push(data.conta.gerenciadora ? "Esta é uma conta de administrador. Selecione uma conta cliente para anunciar." : data.conta.status === "ENABLED" ? "Conta cliente ativa no Google Ads." : "Confira o status da conta no Google Ads antes de anunciar.");
            itens.push(data.pagamento?.disponivel === true && data.pagamento.status === "APPROVED" ? "Configuração de faturamento aprovada pelo Google." : "Pagamento: confirme a configuração diretamente no Google Ads.");
            itens.push("Verificação do anunciante, permissões e formulários: confira antes de publicar e teste a chegada de um lead.");
          } else {
            if (data.pagamento?.disponivel !== true || String(data.advertiser_id) !== String(contaId)) throw new Error("Conta não confirmada");
            const status = data.pagamento.status_conta;
            revisar = status !== "STATUS_ENABLE";
            itens.push(status === "STATUS_ENABLE" ? "Conta de anunciante ativa no TikTok." : "Confira a aprovação e o status da conta no TikTok.");
            itens.push("Pagamento e verificação empresarial: confira no TikTok Ads Manager.");
            itens.push("Permissões e formulários: revise a integração e teste o recebimento de leads.");
          }
          resultados[id] = { estado: revisar ? "configurar" : "ok", classe: revisar ? "warn" : "ok", rotulo: revisar ? "Conexão verificada — revisão necessária" : "Conexão verificada", titulo: "Acesso à conta confirmado", detalhe: "A conta respondeu à consulta. Confira os requisitos abaixo antes de anunciar.", itens, verificado_em: new Date().toISOString() };
        } catch (_) { resultados[id] = { ...erroStatus }; }
      }));
    } catch (_) { ids.forEach(id => { resultados[id] = { ...erroStatus }; }); }
    if (!atual()) return;
    estado.status = resultados;
    estado.carregando = false;
    if (aberto()) render();
    if (!opcoes.silencioso && typeof window.carregarHub === "function") await window.carregarHub();
  }

  async function analisarTelaMonitor() {
    if (!sessaoValida() || !monitor.ativo || monitor.analisando || !monitor.captura) return;
    if (!document.getElementById("assistente_confirmar_imagem")?.checked) {
      alert("Revise a prévia e confirme que ela não contém dados sensíveis antes de enviar."); return;
    }
    const captura = monitor.captura;
    const token = sessaoToken;
    const geracao = monitor.geracao;
    const plataforma = monitor.plataforma;
    const atual = () => sessaoValida(token) && monitor.geracao === geracao && monitor.ativo;
    monitor.analisando = true;
    monitor.erro = "";
    const controller = new AbortController();
    monitor.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    if (aberto()) render();
    try {
      const res = await fetch(API + "/assistente-contas-anuncios/analisar-tela", {
        method: "POST", signal: controller.signal,
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ plataforma, imagem: captura.imagem, imagem_revisada: true, contexto_anterior: contextoMonitor() })
      });
      const data = await res.json().catch(() => ({}));
      if (!atual()) return;
      if (!res.ok) throw new Error(data.error || "A leitura visual não respondeu agora.");
      monitor.resultado = data.analise || null;
      monitor.analises += 1;
      if (monitor.resultado && !monitor.resultado.sensivel) {
        (Array.isArray(monitor.resultado.campos) ? monitor.resultado.campos : []).forEach(campo => {
          const chave = String(campo?.nome || "").trim().toLocaleLowerCase("pt-BR");
          if (chave) monitor.checklist[chave] = { nome: String(campo.nome).slice(0, 100), status: String(campo.status || "atencao") };
        });
        const etapa = String(monitor.resultado.etapa || "").slice(0, 120);
        if (etapa && monitor.historico.at(-1)?.etapa !== etapa) monitor.historico.push({ etapa });
        monitor.historico = monitor.historico.slice(-12);
        estado.acompanhamento[plataforma] = { checklist: Object.values(monitor.checklist).slice(0, 40), historico: monitor.historico, atualizado_em: new Date().toISOString() };
        salvarRascunho();
      }
      // A leitura nunca altera o estado da conexão. Só a consulta à rede o confirma.
    } catch (err) {
      if (atual()) monitor.erro = err?.name === "AbortError" ? "A análise demorou. Capture e revise uma nova imagem para tentar novamente." : err?.message || "Não foi possível analisar a imagem.";
    } finally {
      clearTimeout(timeout);
      if (atual()) { monitor.analisando = false; monitor.controller = null; monitor.captura = null; if (aberto()) render(); }
    }
  }

  window.assistenteAcompanharTela = async function (plataforma) {
    if (!sessaoValida()) return;
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

    const tokenCaptura = sessaoToken;
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

      if (!sessaoValida(tokenCaptura) || !aberto()) { novoStream.getTracks().forEach(track => track.stop()); return; }
      pararMonitorTela(false);
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = novoStream;
      await video.play();
      if (!sessaoValida(tokenCaptura) || !aberto()) { novoStream.getTracks().forEach(track => track.stop()); return; }

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
        checklist: Object.fromEntries((estado.acompanhamento[plataforma]?.checklist || []).map(c => [c.nome.toLocaleLowerCase("pt-BR"), c])),
        historico: estado.acompanhamento[plataforma]?.historico || []
      });
      const faixaCompartilhada = novoStream.getVideoTracks()[0];
      faixaCompartilhada?.addEventListener("ended", () => {
        if (monitor.stream === novoStream) pararMonitorTela(true);
      }, { once: true });
      // A tela permanece local. Cada imagem exige captura, revisão e envio explícitos.
      if (aberto()) render();
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
    if (!monitor.ativo || monitor.analisando) return;
    monitor.captura = null;
    monitor.pausado = !monitor.pausado;
    definirFaixaMonitor(!monitor.pausado);
    if (aberto()) render();
  };

  window.assistenteAnalisarTelaAgora = function () {
    if (!sessaoValida() || !monitor.ativo || monitor.analisando || monitor.pausado) return;
    monitor.captura = capturarTelaMonitor();
    monitor.erro = monitor.captura ? "" : "A imagem ainda não está pronta. Mantenha a janela aberta e tente novamente.";
    if (monitor.captura) { monitor.pausado = true; definirFaixaMonitor(false); }
    render();
  };
  window.assistenteEnviarImagem = analisarTelaMonitor;
  window.assistenteDescartarImagem = function () {
    if (monitor.analisando) return;
    monitor.captura = null;
    render();
  };

  window.assistentePararMonitorTela = function () {
    pararMonitorTela(true);
  };

  window.abrirAssistenteContasAnuncios = function () {
    interagiuDesdeAbertura = false;
    if (!carregarRascunho()) { alert("Entre na sua conta para usar o assistente."); return; }
    const modal = document.getElementById("assistente_contas_modal");
    if (!modal) return;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    render();
    carregarRascunhoServidor();
    carregarStatus({ silencioso: true });
  };

  window.fecharAssistenteContasAnuncios = function () {
    if (sessaoValida()) { capturarFormulario(); salvarRascunho({ imediato: true }); }
    pararMonitorTela(false);
    const modal = document.getElementById("assistente_contas_modal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
  };

  window.assistenteSelecionarPlataforma = function (plataforma) {
    if (!sessaoValida() || !plataformas[plataforma]) return;
    interagiuDesdeAbertura = true;
    estado.plataformas = [plataforma];
    salvarRascunho();
    render();
  };

  window.assistenteSalvarCampoDados = function (el) {
    if (!sessaoValida() || !el?.name) return;
    interagiuDesdeAbertura = true;
    estado.dados[el.name] = el.value;
    delete estado.erros[el.name];
    el.setAttribute("aria-invalid", "false");
    const erroCampo = document.getElementById("assistente_erro_" + el.name);
    if (erroCampo) erroCampo.textContent = "";
    salvarRascunho();
  };

  window.assistenteIrParaEtapa = function (etapa) {
    if (!sessaoValida()) return;
    interagiuDesdeAbertura = true;
    capturarFormulario();
    if (etapa === 2 && !estado.plataformas.length) {
      alert("Selecione ao menos uma plataforma.");
      return;
    }
    if (etapa === 3) {
      estado.erros = validarDadosAssistente(estado.dados);
      if (Object.keys(estado.erros).length) {
        estado.etapa = 2;
        salvarRascunho();
        render();
        document.getElementById("assistente_campo_" + Object.keys(estado.erros)[0])?.focus();
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
    if (plataforma === "meta") window.abrirPassoMetaConta?.();
    else if (plataforma === "google") window.abrirPassoGoogleConta?.();
    else if (plataforma === "tiktok") window.abrirPassoTikTokConta?.();
  };

  window.assistenteCriarContaGoogle = async function (btn) {
    if (!sessaoValida() || criandoGoogle) return;
    capturarFormulario();
    if (Object.keys(validarDadosAssistente(estado.dados)).length) { window.assistenteIrParaEtapa(3); return; }
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
    criandoGoogle = true;
    const token = sessaoToken;
    const textoOriginal = btn?.textContent || "Criar conta automaticamente";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Criando conta...";
    }
    try {
      if (!await persistirRascunhoServidor()) throw new Error("Não foi possível salvar os dados. Tente novamente antes de criar a conta.");
      if (!sessaoValida(token)) return;
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
      if (!sessaoValida(token)) return;
      if (!res.ok) throw new Error(data.error || "O Google Ads não autorizou a criação da conta.");
      alert(data.vinculo_pendente ? `${data.aviso}\nID: ${data.customer_id}` : `Conta Google Ads selecionada.\nID: ${data.customer_id}\n\n${data.aviso || "Confira pagamento e verificações no Google Ads."}`);
      await carregarStatus();
    } catch (err) {
      if (sessaoValida(token)) alert(err?.message || "Não foi possível criar a conta do Google Ads.");
    } finally {
      if (sessaoValida(token)) {
        criandoGoogle = false;
        if (aberto() && estado.etapa === 3) render();
      }
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
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && aberto() && estado.etapa === 3) {
      carregarStatus({ silencioso: true });
    }
  });
  window.assistenteLimparSessao = function () {
    if (salvamentoTimer) clearTimeout(salvamentoTimer);
    pararMonitorTela(false);
    statusSequencia += 1;
    try { if (chaveRascunho) localStorage.removeItem(chaveRascunho); localStorage.removeItem(STORAGE_LEGADO); } catch (_) {}
    sessaoToken = null;
    chaveRascunho = null;
    estado = { etapa: 1, plataformas: ["meta"], dados: {}, acompanhamento: {}, erros: {}, status: {}, capacidades: {}, carregando: false, salvamento: "local" };
    const modal = document.getElementById("assistente_contas_modal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
  };
  window.addEventListener("storage", event => { if (event.key === "token") window.assistenteLimparSessao(); });
  window.addEventListener("beforeunload", () => pararMonitorTela(false));
})();
