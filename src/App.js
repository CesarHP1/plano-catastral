import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ESTADOS = [
  'AGUASCALIENTES','BAJA CALIFORNIA','BAJA CALIFORNIA SUR','CAMPECHE',
  'CHIAPAS','CHIHUAHUA','CIUDAD DE MÉXICO','COAHUILA DE ZARAGOZA','COLIMA',
  'DURANGO','ESTADO DE MÉXICO','GUANAJUATO','GUERRERO','HIDALGO','JALISCO',
  'MICHOACÁN DE OCAMPO','MORELOS','NAYARIT','NUEVO LEÓN','OAXACA','PUEBLA',
  'QUERÉTARO','QUINTANA ROO','SAN LUIS POTOSÍ','SINALOA','SONORA','TABASCO',
  'TAMAULIPAS','TLAXCALA','VERACRUZ','YUCATÁN','ZACATECAS',
];

const MUNICIPIOS = [
  'Acambay de Ruíz Castañeda','Acolman','Aculco','Almoloya de Alquisiras',
  'Almoloya de Juárez','Almoloya del Río','Amanalco','Amatepec','Amecameca',
  'Apaxco','Atenco','Atizapán','Atizapán de Zaragoza','Atlacomulco','Atlautla',
  'Axapusco','Ayapango','Calimaya','Capulhuac','Chalco','Chapa de Mota',
  'Chiautla','Chicoloapan','Chiconcuac','Chimalhuacán','Coacalco de Berriozábal',
  'Coatepec Harinas','Cocotitlán','Coyotepec','Cuautitlán','Cuautitlán Izcalli',
  'Donato Guerra','Ecatepec de Morelos','El Oro','Huehuetoca','Hueypoxtla',
  'Huixquilucan','Ixtapaluca','Ixtapan de la Sal','Ixtapan del Oro','Ixtlahuaca',
  'Jaltenco','Jilotepec','Jilotzingo','Jiquipilco','Jocotitlán','Juchitepec',
  'La Paz','Lerma','Luvianos','Malinalco','Melchor Ocampo','Metepec',
  'Mexicaltzingo','Naucalpan de Juárez','Nextlalpan','Nezahualcóyotl',
  'Nicolás Romero','Ocoyoacac','Ocuilan','Otumba','Otzoloapan','Otzolotepec',
  'Ozumba','Papalotla','Polotitlán','Rayón','San Antonio la Isla',
  'San Felipe del Progreso','San José del Rincón','San Martín de las Pirámides',
  'San Mateo Atenco','Santo Tomás','Soyaniquilpan de Juárez','Sultepec',
  'Tecámac','Tejupilco','Temamatla','Temascalapa','Temascalcingo',
  'Temascaltepec','Temoaya','Tenancingo','Tenango del Aire','Tenango del Valle',
  'Teoloyucan','Teotihuacán','Tepetlaoxtoc','Tepetlixpa','Tepotzotlán',
  'Tequixquiac','Texcaltitlán','Texcalyacac','Texcoco','Tezoyuca',
  'Tianguistenco','Timilpan','Tlalmanalco','Tlalnepantla de Baz','Tlatlaya',
  'Toluca','Tonanitla','Tonatico','Tultepec','Tultitlán','Valle de Bravo',
  'Valle de Chalco Solidaridad','Villa de Allende','Villa del Carbón',
  'Villa Guerrero','Villa Victoria','Xalatlaco','Xonacatlán','Zacazonapan',
  'Zacualpan','Zinacantepec','Zumpahuacán','Zumpango',
];

const FORMAS = [
  { id:'rectangulo',     label:'Rectángulo',          icon:'▬' },
  { id:'trapecio',       label:'Trapecio Simétrico',   icon:'⏢' },
  { id:'trapecio_recto', label:'Trapecio Rectángulo',  icon:'◺' },
  { id:'triangulo',      label:'Triángulo',            icon:'△' },
];

const toM = (val, u) => {
  const v = parseFloat(val) || 0;
  if (u === 'varas') return v * 0.838;
  if (u === 'pies')  return v * 0.3048;
  return v;
};

const calcSup = (n, s, e, o, f) => {
  const h = (e + o) / 2;
  if (f === 'trapecio' || f === 'trapecio_recto') return (((n + s) / 2) * h).toFixed(2);
  if (f === 'triangulo') return ((s * h) / 2).toFixed(2);
  return (n * h).toFixed(2);
};

const SVG_W = 290;
const SVG_H = 230;
const PAD   = 36;

const buildPoly = (n, s, e, o, f) => {
  const W = SVG_W - PAD * 2;
  const H = SVG_H - PAD * 2;
  const maxBase = Math.max(n, s, 0.001);
  const scale = W / maxBase;
  const nW = Math.min(n * scale, W);
  const sW = Math.min(s * scale, W);
  switch (f) {
    case 'trapecio': {
      const mx = Math.max(nW, sW);
      const on = (mx - nW) / 2;
      const os = (mx - sW) / 2;
      return [[on,0],[on+nW,0],[mx-os,H],[os,H]];
    }
    case 'trapecio_recto':
      return [[0,0],[nW,0],[sW,H],[0,H]];
    case 'triangulo':
      return [[sW/2,0],[sW,H],[0,H]];
    default:
      return [[0,0],[nW,0],[nW,H],[0,H]];
  }
};

const App = () => {
  const printRef = useRef();
  const [forma, setForma] = useState('rectangulo');
  const [munQuery, setMunQuery] = useState('TLALNEPANTLA DE BAZ');
  const [munList, setMunList]   = useState([]);
  const [showMun, setShowMun]   = useState(false);

  const [form, setForm] = useState({
    claveCatastral:'15-001-002-003-04', propietario:'JUAN PÉREZ LÓPEZ',
    calle:'CALLE DE LOS ARCOS', numero:'123', colonia:'COL. CENTRO',
    cp:'54000', municipio:'TLALNEPANTLA DE BAZ', estado:'ESTADO DE MÉXICO',
    usoSuelo:'HABITACIONAL', unidad:'metros',
    norteMedida:'15.00', norteColindancia:'CALLE SIN NOMBRE',
    surMedida:'15.00',   surColindancia:'TERRENO DE MARIA GOMEZ',
    esteMedida:'30.00',  esteColindancia:'CASA HABITACIÓN',
    oesteMedida:'30.00', oesteColindancia:'AV. PRINCIPAL',
    fecha: new Date().toLocaleDateString('es-MX'),
  });

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const nM = toM(form.norteMedida, form.unidad);
  const sM = toM(form.surMedida,   form.unidad);
  const eM = toM(form.esteMedida,  form.unidad);
  const oM = toM(form.oesteMedida, form.unidad);
  const sup = calcSup(nM, sM, eM, oM, forma);

  const pts = buildPoly(nM, sM, eM, oM, forma);
  const offX = (SVG_W - (Math.max(...pts.map(p=>p[0])) - Math.min(...pts.map(p=>p[0])))) / 2 - Math.min(...pts.map(p=>p[0]));
  const offY = (SVG_H - (Math.max(...pts.map(p=>p[1])) - Math.min(...pts.map(p=>p[1])))) / 2 - Math.min(...pts.map(p=>p[1]));
  const tPts = pts.map(p => [p[0]+offX, p[1]+offY]);
  const svgStr = tPts.map(p=>p.join(',')).join(' ');
  const cx = tPts.reduce((s,p)=>s+p[0],0)/tPts.length;
  const cy = tPts.reduce((s,p)=>s+p[1],0)/tPts.length;
  const topMid = [(tPts[0][0]+tPts[1][0])/2, Math.min(tPts[0][1],tPts[1][1])];
  const botPts = tPts.slice(-2);
  const botMid = [(botPts[0][0]+botPts[1][0])/2, Math.max(botPts[0][1],botPts[1][1])];
  const rightX = Math.max(...tPts.map(p=>p[0]));
  const leftX  = Math.min(...tPts.map(p=>p[0]));

  const handleMun = e => {
    const v = e.target.value; setMunQuery(v);
    if (v) { setMunList(MUNICIPIOS.filter(m=>m.toLowerCase().includes(v.toLowerCase())).slice(0,8)); setShowMun(true); }
    else setShowMun(false);
  };
  const pickMun = m => { setMunQuery(m); setForm(f=>({...f,municipio:m.toUpperCase()})); setShowMun(false); };

  const handlePDF = async () => {
    const el = printRef.current; if (!el) return;
    try {
      const canvas = await html2canvas(el,{scale:3,useCORS:true,backgroundColor:'#ffffff'});
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p','mm','letter');
      pdf.addImage(img,'PNG',0,0,pdf.internal.pageSize.getWidth(),pdf.internal.pageSize.getHeight());
      pdf.save('Plano_Catastral_'+form.claveCatastral+'.pdf');
    } catch(err){ console.error(err); }
  };

  const lbl = {display:'block',fontWeight:'bold',fontSize:'11px',marginBottom:'3px',color:'#444'};
  const inp = {width:'100%',padding:'7px 8px',border:'1px solid #bbb',borderRadius:'3px',fontSize:'13px',boxSizing:'border-box'};
  const sec = {color:'#003a6e',borderBottom:'2px solid #003a6e',paddingBottom:'4px',marginTop:'16px',marginBottom:'10px',fontSize:'13px',fontWeight:'bold'};
  const tdH = {background:'#003a6e',color:'white',padding:'3px 5px',fontSize:'8px',border:'1px solid #000',textAlign:'center'};
  const tdL = {border:'1px solid #000',padding:'3px 5px',fontSize:'8px',background:'#f5f5f5',fontWeight:'bold',whiteSpace:'nowrap'};
  const tdV = {border:'1px solid #000',padding:'3px 5px',fontSize:'8px'};

  return (
    <div style={{fontFamily:'Arial,sans-serif',background:'#eef2f7',minHeight:'100vh',padding:'16px'}}>
      <div style={{maxWidth:'980px',margin:'0 auto'}}>

        {/* ENCABEZADO */}
        <div style={{background:'#003a6e',color:'white',padding:'12px 18px',borderRadius:'6px 6px 0 0'}}>
          <h1 style={{margin:0,fontSize:'17px'}}>Generador de Plano Catastral — Estado de México</h1>
          <p style={{margin:'3px 0 0',fontSize:'11px',opacity:.8}}>Los cambios se reflejan en tiempo real en el plano de abajo</p>
        </div>

        {/* FORMULARIO */}
        <div style={{background:'white',padding:'18px',border:'1px solid #ccc',borderTop:'none',marginBottom:'20px'}}>
          <h3 style={sec}>Identificación</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={lbl}>Clave Catastral</label><input style={inp} name="claveCatastral" value={form.claveCatastral} onChange={set}/></div>
            <div><label style={lbl}>Propietario</label><input style={inp} name="propietario" value={form.propietario} onChange={set}/></div>
          </div>

          <h3 style={sec}>Ubicación</h3>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'10px',marginBottom:'10px'}}>
            <div><label style={lbl}>Calle / Avenida</label><input style={inp} name="calle" value={form.calle} onChange={set}/></div>
            <div><label style={lbl}>Número</label><input style={inp} name="numero" value={form.numero} onChange={set}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'10px',marginBottom:'10px'}}>
            <div><label style={lbl}>Colonia / Fraccionamiento</label><input style={inp} name="colonia" value={form.colonia} onChange={set}/></div>
            <div><label style={lbl}>Código Postal</label><input style={inp} name="cp" value={form.cp} onChange={set}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <div style={{position:'relative'}}>
              <label style={lbl}>Municipio</label>
              <input style={inp} value={munQuery} onChange={handleMun} onFocus={()=>munQuery&&setShowMun(true)} autoComplete="off" placeholder="Escriba para buscar..."/>
              {showMun && munList.length>0 && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:'1px solid #bbb',borderTop:'none',borderRadius:'0 0 4px 4px',zIndex:200,maxHeight:'180px',overflowY:'auto',boxShadow:'0 4px 10px rgba(0,0,0,.15)'}}>
                  {munList.map((m,i)=>(
                    <div key={i} onClick={()=>pickMun(m)} style={{padding:'7px 12px',cursor:'pointer',fontSize:'13px',borderBottom:'1px solid #f0f0f0'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#e8f0fe'}
                      onMouseLeave={e=>e.currentTarget.style.background='white'}>{m}</div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>Estado</label>
              <select style={inp} name="estado" value={form.estado} onChange={set}>
                {ESTADOS.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <h3 style={sec}>Forma y Medidas del Predio</h3>
          <div style={{marginBottom:'12px'}}>
            <label style={lbl}>Forma del Terreno</label>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {FORMAS.map(f=>(
                <button key={f.id} onClick={()=>setForma(f.id)}
                  style={{padding:'8px 14px',border:'2px solid '+(forma===f.id?'#003a6e':'#ccc'),borderRadius:'4px',background:forma===f.id?'#003a6e':'white',color:forma===f.id?'white':'#333',cursor:'pointer',fontSize:'13px',fontWeight:forma===f.id?'bold':'normal'}}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:'12px',display:'inline-block'}}>
            <label style={lbl}>Unidad de Medida</label>
            <select style={{...inp,width:'auto',minWidth:'200px'}} name="unidad" value={form.unidad} onChange={set}>
              <option value="metros">Metros (m)</option>
              <option value="varas">Varas (1 vara = 0.838 m)</option>
              <option value="pies">Pies (1 pie = 0.3048 m)</option>
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            {[
              {label:'⬆ NORTE (Frente)',   m:'norteMedida', c:'norteColindancia'},
              {label:'⬇ SUR (Fondo)',      m:'surMedida',   c:'surColindancia'},
              {label:'➡ ESTE (Oriente)',   m:'esteMedida',  c:'esteColindancia'},
              {label:'⬅ OESTE (Poniente)', m:'oesteMedida', c:'oesteColindancia'},
            ].map(({label,m,c})=>(
              <div key={m} style={{border:'1px solid #ddd',borderRadius:'4px',padding:'10px'}}>
                <div style={{fontWeight:'bold',fontSize:'11px',color:'#003a6e',marginBottom:'6px'}}>{label}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'8px'}}>
                  <div><label style={{...lbl,fontSize:'10px'}}>Medida ({form.unidad})</label><input style={inp} name={m} value={form[m]} onChange={set}/></div>
                  <div><label style={{...lbl,fontSize:'10px'}}>Colindancia</label><input style={inp} name={c} value={form[c]} onChange={set}/></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{marginTop:'14px',background:'#e8f5e9',border:'1px solid #4caf50',borderRadius:'4px',padding:'10px 16px',display:'flex',alignItems:'center',gap:'12px'}}>
            <span style={{fontSize:'24px'}}>📐</span>
            <div>
              <span style={{fontWeight:'bold',fontSize:'12px'}}>Superficie calculada automáticamente:</span>
              <span style={{fontSize:'22px',fontWeight:'bold',color:'#1b5e20',marginLeft:'10px'}}>{sup} m²</span>
              {form.unidad!=='metros'&&<span style={{fontSize:'10px',color:'#555',marginLeft:'8px'}}>(medidas convertidas a metros)</span>}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'12px'}}>
            <div>
              <label style={lbl}>Uso de Suelo</label>
              <select style={inp} name="usoSuelo" value={form.usoSuelo} onChange={set}>
                {['HABITACIONAL','COMERCIAL','INDUSTRIAL','EQUIPAMIENTO','MIXTO','RÚSTICO','AGRÍCOLA','PECUARIO'].map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Fecha de Elaboración</label><input style={inp} name="fecha" value={form.fecha} onChange={set}/></div>
          </div>

          <button onClick={handlePDF} style={{marginTop:'16px',width:'100%',padding:'14px',background:'#003a6e',color:'white',border:'none',cursor:'pointer',fontWeight:'bold',fontSize:'15px',borderRadius:'4px',letterSpacing:'1px'}}>
            ⬇ DESCARGAR PLANO CATASTRAL EN PDF
          </button>
        </div>

        {/* VISTA PREVIA */}
        <div style={{background:'#444',padding:'10px',borderRadius:'4px',textAlign:'center'}}>
          <p style={{color:'white',margin:'0 0 8px',fontSize:'11px',letterSpacing:'1px',fontWeight:'bold'}}>▼ VISTA PREVIA EN TIEMPO REAL — LO QUE VES SE IMPRIME TAL CUAL ▼</p>

          {/* ══ PLANO IMPRIMIBLE ══ */}
          <div ref={printRef} style={{width:'216mm',minHeight:'279mm',background:'white',margin:'0 auto',padding:'7mm',boxSizing:'border-box',fontFamily:'Arial,sans-serif',fontSize:'9px',color:'#000',textAlign:'left'}}>

            {/* Encabezado */}
            <div style={{border:'3px solid #000',padding:'5px',marginBottom:'5px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'55px',height:'55px',border:'1px solid #999',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'7px',color:'#666',textAlign:'center'}}>ESCUDO<br/>GEM</div>
                <div style={{flex:1,textAlign:'center'}}>
                  <div style={{fontSize:'10px',fontWeight:'bold'}}>GOBIERNO DEL ESTADO DE MÉXICO</div>
                  <div style={{fontSize:'9px',fontWeight:'bold'}}>SECRETARÍA DE FINANZAS</div>
                  <div style={{fontSize:'8px'}}>DIRECCIÓN GENERAL DE CATASTRO E INFORMACIÓN TERRITORIAL</div>
                  <div style={{fontSize:'12px',fontWeight:'bold',borderTop:'1px solid #000',marginTop:'3px',paddingTop:'3px'}}>CÉDULA DE DETERMINACIÓN CATASTRAL</div>
                  <div style={{fontSize:'8px'}}>PLANO DE LOCALIZACIÓN, MEDIDAS Y COLINDANCIAS</div>
                </div>
                <div style={{width:'65px',flexShrink:0,fontSize:'7px'}}>
                  <div style={{border:'1px solid #000',padding:'3px',marginBottom:'3px',textAlign:'center'}}><strong>FOLIO:</strong><br/>{form.claveCatastral}</div>
                  <div style={{border:'1px solid #000',padding:'3px',textAlign:'center'}}><strong>FECHA:</strong><br/>{form.fecha}</div>
                </div>
              </div>
            </div>

            {/* Clave */}
            <div style={{border:'2px solid #000',padding:'3px',textAlign:'center',marginBottom:'5px',background:'#f0f0f0'}}>
              <span style={{fontWeight:'bold',fontSize:'9px'}}>CLAVE CATASTRAL: </span>
              <span style={{fontSize:'13px',fontWeight:'bold',letterSpacing:'3px'}}>{form.claveCatastral}</span>
            </div>

            {/* Cuerpo 3 columnas */}
            <div style={{display:'grid',gridTemplateColumns:'195px 1fr 155px',gap:'5px',minHeight:'200mm'}}>

              {/* Columna datos */}
              <div>
                <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'5px'}}>
                  <thead><tr><th colSpan="2" style={tdH}>DATOS DEL PROPIETARIO</th></tr></thead>
                  <tbody><tr><td style={tdL}>PROPIETARIO:</td><td style={tdV}>{form.propietario}</td></tr></tbody>
                </table>
                <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'5px'}}>
                  <thead><tr><th colSpan="2" style={tdH}>UBICACIÓN DEL PREDIO</th></tr></thead>
                  <tbody>
                    <tr><td style={tdL}>CALLE:</td><td style={tdV}>{form.calle} #{form.numero}</td></tr>
                    <tr><td style={tdL}>COLONIA:</td><td style={tdV}>{form.colonia}</td></tr>
                    <tr><td style={tdL}>MUNICIPIO:</td><td style={tdV}>{form.municipio}</td></tr>
                    <tr><td style={tdL}>ESTADO:</td><td style={tdV}>{form.estado}</td></tr>
                    <tr><td style={tdL}>C.P.:</td><td style={tdV}>{form.cp}</td></tr>
                  </tbody>
                </table>
                <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'5px'}}>
                  <thead><tr><th colSpan="2" style={tdH}>DATOS DEL PREDIO</th></tr></thead>
                  <tbody>
                    <tr><td style={tdL}>SUPERFICIE:</td><td style={{...tdV,fontWeight:'bold',color:'#003a6e',fontSize:'10px'}}>{sup} M²</td></tr>
                    <tr><td style={tdL}>FRENTE (N):</td><td style={tdV}>{nM.toFixed(2)} m</td></tr>
                    <tr><td style={tdL}>FONDO (S):</td><td style={tdV}>{sM.toFixed(2)} m</td></tr>
                    <tr><td style={tdL}>LADO ESTE:</td><td style={tdV}>{eM.toFixed(2)} m</td></tr>
                    <tr><td style={tdL}>LADO OESTE:</td><td style={tdV}>{oM.toFixed(2)} m</td></tr>
                    <tr><td style={tdL}>USO SUELO:</td><td style={tdV}>{form.usoSuelo}</td></tr>
                    <tr><td style={tdL}>FORMA:</td><td style={tdV}>{FORMAS.find(f=>f.id===forma)?.label}</td></tr>
                  </tbody>
                </table>
                <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'5px'}}>
                  <thead>
                    <tr><th colSpan="3" style={tdH}>LINDEROS Y COLINDANCIAS</th></tr>
                    <tr>
                      <th style={{...tdL,background:'#ddd',fontSize:'7px'}}>RUMBO</th>
                      <th style={{...tdL,background:'#ddd',fontSize:'7px'}}>MED.(m)</th>
                      <th style={{...tdL,background:'#ddd',fontSize:'7px'}}>COLINDANCIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style={tdV}>NORTE</td><td style={tdV}>{nM.toFixed(2)}</td><td style={tdV}>{form.norteColindancia}</td></tr>
                    <tr><td style={tdV}>SUR</td><td style={tdV}>{sM.toFixed(2)}</td><td style={tdV}>{form.surColindancia}</td></tr>
                    <tr><td style={tdV}>ORIENTE</td><td style={tdV}>{eM.toFixed(2)}</td><td style={tdV}>{form.esteColindancia}</td></tr>
                    <tr><td style={tdV}>PONIENTE</td><td style={tdV}>{oM.toFixed(2)}</td><td style={tdV}>{form.oesteColindancia}</td></tr>
                  </tbody>
                </table>
                <div style={{fontSize:'7px',textAlign:'justify',border:'1px solid #ccc',padding:'4px',background:'#fffde7'}}>
                  <strong>NOTA LEGAL:</strong> Cédula Catastral conforme al Código Financiero del Estado de México. La superficie es de carácter fiscal y no sustituye escritura pública ni levantamiento topográfico oficial.
                </div>
              </div>

              {/* Columna SVG croquis */}
              <div style={{border:'2px solid #000',background:'#fafafa',display:'flex',flexDirection:'column'}}>
                <div style={{background:'#003a6e',color:'white',textAlign:'center',fontSize:'8px',fontWeight:'bold',padding:'3px'}}>
                  CROQUIS DEL PREDIO — ESCALA ESQUEMÁTICA
                </div>
                <div style={{flex:1,position:'relative'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{display:'block'}}>
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8e8e8" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width={SVG_W} height={SVG_H} fill="url(#grid)"/>

                    {/* Terreno */}
                    <polygon points={svgStr} fill="rgba(173,216,230,0.4)" stroke="#003a6e" strokeWidth="2.5"/>

                    {/* Etiqueta centro */}
                    <text x={cx} y={cy-8}  textAnchor="middle" fontSize="10" fontWeight="bold" fill="#003a6e">TERRENO</text>
                    <text x={cx} y={cy+6}  textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1b5e20">{sup} m²</text>
                    <text x={cx} y={cy+18} textAnchor="middle" fontSize="8"  fill="#555">{form.usoSuelo}</text>

                    {/* Medidas Norte */}
                    <text x={topMid[0]} y={topMid[1]-5} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#b71c1c">{nM.toFixed(2)} m</text>
                    <text x={topMid[0]} y={topMid[1]-14} textAnchor="middle" fontSize="6.5" fill="#555">{form.norteColindancia}</text>
                    {/* Medidas Sur */}
                    <text x={botMid[0]} y={botMid[1]+10} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#b71c1c">{sM.toFixed(2)} m</text>
                    <text x={botMid[0]} y={botMid[1]+18} textAnchor="middle" fontSize="6.5" fill="#555">{form.surColindancia}</text>
                    {/* Medidas Este */}
                    <text x={rightX+12} y={cy} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#b71c1c" transform={`rotate(90,${rightX+12},${cy})`}>{eM.toFixed(2)} m</text>
                    {/* Medidas Oeste */}
                    <text x={leftX-12} y={cy} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#b71c1c" transform={`rotate(-90,${leftX-12},${cy})`}>{oM.toFixed(2)} m</text>

                    {/* ═══ ROSA DE LOS VIENTOS ═══ */}
                    <g transform={`translate(${SVG_W-54},6)`}>
                      <circle cx="24" cy="24" r="22" fill="white" stroke="#000" strokeWidth="1.5"/>
                      <circle cx="24" cy="24" r="3"  fill="#000"/>
                      {/* N negro */}
                      <polygon points="24,3 27,24 24,19 21,24" fill="#000"/>
                      {/* S blanco */}
                      <polygon points="24,45 27,24 24,29 21,24" fill="white" stroke="#000" strokeWidth="1"/>
                      {/* E blanco */}
                      <polygon points="45,24 24,27 29,24 24,21" fill="white" stroke="#000" strokeWidth="1"/>
                      {/* O blanco */}
                      <polygon points="3,24 24,27 19,24 24,21" fill="white" stroke="#000" strokeWidth="1"/>
                      <text x="21" y="14"  fontSize="8" fontWeight="bold" fill="#000">N</text>
                      <text x="21" y="43"  fontSize="7" fill="#000">S</text>
                      <text x="36" y="27"  fontSize="7" fill="#000">E</text>
                      <text x="5"  y="27"  fontSize="7" fill="#000">O</text>
                    </g>

                    {/* Escala gráfica */}
                    <g transform={`translate(6,${SVG_H-14})`}>
                      <rect x="0" y="0" width="28" height="5" fill="#000"/>
                      <rect x="28" y="0" width="28" height="5" fill="white" stroke="#000" strokeWidth="0.8"/>
                      <text x="0"  y="13" fontSize="6" fill="#000">0</text>
                      <text x="23" y="13" fontSize="6" fill="#000">{(nM/2).toFixed(0)}m</text>
                      <text x="52" y="13" fontSize="6" fill="#000">{nM.toFixed(0)}m</text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Columna firmas */}
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                <div style={{border:'1px solid #000',flex:1,display:'flex',flexDirection:'column'}}>
                  <div style={{background:'#003a6e',color:'white',textAlign:'center',fontSize:'7px',fontWeight:'bold',padding:'3px'}}>PERITO RESPONSABLE</div>
                  <div style={{flex:1,padding:'8px',display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center',textAlign:'center'}}>
                    <div style={{borderTop:'1px solid #000',width:'80%',paddingTop:'4px',fontSize:'7px'}}>
                      <div>NOMBRE Y FIRMA</div><div>CÉDULA PROFESIONAL</div>
                    </div>
                  </div>
                </div>
                <div style={{border:'1px solid #000',flex:1,display:'flex',flexDirection:'column'}}>
                  <div style={{background:'#003a6e',color:'white',textAlign:'center',fontSize:'7px',fontWeight:'bold',padding:'3px'}}>VO.BO. AUTORIZACIÓN</div>
                  <div style={{flex:1,padding:'8px',display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center',textAlign:'center'}}>
                    <div style={{borderTop:'1px solid #000',width:'80%',paddingTop:'4px',fontSize:'7px'}}>
                      <div>DIRECTOR DE CATASTRO</div><div>MUNICIPAL</div>
                      <div style={{marginTop:'6px',fontSize:'8px',letterSpacing:'1px'}}>SELLO OFICIAL</div>
                    </div>
                  </div>
                </div>
                <div style={{border:'1px solid #000',padding:'6px',textAlign:'center'}}>
                  <div style={{fontWeight:'bold',fontSize:'7px',marginBottom:'2px'}}>VIGENCIA</div>
                  <div style={{fontSize:'7px'}}>Ejercicio Fiscal en Curso</div>
                  <div style={{fontWeight:'bold',fontSize:'7px',marginTop:'4px'}}>FOLIO ÚNICO:</div>
                  <div style={{fontWeight:'bold',fontSize:'9px',letterSpacing:'1px',color:'#003a6e'}}>{form.claveCatastral}</div>
                </div>
              </div>
            </div>

            {/* Pie */}
            <div style={{marginTop:'5px',borderTop:'2px solid #000',paddingTop:'3px',display:'flex',justifyContent:'space-between',fontSize:'7px'}}>
              <div>Generado el {form.fecha} | Sistema de Información Catastral | {form.calle} #{form.numero}, {form.colonia}, {form.municipio}, {form.estado}</div>
              <div style={{fontWeight:'bold',whiteSpace:'nowrap'}}>CLAVE: {form.claveCatastral}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
