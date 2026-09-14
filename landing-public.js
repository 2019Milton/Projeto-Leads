(() => {
  const landingRoot = document.querySelector("#landingPage .landing-page-inner");
  if (!landingRoot) return;

  // Reaproveita a URL já resolvida pelo servidor/empacotador a partir do logo
  // original da página, evitando caminhos quebrados em desenvolvimento e produção.
  const rocketLogo =
    landingRoot.querySelector(".rocket-icon")?.src ||
    document.querySelector("#landingPage .login-scene-rocket")?.src ||
    "rocket-logo.png";

  const whatsappApresentacao =
    "https://wa.me/5511910079616?text=Ol%C3%A1%21%20Gostaria%20de%20conhecer%20a%20Plataforma%20de%20Leads.";
  const whatsappPlano =
    "https://wa.me/5511910079616?text=Ol%C3%A1%21%20Quero%20saber%20mais%20sobre%20o%20plano%20%C3%BAnico%20da%20Plataforma%20de%20Leads.";
  const whatsappDemonstracao =
    "https://wa.me/5511910079616?text=Ol%C3%A1%21%20Gostaria%20de%20uma%20apresenta%C3%A7%C3%A3o%20da%20Plataforma%20de%20Leads.";

  landingRoot.innerHTML = `
    <header class="landing-nav">
      <div class="landing-brand">
        <img src="${rocketLogo}" alt="Logo da Plataforma de Leads">
        <span>
          <strong>Plataforma de Leads</strong>
          <small>Gestão inteligente de clientes</small>
        </span>
      </div>
      <div class="landing-nav-actions">
        <a class="landing-button landing-button-whatsapp" href="${whatsappApresentacao}" target="_blank" rel="noopener noreferrer">
          💬 Falar no WhatsApp
        </a>
        <button type="button" class="landing-button landing-button-primary" onclick="mostrarLoginNaLanding()">
          Entrar
        </button>
      </div>
    </header>

    <main>
      <section class="landing-hero">
        <div class="landing-hero-copy">
          <span class="landing-eyebrow">🚀 Campanhas, leads e atendimento em um só lugar</span>
          <h1 class="landing-title">Transforme anúncios em <span>vendas organizadas.</span></h1>
          <p class="landing-subtitle">
            Conecte Meta Ads, Google Ads e TikTok Ads, publique campanhas, receba seus leads
            automaticamente e conduza cada oportunidade com inteligência artificial e WhatsApp.
          </p>
          <div class="landing-hero-actions">
            <button type="button" class="landing-button landing-button-primary" onclick="mostrarLoginNaLanding()">
              Acessar minha conta →
            </button>
            <a class="landing-button landing-button-whatsapp" href="${whatsappApresentacao}" target="_blank" rel="noopener noreferrer">
              💬 Quero conhecer a plataforma
            </a>
          </div>
          <div class="landing-hero-proof" aria-label="Principais diferenciais">
            <span>✓ Plano único</span>
            <span>✓ Todos os recursos inclusos</span>
            <span>✓ Integrações oficiais</span>
          </div>
        </div>

        <div class="landing-product-card" aria-label="Visão resumida da plataforma">
          <div class="landing-product-head">
            <span>Visão geral das campanhas</span>
            <span class="landing-live">Sincronizado</span>
          </div>
          <div class="landing-platforms">
            <span>∞ Meta Ads</span>
            <span>▦ Google Ads</span>
            <span>♪ TikTok Ads</span>
          </div>
          <div class="landing-product-metrics">
            <div><small>Leads organizados</small><strong>247</strong></div>
            <div><small>Taxa de conversão</small><strong>18,4%</strong></div>
            <div><small>Campanhas ativas</small><strong>12</strong></div>
          </div>
          <div class="landing-product-chart" aria-hidden="true">
            <svg viewBox="0 0 420 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="landingChartFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#2dd4bf" stop-opacity=".32"></stop>
                  <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0"></stop>
                </linearGradient>
              </defs>
              <path d="M0 82 C35 78 45 55 75 61 S118 74 145 53 S190 30 218 42 S262 68 292 46 S340 18 370 31 S398 20 420 12 L420 100 L0 100 Z" fill="url(#landingChartFill)"></path>
              <path d="M0 82 C35 78 45 55 75 61 S118 74 145 53 S190 30 218 42 S262 68 292 46 S340 18 370 31 S398 20 420 12" fill="none" stroke="#5eead4" stroke-width="4" stroke-linecap="round"></path>
            </svg>
          </div>
          <div class="landing-product-note">
            🤖 A IA ajuda a priorizar oportunidades, analisar campanhas e indicar os próximos passos.
          </div>
        </div>
      </section>

      <section class="landing-section">
        <div class="landing-section-head">
          <div>
            <span class="landing-section-kicker">Uma operação completa</span>
            <h2 class="landing-section-title">Do anúncio ao atendimento, sem perder nenhum lead.</h2>
          </div>
          <p class="landing-section-description">
            Centralize ferramentas que normalmente ficam separadas e acompanhe toda a jornada comercial em uma única tela.
          </p>
        </div>
        <div class="landing-benefits">
          <article class="landing-benefit">
            <span class="landing-benefit-icon">📣</span>
            <h3>Campanhas multiplataforma</h3>
            <p>Crie, publique, pause e acompanhe campanhas da Meta, Google e TikTok respeitando as regras de cada rede.</p>
          </article>
          <article class="landing-benefit">
            <span class="landing-benefit-icon">🧭</span>
            <h3>Central de Leads</h3>
            <p>Receba contatos automaticamente, identifique a campanha de origem e organize cada etapa do atendimento.</p>
          </article>
          <article class="landing-benefit">
            <span class="landing-benefit-icon">🤖</span>
            <h3>Inteligência artificial</h3>
            <p>Gere criativos, analise resultados e priorize as oportunidades com maior potencial de conversão.</p>
          </article>
          <article class="landing-benefit">
            <span class="landing-benefit-icon">💬</span>
            <h3>WhatsApp integrado</h3>
            <p>Conduza conversas, automatize a qualificação e mantenha o histórico comercial conectado aos leads.</p>
          </article>
        </div>
      </section>

      <section class="landing-section">
        <div class="landing-section-head">
          <div>
            <span class="landing-section-kicker">Feita para vender melhor</span>
            <h2 class="landing-section-title">Para negócios que dependem de novos contatos.</h2>
          </div>
        </div>
        <ul class="landing-audience-tags">
          <li>🏠 Corretores de imóveis</li>
          <li>🛡️ Corretores de seguros</li>
          <li>📡 Telecom empresarial</li>
          <li>🏪 Negócios e serviços locais</li>
        </ul>
      </section>

      <section class="landing-section">
        <div class="landing-section-head">
          <div>
            <span class="landing-section-kicker">Simples de operar</span>
            <h2 class="landing-section-title">Como a Plataforma de Leads funciona.</h2>
          </div>
        </div>
        <ol class="landing-steps">
          <li><strong>Conecte</strong>Autorize suas contas da Meta Ads, Google Ads e TikTok Ads com segurança.</li>
          <li><strong>Crie e publique</strong>Monte campanhas adequadas para cada plataforma com apoio da IA.</li>
          <li><strong>Receba os leads</strong>Formulários e conversas chegam organizados automaticamente.</li>
          <li><strong>Acompanhe e converta</strong>Priorize contatos, analise resultados e conduza o atendimento.</li>
        </ol>
      </section>

      <section class="landing-section landing-plan-section">
        <div class="landing-plan-copy">
          <span class="landing-plan-badge">✦ Plano único</span>
          <h2 class="landing-section-title">Tudo o que a plataforma oferece, em um só plano.</h2>
          <p>
            Sem níveis separados ou recursos bloqueados por categoria. O acesso reúne campanhas,
            gestão de leads, inteligência artificial, relatórios e WhatsApp em uma solução completa.
          </p>
        </div>
        <div class="landing-plan-card">
          <h3>Plataforma completa</h3>
          <p>Todos os recursos inclusos</p>
          <ul class="landing-plan-list">
            <li>Meta, Google e TikTok Ads</li>
            <li>Central de Leads e histórico</li>
            <li>IA para criativos e campanhas</li>
            <li>Priorização inteligente de leads</li>
            <li>WhatsApp Bot integrado</li>
            <li>Relatórios de desempenho</li>
          </ul>
          <div class="landing-plan-actions">
            <a class="landing-button landing-button-whatsapp" href="${whatsappPlano}" target="_blank" rel="noopener noreferrer">
              💬 Consultar condições
            </a>
            <button type="button" class="landing-button landing-button-ghost" onclick="mostrarLoginNaLanding()">
              Já sou cliente
            </button>
          </div>
        </div>
      </section>

      <section class="landing-final-cta">
        <div>
          <h2>Quer ver como funciona no seu negócio?</h2>
          <p>Converse diretamente com nossa equipe pelo WhatsApp.</p>
        </div>
        <a class="landing-button landing-button-whatsapp" href="${whatsappDemonstracao}" target="_blank" rel="noopener noreferrer">
          💬 Entrar em contato
        </a>
      </section>
    </main>

    <footer class="landing-footer">
      <div>
        Plataforma desenvolvida por <strong>Milton Santos</strong><br>
        Operada por <strong>55.848.095 MICHELE CRISTINE DOS SANTOS</strong> (MEI) &mdash; CNPJ 55.848.095/0001-90<br>
        Rua Serra do Mar, 490 &mdash; Vila Princesa Isabel, São Paulo - SP &mdash; +55 11 91007-9616
      </div>
      <nav class="landing-footer-links" aria-label="Links institucionais">
        <a href="mailto:contato@plataformadeleads.com.br">Contato</a>
        <a href="/empresa" target="_blank" rel="noopener noreferrer">Dados da Empresa</a>
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacidade</a>
        <a href="/terms" target="_blank" rel="noopener noreferrer">Termos de Serviço</a>
      </nav>
    </footer>
  `;
})();
