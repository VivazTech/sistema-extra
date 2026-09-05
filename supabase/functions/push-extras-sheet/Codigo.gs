/**
 * Webhook: recebe POST JSON { token?, rows: [...] } e acrescenta linhas
 * na aba «Base de Dados» da planilha Controle de Extras.
 *
 * Propriedades do script (opcionais):
 *   SPREADSHEET_ID  — só se o script NÃO estiver vinculado à planilha
 *   SHEET_NAME      — padrão: Base de Dados
 *   WEBHOOK_TOKEN   — só se usar token no Supabase
 *
 * Colunas gravadas (as demais são fórmula da planilha — não sobrescrever):
 *   A NOME | B SETOR | C ATIVIDADE | D FINALIDADE | E DIA
 *   I ENTRADA | J SAIDA (intervalo) | K CHEGADA | L SAIDA (final)
 *   M DIARIA | O VALOR HORA | P VALOR PAGAR
 *   F ANO, G MÊS, H SEMANA, N HORAS TRABALHADAS → copiados da última linha (fórmula)
 *
 * Implantar: Nova implantação → Aplicativo da Web
 *   Executar como: Eu
 *   Quem tem acesso: Qualquer pessoa
 */
var DEFAULT_SPREADSHEET_ID = '1HS1_FWIllxhukletruSRzsARRex37X8Pi_iYfqQFzCo';
var DEFAULT_SHEET_NAME = 'Base de Dados';
var FORMULA_COLS = [6, 7, 8, 14]; // F ANO, G MÊS, H SEMANA, N HORAS TRABALHADAS

function doGet() {
  return jsonOut({
    ok: true,
    service: 'vivaz-controle-extras',
    hint: 'Webhook ativo. O sistema envia POST com { rows: [...] }.',
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, error: 'Corpo do POST vazio. Envie JSON com rows.' });
    }

    var props = PropertiesService.getScriptProperties();
    var expected = props.getProperty('WEBHOOK_TOKEN');
    var data = JSON.parse(e.postData.contents);

    if (expected && data.token !== expected) {
      return jsonOut({ ok: false, error: 'Unauthorized' });
    }

    var rows = data.rows;
    if (!rows || !rows.length) {
      return jsonOut({ ok: false, error: 'rows vazio' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      var ssId = props.getProperty('SPREADSHEET_ID') || DEFAULT_SPREADSHEET_ID;
      ss = SpreadsheetApp.openById(ssId);
    }

    var sheetName = props.getProperty('SHEET_NAME') || DEFAULT_SHEET_NAME;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return jsonOut({ ok: false, error: 'Aba não encontrada: ' + sheetName });
    }

    var values = rows.map(function (r) {
      return [
        r.extraName || '',
        r.sector || '',
        r.role || '',
        r.reason || '',
        parseDate_(r.workDate),
        '',
        '',
        '',
        parseTime_(r.arrival),
        parseTime_(r.breakStart),
        parseTime_(r.breakEnd),
        parseTime_(r.departure),
        r.valorCadastrado != null ? r.valorCadastrado : '',
        '',
        r.valorHora != null ? r.valorHora : '',
        r.valorPagar != null ? r.valorPagar : '',
      ];
    });

    var last = Math.max(sheet.getLastRow(), 1);
    sheet.getRange(last + 1, 1, values.length, values[0].length).setValues(values);
    copyFormulasFromRow_(sheet, last, last + 1, values.length);

    return jsonOut({ ok: true, appended: values.length });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function copyFormulasFromRow_(sheet, fromRow, toStart, nRows) {
  if (fromRow < 2 || nRows < 1) return;
  FORMULA_COLS.forEach(function (col) {
    var src = sheet.getRange(fromRow, col);
    if (!src.getFormula()) return;
    src.copyTo(sheet.getRange(toStart, col, nRows, 1), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
  });
}

function parseDate_(s) {
  if (!s) return '';
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function parseTime_(s) {
  if (!s) return '';
  var m = String(s).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s;
  return (Number(m[1]) * 60 + Number(m[2])) / (24 * 60);
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
