// Guia de criação de conta: não cria ativos nem altera a conexão com a Meta.
(function () {
  "use strict";
  const link = (url, texto) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${texto} ↗</a>`;
  const etapas = [
    ["Entre com o perfil que administra o negócio", "Acesso ao Facebook", `
      <li>Use um computador e abra ${link("https://www.facebook.com/", "o Facebook")} em outra guia. Entre com seu perfil pessoal real, que será responsável pela empresa.</li>
      <li>Confira a foto e o nome do perfil antes de continuar. Se estiver no perfil de outra pessoa, saia e entre no correto.</li>
      <li>Tenha acesso ao e-mail e ao celular desse perfil para concluir os códigos de confirmação que a Meta solicitar.</li>
      <li>Se a Meta pedir autenticação de dois fatores, siga a configuração em <strong>Central de Contas → Senha e segurança → Autenticação de dois fatores</strong> e conclua a confirmação.</li>`, "Você consegue acessar o Facebook com o perfil que vai administrar a conta."],
    ["Crie ou selecione o portfólio empresarial", "Meta Business Suite", `
      <li>Abra ${link("https://business.facebook.com/", "o Meta Business Suite")}. Um <strong>portfólio empresarial</strong> reúne os ativos da empresa; ele não é a conta de anúncios.</li>
      <li>Abra o seletor de empresa/portfólio, normalmente no canto superior esquerdo. Se a empresa já aparecer, selecione-a e não crie outra.</li>
      <li>Se não houver portfólio, procure <strong>Criar portfólio empresarial</strong> ou <strong>Criar conta</strong>. Se necessário, use ${link("https://business.facebook.com/overview", "a página inicial para empresas")}.</li>
      <li>Preencha o nome público da empresa (exemplo: <strong>Clínica Exemplo</strong>), seu nome e um e-mail comercial ao qual você tenha acesso. Revise e clique em <strong>Criar</strong> ou <strong>Enviar</strong>.</li>
      <li>Abra o e-mail de confirmação, inclusive a pasta de spam, e confirme se solicitado. Volte à Meta e selecione o portfólio recém-criado.</li>
      <li>Se estiver trabalhando para um cliente, confirme com ele qual portfólio deve ser usado e peça acesso ao negócio dele.</li>`, "O nome da empresa correta aparece como portfólio selecionado."],
    ["Abra Contas de anúncios no negócio correto", "Configurações", `
      <li>No Meta Business Suite, clique em <strong>Configurações</strong> (engrenagem).</li>
      <li>Procure <strong>Contas → Contas de anúncios</strong>. Em algumas versões a opção aparece diretamente como <strong>Contas de anúncios</strong> ou dentro de <strong>Mais configurações do negócio</strong>.</li>
      <li>Você também pode abrir ${link("https://business.facebook.com/settings/ad-accounts", "Contas de anúncios")}. Se a Meta pedir que escolha uma empresa, selecione a do passo 2.</li>
      <li>Confira as contas que já existem: nome, ID e proprietário. Se a conta que você precisa já estiver ali, passe à etapa 7 para conferir seu acesso.</li>`, "Você está na lista de contas de anúncios do portfólio correto."],
    ["Escolha a opção certa: criar, adicionar ou solicitar acesso", "Botão Adicionar", `
      <li>Clique em <strong>Adicionar</strong>. Para começar do zero, escolha <strong>Criar uma nova conta de anúncios</strong>.</li>
      <li><strong>Adicionar uma conta de anúncios existente</strong> é para uma conta que sua empresa já possui. Essa opção pode vincular a propriedade da conta ao portfólio; leia a confirmação antes de continuar.</li>
      <li><strong>Solicitar acesso a uma conta de anúncios</strong> é para administrar uma conta de outra empresa, como a de um cliente. Peça o ID ao proprietário e aguarde que ele aprove o acesso.</li>
      <li>Se já usa uma conta no Gerenciador de Anúncios, confira seu ID antes de criar outra. Uma Página ou um Instagram existente não significa que a conta desejada já esteja neste portfólio.</li>`, "Para uma conta nova, o formulário de criação está aberto. Para conta existente, você confirmou o vínculo ou solicitou o acesso."],
    ["Preencha nome, fuso horário e moeda", "Detalhes da conta nova", `
      <li>Em <strong>Nome da conta de anúncios</strong>, use um nome fácil de reconhecer, por exemplo <strong>Clínica Exemplo | Anúncios Brasil</strong>.</li>
      <li>Em <strong>Fuso horário</strong>, escolha o usado na operação. Para uma empresa que acompanha o horário de Brasília, procure <strong>America/Sao_Paulo (GMT−03:00)</strong>. Se sua região usa outro horário, selecione o correspondente.</li>
      <li>Em <strong>Moeda</strong>, para cobrança em reais, selecione <strong>BRL — Real brasileiro</strong>. Confira a sigla BRL, não apenas o símbolo de moeda.</li>
      <li>Revise os três campos antes de clicar em <strong>Avançar</strong>. Fuso afeta horários e relatórios; moeda afeta cobrança. Uma alteração posterior pode exigir outra conta: não trate esses campos como uma configuração fácil de trocar.</li>`, "O nome identifica a empresa e o fuso e a moeda correspondem à sua operação."],
    ["Revise quem usará a conta e confirme a criação", "Propriedade e confirmação", `
      <li>Se aparecer a pergunta <strong>Quem usará esta conta?</strong>, selecione a opção correspondente à empresa para a qual ela está sendo criada.</li>
      <li>Para anunciar para o seu próprio negócio, escolha <strong>Minha empresa</strong>. Se for cliente, confirme a estrutura com o proprietário antes de vincular a conta à sua empresa.</li>
      <li>Confira novamente o portfólio, o nome, o fuso e a moeda. Leia as condições exibidas e confirme em <strong>Criar conta de anúncios</strong> ou no botão equivalente.</li>
      <li>Espere a confirmação. Se aparecer erro ou limite de criação, consulte “Se algo não aparecer” no final deste guia antes de repetir a operação.</li>`, "A conta aparece na lista com um ID numérico próprio. Criar a conta não publica uma campanha."],
    ["Dê ao seu perfil acesso à conta", "Pessoas e permissões", `
      <li>Selecione a conta criada e procure <strong>Atribuir pessoas</strong>, <strong>Adicionar pessoas</strong> ou <strong>Gerenciar acesso</strong>.</li>
      <li>Escolha seu perfil. Para ser o administrador responsável por campanhas e configurações, habilite <strong>Controle total</strong> ou a permissão de administrador apresentada pela Meta e salve.</li>
      <li>Se seu perfil não aparecer, confira <strong>Usuários → Pessoas</strong> nas configurações do portfólio. Um administrador deve convidar seu e-mail; aceite o convite e peça a atribuição da conta.</li>
      <li>Abra ${link("https://adsmanager.facebook.com/", "o Gerenciador de Anúncios")} e use o seletor de contas para confirmar que você consegue acessar o nome e o ID criados.</li>`, "Seu perfil consegue abrir a conta de anúncios correta no Gerenciador."],
    ["Configure os dados de cobrança e o pagamento", "Cobrança e pagamentos", `
      <li>Abra ${link("https://business.facebook.com/billing_hub/payment_settings", "Configurações de pagamento")}. Confira no seletor o <strong>mesmo ID da conta</strong> criada, pois a tela pode abrir em outra conta.</li>
      <li>Procure <strong>Configurações de pagamento</strong> e <strong>Adicionar forma de pagamento</strong>. Preencha país e dados fiscais/comerciais reais quando solicitados.</li>
      <li>Escolha entre as formas que a Meta disponibilizar para essa conta. As opções dependem do país, da moeda e do tipo de cobrança; cartão, Pix ou boleto não aparecem necessariamente para todas as contas.</li>
      <li>Se for cobrança automática, conclua o cadastro e eventual confirmação do método. Se for pagamento manual/pré-pago, use <strong>Adicionar fundos</strong> e aguarde a confirmação do saldo pela Meta antes de anunciar.</li>
      <li>Confira se há pagamento recusado, saldo pendente ou limite de gastos atingido. Um limite de gastos da conta é diferente do orçamento diário de uma campanha.</li>`, "O método está aceito ou o saldo está disponível na conta correta, sem pendência de cobrança indicada."],
    ["Prepare a Página do Facebook", "Identidade dos anúncios", `
      <li>A conta de anúncios organiza campanhas e cobrança; a <strong>Página</strong> representa a empresa nos anúncios. São coisas diferentes.</li>
      <li>Se já tem uma Página, vá em <strong>Configurações → Contas → Páginas → Adicionar</strong> e escolha adicionar sua Página ou solicitar acesso à de um cliente, conforme o caso.</li>
      <li>Se ainda não tem, abra ${link("https://www.facebook.com/pages/create", "Criar Página")}, preencha nome da empresa e categoria, conclua a criação e adicione a Página ao portfólio.</li>
      <li>Confira se seu perfil também recebeu acesso à Página. Ter acesso à conta de anúncios não garante acesso à Página automaticamente.</li>
      <li>Consulte também as imagens do guia já disponível: <button type="button" data-guia-meta="pagina">Abrir guia ilustrado de Página</button>. Para anúncios no Instagram, siga a próxima etapa.</li>`, "A Página está disponível para o mesmo perfil que vai conectar a Meta à Plataforma de Leads."],
    ["Vincule o Instagram, se for usá-lo", "Etapa opcional", `
      <li>Se não pretende usar o Instagram agora, avance à etapa 11.</li>
      <li>Para usar a identidade da empresa no Instagram, confira se o perfil é profissional e se você tem acesso a ele.</li>
      <li>Nas configurações do negócio, procure <strong>Contas → Contas do Instagram → Adicionar</strong>. Entre no perfil correto e conclua as autorizações solicitadas pela Meta.</li>
      <li>Confira a associação com a Página e, quando a interface oferecer a opção, atribua a conta de anúncios e as pessoas que vão administrar esse Instagram.</li>
      <li>Para conferir a atribuição dos ativos, consulte <button type="button" data-guia-meta="instagram">Abrir guia de Instagram</button>. Depois feche esse guia para retornar à mesma etapa.</li>`, "O Instagram correto aparece nos ativos da empresa e está acessível ao administrador."],
    ["Conecte a conta na Plataforma de Leads", "Volte para Integrações", `
      <li>Feche este guia e, em <strong>Plataformas → Integrações → Meta Ads</strong>, clique em <strong>Conectar</strong>.</li>
      <li>Na janela da Meta, entre com o mesmo perfil usado nas etapas anteriores. Confira e autorize os ativos e permissões necessários para as contas e Páginas que deseja usar.</li>
      <li>Volte à plataforma e abra os detalhes da Meta. No seletor de <strong>Conta de anúncios</strong>, escolha o nome e confira o ID. Confirme a seleção no botão apresentado.</li>
      <li>Clique em <strong>Atualizar plataformas</strong> e confira Página, Conta Ads e Pagamento. Se a conexão já existia antes da criação da conta, atualize e, se ela não aparecer, refaça a autorização para incluir o novo ativo.</li>`, "A plataforma mostra a conta que você criou ou vinculou, e não outra conta do mesmo perfil."],
    ["Escolha como o lead vai chegar", "WhatsApp ou formulário", `
      <li><strong>Conversa pelo WhatsApp:</strong> a pessoa vê o anúncio no Facebook ou Instagram, abre o WhatsApp e envia uma mensagem. Só clicar no anúncio não garante uma conversa recebida.</li>
      <li><strong>Formulário instantâneo:</strong> a pessoa preenche os campos na Meta. O cadastro chega pela integração de leads, mas não inicia automaticamente uma conversa no WhatsApp.</li>
      <li>Se usar formulários instantâneos, verifique o aviso <strong>Termos de Lead Ads</strong>. Abra o link indicado, selecione a Página correta e aceite os termos com um perfil autorizado.</li>
      <li>Volte à Plataforma de Leads, use <strong>Já aceitei</strong> quando exibido e atualize o status.</li>
      <li>Para seguir o fluxo completo deste guia, escolha <strong>destino WhatsApp</strong> na criação da campanha e continue abaixo. Termos de formulário não são uma exigência universal dos anúncios para WhatsApp.</li>`, "Você sabe se receberá uma mensagem ou um cadastro de formulário. As próximas etapas tratam da conversa pelo WhatsApp."],
    ["Prepare o número comercial que receberá as conversas", "Número do WhatsApp", `
      <li>Escolha o número da empresa que deve receber os clientes. Confira DDI e DDD: por exemplo, <strong>+55 + DDD + número</strong> para um número brasileiro.</li>
      <li>Tenha acesso ao aparelho e às confirmações que a Meta solicitar. Se já usa o WhatsApp Business, deixe o aplicativo atualizado e o celular por perto.</li>
      <li>Na Página do Facebook, procure <strong>Configurações → Contas vinculadas → WhatsApp</strong>, ou a área equivalente de WhatsApp nas configurações da empresa. Confira ou associe o número comercial conforme o fluxo disponível.</li>
      <li>Confirme que o número está acessível à Página/empresa e à conta de anúncios usada. O número do anúncio deve ser o mesmo que você conectará à plataforma.</li>
      <li>Se pretende continuar usando o aplicativo no celular, procure a opção de conexão do aplicativo existente na próxima etapa. Não exclua a conta nem transfira o número sem entender o fluxo oferecido pela Meta.</li>`, "O número escolhido pertence à empresa e está disponível para a configuração e as confirmações."],
    ["Conecte o WhatsApp à Plataforma de Leads", "Conexão do WhatsApp", `
      <li>Na plataforma, abra <strong>WhatsApp Bot</strong> e clique em <strong>Conectar meu WhatsApp</strong>. Essa conexão é separada da conexão Meta Ads.</li>
      <li>Na janela oficial da Meta, confira o perfil do Facebook e selecione o portfólio da empresa. Leia as permissões e escolha a conta de WhatsApp e o número corretos.</li>
      <li><strong>Já usa o aplicativo WhatsApp Business?</strong> Quando disponível, escolha <strong>Conectar um app do WhatsApp Business</strong>. Siga as instruções no celular e escaneie o QR Code se solicitado. Esse é o fluxo de coexistência; a disponibilidade depende da conta.</li>
      <li><strong>Ainda não usa o WhatsApp Business no celular?</strong> O botão da plataforma está configurado para conectar o aplicativo existente. Prepare o número no aplicativo WhatsApp Business antes de tentar esse fluxo. Se a Meta não oferecer a conexão do aplicativo, consulte o suporte para verificar a elegibilidade; este guia não confirma um fluxo alternativo de migração ou cadastro direto na API.</li>
      <li>Uma <strong>conta empresarial do WhatsApp</strong> e um <strong>número de telefone</strong> são ativos diferentes. Criar uma conta empresarial não fornece automaticamente um número novo. Confira sempre qual número está sendo vinculado.</li>
      <li>Conclua a janela e volte à plataforma. Confira se aparece <strong>Conectado</strong> com o número esperado. Analise também os indicadores de diagnóstico: conexão registrada, sozinha, não comprova recebimento e envio.</li>
      <li>Resolva as pendências específicas informadas pela Meta, como permissões, registro do número ou verificação. Cobrança de anúncios e cobrança do WhatsApp são configurações distintas; siga as exigências exibidas para sua operação.</li>`, "O número correto está conectado e não há pendência impeditiva no diagnóstico. O teste real será feito na etapa 17."],
    ["Configure o roteiro, se quiser atendimento automático", "Nicho e bot", `
      <li>Para receber mensagens e atender manualmente, não é necessário ativar um bot. Para qualificação automática, abra <strong>WhatsApp Bot → Novo roteiro</strong>.</li>
      <li>Preencha um nome que identifique o atendimento, escolha o <strong>nicho</strong> e escreva a saudação, as perguntas e a passagem para uma pessoa da equipe.</li>
      <li>Se quiser capturar o nome, use uma pergunta como <strong>PERGUNTA: Com quem falo? [CAPTURAR:nome]</strong> e depois <strong>MSG: Prazer, [nome]!</strong>. Confira a prévia antes de salvar.</li>
      <li>Salve e use <strong>Ativar</strong> no roteiro desejado. A conexão do WhatsApp precisa estar pronta. Confira qual roteiro ficou ativo para aquele nicho.</li>
      <li>Na campanha, escolha o mesmo nicho. Para uma campanha importada, selecione-o manualmente no card; o nome da campanha não define o roteiro automaticamente.</li>
      <li>Ao substituir um roteiro que já atende pessoas, prefira criar outro roteiro e revisar a troca, em vez de reordenar perguntas do roteiro que está em andamento. Confira o comportamento com um contato de teste.</li>`, "O nicho da campanha e o do roteiro são iguais, e o roteiro desejado está ativo — ou você decidiu atender manualmente."],
    ["Prepare e publique o anúncio nos dois canais", "Facebook + Instagram", `
      <li>Abra a criação de campanha na plataforma, informe um nome e selecione o nicho. Marque <strong>Facebook e Instagram</strong> como canais desejados.</li>
      <li>Revise as abas de <strong>Facebook</strong> e <strong>Instagram</strong> separadamente: a plataforma mantém configurações próprias para cada rede. Em cada uma, confira Página, destino, criativo, público e orçamento. No Instagram, confira também o perfil profissional correto. A mesma conta de anúncios pode atender aos dois canais, mas revise o gasto total das publicações.</li>
      <li>Escolha <strong>WhatsApp</strong> como destino. Confira o número conectado e escreva a mensagem inicial sugerida ao cliente. Não selecione formulário se a intenção é iniciar uma conversa.</li>
      <li>Adicione imagem ou vídeo, texto e chamada para ação. Confira a prévia e a adequação do criativo aos posicionamentos que pretende usar.</li>
      <li>Revise público, localização, orçamento, datas e categoria especial quando aplicável. Confirme a conta que pagará pelos anúncios.</li>
      <li>Publique somente depois dessa revisão. A Meta pode analisar ou recusar o anúncio; acompanhe o motivo se houver pendência. Verifique campanha, conjunto e anúncio, além do pagamento: apenas estar criado ou ativo não garante entrega.</li>`, "O anúncio está publicado, aprovado e com entrega verificada nos canais desejados, com destino ao WhatsApp correto."],
    ["Faça o teste completo antes de considerar pronto", "Teste de ponta a ponta", `
      <li>Use um contato de teste diferente do número comercial. Abra a prévia compartilhável ou o anúncio, quando disponível, no Facebook e no Instagram e confira o botão para WhatsApp.</li>
      <li>Verifique qual número abre e <strong>envie uma mensagem</strong>. Abrir a conversa sem enviar nada não testa o recebimento.</li>
      <li>Volte à plataforma e confirme a chegada da mensagem e o número do contato. Se já existir um lead com esse telefone, a conversa pode ser associada a ele.</li>
      <li>Para testar a <strong>criação de um lead novo pela Meta</strong>, use um contato ainda não cadastrado e uma entrada real pelo anúncio. Esse fluxo depende da referência de anúncio enviada pela Meta. Uma mensagem comum por link direto ou certas prévias pode aparecer na conversa sem criar um lead novo; isso, sozinho, não comprova falha na conexão.</li>
      <li>No teste real pelo anúncio, confira o lead, a origem e a campanha identificada. Repita para Facebook e Instagram. Se a referência não chegar ou a campanha não for reconhecida, registre o caso para o suporte antes de considerar a atribuição validada.</li>
      <li>Se ativou o bot, responda às perguntas e confira o roteiro do nicho, a captura do nome e a passagem para atendimento humano.</li>
      <li>Assuma o atendimento e envie uma resposta de teste. Confirme a chegada no outro aparelho. Se usa coexistência, confira também o funcionamento esperado no aplicativo.</li>
      <li>Se alguma etapa falhar, registre o nome e ID da conta/campanha, horário do teste e mensagem de erro e consulte o suporte. Não considere concluído só porque o painel mostra “Conectado”.</li>`, "Você confirmou anúncio → mensagem → conversa na plataforma → lead → bot ou atendente → resposta recebida, incluindo Facebook e Instagram."]
  ];

  let retornoFoco = null;
  let overflowAnterior = "";
  function fechar() {
    const modal = document.getElementById("tutorial_meta_conta");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = overflowAnterior;
    if (retornoFoco?.isConnected) retornoFoco.focus();
  }
  window.abrirPassoMetaConta = function () {
    let modal = document.getElementById("tutorial_meta_conta");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "tutorial_meta_conta";
      modal.className = "tutorial-meta-conta";
      modal.hidden = true;
      modal.innerHTML = `
        <div class="tutorial-meta-fundo" data-fechar-meta></div>
        <section class="tutorial-meta-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial_meta_titulo" tabindex="-1">
          <header><div><small>META ADS · GUIA COMPLETO</small><h2 id="tutorial_meta_titulo">Facebook e Instagram: do anúncio ao WhatsApp</h2><p>17 etapas: conta de anúncios, canais, WhatsApp, atendimento e teste final.</p></div><button type="button" data-fechar-meta aria-label="Fechar tutorial">✕</button></header>
          <div class="tutorial-meta-conteudo">
            <div class="tutorial-meta-intro"><strong>Antes de começar</strong><p>Separe o acesso ao Facebook, Instagram profissional, e-mail de confirmação, dados da empresa e celular do número comercial. Mantenha este guia aberto e execute cada etapa na outra guia. Os nomes dos menus podem variar conforme a conta e a versão da Meta.</p><p><strong>Fluxo completo:</strong> anúncio no Facebook ou Instagram → cliente envia mensagem → conversa e lead na plataforma → bot ou atendente responde.</p><p><strong>Já possui uma conta?</strong> Comece pela etapa 3 para conferir se ela está no portfólio certo. Se já tem acesso e pagamento configurados, vá à etapa 11. Se já conectou a Meta, comece na etapa 12.</p></div>
            <nav aria-label="Etapas do tutorial Meta">${etapas.map((e, i) => `<a href="#tutorial_meta_etapa_${i + 1}" data-etapa="${i + 1}">${i + 1}. ${e[1]}</a>`).join("")}</nav>
            <p class="tutorial-meta-instrucao">Abra uma etapa para ver cada clique e o resultado esperado.</p>
            ${etapas.map((e, i) => `<details id="tutorial_meta_etapa_${i + 1}" ${i === 0 ? "open" : ""}><summary><span class="tutorial-meta-numero">${i + 1}</span><span>${e[0]}</span></summary><div class="tutorial-meta-etapa"><ol>${e[2]}</ol><p class="tutorial-meta-resultado"><strong>Confira antes de avançar:</strong> ${e[3]}</p>${i < etapas.length - 1 ? `<button type="button" data-etapa="${i + 2}">Próxima etapa →</button>` : ""}</div></details>`).join("")}
            <section class="tutorial-meta-ajuda"><h3>Se algo não aparecer</h3>
              <details><summary>Não vejo “Criar uma nova conta” ou “Adicionar”</summary><p>Confira o portfólio selecionado e seu nível de acesso. Peça ao administrador controle adequado sobre o negócio. Se houver mensagem de limite de criação ou restrição, leia a pendência na Meta e siga a solicitação apresentada; não há prazo ou aumento de limite garantido.</p></details>
              <details><summary>A conta já pertence a outra empresa</summary><p>Confira o ID e peça acesso ao proprietário pelo fluxo “Solicitar acesso”. Para trabalhar com a conta de um cliente, não tente adicioná-la como se a propriedade fosse sua.</p></details>
              <details><summary>Criei a conta, mas ela não aparece na Plataforma de Leads</summary><p>Verifique, nesta ordem: mesmo perfil do Facebook; convite aceito; pessoa atribuída à conta; portfólio correto; conta incluída na autorização da integração. Atualize as plataformas e confira o seletor. Se continuar ausente, refaça a autorização e anote o ID para o suporte.</p></details>
              <details><summary>Pagamento, verificação ou conta restrita</summary><p>Abra a conta correta na Meta e leia o motivo exibido. Confirme os dados solicitados, resolva pagamentos recusados e aguarde a compensação de saldo quando aplicável. Use a ${link("https://business.facebook.com/business-support-home/", "Central de Suporte para Empresas")} para consultar restrições. A conexão com a plataforma não remove restrições da Meta.</p></details>
              <details><summary>A Página ou o Instagram não aparece</summary><p>O acesso a cada ativo é separado. Confira a atribuição do seu perfil à Página/Instagram e se esses ativos foram incluídos na autorização. Para formulários, confira também os termos de Lead Ads e as permissões de acesso a leads da Página.</p></details>
            </section>
            <p class="tutorial-meta-fontes">Ajuda oficial (pode exigir login): ${link("https://www.facebook.com/business/help/407323696966570", "Contas de anúncios")} · ${link("https://www.facebook.com/business/help/1710077379203657", "Portfólio empresarial")} · ${link("https://whatsappbusiness.com/products/create-ads-that-click-to-whatsapp/", "Anúncios para WhatsApp")}. Consulte as instruções exibidas pela Meta se sua tela for diferente.</p>
            <button type="button" data-fechar-meta>Entendi, voltar para a plataforma</button>
          </div>
        </section>`;
      document.body.appendChild(modal);
      modal.addEventListener("click", event => {
        if (event.target.closest("[data-fechar-meta]")) fechar();
        const guia = event.target.closest("[data-guia-meta]");
        if (guia) {
          const abrir = guia.dataset.guiaMeta === "pagina" ? window.abrirPassoMetaAnuncios : window.abrirPassoMetaInstagram;
          const id = guia.dataset.guiaMeta === "pagina" ? "modal_passo_meta_anuncios" : "modal_passo_meta_instagram";
          const auxiliar = document.getElementById(id);
          if (typeof abrir === "function" && auxiliar) {
            modal.hidden = true;
            abrir();
            auxiliar.querySelector("button")?.focus();
            const observer = new MutationObserver(() => {
              if (!auxiliar.classList.contains("active")) {
                observer.disconnect();
                modal.hidden = false;
                document.body.style.overflow = "hidden";
                guia.focus();
              }
            });
            observer.observe(auxiliar, { attributes: true, attributeFilter: ["class"] });
          }
        }
        const atalho = event.target.closest("[data-etapa]");
        if (atalho) {
          event.preventDefault();
          const etapa = document.getElementById(`tutorial_meta_etapa_${atalho.dataset.etapa}`);
          etapa.open = true;
          etapa.querySelector("summary").focus({ preventScroll: true });
          etapa.scrollIntoView({ block: "start" });
        }
      });
      modal.addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); fechar(); }
        if (event.key !== "Tab") return;
        const elementos = [...modal.querySelectorAll('button, a[href], summary')].filter(el => el.getClientRects().length);
        const primeiro = elementos[0], ultimo = elementos[elementos.length - 1];
        if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
        else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
      });
    }
    if (!modal.hidden) return;
    retornoFoco = document.activeElement;
    overflowAnterior = document.body.style.overflow;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector("button[data-fechar-meta]").focus({ preventScroll: true });
  };
})();
