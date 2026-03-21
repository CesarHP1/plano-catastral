import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ESTADOS = [
  'AGUASCALIENTES','BAJA CALIFORNIA','BAJA CALIFORNIA SUR','CAMPECHE',
  'CHIAPAS','CHIHUAHUA','CIUDAD DE MÉXICO','COAHUILA DE ZARAGOZA',
  'COLIMA','DURANGO','ESTADO DE MÉXICO','GUANAJUATO','GUERRERO',
  'HIDALGO','JALISCO','MICHOACÁN DE OCAMPO','MORELOS','NAYARIT',
  'NUEVO LEÓN','OAXACA','PUEBLA','QUERÉTARO','QUINTANA ROO',
  'SAN LUIS POTOSÍ','SINALOA','SONORA','TABASCO','TAMAULIPAS',
  'TLAXCALA','VERACRUZ DE IGNACIO DE LA LLAVE','YUCATÁN','ZACATECAS'
];

const MUNICIPIOS = [
  'Acambay de Ruíz Castañeda','Acolman','Aculco','Almoloya de Alquisiras',
  'Almoloya de Juárez','Almoloya del Río','Amanalco','Amatepec','Amecameca',
  'Apaxco','Atenco','Atizapán','Atizapán de Zaragoza','Atlacomulco',
  'Atlautla','Axapusco','Ayapango','Calimaya','Capulhuac','Chalco',
  'Chapa de Mota','Chapultepec','Chiautla','Chicoloapan','Chiconcuac',
  'Chimalhuacán','Coacalco de Berriozábal','Coatepec Harinas','Cocotitlán',
  'Coyotepec','Cuautitlán','Cuautitlán Izcalli','Donato Guerra',
  'Ecatepec de Morelos','Ecatzingo','El Oro','Huehuetoca','Hueypoxtla',
  'Huixquilucan','Isidro Fabela','Ixtapaluca','Ixtapan de la Sal',
  'Ixtapan del Oro','Ixtlahuaca','Jaltenco','Jilotepec','Jilotzingo',
  'Jiquipilco','Jocotitlán','Joquicingo','Juchitepec','La Paz','Lerma',
  'Luvianos','Malinalco','Melchor Ocampo','Metepec','Mexicaltzingo',
  'Morelos','Naucalpan de Juárez','Nextlalpan','Nezahualcóyotl',
  'Nicolás Romero','Nopaltepec','Ocoyoacac','Ocuilan','Otumba',
  'Otzoloapan','Otzolotepec','Ozumba','Papalotla','Polotitlán','Rayón',
  'San Antonio la Isla','San Felipe del Progreso','San José del Rincón',
  'San Martín de las Pirámides','San Mateo Atenco','San Simón de Guerrero',
  'Santo Tomás','Soyaniquilpan de Juárez','Sultepec','Tecámac','Tejupilco',
  'Temamatla','Temascalapa','Temascalcingo','Temascaltepec','Temoaya',
  'Tenancingo','Tenango del Aire','Tenango del Valle','Teoloyucan',
  'Teotihuacán','Tepetlaoxtoc','Tepetlixpa','Tepotzotlán','Tequixquiac',
  'Texcaltitlán','Texcalyacac','Texcoco','Tezoyuca','Tianguistenco',
  'Timilpan','Tlalmanalco','Tlalnepantla de Baz','Tlatlaya','Toluca',
  'Tonanitla','Tonatico','Tultepec','Tultitlán','Valle de Bravo',
  'Valle de Chalco Solidaridad','Villa de Allende','Villa del Carbón',
  'Villa Guerrero','Villa Victoria','Xalatlaco','Xonacatlán',
  'Zacazonapan','Zacualpan','Zinacantepec','Zumpahuacán','Zumpango'
];

// ── Rosa de vientos mejorada ──────────────────────────────────────────────────
const RosaVientos = ({ x = 0, y = 0, r = 36 }) => {
  const c = r;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Círculo exterior */}
      <circle cx={c} cy={c} r={r} fill="white" stroke="#222" strokeWidth="1.8"/>
      <circle cx={c} cy={c} r={r * 0.55} fill="none" stroke="#aaa" strokeWidth="0.7"/>

      {/* Puntas de la rosa – 8 direcciones */}
      {/* N grande negro */}
      <polygon points={`${c},${c - r + 2} ${c + r*0.18},${c} ${c},${c - r*0.45}`} fill="#c00"/>
      <polygon points={`${c},${c - r + 2} ${c - r*0.18},${c} ${c},${c - r*0.45}`} fill="#900"/>
      {/* S blanco */}
      <polygon points={`${c},${c + r - 2} ${c + r*0.18},${c} ${c},${c + r*0.45}`} fill="white" stroke="#444" strokeWidth="0.5"/>
      <polygon points={`${c},${c + r - 2} ${c - r*0.18},${c} ${c},${c + r*0.45}`} fill="#ddd" stroke="#444" strokeWidth="0.5"/>
      {/* E */}
      <polygon points={`${c + r - 2},${c} ${c},${c + r*0.18} ${c + r*0.45},${c}`} fill="white" stroke="#444" strokeWidth="0.5"/>
      <polygon points={`${c + r - 2},${c} ${c},${c - r*0.18} ${c + r*0.45},${c}`} fill="#ddd" stroke="#444" strokeWidth="0.5"/>
      {/* O */}
      <polygon points={`${c - r + 2},${c} ${c},${c + r*0.18} ${c - r*0.45},${c}`} fill="white" stroke="#444" strokeWidth="0.5"/>
      <polygon points={`${c - r + 2},${c} ${c},${c - r*0.18} ${c - r*0.45},${c}`} fill="#ddd" stroke="#444" strokeWidth="0.5"/>

      {/* Puntas diagonales pequeñas */}
      {[45,135,225,315].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const tipX = c + Math.cos(rad) * (r - 3);
        const tipY = c + Math.sin(rad) * (r - 3);
        const b1X = c + Math.cos(rad - 0.4) * r * 0.38;
        const b1Y = c + Math.sin(rad - 0.4) * r * 0.38;
        const b2X = c + Math.cos(rad + 0.4) * r * 0.38;
        const b2Y = c + Math.sin(rad + 0.4) * r * 0.38;
        return <polygon key={deg} points={`${tipX},${tipY} ${b1X},${b1Y} ${c},${c} ${b2X},${b2Y}`} fill="#bbb" stroke="#888" strokeWidth="0.3"/>;
      })}

      {/* Círculo central */}
      <circle cx={c} cy={c} r={r * 0.1} fill="#c00" stroke="#800" strokeWidth="0.8"/>

      {/* Letras cardinales */}
      <text x={c} y={c - r + 10} textAnchor="middle" fontSize={r * 0.32} fontWeight="bold" fill="#c00" fontFamily="Arial">N</text>
      <text x={c} y={c + r - 2}  textAnchor="middle" fontSize={r * 0.25} fill="#333" fontFamily="Arial">S</text>
      <text x={c + r - 5} y={c + r*0.09} textAnchor="middle" fontSize={r * 0.25} fill="#333" fontFamily="Arial">E</text>
      <text x={c - r + 5} y={c + r*0.09} textAnchor="middle" fontSize={r * 0.25} fill="#333" fontFamily="Arial">O</text>
    </g>
  );
};

// ── Croquis del terreno ───────────────────────────────────────────────────────
const TerrenoCroquis = ({ norteM, surM, esteM, oesteM, norteCol, surCol, esteCol, oesteCol, usoSuelo, areaM2, imagenSrc }) => {
  const PAD_H = 70;   // espacio horizontal para etiquetas
  const PAD_V = 58;   // espacio vertical para etiquetas
  const MAX_W = 280;
  const MAX_H = 230;

  const safe = v => Math.max(v, 0.5);
  const maxHoriz = Math.max(safe(norteM), safe(surM));
  const maxVert  = Math.max(safe(esteM),  safe(oesteM));
  const scale    = Math.min(MAX_W / maxHoriz, MAX_H / maxVert, 16);

  // Escalar medidas
  const nW = safe(norteM)  * scale;
  const sW = safe(surM)    * scale;
  const eH = safe(esteM)   * scale;
  const oH = safe(oesteM)  * scale;

  // Anchura total del dibujo (el lado más largo de norte o sur)
  const drawW = Math.max(nW, sW);
  const drawH = Math.max(eH, oH);

  // Centrar horizontalmente Norte y Sur
  const nOffset = (drawW - nW) / 2;
  const sOffset = (drawW - sW) / 2;

  // Cuatro vértices: TL, TR, BR, BL
  // TL y TR en la parte superior; la altura izquierda es oesteM y la derecha esteM
  const TL = { x: PAD_H + nOffset,       y: PAD_V + (drawH - oH) };
  const TR = { x: PAD_H + nOffset + nW,  y: PAD_V + (drawH - eH) };
  const BR = { x: PAD_H + sOffset + sW,  y: PAD_V + drawH };
  const BL = { x: PAD_H + sOffset,       y: PAD_V + drawH };

  const points = `${TL.x},${TL.y} ${TR.x},${TR.y} ${BR.x},${BR.y} ${BL.x},${BL.y}`;

  // Centroide
  const cx = (TL.x + TR.x + BR.x + BL.x) / 4;
  const cy = (TL.y + TR.y + BR.y + BL.y) / 4;

  // Puntos medios de cada lado
  const midN = { x: (TL.x + TR.x) / 2, y: (TL.y + TR.y) / 2 };
  const midS = { x: (BL.x + BR.x) / 2, y: (BL.y + BR.y) / 2 };
  const midE = { x: (TR.x + BR.x) / 2, y: (TR.y + BR.y) / 2 };
  const midO = { x: (TL.x + BL.x) / 2, y: (TL.y + BL.y) / 2 };

  const svgW = drawW + PAD_H * 2;
  const svgH = drawH + PAD_V * 2;

  const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');

  // Caja de imagen (esquina inferior izquierda del croquis)
  const imgBoxX = PAD_H - 62;
  const imgBoxY = PAD_V + drawH - 50;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width={svgW} height={svgH}
      style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
      xmlns="http://www.w3.org/2000/svg">

      <defs>
        <pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0L0 0 0 12" fill="none" stroke="#dde3ea" strokeWidth="0.4"/>
        </pattern>
        <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(0,74,143,0.08)" strokeWidth="4"/>
        </pattern>
        <clipPath id="tc2"><polygon points={points}/></clipPath>
      </defs>

      {/* Fondo cuadriculado */}
      <rect width={svgW} height={svgH} fill="url(#grid)"/>

      {/* Relleno del terreno */}
      <polygon points={points} fill="rgba(200,225,245,0.5)"/>
      <rect x="0" y="0" width={svgW} height={svgH} fill="url(#hatch)" clipPath="url(#tc2)"/>

      {/* Contorno del terreno */}
      <polygon points={points} fill="none" stroke="#000" strokeWidth="2.2"/>

      {/* Vértices */}
      {[TL, TR, BR, BL].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#003a6e" stroke="white" strokeWidth="1"/>
      ))}

      {/* ─ Línea norte en rojo para orientación ─ */}
      <line x1={TL.x} y1={TL.y} x2={TR.x} y2={TR.y} stroke="#c00" strokeWidth="2.2"/>

      {/* ─ Cotas con flechas ─ */}
      {/* Norte */}
      <line x1={TL.x} y1={midN.y - 18} x2={TR.x} y2={midN.y - 18} stroke="#c00" strokeWidth="0.8" markerEnd="url(#arr)" markerStart="url(#arr)"/>
      <text x={midN.x} y={midN.y - 22} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#c00">{norteM.toFixed(2)} m</text>
      <text x={midN.x} y={midN.y - 12} textAnchor="middle" fontSize="7" fill="#555">{trunc(norteCol, 22)}</text>

      {/* Sur */}
      <line x1={BL.x} y1={midS.y + 18} x2={BR.x} y2={midS.y + 18} stroke="#444" strokeWidth="0.8"/>
      <text x={midS.x} y={midS.y + 14} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#000">{surM.toFixed(2)} m</text>
      <text x={midS.x} y={midS.y + 24} textAnchor="middle" fontSize="7" fill="#555">{trunc(surCol, 22)}</text>

      {/* Este (derecha) */}
      <text x={midE.x + 6} y={midE.y - 4} fontSize="8.5" fontWeight="bold" fill="#000">{esteM.toFixed(2)} m</text>
      <text x={midE.x + 6} y={midE.y + 6} fontSize="7" fill="#555">{trunc(esteCol, 14)}</text>

      {/* Oeste (izquierda) */}
      <text x={midO.x - 6} y={midO.y - 4} textAnchor="end" fontSize="8.5" fontWeight="bold" fill="#000">{oesteM.toFixed(2)} m</text>
      <text x={midO.x - 6} y={midO.y + 6} textAnchor="end" fontSize="7" fill="#555">{trunc(oesteCol, 14)}</text>

      {/* ─ Texto central ─ */}
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#003a6e">TERRENO</text>
      <text x={cx} y={cy + 4}  textAnchor="middle" fontSize="13" fontWeight="bold" fill="#000">{areaM2.toFixed(2)} m²</text>
      <text x={cx} y={cy + 17} textAnchor="middle" fontSize="8"  fill="#555">{usoSuelo}</text>

      {/* ─ Rosa de vientos (esquina superior derecha) ─ */}
      <RosaVientos x={svgW - 82} y={2} r={36}/>

      {/* ─ Caja de imagen (esquina inferior izquierda) ─ */}
      <rect x={4} y={svgH - 62} width={90} height={58} rx="3"
        fill="white" stroke="#888" strokeWidth="1" strokeDasharray="4,2"/>
      {imagenSrc
        ? <image href={imagenSrc} x={4} y={svgH - 62} width={90} height={58} preserveAspectRatio="xMidYMid meet"/>
        : <>
            <text x={49} y={svgH - 38} textAnchor="middle" fontSize="7" fill="#aaa">Foto / croquis</text>
            <text x={49} y={svgH - 28} textAnchor="middle" fontSize="7" fill="#aaa">del terreno</text>
            <text x={49} y={svgH - 16} textAnchor="middle" fontSize="18" fill="#ccc">📷</text>
          </>
      }
      <rect x={4} y={svgH - 62} width={90} height={58} rx="3"
        fill="none" stroke="#888" strokeWidth="1" strokeDasharray="4,2"/>

    </svg>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
const App = () => {
  const printRef = useRef();

  const [form, setForm] = useState({
    claveCatastral: '15-001-002-003-04',
    propietario: 'JUAN PÉREZ LÓPEZ',
    calle: 'CALLE DE LOS ARCOS',
    numero: '123',
    colonia: 'COL. CENTRO',
    codigoPostal: '54000',
    municipio: 'TLALNEPANTLA DE BAZ',
    estado: 'ESTADO DE MÉXICO',
    usoSuelo: 'HABITACIONAL',
    unidadMedida: 'metros',
    norteMedida: '15.00',
    norteColindancia: 'CALLE SIN NOMBRE',
    surMedida: '12.00',
    surColindancia: 'TERRENO COLINDANTE',
    esteMedida: '23.00',
    esteColindancia: 'CASA HABITACIÓN',
    oesteMedida: '30.00',
    oesteColindancia: 'AV. PRINCIPAL',
    fecha: new Date().toLocaleDateString('es-MX'),
  });

  const [munQuery, setMunQuery] = useState('Tlalnepantla de Baz');
  const [munSug, setMunSug]     = useState([]);
  const [showMun, setShowMun]   = useState(false);
  const [imagenSrc, setImagenSrc] = useState(null);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleMunInput = e => {
    const val = e.target.value;
    setMunQuery(val);
    if (val.length > 0) {
      setMunSug(MUNICIPIOS.filter(m => m.toLowerCase().includes(val.toLowerCase())).slice(0, 8));
      setShowMun(true);
    } else setShowMun(false);
  };

  const selectMun = m => { setMunQuery(m); setForm(f => ({ ...f, municipio: m.toUpperCase() })); setShowMun(false); };

  const handleImagen = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImagenSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const toM = val => {
    const v = parseFloat(val) || 0;
    if (form.unidadMedida === 'varas') return v * 0.838;
    if (form.unidadMedida === 'pies')  return v * 0.3048;
    return v;
  };

  const norteM = toM(form.norteMedida);
  const surM   = toM(form.surMedida);
  const esteM  = toM(form.esteMedida);
  const oesteM = toM(form.oesteMedida);
  const areaM2 = ((norteM + surM) / 2) * ((esteM + oesteM) / 2);

  const handlePrint = async () => {
    const el = printRef.current;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(img, 'PNG', 0, 0, pw, ph);
      pdf.save('Plano_Catastral_' + form.claveCatastral + '.pdf');
    } catch (err) { console.error(err); }
  };

  const lbl = { fontWeight:'bold', fontSize:'11px', marginBottom:'3px', display:'block', color:'#333' };
  const inp = { padding:'7px 9px', border:'1px solid #bbb', borderRadius:'3px', fontSize:'13px', width:'100%', boxSizing:'border-box', fontFamily:'Arial' };
  const sec = { color:'#004a8f', borderBottom:'2px solid #004a8f', paddingBottom:'4px', marginBottom:'12px', marginTop:'18px', fontSize:'13px', fontWeight:'bold' };
  const tdH = { border:'1px solid #000', padding:'2px 3px', fontWeight:'bold', background:'#e8eef5', fontSize:'8px', whiteSpace:'nowrap' };
  const tdV = { border:'1px solid #000', padding:'2px 3px', fontSize:'8px' };
  const thH = { background:'#003a6e', color:'white', padding:'3px 4px', textAlign:'center', fontSize:'7px', fontWeight:'bold' };

  return (
    <div style={{ fontFamily:'Arial, sans-serif', background:'#e8edf3', minHeight:'100vh', padding:'16px' }}>

      {/* ══ FORMULARIO ═══════════════════════════════════════════════════════ */}
      <div style={{ maxWidth:'950px', margin:'0 auto 20px', background:'white', borderRadius:'6px', overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.13)' }}>
        <div style={{ background:'#004a8f', color:'white', padding:'14px 20px' }}>
          <h1 style={{ margin:0, fontSize:'17px' }}>📋 Generador de Plano Catastral — Estado de México</h1>
          <p style={{ margin:'3px 0 0', fontSize:'11px', opacity:0.8 }}>Complete los datos — el plano se actualiza en tiempo real debajo</p>
        </div>
        <div style={{ padding:'20px' }}>

          <h3 style={sec}>Identificación del Predio</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div><label style={lbl}>Clave Catastral</label>
              <input style={inp} name="claveCatastral" value={form.claveCatastral} onChange={handleChange} placeholder="15-001-002-003-04"/></div>
            <div><label style={lbl}>Nombre del Propietario</label>
              <input style={inp} name="propietario" value={form.propietario} onChange={handleChange}/></div>
          </div>

          <h3 style={sec}>Ubicación del Predio</h3>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'12px', marginBottom:'12px' }}>
            <div><label style={lbl}>Calle / Avenida</label>
              <input style={inp} name="calle" value={form.calle} onChange={handleChange}/></div>
            <div><label style={lbl}>Número Exterior</label>
              <input style={inp} name="numero" value={form.numero} onChange={handleChange}/></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'12px', marginBottom:'12px' }}>
            <div><label style={lbl}>Colonia / Fraccionamiento</label>
              <input style={inp} name="colonia" value={form.colonia} onChange={handleChange}/></div>
            <div><label style={lbl}>Código Postal</label>
              <input style={inp} name="codigoPostal" value={form.codigoPostal} onChange={handleChange}/></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div style={{ position:'relative' }}>
              <label style={lbl}>Municipio (búsqueda)</label>
              <input style={inp} value={munQuery} onChange={handleMunInput}
                onFocus={() => munQuery && setShowMun(true)}
                onBlur={() => setTimeout(() => setShowMun(false), 160)}
                placeholder="Escriba para buscar..." autoComplete="off"/>
              {showMun && munSug.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #bbb', zIndex:300, maxHeight:'200px', overflowY:'auto', boxShadow:'0 4px 16px rgba(0,0,0,0.18)', borderRadius:'0 0 4px 4px' }}>
                  {munSug.map((m,i) => (
                    <div key={i} onMouseDown={() => selectMun(m)}
                      style={{ padding:'8px 12px', cursor:'pointer', fontSize:'13px', borderBottom:'1px solid #f0f0f0' }}
                      onMouseEnter={e => e.currentTarget.style.background='#e8f0fe'}
                      onMouseLeave={e => e.currentTarget.style.background='white'}>{m}</div>
                  ))}
                </div>
              )}
            </div>
            <div><label style={lbl}>Estado de la República</label>
              <select style={inp} name="estado" value={form.estado} onChange={handleChange}>
                {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0)+e.slice(1).toLowerCase()}</option>)}
              </select></div>
          </div>

          <h3 style={sec}>Medidas y Colindancias</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'14px' }}>
            <div><label style={lbl}>Unidad de Medida</label>
              <select style={inp} name="unidadMedida" value={form.unidadMedida} onChange={handleChange}>
                <option value="metros">Metros (m)</option>
                <option value="varas">Varas (1 vara = 0.838 m)</option>
                <option value="pies">Pies (1 pie = 0.3048 m)</option>
              </select></div>
            <div><label style={lbl}>Uso de Suelo</label>
              <select style={inp} name="usoSuelo" value={form.usoSuelo} onChange={handleChange}>
                {['HABITACIONAL','COMERCIAL','INDUSTRIAL','EQUIPAMIENTO','MIXTO','RÚSTICO','AGRÍCOLA'].map(u => <option key={u} value={u}>{u.charAt(0)+u.slice(1).toLowerCase()}</option>)}
              </select></div>
            <div><label style={lbl}>Fecha de Elaboración</label>
              <input style={inp} name="fecha" value={form.fecha} onChange={handleChange}/></div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            {[
              { label:'⬆ NORTE (Frente)', med:'norteMedida', col:'norteColindancia', color:'#c00' },
              { label:'⬇ SUR (Fondo)',    med:'surMedida',   col:'surColindancia',   color:'#555' },
              { label:'➡ ESTE (Oriente)', med:'esteMedida',  col:'esteColindancia',  color:'#555' },
              { label:'⬅ OESTE (Poniente)',med:'oesteMedida',col:'oesteColindancia', color:'#555' },
            ].map(({ label, med, col, color }) => (
              <div key={med} style={{ border:'1px solid #d0dcea', borderRadius:'5px', padding:'10px', background:'#f6f9ff' }}>
                <div style={{ fontWeight:'bold', color, fontSize:'12px', marginBottom:'8px' }}>{label}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'8px' }}>
                  <div><label style={{ ...lbl, fontSize:'10px' }}>Medida ({form.unidadMedida})</label>
                    <input style={inp} name={med} value={form[med]} onChange={handleChange}/></div>
                  <div><label style={{ ...lbl, fontSize:'10px' }}>Colindancia</label>
                    <input style={inp} name={col} value={form[col]} onChange={handleChange}/></div>
                </div>
              </div>
            ))}
          </div>

          {/* Subir imagen */}
          <div style={{ marginTop:'14px', border:'1px dashed #90a4ae', borderRadius:'5px', padding:'10px 14px', background:'#f9fafb' }}>
            <label style={{ ...lbl, fontSize:'12px' }}>📷 Imagen opcional del terreno (aparece en el croquis)</label>
            <input type="file" accept="image/*" onChange={handleImagen} style={{ fontSize:'12px' }}/>
            {imagenSrc && <img src={imagenSrc} alt="terreno" style={{ marginTop:'8px', maxHeight:'80px', borderRadius:'4px', border:'1px solid #ccc' }}/>}
          </div>

          {/* Superficie */}
          <div style={{ marginTop:'16px', background:'#e8f5e9', border:'2px solid #4caf50', borderRadius:'6px', padding:'12px 18px', display:'flex', alignItems:'center', gap:'14px' }}>
            <span style={{ fontSize:'28px' }}>📐</span>
            <div>
              <div style={{ fontSize:'12px', color:'#555' }}>Superficie calculada automáticamente (fórmula de trapecio)</div>
              <div style={{ fontSize:'26px', fontWeight:'bold', color:'#1b5e20' }}>{areaM2.toFixed(2)} m²</div>
              {form.unidadMedida !== 'metros' && <div style={{ fontSize:'10px', color:'#777' }}>Medidas convertidas desde {form.unidadMedida}</div>}
            </div>
          </div>

          <button onClick={handlePrint} style={{ marginTop:'18px', width:'100%', padding:'14px', background:'#004a8f', color:'white', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'15px', borderRadius:'5px', letterSpacing:'1px' }}>
            ⬇ GENERAR PLANO CATASTRAL EN PDF
          </button>
        </div>
      </div>

      {/* ══ VISTA PREVIA = LO QUE SE IMPRIME ════════════════════════════════ */}
      <div style={{ maxWidth:'950px', margin:'0 auto' }}>
        <div style={{ background:'#004a8f', color:'white', padding:'8px 16px', borderRadius:'4px 4px 0 0', fontSize:'12px', fontWeight:'bold' }}>
          📄 VISTA PREVIA EN TIEMPO REAL — Así quedará el PDF
        </div>

        <div ref={printRef} style={{ width:'100%', background:'white', padding:'7mm', boxSizing:'border-box', fontFamily:'Arial, sans-serif', fontSize:'9px', color:'#000', border:'2px solid #004a8f' }}>

          {/* Encabezado */}
          <div style={{ border:'3px solid #000', padding:'5px 8px', marginBottom:'6px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <svg width="52" height="52" viewBox="0 0 56 56" style={{ flexShrink:0 }} xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="28" cy="28" rx="26" ry="26" fill="#006847" stroke="#000" strokeWidth="1.5"/>
                <text x="28" y="22" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">GEM</text>
                <text x="28" y="31" textAnchor="middle" fill="white" fontSize="5">CATASTRO</text>
                <text x="28" y="40" textAnchor="middle" fill="#ffd700" fontSize="5">★ ★ ★</text>
              </svg>
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontSize:'11px', fontWeight:'bold' }}>GOBIERNO DEL ESTADO DE MÉXICO</div>
                <div style={{ fontSize:'9px', fontWeight:'bold' }}>SECRETARÍA DE FINANZAS</div>
                <div style={{ fontSize:'8px' }}>DIRECCIÓN GENERAL DE CATASTRO E INFORMACIÓN TERRITORIAL</div>
                <div style={{ fontSize:'13px', fontWeight:'bold', marginTop:'4px', borderTop:'1px solid #000', paddingTop:'3px' }}>CÉDULA DE DETERMINACIÓN CATASTRAL</div>
                <div style={{ fontSize:'8px', color:'#444' }}>PLANO DE LOCALIZACIÓN, MEDIDAS Y COLINDANCIAS</div>
              </div>
              <div style={{ fontSize:'7px', textAlign:'right', flexShrink:0 }}>
                <div style={{ border:'1px solid #000', padding:'3px 5px', marginBottom:'3px' }}>
                  <div style={{ fontWeight:'bold' }}>FOLIO:</div>
                  <div style={{ fontSize:'8px', fontWeight:'bold' }}>{form.claveCatastral}</div>
                </div>
                <div style={{ border:'1px solid #000', padding:'3px 5px' }}>
                  <div style={{ fontWeight:'bold' }}>FECHA:</div>
                  <div>{form.fecha}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Clave destacada */}
          <div style={{ border:'2px solid #000', padding:'3px', textAlign:'center', marginBottom:'6px', background:'#f0f4f8' }}>
            <span style={{ fontWeight:'bold', fontSize:'9px' }}>CLAVE CATASTRAL: </span>
            <span style={{ fontSize:'14px', fontWeight:'bold', letterSpacing:'3px', color:'#003a6e' }}>{form.claveCatastral}</span>
          </div>

          {/* Cuerpo 3 columnas */}
          <div style={{ display:'grid', gridTemplateColumns:'195px 1fr 155px', gap:'5px' }}>

            {/* Columna izquierda */}
            <div>
              <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'5px' }}>
                <thead><tr><th colSpan="2" style={thH}>DATOS DEL PROPIETARIO</th></tr></thead>
                <tbody><tr><td style={tdH}>PROPIETARIO:</td><td style={tdV}>{form.propietario}</td></tr></tbody>
              </table>
              <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'5px' }}>
                <thead><tr><th colSpan="2" style={thH}>UBICACIÓN DEL PREDIO</th></tr></thead>
                <tbody>
                  <tr><td style={tdH}>CALLE:</td><td style={tdV}>{form.calle} #{form.numero}</td></tr>
                  <tr><td style={tdH}>COLONIA:</td><td style={tdV}>{form.colonia}</td></tr>
                  <tr><td style={tdH}>MUNICIPIO:</td><td style={tdV}>{form.municipio}</td></tr>
                  <tr><td style={tdH}>ESTADO:</td><td style={tdV}>{form.estado}</td></tr>
                  <tr><td style={tdH}>C.P.:</td><td style={tdV}>{form.codigoPostal}</td></tr>
                </tbody>
              </table>
              <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'5px' }}>
                <thead><tr><th colSpan="2" style={thH}>DATOS DEL PREDIO</th></tr></thead>
                <tbody>
                  <tr><td style={tdH}>SUPERFICIE:</td><td style={{ ...tdV, fontWeight:'bold', color:'#003a6e', fontSize:'10px' }}>{areaM2.toFixed(2)} M²</td></tr>
                  <tr><td style={tdH}>FRENTE (N):</td><td style={tdV}>{norteM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>FONDO (S):</td><td style={tdV}>{surM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>LADO ESTE:</td><td style={tdV}>{esteM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>LADO OESTE:</td><td style={tdV}>{oesteM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>USO SUELO:</td><td style={tdV}>{form.usoSuelo}</td></tr>
                </tbody>
              </table>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr><th colSpan="3" style={thH}>LINDEROS Y COLINDANCIAS</th></tr>
                  <tr>
                    <th style={{ border:'1px solid #000', padding:'2px', background:'#d8e4f0', fontSize:'6.5px' }}>RUMBO</th>
                    <th style={{ border:'1px solid #000', padding:'2px', background:'#d8e4f0', fontSize:'6.5px' }}>MED.(m)</th>
                    <th style={{ border:'1px solid #000', padding:'2px', background:'#d8e4f0', fontSize:'6.5px' }}>COLINDANCIA</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { r:'NORTE',   m:norteM, c:form.norteColindancia },
                    { r:'SUR',     m:surM,   c:form.surColindancia },
                    { r:'ORIENTE', m:esteM,  c:form.esteColindancia },
                    { r:'PONIENTE',m:oesteM, c:form.oesteColindancia },
                  ].map(({ r, m, c }) => (
                    <tr key={r}>
                      <td style={{ ...tdH, fontSize:'7px' }}>{r}</td>
                      <td style={{ ...tdV, textAlign:'center' }}>{m.toFixed(2)}</td>
                      <td style={tdV}>{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop:'6px', fontSize:'6px', textAlign:'justify', border:'1px solid #ccc', padding:'3px 4px', background:'#fffde7', lineHeight:1.4 }}>
                <strong>NOTA LEGAL:</strong> Documento con carácter de Cédula Catastral conforme al Código Financiero del Estado de México y Municipios. Superficie de carácter fiscal. No sustituye escritura pública ni plano topográfico.
              </div>
            </div>

            {/* Columna central: croquis */}
            <div style={{ border:'2px solid #000', background:'#fafcff', padding:'4px' }}>
              <div style={{ textAlign:'center', fontWeight:'bold', fontSize:'7px', background:'#003a6e', color:'white', padding:'2px 4px', marginBottom:'4px' }}>
                CROQUIS DEL PREDIO — REPRESENTACIÓN GRÁFICA PROPORCIONAL
              </div>
              <TerrenoCroquis
                norteM={norteM} surM={surM} esteM={esteM} oesteM={oesteM}
                norteCol={form.norteColindancia} surCol={form.surColindancia}
                esteCol={form.esteColindancia}   oesteCol={form.oesteColindancia}
                usoSuelo={form.usoSuelo} areaM2={areaM2}
                imagenSrc={imagenSrc}
              />
            </div>

            {/* Columna derecha: firmas */}
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              <div style={{ border:'1px solid #000', padding:'6px', textAlign:'center', flex:1 }}>
                <div style={{ fontWeight:'bold', fontSize:'6.5px', background:'#003a6e', color:'white', margin:'-6px -6px 8px', padding:'3px' }}>PERITO RESPONSABLE</div>
                <div style={{ height:'50px' }}/>
                <div style={{ borderTop:'1px solid #000', paddingTop:'4px', fontSize:'6px' }}>
                  <div>NOMBRE Y FIRMA</div><div>CÉD. PROFESIONAL</div>
                </div>
              </div>
              <div style={{ border:'1px solid #000', padding:'6px', textAlign:'center', flex:1 }}>
                <div style={{ fontWeight:'bold', fontSize:'6.5px', background:'#003a6e', color:'white', margin:'-6px -6px 8px', padding:'3px' }}>AUTORIZACIÓN OFICIAL</div>
                <div style={{ height:'50px' }}/>
                <div style={{ borderTop:'1px solid #000', paddingTop:'4px', fontSize:'6px' }}>
                  <div>DIR. DE CATASTRO MUNICIPAL</div>
                  <div style={{ marginTop:'4px', border:'1px dashed #999', padding:'3px' }}>SELLO OFICIAL</div>
                </div>
              </div>
              <div style={{ border:'1px solid #000', padding:'6px', textAlign:'center', fontSize:'7px' }}>
                <div style={{ fontWeight:'bold', marginBottom:'3px', color:'#003a6e' }}>VIGENCIA</div>
                <div>Año fiscal vigente</div>
                <div style={{ fontWeight:'bold', marginTop:'5px', fontSize:'6px' }}>FOLIO ÚNICO:</div>
                <div style={{ fontWeight:'bold', fontSize:'9px', letterSpacing:'1px', color:'#003a6e' }}>{form.claveCatastral}</div>
              </div>
            </div>

          </div>{/* fin grid */}

          {/* Pie de página */}
          <div style={{ marginTop:'5px', borderTop:'2px solid #000', paddingTop:'4px', display:'flex', justifyContent:'space-between', fontSize:'6.5px', color:'#333' }}>
            <div>Generado el {form.fecha} | Sistema de Información Catastral | {form.municipio}, {form.estado}</div>
            <div style={{ fontWeight:'bold' }}>CLAVE: {form.claveCatastral}</div>
          </div>

        </div>{/* fin printRef */}
      </div>
    </div>
  );
};

export default App;
