// Regras de formato do assistente; paridade verificada com o backend.
(function (root) {
"use strict";
function documentoAssistenteValido(valor        )          {
  const doc = valor.toUpperCase().replace(/[.\/\-\s]/g, "");
  if (/^(.)\1+$/.test(doc)) return false;
  if (/^\d{11}$/.test(doc)) {
    const dv = (base        ) => {
      const resto = [...base].reduce((s, n, i) => s + Number(n) * (base.length + 1 - i), 0) % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    return dv(doc.slice(0, 9)) === Number(doc[9]) && dv(doc.slice(0, 10)) === Number(doc[10]);
  }
  // Receita Federal: CNPJ numérico e alfanumérico usam ASCII - 48 e módulo 11.
  // https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
  if (!/^[A-Z0-9]{12}\d{2}$/.test(doc)) return false;
  const dv = (base        ) => {
    const soma = [...base].reverse().reduce((s, c, i) => s + (c.charCodeAt(0) - 48) * (2 + i % 8), 0);
    return soma % 11 < 2 ? 0 : 11 - soma % 11;
  };
  return dv(doc.slice(0, 12)) === Number(doc[12]) && dv(doc.slice(0, 13)) === Number(doc[13]);
}

function validarDadosAssistente(dados                      = {}) {
  const erros                         = {};
  const texto = (campo        ) => String(dados[campo] ?? "").trim();
  if (texto("nome_legal").length < 2) erros.nome_legal = "Informe o nome ou a razão social com pelo menos 2 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto("email"))) erros.email = "Informe um e-mail válido, como contato@empresa.com.br.";
  const telefone = texto("telefone");
  if (!/^\+?[\d\s().-]+$/.test(telefone) || !/^[1-9]\d{9,14}$/.test(telefone.replace(/\D/g, ""))) {
    erros.telefone = "Informe um telefone com DDD; para números internacionais, inclua o código do país.";
  }
  if (texto("documento") && !documentoAssistenteValido(texto("documento"))) erros.documento = "Confira o CPF ou CNPJ informado e seus dígitos verificadores.";
  if (texto("site")) {
    try {
      const url = new URL(texto("site"));
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) throw new Error();
    } catch { erros.site = "Informe um endereço de site válido começando com https://."; }
  }
  if ((texto("pais") || "BR") !== "BR") erros.pais = "O assistente atende empresas do Brasil.";
  if (!["BRL", "USD"].includes(texto("moeda") || "BRL")) erros.moeda = "Escolha uma moeda disponível.";
  if (!["America/Sao_Paulo", "America/Manaus", "America/Rio_Branco"].includes(texto("fuso") || "America/Sao_Paulo")) erros.fuso = "Escolha um fuso horário disponível.";
  return erros;
}


const regras = { documentoAssistenteValido, validarDadosAssistente };
if (typeof module !== "undefined" && module.exports) module.exports = regras;
else root.AssistenteContasRegras = regras;
})(typeof window !== "undefined" ? window : globalThis);
