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
      .gt-recursos-resumo{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 13px}.gt-recurso-status{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border:1px solid #334155;border-radius:999px;background:#101b2d;color:#94a3b8;font-size:10px;font-weight:800}.gt-recurso-status.ativo{border-color:rgba(34,197,94,.34);background:rgba(34,197,94,.08);color:#86efac}.gt-recurso-status.espera{border-color:rgba(245,158,11,.34);background:rgba(245,158,11,.08);color:#fbbf24}.gt-recurso-linha{display:flex;align-items:flex-start;gap:14px;padding:15px 0;border-bottom:1px solid #223149}.gt-recurso-linha:last-of-type{border-bottom:0}.gt-recurso-texto{min-width:0;flex:1}.gt-recurso-texto strong{display:block;color:#f8fafc;font-size:14px}.gt-recurso-texto p{margin:5px 0 0;color:#8494aa;font-size:11px;line-height:1.5}.gt-switch{position:relative;width:48px;height:26px;flex:0 0 48px}.gt-switch input{position:absolute;opacity:0;pointer-events:none}.gt-switch span{position:absolute;inset:0;border:1px solid #475569;border-radius:999px;background:#1e293b;cursor:pointer;transition:.18s}.gt-switch span:after{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;border-radius:50%;background:#94a3b8;transition:.18s}.gt-switch input:checked+span{border-color:#22c55e;background:#15803d}.gt-switch input:checked+span:after{left:25px;background:#fff}.gt-switch input:disabled+span{opacity:.55;cursor:wait}.gt-sem-custo{margin-top:15px;padding:12px 14px;border:1px solid rgba(59,130,246,.24);border-radius:11px;background:rgba(37,99,235,.08);color:#a7c7ff;font-size:11px;line-height:1.55}.gt-sem-custo b{color:#dbeafe}.gt-fin-box{width:min(780px,100%)}.gt-fin-secao{margin-top:16px;padding-top:15px;border-top:1px solid #26364d}.gt-fin-secao h4{margin:0 0 5px;color:#fff}.gt-fin-secao>p{margin:0 0 12px;color:#8090a7;font-size:11px;line-height:1.45}.gt-fin-box textarea{width:100%;min-height:68px;box-sizing:border-box;border:1px solid #34445d;border-radius:9px;background:#111f33;color:#fff;padding:10px}
      .pc-nav{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.pc-nav-btn{border:1px solid #2a3c55;border-radius:10px;padding:9px 13px;background:#101d31;color:#94a3b8;font-weight:800;cursor:pointer}.pc-nav-btn.ativo{border-color:#3b82f6;background:rgba(37,99,235,.16);color:#dbeafe}.pc-area[hidden]{display:none!important}.pc-whatsapp{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(0,1.7fr);min-height:610px;border:1px solid #20314a;border-radius:16px;overflow:hidden;background:#0b1728}.pc-conversas-coluna{border-right:1px solid #20314a;background:#0d1a2c}.pc-recurso-topo{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px;border-bottom:1px solid #20314a}.pc-recurso-topo h2{margin:0;color:#fff;font-size:17px}.pc-recurso-topo p{margin:4px 0 0;color:#7889a2;font-size:11px}.pc-filtro{margin:0!important;width:auto!important;min-width:145px;border:1px solid #31445f!important;background:#101f34!important;color:#dbeafe!important}.pc-conversas-lista{max-height:545px;overflow:auto}.pc-conversa-item{display:block;width:100%;padding:14px 16px;border:0;border-bottom:1px solid #1c2d43;background:transparent;color:inherit;text-align:left;cursor:pointer}.pc-conversa-item:hover,.pc-conversa-item.ativo{background:#13233a}.pc-conversa-linha{display:flex;align-items:center;justify-content:space-between;gap:10px}.pc-conversa-item strong{overflow:hidden;color:#edf3fb;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.pc-conversa-item small{color:#71829a;font-size:10px}.pc-conversa-item p{overflow:hidden;margin:7px 0 0;color:#91a1b6;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.pc-nao-lidas{min-width:18px;padding:3px 5px;border-radius:999px;background:#22c55e;color:#052e16;font-size:9px;font-weight:900;text-align:center}.pc-chat{display:flex;min-width:0;flex-direction:column}.pc-chat-cabecalho{min-height:72px}.pc-chat-acoes{display:flex;gap:7px;flex-wrap:wrap}.pc-chat-acoes button{border:1px solid #334155;border-radius:8px;padding:7px 9px;background:#142238;color:#cbd5e1;font-size:10px;cursor:pointer}.pc-mensagens{display:flex;min-height:420px;max-height:470px;flex:1;flex-direction:column;gap:9px;overflow:auto;padding:18px;background:radial-gradient(circle at 100% 0,rgba(37,99,235,.08),transparent 35%)}.pc-mensagem{align-self:flex-start;max-width:min(78%,620px);padding:10px 12px;border:1px solid #2b3d57;border-radius:5px 13px 13px 13px;background:#14233a;color:#e2e8f0;font-size:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.pc-mensagem.saida{align-self:flex-end;border-color:rgba(34,197,94,.25);border-radius:13px 5px 13px 13px;background:#123329}.pc-mensagem small{display:block;margin-top:5px;color:#728198;font-size:9px;text-align:right}.pc-compose{display:flex;gap:9px;padding:13px;border-top:1px solid #20314a}.pc-compose textarea{min-height:44px;max-height:120px;flex:1;resize:vertical;margin:0!important;border:1px solid #31445f!important;background:#101f34!important;color:#fff!important}.pc-compose button{border:0;border-radius:10px;padding:0 17px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-weight:850;cursor:pointer}.pc-compose button:disabled,.pc-compose textarea:disabled{opacity:.5;cursor:not-allowed}.pc-aviso-janela{padding:8px 13px;border-top:1px solid rgba(245,158,11,.2);background:rgba(245,158,11,.07);color:#fbbf24;font-size:10px}.pc-voip-grade{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:16px}.pc-voip-estado{display:grid;place-items:center;min-height:260px;text-align:center}.pc-voip-icone{display:grid;place-items:center;width:68px;height:68px;margin:0 auto 15px;border:1px solid rgba(59,130,246,.3);border-radius:22px;background:rgba(37,99,235,.12);font-size:30px}.pc-voip-estado h2{margin:0 0 8px;color:#fff}.pc-voip-estado p{max-width:470px;margin:0 auto;color:#91a1b6;line-height:1.55}.pc-sem-cobranca{display:inline-block;margin-top:14px;padding:7px 10px;border:1px solid rgba(34,197,94,.28);border-radius:999px;background:rgba(34,197,94,.08);color:#86efac;font-size:10px;font-weight:850}.pc-discador{margin-top:16px}.pc-discador input{margin:0 0 9px!important;background:#0e1b2d!important;color:#dbeafe!important}.pc-discador button{width:100%;border:0;border-radius:10px;padding:11px;background:#334155;color:#94a3b8;font-weight:850}.pc-chamada-item{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #1c2d43}.pc-chamada-item strong{display:block;color:#e8edf7;font-size:12px}.pc-chamada-item span{display:block;margin-top:4px;color:#77889f;font-size:10px}.pc-chamada-item b{color:#a5b4fc;font-size:10px}.pc-fin-resumo{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:16px}.pc-fin-total{border-color:rgba(34,197,94,.28);background:linear-gradient(145deg,rgba(21,128,61,.18),rgba(10,21,38,.98))}.pc-fin-itens{margin-top:7px}.pc-fin-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid #1c2d43}.pc-fin-item strong{display:block;color:#e8edf7;font-size:13px}.pc-fin-item span{display:block;margin-top:4px;color:#77889f;font-size:10px}.pc-fin-item b{color:#fff;font-size:13px}.pc-fin-tag{display:inline-block!important;width:max-content;padding:3px 6px;border:1px solid #334155;border-radius:999px;color:#94a3b8!important}.pc-fin-tag.ativo{border-color:rgba(34,197,94,.3);color:#86efac!important}.pc-fin-alerta{margin-top:14px;padding:13px;border:1px solid rgba(245,158,11,.22);border-radius:11px;background:rgba(245,158,11,.07);color:#fcd34d;font-size:11px;line-height:1.55}.pc-fin-custos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.pc-fin-custo{padding:10px;border:1px solid #26374f;border-radius:9px;background:#0d1a2b;color:#91a1b6;font-size:10px}@media(max-width:820px){.pc-whatsapp,.pc-voip-grade{grid-template-columns:1fr}.pc-conversas-coluna{border-right:0;border-bottom:1px solid #20314a}.pc-conversas-lista{max-height:280px}.pc-mensagens{min-height:360px}.pc-recurso-topo{align-items:flex-start;flex-direction:column}.pc-fin-resumo,.pc-fin-custos{grid-template-columns:1fr}}
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
      </div>
      <div id="gt_modal_financeiro" class="gt-modal" onclick="if(event.target===this) fecharModalGestor('gt_modal_financeiro')">
        <div class="gt-modal-box gt-fin-box">
          <div class="gt-modal-topo"><div><h3>Financeiro do corretor</h3><p id="gt_fin_cliente" class="gt-ajuda" style="margin-top:4px"></p></div><button class="gt-fechar" onclick="fecharModalGestor('gt_modal_financeiro')">✕</button></div>
          <input id="gt_fin_id" type="hidden">
          <div class="gt-form-grid"><div class="gt-campo"><label>Nome do plano</label><input id="gt_fin_plano_nome"></div><div class="gt-campo"><label>Mensalidade do plano (R$)</label><input id="gt_fin_plano_valor" type="number" min="0" step="0.01"></div><div class="gt-campo"><label>Dia do vencimento</label><input id="gt_fin_vencimento" type="number" min="1" max="28"></div><div class="gt-campo"><label>Adicional mensal do VoIP (R$)</label><input id="gt_fin_voip" type="number" min="0" step="0.01"></div></div>
          <div class="gt-fin-secao"><h4>Possíveis cobranças adicionais</h4><p>Deixe em zero enquanto não houver cobrança. O valor só aparecerá no total do corretor quando o recurso correspondente estiver ativo.</p><div class="gt-form-grid"><div class="gt-campo"><label>WhatsApp oficial (R$/mês)</label><input id="gt_fin_whatsapp" type="number" min="0" step="0.01"></div><div class="gt-campo"><label>Créditos extras de IA (R$/mês)</label><input id="gt_fin_ia" type="number" min="0" step="0.01"></div><div class="gt-campo"><label>Gravação e transcrição (R$/mês)</label><input id="gt_fin_gravacao" type="number" min="0" step="0.01"></div><div class="gt-campo"><label>Outro adicional</label><input id="gt_fin_outro_descricao" placeholder="Descrição do serviço"></div><div class="gt-campo"><label>Valor do outro adicional (R$/mês)</label><input id="gt_fin_outro_valor" type="number" min="0" step="0.01"></div><div class="gt-campo gt-campo-largo"><label>Observações para o corretor</label><textarea id="gt_fin_observacoes" maxlength="500"></textarea></div></div></div>
          <div class="gt-sem-custo"><b>Importante:</b> a verba dos anúncios não está incluída na mensalidade de gestão. Minutos de ligações e taxas cobradas pelos provedores podem variar conforme o uso.</div>
          <div class="gt-modal-acoes"><button class="gt-btn gt-btn-secondary" onclick="fecharModalGestor('gt_modal_financeiro')">Cancelar</button><button id="gt_fin_salvar" class="gt-btn gt-btn-primary" onclick="salvarFinanceiroClienteGerenciado()">Salvar valores</button></div>
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

  function valorCampoFinanceiro(id) {
    const valor = Number(document.getElementById(id)?.value || 0);
    return Number.isFinite(valor) && valor >= 0 ? Number(valor.toFixed(2)) : 0;
  }

  window.abrirFinanceiroClienteGerenciado = async function abrirFinanceiroClienteGerenciado(id) {
    injetarModalGestor();
    const cliente = clientePorId(id);
    if (!cliente) return alert("Não foi possível localizar este corretor.");
    document.getElementById("gt_fin_id").value = String(id);
    document.getElementById("gt_fin_cliente").textContent = cliente.nome_completo || cliente.email || "Corretor";
    document.getElementById("gt_modal_financeiro").classList.add("aberto");
    const botao = document.getElementById("gt_fin_salvar");
    if (botao) { botao.disabled = true; botao.textContent = "Carregando..."; }
    try {
      const data = await requisicaoGestor(`/gestor/clientes/${id}/financeiro`);
      const config = data.configuracao || {};
      const preencher = (campo, valor) => { const el = document.getElementById(campo); if (el) el.value = valor ?? ""; };
      preencher("gt_fin_plano_nome", config.plano_nome || "Plano Gestão de Tráfego");
      preencher("gt_fin_plano_valor", Number(config.valor_plano_mensal ?? 800).toFixed(2));
      preencher("gt_fin_vencimento", Number(config.dia_vencimento || 10));
      preencher("gt_fin_voip", Number(config.valor_voip_mensal || 0).toFixed(2));
      preencher("gt_fin_whatsapp", Number(config.valor_whatsapp_mensal || 0).toFixed(2));
      preencher("gt_fin_ia", Number(config.valor_ia_extra_mensal || 0).toFixed(2));
      preencher("gt_fin_gravacao", Number(config.valor_gravacao_mensal || 0).toFixed(2));
      preencher("gt_fin_outro_descricao", config.outros_descricao || "");
      preencher("gt_fin_outro_valor", Number(config.valor_outros_mensal || 0).toFixed(2));
      preencher("gt_fin_observacoes", config.observacoes || "");
    } catch (err) {
      fecharModalGestor("gt_modal_financeiro");
      alert(err.message);
    } finally {
      if (botao) { botao.disabled = false; botao.textContent = "Salvar valores"; }
    }
  };

  window.salvarFinanceiroClienteGerenciado = async function salvarFinanceiroClienteGerenciado() {
    const id = Number(document.getElementById("gt_fin_id")?.value);
    const botao = document.getElementById("gt_fin_salvar");
    if (!id) return;
    const payload = {
      plano_nome: document.getElementById("gt_fin_plano_nome")?.value?.trim(),
      valor_plano_mensal: valorCampoFinanceiro("gt_fin_plano_valor"),
      dia_vencimento: Number(document.getElementById("gt_fin_vencimento")?.value || 10),
      valor_voip_mensal: valorCampoFinanceiro("gt_fin_voip"),
      valor_whatsapp_mensal: valorCampoFinanceiro("gt_fin_whatsapp"),
      valor_ia_extra_mensal: valorCampoFinanceiro("gt_fin_ia"),
      valor_gravacao_mensal: valorCampoFinanceiro("gt_fin_gravacao"),
      outros_descricao: document.getElementById("gt_fin_outro_descricao")?.value?.trim(),
      valor_outros_mensal: valorCampoFinanceiro("gt_fin_outro_valor"),
      observacoes: document.getElementById("gt_fin_observacoes")?.value?.trim()
    };
    if (botao) { botao.disabled = true; botao.textContent = "Salvando..."; }
    try {
      await requisicaoGestor(`/gestor/clientes/${id}/financeiro`, { method: "PATCH", body: JSON.stringify(payload) });
      fecharModalGestor("gt_modal_financeiro");
      alert("Valores financeiros atualizados. O corretor verá o novo resumo no painel dele.");
    } catch (err) {
      alert(err.message);
    } finally {
      if (botao) { botao.disabled = false; botao.textContent = "Salvar valores"; }
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
      botaoAcesso?.insertAdjacentHTML("afterend", `<button class="gt-btn gt-btn-secondary" onclick="abrirRecursosClienteGerenciado(${id})">Configurar recursos</button><button class="gt-btn gt-btn-secondary" onclick="abrirFinanceiroClienteGerenciado(${id})">Financeiro</button>`);
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

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function labelStatusFinanceiro(status) {
    return ({ aguardando_pagamento: "Aguardando pagamento", comprovante_enviado: "Em conferência", pago: "Pago", ativo: "Ativo", desativado: "Desativado", aguardando_configuracao: "Aguardando ativação", nao_cobrado: "Não cobrado" })[String(status || "").toLowerCase()] || String(status || "—").replace(/_/g, " ");
  }

  window.navegarPainelCliente = function navegarPainelCliente(area) {
    document.querySelectorAll(".pc-area").forEach((elemento) => { elemento.hidden = elemento.id !== `pc_area_${area}`; });
    document.querySelectorAll(".pc-nav-btn").forEach((botao) => botao.classList.toggle("ativo", botao.dataset.area === area));
    if (area === "whatsapp") carregarConversas(true);
    if (area === "voip") carregarVoip();
    if (area === "financeiro") carregarFinanceiroPainel();
  };

  function montarRecursosPainel(perfil = {}) {
    const whatsappAtivo = perfil.atendimento_whatsapp_habilitado === true;
    const voipAtivo = perfil.voip_habilitado === true;
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
    nav.innerHTML = `<button class="pc-nav-btn ativo" data-area="visao" onclick="navegarPainelCliente('visao')">Visão geral</button>${whatsappAtivo ? '<button class="pc-nav-btn" data-area="whatsapp" onclick="navegarPainelCliente(\'whatsapp\')">💬 Conversas</button>' : ""}${voipAtivo ? '<button class="pc-nav-btn" data-area="voip" onclick="navegarPainelCliente(\'voip\')">📞 Ligações</button>' : ""}<button class="pc-nav-btn" data-area="financeiro" onclick="navegarPainelCliente('financeiro')">💳 Financeiro</button>`;
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
      ultimo = area;
    }

    const financeiro = document.createElement("section");
    financeiro.id = "pc_area_financeiro";
    financeiro.className = "pc-area";
    financeiro.hidden = true;
    financeiro.innerHTML = '<div id="pc_financeiro_conteudo"><div class="pc-vazio">Carregando informações financeiras...</div></div>';
    ultimo.insertAdjacentElement("afterend", financeiro);
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

  async function carregarFinanceiroPainel() {
    const container = document.getElementById("pc_financeiro_conteudo");
    if (!container) return;
    container.innerHTML = '<div class="pc-vazio">Carregando informações financeiras...</div>';
    try {
      const data = await requisicaoPainel("/painel-cliente/financeiro");
      const plano = data.plano || {};
      const voip = data.voip || {};
      const itens = Array.isArray(data.itens) ? data.itens : [];
      const historico = Array.isArray(data.historico) ? data.historico : [];
      const custos = Array.isArray(data.custos_variaveis) ? data.custos_variaveis : [];
      const linhas = itens.map((item) => {
        const valorDepois = item.status !== "ativo" && Number(item.valor_apos_ativacao || 0) > 0
          ? `<span>Após ativação: ${formatarMoeda(item.valor_apos_ativacao)}/mês</span>`
          : "";
        return `<div class="pc-fin-item"><div><strong>${htmlSeguro(item.descricao)}</strong><span class="pc-fin-tag ${item.status === "ativo" ? "ativo" : ""}">${htmlSeguro(labelStatusFinanceiro(item.status))}</span>${valorDepois}</div><b>${formatarMoeda(item.status === "ativo" ? item.valor : 0)}</b></div>`;
      }).join("");
      const historicoHtml = historico.length ? historico.map((item) => `<div class="pc-fin-item"><div><strong>${new Date(item.mes_referencia).toLocaleDateString("pt-BR", { month:"long", year:"numeric", timeZone:"UTC" })}</strong><span class="pc-fin-tag ${item.status === "pago" ? "ativo" : ""}">${htmlSeguro(labelStatusFinanceiro(item.status))}</span></div><b>${formatarMoeda(item.valor)}</b></div>`).join("") : '<div class="pc-vazio">Nenhuma cobrança mensal emitida até o momento.</div>';
      container.innerHTML = `<div class="pc-fin-resumo"><article class="pc-card"><span>Plano atual</span><h2 style="margin-top:7px">${htmlSeguro(plano.nome || "Plano Gestão de Tráfego")}</h2><p class="pc-card-sub">Vencimento todo dia ${Number(plano.dia_vencimento || 10)}</p><strong style="font-size:25px;color:#fff">${formatarMoeda(plano.valor_mensal)}<small style="font-size:11px;color:#8190a7">/mês</small></strong></article><article class="pc-card"><span>Telefonia VoIP</span><h2 style="margin-top:7px">${voip.ativo ? htmlSeguro(voip.numero || "Ativa") : htmlSeguro(labelStatusFinanceiro(voip.status))}</h2><p class="pc-card-sub">${voip.ativo ? "Número ativo nesta conta" : "Sem cobrança enquanto não houver número ativo"}</p><strong style="font-size:25px;color:#fff">${formatarMoeda(voip.valor_mensal)}<small style="font-size:11px;color:#8190a7">/mês</small></strong></article><article class="pc-card pc-fin-total"><span>Total mensal atual</span><h2 style="margin-top:7px">Serviços ativos</h2><p class="pc-card-sub">Não inclui a verba investida nos anúncios</p><strong style="font-size:28px;color:#86efac">${formatarMoeda(data.total_mensal)}<small style="font-size:11px;color:#8190a7">/mês</small></strong></article></div><div class="pc-voip-grade"><article class="pc-card"><h2>Composição da mensalidade</h2><p class="pc-card-sub">Somente serviços ativos entram no total.</p><div class="pc-fin-itens">${linhas}</div><div class="pc-fin-alerta">💡 ${htmlSeguro(data.investimento_anuncios?.mensagem || "A verba de anúncios é paga separadamente às plataformas.")}</div>${data.observacoes ? `<div class="pc-fin-alerta" style="border-color:rgba(59,130,246,.22);background:rgba(37,99,235,.07);color:#bfdbfe">${htmlSeguro(data.observacoes)}</div>` : ""}</article><article class="pc-card"><h2>Histórico de cobranças</h2><p class="pc-card-sub">Últimos lançamentos registrados na plataforma.</p>${historicoHtml}</article></div><article class="pc-card" style="margin-top:16px"><h2>Custos que podem existir futuramente</h2><p class="pc-card-sub">Eles não são cobrados automaticamente. Só aparecem no total depois de contratados ou utilizados.</p><div class="pc-fin-custos">${custos.map((item) => `<div class="pc-fin-custo">${htmlSeguro(item)}</div>`).join("")}</div></article>`;
    } catch (err) {
      container.innerHTML = `<div class="pc-vazio">${htmlSeguro(err.message)}</div>`;
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
        if (voltar && id && !barra.querySelector(".gt-configurar-financeiro")) voltar.insertAdjacentHTML("beforebegin", `<button class="gt-btn gt-btn-secondary gt-configurar-financeiro" onclick="abrirFinanceiroClienteGerenciado(${id})">Financeiro</button>`);
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
