(() => {
  const landingRoot = document.querySelector("#landingPage .landing-page-inner");
  if (!landingRoot) return;

  const rocketLogo =
    document.querySelector("#landingPage .login-scene-rocket")?.src ||
    "rocket-logo.png";

  const whatsappDemo =
    "https://wa.me/5511910079616?text=Ol%C3%A1%21%20Quero%20uma%20demonstra%C3%A7%C3%A3o%20de%2030%20minutos%20da%20Plataforma%20de%20Leads.";
  const whatsappContato =
    "https://wa.me/5511910079616?text=Ol%C3%A1%21%20Gostaria%20de%20conhecer%20a%20Plataforma%20de%20Leads.";

  landingRoot.innerHTML = `
    <header class="pl-nav">
      <a class="pl-brand" href="/" aria-label="Plataforma de Leads">
        <img src="${rocketLogo}" alt="">
        <span>
          <strong>Plataforma de Leads</strong>
          <small>Gestão Inteligente de Clientes</small>
        </span>
      </a>

      <nav class="pl-nav-links" aria-label="Navegação principal">
        <a href="#como-funciona">Como funciona</a>
        <a href="#recursos">Recursos</a>
        <a href="#segmentos">Para quem é</a>
      </nav>

      <div class="pl-nav-actions">
        <a class="pl-btn pl-btn-ghost" href="${whatsappContato}" target="_blank" rel="noopener noreferrer">
          Falar com especialista
        </a>
        <button class="pl-btn pl-btn-primary" type="button" onclick="mostrarLoginNaLanding()">
          Entrar
        </button>
      </div>
    </header>

    <main class="pl-main">
      <section class="pl-hero">
        <div class="pl-hero-copy">
          <div class="pl-pill">
            <span class="pl-pill-dot"></span>
            ANÚNCIOS + WHATSAPP + IA + CRM
          </div>

          <h1>
            Seu lead não precisa esperar
            <span>você ficar disponível.</span>
          </h1>

          <p class="pl-hero-text">
            A Plataforma de Leads conecta aquisição, atendimento e vendas.
            O lead chega dos seus anúncios, recebe o primeiro atendimento no WhatsApp,
            é qualificado pela IA e entra organizado no CRM para você negociar e fechar.
          </p>

          <div class="pl-hero-actions">
            <a class="pl-btn pl-btn-accent" href="${whatsappDemo}" target="_blank" rel="noopener noreferrer">
              Ver demonstração de 30 min
              <span aria-hidden="true">↗</span>
            </a>
            <button class="pl-btn pl-btn-secondary" type="button" onclick="mostrarLoginNaLanding()">
              Já sou cliente
            </button>
          </div>

          <div class="pl-platforms" aria-label="Plataformas suportadas">
            <span><b>M</b> Meta</span>
            <span><b>G</b> Google</span>
            <span><b>♪</b> TikTok</span>
            <span><b>in</b> LinkedIn</span>
          </div>
        </div>

        <div class="pl-command-center" aria-label="Demonstração visual do fluxo da plataforma">
          <div class="pl-command-topbar">
            <div>
              <span class="pl-window-dot"></span>
              <span class="pl-window-dot"></span>
              <span class="pl-window-dot"></span>
            </div>
            <strong>Central de Operações</strong>
            <span class="pl-live"><i></i> conectado</span>
          </div>

          <div class="pl-command-grid">
            <aside class="pl-command-sidebar">
              <span class="active">Visão geral</span>
              <span>Campanhas</span>
              <span>Leads</span>
              <span>WhatsApp</span>
              <span>CRM</span>
              <span>IA</span>
              <span>Relatórios</span>
            </aside>

            <div class="pl-command-content">
              <div class="pl-source-strip">
                <div><span class="meta">M</span><small>Meta</small><b>Novo lead</b></div>
                <div><span class="google">G</span><small>Google</small><b>Campanha ativa</b></div>
                <div><span class="tiktok">♪</span><small>TikTok</small><b>Lead recebido</b></div>
              </div>

              <div class="pl-operation-row">
                <article class="pl-chat-card">
                  <header>
                    <div class="pl-avatar">MS</div>
                    <div>
                      <strong>Marcos</strong>
                      <small>Novo lead · Imóveis</small>
                    </div>
                    <span>WhatsApp</span>
                  </header>

                  <div class="pl-chat">
                    <p class="bot">Olá, Marcos! Posso te ajudar a encontrar o imóvel ideal. Você procura comprar, alugar ou investir?</p>
                    <p class="user">Comprar.</p>
                    <p class="bot">Ótimo. Em qual região você pretende comprar?</p>
                  </div>

                  <footer>
                    <span class="pl-ai-status">✦ IA atendendo</span>
                    <small>Primeiro contato automático</small>
                  </footer>
                </article>

                <article class="pl-lead-card">
                  <div class="pl-lead-head">
                    <div>
                      <small>QUALIFICAÇÃO</small>
                      <strong>Lead pronto para avançar</strong>
                    </div>
                    <span>IA</span>
                  </div>

                  <div class="pl-score-ring">
                    <div>
                      <strong>Alta</strong>
                      <small>prioridade</small>
                    </div>
                  </div>

                  <ul>
                    <li><span>Interesse</span><b>Compra</b></li>
                    <li><span>Origem</span><b>Meta Ads</b></li>
                    <li><span>Próxima ação</span><b>Contato humano</b></li>
                  </ul>
                </article>
              </div>

              <div class="pl-pipeline">
                <div class="pl-pipeline-head">
                  <div>
                    <strong>CRM comercial</strong>
                    <small>O lead continua organizado depois da IA</small>
                  </div>
                  <span>Atualização automática</span>
                </div>

                <div class="pl-pipeline-columns">
                  <div>
                    <header>Novo <b>●</b></header>
                    <article><strong>Marcos</strong><small>Imóveis · Meta</small></article>
                  </div>
                  <div>
                    <header>Em conversa <b>●</b></header>
                    <article><strong>Ana</strong><small>Plano de saúde</small></article>
                  </div>
                  <div>
                    <header>Negociação <b>●</b></header>
                    <article><strong>Rafael</strong><small>Suplementos</small></article>
                  </div>
                  <div class="done">
                    <header>Fechado <b>●</b></header>
                    <article><strong>Venda concluída</strong><small>Histórico preservado</small></article>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="pl-command-caption">
            <span>Fluxo ilustrativo</span>
            <strong>Do anúncio ao fechamento em uma única operação.</strong>
          </div>
        </div>
      </section>

      <section class="pl-value-bar" aria-label="Principais benefícios">
        <div><span>01</span><strong>Responda mais rápido</strong><small>O lead recebe atenção desde o primeiro contato.</small></div>
        <div><span>02</span><strong>Organize automaticamente</strong><small>Origem, histórico e etapa comercial ficam centralizados.</small></div>
        <div><span>03</span><strong>Priorize com IA</strong><small>Saiba quais oportunidades merecem atenção primeiro.</small></div>
        <div><span>04</span><strong>Feche com contexto</strong><small>Entre na conversa sabendo o que o cliente procura.</small></div>
      </section>

      <section class="pl-section pl-problem" id="como-funciona">
        <div class="pl-section-heading">
          <span class="pl-overline">POR QUE CENTRALIZAR?</span>
          <h2>O problema não é gerar lead. É perder o timing depois que ele chega.</h2>
          <p>
            Quando anúncio, WhatsApp, planilha e CRM ficam separados, o atendimento atrasa,
            o histórico se perde e a equipe trabalha sem contexto. A plataforma conecta essas etapas.
          </p>
        </div>

        <div class="pl-compare">
          <article class="pl-compare-card pl-before">
            <span class="pl-compare-label">SEM A PLATAFORMA</span>
            <h3>Operação fragmentada</h3>
            <ul>
              <li>Leads espalhados em várias fontes</li>
              <li>Resposta depende de alguém estar disponível</li>
              <li>WhatsApp sem contexto da campanha</li>
              <li>CRM atualizado manualmente</li>
            </ul>
          </article>

          <div class="pl-compare-arrow" aria-hidden="true">→</div>

          <article class="pl-compare-card pl-after">
            <span class="pl-compare-label">COM A PLATAFORMA</span>
            <h3>Uma jornada contínua</h3>
            <ul>
              <li>Campanhas e leads centralizados</li>
              <li>IA inicia o atendimento no WhatsApp</li>
              <li>Qualificação registrada automaticamente</li>
              <li>Você assume no momento de negociar</li>
            </ul>
          </article>
        </div>
      </section>

      <section class="pl-section" id="recursos">
        <div class="pl-section-heading pl-centered">
          <span class="pl-overline">UM ÚNICO AMBIENTE</span>
          <h2>As ferramentas que normalmente ficam separadas passam a trabalhar juntas.</h2>
        </div>

        <div class="pl-bento">
          <article class="pl-bento-card pl-bento-wide">
            <div class="pl-bento-icon">◎</div>
            <span class="pl-card-tag">CAMPANHAS</span>
            <h3>Criação e acompanhamento multiplataforma</h3>
            <p>
              Trabalhe com campanhas da Meta, Google, TikTok e LinkedIn sem perder a visão
              consolidada da operação.
            </p>
            <div class="pl-mini-platforms">
              <span>Meta</span><span>Google</span><span>TikTok</span><span>LinkedIn</span>
            </div>
          </article>

          <article class="pl-bento-card">
            <div class="pl-bento-icon">✦</div>
            <span class="pl-card-tag">INTELIGÊNCIA ARTIFICIAL</span>
            <h3>Qualificação que prepara a negociação</h3>
            <p>A IA coleta informações, organiza contexto e ajuda a priorizar o atendimento humano.</p>
          </article>

          <article class="pl-bento-card">
            <div class="pl-bento-icon">◉</div>
            <span class="pl-card-tag">WHATSAPP</span>
            <h3>Primeiro atendimento 24h</h3>
            <p>O lead pode ser recebido e conduzido por um roteiro específico do seu negócio.</p>
          </article>

          <article class="pl-bento-card">
            <div class="pl-bento-icon">⇄</div>
            <span class="pl-card-tag">CRM</span>
            <h3>Funil visual e histórico centralizado</h3>
            <p>Novos contatos, conversas, negociações, fechamentos e perdas ficam organizados por etapa.</p>
          </article>

          <article class="pl-bento-card pl-bento-wide pl-bento-insight">
            <div class="pl-insight-copy">
              <div class="pl-bento-icon">↗</div>
              <span class="pl-card-tag">PERFORMANCE</span>
              <h3>Entenda de onde vêm as oportunidades que avançam.</h3>
              <p>
                Campanha, lead, atendimento e conversão ficam conectados para facilitar a análise
                da operação e das ações comerciais.
              </p>
            </div>
            <div class="pl-insight-visual" aria-hidden="true">
              <span style="--h:38%"></span>
              <span style="--h:56%"></span>
              <span style="--h:46%"></span>
              <span style="--h:72%"></span>
              <span style="--h:63%"></span>
              <span style="--h:88%"></span>
            </div>
          </article>
        </div>
      </section>

      <section class="pl-section pl-flow-section">
        <div class="pl-section-heading">
          <span class="pl-overline">FLUXO COMPLETO</span>
          <h2>Da mídia ao vendedor, cada etapa sabe o que aconteceu antes.</h2>
        </div>

        <div class="pl-flow">
          <article>
            <span class="pl-flow-number">01</span>
            <div class="pl-flow-icon">📣</div>
            <h3>Anúncio gera interesse</h3>
            <p>O contato chega vinculado à campanha e à origem correta.</p>
          </article>
          <i aria-hidden="true">→</i>
          <article>
            <span class="pl-flow-number">02</span>
            <div class="pl-flow-icon">💬</div>
            <h3>WhatsApp responde</h3>
            <p>A IA inicia o atendimento usando o roteiro daquele nicho.</p>
          </article>
          <i aria-hidden="true">→</i>
          <article>
            <span class="pl-flow-number">03</span>
            <div class="pl-flow-icon">✦</div>
            <h3>IA qualifica</h3>
            <p>As respostas viram contexto para priorização e continuidade.</p>
          </article>
          <i aria-hidden="true">→</i>
          <article>
            <span class="pl-flow-number">04</span>
            <div class="pl-flow-icon">🤝</div>
            <h3>Você negocia e fecha</h3>
            <p>O atendimento humano entra com histórico e objetivo claros.</p>
          </article>
        </div>
      </section>

      <section class="pl-section" id="segmentos">
        <div class="pl-section-heading pl-centered">
          <span class="pl-overline">ADAPTÁVEL AO SEU NEGÓCIO</span>
          <h2>Uma estrutura comercial. Roteiros e jornadas diferentes para cada nicho.</h2>
          <p>A plataforma pode trabalhar com perguntas, qualificação e fluxo específicos conforme o tipo de operação.</p>
        </div>

        <div class="pl-segments">
          <article>
            <span>🏠</span>
            <h3>Imóveis</h3>
            <p>Compra, aluguel, investimento, região e perfil do imóvel.</p>
          </article>
          <article>
            <span>🩺</span>
            <h3>Planos de saúde</h3>
            <p>Perfil, quantidade de vidas, faixa etária e tipo de contratação.</p>
          </article>
          <article>
            <span>⚡</span>
            <h3>Suplementos</h3>
            <p>Necessidade, objetivo do cliente e encaminhamento comercial.</p>
          </article>
          <article>
            <span>🎓</span>
            <h3>Faculdades</h3>
            <p>Curso, modalidade, turno, forma de ingresso e campus.</p>
          </article>
          <article>
            <span>🦷</span>
            <h3>Dentistas</h3>
            <p>Tratamento, região, tipo de atendimento e interesse do paciente.</p>
          </article>
          <article class="pl-segment-more">
            <span>+</span>
            <h3>Outros segmentos</h3>
            <p>A estrutura pode ser configurada conforme sua jornada de vendas.</p>
          </article>
        </div>
      </section>

      <section class="pl-final">
        <div class="pl-final-copy">
          <span class="pl-overline">VEJA FUNCIONANDO</span>
          <h2>Em 30 minutos você entende o fluxo completo da plataforma.</h2>
          <p>
            Apresentamos os módulos, mostramos como o lead percorre a jornada e tiramos suas dúvidas
            em uma demonstração rápida pelo Google Meet.
          </p>
        </div>

        <div class="pl-final-actions">
          <a class="pl-btn pl-btn-accent pl-btn-large" href="${whatsappDemo}" target="_blank" rel="noopener noreferrer">
            Quero uma demonstração
            <span aria-hidden="true">↗</span>
          </a>
          <button class="pl-btn pl-btn-secondary pl-btn-large" type="button" onclick="mostrarLoginNaLanding()">
            Entrar na plataforma
          </button>
        </div>
      </section>
    </main>

    <footer class="pl-footer">
      <div class="pl-footer-brand">
        <img src="${rocketLogo}" alt="">
        <div>
          <strong>Plataforma de Leads</strong>
          <span>Desenvolvida por Milton Santos</span>
        </div>
      </div>

      <div class="pl-footer-company">
        Operada por <strong>55.848.095 MICHELE CRISTINE DOS SANTOS</strong> (MEI) · CNPJ 55.848.095/0001-90
      </div>

      <nav class="pl-footer-links" aria-label="Links institucionais">
        <a href="mailto:contato@plataformadeleads.com.br">Contato</a>
        <a href="/empresa" target="_blank" rel="noopener noreferrer">Empresa</a>
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacidade</a>
        <a href="/terms" target="_blank" rel="noopener noreferrer">Termos</a>
      </nav>
    </footer>
  `;
})();
