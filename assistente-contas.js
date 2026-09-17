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
      observacao: "Página e Instagram são vinculados depois da autorização."
    },
    google: {
      nome: "Google Ads",
      icone: "🔴",
      descricao: "Conta para Pesquisa, Display, formulários e WhatsApp elegível.",
      observacao: "O Google pode exigir confirmação de identidade e pagamento."
    },
    tiktok: {
      nome: "TikTok Ads",
      icone: "🎵",
      descricao: "Conta de anunciante vinculada ao TikTok Business Center.",
      observacao: "O TikTok pode solicitar verificação empresarial e cobrança."
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

  const esc = (valor) => typeof window.escaparHtml === "function"
    ? window.escaparHtml(String(valor ?? ""))
    : String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

  function aberto() {
    const modal = document.getElementById("assistente_contas_modal");
    return Boolean(modal && modal.style.display !== "none");
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
              </div>
            </div>`;
        }).join("")}
      </div>
      <div class="assistente-contas-aviso">
        As páginas oficiais podem pedir login, aceite de termos, verificação empresarial ou pagamento. Conclua essas confirmações na própria rede e depois clique em “Verificar novamente”.
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
    if (aberto() && estado.etapa === 3) setTimeout(() => carregarStatus({ silencioso: true }), 350);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && aberto() && estado.etapa === 3) carregarStatus({ silencioso: true });
  });
})();
