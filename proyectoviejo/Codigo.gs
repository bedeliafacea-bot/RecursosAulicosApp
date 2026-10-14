/* =========================
   LOGIN / USUARIOS / PERMISOS
========================= */

/*
  Ahora los usuarios NO quedan fijos en el código.
  Se guardan en una hoja llamada: UsuariosSistema

  Usuario inicial automático:
  admin / admin123

  Después entrás como admin y desde la pantalla Usuarios
  podés crear usuarios, contraseñas, roles y activar/desactivar accesos.
*/

const HOJA_USUARIOS_SISTEMA = "UsuariosSistema";

const PAGINAS_PERMITIDAS = [
  "Index",
  "Alumnos",
  "Oficina",
  "Reservas",
  "Facturacion",
  "Cumpleanos",
  "Usuarios"
];

const PERMISOS_POR_ROL = {
  // Login global: todos los usuarios logueados pueden navegar por el programa.
  // Los permisos especiales se aplican SOLO dentro del módulo Alumnos.
  admin: ["Index", "Alumnos", "Oficina", "Reservas", "Facturacion", "Cumpleanos", "Usuarios"],
  secretario: ["Index", "Alumnos", "Oficina", "Reservas", "Facturacion", "Cumpleanos"],
  alumno: ["Index", "Alumnos", "Oficina", "Reservas", "Cumpleanos"]
};

function doGet(e) {
  asegurarHojaUsuariosSistema_();

  const params = e && e.parameter ? e.parameter : {};
  const pageSolicitada = params.page || "Index";
  const page = PAGINAS_PERMITIDAS.includes(pageSolicitada) ? pageSolicitada : "Index";
  const token = params.token || "";

  const sesion = obtenerSesionPorToken_(token);

  if (!sesion) {
    const tplLogin = HtmlService.createTemplateFromFile("Login");
    tplLogin.appUrl = ScriptApp.getService().getUrl();
    tplLogin.pageDestino = page;
    tplLogin.mensaje = "";

    return tplLogin.evaluate()
      .setTitle("Ingresar | Recursos Áulicos UAP")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (!usuarioPuedeEntrar_(sesion.rol, page)) {
    const tplLogin = HtmlService.createTemplateFromFile("Login");
    tplLogin.appUrl = ScriptApp.getService().getUrl();
    tplLogin.pageDestino = "Index";
    tplLogin.mensaje = "No tenés permisos para entrar a esa sección.";

    return tplLogin.evaluate()
      .setTitle("Sin permiso | Recursos Áulicos UAP")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const tpl = HtmlService.createTemplateFromFile(page);
  tpl.token = token;
  tpl.usuarioActivo = sesion.usuario;
  tpl.nombreUsuarioActivo = sesion.nombre;
  tpl.rolUsuarioActivo = sesion.rol;
  tpl.appUrl = ScriptApp.getService().getUrl();

  return tpl.evaluate()
    .setTitle("Recursos Áulicos UAP")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function validarLogin(usuario, password, pageDestino) {
  asegurarHojaUsuariosSistema_();

  usuario = String(usuario || "").trim().toLowerCase();
  password = String(password || "").trim();
  pageDestino = pageDestino || "Index";

  const user = obtenerUsuarioSistema_(usuario);

  if (!user || !user.activo) {
    return { ok: false, mensaje: "Usuario o contraseña incorrectos." };
  }

  const hashIngresado = hashPassword_(password);

  if (user.passwordHash !== hashIngresado) {
    return { ok: false, mensaje: "Usuario o contraseña incorrectos." };
  }

  if (!usuarioPuedeEntrar_(user.rol, pageDestino)) pageDestino = "Index";

  const token = Utilities.getUuid();
  const sesion = {
    usuario: usuario,
    nombre: user.nombre,
    rol: user.rol,
    creado: new Date().toISOString()
  };

  CacheService.getScriptCache().put("sesion_" + token, JSON.stringify(sesion), 21600);

  return {
    ok: true,
    token: token,
    usuario: usuario,
    nombre: user.nombre,
    rol: user.rol,
    page: pageDestino,
    url: ScriptApp.getService().getUrl() + "?page=" + encodeURIComponent(pageDestino) + "&token=" + encodeURIComponent(token)
  };
}

function cerrarSesion(token) {
  if (token) CacheService.getScriptCache().remove("sesion_" + token);
  return ScriptApp.getService().getUrl();
}

function obtenerSesionActual(token) {
  const sesion = obtenerSesionPorToken_(token);

  if (!sesion) {
    return { ok: false, usuario: "", nombre: "", rol: "", permisos: {} };
  }

  return {
    ok: true,
    usuario: sesion.usuario,
    nombre: sesion.nombre,
    rol: sesion.rol,
    permisos: obtenerPermisosFrontend_(sesion.rol)
  };
}

function obtenerSesionPorToken_(token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get("sesion_" + token);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function usuarioPuedeEntrar_(rol, page) {
  const permitidas = PERMISOS_POR_ROL[rol] || [];
  return permitidas.includes(page);
}

function obtenerPermisosFrontend_(rol) {
  if (rol === "admin") {
    return {
      usuariosAdministrar: true,
      alumnosConsultar: true,
      alumnosCargarJornada: true,
      alumnosGenerarPlanilla: true,
      alumnosNuevoAlumno: true,
      alumnosPactarHorarios: true,
      alumnosEditarJornadas: true
    };
  }

  if (rol === "secretario") {
    return {
      usuariosAdministrar: false,
      alumnosConsultar: true,
      alumnosCargarJornada: true,
      alumnosGenerarPlanilla: true,
      alumnosNuevoAlumno: false,
      alumnosPactarHorarios: false,
      alumnosEditarJornadas: true
    };
  }

  return {
    usuariosAdministrar: false,
    alumnosConsultar: true,
    alumnosCargarJornada: false,
    alumnosGenerarPlanilla: false,
    alumnosNuevoAlumno: false,
    alumnosPactarHorarios: false,
    alumnosEditarJornadas: false
  };
}

function getUrlConToken(page, token) {
  return ScriptApp.getService().getUrl() + "?page=" + encodeURIComponent(page) + "&token=" + encodeURIComponent(token || "");
}

function validarPermisoServidor_(token, permiso) {
  const sesion = obtenerSesionPorToken_(token);
  if (!sesion) throw new Error("Sesión vencida o no iniciada.");

  const permisos = obtenerPermisosFrontend_(sesion.rol);
  if (permiso && permisos[permiso] !== true) {
    throw new Error("No tenés permiso para realizar esta acción.");
  }

  return sesion;
}

/* =========================
   ADMINISTRACIÓN DE USUARIOS
   Solo rol admin
========================= */

function asegurarHojaUsuariosSistema_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_USUARIOS_SISTEMA);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_USUARIOS_SISTEMA);
    hoja.appendRow(["Usuario", "PasswordHash", "Nombre", "Rol", "Activo", "Creado"]);
  }

  const lastRow = hoja.getLastRow();

  if (lastRow < 2) {
    hoja.appendRow([
      "admin",
      hashPassword_("admin123"),
      "Admin UAP",
      "admin",
      true,
      new Date()
    ]);
  }
}

function hashPassword_(password) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password || ""),
    Utilities.Charset.UTF_8
  );

  return bytes.map(function(b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");
}

function obtenerUsuarioSistema_(usuario) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_USUARIOS_SISTEMA);
  if (!hoja) return null;

  const datos = hoja.getDataRange().getValues();
  usuario = String(usuario || "").trim().toLowerCase();

  for (let i = 1; i < datos.length; i++) {
    const usuarioFila = String(datos[i][0] || "").trim().toLowerCase();

    if (usuarioFila === usuario) {
      return {
        fila: i + 1,
        usuario: usuarioFila,
        passwordHash: String(datos[i][1] || ""),
        nombre: String(datos[i][2] || ""),
        rol: String(datos[i][3] || ""),
        activo: datos[i][4] === true || String(datos[i][4]).toUpperCase() === "TRUE",
        creado: datos[i][5]
      };
    }
  }

  return null;
}

function listarUsuariosSistema(token) {
  validarPermisoServidor_(token, "usuariosAdministrar");
  asegurarHojaUsuariosSistema_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_USUARIOS_SISTEMA);
  const datos = hoja.getDataRange().getValues();
  const usuarios = [];

  for (let i = 1; i < datos.length; i++) {
    usuarios.push({
      fila: i + 1,
      usuario: String(datos[i][0] || ""),
      nombre: String(datos[i][2] || ""),
      rol: String(datos[i][3] || ""),
      activo: datos[i][4] === true || String(datos[i][4]).toUpperCase() === "TRUE",
      creado: datos[i][5] instanceof Date
        ? Utilities.formatDate(datos[i][5], Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")
        : String(datos[i][5] || "")
    });
  }

  return usuarios;
}

function crearUsuarioSistema(token, obj) {
  validarPermisoServidor_(token, "usuariosAdministrar");
  asegurarHojaUsuariosSistema_();

  const usuario = String(obj.usuario || "").trim().toLowerCase();
  const password = String(obj.password || "").trim();
  const nombre = String(obj.nombre || "").trim();
  const rol = String(obj.rol || "").trim();

  if (!usuario || !password || !nombre || !rol) {
    return "Completá usuario, contraseña, nombre y rol.";
  }

  if (!["admin", "secretario", "alumno"].includes(rol)) {
    return "Rol inválido.";
  }

  if (obtenerUsuarioSistema_(usuario)) {
    return "Ya existe un usuario con ese nombre.";
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_USUARIOS_SISTEMA);

  hoja.appendRow([
    usuario,
    hashPassword_(password),
    nombre,
    rol,
    true,
    new Date()
  ]);

  return "OK";
}

function cambiarPasswordUsuarioSistema(token, usuario, nuevaPassword) {
  validarPermisoServidor_(token, "usuariosAdministrar");

  usuario = String(usuario || "").trim().toLowerCase();
  nuevaPassword = String(nuevaPassword || "").trim();

  if (!usuario || !nuevaPassword) return "Falta usuario o contraseña.";

  const user = obtenerUsuarioSistema_(usuario);
  if (!user) return "Usuario no encontrado.";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_USUARIOS_SISTEMA);
  hoja.getRange(user.fila, 2).setValue(hashPassword_(nuevaPassword));

  return "OK";
}

function cambiarEstadoUsuarioSistema(token, usuario, activo) {
  validarPermisoServidor_(token, "usuariosAdministrar");

  usuario = String(usuario || "").trim().toLowerCase();
  const user = obtenerUsuarioSistema_(usuario);
  if (!user) return "Usuario no encontrado.";

  if (usuario === "admin" && activo === false) {
    return "No podés desactivar el usuario admin principal.";
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_USUARIOS_SISTEMA);
  hoja.getRange(user.fila, 5).setValue(Boolean(activo));

  return "OK";
}

function actualizarRolUsuarioSistema(token, usuario, rol) {
  validarPermisoServidor_(token, "usuariosAdministrar");

  usuario = String(usuario || "").trim().toLowerCase();
  rol = String(rol || "").trim();

  if (!["admin", "secretario", "alumno"].includes(rol)) {
    return "Rol inválido.";
  }

  if (usuario === "admin" && rol !== "admin") {
    return "No podés quitarle el rol admin al usuario admin principal.";
  }

  const user = obtenerUsuarioSistema_(usuario);
  if (!user) return "Usuario no encontrado.";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_USUARIOS_SISTEMA);
  hoja.getRange(user.fila, 4).setValue(rol);

  return "OK";
}

/* =========================
   ALUMNOS
========================= */

function buscarInfoAlumno(idOpcional) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaAlumnos = ss.getSheetByName("Alumnos");
  if (!hojaAlumnos) return { error: "Hoja Alumnos no encontrada" };

  const id = idOpcional.toString().trim();
  const datos = hojaAlumnos.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (
      datos[i][0].toString().trim() === id ||
      datos[i][1].toString().toLowerCase().includes(id.toLowerCase())
    ) {
      return {
        id: datos[i][0],
        nombre: datos[i][1],
        plan: datos[i][2],
        carrera: datos[i][3],
        telefono: datos[i][4],
        direccion: datos[i][5],
        FechaNacimiento: datos[i][6]
          ? Utilities.formatDate(new Date(datos[i][6]), Session.getScriptTimeZone(), "dd/MM/yyyy")
          : "No registrada"
      };
    }
  }

  return { error: "Alumno no encontrado" };
}

function guardarNuevoAlumno(obj) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("Alumnos");
    hoja.appendRow([obj.id, obj.nombre, obj.plan, obj.carrera, obj.telefono, obj.direccion, obj.nac]);
    return "✅ Alumno guardado con éxito.";
  } catch (e) {
    return "❌ Error al guardar: " + e.toString();
  }
}

function buscarDatosAlumno(idSolicitado, mesSolicitado) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaReg = ss.getSheetByName("Registros alumnos Becuap");
  if (!hojaReg) return { error: "Hoja Registros alumnos Becuap no encontrada" };

  const datos = hojaReg.getDataRange().getValues();
  const filasHoras = [];
  const idBusqueda = idSolicitado.toString().trim();
  const mesBusqueda = parseInt(mesSolicitado);

  for (let i = 1; i < datos.length; i++) {
    const idFila = datos[i][0].toString().trim();
    const fechaFila = datos[i][1];

    if (!(fechaFila instanceof Date)) continue;

    const mesFila = fechaFila.getMonth() + 1;
    const anioFila = fechaFila.getFullYear();

    if (idFila === idBusqueda && mesFila === mesBusqueda && anioFila === 2026) {
      const valorTotal = datos[i][6];
      let totalMostrar = "0:00";

      const totalDecimal = Number(valorTotal.toString().replace(",", ".")) || 0;

      if (valorTotal !== "" && !isNaN(totalDecimal)) {
        const h = Math.floor(totalDecimal);
        const m = Math.round((totalDecimal - h) * 60);
        totalMostrar = h + ":" + (m < 10 ? "0" + m : m);
      } else if (typeof valorTotal === "string" && valorTotal.includes(":")) {
        totalMostrar = valorTotal;
      }

      filasHoras.push({
        dia: fechaFila.getDate(),
        e1: datos[i][2] instanceof Date ? Utilities.formatDate(datos[i][2], Session.getScriptTimeZone(), "HH:mm") : datos[i][2],
        s1: datos[i][3] instanceof Date ? Utilities.formatDate(datos[i][3], Session.getScriptTimeZone(), "HH:mm") : datos[i][3],
        e2: datos[i][4] instanceof Date ? Utilities.formatDate(datos[i][4], Session.getScriptTimeZone(), "HH:mm") : datos[i][4],
        s2: datos[i][5] instanceof Date ? Utilities.formatDate(datos[i][5], Session.getScriptTimeZone(), "HH:mm") : datos[i][5],
        total: totalMostrar,
        totalDecimal: totalDecimal,
        obs: datos[i][7] || ""
      });
    }
  }

  const info = buscarInfoAlumno(idBusqueda);
  if (info.error) return info;

  return {
    nombre: info.nombre,
    horas: filasHoras,
    mes: mesBusqueda
  };
}

function listarJornadasAlumno(idSolicitado, mesSolicitado) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Registros alumnos Becuap");
  if (!hoja) return { error: "Hoja Registros alumnos Becuap no encontrada" };

  const datos = hoja.getDataRange().getValues();
  const idBusqueda = String(idSolicitado).trim();
  const mesBusqueda = parseInt(mesSolicitado);
  const tz = Session.getScriptTimeZone();

  const jornadas = [];

  for (let i = 1; i < datos.length; i++) {
    const idFila = String(datos[i][0]).trim();
    const fecha = datos[i][1];

    if (idFila !== idBusqueda) continue;
    if (!(fecha instanceof Date)) continue;
    if (fecha.getFullYear() !== 2026) continue;
    if (fecha.getMonth() + 1 !== mesBusqueda) continue;

    jornadas.push({
      fila: i + 1,
      fecha: Utilities.formatDate(fecha, tz, "yyyy-MM-dd"),
      fechaMostrar: Utilities.formatDate(fecha, tz, "dd/MM/yyyy"),
      e1: formatearHoraCelda_(datos[i][2]),
      s1: formatearHoraCelda_(datos[i][3]),
      e2: formatearHoraCelda_(datos[i][4]),
      s2: formatearHoraCelda_(datos[i][5]),
      total: datos[i][6],
      obs: datos[i][7] || ""
    });
  }

  return { ok: true, jornadas };
}

function actualizarJornadaAlumno(j) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("Registros alumnos Becuap");
    if (!hoja) return "Hoja Registros alumnos Becuap no encontrada";

    const fila = Number(j.fila);
    if (!fila || fila < 2) return "Fila inválida";

    const p = j.fecha.split("-");
    const fechaObj = new Date(p[0], p[1] - 1, p[2]);

    const totalDecimal = calcularTotalJornada_(j.e1, j.s1, j.e2, j.s2);

    hoja.getRange(fila, 2, 1, 7).setValues([[
      fechaObj,
      j.e1,
      j.s1,
      j.e2,
      j.s2,
      totalDecimal,
      j.obs || ""
    ]]);

    return "OK";
  } catch (e) {
    return "Error al actualizar jornada: " + e.toString();
  }
}

function eliminarJornadaAlumno(fila) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Registros alumnos Becuap");
  if (!hoja) return "Hoja Registros alumnos Becuap no encontrada";

  fila = Number(fila);
  if (!fila || fila < 2) return "Fila inválida";

  hoja.deleteRow(fila);
  return "OK";
}

function calcularTotalJornada_(e1, s1, e2, s2) {
  function aMin(t) {
    if (!t || String(t).indexOf(":") === -1) return 0;
    const s = String(t).split(":");
    return parseInt(s[0]) * 60 + parseInt(s[1]);
  }

  const minT1 = Math.max(0, aMin(s1) - aMin(e1));
  const minT2 = Math.max(0, aMin(s2) - aMin(e2));

  return parseFloat(((minT1 + minT2) / 60).toFixed(2));
}

function formatearHoraCelda_(valor) {
  if (!valor) return "";
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "HH:mm");
  }
  return String(valor);
}

function registrarJornada(f) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("Registros alumnos Becuap");

    if (!hoja) return "Error: hoja Registros alumnos Becuap no encontrada";

    const p = f.fecha.split("-");
    const fechaObj = new Date(p[0], p[1] - 1, p[2]);

    const totalDecimal = calcularTotalJornada_(f.e1, f.s1, f.e2, f.s2);

    const filaDestino = obtenerPrimeraFilaLibreReal_(hoja);

    hoja.getRange(filaDestino, 1, 1, 8).setValues([[
      f.id,
      fechaObj,
      f.e1,
      f.s1,
      f.e2,
      f.s2,
      totalDecimal,
      f.obs || ""
    ]]);

    return "OK";
  } catch (e) {
    return "Error en el servidor: " + e.toString();
  }
}

function obtenerPrimeraFilaLibreReal_(hoja) {
  const datos = hoja.getRange(1, 1, hoja.getMaxRows(), 8).getValues();

  for (let i = datos.length - 1; i >= 1; i--) {
    const filaTieneDatos = datos[i].some(celda => celda !== "" && celda !== null);

    if (filaTieneDatos) {
      return i + 2;
    }
  }

  return 2;
}

function obtenerHorarioPactado(id, mes) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("Horarios_Pactados");
    if (!hoja) return [];

    const datos = hoja.getDataRange().getValues();
    const horariosDelMes = [];

    for (let i = 1; i < datos.length; i++) {
      const idFila = datos[i][0].toString();
      const fechaFila = new Date(datos[i][1]);

      if (idFila === id.toString() && fechaFila.getMonth() + 1 === parseInt(mes)) {
        horariosDelMes.push({
          dia: fechaFila.getDate(),
          rango: datos[i][2]
        });
      }
    }

    return horariosDelMes;
  } catch (e) {
    return [];
  }
}

function registrarHorariosMasivos(objeto) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Horarios_Pactados");

  const diasArr = objeto.dias.split(",").map(d => d.trim());

  diasArr.forEach(dia => {
    if (dia !== "") {
      const fechaObj = new Date(2026, parseInt(objeto.mes) - 1, parseInt(dia));
      hoja.appendRow([objeto.id, fechaObj, objeto.rango]);
    }
  });

  return true;
}

/* =========================
   OFICINA
========================= */

function obtenerDepartamentos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Departamentos");
  if (!hoja) return [];
  return hoja.getRange("A2:A" + hoja.getLastRow()).getValues().flat().filter(String);
}

function registrarGastoFotocopia(d) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("Fotocopias");
    const fechaObj = new Date(d.fecha + "T12:00:00");

    hoja.appendRow([fechaObj, d.depto, d.cant, d.valor, d.total]);

    return "OK";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function obtenerDatosFotocopias(mes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Fotocopias");
  if (!hoja) return [];

  const datos = hoja.getDataRange().getValues();
  const resumen = {};
  const mesBusqueda = parseInt(mes);

  for (let i = 1; i < datos.length; i++) {
    const valorFecha = datos[i][0];
    const fecha = valorFecha instanceof Date ? valorFecha : new Date(valorFecha);

    if (isNaN(fecha.getTime())) continue;

    if (fecha.getMonth() + 1 === mesBusqueda && fecha.getFullYear() === 2026) {
      const depto = datos[i][1];
      const cant = parseInt(datos[i][2]) || 0;
      const precio = parseFloat(datos[i][3]) || 0;
      const importe = parseFloat(datos[i][4]) || 0;

      if (!resumen[depto]) {
        resumen[depto] = {
          departamento: depto,
          cantidad: 0,
          importe: 0,
          precioUnit: precio
        };
      }

      resumen[depto].cantidad += cant;
      resumen[depto].importe += importe;
    }
  }

  return Object.values(resumen);
}

function registrarPagoEfectivo(p) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("PagoEfectivo");

    if (!hoja) return "Error: hoja PagoEfectivo no encontrada";

    const fechaObj = new Date(p.fecha + "T12:00:00");

    hoja.appendRow([
      fechaObj,
      p.cantCopias,
      p.valCopias,
      p.total
    ]);

    return "OK";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function obtenerTotalEfectivoMensual(mes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("PagoEfectivo");

  if (!hoja) return 0;

  const datos = hoja.getDataRange().getValues();
  const mesBusqueda = parseInt(mes);
  let totalMes = 0;

  for (let i = 1; i < datos.length; i++) {
    const fecha = datos[i][0];

    if (fecha instanceof Date) {
      const mesFila = fecha.getMonth() + 1;
      const anioFila = fecha.getFullYear();

      if (mesFila === mesBusqueda && anioFila === 2026) {
        totalMes += Number(datos[i][3].toString().replace(",", ".")) || 0;
      }
    }
  }

  return totalMes;
}

/* =========================
   RESERVAS ESPECIALES - SISTEMA VIEJO
========================= */

function obtenerReservas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Reserva_de_equipos");

  if (!hoja) return [];

  const datos = hoja.getDataRange().getDisplayValues();

  return datos.length <= 1 ? [] : datos.slice(1);
}

function registrarNuevaReserva(r) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("Reserva_de_equipos");

    hoja.appendRow([
      r.fecha,
      r.depto,
      r.equipo,
      r.horario,
      r.obs,
      r.tel,
      false,
      false
    ]);

    return "OK";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function cambiarEstadoReserva(fila, columna) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("Reserva_de_equipos");
    const celda = hoja.getRange(fila, columna);
    const valorActual = celda.getValue();

    celda.setValue(!valorActual);

    return "OK";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

/* =========================
   RESERVAS - MATRIZ HORARIA NUEVA
   Hoja: BD_Reservas
   Columnas:
   A Día
   B Profesor
   C Hora Inicio
   D Hora Fin
   E Aula
   F Recurso
   G Estado
========================= */

function obtenerReservasPorDia(dia) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("BD_Reservas");

  if (!hoja) {
    return {
      ok: false,
      mensaje: "No existe la hoja BD_Reservas",
      datos: []
    };
  }

  asegurarEncabezadosBDReservas_(hoja);

  const datos = hoja.getDataRange().getValues();

  if (datos.length <= 1) {
    return {
      ok: true,
      mensaje: "Sin reservas",
      datos: []
    };
  }

  const diaBuscado = normalizarTexto(dia);
  const reservas = [];

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];

    if (normalizarTexto(fila[0]) !== diaBuscado) continue;

    reservas.push({
      filaOriginal: i + 1,
      dia: fila[0],
      profesor: fila[1],
      horaInicio: formatearHoraReserva(fila[2]),
      horaFin: formatearHoraReserva(fila[3]),
      aula: fila[4],
      recurso: fila[5],
      estado: fila[6] || "Pendiente"
    });
  }

  return {
    ok: true,
    mensaje: "OK",
    datos: reservas
  };
}

function registrarNuevaReservaMatriz(r) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName("BD_Reservas");

    if (!hoja) {
      hoja = ss.insertSheet("BD_Reservas");
    }

    asegurarEncabezadosBDReservas_(hoja);

    hoja.appendRow([
      r.dia,
      r.profesor,
      r.horaInicio,
      r.horaFin,
      r.aula,
      r.recurso,
      r.estado || "Pendiente"
    ]);

    return "OK";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function actualizarReservaMatriz(r) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("BD_Reservas");

    if (!hoja) return "Error: hoja BD_Reservas no encontrada";

    const fila = parseInt(r.filaOriginal, 10);

    if (!fila || fila < 2) {
      return "Error: fila inválida";
    }

    hoja.getRange(fila, 1, 1, 7).setValues([[
      r.dia,
      r.profesor,
      r.horaInicio,
      r.horaFin,
      r.aula,
      r.recurso,
      r.estado || "Pendiente"
    ]]);

    return "OK";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function cambiarEstadoReservaMatriz(filaOriginal, estado) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("BD_Reservas");

    if (!hoja) return "Error: hoja BD_Reservas no encontrada";

    const fila = parseInt(filaOriginal, 10);

    if (!fila || fila < 2) {
      return "Error: fila inválida";
    }

    hoja.getRange(fila, 7).setValue(estado);

    return "OK";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function eliminarReservaMatriz(filaOriginal) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("BD_Reservas");

    if (!hoja) return "Error: hoja BD_Reservas no encontrada";

    const fila = parseInt(filaOriginal, 10);

    if (!fila || fila < 2) {
      return "Error: fila inválida";
    }

    hoja.deleteRow(fila);

    return "OK";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function asegurarEncabezadosBDReservas_(hoja) {
  const encabezados = [["Día", "Profesor", "Hora Inicio", "Hora Fin", "Aula", "Recurso", "Estado"]];

  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, 7).setValues(encabezados);
    return;
  }

  const actual = hoja.getRange(1, 1, 1, 7).getValues()[0];

  if (!actual[0]) {
    hoja.getRange(1, 1, 1, 7).setValues(encabezados);
    return;
  }

  if (!actual[6]) {
    hoja.getRange(1, 7).setValue("Estado");
  }
}

function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatearHoraReserva(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "HH:mm");
  }

  return String(valor || "").trim();
}

/* =========================
   CUMPLEAÑOS
========================= */

function obtenerCumpleanosProximos() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("Alumnos");

    if (!hoja) return [];

    const datos = hoja.getDataRange().getValues();

    if (datos.length <= 1) return [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(hoy.getDate() + 15);

    const proximosCumples = [];

    for (let i = 1; i < datos.length; i++) {
      const nombre = datos[i][1];
      const fechaNac = datos[i][6];

      if (!nombre || !(fechaNac instanceof Date)) continue;

      const cumpleEsteAnio = new Date(hoy.getFullYear(), fechaNac.getMonth(), fechaNac.getDate());

      if (cumpleEsteAnio < hoy) {
        cumpleEsteAnio.setFullYear(hoy.getFullYear() + 1);
      }

      if (cumpleEsteAnio >= hoy && cumpleEsteAnio <= fechaLimite) {
        proximosCumples.push({
          nombre: nombre,
          fecha: Utilities.formatDate(fechaNac, Session.getScriptTimeZone(), "dd/MM"),
          orden: cumpleEsteAnio.getTime()
        });
      }
    }

    proximosCumples.sort((a, b) => a.orden - b.orden);

    return proximosCumples;
  } catch (e) {
    console.error("Error al buscar próximos cumpleaños: " + e.toString());
    return [];
  }
}
function obtenerProfesoresActivos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName("BD_Profesores");

  if (!hoja) {
    hoja = ss.insertSheet("BD_Profesores");
    hoja.appendRow(["ID", "Profesor", "Activo"]);
    return [];
  }

  const datos = hoja.getDataRange().getValues();
  const profesores = [];

  for (let i = 1; i < datos.length; i++) {
    const activo = datos[i][2];

    if (activo === true || String(activo).toUpperCase() === "TRUE" || activo === "") {
      profesores.push({
        id: datos[i][0],
        nombre: datos[i][1]
      });
    }
  }

  return profesores.filter(p => p.nombre);
}
function guardarCierreCaja(datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName("Cierres_Caja");

  if (!hoja) {
    hoja = ss.insertSheet("Cierres_Caja");
    hoja.appendRow([
      "Fecha",
      "Total Recibos",
      "Total Mercado Pago",
      "Total Efectivo",
      "Diferencia",
      "Recibos JSON",
      "Mercado Pago JSON",
      "Efectivo JSON"
    ]);
  }

  hoja.appendRow([
    new Date(),
    datos.totalRecibos,
    datos.totalML,
    datos.totalEfectivo,
    datos.diferencia,
    JSON.stringify(datos.recibos),
    JSON.stringify(datos.mercadoPago),
    JSON.stringify(datos.efectivo)
  ]);

  return "OK";
}
function buscarInfoParaEvaluacion(legajo, cuatrimestre) {
  var libro = SpreadsheetApp.getActiveSpreadsheet();

  // 1. BUSCAR NOMBRE
  var hojaAlumnos = libro.getSheetByName("Alumnos"); 
  var datosAlumnos = hojaAlumnos.getDataRange().getValues();
  var nombre = "No encontrado";

  for (var i = 1; i < datosAlumnos.length; i++) {
    if (datosAlumnos[i][0] == legajo) { 
      nombre = datosAlumnos[i][1]; 
      break;
    }
  }

  // 2. BUSCAR FECHA DE INICIO
  var hojaCargas = libro.getSheetByName("Registros alumnos Becuap"); 
  var datosCargas = hojaCargas.getDataRange().getValues();
  var fechaInicio = "Sin cargas previas";
  var fechasEncontradas = [];

  for (var j = 1; j < datosCargas.length; j++) {
    if (datosCargas[j][0] == legajo) { 
      var fecha = datosCargas[j][1]; 
      if (fecha && fecha instanceof Date) {
        fechasEncontradas.push(fecha);
      }
    }
  }

  if (fechasEncontradas.length > 0) {
    fechasEncontradas.sort(function(a, b) { return a - b; });
    var primerFecha = fechasEncontradas[0];
    fechaInicio = ("0" + primerFecha.getDate()).slice(-2) + "/" +
                  ("0" + (primerFecha.getMonth() + 1)).slice(-2) + "/" +
                  primerFecha.getFullYear();
  }

  // 3. BUSCAR TODO EL HISTORIAL DE NOTAS GUARDADAS
  var datosGuardados = {};
  var hojaEval = libro.getSheetByName("EvaluacionAlumnos");
  
  if (hojaEval) {
    var datosEval = hojaEval.getDataRange().getValues();
    for (var k = 1; k < datosEval.length; k++) {
      if (datosEval[k][0] == legajo && datosEval[k][1] == cuatrimestre) {
         datosGuardados = {
            promedio: datosEval[k][4] || "",
            MARZO: parseJSONSafe(datosEval[k][5]),
            ABRIL: parseJSONSafe(datosEval[k][6]),
            MAYO: parseJSONSafe(datosEval[k][7]),
            JUNIO: parseJSONSafe(datosEval[k][8]),
            JULIO: parseJSONSafe(datosEval[k][9]),
            AGOSTO: parseJSONSafe(datosEval[k][10]),
            SEPTIEMBRE: parseJSONSafe(datosEval[k][11]),
            OCTUBRE: parseJSONSafe(datosEval[k][12]),
            NOVIEMBRE: parseJSONSafe(datosEval[k][13]),
            obsGeneral: datosEval[k][14] || ""
         };
         break;
      }
    }
  }

  return {
    nombre: nombre,
    fechaInicio: fechaInicio,
    evaluacion: datosGuardados
  };
}

// Función auxiliar para que no se rompa si una celda está vacía
function parseJSONSafe(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch(e) {
    return null;
  }
}
function guardarEvaluacionBackend(data) {
  try {
    var libro = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = libro.getSheetByName("EvaluacionAlumnos");

    if (!hoja) return "Error: No se encontró la pestaña 'EvaluacionAlumnos'.";

    var datos = hoja.getDataRange().getValues();
    var filaEncontrada = -1;

    // Relacionamos los meses con sus columnas exactas (A=1, B=2, C=3, etc.)
    // Marzo es F(6), Abril es G(7), Mayo es H(8), Junio es I(9), Julio es J(10), Agosto K(11), Sep L(12), Oct M(13), Nov N(14)
    var colMeses = {
      "MARZO": 6, "ABRIL": 7, "MAYO": 8, "JUNIO": 9,
      "JULIO": 10, "AGOSTO": 11, "SEPTIEMBRE": 12, "OCTUBRE": 13, "NOVIEMBRE": 14
    };

    // Buscamos si ya existe el Legajo para ese mismo Cuatrimestre
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] == data.legajo && datos[i][1] == data.cuatrimestre) {
        filaEncontrada = i + 1; // +1 porque getRange empieza en 1 (no en 0)
        break;
      }
    }

    var colMesActual = colMeses[data.mes];

    if (filaEncontrada !== -1) {
      // 1. SI YA EXISTE: Actualizamos solo la columna del mes y la observación general
      hoja.getRange(filaEncontrada, colMesActual).setValue(data.datosMes);
      if (data.obsGeneral) {
        hoja.getRange(filaEncontrada, 15).setValue(data.obsGeneral); // Columna O (15)
      }
    } else {
      // 2. SI NO EXISTE: Creamos una fila nueva completa
      var nuevaFila = [
        data.legajo,                // A
        data.cuatrimestre,          // B
        data.fechaInicio,           // C
        data.departamento,          // D
        "",                         // E (Promedio, lo calcula después)
        "", "", "", "", "", "", "", "", "", // F a N (Meses vacíos)
        data.obsGeneral             // O (Obs General)
      ];

      // Metemos el dato del mes en la posición de la matriz (índice - 1)
      nuevaFila[colMesActual - 1] = data.datosMes;

      hoja.appendRow(nuevaFila);
      filaEncontrada = hoja.getLastRow();
    }

    // 3. RECALCULAR PROMEDIO GENERAL
    calcularPromedioEvaluacion(hoja, filaEncontrada);

    return "OK";
  } catch (e) {
    return "Error en el servidor: " + e.message;
  }
}

// Función auxiliar para leer todas las notas guardadas y sacar el promedio
function calcularPromedioEvaluacion(hoja, fila) {
  var datosFila = hoja.getRange(fila, 6, 1, 9).getValues()[0]; // Trae todo de Marzo a Noviembre
  var sumaTotal = 0;
  var cantidadNotas = 0;

  for (var i = 0; i < datosFila.length; i++) {
    if (datosFila[i]) {
      try {
        var mesObj = JSON.parse(datosFila[i]); // Desarmamos el JSON
        if (mesObj.notas && mesObj.notas.length > 0) {
          for (var j = 0; j < mesObj.notas.length; j++) {
            if (mesObj.notas[j]) {
              sumaTotal += parseInt(mesObj.notas[j]);
              cantidadNotas++;
            }
          }
        }
      } catch(e) {
         // Si la celda tiene otra cosa que no es JSON, la ignora
      }
    }
  }

  var promedio = "";
  if (cantidadNotas > 0) {
    promedio = (sumaTotal / cantidadNotas).toFixed(2); // Promedio con 2 decimales
  }

  // Guardamos el promedio en la columna E (5)
  hoja.getRange(fila, 5).setValue(promedio);
}
// Función para incluir archivos HTML dentro de otros (como Index)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
// Guarda el ID del plano activo enviado desde cualquier usuario
function guardarEstadoPlano(idPlano) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("EstadoApp") || ss.insertSheet("EstadoApp");
  
  // Guardamos en la celda A1 el nombre/ID del plano activo
  sheet.getRange("A1").setValue(idPlano);
  return { exito: true, plano: idPlano };
}
/* =========================
   SISTEMA DE PLANO SECUNDARIO (REAL-TIME)
========================= */

// Lee el estado completo desde la hoja PlanoSecu
function obtenerAulasYEquipos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PlanoSecu');
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const datos = sheet.getRange(2, 1, lastRow - 1, 3).getValues(); 
  
  return datos.map((fila, index) => ({
    fila: index + 2,
    aula: String(fila[0]).trim(),
    tv: fila[1],
    activo: fila[2] === true || String(fila[2]).toUpperCase() === "TRUE" // Columna C (ACTIVO)
  }));
}

// Guarda en la hoja PlanoSecu cuando un usuario activa/desactiva un aula
function actualizarEstadoAula(nombreAula, estado) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PlanoSecu');
    if (!sheet) return "Hoja no encontrada";

    const datos = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    
    for (let i = 0; i < datos.length; i++) {
      if (String(datos[i][0]).trim().toLowerCase() === String(nombreAula).trim().toLowerCase()) {
        const filaDestino = i + 2;
        sheet.getRange(filaDestino, 3).setValue(Boolean(estado)); // Modifica la columna C (ACTIVO)
        return "OK";
      }
    }
    return "Aula no encontrada";
  } catch (e) {
    return "Error: " + e.toString();
  }
}