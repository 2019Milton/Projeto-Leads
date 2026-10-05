(function instalarRecursosDoCorretor() {
  "use strict";

  let conversaSelecionadaId = null;
  let atualizacaoConversas = null;
  let whatsappPainelPronto = false;
  let whatsappDiagnosticoCarregado = false;
  let modelosWhatsappPainel = [];
  let modelosWhatsappCarregados = false;
  let envioMidiaPainel = false;
  let voipDevice = null;
  let voipCall = null;
  let voipTimer = null;
  let voipInicioChamada = null;
  let voipSdkPromise = null;
  let voipConfigAtual = null;
  let voipIncomingCall = null;
  let voipGlobalStatus = null;

  const htmlSeguro = (valor) => escaparHtml(String(valor ?? ""));

  function statusRecurso(cliente = {}, recurso) {
    if (recurso === "whatsapp") {
      if (!cliente.atendimento_whatsapp_habilitado) return { classe: "", texto: "WhatsApp desativado" };
      if (cliente.atendimento_whatsapp_status === "ativo") return { classe: "ativo", texto: "WhatsApp ativo" };
      return { classe: "espera", texto: "WhatsApp aguardando conexão" };
    }

    if (!cliente.voip_habilitado) return { classe: "", texto: "Telefonia desativada" };
    if (cliente.voip_status === "ativo" && cliente.voip_numero) {
      return { classe: "ativo", texto: `VoIP ativo · ${cliente.voip_numero}` };
    }
    if (cliente.voip_status === "erro") {
      return { classe: "erro", texto: "VoIP com erro de ativação" };
    }
    if (cliente.voip_status === "provisionando") {
      return { classe: "espera", texto: "VoIP ativando linha..." };
    }
    return { classe: "preparado", texto: "VoIP preparado · sem cobrança" };
  }

  function injetarEstilos() {
    if (document.getElementById("recursos-corretor-style")) return;
    const estilo = document.createElement("style");
    estilo.id = "recursos-corretor-style";
    estilo.textContent = `
      /* Barra de contexto do gestor: é chrome global da aplicação, não conteúdo
         da seção ativa. Assim ela continua ocupando a largura útil mesmo se uma
         tela trocar #app-content-area de flex para grid. */
      #app.sidebar-ativa #app-content-area>#gt_barra_contexto{box-sizing:border-box;min-width:0;max-width:100%;align-self:stretch;flex:0 0 auto;grid-column:1/-1}
      #app.sidebar-ativa #app-content-area>#gt_barra_contexto .gt-contexto-info{min-width:0}
      #app.sidebar-ativa #app-content-area>#gt_barra_contexto .gt-contexto-acoes{min-width:0}
      #app.sidebar-ativa #app-content-area>#gt_barra_contexto .gt-btn{flex:0 0 auto;width:auto;max-width:100%}
      /* Campanhas usa um grid próprio com gutters. Reserva uma linha exclusiva
         para a barra do gestor e joga o card de campanhas para a linha seguinte.
         Sem isso, o auto-placement tentava encaixar a barra na coluna de 12px. */
      #app.sidebar-ativa.campanhas-layout-ativo #app-content-area{grid-template-rows:auto auto auto}
      #app.sidebar-ativa.campanhas-layout-ativo #app-content-area>#gt_barra_contexto{grid-column:1/-1;grid-row:2;width:auto;max-width:none;margin:0 12px 16px}
      #app.sidebar-ativa.campanhas-layout-ativo #app-content-area>#card-campanhas.secao-visivel{grid-row:3}
      .gt-recursos-resumo{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 13px}.gt-recurso-status{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border:1px solid #334155;border-radius:999px;background:#101b2d;color:#94a3b8;font-size:10px;font-weight:800}.gt-recurso-status.ativo{border-color:rgba(34,197,94,.34);background:rgba(34,197,94,.08);color:#86efac}.gt-recurso-status.espera{border-color:rgba(245,158,11,.34);background:rgba(245,158,11,.08);color:#fbbf24}.gt-recurso-linha{display:flex;align-items:flex-start;gap:14px;padding:15px 0;border-bottom:1px solid #223149}.gt-recurso-linha:last-of-type{border-bottom:0}.gt-recurso-texto{min-width:0;flex:1}.gt-recurso-texto strong{display:block;color:#f8fafc;font-size:14px}.gt-recurso-texto p{margin:5px 0 0;color:#8494aa;font-size:11px;line-height:1.5}.gt-switch{position:relative;width:48px;height:26px;flex:0 0 48px}.gt-switch input{position:absolute;opacity:0;pointer-events:none}.gt-switch span{position:absolute;inset:0;border:1px solid #475569;border-radius:999px;background:#1e293b;cursor:pointer;transition:.18s}.gt-switch span:after{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;border-radius:50%;background:#94a3b8;transition:.18s}.gt-switch input:checked+span{border-color:#22c55e;background:#15803d}.gt-switch input:checked+span:after{left:25px;background:#fff}.gt-switch input:disabled+span{opacity:.55;cursor:wait}.gt-sem-custo{margin-top:15px;padding:12px 14px;border:1px solid rgba(59,130,246,.24);border-radius:11px;background:rgba(37,99,235,.08);color:#a7c7ff;font-size:11px;line-height:1.55}.gt-sem-custo b{color:#dbeafe}.gt-fin-box{width:min(780px,100%)}.gt-fin-secao{margin-top:16px;padding-top:15px;border-top:1px solid #26364d}.gt-fin-secao h4{margin:0 0 5px;color:#fff}.gt-fin-secao>p{margin:0 0 12px;color:#8090a7;font-size:11px;line-height:1.45}.gt-fin-box textarea{width:100%;min-height:68px;box-sizing:border-box;border:1px solid #34445d;border-radius:9px;background:#111f33;color:#fff;padding:10px}
      .pc-nav{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.pc-nav-btn{border:1px solid #2a3c55;border-radius:10px;padding:9px 13px;background:#101d31;color:#94a3b8;font-weight:800;cursor:pointer}.pc-nav-btn.ativo{border-color:#3b82f6;background:rgba(37,99,235,.16);color:#dbeafe}.pc-area[hidden]{display:none!important}.pc-whatsapp{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(0,1.7fr);min-height:610px;border:1px solid #20314a;border-radius:16px;overflow:hidden;background:#0b1728}.pc-conversas-coluna{border-right:1px solid #20314a;background:#0d1a2c}.pc-recurso-topo{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px;border-bottom:1px solid #20314a}.pc-recurso-topo h2{margin:0;color:#fff;font-size:17px}.pc-recurso-topo p{margin:4px 0 0;color:#7889a2;font-size:11px}.pc-filtro{margin:0!important;width:auto!important;min-width:145px;border:1px solid #31445f!important;background:#101f34!important;color:#dbeafe!important}.pc-conversas-lista{max-height:545px;overflow:auto}.pc-conversa-item{display:block;width:100%;padding:14px 16px;border:0;border-bottom:1px solid #1c2d43;background:transparent;color:inherit;text-align:left;cursor:pointer}.pc-conversa-item:hover,.pc-conversa-item.ativo{background:#13233a}.pc-conversa-linha{display:flex;align-items:center;justify-content:space-between;gap:10px}.pc-conversa-item strong{overflow:hidden;color:#edf3fb;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.pc-conversa-item small{color:#71829a;font-size:10px}.pc-conversa-item p{overflow:hidden;margin:7px 0 0;color:#91a1b6;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.pc-nao-lidas{min-width:18px;padding:3px 5px;border-radius:999px;background:#22c55e;color:#052e16;font-size:9px;font-weight:900;text-align:center}.pc-chat{display:flex;min-width:0;flex-direction:column}.pc-chat-cabecalho{min-height:72px}.pc-chat-acoes{display:flex;gap:7px;flex-wrap:wrap}.pc-chat-acoes button{border:1px solid #334155;border-radius:8px;padding:7px 9px;background:#142238;color:#cbd5e1;font-size:10px;cursor:pointer}.pc-mensagens{display:flex;min-height:420px;max-height:470px;flex:1;flex-direction:column;gap:9px;overflow:auto;padding:18px;background:radial-gradient(circle at 100% 0,rgba(37,99,235,.08),transparent 35%)}.pc-mensagem{align-self:flex-start;max-width:min(78%,620px);padding:10px 12px;border:1px solid #2b3d57;border-radius:5px 13px 13px 13px;background:#14233a;color:#e2e8f0;font-size:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.pc-mensagem.saida{align-self:flex-end;border-color:rgba(34,197,94,.25);border-radius:13px 5px 13px 13px;background:#123329}.pc-mensagem small{display:block;margin-top:5px;color:#728198;font-size:9px;text-align:right}.pc-compose{display:flex;gap:9px;padding:13px;border-top:1px solid #20314a}.pc-compose textarea{min-height:44px;max-height:120px;flex:1;resize:vertical;margin:0!important;border:1px solid #31445f!important;background:#101f34!important;color:#fff!important}.pc-compose button{border:0;border-radius:10px;padding:0 17px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-weight:850;cursor:pointer}.pc-compose button:disabled,.pc-compose textarea:disabled{opacity:.5;cursor:not-allowed}.pc-aviso-janela{padding:8px 13px;border-top:1px solid rgba(245,158,11,.2);background:rgba(245,158,11,.07);color:#fbbf24;font-size:10px}.pc-voip-grade{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:16px}.pc-voip-estado{display:grid;place-items:center;min-height:260px;text-align:center}.pc-voip-icone{display:grid;place-items:center;width:68px;height:68px;margin:0 auto 15px;border:1px solid rgba(59,130,246,.3);border-radius:22px;background:rgba(37,99,235,.12);font-size:30px}.pc-voip-estado h2{margin:0 0 8px;color:#fff}.pc-voip-estado p{max-width:470px;margin:0 auto;color:#91a1b6;line-height:1.55}.pc-sem-cobranca{display:inline-block;margin-top:14px;padding:7px 10px;border:1px solid rgba(34,197,94,.28);border-radius:999px;background:rgba(34,197,94,.08);color:#86efac;font-size:10px;font-weight:850}.pc-discador{margin-top:16px}.pc-discador input{margin:0 0 9px!important;background:#0e1b2d!important;color:#dbeafe!important}.pc-discador button{width:100%;border:0;border-radius:10px;padding:11px;background:#334155;color:#94a3b8;font-weight:850}.pc-chamada-item{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #1c2d43}.pc-chamada-item strong{display:block;color:#e8edf7;font-size:12px}.pc-chamada-item span{display:block;margin-top:4px;color:#77889f;font-size:10px}.pc-chamada-item b{color:#a5b4fc;font-size:10px}.pc-fin-resumo{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:16px}.pc-fin-total{border-color:rgba(34,197,94,.28);background:linear-gradient(145deg,rgba(21,128,61,.18),rgba(10,21,38,.98))}.pc-fin-itens{margin-top:7px}.pc-fin-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid #1c2d43}.pc-fin-item strong{display:block;color:#e8edf7;font-size:13px}.pc-fin-item span{display:block;margin-top:4px;color:#77889f;font-size:10px}.pc-fin-item b{color:#fff;font-size:13px}.pc-fin-tag{display:inline-block!important;width:max-content;padding:3px 6px;border:1px solid #334155;border-radius:999px;color:#94a3b8!important}.pc-fin-tag.ativo{border-color:rgba(34,197,94,.3);color:#86efac!important}.pc-fin-alerta{margin-top:14px;padding:13px;border:1px solid rgba(245,158,11,.22);border-radius:11px;background:rgba(245,158,11,.07);color:#fcd34d;font-size:11px;line-height:1.55}.pc-fin-custos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.pc-fin-custo{padding:10px;border:1px solid #26374f;border-radius:9px;background:#0d1a2b;color:#91a1b6;font-size:10px}.pc-whatsapp-status{display:inline-flex;align-items:center;gap:6px}.pc-whatsapp-status:before{content:"";width:7px;height:7px;border-radius:50%;background:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.12)}.pc-whatsapp-status.pronto{color:#86efac!important}.pc-whatsapp-status.pronto:before{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.13)}.pc-whatsapp-status.alerta{color:#fbbf24!important}.pc-whatsapp-status.alerta:before{background:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.13)}.pc-whatsapp-status.erro{color:#fca5a5!important}.pc-whatsapp-status.erro:before{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.13)}.pc-template-box{padding:12px 13px;border-top:1px solid rgba(59,130,246,.22);background:rgba(37,99,235,.08)}.pc-template-box[hidden]{display:none!important}.pc-template-box strong{display:block;color:#dbeafe;font-size:11px}.pc-template-box small{display:block;margin-top:4px;color:#8fa6c4;font-size:10px;line-height:1.4}.pc-template-acoes{display:flex;gap:8px;margin-top:9px}.pc-template-acoes select{min-width:0;flex:1;margin:0!important;border:1px solid #31445f!important;background:#101f34!important;color:#dbeafe!important}.pc-template-acoes button{border:0;border-radius:9px;padding:8px 12px;background:#2563eb;color:#fff;font-size:10px;font-weight:850;cursor:pointer}.pc-template-acoes button:disabled{opacity:.5;cursor:not-allowed}.pc-compose .pc-anexo-btn{flex:0 0 42px;width:42px;padding:0!important;border:1px solid #31445f!important;background:#142238!important;color:#cbd5e1!important;font-size:17px}.pc-compose .pc-anexo-btn:hover:not(:disabled){background:#1e3150!important}.pc-compose .pc-anexo-btn:disabled{opacity:.45}.pc-upload-status{padding:7px 13px;border-top:1px solid rgba(59,130,246,.16);background:rgba(37,99,235,.05);color:#93c5fd;font-size:10px}
.gt-recurso-status.preparado{border-color:rgba(59,130,246,.34);background:rgba(37,99,235,.09);color:#93c5fd}.gt-recurso-status.erro{border-color:rgba(239,68,68,.34);background:rgba(239,68,68,.08);color:#fca5a5}.gt-voip-ativacao{margin:8px 0 15px;padding:13px 14px;border:1px solid #263a56;border-radius:12px;background:#0d1b2e}.gt-voip-ativacao[hidden]{display:none!important}.gt-voip-ativacao h4{margin:0 0 5px;color:#e8edf7;font-size:12px}.gt-voip-ativacao p{margin:0;color:#8497b2;font-size:10px;line-height:1.5}.gt-voip-form{display:grid;grid-template-columns:110px 150px minmax(180px,1fr);gap:8px;align-items:end;margin-top:11px}.gt-voip-form label{display:block;color:#8fa1ba;font-size:9px;font-weight:800}.gt-voip-form input{width:100%;box-sizing:border-box;margin-top:4px!important}.gt-voip-acao{height:38px;border:0;border-radius:9px;padding:0 13px;background:#2563eb;color:#fff;font-weight:850;cursor:pointer}.gt-voip-acao:disabled{opacity:.5;cursor:not-allowed}.gt-voip-acao.perigo{background:#b91c1c}.gt-voip-lock{display:inline-flex;margin-top:9px;padding:5px 8px;border:1px solid rgba(34,197,94,.22);border-radius:999px;background:rgba(34,197,94,.07);color:#86efac;font-size:9px;font-weight:800}.gt-voip-lock.alerta{border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.08);color:#fbbf24}.pc-voip-status{display:inline-flex;align-items:center;gap:6px;margin-top:9px;padding:6px 9px;border:1px solid #334155;border-radius:999px;color:#94a3b8;font-size:10px;font-weight:800}.pc-voip-status.ativo{border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.08);color:#86efac}.pc-voip-status.preparado{border-color:rgba(59,130,246,.3);background:rgba(37,99,235,.08);color:#93c5fd}.pc-voip-softphone{margin-top:16px;text-align:left}.pc-voip-softphone input{margin:0 0 8px!important}.pc-voip-botoes{display:grid;grid-template-columns:1fr auto;gap:8px}.pc-voip-ligar{border:0;border-radius:10px;padding:11px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-weight:850;cursor:pointer}.pc-voip-ligar:disabled{opacity:.5;cursor:not-allowed}.pc-voip-desligar{border:0;border-radius:10px;padding:11px 14px;background:#b91c1c;color:#fff;font-weight:850;cursor:pointer}.pc-voip-desligar[hidden]{display:none!important}.pc-voip-chamada-status{margin-top:10px;padding:9px;border:1px solid #263a54;border-radius:9px;background:#0d1b2d;color:#9fb0c6;font-size:10px}.pc-voip-chamada-status strong{color:#e2e8f0}.pc-voip-incoming{margin-top:12px;padding:12px;border:1px solid rgba(34,197,94,.35);border-radius:11px;background:rgba(34,197,94,.08);text-align:left}.pc-voip-incoming[hidden]{display:none!important}.pc-voip-incoming b{display:block;color:#d1fae5}.pc-voip-incoming span{display:block;margin-top:3px;color:#a7f3d0;font-size:10px}.pc-voip-incoming-acoes{display:flex;gap:8px;margin-top:9px}.pc-voip-incoming-acoes button{flex:1;border:0;border-radius:8px;padding:8px;color:#fff;font-weight:800;cursor:pointer}.pc-voip-aceitar{background:#15803d}.pc-voip-rejeitar{background:#991b1b}@media(max-width:820px){.pc-whatsapp,.pc-voip-grade{grid-template-columns:1fr}.pc-conversas-coluna{border-right:0;border-bottom:1px solid #20314a}.pc-conversas-lista{max-height:280px}.pc-mensagens{min-height:360px}.pc-recurso-topo{align-items:flex-start;flex-direction:column}.pc-fin-resumo,.pc-fin-custos{grid-template-columns:1fr}}
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
          <div class="gt-recurso-linha"><div class="gt-recurso-texto"><strong>📞 Telefonia VoIP</strong><p>Habilita o módulo no painel sem contratar nada. A linha real só é criada quando você usar a ação separada de ativação abaixo.</p></div><label class="gt-switch" title="Preparar módulo de telefonia"><input id="gt_recurso_voip" type="checkbox" onchange="alternarRecursoClienteGerenciado('voip_habilitado', this.checked, this)"><span></span></label></div>
          <div id="gt_voip_ativacao" class="gt-voip-ativacao" hidden></div>
          <div id="gt_recursos_status" class="gt-recursos-resumo" style="margin-top:15px"></div>
          <div class="gt-sem-custo"><b>Sem cobrança agora:</b> habilitar estas opções apenas prepara e exibe os módulos. Nenhum número, operadora ou pacote de ligações será contratado automaticamente. Custos externos só começam depois de uma configuração futura e consciente.</div>
          <div class="gt-modal-acoes"><button class="gt-btn gt-btn-primary" onclick="fecharModalGestor('gt_modal_recursos')">Concluir</button></div>
        </div>
      </div>
      <div id="gt_modal_financeiro" class="gt-modal" onclick="if(event.target===this) fecharModalGestor('gt_modal_financeiro')">
        <div class="gt-modal-box gt-fin-box">
          <div class="gt-modal-topo"><div><h3>Financeiro do corretor</h3><p id="gt_fin_cliente" class="gt-ajuda" style="margin-top:4px"></p></div><button class="gt-fechar" onclick="fecharModalGestor('gt_modal_financeiro')">✕</button></div>
          <input id="gt_fin_id" type="hidden">
          <div class="gt-form-grid"><div class="gt-campo"><label>Nome do plano</label><input id="gt_fin_plano_nome"></div><div class="gt-campo"><label>Mensalidade do plano (R$)</label><input id="gt_fin_plano_valor" type="number" min="0" step="0.01"></div><div class="gt-campo"><label>Dia do vencimento</label><input id="gt_fin_vencimento" type="number" min="1" max="28"></div></div>
          <div class="gt-fin-secao"><h4>Possíveis cobranças adicionais</h4><p>Deixe em zero enquanto não houver cobrança. O valor só aparecerá no total do corretor quando o recurso correspondente estiver ativo.</p><div class="gt-form-grid"><div class="gt-campo"><label>WhatsApp oficial (R$/mês)</label><input id="gt_fin_whatsapp" type="number" min="0" step="0.01"></div><div class="gt-campo"><label>Créditos extras de IA (R$/mês)</label><input id="gt_fin_ia" type="number" min="0" step="0.01"></div><div class="gt-campo"><label>Outro adicional</label><input id="gt_fin_outro_descricao" placeholder="Descrição do serviço"></div><div class="gt-campo"><label>Valor do outro adicional (R$/mês)</label><input id="gt_fin_outro_valor" type="number" min="0" step="0.01"></div><div class="gt-campo gt-campo-largo"><label>Observações para o corretor</label><textarea id="gt_fin_observacoes" maxlength="500"></textarea></div></div></div>
          <div class="gt-sem-custo"><b>Importante:</b> o VoIP não faz parte desta mensalidade. Número e consumo de ligações são calculados separadamente no painel “Custos VoIP”. A verba dos anúncios também é paga separadamente.</div>
          <div class="gt-modal-acoes"><button class="gt-btn gt-btn-secondary" onclick="fecharModalGestor('gt_modal_financeiro')">Cancelar</button><button id="gt_fin_salvar" class="gt-btn gt-btn-primary" onclick="salvarFinanceiroClienteGerenciado()">Salvar valores</button></div>
        </div>
      </div>`);
  }

  function removerControlesGestorDoPainelCliente() {
    document.getElementById("gt_modal_recursos")?.remove();
    document.getElementById("gt_modal_financeiro")?.remove();
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


  async function carregarEstadoVoipGestor(cliente = {}) {
    const box = document.getElementById("gt_voip_ativacao");
    if (!box) return;

    if (!cliente.voip_habilitado) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }

    box.hidden = false;
    box.innerHTML = '<h4>Telefonia preparada</h4><p>Consultando a trava global de ativação...</p>';

    try {
      voipGlobalStatus = await requisicaoGestor("/gestor/voip/status");
    } catch (err) {
      voipGlobalStatus = null;
      box.innerHTML = `<h4>Telefonia preparada</h4><p>${htmlSeguro(err.message || "Não foi possível consultar a configuração do provedor.")}</p><span class="gt-voip-lock alerta">Sem contratação automática</span>`;
      return;
    }

    if (cliente.voip_status === "ativo" && cliente.voip_numero) {
      box.innerHTML = `
        <h4>☎️ Linha ativa: ${htmlSeguro(cliente.voip_numero)}</h4>
        <p>Esta é uma linha real no provedor e pode gerar mensalidade e custo por uso. Para parar a cobrança recorrente do número, use a liberação abaixo — não apenas o interruptor do módulo.</p>
        <div class="gt-voip-form" style="grid-template-columns:1fr">
          <button class="gt-voip-acao perigo" onclick="liberarLinhaVoipClienteGerenciado()">Liberar linha e parar cobrança</button>
        </div>
      `;
      return;
    }

    const configurado = voipGlobalStatus?.configurado === true;
    const liberado = voipGlobalStatus?.provisionamento_habilitado === true;
    const faltantes = Array.isArray(voipGlobalStatus?.faltantes) ? voipGlobalStatus.faltantes : [];
    const avisos = Array.isArray(voipGlobalStatus?.avisos) ? voipGlobalStatus.avisos : [];
    const ddd = cliente.voip_ddd || voipGlobalStatus?.ddd_padrao || "11";
    const limite = Number(cliente.voip_limite_minutos_mensal || 100);

    let explicacao = "O módulo está pronto no painel, mas ainda não existe número contratado — custo externo atual: zero.";
    if (!configurado) {
      explicacao += ` Antes da primeira ativação, configure no Railway: ${faltantes.join(", ") || "credenciais Twilio"}.`;
    } else if (avisos.length) {
      explicacao += ` Ainda faltam os dados regulatórios do Brasil: ${avisos.join(", ")}.`;
    } else if (!liberado) {
      explicacao += " A trava global VOIP_PROVISIONING_ENABLED continua desligada, então nem um clique acidental consegue contratar uma linha.";
    } else {
      explicacao += " O provisionamento está liberado; o botão abaixo fará a contratação real somente após confirmação.";
    }

    const podeAtivar = configurado && liberado && avisos.length === 0;
    box.innerHTML = `
      <h4>📞 Preparado para ativar quando precisar</h4>
      <p>${htmlSeguro(explicacao)}</p>
      <span class="gt-voip-lock ${podeAtivar ? "alerta" : ""}">${podeAtivar ? "Ativação real liberada" : "🔒 Sem cobrança / contratação bloqueada"}</span>
      <div class="gt-voip-form">
        <label>DDD do número<input id="gt_voip_ddd" inputmode="numeric" maxlength="2" value="${htmlSeguro(ddd)}"></label>
        <label>Limite mensal (min)<input id="gt_voip_limite" type="number" min="10" max="10000" value="${limite}"></label>
        <button id="gt_voip_ativar" class="gt-voip-acao" onclick="ativarLinhaVoipClienteGerenciado()" ${podeAtivar ? "" : "disabled"}>Ativar linha real</button>
      </div>
      <p style="margin-top:9px;color:#fbbf24">Para prospecção/telemarketing ativo no Brasil, confirme a exigência de numeração 0303 antes de contratar um número local comum.</p>
    `;
  }

  function atualizarClienteVoipLocal(id, dados = {}) {
    if (Array.isArray(clientesGerenciados)) {
      const indice = clientesGerenciados.findIndex((item) => Number(item.id) === Number(id));
      if (indice >= 0) clientesGerenciados[indice] = { ...clientesGerenciados[indice], ...dados };
    }

    const contexto = clientePorId(id);
    if (contexto && localStorage.getItem("gestor_token_original")) {
      localStorage.setItem("gestor_cliente_contexto", JSON.stringify({ ...contexto, ...dados }));
    }
  }

  window.ativarLinhaVoipClienteGerenciado = async function ativarLinhaVoipClienteGerenciado() {
    const id = Number(document.getElementById("gt_recursos_id")?.value);
    const botao = document.getElementById("gt_voip_ativar");
    const ddd = String(document.getElementById("gt_voip_ddd")?.value || "").replace(/\D/g, "");
    const limite = Number(document.getElementById("gt_voip_limite")?.value || 100);

    if (!id) return;
    if (!/^\d{2}$/.test(ddd)) return alert("Informe um DDD válido com 2 dígitos.");

    const confirmou = confirm(
      "ATIVAÇÃO REAL DO VOIP\n\nEsta ação pode contratar um número no provedor e, a partir da confirmação, gerar mensalidade da linha e custos das chamadas.\n\nPara telemarketing/prospecção ativa, confirme também se sua operação precisa usar 0303.\n\nDeseja contratar a linha para este corretor agora?"
    );
    if (!confirmou) return;

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Ativando...";
    }

    try {
      const data = await requisicaoGestor(`/gestor/clientes/${id}/voip/ativar`, {
        method: "POST",
        body: JSON.stringify({
          ddd,
          limite_minutos_mensal: limite,
          confirmar_cobranca: true,
          confirmar_uso_regulatorio: true
        })
      });

      atualizarClienteVoipLocal(id, data.cliente || {});
      await carregarClientesGerenciados(true);
      const atualizado = clientePorId(id) || data.cliente || {};
      atualizarModal(atualizado);
      await carregarEstadoVoipGestor(atualizado);
      alert(data.mensagem || "Linha VoIP ativada.");
    } catch (err) {
      alert(err.message);
      const cliente = clientePorId(id);
      if (cliente) await carregarEstadoVoipGestor(cliente);
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Ativar linha real";
      }
    }
  };

  window.liberarLinhaVoipClienteGerenciado = async function liberarLinhaVoipClienteGerenciado() {
    const id = Number(document.getElementById("gt_recursos_id")?.value);
    if (!id) return;

    const confirmou = confirm(
      "LIBERAR LINHA VOIP\n\nA plataforma solicitará ao provedor a liberação do número. Só depois da confirmação do provedor a linha será removida localmente.\n\nDeseja liberar a linha e encerrar a mensalidade recorrente desse número?"
    );
    if (!confirmou) return;

    const box = document.getElementById("gt_voip_ativacao");
    if (box) box.innerHTML = '<h4>Liberando linha...</h4><p>Aguardando confirmação do provedor. Não feche esta janela.</p>';

    try {
      const data = await requisicaoGestor(`/gestor/clientes/${id}/voip/desativar`, {
        method: "POST",
        body: JSON.stringify({ confirmar_liberacao: true })
      });

      atualizarClienteVoipLocal(id, data.cliente || {});
      await carregarClientesGerenciados(true);
      const atualizado = clientePorId(id) || data.cliente || {};
      atualizarModal(atualizado);
      await carregarEstadoVoipGestor(atualizado);
      alert(data.mensagem || "Linha liberada.");
    } catch (err) {
      alert(err.message);
      const cliente = clientePorId(id);
      if (cliente) await carregarEstadoVoipGestor(cliente);
    }
  };

  window.abrirRecursosClienteGerenciado = function abrirRecursosClienteGerenciado(id) {
    injetarModalGestor();
    const cliente = clientePorId(id);
    if (!cliente) return alert("Não foi possível localizar este corretor.");
    atualizarModal(cliente);
    document.getElementById("gt_modal_recursos").classList.add("aberto");
    carregarEstadoVoipGestor(cliente);
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
      if (cliente) {
        atualizarModal(cliente);
        if (campo === "voip_habilitado") await carregarEstadoVoipGestor(cliente);
      }
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
      preencher("gt_fin_whatsapp", Number(config.valor_whatsapp_mensal || 0).toFixed(2));
      preencher("gt_fin_ia", Number(config.valor_ia_extra_mensal || 0).toFixed(2));
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
      valor_whatsapp_mensal: valorCampoFinanceiro("gt_fin_whatsapp"),
      valor_ia_extra_mensal: valorCampoFinanceiro("gt_fin_ia"),
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
    return ({ aguardando_pagamento: "Aguardando pagamento", comprovante_enviado: "Em conferência", pago: "Pago", ativo: "Ativo", desativado: "Desativado", aguardando_configuracao: "Aguardando ativação", pronto_para_ativar: "Preparado · sem linha", provisionando: "Ativando linha", erro: "Erro de ativação", nao_cobrado: "Não cobrado" })[String(status || "").toLowerCase()] || String(status || "—").replace(/_/g, " ");
  }

  async function carregarStatusWhatsapp(forcar = false) {
    const statusEl = document.getElementById("pc_whatsapp_status_texto");
    if (!statusEl) return whatsappPainelPronto;

    if (whatsappDiagnosticoCarregado && !forcar) {
      return whatsappPainelPronto;
    }

    statusEl.className = "pc-whatsapp-status";
    statusEl.textContent = "Verificando conexão oficial...";

    try {
      const diagnostico = await requisicaoPainel("/whatsapp/diagnostico");
      whatsappDiagnosticoCarregado = true;
      whatsappPainelPronto =
        diagnostico.conectado === true &&
        diagnostico.pronto_para_mensagens === true;

      if (whatsappPainelPronto) {
        statusEl.className = "pc-whatsapp-status pronto";
        statusEl.textContent = "WhatsApp Business pronto para atendimento";
      } else if (diagnostico.conectado === true) {
        statusEl.className = "pc-whatsapp-status alerta";
        const detalhes = [];
        if (diagnostico.conta_aprovada === false) detalhes.push("conta em análise");
        if (diagnostico.numero_status && diagnostico.numero_status !== "CONNECTED") detalhes.push("número não conectado");
        if (diagnostico.webhook_inscrito === false) detalhes.push("webhook pendente");
        if (Array.isArray(diagnostico.permissoes_ausentes) && diagnostico.permissoes_ausentes.length) detalhes.push("permissões incompletas");
        statusEl.textContent = detalhes.length
          ? `WhatsApp conectado, mas ainda não pronto: ${detalhes.join(", ")}`
          : "WhatsApp conectado, mas ainda não está pronto para mensagens";
      } else {
        statusEl.className = "pc-whatsapp-status erro";
        statusEl.textContent = "WhatsApp oficial ainda não conectado";
      }
    } catch (err) {
      whatsappDiagnosticoCarregado = true;
      whatsappPainelPronto = false;
      statusEl.className = "pc-whatsapp-status erro";
      statusEl.textContent = err?.message || "Não foi possível validar o WhatsApp";
    }

    return whatsappPainelPronto;
  }

  async function carregarModelosWhatsappPainel(forcar = false) {
    if (modelosWhatsappCarregados && !forcar) return modelosWhatsappPainel;

    try {
      const data = await requisicaoPainel("/painel-cliente/whatsapp/modelos");
      modelosWhatsappPainel = Array.isArray(data.modelos) ? data.modelos : [];
      modelosWhatsappCarregados = true;
    } catch (_) {
      modelosWhatsappPainel = [];
      modelosWhatsappCarregados = true;
    }

    return modelosWhatsappPainel;
  }

  async function atualizarRetomadaPorModelo(conversa = {}) {
    const box = document.getElementById("pc_template_box");
    const select = document.getElementById("pc_template_select");
    const botao = document.getElementById("pc_template_enviar");
    const ajuda = document.getElementById("pc_template_ajuda");
    if (!box || !select || !botao || !ajuda) return;

    const janelaAberta = conversa.janela_atendimento_aberta === true;
    box.hidden = janelaAberta || !whatsappPainelPronto;
    if (box.hidden) return;

    ajuda.textContent = "A janela de 24 horas terminou. Escolha um modelo aprovado pela Meta para retomar o contato.";
    botao.disabled = true;
    select.disabled = true;
    select.innerHTML = '<option value="">Carregando modelos aprovados...</option>';

    const modelos = await carregarModelosWhatsappPainel();

    if (!modelos.length) {
      select.innerHTML = '<option value="">Nenhum modelo aprovado compatível</option>';
      ajuda.textContent = "Não há modelo aprovado disponível. O gestor precisa configurar ou aprovar um modelo na conexão do WhatsApp.";
      return;
    }

    select.innerHTML = '<option value="">Selecione um modelo...</option>' + modelos.map((modelo, indice) => {
      const resumo = String(modelo.corpo || modelo.nome || "").replace(/\s+/g, " ").slice(0, 80);
      return `<option value="${indice}">${htmlSeguro(modelo.nome)} · ${htmlSeguro(resumo)}</option>`;
    }).join("");
    select.disabled = false;
    botao.disabled = false;
  }

  window.navegarPainelCliente = async function navegarPainelCliente(area) {
    document.querySelectorAll(".pc-area").forEach((elemento) => { elemento.hidden = elemento.id !== `pc_area_${area}`; });
    document.querySelectorAll(".pc-nav-btn").forEach((botao) => botao.classList.toggle("ativo", botao.dataset.area === area));

    if (area === "whatsapp") {
      await carregarStatusWhatsapp();
      carregarConversas(true);
      if (conversaSelecionadaId) {
        window.abrirConversaPainelCliente(conversaSelecionadaId, true);
      }
    }
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
      area.innerHTML = `<div class="pc-whatsapp"><aside class="pc-conversas-coluna"><div class="pc-recurso-topo"><div><h2>Conversas</h2><p id="pc_whatsapp_status_texto" class="pc-whatsapp-status">Verificando conexão oficial...</p></div><select id="pc_whatsapp_filtro" class="pc-filtro" onchange="carregarConversasPainelCliente()"><option value="">Todas</option><option value="humano">Atendimento humano</option><option value="bot">Bot atendendo</option><option value="aguardando_resposta">Aguardando resposta</option><option value="encerrada">Encerradas</option></select></div><div id="pc_conversas_lista" class="pc-conversas-lista"><div class="pc-vazio">Carregando conversas...</div></div></aside><div class="pc-chat"><div id="pc_chat_cabecalho" class="pc-recurso-topo pc-chat-cabecalho"><div><h2>Selecione uma conversa</h2><p>O histórico aparecerá aqui.</p></div></div><div id="pc_mensagens" class="pc-mensagens"><div class="pc-vazio">Escolha um contato para iniciar o atendimento.</div></div><div id="pc_aviso_janela" class="pc-aviso-janela" hidden></div><div id="pc_template_box" class="pc-template-box" hidden><strong>Retomar conversa com modelo aprovado</strong><small id="pc_template_ajuda">Carregando...</small><div class="pc-template-acoes"><select id="pc_template_select"><option value="">Carregando...</option></select><button id="pc_template_enviar" onclick="enviarModeloPainelCliente()" disabled>Enviar modelo</button></div></div><div id="pc_upload_status" class="pc-upload-status" hidden></div><div class="pc-compose"><button id="pc_anexo_btn" class="pc-anexo-btn" type="button" title="Enviar imagem, áudio ou documento" onclick="document.getElementById('pc_midia_arquivo')?.click()" disabled>📎</button><input id="pc_midia_arquivo" type="file" hidden accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/ogg,audio/mp4,audio/aac,audio/amr,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onchange="enviarMidiaPainelCliente(this)"><textarea id="pc_mensagem_texto" placeholder="Digite sua mensagem" disabled></textarea><button id="pc_enviar_mensagem" onclick="enviarMensagemPainelCliente()" disabled>Enviar</button></div></div></div>`;
      ultimo.insertAdjacentElement("afterend", area);
      ultimo = area;

      carregarStatusWhatsapp(true);
      carregarConversas();

      clearInterval(atualizacaoConversas);
      atualizacaoConversas = setInterval(() => {
        carregarConversas(true);
        if (conversaSelecionadaId) {
          window.abrirConversaPainelCliente(conversaSelecionadaId, true);
        }
      }, 15000);
    }

    if (voipAtivo) {
      const area = document.createElement("section");
      area.id = "pc_area_voip";
      area.className = "pc-area";
      area.hidden = true;
      area.innerHTML = `<div class="pc-voip-grade"><article id="pc_voip_config" class="pc-card pc-voip-estado"><div><div class="pc-voip-icone">📞</div><h2>Preparando telefonia</h2><p>Consultando a configuração desta conta...</p></div></article><article class="pc-card"><h2>Histórico de ligações</h2><p class="pc-card-sub">Chamadas realizadas e recebidas nesta conta.</p><div id="pc_voip_chamadas"><div class="pc-vazio">Carregando histórico...</div></div></article></div>`;
      ultimo.insertAdjacentElement("afterend", area);
      ultimo = area;

      if (perfil.voip_status === "ativo" && perfil.voip_numero) {
        setTimeout(() => carregarVoip(true), 0);
      }
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

  window.abrirConversaPainelCliente = async function abrirConversaPainelCliente(id, silencioso = false) {
    conversaSelecionadaId = Number(id);
    const mensagensEl = document.getElementById("pc_mensagens");
    if (mensagensEl && !silencioso) {
      mensagensEl.innerHTML = '<div class="pc-vazio">Carregando histórico...</div>';
    }

    try {
      if (!whatsappDiagnosticoCarregado) await carregarStatusWhatsapp();

      const data = await requisicaoPainel(`/painel-cliente/whatsapp/conversas/${conversaSelecionadaId}/mensagens`);
      const conversa = data.conversa || {};
      const nome = conversa.lead_nome || formatarTelefone(conversa.telefone_cliente);

      const cabecalho = document.getElementById("pc_chat_cabecalho");
      if (cabecalho) {
        cabecalho.innerHTML = `<div><h2>${htmlSeguro(nome)}</h2><p>${htmlSeguro(formatarTelefone(conversa.telefone_cliente))} · ${htmlSeguro(labelStatusConversa(conversa.status))}${conversa.campanha_nome ? ` · ${htmlSeguro(conversa.campanha_nome)}` : ""}</p></div><div class="pc-chat-acoes"><button onclick="atualizarStatusConversaPainel('humano')">Assumir</button><button onclick="atualizarStatusConversaPainel('bot')">Devolver ao bot</button><button onclick="atualizarStatusConversaPainel('encerrada')">Encerrar</button></div>`;
      }

      const mensagens = Array.isArray(data.mensagens) ? data.mensagens : [];
      if (mensagensEl) {
        const estavaNoFim = mensagensEl.scrollHeight - mensagensEl.scrollTop - mensagensEl.clientHeight < 80;
        mensagensEl.innerHTML = mensagens.length
          ? mensagens.map((item) => `<div class="pc-mensagem ${item.direcao === "entrada" ? "" : "saida"}">${htmlSeguro(item.conteudo || "[mensagem sem texto]")}<small>${item.direcao === "entrada" ? "Contato" : "Você"} · ${formatarDataPainelCliente(item.criado_em, true)}</small></div>`).join("")
          : '<div class="pc-vazio">Ainda não há mensagens nesta conversa.</div>';

        if (!silencioso || estavaNoFim) mensagensEl.scrollTop = mensagensEl.scrollHeight;
      }

      const texto = document.getElementById("pc_mensagem_texto");
      const enviar = document.getElementById("pc_enviar_mensagem");
      const anexo = document.getElementById("pc_anexo_btn");
      const podeResponder =
        whatsappPainelPronto &&
        conversa.janela_atendimento_aberta === true &&
        conversa.status !== "encerrada";

      if (texto) texto.disabled = !podeResponder;
      if (enviar) enviar.disabled = !podeResponder;
      if (anexo) anexo.disabled = !podeResponder || envioMidiaPainel;

      const aviso = document.getElementById("pc_aviso_janela");
      if (aviso) {
        aviso.hidden = podeResponder;
        if (!whatsappPainelPronto) {
          aviso.textContent = "O WhatsApp oficial desta conta não está pronto para enviar mensagens. Revise a conexão antes de atender.";
        } else if (conversa.status === "encerrada" && conversa.janela_atendimento_aberta === true) {
          aviso.textContent = "Conversa encerrada. Clique em Assumir para reabrir o atendimento.";
        } else if (conversa.janela_atendimento_aberta !== true) {
          aviso.textContent = "A janela de 24 horas terminou. Use um modelo aprovado abaixo para retomar o contato.";
        } else {
          aviso.textContent = "Atendimento temporariamente indisponível.";
        }
      }

      await atualizarRetomadaPorModelo(conversa);
      carregarConversas(true);
    } catch (err) {
      if (mensagensEl && !silencioso) {
        mensagensEl.innerHTML = `<div class="pc-vazio">${htmlSeguro(err.message)}</div>`;
      }
    }
  };

  window.enviarMensagemPainelCliente = async function enviarMensagemPainelCliente() {
    const texto = document.getElementById("pc_mensagem_texto");
    const botao = document.getElementById("pc_enviar_mensagem");
    const mensagem = String(texto?.value || "").trim();
    if (!conversaSelecionadaId || !mensagem) return;

    if (botao) botao.disabled = true;
    try {
      await requisicaoPainel(`/painel-cliente/whatsapp/conversas/${conversaSelecionadaId}/mensagens`, {
        method: "POST",
        body: JSON.stringify({ mensagem })
      });
      if (texto) texto.value = "";
      await window.abrirConversaPainelCliente(conversaSelecionadaId);
    } catch (err) {
      alert(err.message);
    } finally {
      if (botao) botao.disabled = false;
    }
  };

  async function uploadMidiaPainel(arquivo, tipo) {
    const form = new FormData();
    form.append("arquivo", arquivo);
    form.append("tipo", tipo);

    const res = await fetch(`${API}/painel-cliente/whatsapp/midia`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + obterTokenSessaoAtual() },
      body: form
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Não foi possível enviar o arquivo");
    return data;
  }

  window.enviarMidiaPainelCliente = async function enviarMidiaPainelCliente(input) {
    const arquivo = input?.files?.[0];
    if (input) input.value = "";
    if (!arquivo || !conversaSelecionadaId || envioMidiaPainel) return;

    let tipo = "";
    if (arquivo.type.startsWith("image/")) tipo = "imagem";
    else if (arquivo.type.startsWith("audio/")) tipo = "audio";
    else if (["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(arquivo.type)) tipo = "documento";

    if (!tipo) {
      alert("Formato não suportado. Envie imagem, áudio, PDF, DOC ou DOCX.");
      return;
    }
    if (arquivo.size > 15 * 1024 * 1024) {
      alert("Arquivo muito grande. O limite é 15 MB.");
      return;
    }

    const anexo = document.getElementById("pc_anexo_btn");
    const status = document.getElementById("pc_upload_status");
    const texto = document.getElementById("pc_mensagem_texto");
    envioMidiaPainel = true;
    if (anexo) anexo.disabled = true;
    if (status) {
      status.hidden = false;
      status.textContent = `Enviando ${arquivo.name || "arquivo"}...`;
    }

    try {
      const midia = await uploadMidiaPainel(arquivo, tipo);
      const legenda = tipo === "audio" ? "" : String(texto?.value || "").trim();

      await requisicaoPainel(`/painel-cliente/whatsapp/conversas/${conversaSelecionadaId}/mensagens`, {
        method: "POST",
        body: JSON.stringify({
          mensagem: legenda,
          midia_id: midia.id,
          midia_nome: arquivo.name || ""
        })
      });

      if (texto && legenda) texto.value = "";
      if (status) status.textContent = "Arquivo enviado.";
      await window.abrirConversaPainelCliente(conversaSelecionadaId);
    } catch (err) {
      if (status) status.textContent = err.message || "Falha ao enviar o arquivo.";
      alert(err.message);
    } finally {
      envioMidiaPainel = false;
      if (status) setTimeout(() => { status.hidden = true; }, 2200);
      if (conversaSelecionadaId) {
        window.abrirConversaPainelCliente(conversaSelecionadaId, true);
      } else if (anexo) {
        anexo.disabled = true;
      }
    }
  };

  window.enviarModeloPainelCliente = async function enviarModeloPainelCliente() {
    if (!conversaSelecionadaId) return;

    const select = document.getElementById("pc_template_select");
    const botao = document.getElementById("pc_template_enviar");
    const valorSelecionado = String(select?.value ?? "");
    const indice = valorSelecionado === "" ? -1 : Number(valorSelecionado);
    const modelo = Number.isInteger(indice) && indice >= 0 ? modelosWhatsappPainel[indice] : null;

    if (!modelo) {
      alert("Selecione um modelo aprovado.");
      return;
    }

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Enviando...";
    }

    try {
      await requisicaoPainel(`/painel-cliente/whatsapp/conversas/${conversaSelecionadaId}/modelo`, {
        method: "POST",
        body: JSON.stringify({ nome: modelo.nome, idioma: modelo.idioma })
      });

      await window.abrirConversaPainelCliente(conversaSelecionadaId);
      const aviso = document.getElementById("pc_aviso_janela");
      if (aviso) {
        aviso.hidden = false;
        aviso.textContent = "Modelo enviado. Aguarde a resposta do contato para a janela normal de atendimento ser reaberta.";
      }
    } catch (err) {
      alert(err.message);
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Enviar modelo";
      }
    }
  };

  window.atualizarStatusConversaPainel = async function atualizarStatusConversaPainel(status) {
    if (!conversaSelecionadaId) return;
    try {
      await requisicaoPainel(`/painel-cliente/whatsapp/conversas/${conversaSelecionadaId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await window.abrirConversaPainelCliente(conversaSelecionadaId);
    } catch (err) {
      alert(err.message);
    }
  };

  function rotuloStatusChamadaVoip(status) {
    const chave = String(status || "").toLowerCase();
    const mapa = {
      iniciando: "Iniciando",
      initiated: "Iniciada",
      queued: "Na fila",
      ringing: "Chamando",
      tocando: "Chamando",
      answered: "Atendida",
      "in-progress": "Em ligação",
      completed: "Concluída",
      busy: "Ocupado",
      failed: "Falhou",
      "no-answer": "Não atendida",
      canceled: "Cancelada"
    };
    return mapa[chave] || status || "Registrada";
  }

  function formatarDuracaoVoip(segundos) {
    const total = Math.max(Number(segundos || 0), 0);
    const min = Math.floor(total / 60);
    const seg = Math.floor(total % 60);
    return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
  }

  function atualizarStatusSoftphoneVoip(texto, classe = "") {
    const el = document.getElementById("pc_voip_chamada_status");
    if (!el) return;
    el.className = "pc-voip-chamada-status";
    el.innerHTML = `<strong>${htmlSeguro(texto)}</strong>${classe ? ` · ${htmlSeguro(classe)}` : ""}`;
  }

  function pararTimerVoip() {
    clearInterval(voipTimer);
    voipTimer = null;
    voipInicioChamada = null;
  }

  function iniciarTimerVoip() {
    pararTimerVoip();
    voipInicioChamada = Date.now();
    voipTimer = setInterval(() => {
      if (!voipInicioChamada) return;
      const segundos = Math.floor((Date.now() - voipInicioChamada) / 1000);
      atualizarStatusSoftphoneVoip("Em ligação", formatarDuracaoVoip(segundos));
    }, 1000);
  }

  async function carregarSdkVoip() {
    if (voipSdkPromise) return voipSdkPromise;

    voipSdkPromise = import("https://esm.sh/@twilio/voice-sdk@2.18.5?bundle")
      .then((modulo) => {
        if (!modulo?.Device) throw new Error("Voice SDK não carregou corretamente.");
        return modulo;
      })
      .catch((err) => {
        voipSdkPromise = null;
        throw err;
      });

    return voipSdkPromise;
  }

  async function novoTokenVoip() {
    return requisicaoPainel("/painel-cliente/voip/token");
  }

  function ocultarChamadaRecebidaVoip() {
    const box = document.getElementById("pc_voip_incoming");
    if (box) box.hidden = true;
    voipIncomingCall = null;
  }

  function atualizarBotoesVoip(emChamada = false) {
    const ligar = document.getElementById("pc_voip_ligar");
    const desligar = document.getElementById("pc_voip_desligar");
    const mutar = document.getElementById("pc_voip_mutar");
    const numero = document.getElementById("pc_voip_numero_destino");

    if (ligar) ligar.disabled = emChamada || !voipDevice || !voipConfigAtual?.ativo;
    if (numero) numero.disabled = emChamada || !voipConfigAtual?.ativo;
    if (desligar) desligar.hidden = !emChamada;
    if (mutar) mutar.hidden = !emChamada;
  }

  function vincularEventosChamadaVoip(chamada, direcao = "saida") {
    if (!chamada) return;
    voipCall = chamada;
    atualizarBotoesVoip(true);

    chamada.on("ringing", () => {
      atualizarStatusSoftphoneVoip(direcao === "saida" ? "Chamando..." : "Recebendo chamada...");
    });

    chamada.on("accept", () => {
      ocultarChamadaRecebidaVoip();
      iniciarTimerVoip();
      atualizarBotoesVoip(true);
    });

    const encerrar = () => {
      pararTimerVoip();
      voipCall = null;
      ocultarChamadaRecebidaVoip();
      atualizarStatusSoftphoneVoip("Telefone pronto");
      atualizarBotoesVoip(false);
      setTimeout(() => carregarVoip(true), 900);
    };

    chamada.on("disconnect", encerrar);
    chamada.on("cancel", encerrar);
    chamada.on("reject", encerrar);
    chamada.on("error", (err) => {
      pararTimerVoip();
      voipCall = null;
      atualizarStatusSoftphoneVoip(err?.message || "Falha na ligação");
      atualizarBotoesVoip(false);
      setTimeout(() => carregarVoip(true), 900);
    });
  }

  async function destruirSoftphoneVoip() {
    pararTimerVoip();
    try { voipCall?.disconnect?.(); } catch (_) {}
    try { voipIncomingCall?.reject?.(); } catch (_) {}
    try { voipDevice?.destroy?.(); } catch (_) {}
    voipCall = null;
    voipIncomingCall = null;
    voipDevice = null;
    voipConfigAtual = null;
  }

  async function inicializarSoftphoneVoip() {
    if (!voipConfigAtual?.ativo || !voipConfigAtual?.sdk_pronto) return null;
    if (voipDevice) return voipDevice;

    atualizarStatusSoftphoneVoip("Conectando telefone no navegador...");

    const [{ Device }, tokenData] = await Promise.all([
      carregarSdkVoip(),
      novoTokenVoip()
    ]);

    const device = new Device(tokenData.token, {
      logLevel: 1,
      closeProtection: true
    });

    device.on("registered", () => {
      atualizarStatusSoftphoneVoip("Telefone pronto para ligar e receber");
      atualizarBotoesVoip(Boolean(voipCall));
    });

    device.on("unregistered", () => {
      if (!voipCall) atualizarStatusSoftphoneVoip("Telefone desconectado. Reconectando...");
    });

    device.on("error", (err) => {
      atualizarStatusSoftphoneVoip(err?.message || "Erro no telefone do navegador");
    });

    device.on("tokenWillExpire", async () => {
      try {
        const novo = await novoTokenVoip();
        device.updateToken(novo.token);
      } catch (err) {
        console.error("VOIP token refresh:", err);
      }
    });

    device.on("incoming", (call) => {
      voipIncomingCall = call;
      const origem =
        call?.parameters?.From ||
        call?.customParameters?.get?.("From") ||
        "Número não identificado";

      document.querySelectorAll(".pc-area").forEach((elemento) => {
        elemento.hidden = elemento.id !== "pc_area_voip";
      });
      document.querySelectorAll(".pc-nav-btn").forEach((botao) => {
        botao.classList.toggle("ativo", botao.dataset.area === "voip");
      });

      const box = document.getElementById("pc_voip_incoming");
      const numeroEl = document.getElementById("pc_voip_incoming_numero");
      if (numeroEl) numeroEl.textContent = formatarTelefone(origem);
      if (box) box.hidden = false;

      vincularEventosChamadaVoip(call, "entrada");
      atualizarStatusSoftphoneVoip("Chamada recebida");
    });

    voipDevice = device;
    await device.register();
    return device;
  }

  window.aceitarChamadaVoipPainel = function aceitarChamadaVoipPainel() {
    if (!voipIncomingCall) return;
    try {
      voipIncomingCall.accept();
      atualizarStatusSoftphoneVoip("Conectando chamada...");
    } catch (err) {
      alert(err.message || "Não foi possível atender.");
    }
  };

  window.rejeitarChamadaVoipPainel = function rejeitarChamadaVoipPainel() {
    if (!voipIncomingCall) return;
    try { voipIncomingCall.reject(); } catch (_) {}
    ocultarChamadaRecebidaVoip();
    voipCall = null;
    atualizarBotoesVoip(false);
    atualizarStatusSoftphoneVoip("Telefone pronto");
  };

  window.ligarVoipPainelCliente = async function ligarVoipPainelCliente() {
    if (voipCall) return;

    const input = document.getElementById("pc_voip_numero_destino");
    let digitos = String(input?.value || "").replace(/\D/g, "");

    if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
      digitos = digitos.slice(2);
    }

    if (digitos.length !== 10 && digitos.length !== 11) {
      return alert("Informe um telefone brasileiro com DDD.");
    }

    const destino = `+55${digitos}`;

    try {
      const device = await inicializarSoftphoneVoip();
      if (!device) throw new Error("A telefonia ainda não está ativa.");

      atualizarStatusSoftphoneVoip("Iniciando ligação...");
      atualizarBotoesVoip(true);

      const call = await device.connect({
        params: { To: destino }
      });

      vincularEventosChamadaVoip(call, "saida");
    } catch (err) {
      voipCall = null;
      atualizarBotoesVoip(false);
      atualizarStatusSoftphoneVoip(err?.message || "Não foi possível iniciar a ligação");
      alert(err?.message || "Não foi possível iniciar a ligação.");
    }
  };

  window.desligarVoipPainelCliente = function desligarVoipPainelCliente() {
    if (!voipCall) return;
    try { voipCall.disconnect(); } catch (_) {}
  };

  window.mutarVoipPainelCliente = function mutarVoipPainelCliente() {
    if (!voipCall) return;
    const botao = document.getElementById("pc_voip_mutar");
    const mutado = voipCall.isMuted?.() === true;
    try {
      voipCall.mute(!mutado);
      if (botao) botao.textContent = mutado ? "🔇 Mutar" : "🔊 Ativar áudio";
    } catch (err) {
      alert(err?.message || "Não foi possível alterar o microfone.");
    }
  };

  async function carregarVoip(silencioso = false) {
    const configEl = document.getElementById("pc_voip_config");
    const chamadasEl = document.getElementById("pc_voip_chamadas");
    if (!configEl || !chamadasEl) return;

    if (!silencioso) {
      configEl.innerHTML = '<div class="pc-vazio">Consultando a telefonia...</div>';
    }

    try {
      const [config, historico, custosVoip] = await Promise.all([
        requisicaoPainel("/painel-cliente/voip/configuracao"),
        requisicaoPainel("/painel-cliente/voip/chamadas"),
        requisicaoPainel("/painel-cliente/voip/custos")
      ]);

      voipConfigAtual = config;
      const ativo = config.ativo === true;

      if (!ativo && voipDevice) {
        await destruirSoftphoneVoip();
        voipConfigAtual = config;
      }

      const emChamada = Boolean(voipCall);
      const minutos = Number(config.minutos_usados_mes || 0);
      const limite = Number(config.limite_minutos_mensal || 0);
      const restantes = Number(config.minutos_restantes_mes || 0);
      const custoMes = custosVoip?.resumo?.custos || {};
      const consumoMes = custosVoip?.resumo?.consumo || {};
      const custoParcial = Number(consumoMes.custos_estimados || 0) > 0;

      configEl.innerHTML = `
        <div style="width:100%">
          <div class="pc-voip-icone">${ativo ? "☎️" : "📞"}</div>
          <h2>${ativo ? "Telefonia ativa" : "VoIP preparado"}</h2>
          <p>${htmlSeguro(config.mensagem || "Telefonia preparada.")}</p>
          <span class="pc-voip-status ${ativo ? "ativo" : "preparado"}">${ativo ? `Linha ${htmlSeguro(config.numero || "")}` : "Sem linha contratada · custo externo zero"}</span>
          <div class="pc-voip-chamada-status" style="margin-top:12px;border-color:rgba(59,130,246,.3);background:rgba(37,99,235,.08)">
            <strong>VoIP no mês: ${formatarMoeda(custoMes.valor_repassado_brl || 0)}</strong>
            <div style="margin-top:5px;color:#93a4bb">Número: ${formatarMoeda(custoMes.numero_brl || 0)} · Ligações: ${formatarMoeda(custoMes.chamadas_brl || 0)} · ${Number(consumoMes.chamadas || 0)} chamada(s)</div>
            <div style="margin-top:5px;color:${custoParcial ? "#fbbf24" : "#86efac"}">${custoParcial ? "Parte do valor ainda é estimada e será conciliada com a Twilio." : "Custos das chamadas encerradas conciliados."}</div>
            <div style="margin-top:5px;color:#bfdbfe"><b>Este valor é cobrado separadamente da mensalidade da plataforma.</b></div>
          </div>
          ${ativo ? `
            <div class="pc-voip-softphone">
              <input id="pc_voip_numero_destino" inputmode="tel" placeholder="DDD + telefone, ex.: (11) 99999-9999" ${emChamada ? "disabled" : ""}>
              <div class="pc-voip-botoes">
                <button id="pc_voip_ligar" class="pc-voip-ligar" onclick="ligarVoipPainelCliente()" ${emChamada ? "disabled" : ""}>📞 Ligar</button>
                <button id="pc_voip_desligar" class="pc-voip-desligar" onclick="desligarVoipPainelCliente()" ${emChamada ? "" : "hidden"}>Desligar</button>
                <button id="pc_voip_mutar" class="pc-voip-desligar" style="background:#334155" onclick="mutarVoipPainelCliente()" ${emChamada ? "" : "hidden"}>🔇 Mutar</button>
              </div>
              <div id="pc_voip_chamada_status" class="pc-voip-chamada-status"><strong>${emChamada ? "Ligação em andamento" : "Preparando telefone no navegador..."}</strong></div>
              <div id="pc_voip_incoming" class="pc-voip-incoming" hidden>
                <b>📲 Chamada recebida</b>
                <span id="pc_voip_incoming_numero">Número não identificado</span>
                <div class="pc-voip-incoming-acoes">
                  <button class="pc-voip-aceitar" onclick="aceitarChamadaVoipPainel()">Atender</button>
                  <button class="pc-voip-rejeitar" onclick="rejeitarChamadaVoipPainel()">Recusar</button>
                </div>
              </div>
              <div class="pc-voip-chamada-status"><strong>Uso mensal:</strong> ${minutos} de ${limite || "∞"} min${limite ? ` · ${restantes} min restantes` : ""}</div>
            </div>
          ` : `
            <div class="pc-voip-chamada-status"><strong>Pronto, mas inativo:</strong> o gestor pode preparar toda a estrutura sem cobrança. A contratação real do número é uma ação separada e protegida por confirmação.</div>
          `}
        </div>
      `;

      const chamadas = Array.isArray(historico.chamadas) ? historico.chamadas : [];
      chamadasEl.innerHTML = chamadas.length
        ? chamadas.map((item) => {
            const direcao = item.direcao === "entrada" ? "⬇ Recebida" : "⬆ Realizada";
            return `<div class="pc-chamada-item"><div><strong>${htmlSeguro(item.lead_nome || formatarTelefone(item.telefone))}</strong><span>${direcao} · ${formatarDataPainelCliente(item.iniciada_em, true)} · ${formatarDuracaoVoip(item.duracao_segundos)}</span></div><b>${htmlSeguro(rotuloStatusChamadaVoip(item.status))}</b></div>`;
          }).join("")
        : '<div class="pc-vazio">Nenhuma ligação realizada ou recebida.</div>';

      if (ativo) {
        try {
          await inicializarSoftphoneVoip();
        } catch (err) {
          atualizarStatusSoftphoneVoip(err?.message || "Não foi possível conectar o telefone no navegador");
        }
      }
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

      const linhas = itens.map((item) =>
        `<div class="pc-fin-item"><div><strong>${htmlSeguro(item.descricao)}</strong><span class="pc-fin-tag ${item.status === "ativo" ? "ativo" : ""}">${htmlSeguro(labelStatusFinanceiro(item.status))}</span></div><b>${formatarMoeda(item.status === "ativo" ? item.valor : 0)}</b></div>`
      ).join("");

      const historicoHtml = historico.length
        ? historico.map((item) => `<div class="pc-fin-item"><div><strong>${new Date(item.mes_referencia).toLocaleDateString("pt-BR", { month:"long", year:"numeric", timeZone:"UTC" })}</strong><span class="pc-fin-tag ${item.status === "pago" ? "ativo" : ""}">${htmlSeguro(labelStatusFinanceiro(item.status))}</span></div><b>${formatarMoeda(item.valor)}</b></div>`).join("")
        : '<div class="pc-vazio">Nenhuma cobrança mensal emitida até o momento.</div>';

      const statusVoip = voip.custo_status === "parcialmente_estimado"
        ? "Valor parcial/estimado"
        : "Valor conciliado";

      container.innerHTML = `
        <div class="pc-fin-resumo">
          <article class="pc-card">
            <span>Plano da plataforma</span>
            <h2 style="margin-top:7px">${htmlSeguro(plano.nome || "Plano Gestão de Tráfego")}</h2>
            <p class="pc-card-sub">Vencimento todo dia ${Number(plano.dia_vencimento || 10)}</p>
            <strong style="font-size:25px;color:#fff">${formatarMoeda(plano.valor_mensal)}<small style="font-size:11px;color:#8190a7">/mês</small></strong>
          </article>
          <article class="pc-card" style="border-color:rgba(59,130,246,.34)">
            <span>VoIP — adicional separado</span>
            <h2 style="margin-top:7px">${voip.numero ? htmlSeguro(voip.numero) : htmlSeguro(labelStatusFinanceiro(voip.status))}</h2>
            <p class="pc-card-sub">${Number(voip.chamadas || 0)} chamada(s) · ${Number(voip.minutos || 0).toLocaleString("pt-BR")} min · ${htmlSeguro(statusVoip)}</p>
            <strong style="font-size:25px;color:#93c5fd">${formatarMoeda(voip.valor_a_pagar_brl || 0)}<small style="font-size:11px;color:#8190a7"> neste mês</small></strong>
          </article>
          <article class="pc-card pc-fin-total">
            <span>Mensalidade da plataforma</span>
            <h2 style="margin-top:7px">Total do plano</h2>
            <p class="pc-card-sub">Não inclui VoIP nem verba de anúncios</p>
            <strong style="font-size:28px;color:#86efac">${formatarMoeda(data.total_mensal_plataforma ?? data.total_mensal)}<small style="font-size:11px;color:#8190a7">/mês</small></strong>
          </article>
        </div>

        <div class="pc-fin-alerta" style="margin:0 0 16px;border-color:rgba(59,130,246,.32);background:rgba(37,99,235,.09);color:#bfdbfe">
          📞 <b>O VoIP é cobrado à parte.</b> No mês atual: número ${formatarMoeda(voip.custo_numero_brl || 0)} + ligações ${formatarMoeda(voip.custo_chamadas_brl || 0)} = <b>${formatarMoeda(voip.valor_a_pagar_brl || 0)}</b>.
        </div>

        <div class="pc-voip-grade">
          <article class="pc-card">
            <h2>Composição da mensalidade da plataforma</h2>
            <p class="pc-card-sub">O consumo VoIP não entra neste total.</p>
            <div class="pc-fin-itens">${linhas}</div>
            <div class="pc-fin-alerta">💡 ${htmlSeguro(data.investimento_anuncios?.mensagem || "A verba de anúncios é paga separadamente às plataformas.")}</div>
            ${data.observacoes ? `<div class="pc-fin-alerta" style="border-color:rgba(59,130,246,.22);background:rgba(37,99,235,.07);color:#bfdbfe">${htmlSeguro(data.observacoes)}</div>` : ""}
          </article>
          <article class="pc-card">
            <h2>Histórico de cobranças da plataforma</h2>
            <p class="pc-card-sub">Não inclui o consumo variável de VoIP.</p>
            ${historicoHtml}
          </article>
        </div>

        <article class="pc-card" style="margin-top:16px">
          <h2>Custos separados e variáveis</h2>
          <p class="pc-card-sub">São apresentados fora da mensalidade base para manter total transparência.</p>
          <div class="pc-fin-custos">${custos.map((item) => `<div class="pc-fin-custo">${htmlSeguro(item)}</div>`).join("")}</div>
        </article>
      `;
    } catch (err) {
      container.innerHTML = `<div class="pc-vazio">${htmlSeguro(err.message)}</div>`;
    }
  }

  function instalarExtensoes() {
    injetarEstilos();

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
        await destruirSoftphoneVoip();
        conversaSelecionadaId = null;
        whatsappPainelPronto = false;
        whatsappDiagnosticoCarregado = false;
        modelosWhatsappPainel = [];
        modelosWhatsappCarregados = false;
        envioMidiaPainel = false;
        removerControlesGestorDoPainelCliente();
        const retorno = await original.call(this, perfil);
        montarRecursosPainel(perfil);
        return retorno;
      };
    }

    if (typeof logout === "function") {
      const original = logout;
      logout = function logoutComRecursos(...args) {
        clearInterval(atualizacaoConversas);
        destruirSoftphoneVoip();
        return original.apply(this, args);
      };
    }
  }

  instalarExtensoes();
})();
