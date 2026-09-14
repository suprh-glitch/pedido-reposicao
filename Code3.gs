/**
 * Pedido de Reposição — Rede Nilo
 * Backend: Google Sheets + Apps Script
 *
 * Planilhas esperadas (rodar setupSheets() uma vez antes de publicar):
 *   Pedidos: ID | Nome | Loja | Solicitante | Status | DataCriacao | DataFinalizacao | TotalItens | ItensSeparados
 *   Itens:   ItemID | PedidoID | Barcode | Descricao | Qtd | Unidade | Separado | Ordem
 *
 * Deploy: Implantar → Nova implantação → Aplicativo da Web
 *   Executar como: Eu
 *   Quem pode acessar: Qualquer pessoa
 */

var SHEET_PEDIDOS = "Pedidos";
var SHEET_ITENS = "Itens";

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var pedidos = ss.getSheetByName(SHEET_PEDIDOS) || ss.insertSheet(SHEET_PEDIDOS);
  pedidos.getRange(1, 1, 1, 9).setValues([[
    "ID", "Nome", "Loja", "Solicitante", "Status", "DataCriacao", "DataFinalizacao", "TotalItens", "ItensSeparados"
  ]]);

  var itens = ss.getSheetByName(SHEET_ITENS) || ss.insertSheet(SHEET_ITENS);
  itens.getRange(1, 1, 1, 8).setValues([[
    "ItemID", "PedidoID", "Barcode", "Descricao", "Qtd", "Unidade", "Separado", "Ordem"
  ]]);
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === "ping") {
      return jsonOut({ ok: true, msg: "pong" });
    }
    if (action === "listarPedidos") {
      return jsonOut({ ok: true, pedidos: listarPedidos(e.parameter.status) });
    }
    if (action === "obterPedido") {
      return jsonOut(obterPedido(e.parameter.id));
    }
    return jsonOut({ ok: false, error: "Ação inválida: " + action });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (action === "criarPedido") return jsonOut(criarPedido(body));
    if (action === "marcarItem") return jsonOut(marcarItem(body));
    if (action === "concluirPedido") return jsonOut(concluirPedido(body));
    if (action === "excluirPedido") return jsonOut(excluirPedido(body));

    return jsonOut({ ok: false, error: "Ação inválida: " + action });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error("Aba '" + name + "' não encontrada. Rode setupSheets() primeiro.");
  return sh;
}

function listarPedidos(statusFiltro) {
  var sh = getSheet(SHEET_PEDIDOS);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var data = sh.getRange(2, 1, last - 1, 9).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    if (statusFiltro && String(r[4]) !== statusFiltro) continue;
    out.push({
      id: r[0], nome: r[1], loja: r[2], solicitante: r[3], status: r[4],
      dataCriacao: r[5], dataFinalizacao: r[6], totalItens: r[7], itensSeparados: r[8]
    });
  }
  out.sort(function (a, b) { return new Date(b.dataCriacao) - new Date(a.dataCriacao); });
  return out.slice(0, 100);
}

function obterPedido(pedidoId) {
  if (!pedidoId) return { ok: false, error: "ID do pedido não informado" };

  var shP = getSheet(SHEET_PEDIDOS);
  var lastP = shP.getLastRow();
  var pedido = null;
  if (lastP >= 2) {
    var dataP = shP.getRange(2, 1, lastP - 1, 9).getValues();
    for (var i = 0; i < dataP.length; i++) {
      if (String(dataP[i][0]) === String(pedidoId)) {
        pedido = {
          id: dataP[i][0], nome: dataP[i][1], loja: dataP[i][2], solicitante: dataP[i][3],
          status: dataP[i][4], dataCriacao: dataP[i][5], dataFinalizacao: dataP[i][6],
          totalItens: dataP[i][7], itensSeparados: dataP[i][8]
        };
        break;
      }
    }
  }
  if (!pedido) return { ok: false, error: "Pedido não encontrado" };

  var shI = getSheet(SHEET_ITENS);
  var lastI = shI.getLastRow();
  var itens = [];
  if (lastI >= 2) {
    var dataI = shI.getRange(2, 1, lastI - 1, 8).getValues();
    for (var j = 0; j < dataI.length; j++) {
      if (String(dataI[j][1]) === String(pedidoId)) {
        itens.push({
          itemId: dataI[j][0], pedidoId: dataI[j][1], barcode: dataI[j][2],
          desc: dataI[j][3], qty: dataI[j][4], unit: dataI[j][5],
          separado: dataI[j][6] === true, ordem: dataI[j][7]
        });
      }
    }
    itens.sort(function (a, b) { return a.ordem - b.ordem; });
  }
  return { ok: true, pedido: pedido, itens: itens };
}

function criarPedido(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var pedidoId = Utilities.getUuid();
    var now = new Date();
    var itensIn = body.itens || [];

    var shP = getSheet(SHEET_PEDIDOS);
    shP.appendRow([
      pedidoId, body.nome || "", body.loja || "", body.solicitante || "",
      "Aberto", now, "", itensIn.length, 0
    ]);

    var shI = getSheet(SHEET_ITENS);
    var rows = itensIn.map(function (it, idx) {
      return [
        it.itemId || (pedidoId + "-" + idx), pedidoId, it.barcode || "",
        it.desc || "", it.qty || 0, it.unit || "", false, idx
      ];
    });
    if (rows.length > 0) {
      shI.getRange(shI.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
    }

    return { ok: true, pedidoId: pedidoId };
  } finally {
    lock.releaseLock();
  }
}

function marcarItem(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var shI = getSheet(SHEET_ITENS);
    var last = shI.getLastRow();
    if (last < 2) return { ok: false, error: "Nenhum item cadastrado" };

    var ids = shI.getRange(2, 1, last - 1, 1).getValues();
    var rowIndex = -1;
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(body.itemId)) { rowIndex = i + 2; break; }
    }
    if (rowIndex === -1) return { ok: false, error: "Item não encontrado" };

    shI.getRange(rowIndex, 7).setValue(!!body.separado);

    var pedidoId = body.pedidoId;
    var dataI = shI.getRange(2, 1, shI.getLastRow() - 1, 8).getValues();
    var total = 0, sep = 0;
    for (var j = 0; j < dataI.length; j++) {
      if (String(dataI[j][1]) === String(pedidoId)) {
        total++;
        if (dataI[j][6] === true) sep++;
      }
    }

    var shP = getSheet(SHEET_PEDIDOS);
    var idsP = shP.getRange(2, 1, shP.getLastRow() - 1, 1).getValues();
    for (var k = 0; k < idsP.length; k++) {
      if (String(idsP[k][0]) === String(pedidoId)) {
        shP.getRange(k + 2, 8).setValue(total);
        shP.getRange(k + 2, 9).setValue(sep);
        break;
      }
    }

    return { ok: true, totalItens: total, itensSeparados: sep };
  } finally {
    lock.releaseLock();
  }
}

function concluirPedido(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var shP = getSheet(SHEET_PEDIDOS);
    var last = shP.getLastRow();
    if (last < 2) return { ok: false, error: "Nenhum pedido cadastrado" };
    var ids = shP.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(body.pedidoId)) {
        shP.getRange(i + 2, 5).setValue("Concluido");
        shP.getRange(i + 2, 7).setValue(new Date());
        return { ok: true };
      }
    }
    return { ok: false, error: "Pedido não encontrado" };
  } finally {
    lock.releaseLock();
  }
}

function excluirPedido(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var shP = getSheet(SHEET_PEDIDOS);
    var lastP = shP.getLastRow();
    if (lastP >= 2) {
      var idsP = shP.getRange(2, 1, lastP - 1, 1).getValues();
      for (var i = idsP.length - 1; i >= 0; i--) {
        if (String(idsP[i][0]) === String(body.pedidoId)) {
          shP.deleteRow(i + 2);
          break;
        }
      }
    }
    var shI = getSheet(SHEET_ITENS);
    var lastI = shI.getLastRow();
    if (lastI >= 2) {
      var idsI = shI.getRange(2, 1, lastI - 1, 2).getValues();
      for (var j = idsI.length - 1; j >= 0; j--) {
        if (String(idsI[j][1]) === String(body.pedidoId)) {
          shI.deleteRow(j + 2);
        }
      }
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
