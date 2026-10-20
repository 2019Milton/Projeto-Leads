// Seletor de mês da plataforma. O calendário nativo do <input type="month"> mostra um ano
// por vez e esconde os seguintes numa rolagem; aqui os anos ficam todos à vista (do ano
// passado até 5 anos à frente, mais o ano do valor atual se estiver fora disso) e os meses
// em grade. Vale para todo input de mês, inclusive os criados depois (delegação no document).
// O input continua guardando o valor ("AAAA-MM") e recebe "input" e "change" ao escolher,
// então quem lê .value e os onchange existentes não mudam. Respeita min, max, disabled,
// readonly e required. Em tela de toque fica o seletor nativo (lá ele já é uma roda de anos).
(function () {
  const ANOS_A_FRENTE = 5;
  const ANOS_ATRAS = 1;
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const TECLAS_ABRIR = ["Enter", " ", "F4"];

  let aberto = null; // { input, popup, ano }

  function telaDeToque() {
    return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  }

  function hoje() {
    const data = new Date();
    return { ano: data.getFullYear(), mes: data.getMonth() + 1 };
  }

  function lerMes(valor) {
    const partes = /^(\d{4})-(\d{2})$/.exec(String(valor || ""));
    return partes ? { ano: Number(partes[1]), mes: Number(partes[2]) } : null;
  }

  function formatarMes(ano, mes) {
    return `${ano}-${String(mes).padStart(2, "0")}`;
  }

  function anosDoSeletor(input) {
    const atual = hoje();
    const valor = lerMes(input.value);
    const min = lerMes(input.min);
    const max = lerMes(input.max);
    let inicio = atual.ano - ANOS_ATRAS;
    let fim = atual.ano + ANOS_A_FRENTE;
    if (valor) {
      inicio = Math.min(inicio, valor.ano);
      fim = Math.max(fim, valor.ano);
    }
    if (min) inicio = Math.max(inicio, min.ano);
    if (max) fim = Math.min(fim, max.ano);
    const anos = [];
    for (let ano = inicio; ano <= fim; ano++) anos.push(ano);
    return anos;
  }

  function foraDoLimite(input, ano, mes) {
    const valor = formatarMes(ano, mes);
    return Boolean((input.min && valor < input.min) || (input.max && valor > input.max));
  }

  function definirValor(input, valor) {
    input.value = valor;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fechar() {
    if (!aberto) return;
    aberto.popup.remove();
    aberto = null;
  }

  function posicionar() {
    if (!aberto) return;
    const { input, popup } = aberto;
    const caixa = input.getBoundingClientRect();
    if (caixa.bottom < 0 || caixa.top > window.innerHeight) return fechar();
    const altura = popup.offsetHeight;
    const largura = popup.offsetWidth;
    // Abaixo do campo; se não couber, acima; se não couber em nenhum, encostado no fim da tela.
    let topo = caixa.bottom + 6;
    if (topo + altura > window.innerHeight - 8) {
      topo = caixa.top - 6 - altura >= 8 ? caixa.top - 6 - altura : window.innerHeight - altura - 8;
    }
    const esquerda = Math.min(Math.max(8, caixa.left), window.innerWidth - largura - 8);
    popup.style.top = `${Math.max(8, topo)}px`;
    popup.style.left = `${esquerda}px`;
  }

  function botao(classes, texto, dados, desabilitado) {
    const atributos = Object.entries(dados).map(([chave, valor]) => ` data-${chave}="${valor}"`).join("");
    return `<button type="button" class="${classes}"${atributos}${desabilitado ? " disabled" : ""}>${texto}</button>`;
  }

  function desenhar() {
    const { input, popup, ano } = aberto;
    const atual = hoje();
    const valor = lerMes(input.value);

    const anos = anosDoSeletor(input).map((opcao) => {
      const classes = ["seletor-mes-opcao"];
      if (opcao === ano) classes.push("selecionado");
      else if (opcao === atual.ano) classes.push("atual");
      return botao(classes.join(" "), opcao, { ano: opcao }, false);
    }).join("");

    const meses = MESES.map((nome, indice) => {
      const mes = indice + 1;
      const classes = ["seletor-mes-opcao"];
      if (valor && valor.ano === ano && valor.mes === mes) classes.push("selecionado");
      else if (atual.ano === ano && atual.mes === mes) classes.push("atual");
      return botao(classes.join(" "), nome, { mes }, foraDoLimite(input, ano, mes));
    }).join("");

    const esteMesPermitido = !foraDoLimite(input, atual.ano, atual.mes);
    popup.innerHTML = `
      <p class="seletor-mes-rotulo">Ano</p>
      <div class="seletor-mes-anos">${anos}</div>
      <p class="seletor-mes-rotulo">Mês</p>
      <div class="seletor-mes-meses">${meses}</div>
      <div class="seletor-mes-rodape">
        ${input.required ? "<span></span>" : botao("seletor-mes-acao", "Limpar", { acao: "limpar" }, false)}
        ${esteMesPermitido ? botao("seletor-mes-acao", "Este mês", { acao: "este-mes" }, false) : ""}
      </div>`;
    posicionar();
  }

  function abrir(input) {
    fechar();
    const popup = document.createElement("div");
    popup.className = "seletor-mes";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", "Escolher mês");
    const valor = lerMes(input.value);
    const anos = anosDoSeletor(input);
    const anoInicial = valor ? valor.ano : hoje().ano;
    aberto = { input, popup, ano: anos.includes(anoInicial) ? anoInicial : anos[0] };

    popup.addEventListener("mousedown", (evento) => evento.preventDefault()); // não tira o foco do input
    popup.addEventListener("click", (evento) => {
      const alvo = evento.target.closest("button");
      if (!alvo || alvo.disabled || !aberto) return;
      evento.stopPropagation();
      if (alvo.dataset.ano) {
        aberto.ano = Number(alvo.dataset.ano);
        desenhar();
      } else if (alvo.dataset.mes) {
        const campo = aberto.input;
        const escolhido = formatarMes(aberto.ano, Number(alvo.dataset.mes));
        fechar();
        definirValor(campo, escolhido);
      } else if (alvo.dataset.acao === "limpar") {
        const campo = aberto.input;
        fechar();
        definirValor(campo, "");
      } else if (alvo.dataset.acao === "este-mes") {
        const campo = aberto.input;
        const atual = hoje();
        fechar();
        definirValor(campo, formatarMes(atual.ano, atual.mes));
      }
    });

    document.body.appendChild(popup);
    desenhar();
  }

  function inputDeMes(alvo) {
    const input = alvo && alvo.closest ? alvo.closest('input[type="month"]') : null;
    return input && !input.disabled && !input.readOnly ? input : null;
  }

  document.addEventListener("click", (evento) => {
    if (telaDeToque()) return;
    const input = inputDeMes(evento.target);
    if (input) {
      evento.preventDefault(); // impede o calendário nativo
      if (!aberto || aberto.input !== input) abrir(input);
      return;
    }
    if (aberto && !aberto.popup.contains(evento.target)) fechar();
  }, true);

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && aberto) {
      fechar();
      return;
    }
    if (telaDeToque()) return;
    const input = inputDeMes(evento.target);
    if (!input) return;
    if (TECLAS_ABRIR.includes(evento.key) || (evento.altKey && evento.key === "ArrowDown")) {
      evento.preventDefault();
      abrir(input);
    } else if (evento.key === "Tab") {
      fechar();
    }
  }, true);

  window.addEventListener("resize", fechar);
  document.addEventListener("scroll", (evento) => {
    if (aberto && !aberto.popup.contains(evento.target)) posicionar();
  }, true);
})();
