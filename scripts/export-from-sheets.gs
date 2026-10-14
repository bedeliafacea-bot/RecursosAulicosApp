/**
 * Script de Exportación de Datos Legacy (Google Sheets a JSON)
 * 
 * Instrucciones:
 * 1. Abrí tu Google Spreadsheet actual donde están las 13 hojas.
 * 2. Andá a Extensiones > Apps Script.
 * 3. Pegá esta función al final de tu proyecto o en un archivo nuevo exportador.gs.
 * 4. Seleccioná la función `exportarTodoAJson` y dale a "Ejecutar".
 * 5. Revisá el registro de ejecución (Logs) o tu Google Drive: se creará un archivo
 *    llamado "datos_migracion_uap.json" con todo el contenido normalizado listo para Supabase.
 */

function exportarTodoAJson() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const getSheetData = (sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
    
    const headers = values[0].map(h => String(h).trim());
    const rows = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      // Si la fila está totalmente vacía, la salteamos
      if (row.every(cell => cell === '' || cell === null)) continue;
      
      const item = {};
      headers.forEach((header, colIdx) => {
        let val = row[colIdx];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        }
        item[header] = val;
      });
      rows.push(item);
    }
    return rows;
  };

  const payload = {
    exportadoEl: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    usuarios: getSheetData("UsuariosSistema"),
    alumnos: getSheetData("Alumnos"),
    registrosBecuap: getSheetData("Registros alumnos Becuap"),
    horariosPactados: getSheetData("Horarios_Pactados"),
    evaluaciones: getSheetData("EvaluacionAlumnos"),
    aulasSecundario: getSheetData("AulasSecundario"),
    cumpleanos: getSheetData("Cumpleanos"),
    reservasMatriz: getSheetData("ReservasMatriz"),
    fotocopias: getSheetData("RegistroFotocopias"),
    cierresCaja: getSheetData("CierresCaja"),
    movimientosCaja: getSheetData("MovimientosCaja"),
    equiposEspeciales: getSheetData("EquiposEspeciales"),
    reservasEquipos: getSheetData("ReservasEquipos")
  };

  const jsonString = JSON.stringify(payload, null, 2);
  
  // Guardamos en la raíz de Google Drive
  const archivo = DriveApp.createFile("datos_migracion_uap.json", jsonString, MimeType.PLAIN_TEXT);
  Logger.log("✅ Exportación exitosa. Archivo generado en Google Drive: " + archivo.getUrl());
  return archivo.getUrl();
}
