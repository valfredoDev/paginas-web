/* ======  UTILIDADES ====== */
// gera campo EMV
function emv(id, valor) {
  const tamanho = valor.length.toString().padStart(2, '0');
  return `${id}${tamanho}${valor}`;
}
// CRC‑16/CCITT‑F0 padrão Pix
function crc16ccitt(str) {
  let crc = 0xFFFF;
  for (let c of str) {
    crc ^= c.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).padStart(4, '0').toUpperCase();
}
// monta payload Pix completo
function gerarPayloadPix({ chave, nome, cidade, valor, txid = "***" }) {
  const gui             = emv("00", "br.gov.bcb.pix");
  const chavePix        = emv("01", chave);
  const merchantAccount = emv("26", gui + chavePix);

  const merchantCategoryCode = emv("52", "0000");
  const currency             = emv("53", "986");
  const amount               = valor ? emv("54", Number(valor).toFixed(2)) : "";
  const countryCode          = emv("58", "BR");
  const merchantName         = emv("59", nome.substring(0, 25));
  const merchantCity         = emv("60", cidade.substring(0, 15));
  const addDataField         = emv("62", emv("05", txid));

  const semCRC = emv("00", "01") +
                 merchantAccount +
                 merchantCategoryCode +
                 currency +
                 amount +
                 countryCode +
                 merchantName +
                 merchantCity +
                 addDataField +
                 "6304"; // placeholder para CRC

  const crc = crc16ccitt(semCRC);
  return semCRC + crc;
}

/* ======  MOSTRAR/OCULTAR CAMPOS ====== */
function mostrarCamposExtras() {
  const tipo = document.getElementById("tipo").value;
  document.querySelectorAll(".extras").forEach(el => el.style.display = "none");
  document.getElementById("campo-geral").style.display = "none";

  switch (tipo) {
    case "pix":    document.getElementById("pix-campos").style.display = "block"; break;
    case "wifi":   document.getElementById("wifi-campos").style.display = "block"; break;
    case "evento": document.getElementById("evento-campos").style.display = "block"; break;
    case "vcard":  document.getElementById("vcard-campos").style.display = "block"; break;
    default:       document.getElementById("campo-geral").style.display = "block";
  }
}

/* ======  GERAR QR CODE ====== */
function gerar() {
  const tipo   = document.getElementById("tipo").value;
  const canvas = document.getElementById("qrcode");
  const btnDownload = document.getElementById("btn-download");
  let conteudoQR = "";

  try {
    switch (tipo) {
      case "url": {
        let url = document.getElementById("entrada").value.trim();
        if (!url) throw "Digite a URL.";
        conteudoQR = url.match(/^https?:\/\//) ? url : "https://" + url;
        break;
      }
      case "texto": {
        let txt = document.getElementById("entrada").value.trim();
        if (!txt) throw "Digite o texto.";
        conteudoQR = txt;
        break;
      }
      case "pix": {
        const chave  = document.getElementById("pix-chave").value.trim();
        const nome   = document.getElementById("pix-nome").value.trim();
        const cidade = document.getElementById("pix-cidade").value.trim();
        const valor  = document.getElementById("pix-valor").value.trim();
        const txid   = document.getElementById("pix-txid").value.trim() || "***";
        if (!chave || !nome || !cidade) throw "Preencha chave, nome e cidade.";
        conteudoQR = gerarPayloadPix({ chave, nome, cidade, valor, txid });
        break;
      }
      case "wifi": {
        const ssid = document.getElementById("wifi-ssid").value.trim();
        const senha = document.getElementById("wifi-senha").value.trim();
        const seg = document.getElementById("wifi-seguranca").value;
        if (!ssid) throw "Digite o SSID da rede Wi‑Fi.";
        conteudoQR = `WIFI:T:${seg};S:${ssid};${seg !== "nopass" ? `P:${senha};` : ""};`;
        break;
      }
      case "evento": {
        const nome = document.getElementById("evento-nome").value.trim();
        const local = document.getElementById("evento-local").value.trim();
        const ini = document.getElementById("evento-inicio").value;
        const fim = document.getElementById("evento-fim").value;
        if (!nome || !ini) throw "Preencha nome e data/hora de início.";
        const dtIni = ini.replace(/[-:]/g, "").replace("T", "");
        const dtFim = fim ? fim.replace(/[-:]/g, "").replace("T", "") : dtIni;
        conteudoQR =
`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${nome}
DTSTART:${dtIni}
DTEND:${dtFim}
LOCATION:${local}
END:VEVENT
END:VCALENDAR`;
        break;
      }
      case "vcard": {
        const n = document.getElementById("vcard-nome").value.trim();
        if (!n) throw "Nome é obrigatório para vCard.";
        const tel   = document.getElementById("vcard-telefone").value.trim();
        const email = document.getElementById("vcard-email").value.trim();
        const emp   = document.getElementById("vcard-empresa").value.trim();
        conteudoQR =
`BEGIN:VCARD
VERSION:3.0
FN:${n}
ORG:${emp}
TEL;TYPE=CELL:${tel}
EMAIL:${email}
END:VCARD`;
        break;
      }
    }
  } catch (e) {
    alert(e);
    return;
  }

  const options = {
    color: { dark: document.getElementById("cor-escura").value,
             light: document.getElementById("cor-clara").value },
    width: Number(document.getElementById("tamanho").value),
    errorCorrectionLevel: document.getElementById("ecc").value
  };

  QRCode.toCanvas(canvas, conteudoQR, options, err => {
    if (err) { console.error(err); alert("Erro ao gerar QR Code."); btnDownload.style.display = "none"; }
    else      btnDownload.style.display = "inline-block";
  });
}

/* ======  DOWNLOAD ====== */
function baixarQRCode() {
  const canvas = document.getElementById("qrcode");
  const formato = document.getElementById("formato").value;
  const link = document.createElement("a");
  link.download = `qrcode.${formato}`;
  link.href = canvas.toDataURL("image/" + formato);
  link.click();
}

/* Ao carregar a página */
mostrarCamposExtras();
