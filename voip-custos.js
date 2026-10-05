(function instalarPainelFinanceiroVoip() {
  "use strict";

  let intervaloCustosVoip = null;
  let dadosCustosVoip = null;
  let navegacaoPatcheada = false;

  const esc = (valor) => {
    try { return escaparHtml(String(valor ?? "")); }
    catch (_) {
      const div = document.createElement("div");
      div.textContent = String(valor ?? "");
      return div.innerHTML;
    }
  };

  const moeda = (valor) =>
    Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const mesAtual = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  function tipoAtual() {
    try { return usuarioLogado?.tipo || ""; }
    catch (_) { return ""; }
  }

  function ehSuperAdmin() {
    return ["super_admin", "master"].includes(tipoAtual());
  }

  function ehGestorTrafego() {
    return tipoAtual() === "trafego_pago";
  }

  function podeVerPainel() {
    return ehSuperAdmin() || ehGestorTrafego();
  }

  function tokenAtual() {
    if (ehGestorTrafego() && typeof obterTokenGestor === "function") {
      return obterTokenGestor();
    }
    return localStorage.getItem("token");
  }

  async function apiVoip(caminho, opcoes = {}) {
    const headers = {
      "Authorization": "Bearer " + tokenAtual(),
      ...(opcoes.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(opcoes.headers || {})
    };
    const res = await fetch(`${API}${caminho}`, { ...opcoes, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Não foi possível carregar os custos do VoIP.");
    return data;
  }

  function injetarCss() {
    if (document.getElementById("voip-custos-style")) return;
    const style = document.createElement("style");
    style.id = "voip-custos-style";
    style.textContent = `
      .vc-painel{display:none;box-sizing:border-box;width:100%;padding:22px;min-height:calc(100vh - 56px);color:#e5e7eb}
      .vc-painel.secao-visivel{display:block!important;flex:0 0 auto!important}
      .vc-topo{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:16px}
      .vc-topo h1{margin:0;color:#fff;font-size:24px}.vc-topo p{margin:5px 0 0;color:#91a0b6;font-size:12px;line-height:1.5}
      .vc-filtros{display:flex;align-items:end;gap:8px;flex-wrap:wrap}.vc-filtros label{color:#91a0b6;font-size:10px;font-weight:800}
      .vc-filtros input{display:block;margin-top:5px;padding:9px 10px;border:1px solid #334155;border-radius:9px;background:#0e1b2e;color:#fff}
      .vc-btn{border:1px solid #334155;border-radius:9px;padding:9px 12px;background:#142238;color:#dbeafe;font-size:11px;font-weight:800;cursor:pointer}
      .vc-btn:hover{background:#1d3150}.vc-btn-primary{border-color:#2563eb;background:#2563eb;color:#fff}.vc-btn-primary:hover{background:#1d4ed8}
      .vc-aviso{margin-bottom:16px;padding:13px 15px;border:1px solid rgba(59,130,246,.28);border-radius:12px;background:rgba(37,99,235,.08);color:#bfdbfe;font-size:11px;line-height:1.55}
      .vc-aviso b{color:#fff}.vc-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:16px}
      .vc-kpi{padding:16px;border:1px solid #22354f;border-radius:14px;background:linear-gradient(145deg,#101f34,#0a1728)}
      .vc-kpi span{display:block;color:#8091aa;font-size:10px}.vc-kpi strong{display:block;margin-top:7px;color:#fff;font-size:22px}.vc-kpi small{display:block;margin-top:5px;color:#64748b;font-size:9px}
      .vc-card{border:1px solid #20314a;border-radius:14px;background:#0b1728;overflow:hidden}
      .vc-card-topo{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #20314a}
      .vc-card-topo h2{margin:0;color:#fff;font-size:15px}.vc-card-topo span{color:#7f91aa;font-size:10px}
      .vc-tabela-wrap{overflow:auto}.vc-tabela{width:100%;border-collapse:collapse;min-width:900px}.vc-tabela th,.vc-tabela td{padding:11px 12px;border-bottom:1px solid #192a40;text-align:left;font-size:10px;white-space:nowrap}
      .vc-tabela th{color:#7f91aa;background:#0d1a2c;font-weight:850;text-transform:uppercase;letter-spacing:.03em}.vc-tabela td{color:#cbd5e1}
      .vc-tabela td strong{color:#f8fafc}.vc-tabela tr:hover td{background:#101f34}
      .vc-status{display:inline-flex;padding:4px 7px;border:1px solid #334155;border-radius:999px;color:#94a3b8;font-size:9px;font-weight:800}
      .vc-status.ativo{border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.08);color:#86efac}.vc-status.estimado{border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.08);color:#fbbf24}
      .vc-vazio{padding:28px;text-align:center;color:#71829a;font-size:11px}
      .vc-modal{display:none;position:fixed;inset:0;z-index:10050;align-items:center;justify-content:center;padding:18px;background:rgba(2,8,23,.78);backdrop-filter:blur(5px)}
      .vc-modal.aberto{display:flex}.vc-modal-box{width:min(980px,96vw);max-height:88vh;overflow:auto;border:1px solid #2b3c55;border-radius:16px;background:#0b1728;box-shadow:0 22px 70px rgba(0,0,0,.45)}
      .vc-modal-topo{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #20314a}.vc-modal-topo h3{margin:0;color:#fff}.vc-modal-topo p{margin:4px 0 0;color:#8192aa;font-size:10px}
      .vc-modal-corpo{padding:16px 18px}.vc-fechar{border:0;background:transparent;color:#94a3b8;font-size:20px;cursor:pointer}
      .vc-resumo{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.vc-mini{padding:12px;border:1px solid #22354f;border-radius:11px;background:#0e1b2e}.vc-mini span{display:block;color:#7c8da5;font-size:9px}.vc-mini b{display:block;margin-top:5px;color:#fff;font-size:15px}
      .vc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.vc-form-grid label{color:#94a3b8;font-size:10px}.vc-form-grid input,.vc-form-grid textarea{width:100%;box-sizing:border-box;margin-top:5px;padding:10px;border:1px solid #34445d;border-radius:9px;background:#101f33;color:#fff}.vc-form-grid textarea{min-height:80px;resize:vertical}.vc-form-largo{grid-column:1/-1}
      .vc-modal-acoes{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
      @media(max-width:1000px){.vc-kpis{grid-template-columns:repeat(2,1fr)}.vc-resumo{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:600px){.vc-painel{padding:14px}.vc-kpis{grid-template-columns:1fr}.vc-form-grid{grid-template-columns:1fr}.vc-form-largo{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function injetarEstrutura() {
    if (!document.getElementById("painel_voip_custos")) {
      const painel = document.createElement("section");
      painel.id = "painel_voip_custos";
      painel.className = "vc-painel";
      painel.style.display = "none";
      painel.innerHTML = `
        <div class="vc-topo">
          <div><h1>📞 Custos VoIP</h1><p id="vc_subtitulo">Consumo de telefonia separado da mensalidade da plataforma.</p></div>
          <div class="vc-filtros">
            <label>Mês<input id="vc_mes" type="month" value="${mesAtual()}" onchange="carregarPainelCustosVoip(true)"></label>
            <button class="vc-btn" onclick="carregarPainelCustosVoip(true)">↻ Atualizar</button>
            <button id="vc_sync_btn" class="vc-btn vc-btn-primary" onclick="sincronizarCustosVoipAdmin()" style="display:none">Sincronizar Twilio</button>
          </div>
        </div>
        <div class="vc-aviso"><b>VoIP é um custo separado.</b> O total abaixo não faz parte da mensalidade da Plataforma de Leads. Chamadas recém-encerradas podem aparecer como estimadas por alguns instantes e são substituídas pelo preço final retornado pela Twilio.</div>
        <div id="vc_kpis" class="vc-kpis"></div>
        <div class="vc-card">
          <div class="vc-card-topo"><div><h2 id="vc_titulo_tabela">Custos por corretor</h2><span id="vc_cotacao"></span></div><span id="vc_atualizado"></span></div>
          <div id="vc_tabela_wrap" class="vc-tabela-wrap"><div class="vc-vazio">Carregando custos...</div></div>
        </div>
      `;

      const destino = document.getElementById("app-content-area") || document.getElementById("app");
      destino?.appendChild(painel);
    }

    if (!document.getElementById("vc_modal_detalhes")) {
      document.body.insertAdjacentHTML("beforeend", `
        <div id="vc_modal_detalhes" class="vc-modal" onclick="if(event.target===this) fecharModalCustosVoip('vc_modal_detalhes')"><div class="vc-modal-box"><div class="vc-modal-topo"><div><h3 id="vc_detalhes_titulo">Detalhes VoIP</h3><p id="vc_detalhes_sub"></p></div><button class="vc-fechar" onclick="fecharModalCustosVoip('vc_modal_detalhes')">✕</button></div><div id="vc_detalhes_corpo" class="vc-modal-corpo"></div></div></div>
        <div id="vc_modal_config" class="vc-modal" onclick="if(event.target===this) fecharModalCustosVoip('vc_modal_config')"><div class="vc-modal-box" style="width:min(620px,96vw)"><div class="vc-modal-topo"><div><h3>Configurar cobrança VoIP</h3><p id="vc_config_cliente"></p></div><button class="vc-fechar" onclick="fecharModalCustosVoip('vc_modal_config')">✕</button></div><div class="vc-modal-corpo"><input id="vc_config_id" type="hidden"><div class="vc-form-grid"><label>Margem sobre o custo da Twilio (%)<input id="vc_config_margem" type="number" min="0" max="500" step="0.01"></label><label>Taxa fixa mensal adicional (R$)<input id="vc_config_taxa" type="number" min="0" step="0.01"></label><label class="vc-form-largo"><input id="vc_config_numero" type="checkbox" checked style="width:auto;margin-right:7px">Repassar também o custo mensal do número</label><label class="vc-form-largo">Observações<textarea id="vc_config_obs" maxlength="500"></textarea></label></div><div class="vc-modal-acoes"><button class="vc-btn" onclick="fecharModalCustosVoip('vc_modal_config')">Cancelar</button><button class="vc-btn vc-btn-primary" onclick="salvarConfigCobrancaVoip()">Salvar cobrança</button></div></div></div></div>
      `);
    }
  }

  function garantirSecaoSidebar() {
    try {
      SIDEBAR_SECOES["voip-custos"] = {
        ids: ["painel_voip_custos"],
        icone: "📞",
        label: "Custos VoIP",
        condicional: true
      };
    } catch (_) {}

    const menu = document.querySelector("#sidebar-nav .sidebar-menu");
    if (menu && !document.getElementById("sidebar-item-voip-custos")) {
      const separador = menu.querySelector(".sidebar-separador");
      const btn = document.createElement("button");
      btn.className = "sidebar-item sidebar-item-cond";
      btn.id = "sidebar-item-voip-custos";
      btn.dataset.secao = "voip-custos";
      btn.dataset.tooltip = "Custos VoIP";
      btn.style.display = "none";
      btn.onclick = () => navegarPara("voip-custos");
      btn.innerHTML = '<span class="sidebar-icone">📞</span><span class="sidebar-label">Custos VoIP</span>';
      menu.insertBefore(btn, separador || menu.firstChild);
    }
  }

  function patchNavegacao() {
    if (navegacaoPatcheada || typeof navegarPara !== "function") return;
    const original = navegarPara;
    navegarPara = function navegarComCustosVoip(secao) {
      const retorno = original.apply(this, arguments);
      if (secao === "voip-custos") {
        carregarPainelCustosVoip(false);
        clearInterval(intervaloCustosVoip);
        intervaloCustosVoip = setInterval(() => {
          try {
            if (typeof secaoAtiva !== "undefined" && secaoAtiva === "voip-custos") {
              carregarPainelCustosVoip(false, true);
            }
          } catch (_) {}
        }, 20000);
      } else {
        clearInterval(intervaloCustosVoip);
        intervaloCustosVoip = null;
      }
      return retorno;
    };
    navegacaoPatcheada = true;
  }

  function linhaStatus(item) {
    if (item?.voip?.status === "ativo") return '<span class="vc-status ativo">Linha ativa</span>';
    if (item?.voip?.habilitado) return '<span class="vc-status">Preparado</span>';
    return '<span class="vc-status">Desativado</span>';
  }

  function renderizarPainel(data) {
    dadosCustosVoip = data;
    const totais = data.totais || {};
    const usuarios = Array.isArray(data.usuarios) ? data.usuarios : [];
    const superAdmin = ehSuperAdmin();

    document.getElementById("vc_sync_btn").style.display = superAdmin ? "" : "none";
    document.getElementById("vc_subtitulo").textContent = superAdmin
      ? "Visão global: custo da Twilio, repasse aos corretores e margem de cada conta."
      : "Acompanhe o consumo VoIP dos corretores que você gerencia.";
    document.getElementById("vc_titulo_tabela").textContent = superAdmin
      ? "Todos os custos por usuário"
      : "Custos dos seus corretores";

    const kpis = [
      ["Linhas no mês", Number(totais.linhas || 0), "Números que geraram custo no período"],
      ["Chamadas", Number(totais.chamadas || 0), "Recebidas + realizadas"],
      ["Minutos", Number(totais.minutos || 0).toLocaleString("pt-BR"), "Consumo acumulado"],
      [superAdmin ? "Custo Twilio" : "VoIP dos clientes", moeda(superAdmin ? totais.custo_provedor_brl : totais.valor_repassado_brl), superAdmin ? "Número + chamadas" : "Valor adicional do mês"],
      [superAdmin ? "Margem" : "Custo separado", superAdmin ? moeda(totais.margem_brl) : "Fora do plano", superAdmin ? "Repasse menos provedor" : "Não entra na mensalidade"]
    ];
    document.getElementById("vc_kpis").innerHTML = kpis.map(([titulo, valor, ajuda]) =>
      `<article class="vc-kpi"><span>${esc(titulo)}</span><strong>${esc(valor)}</strong><small>${esc(ajuda)}</small></article>`
    ).join("");

    document.getElementById("vc_cotacao").textContent =
      `Cotação usada: US$ 1 = R$ ${Number(data.cotacao_usd_brl || 0).toFixed(4).replace(".", ",")}`;
    document.getElementById("vc_atualizado").textContent =
      `Atualizado ${new Date().toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}`;

    if (!usuarios.length) {
      document.getElementById("vc_tabela_wrap").innerHTML = '<div class="vc-vazio">Nenhum corretor com dados VoIP neste período.</div>';
      return;
    }

    const cabecalho = superAdmin
      ? "<th>Gestor</th><th>Corretor</th><th>Número</th><th>Chamadas</th><th>Minutos</th><th>Custo Twilio</th><th>Valor repassado</th><th>Margem</th><th>Status</th><th>Ações</th>"
      : "<th>Corretor</th><th>Número</th><th>Chamadas</th><th>Minutos</th><th>VoIP do mês</th><th>Status</th><th>Ações</th>";

    const linhas = usuarios.map(item => {
      const estimado = Number(item.consumo?.custos_estimados || 0) > 0;
      const statusCusto = estimado
        ? '<span class="vc-status estimado">Parte estimada</span>'
        : linhaStatus(item);
      const detalhes = `<button class="vc-btn" onclick="abrirDetalhesCustosVoip(${Number(item.id)})">Detalhes</button>`;

      if (superAdmin) {
        return `<tr>
          <td>${esc(item.gestor?.nome || "Sem gestor")}</td>
          <td><strong>${esc(item.nome)}</strong><br><small>${esc(item.email || "")}</small></td>
          <td>${esc(item.voip?.numero || "—")}</td>
          <td>${Number(item.consumo?.chamadas || 0)}</td>
          <td>${Number(item.consumo?.minutos || 0).toLocaleString("pt-BR")}</td>
          <td><strong>${moeda(item.custos?.provedor_brl)}</strong></td>
          <td><strong>${moeda(item.custos?.valor_repassado_brl)}</strong></td>
          <td>${moeda(item.custos?.margem_brl)}</td>
          <td>${statusCusto}</td>
          <td style="display:flex;gap:6px">${detalhes}<button class="vc-btn" onclick="abrirConfigCobrancaVoip(${Number(item.id)})">Cobrança</button></td>
        </tr>`;
      }

      return `<tr>
        <td><strong>${esc(item.nome)}</strong><br><small>${esc(item.email || "")}</small></td>
        <td>${esc(item.voip?.numero || "—")}</td>
        <td>${Number(item.consumo?.chamadas || 0)}</td>
        <td>${Number(item.consumo?.minutos || 0).toLocaleString("pt-BR")}</td>
        <td><strong>${moeda(item.custos?.valor_repassado_brl)}</strong></td>
        <td>${statusCusto}</td>
        <td>${detalhes}</td>
      </tr>`;
    }).join("");

    document.getElementById("vc_tabela_wrap").innerHTML =
      `<table class="vc-tabela"><thead><tr>${cabecalho}</tr></thead><tbody>${linhas}</tbody></table>`;
  }

  window.carregarPainelCustosVoip = async function carregarPainelCustosVoip(forcar = false, silencioso = false) {
    if (!podeVerPainel()) return;
    injetarEstrutura();

    const wrap = document.getElementById("vc_tabela_wrap");
    if (!silencioso && (!dadosCustosVoip || forcar) && wrap) {
      wrap.innerHTML = '<div class="vc-vazio">Carregando custos do VoIP...</div>';
    }

    const mes = document.getElementById("vc_mes")?.value || mesAtual();
    const endpoint = ehSuperAdmin()
      ? `/admin/voip/custos?mes=${encodeURIComponent(mes)}`
      : `/gestor/voip/custos?mes=${encodeURIComponent(mes)}`;

    try {
      const data = await apiVoip(endpoint);
      renderizarPainel(data);
    } catch (err) {
      if (wrap) wrap.innerHTML = `<div class="vc-vazio">${esc(err.message)}</div>`;
    }
  };

  window.sincronizarCustosVoipAdmin = async function sincronizarCustosVoipAdmin() {
    if (!ehSuperAdmin()) return;
    const btn = document.getElementById("vc_sync_btn");
    if (btn) { btn.disabled = true; btn.textContent = "Sincronizando..."; }
    try {
      await apiVoip("/admin/voip/custos/sincronizar", { method:"POST", body:"{}" });
      await window.carregarPainelCustosVoip(true);
    } catch (err) {
      alert(err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Sincronizar Twilio"; }
    }
  };

  window.fecharModalCustosVoip = function fecharModalCustosVoip(id) {
    document.getElementById(id)?.classList.remove("aberto");
  };

  window.abrirDetalhesCustosVoip = async function abrirDetalhesCustosVoip(usuarioId) {
    const mes = document.getElementById("vc_mes")?.value || mesAtual();
    const modal = document.getElementById("vc_modal_detalhes");
    const corpo = document.getElementById("vc_detalhes_corpo");
    if (!modal || !corpo) return;

    modal.classList.add("aberto");
    corpo.innerHTML = '<div class="vc-vazio">Carregando ligações...</div>';

    try {
      const endpoint = ehSuperAdmin()
        ? `/admin/voip/custos/usuario/${Number(usuarioId)}?mes=${encodeURIComponent(mes)}`
        : `/gestor/clientes/${Number(usuarioId)}/voip/custos?mes=${encodeURIComponent(mes)}`;
      const data = await apiVoip(endpoint);
      const item = data.resumo;
      if (!item) throw new Error("Não há dados para este corretor.");

      document.getElementById("vc_detalhes_titulo").textContent = item.nome || "Detalhes VoIP";
      document.getElementById("vc_detalhes_sub").textContent =
        `${item.voip?.numero || "Sem número ativo"} · referência ${data.mes}`;

      const chamadas = Array.isArray(item.chamadas) ? item.chamadas : [];
      const tabela = chamadas.length
        ? `<div class="vc-tabela-wrap"><table class="vc-tabela"><thead><tr><th>Data</th><th>Tipo</th><th>Telefone</th><th>Duração</th><th>Custo</th><th>Apuração</th></tr></thead><tbody>${chamadas.map(ch => `<tr><td>${esc(new Date(ch.iniciada_em).toLocaleString("pt-BR"))}</td><td>${ch.direcao === "entrada" ? "Recebida" : "Realizada"}</td><td>${esc(ch.telefone || "—")}</td><td>${Math.ceil(Number(ch.duracao_segundos || 0) / 60)} min</td><td>${moeda(ch.custo_brl)}</td><td>${ch.custo_status === "final" ? '<span class="vc-status ativo">Final Twilio</span>' : '<span class="vc-status estimado">Estimado</span>'}</td></tr>`).join("")}</tbody></table></div>`
        : '<div class="vc-vazio">Nenhuma ligação neste mês.</div>';

      corpo.innerHTML = `
        <div class="vc-resumo">
          <div class="vc-mini"><span>Número / linha</span><b>${moeda(item.custos?.numero_brl)}</b></div>
          <div class="vc-mini"><span>Chamadas</span><b>${moeda(item.custos?.chamadas_brl)}</b></div>
          <div class="vc-mini"><span>${ehSuperAdmin() ? "Custo Twilio" : "Consumo VoIP"}</span><b>${moeda(item.custos?.provedor_brl)}</b></div>
          <div class="vc-mini"><span>Valor do VoIP no mês</span><b>${moeda(item.custos?.valor_repassado_brl)}</b></div>
        </div>
        <div class="vc-aviso"><b>Cobrança separada da plataforma.</b> Este valor não está incluído na mensalidade do plano.</div>
        ${tabela}
      `;
    } catch (err) {
      corpo.innerHTML = `<div class="vc-vazio">${esc(err.message)}</div>`;
    }
  };

  window.abrirConfigCobrancaVoip = async function abrirConfigCobrancaVoip(usuarioId) {
    if (!ehSuperAdmin()) return;
    const modal = document.getElementById("vc_modal_config");
    if (!modal) return;
    modal.classList.add("aberto");

    try {
      const data = await apiVoip(`/admin/voip/faturamento/${Number(usuarioId)}`);
      const cfg = data.configuracao || {};
      const nome = `${data.usuario?.nome || ""} ${data.usuario?.sobrenome || ""}`.trim() || data.usuario?.email || "Corretor";
      document.getElementById("vc_config_cliente").textContent = nome;
      document.getElementById("vc_config_id").value = String(usuarioId);
      document.getElementById("vc_config_margem").value = Number(cfg.margem_percentual || 0).toFixed(2);
      document.getElementById("vc_config_taxa").value = Number(cfg.taxa_fixa_mensal_brl || 0).toFixed(2);
      document.getElementById("vc_config_numero").checked = cfg.repassar_numero !== false;
      document.getElementById("vc_config_obs").value = cfg.observacoes || "";
    } catch (err) {
      modal.classList.remove("aberto");
      alert(err.message);
    }
  };

  window.salvarConfigCobrancaVoip = async function salvarConfigCobrancaVoip() {
    if (!ehSuperAdmin()) return;
    const id = Number(document.getElementById("vc_config_id")?.value);
    if (!id) return;

    try {
      await apiVoip(`/admin/voip/faturamento/${id}`, {
        method:"PATCH",
        body:JSON.stringify({
          margem_percentual:Number(document.getElementById("vc_config_margem")?.value || 0),
          taxa_fixa_mensal_brl:Number(document.getElementById("vc_config_taxa")?.value || 0),
          repassar_numero:document.getElementById("vc_config_numero")?.checked !== false,
          observacoes:document.getElementById("vc_config_obs")?.value || ""
        })
      });
      fecharModalCustosVoip("vc_modal_config");
      await carregarPainelCustosVoip(true);
    } catch (err) {
      alert(err.message);
    }
  };

  function ativarQuandoUsuarioEstiverPronto() {
    injetarCss();
    injetarEstrutura();
    garantirSecaoSidebar();
    patchNavegacao();

    if (!podeVerPainel()) return false;

    garantirSecaoSidebar();
    const btn = document.getElementById("sidebar-item-voip-custos");
    if (btn) btn.style.display = "";
    return true;
  }

  // Tenta imediatamente (sessão restaurada) e novamente enquanto init() ainda
  // estiver carregando o perfil. Encerra sozinho quando o tipo do usuário existir.
  if (!ativarQuandoUsuarioEstiverPronto()) {
    let tentativas = 0;
    const espera = setInterval(() => {
      tentativas += 1;
      if (ativarQuandoUsuarioEstiverPronto() || tentativas > 80) clearInterval(espera);
    }, 250);
  }
})();
