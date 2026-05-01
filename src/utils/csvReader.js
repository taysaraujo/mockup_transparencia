/**
 * csvReader.js   —   Camada 1: Leitura bruta de CSVs
 *
 * Responsabilidade única: transformar texto CSV (separador ';', aspas duplas)
 * em um array de objetos simples { coluna: valor_string }.
 *
 * Regras de parsing:
 *  - Separador: ponto e vírgula (;)
 *  - Aspas duplas envolvem campos que contêm: separadores, quebras de linha ou aspas
 *  - Aspas duplas escapadas dentro de campo: ""  →  "
 *  - Encoding esperado: UTF-8
 *  - Campos numéricos chegam como string — a conversão é feita na camada de normalização
 *  - Linhas em branco são ignoradas
 */

/**
 * Faz o parse de uma linha CSV respeitando campos entre aspas (RFC 4180 adaptado).
 *
 * @param {string} line - Linha bruta do arquivo
 * @param {string} [sep=';'] - Separador de campo
 * @returns {string[]} Array de valores string (sem as aspas externas)
 */
function parseLine(line, sep = ';') {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        // Aspas duplas escapadas → uma aspa literal
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Converte texto CSV completo em array de objetos keyed pelo cabeçalho.
 *
 * @param {string} text - Conteúdo bruto do arquivo CSV
 * @param {string} [sep=';'] - Separador de campo
 * @returns {Record<string, string>[]}
 */
export function parseCSVText(text, sep = ';') {
  // Normaliza quebras de linha (Windows CRLF → LF)
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const headers = parseLine(lines[0], sep).map(h =>
    h.replace(/^"|"$/g, '').trim().toLowerCase()
  );

  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue; // Linha em branco — ignorar

    const values = parseLine(raw, sep);

    // Linhas com menos colunas que o cabeçalho são dados inválidos/incompletos
    if (values.length < headers.length / 2) continue;

    const record = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] ?? '';
    });
    records.push(record);
  }

  return records;
}
