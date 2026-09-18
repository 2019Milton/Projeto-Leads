(function instalarRecursosDoCorretor() {
  "use strict";

  let conversaSelecionadaId = null;
  let atualizacaoConversas = null;

  const htmlSeguro = (valor) => escaparHtml(String(valor ?? ""));

  function statusRecurso(cliente = {}, recurso) {
    if (recurso === "whatsapp") {
      if (!cliente.atendimento_whatsapp_habilitado) return { classe: "", texto: "WhatsApp desativado" };
      if (cliente.atendimento_whatsapp_status === "ativo") return { classe: "ativo", texto: "WhatsApp ativo" };
      return { classe: "espera", texto: "WhatsApp aguardando conexão" };
    }
    if (!cliente.voip_habilitado) return { classe: "", texto: "Telefonia desativada" };
    if (cliente.voip_status === "ativo") return { classe: "ativo", texto: "Telefonia ativa" };
    return { classe: "espera", texto: "Telefonia aguardando operadora" };
  }

  function injetarEstilos() {
    if (document.getElementById("recursos-corretor-style")) return;
    const estilo = document.createElement("style");
    estilo.id = "recursos-corretor-style";
    estilo.textContent = `
      .gt-recursos-resumo{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 13px}.gt-recurso-status{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border:1px solid #334155;border-radius:999px;background:#101b2d;color:#94a3b8;font-size:10px;font-weight:800}.gt-recurso-status.ativo{border-color:rgba(34,197,94,.34);background:rgba(34,197,94,.08);color:#86efac}.gt-recurso-status.espera{border-color:rgba(245,158,11,.34);background:rgba(245,158,11,.08);color:#fbbf24}.gt-recurso-linha{display:flex;align-items:flex-start;gap:14px;padding:15px 0;border-bottom:1px solid #223149}.gt-recurso-linha:last-of-type{border-bottom:0}.gt-recurso-texto{min-width:0;flex:1}.gt-recurso-texto strong{display:block;color:#f8fafc;font-size:14px}.gt-recurso-texto p{margin:5px 0 0;color:#8494aa;font-size:11px;line-height:1.5}.gt-switch{position:relative;width:48px;height:26px;flex:0 0 48px}.gt-switch input{position:absolute;opacity:0;pointer-events:none}.gt-switch span{position:absolute;inset:0;border:1px solid #475569;border-radius:999px;background:#1e293b;cursor:pointer;transition:.18s}.gt-switch span:after{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;border-radius:50%;background:#94a3b8;transition:.18s}.gt-switch input:checked+span{border-color:#22c55e;background:#15803d}.gt-switch input:checked+span:after{left:25px;background:#fff}.gt-switch input:disabled+span{opacity:.55;cursor:wait}.gt-sem-custo{margin-top:15px;padding:12px 14px;border:1px solid rgba(59,130,246,.24);border-radius:11px;background:rgba(37,99,235,.08);color:#a7c7ff;font-size:11px;line-height:1.55}.gt-sem-custo b{color:#dbeafe}
      .pc-nav{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.pc-nav-btn{border:1px solid #2a3c55;border-radius:10px;padding:9px 13px;background:#101d31;color:#94a3b8;font-weight:800;cursor:pointer}.pc-nav-btn.ativo{border-color:#3b82f6;background:rgba(37,99,235,.16);color:#dbeafe}.pc-area[hidden]{display:none!important}.pc-whatsapp{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(0,1.7fr);min-height:610px;border:1px solid #20314a;border-radius:16px;overflow:hidden;background:#0b1728}.pc-conversas-coluna{border-right:1px solid #20314a;background:#0d1a2c}.pc-recurso-topo{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px;border-bottom:1px solid #20314a}.pc-recurso-topo h2{margin:0;color:#fff;font-size:17px}.pc-recurso-topo p{margin:4px 0 0;color:#7889a2;font-size:11px}.pc-filtro{margin:0!important;width:auto!important;min-width:145px;border:1px solid #31445f!important;background:#101f34!important;color:#dbeafe!important}.pc-conversas-lista{max-height:545px;overflow:auto}.pc-conversa-item{display:block;width:100%;padding:14px 16px;border:0;border-bottom:1px solid #1c2d43;background:transparent;color:inherit;text-align:left;cursor:pointer}.pc-conversa-item:hover,.pc-conversa-item.ativo{background:#13233a}.pc-conversa-linha{display:flex;align-items:center;justify-content:space-between;gap:10px}.pc-conversa-item strong{overflow:hidden;color:#edf3fb;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.pc-conversa-item small{color:#71829a;font-size:10px}.pc-conversa-item p{overflow:hidden;margin:7px 0 0;color:#91a1b6;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.pc-nao-lidas{min-width:18px;padding:3px 5px;border-radius:999px;background:#22c55e;color:#052e16;font-size:9px;font-weight:900;text-align:center}.pc-chat{display:flex;min-width:0;flex-direction:column}.pc-chat-cabecalho{min-height:72px}.pc-chat-acoes{display:flex;gap:7px;flex-wrap:wrap}.pc-chat-acoes button{border:1px solid #334155;border-radius:8px;padding:7px 9px;background:#142238;color:#cbd5e1;font-size:10px;cursor:pointer}.pc-mensagens{display:flex;min-height:420px;max-height:470px;flex:1;flex-direction:column;gap:9px;overflow:auto;padding:18px;background:radial-gradient(circle at 100% 0,rgba(37,99,235,.08),transparent 35%)}.pc-mensagem{align-self:flex-start;max-width:min(78%,620px);padding:10px 12px;border:1px solid #2b3d57;border-radius:5px 13px 13px 13px;background:#14233a;color:#e2e8f0;font-size:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.pc-mensagem.saida{align-self:flex-end;border-color:rgba(34,197,94,.25);border-radius:13px 5px 13px 13px;background:#123329}.pc-mensagem small{display:block;margin-top:5px;color:#728198;font-size:9px;text-align:right}.pc-compose{display:flex;gap:9px;padding:13px;border-top:1px solid #20314a}.pc-compose textarea{min-height:44px;max-height:120px;flex:1;resize:vertical;margin:0!important;border:1px solid #31445f!important;background:#101f34!important;color:#fff!important}.pc-compose button{border:0;border-radius:10px;padding:0 17px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-weight:850;cursor:pointer}.pc-compose button:disabled,.pc-compose textarea:disabled{opacity:.5;cursor:not-allowed}.pc-aviso-janela{padding:8px 13px;border-top:1px solid rgba(245,158,11,.2);background:rgba(245,158,11,.07);color:#fbbf24;font-size:10px}.pc-voip-grade{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:16px}.pc-voip-estado{display:grid;place-items:center;min-height:260px;text-align:center}.pc-voip-icone{display:grid;place-items:center;width:68px;height:68px;margin:0 auto 15px;border:1px solid rgba(59,130,246,.3);border-radius:22px;background:rgba(37,99,235,.12);font-size:30px}.pc-voip-estado h2{margin:0 0 8px;color:#fff}.pc-voip-estado p{max-width:470px;margin:0 auto;color:#91a1b6;line-height:1.55}.pc-sem-cobranca{display:inline-block;margin-top:14px;padding:7px 10px;border:1px solid rgba(34,197,94,.28);border-radius:999px;background:rgba(34,197,94,.08);color:#86efac;font-size:10px;font-weight:850}.pc-discador{margin-top:16px}.pc-discador input{margin:0 0 9px!important;background:#0e1b2d!important;color:#dbeafe!important}.pc-discador button{width:100%;border:0;border-radius:10px;padding:11px;background:#334155;color:#94a3b8;font-weight:850}.pc-chamada-item{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #1c2d43}.pc-chamada-item strong{display:block;color:#e8edf7;font-size:12px}.pc-chamada-item span{display:block;margin-top:4px;color:#77889f;font-size:10px}.pc-chamada-item b{color:#a5b4fc;font-size:10px}@media(max-width:820px){.pc-whatsapp,.pc-voip-grade{grid-template-columns:1fr}.pc-conversas-coluna{border-right:0;border-bottom:1px solid #20314a}.pc-conversas-lista{max-height:280px}.pc-mensagens{min-height:360px}.pc-recurso-topo{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(estilo);
  }

  function injetarModalGestor() {
    if (document.getElementById("gt_modal_recursos")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div id="gt_modal_recursos" class="gt-modal" onclick="if(event.target===this) fecharModalGestor('gt_modal_recursos')">
        <div class="gt-modal-box">
          <div class="gt-modal-topo"><div><h3>Recursos do painel do corretor</h3><p id="gt_recursos_cliente" class="gt-ajuda" style="margin-top:4px"></p></div><button class="gt-fechar" onclick="fecharModalGestor('gt_modal_recursos')">✕</button></div>
          <input id="gt_recursos_id" type="hidden">
          <div class="gt-recurso-linha"><div class="gt-recurso-texto"><strong>💬 Conversas do WhatsApp</strong><p>Permite ao corretor visualizar e responder, no painel dele, as conversas do WhatsApp Business já conectado à conta.</p></div><label class="gt-switch" title="Habilitar conversas"><input id="gt_recurso_whatsapp" type="checkbox" onchange="alternarRecursoClienteGerenciado('atendimento_whatsapp_habilitado', this.checked, this)"><span></span></label></div>
          <div class="gt-recurso-linha"><div class="gt-recurso-texto"><strong>📞 Telefonia VoIP</strong><p>Libera a área de ligações. Ela ficará aguardando configuração até você decidir contratar um provedor e um número para esse corretor.</p></div><label class="gt-switch" title="Habilitar telefonia"><input id="gt_recurso_voip" type="checkbox" onchange="alternarRecursoClienteGerenciado('voip_habilitado', this.checked, this)"><span></span></label></div>
          <div id="gt_recursos_status" class="gt-recursos-resumo" style="margin-top:15px"></div>
          <div class="gt-sem-custo"><b>Sem cobrança agora:</b> habilitar estas opções apenas prepara e exibe os módulos. Nenhum número, operadora ou pacote de ligações será contratado automaticamente. Custos externos só começam depois de uma configuração futura e consciente.</div>
          <div class="gt-modal-acoes"><button class="gt-btn gt-btn-primary" onclick="fecharModalGestor('gt_modal_recursos')">Concluir</button></div>
        </div>
      </div>`);
  }

  function clientePorId(id) {
    try { return clienteGerenciadoPorId(Number(id)); }
    catch (_) { return null; }
  }

  function atualizarModal(cliente = {}) {
    const nome = cliente.nome_completo || `${cliente.nome || ""} ${cliente.sobrenome || ""}`.trim() || cliente.email || "Corretor";
    document.getElementById("gt_recursos_id").value = String(cliente.id || "");
    document.getElementById("gt_recursos_cliente").textContent = nome;
    document.getElementById("gt_recurso_whatsapp").checked = cliente.atendimento_whatsapp_habilitado === true;
    document.getElementById("gt_recurso_voip").checked = cliente.voip_habilitado === true;
    const whatsapp = statusRecurso(cliente, "whatsapp");
    const voip = statusRecurso(cliente, "voip");
    document.getElementById("gt_recursos_status").innerHTML = `<span class="gt-recurso-status ${whatsapp.classe}">${htmlSeguro(whatsapp.texto)}</span><span class="gt-recurso-status ${voip.classe}">${htmlSeguro(voip.texto)}</span>`;
  }

  window.abrirRecursosClienteGerenciado = function abrirRecursosClienteGerenciado(id) {
    injetarModalGestor();
    const cliente = clientePorId(id);
    if (!cliente) return alert("Não foi possível localizar este corretor.");
    atualizarModal(cliente);
    document.getElementById("gt_modal_recursos").classList.add("aberto");
  };

  window.alternarRecursoClienteGerenciado = async function alternarRecursoClienteGerenciado(campo, habilitar, controle) {
    const id = Number(document.getElementById("gt_recursos_id")?.value);
    if (!id || !["atendimento_whatsapp_habilitado", "voip_habilitado"].includes(campo)) return;
    if (controle) controle.disabled = true;
    try {
      const data = await requisicaoGestor(`/gestor/clientes/${id}`, { method: "PATCH", body: JSON.stringify({ [campo]: Boolean(habilitar) }) });
      if (Array.isArray(clientesGerenciados)) {
        const indice = clientesGerenciados.findIndex((item) => Number(item.id) === id);
        if (indice >= 0) clientesGerenciados[indice] = { ...clientesGerenciados[indice], ...data.cliente };
      }
      const contexto = clientePorId(id);
      if (contexto && localStorage.getItem("gestor_token_original")) {
        const atualizado = { ...contexto, ...data.cliente };
        localStorage.setItem("gestor_cliente_contexto", JSON.stringify(atualizado));
      }
      await carregarClientesGerenciados(true);
      const cliente = clientePorId(id);
      if (cliente) atualizarModal(cliente);
    } catch (err) {
      if (controle) controle.checked = !habilitar;
      alert(err.message);
    } finally {
      if (controle) controle.disabled = false;
    }
  };

  function enriquecerCardsGestor() {
    document.querySelectorAll("#gt_lista_clientes .gt-card").forEach((card) => {
      if (card.dataset.recursosProntos === "1") return;
      const botaoAcesso = card.querySelector('[onclick^="acessarContaGerenciada"]');
      const id = Number(String(botaoAcesso?.getAttribute("onclick") || "").match(/\d+/)?.[0]);
      const cliente = clientePorId(id);
      if (!cliente) return;
      const whatsapp = statusRecurso(cliente, "whatsapp");
      const voip = statusRecurso(cliente, "voip");
      const conexoes = card.querySelector(".gt-conexoes");
      conexoes?.insertAdjacentHTML("afterend", `<div class="gt-recursos-resumo"><span class="gt-recurso-status ${whatsapp.classe}">${htmlSeguro(whatsapp.texto)}</span><span class="gt-recurso-status ${voip.classe}">${htmlSeguro(voip.texto)}</span></div>`);
      const acoes = card.querySelector(".gt-acoes");
      botaoAcesso?.insertAdjacentHTML("afterend", `<button class="gt-btn gt-btn-secondary" onclick="abrirRecursosClienteGerenciado(${id})">Configurar recursos</button>`);
      card.dataset.recursosProntos = "1";
    });
  }

  async function requisicaoPainel(caminho, opcoes = {}) {
    const res = await fetch(`${API}${caminho}`, {
      ...opcoes,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + obterTokenSessaoAtual(), ...(opcoes.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Não foi possível concluir esta ação");
    return data;
  }

  function formatarTelefone(valor) {
    const digitos = String(valor || "").replace(/\D/g, "");
    const nacional = digitos.startsWith("55") ? digitos.slice(2) : digitos;
    if (nacional.length === 11) return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 7)}-${nacional.slice(7)}`;
    if (nacional.length === 10) return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 6)}-${nacional.slice(6)}`;
    return valor || "Telefone não informado";
  }

  function labelStatusConversa(status) {
    return ({ bot: "Bot atendendo", aguardando_resposta: "Aguardando resposta", humano: "Atendimento humano", encerrada: "Encerrada" })[String(status || "").toLowerCase()] || "Em atendimento";
  }

  window.navegarPainelCliente = function navegarPainelCliente(area) {
    document.querySelectorAll(".pc-area").forEach((elemento) => { elemento.hidden = elemento.id !== `pc_area_${area}`; });
    document.querySelectorAll(".pc-nav-btn").forEach((botao) => botao.classList.toggle("ativo", botao.dataset.area === area));
    if (area === "whatsapp") carregarConversas(true);
    if (area === "voip") carregarVoip();
  };

  function montarRecursosPainel(perfil = {}) {
    const whatsappAtivo = perfil.atendimento_whatsapp_habilitado === true;
    const voipAtivo = perfil.voip_habilitado === true;
    if (!whatsappAtivo && !voipAtivo) return;
    const app = document.getElementById("app");
    const boasVindas = app?.querySelector(".pc-boas-vindas");
    const kpis = app?.querySelector(".pc-kpis");
    const grid = app?.querySelector(".pc-grid");
    if (!app || !boasVindas || !kpis || !grid || document.getElementById("pc_area_visao")) return;

    const selo = app.querySelector(".pc-leitura");
    if (selo && whatsappAtivo) selo.textContent = "Acompanhamento + atendimento";
    const nav = document.createElement("nav");
    nav.className = "pc-nav";
    nav.setAttribute("aria-label", "Áreas do painel");
    nav.innerHTML = `<button class="pc-nav-btn ativo" data-area="visao" onclick="navegarPainelCliente('visao')">Visão geral</button>${whatsappAtivo ? '<button class="pc-nav-btn" data-area="whatsapp" onclick="navegarPainelCliente(\'whatsapp\')">💬 Conversas</button>' : ""}${voipAtivo ? '<button class="pc-nav-btn" data-area="voip" onclick="navegarPainelCliente(\'voip\')">📞 Ligações</button>' : ""}`;
    boasVindas.insertAdjacentElement("afterend", nav);

    const visao = document.createElement("section");
    visao.id = "pc_area_visao";
    visao.className = "pc-area";
    nav.insertAdjacentElement("afterend", visao);
    visao.append(kpis, grid);

    let ultimo = visao;
    if (whatsappAtivo) {
      const area = document.createElement("section");
      area.id = "pc_area_whatsapp";
      area.className = "pc-area";
      area.hidden = true;
      area.innerHTML = `<div class="pc-whatsapp"><aside class="pc-conversas-coluna"><div class="pc-recurso-topo"><div><h2>Conversas</h2><p>WhatsApp Business conectado</p></div><select id="pc_whatsapp_filtro" class="pc-filtro" onchange="carregarConversasPainelCliente()"><option value="">Todas</option><option value="humano">Atendimento humano</option><option value="bot">Bot atendendo</option><option value="aguardando_resposta">Aguardando resposta</option><option value="encerrada">Encerradas</option></select></div><div id="pc_conversas_lista" class="pc-conversas-lista"><div class="pc-vazio">Carregando conversas...</div></div></aside><div class="pc-chat"><div id="pc_chat_cabecalho" class="pc-recurso-topo pc-chat-cabecalho"><div><h2>Selecione uma conversa</h2><p>O histórico aparecerá aqui.</p></div></div><div id="pc_mensagens" class="pc-mensagens"><div class="pc-vazio">Escolha um contato para iniciar o atendimento.</div></div><div id="pc_aviso_janela" class="pc-aviso-janela" hidden></div><div class="pc-compose"><textarea id="pc_mensagem_texto" placeholder="Digite sua mensagem" disabled></textarea><button id="pc_enviar_mensagem" onclick="enviarMensagemPainelCliente()" disabled>Enviar</button></div></div></div>`;
      ultimo.insertAdjacentElement("afterend", area);
      ultimo = area;
      carregarConversas();
      clearInterval(atualizacaoConversas);
      atualizacaoConversas = setInterval(() => carregarConversas(true), 15000);
    }

    if (voipAtivo) {
      const area = document.createElement("section");
      area.id = "pc_area_voip";
      area.className = "pc-area";
      area.hidden = true;
      area.innerHTML = `<div class="pc-voip-grade"><article id="pc_voip_config" class="pc-card pc-voip-estado"><div><div class="pc-voip-icone">📞</div><h2>Preparando telefonia</h2><p>Consultando a configuração desta conta...</p></div></article><article class="pc-card"><h2>Histórico de ligações</h2><p class="pc-card-sub">As chamadas aparecerão aqui quando a telefonia estiver ativa.</p><div id="pc_voip_chamadas"><div class="pc-vazio">Carregando histórico...</div></div></article></div>`;
      ultimo.insertAdjacentElement("afterend", area);
    }
  }

  async function carregarConversas(silencioso = false) {
    const lista = document.getElementById("pc_conversas_lista");
    if (!lista) return;
    if (!silencioso) lista.innerHTML = '<div class="pc-vazio">Carregando conversas...</div>';
    try {
      const filtro = document.getElementById("pc_whatsapp_filtro")?.value || "";
      const data = await requisicaoPainel(`/painel-cliente/whatsapp/conversas${filtro ? `?status=${encodeURIComponent(filtro)}` : ""}`);
      const conversas = Array.isArray(data.conversas) ? data.conversas : [];
      lista.innerHTML = conversas.length ? conversas.map((conversa) => {
        const nome = conversa.lead_nome || formatarTelefone(conversa.telefone_cliente);
        const naoLidas = Number(conversa.nao_lidas || 0);
        return `<button class="pc-conversa-item ${Number(conversa.id) === Number(conversaSelecionadaId) ? "ativo" : ""}" onclick="abrirConversaPainelCliente(${Number(conversa.id)})"><div class="pc-conversa-linha"><strong>${htmlSeguro(nome)}</strong>${naoLidas ? `<span class="pc-nao-lidas">${naoLidas}</span>` : `<small>${formatarDataPainelCliente(conversa.ultima_mensagem_criada_em || conversa.atualizado_em, true)}</small>`}</div><p>${htmlSeguro(conversa.ultima_mensagem || labelStatusConversa(conversa.status))}</p></button>`;
      }).join("") : '<div class="pc-vazio">Nenhuma conversa encontrada.</div>';
    } catch (err) {
      if (!silencioso) lista.innerHTML = `<div class="pc-vazio">${htmlSeguro(err.message)}</div>`;
    }
  }

  window.carregarConversasPainelCliente = () => carregarConversas(false);

  window.abrirConversaPainelCliente = async function abrirConversaPainelCliente(id) {
    conversaSelecionadaId = Number(id);
    const mensagensEl = document.getElementById("pc_mensagens");
    if (mensagensEl) mensagensEl.innerHTML = '<div class="pc-vazio">Carregando histórico...</div>';
    try {
      const data = await requisicaoPainel(`/painel-cliente/whatsapp/conversas/${conversaSelecionadaId}/mensagens`);
      const conversa = data.conversa || {};
      const nome = conversa.lead_nome || formatarTelefone(conversa.telefone_cliente);
      const cabecalho = document.getElementById("pc_chat_cabecalho");
      if (cabecalho) cabecalho.innerHTML = `<div><h2>${htmlSeguro(nome)}</h2><p>${htmlSeguro(formatarTelefone(conversa.telefone_cliente))} · ${htmlSeguro(labelStatusConversa(conversa.status))}${conversa.campanha_nome ? ` · ${htmlSeguro(conversa.campanha_nome)}` : ""}</p></div><div class="pc-chat-acoes"><button onclick="atualizarStatusConversaPainel('humano')">Assumir</button><button onclick="atualizarStatusConversaPainel('bot')">Devolver ao bot</button><button onclick="atualizarStatusConversaPainel('encerrada')">Encerrar</button></div>`;
      const mensagens = Array.isArray(data.mensagens) ? data.mensagens : [];
      if (mensagensEl) {
        mensagensEl.innerHTML = mensagens.length ? mensagens.map((item) => `<div class="pc-mensagem ${item.direcao === "entrada" ? "" : "saida"}">${htmlSeguro(item.conteudo)}<small>${item.direcao === "entrada" ? "Contato" : "Você"} · ${formatarDataPainelCliente(item.criado_em, true)}</small></div>`).join("") : '<div class="pc-vazio">Ainda não há mensagens nesta conversa.</div>';
        mensagensEl.scrollTop = mensagensEl.scrollHeight;
      }
      const texto = document.getElementById("pc_mensagem_texto");
      const enviar = document.getElementById("pc_enviar_mensagem");
      const podeResponder = conversa.janela_atendimento_aberta === true && conversa.status !== "encerrada";
      if (texto) texto.disabled = !podeResponder;
      if (enviar) enviar.disabled = !podeResponder;
      const aviso = document.getElementById("pc_aviso_janela");
      if (aviso) {
        aviso.hidden = podeResponder;
        aviso.textContent = conversa.status === "encerrada" ? "Conversa encerrada. Assuma o atendimento para reabrir." : "A janela de 24 horas terminou. Para retomar o contato será necessário um modelo aprovado pela Meta.";
      }
      carregarConversas(true);
    } catch (err) {
      if (mensagensEl) mensagensEl.innerHTML = `<div class="pc-vazio">${htmlSeguro(err.message)}</div>`;
    }
  };

  window.enviarMensagemPainelCliente = async function enviarMensagemPainelCliente() {
    const texto = document.getElementById("pc_mensagem_texto");
    const botao = document.getElementById("pc_enviar_mensagem");
    const mensagem = String(texto?.value || "").trim();
    if (!conversaSelecionadaId || !mensagem) return;
    if (botao) botao.disabled = true;
    try {
      await requisicaoPainel(`/painel-cliente/whatsapp/conversas/${conversaSelecionadaId}/mensagens`, { method: "POST", body: JSON.stringify({ mensagem }) });
      if (texto) texto.value = "";
      await window.abrirConversaPainelCliente(conversaSelecionadaId);
    } catch (err) {
      alert(err.message);
    } finally {
      if (botao) botao.disabled = false;
    }
  };

  window.atualizarStatusConversaPainel = async function atualizarStatusConversaPainel(status) {
    if (!conversaSelecionadaId) return;
    try {
      await requisicaoPainel(`/painel-cliente/whatsapp/conversas/${conversaSelecionadaId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await window.abrirConversaPainelCliente(conversaSelecionadaId);
    } catch (err) {
      alert(err.message);
    }
  };

  async function carregarVoip() {
    const configEl = document.getElementById("pc_voip_config");
    const chamadasEl = document.getElementById("pc_voip_chamadas");
    if (!configEl || !chamadasEl) return;
    try {
      const [config, historico] = await Promise.all([
        requisicaoPainel("/painel-cliente/voip/configuracao"),
        requisicaoPainel("/painel-cliente/voip/chamadas")
      ]);
      const ativo = config.status === "ativo";
      configEl.innerHTML = `<div><div class="pc-voip-icone">${ativo ? "☎️" : "📞"}</div><h2>${ativo ? "Telefonia pronta" : "Aguardando configuração"}</h2><p>${htmlSeguro(config.mensagem || "A telefonia ainda não foi configurada.")}</p><span class="pc-sem-cobranca">${config.gera_cobranca ? "Serviço ativo" : "Sem cobrança de telefonia agora"}</span><div class="pc-discador"><input placeholder="Número para ligar" ${ativo ? "" : "disabled"}><button disabled>${ativo ? "Ligação será liberada na integração final" : "Aguardando operadora e número"}</button></div></div>`;
      const chamadas = Array.isArray(historico.chamadas) ? historico.chamadas : [];
      chamadasEl.innerHTML = chamadas.length ? chamadas.map((item) => `<div class="pc-chamada-item"><div><strong>${htmlSeguro(item.lead_nome || formatarTelefone(item.telefone))}</strong><span>${formatarDataPainelCliente(item.iniciada_em, true)} · ${Number(item.duracao_segundos || 0)}s</span></div><b>${htmlSeguro(item.status || "Registrada")}</b></div>`).join("") : '<div class="pc-vazio">Nenhuma ligação realizada. Não há consumo nem cobrança.</div>';
    } catch (err) {
      configEl.innerHTML = `<div class="pc-vazio">${htmlSeguro(err.message)}</div>`;
    }
  }

  function instalarExtensoes() {
    injetarEstilos();
    injetarModalGestor();

    if (typeof renderizarClientesGerenciados === "function") {
      const original = renderizarClientesGerenciados;
      renderizarClientesGerenciados = function renderizarClientesComRecursos(...args) {
        const retorno = original.apply(this, args);
        enriquecerCardsGestor();
        return retorno;
      };
    }

    if (typeof injetarBarraContextoGestor === "function") {
      const original = injetarBarraContextoGestor;
      injetarBarraContextoGestor = function injetarBarraComRecursos(...args) {
        const retorno = original.apply(this, args);
        const barra = document.getElementById("gt_barra_contexto");
        const voltar = barra?.querySelector('[onclick="voltarParaGestaoClientes()"]');
        let contexto = null;
        try { contexto = JSON.parse(localStorage.getItem("gestor_cliente_contexto") || "null"); } catch (_) {}
        const id = Number(contexto?.id || args[0]?.id);
        if (voltar && id && !barra.querySelector(".gt-configurar-recursos")) voltar.insertAdjacentHTML("beforebegin", `<button class="gt-btn gt-btn-secondary gt-configurar-recursos" onclick="abrirRecursosClienteGerenciado(${id})">Configurar recursos</button>`);
        return retorno;
      };
    }

    if (typeof iniciarPainelCliente === "function") {
      const original = iniciarPainelCliente;
      iniciarPainelCliente = async function iniciarPainelComRecursos(perfil = {}) {
        clearInterval(atualizacaoConversas);
        conversaSelecionadaId = null;
        const retorno = await original.call(this, perfil);
        montarRecursosPainel(perfil);
        return retorno;
      };
    }

    if (typeof logout === "function") {
      const original = logout;
      logout = function logoutComRecursos(...args) {
        clearInterval(atualizacaoConversas);
        return original.apply(this, args);
      };
    }
  }

  instalarExtensoes();
})();
