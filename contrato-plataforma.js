// Contrato de utilização da plataforma.
//  - Configurações → Contrato: o usuário lê, imprime e aceita (rotas /contrato).
//  - Admin → Financeiro dos Usuários → Gerenciar: o super admin responde como o usuário é
//    cobrado (valor normal/diferenciado/isento, desconto inicial...) e vê o contrato dele.
// O texto do contrato vem pronto do backend (contrato-plataforma.ts): aqui só se mostra.
(function instalarContratoPlataforma() {
  "use strict";

  const esc = (valor) => String(valor ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  const moeda = (valor) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const nomeMes = (competencia) => {
    const [ano, mes] = String(competencia || "").split("-").map(Number);
    return ano && mes ? `${MESES[mes - 1]} de ${ano}` : "";
  };

  const dataHora = (valor) => valor
    ? new Date(valor).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  async function requisicao(caminho, opcoes = {}) {
    const res = await fetch(`${API}${caminho}`, {
      ...opcoes,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}`, ...(opcoes.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const erro = new Error(data.error || "Não foi possível concluir esta ação");
      erro.data = data;
      throw erro;
    }
    return data;
  }

  // ---------------------------------------------------------------------------------------
  // Modal com o texto do contrato (usuário e admin)
  // ---------------------------------------------------------------------------------------

  let modalDados = null;

  function htmlContrato(contrato) {
    return `
      <h3 class="contrato-doc-titulo">${esc(contrato.titulo)}</h3>
      <p class="contrato-doc-versao">Versão ${esc(contrato.versao)} · código ${esc(String(contrato.hash || "").slice(0, 12))}</p>
      ${(contrato.secoes || []).map(secao => `
        <section class="contrato-doc-secao">
          <h4>${esc(secao.titulo)}</h4>
          ${(secao.paragrafos || []).map(p => `<p>${esc(p)}</p>`).join("")}
        </section>
      `).join("")}
    `;
  }

  function statusAceite(dados) {
    if (dados.aceito_vigente) {
      return { classe: "ok", texto: `Aceito em ${dataHora(dados.aceite?.aceito_em)}` };
    }
    if ((dados.contrato?.pendencias || []).length) {
      return { classe: "pendente", texto: "Aguardando informações" };
    }
    if (dados.aceite) return { classe: "alerta", texto: "Condições mudaram — novo aceite pendente" };
    return { classe: "alerta", texto: "Aguardando aceite" };
  }

  function fecharModalContrato() {
    document.getElementById("contrato_modal")?.remove();
    document.removeEventListener("keydown", teclaModalContrato, true);
    modalDados = null;
  }

  function teclaModalContrato(e) {
    if (e.key === "Escape") { e.stopPropagation(); fecharModalContrato(); }
  }

  // modo "usuario": botões de aceite; "admin": só leitura, com o status do aceite.
  function abrirModalContrato(dados, modo) {
    fecharModalContrato();
    modalDados = { ...dados, modo };
    const status = statusAceite(dados);
    const pendencias = dados.contrato?.pendencias || [];
    const podeAceitar = modo === "usuario" && dados.pode_aceitar;

    const modal = document.createElement("div");
    modal.id = "contrato_modal";
    modal.className = "contrato-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "contrato_modal_titulo");
    modal.innerHTML = `
      <div class="contrato-modal-caixa">
        <header class="contrato-modal-topo">
          <div>
            <span class="contrato-modal-sobre">${modo === "admin" ? esc(dados.usuario?.nome || "") : "Conta e preferências"}</span>
            <h2 id="contrato_modal_titulo">Contrato</h2>
            <span class="contrato-status contrato-status-${status.classe}">${esc(status.texto)}</span>
          </div>
          <button type="button" class="contrato-modal-fechar" aria-label="Fechar contrato" onclick="fecharModalContrato()">✕</button>
        </header>
        ${pendencias.length ? `
          <div class="contrato-pendencias" role="status">
            <b>Antes do aceite:</b>
            <ul>${pendencias.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
          </div>` : ""}
        <div class="contrato-doc" tabindex="0">${htmlContrato(dados.contrato)}</div>
        <footer class="contrato-modal-rodape">
          <button type="button" class="contrato-btn contrato-btn-sec" onclick="imprimirContratoPlataforma()">🖨️ Imprimir / salvar PDF</button>
          ${modo === "usuario" && !dados.aceito_vigente ? `
            <button type="button" id="contrato_btn_aceitar" class="contrato-btn" ${podeAceitar ? "" : "disabled"} onclick="aceitarContratoPlataforma()">Li e aceito</button>` : ""}
        </footer>
        ${modo === "usuario" && !dados.aceito_vigente && dados.motivo_bloqueio ? `<p class="contrato-modal-aviso">${esc(dados.motivo_bloqueio)}</p>` : ""}
        ${modo === "admin" && dados.aceite ? `<p class="contrato-modal-aviso">Último aceite: ${esc(dataHora(dados.aceite.aceito_em))}${dados.aceite.ip ? ` · IP ${esc(dados.aceite.ip)}` : ""}${dados.aceito_vigente ? "" : " (de uma versão anterior)"}</p>` : ""}
        <p id="contrato_modal_msg" class="contrato-modal-aviso" role="status" aria-live="polite"></p>
      </div>
    `;
    modal.addEventListener("mousedown", (e) => { if (e.target === modal) fecharModalContrato(); });
    document.body.appendChild(modal);
    document.addEventListener("keydown", teclaModalContrato, true);
    modal.querySelector(".contrato-modal-fechar")?.focus();
  }

  function imprimirContratoPlataforma() {
    if (!modalDados?.contrato) return;
    const janela = window.open("", "_blank");
    if (!janela) { alert("Libere as janelas pop-up para imprimir o contrato."); return; }
    const aceite = modalDados.aceito_vigente && modalDados.aceite
      ? `<p class="aceite">Aceito eletronicamente em ${esc(dataHora(modalDados.aceite.aceito_em))}.</p>`
      : "";
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(modalDados.contrato.titulo)}</title>
      <style>
        body{font-family:Georgia,"Times New Roman",serif;color:#111;max-width:720px;margin:32px auto;padding:0 20px;line-height:1.6;font-size:14px}
        h3{font-size:20px;margin:0 0 4px}.contrato-doc-versao{color:#555;font-size:12px;margin:0 0 20px}
        h4{font-size:15px;margin:18px 0 6px}p{margin:0 0 8px;text-align:justify}.aceite{margin-top:24px;font-weight:bold}
      </style></head><body>${htmlContrato(modalDados.contrato)}${aceite}</body></html>`);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 200);
  }

  // ---------------------------------------------------------------------------------------
  // Configurações → Contrato (usuário)
  // ---------------------------------------------------------------------------------------

  let contratoUsuario = null;

  async function carregarResumoContratoConfiguracoes() {
    const card = document.getElementById("cfg-card-contrato");
    const statusEl = document.getElementById("cfg-contrato-status");
    if (!card || !statusEl || !localStorage.getItem("token")) return;
    try {
      const data = await requisicao("/contrato");
      if (!data.aplicavel) { card.style.display = "none"; contratoUsuario = null; return; }
      contratoUsuario = data;
      card.style.display = "";
      const status = statusAceite(data);
      statusEl.className = `contrato-status contrato-status-${status.classe}`;
      statusEl.textContent = status.texto;
    } catch (err) {
      statusEl.className = "contrato-status contrato-status-pendente";
      statusEl.textContent = "Não foi possível carregar";
    }
  }

  async function abrirContratoPlataforma() {
    const btn = document.getElementById("cfg-contrato-btn");
    if (btn) btn.disabled = true;
    try {
      contratoUsuario = await requisicao("/contrato");
      if (!contratoUsuario.aplicavel) return;
      abrirModalContrato(contratoUsuario, "usuario");
    } catch (err) {
      alert(err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function aceitarContratoPlataforma() {
    if (!contratoUsuario?.contrato) return;
    const btn = document.getElementById("contrato_btn_aceitar");
    const msg = document.getElementById("contrato_modal_msg");
    if (btn) btn.disabled = true;
    try {
      await requisicao("/contrato/aceitar", { method: "POST", body: JSON.stringify({ hash: contratoUsuario.contrato.hash }) });
      contratoUsuario = await requisicao("/contrato");
      abrirModalContrato(contratoUsuario, "usuario");
      const novoMsg = document.getElementById("contrato_modal_msg");
      if (novoMsg) novoMsg.textContent = "✅ Aceite registrado.";
      carregarResumoContratoConfiguracoes();
    } catch (err) {
      if (err.data?.codigo === "CONTRATO_MUDOU") {
        contratoUsuario = await requisicao("/contrato").catch(() => contratoUsuario);
        abrirModalContrato(contratoUsuario, "usuario");
        const novoMsg = document.getElementById("contrato_modal_msg");
        if (novoMsg) novoMsg.textContent = err.message;
        return;
      }
      if (msg) msg.textContent = err.message;
      if (btn) btn.disabled = false;
    }
  }

  // ---------------------------------------------------------------------------------------
  // Admin → Financeiro dos Usuários → Gerenciar: condições do contrato
  // ---------------------------------------------------------------------------------------

  let condicoesAdmin = null;
  let valorSugeridoLancamento = null;

  function opcao(valor, texto, atual) {
    return `<option value="${esc(valor)}" ${valor === atual ? "selected" : ""}>${esc(texto)}</option>`;
  }

  function campoNumero(id, valor, extra = "") {
    const texto = valor === null || valor === undefined ? "" : String(valor);
    return `<input type="number" id="${id}" value="${esc(texto)}" ${extra} />`;
  }

  function rotulo(texto, filho, classe = "") {
    return `<label class="fin-contrato-campo ${classe}"><span>${texto}</span>${filho}</label>`;
  }

  function renderCondicoesContratoAdmin() {
    const box = document.getElementById("financeiro_contrato_condicoes");
    const data = condicoesAdmin;
    if (!box) return;
    if (!data) { box.innerHTML = ""; return; }

    if (!data.aplicavel) {
      box.innerHTML = `<div class="fin-contrato"><p class="fin-contrato-nota">Contas administrativas não têm contrato.</p></div>`;
      return;
    }

    const status = statusAceite(data);
    const topo = `
      <div class="fin-contrato-topo">
        <div>
          <strong>📄 Condições do contrato</strong>
          <span class="contrato-status contrato-status-${status.classe}">${esc(status.texto)}</span>
        </div>
        <button type="button" class="btn-video-anuncio" onclick="verContratoUsuarioAdmin()">Ver contrato</button>
      </div>`;

    if (data.perfil === "cliente_gerenciado") {
      box.innerHTML = `<div class="fin-contrato">${topo}
        <p class="fin-contrato-nota">Conta gerenciada por <b>${esc(data.gerenciado?.gestor_nome || "gestor")}</b>${data.gerenciado?.gestor_email ? ` (${esc(data.gerenciado.gestor_email)})` : ""}: quem cobra é o gestor. O contrato usa os valores que ele salvou no Financeiro do card do cliente.</p>
      </div>`;
      return;
    }

    const gestor = data.perfil === "gestor";
    const c = data.condicoes || {};
    const forma = gestor ? (data.gestor?.forma || "normal") : (c.forma || "normal");
    const descontoTipo = c.desconto_tipo || "nenhum";
    const padrao = data.gestor?.padrao || {};
    const especifica = data.gestor?.especifica || {};

    box.innerHTML = `<div class="fin-contrato">${topo}
      ${data.respondido ? "" : `<p class="fin-contrato-nota fin-contrato-nota-alerta">Ainda não respondido: o contrato deste ${gestor ? "gestor" : "usuário"} fica sem as condições de pagamento até você salvar.</p>`}
      <div class="fin-contrato-grade">
        ${rotulo("Como é a cobrança?", `<select id="fin_ct_forma" onchange="atualizarCamposCondicoesContrato()">
          ${opcao("normal", gestor ? "Valor normal (padrão dos gestores)" : "Valor normal", forma)}
          ${opcao("diferenciado", "Valor diferenciado (negociado)", forma)}
          ${opcao("isento", "Isento (cortesia)", forma)}
        </select>`)}
        ${gestor ? `
          ${rotulo("Mensalidade (R$)", campoNumero("fin_ct_gestor_mensalidade", especifica.mensalidade_brl, `min="0" step="0.01" placeholder="padrão ${esc(moeda(padrao.mensalidade_brl))}"`), "fin-ct-diferenciado")}
          ${rotulo("Por cliente gerenciado (R$/mês)", campoNumero("fin_ct_gestor_por_cliente", especifica.valor_por_cliente_brl, `min="0" step="0.01" placeholder="padrão ${esc(moeda(padrao.valor_por_cliente_brl))}"`), "fin-ct-diferenciado")}
          <p class="fin-contrato-nota fin-ct-normal">Padrão dos gestores: ${esc(moeda(padrao.mensalidade_brl))} de mensalidade + ${esc(moeda(padrao.valor_por_cliente_brl))} por cliente, vencimento dia ${esc(String(padrao.dia_vencimento || 10))} (Cobrança dos Gestores).</p>
        ` : `
          ${rotulo("Mensalidade (R$)", campoNumero("fin_ct_valor", c.valor_mensal, `min="0.01" step="0.01"`), "fin-ct-cobrado")}
          ${rotulo("Dia de vencimento", campoNumero("fin_ct_dia", c.dia_vencimento ?? 10, `min="1" max="28" step="1"`), "fin-ct-cobrado")}
        `}
        ${rotulo("Tem desconto inicial?", `<select id="fin_ct_desconto_tipo" onchange="atualizarCamposCondicoesContrato()">
          ${opcao("nenhum", "Não", descontoTipo)}
          ${opcao("percentual", "Sim, em %", descontoTipo)}
          ${opcao("valor", "Sim, em R$", descontoTipo)}
        </select>`, "fin-ct-cobrado")}
        ${rotulo(`Desconto (<span id="fin_ct_desconto_unidade">${descontoTipo === "valor" ? "R$" : "%"}</span>)`, campoNumero("fin_ct_desconto_valor", c.desconto_valor, `min="0" step="0.01"`), "fin-ct-desconto")}
        ${rotulo("Por quantos meses?", campoNumero("fin_ct_desconto_meses", c.desconto_meses ?? 3, `min="1" max="36" step="1"`), "fin-ct-desconto")}
        ${rotulo(gestor ? "Primeiro mês cobrado (mês de uso)" : "Primeiro mês cobrado", `<input type="month" id="fin_ct_inicio" value="${esc(c.inicio_cobranca || "")}" />`, "fin-ct-cobrado")}
        ${gestor ? "" : rotulo("Chave PIX", `<input type="text" id="fin_ct_pix" value="${esc(data.pix_chave || "")}" placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" />`, "fin-ct-cobrado fin-ct-largo")}
        ${rotulo("Outras condições combinadas (entram no contrato)", `<textarea id="fin_ct_extras" rows="2" maxlength="1000" placeholder="Ex.: setup grátis, valor revisto em 6 meses...">${esc(c.condicoes_extras || "")}</textarea>`, "fin-ct-largo")}
      </div>
      ${gestor ? `<p class="fin-contrato-nota">Vale também para a fatura automática: o desconto entra como item próprio (sobre mensalidade + clientes, sem o VoIP) e nada é gerado antes do primeiro mês cobrado.</p>` : ""}
      <div class="fin-contrato-acoes">
        <button type="button" class="btn" onclick="salvarCondicoesContratoAdmin()">Salvar condições</button>
        <span id="fin_ct_msg" role="status" aria-live="polite"></span>
      </div>
    </div>`;
    atualizarCamposCondicoesContrato();
  }

  function atualizarCamposCondicoesContrato() {
    const box = document.getElementById("financeiro_contrato_condicoes");
    if (!box) return;
    const forma = document.getElementById("fin_ct_forma")?.value || "normal";
    const tipo = document.getElementById("fin_ct_desconto_tipo")?.value || "nenhum";
    const mostrar = (seletor, visivel) => box.querySelectorAll(seletor).forEach(el => { el.style.display = visivel ? "" : "none"; });
    mostrar(".fin-ct-cobrado", forma !== "isento");
    mostrar(".fin-ct-desconto", forma !== "isento" && tipo !== "nenhum");
    mostrar(".fin-ct-diferenciado", forma === "diferenciado");
    mostrar(".fin-ct-normal", forma === "normal");
    const unidade = document.getElementById("fin_ct_desconto_unidade");
    if (unidade) unidade.textContent = tipo === "valor" ? "R$" : "%";
  }

  async function carregarCondicoesContratoAdmin(usuarioId) {
    const box = document.getElementById("financeiro_contrato_condicoes");
    condicoesAdmin = null;
    valorSugeridoLancamento = null;
    if (box) box.innerHTML = `<div class="fin-contrato"><p class="fin-contrato-nota">Carregando condições do contrato...</p></div>`;
    try {
      const data = await requisicao(`/admin/contratos/${Number(usuarioId)}`);
      if (Number(usuarioId) !== Number(_financeiroUsuarioSelecionadoId)) return;
      condicoesAdmin = data;
      renderCondicoesContratoAdmin();
      sugerirValorLancamentoFinanceiro();
    } catch (err) {
      if (box) box.innerHTML = `<div class="fin-contrato"><p class="fin-contrato-nota">${esc(err.message)}</p></div>`;
    }
  }

  async function salvarCondicoesContratoAdmin() {
    if (!condicoesAdmin?.usuario?.id) return;
    const valor = (id) => document.getElementById(id)?.value ?? "";
    const msg = document.getElementById("fin_ct_msg");
    const corpo = {
      forma: valor("fin_ct_forma"),
      valor_mensal: valor("fin_ct_valor"),
      dia_vencimento: valor("fin_ct_dia"),
      desconto_tipo: valor("fin_ct_desconto_tipo"),
      desconto_valor: valor("fin_ct_desconto_valor"),
      desconto_meses: valor("fin_ct_desconto_meses"),
      inicio_cobranca: valor("fin_ct_inicio"),
      pix_chave: valor("fin_ct_pix"),
      condicoes_extras: valor("fin_ct_extras"),
      gestor_mensalidade_brl: valor("fin_ct_gestor_mensalidade"),
      gestor_valor_por_cliente_brl: valor("fin_ct_gestor_por_cliente")
    };
    if (msg) msg.textContent = "Salvando...";
    try {
      const data = await requisicao(`/admin/contratos/${Number(condicoesAdmin.usuario.id)}/condicoes`, { method: "PUT", body: JSON.stringify(corpo) });
      condicoesAdmin = data;
      renderCondicoesContratoAdmin();
      sugerirValorLancamentoFinanceiro(true);
      const novoMsg = document.getElementById("fin_ct_msg");
      if (novoMsg) novoMsg.textContent = data.aceito_vigente
        ? "✅ Salvo. Nada mudou no texto: o aceite continua valendo."
        : "✅ Salvo. O usuário vê o contrato atualizado em Configurações e precisa aceitar.";
      if (typeof carregarFinanceiroUsuariosAdmin === "function") carregarFinanceiroUsuariosAdmin();
      if (data.perfil === "gestor" && typeof carregarCobrancaGestoresAdmin === "function") carregarCobrancaGestoresAdmin();
    } catch (err) {
      if (msg) msg.textContent = `⚠️ ${err.message}`;
    }
  }

  // Ao lançar a cobrança do usuário comum: sugere o valor do contrato para o mês da data
  // escolhida (com desconto inicial). Não troca um valor que o admin digitou.
  function sugerirValorLancamentoFinanceiro(forcar = false) {
    const dica = document.getElementById("financeiro_novo_sugestao");
    const campoValor = document.getElementById("financeiro_novo_valor");
    if (!dica) return;
    dica.textContent = "";
    const data = condicoesAdmin;
    if (!data?.aplicavel || data.perfil !== "usuario" || !data.condicoes) return;

    const mes = String(document.getElementById("financeiro_novo_mes")?.value || "").slice(0, 7);
    const previsao = (data.previsoes || []).find(p => p.mes === mes);
    if (!previsao) return;

    if (previsao.isento) { dica.textContent = "Contrato: usuário isento (cortesia)."; return; }
    if (previsao.antes_do_inicio) { dica.textContent = `Contrato: a cobrança só começa em ${nomeMes(data.condicoes.inicio_cobranca)}.`; return; }

    dica.textContent = previsao.mes_desconto
      ? `Contrato: ${moeda(previsao.total)} (${moeda(previsao.base)} − desconto inicial, mês ${previsao.mes_desconto} de ${data.condicoes.desconto_meses}).`
      : `Contrato: ${moeda(previsao.total)}.`;

    if (campoValor && previsao.total > 0) {
      const atual = campoValor.value;
      if (forcar || !atual || (valorSugeridoLancamento !== null && Number(atual) === valorSugeridoLancamento)) {
        campoValor.value = previsao.total.toFixed(2);
        valorSugeridoLancamento = previsao.total;
      }
    }
    const pix = document.getElementById("financeiro_novo_pix");
    if (pix && data.pix_chave && (forcar || !pix.value)) pix.value = data.pix_chave;
  }

  function verContratoUsuarioAdmin() {
    if (!condicoesAdmin?.contrato) return;
    abrirModalContrato(condicoesAdmin, "admin");
  }

  window.carregarResumoContratoConfiguracoes = carregarResumoContratoConfiguracoes;
  window.abrirContratoPlataforma = abrirContratoPlataforma;
  window.aceitarContratoPlataforma = aceitarContratoPlataforma;
  window.imprimirContratoPlataforma = imprimirContratoPlataforma;
  window.fecharModalContrato = fecharModalContrato;
  window.carregarCondicoesContratoAdmin = carregarCondicoesContratoAdmin;
  window.atualizarCamposCondicoesContrato = atualizarCamposCondicoesContrato;
  window.salvarCondicoesContratoAdmin = salvarCondicoesContratoAdmin;
  window.sugerirValorLancamentoFinanceiro = sugerirValorLancamentoFinanceiro;
  window.verContratoUsuarioAdmin = verContratoUsuarioAdmin;
})();
