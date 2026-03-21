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

/* ── Rosa de vientos ─────────────────────────────────────────────────────── */
const RosaVientos = ({ size = 80 }) => {
  const c = size / 2;
  const r = size / 2 - 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <circle cx={c} cy={c} r={r} fill="white" stroke="#222" strokeWidth="1.5"/>
      <circle cx={c} cy={c} r={r*0.45} fill="none" stroke="#bbb" strokeWidth="0.8"/>
      <polygon points={`${c},${c-r+3} ${c+r*0.2},${c} ${c},${c-r*0.42}`} fill="#c00"/>
      <polygon points={`${c},${c-r+3} ${c-r*0.2},${c} ${c},${c-r*0.42}`} fill="#900"/>
      <polygon points={`${c},${c+r-3} ${c+r*0.2},${c} ${c},${c+r*0.42}`} fill="white" stroke="#555" strokeWidth="0.6"/>
      <polygon points={`${c},${c+r-3} ${c-r*0.2},${c} ${c},${c+r*0.42}`} fill="#ddd" stroke="#555" strokeWidth="0.6"/>
      <polygon points={`${c+r-3},${c} ${c},${c+r*0.2} ${c+r*0.42},${c}`} fill="white" stroke="#555" strokeWidth="0.6"/>
      <polygon points={`${c+r-3},${c} ${c},${c-r*0.2} ${c+r*0.42},${c}`} fill="#ddd" stroke="#555" strokeWidth="0.6"/>
      <polygon points={`${c-r+3},${c} ${c},${c+r*0.2} ${c-r*0.42},${c}`} fill="white" stroke="#555" strokeWidth="0.6"/>
      <polygon points={`${c-r+3},${c} ${c},${c-r*0.2} ${c-r*0.42},${c}`} fill="#ddd" stroke="#555" strokeWidth="0.6"/>
      {[45,135,225,315].map(deg => {
        const rad = deg * Math.PI / 180;
        const tx = c + Math.cos(rad)*(r-4), ty = c + Math.sin(rad)*(r-4);
        const b1x = c + Math.cos(rad-0.45)*r*0.35, b1y = c + Math.sin(rad-0.45)*r*0.35;
        const b2x = c + Math.cos(rad+0.45)*r*0.35, b2y = c + Math.sin(rad+0.45)*r*0.35;
        return <polygon key={deg} points={`${tx},${ty} ${b1x},${b1y} ${c},${c} ${b2x},${b2y}`} fill="#bbb" stroke="#999" strokeWidth="0.3"/>;
      })}
      <circle cx={c} cy={c} r={r*0.09} fill="#c00" stroke="#800" strokeWidth="0.8"/>
      <text x={c} y={c-r+13} textAnchor="middle" fontSize={r*0.28} fontWeight="bold" fill="#c00" fontFamily="Arial">N</text>
      <text x={c} y={c+r-3}  textAnchor="middle" fontSize={r*0.23} fill="#333" fontFamily="Arial">S</text>
      <text x={c+r-5} y={c+r*0.08} textAnchor="middle" fontSize={r*0.23} fill="#333" fontFamily="Arial">E</text>
      <text x={c-r+5} y={c+r*0.08} textAnchor="middle" fontSize={r*0.23} fill="#333" fontFamily="Arial">O</text>
    </svg>
  );
};

/* ── Croquis ─────────────────────────────────────────────────────────────── */
const TerrenoCroquis = ({ norteM, surM, esteM, oesteM, norteCol, surCol, esteCol, oesteCol, usoSuelo, areaM2, svgW, svgH }) => {
  const PAD_H = 85;
  const PAD_V = 60;
  const drawW = svgW - PAD_H * 2;
  const drawH = svgH - PAD_V * 2 - 28;

  const safe = v => Math.max(v, 0.5);
  const maxHoriz = Math.max(safe(norteM), safe(surM));
  const maxVert  = Math.max(safe(esteM),  safe(oesteM));
  const scale    = Math.min(drawW / maxHoriz, drawH / maxVert);

  const nW = safe(norteM)*scale, sW = safe(surM)*scale;
  const eH = safe(esteM)*scale,  oH = safe(oesteM)*scale;
  const totalW = Math.max(nW, sW), totalH = Math.max(eH, oH);
  const nOff = (totalW-nW)/2, sOff = (totalW-sW)/2;
  const originX = PAD_H + (drawW-totalW)/2;
  const originY = PAD_V + (drawH-totalH)/2;

  const TL = { x: originX+nOff,     y: originY+(totalH-oH) };
  const TR = { x: originX+nOff+nW,  y: originY+(totalH-eH) };
  const BR = { x: originX+sOff+sW,  y: originY+totalH };
  const BL = { x: originX+sOff,     y: originY+totalH };

  const pts = `${TL.x},${TL.y} ${TR.x},${TR.y} ${BR.x},${BR.y} ${BL.x},${BL.y}`;
  const cx = (TL.x+TR.x+BR.x+BL.x)/4;
  const cy = (TL.y+TR.y+BR.y+BL.y)/4;
  const midN = {x:(TL.x+TR.x)/2, y:(TL.y+TR.y)/2};
  const midS = {x:(BL.x+BR.x)/2, y:(BL.y+BR.y)/2};
  const midE = {x:(TR.x+BR.x)/2, y:(TR.y+BR.y)/2};
  const midO = {x:(TL.x+BL.x)/2, y:(TL.y+BL.y)/2};
  const trunc = (s,n) => s&&s.length>n ? s.slice(0,n)+'…':(s||'');

  const scaleBarM = Math.max(Math.round(maxHoriz/4/5)*5, 5);
  const scaleBarPx = scaleBarM*scale;
  const scaleY = svgH-16;

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
      style={{display:'block', width:'100%', height:'100%'}}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="gr" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M14 0L0 0 0 14" fill="none" stroke="#dde3ea" strokeWidth="0.4"/>
        </pattern>
        <pattern id="ht" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,74,143,0.07)" strokeWidth="5"/>
        </pattern>
        <clipPath id="tc4"><polygon points={pts}/></clipPath>
      </defs>
      <rect width={svgW} height={svgH} fill="url(#gr)"/>
      <polygon points={pts} fill="rgba(200,225,245,0.55)"/>
      <rect width={svgW} height={svgH} fill="url(#ht)" clipPath="url(#tc4)"/>
      <polygon points={pts} fill="none" stroke="#003a6e" strokeWidth="2.4"/>
      <line x1={TL.x} y1={TL.y} x2={TR.x} y2={TR.y} stroke="#c00" strokeWidth="2.6"/>
      {[TL,TR,BR,BL].map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#003a6e" stroke="white" strokeWidth="1.2"/>)}

      {/* Norte */}
      <text x={midN.x} y={midN.y-26} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#c00" fontFamily="Arial">{norteM.toFixed(2)} m</text>
      <text x={midN.x} y={midN.y-14} textAnchor="middle" fontSize="8.5" fill="#444" fontFamily="Arial">{trunc(norteCol,26)}</text>
      {/* Sur */}
      <text x={midS.x} y={midS.y+17} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#333" fontFamily="Arial">{surM.toFixed(2)} m</text>
      <text x={midS.x} y={midS.y+29} textAnchor="middle" fontSize="8.5" fill="#444" fontFamily="Arial">{trunc(surCol,26)}</text>
      {/* Este */}
      <text x={midE.x+9} y={midE.y-6} fontSize="10" fontWeight="bold" fill="#333" fontFamily="Arial">{esteM.toFixed(2)} m</text>
      <text x={midE.x+9} y={midE.y+8} fontSize="8" fill="#444" fontFamily="Arial">{trunc(esteCol,16)}</text>
      {/* Oeste */}
      <text x={midO.x-9} y={midO.y-6} textAnchor="end" fontSize="10" fontWeight="bold" fill="#333" fontFamily="Arial">{oesteM.toFixed(2)} m</text>
      <text x={midO.x-9} y={midO.y+8} textAnchor="end" fontSize="8" fill="#444" fontFamily="Arial">{trunc(oesteCol,16)}</text>

      {/* Centro */}
      <text x={cx} y={cy-16} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#003a6e" fontFamily="Arial">TERRENO</text>
      <text x={cx} y={cy+6}  textAnchor="middle" fontSize="18" fontWeight="bold" fill="#000"    fontFamily="Arial">{areaM2.toFixed(2)} m²</text>
      <text x={cx} y={cy+22} textAnchor="middle" fontSize="10" fill="#555"                      fontFamily="Arial">{usoSuelo}</text>

      {/* Escala */}
      <rect x={PAD_H} y={scaleY-7} width={scaleBarPx} height={8} fill="none" stroke="#333" strokeWidth="1"/>
      <rect x={PAD_H} y={scaleY-7} width={scaleBarPx/2} height={8} fill="#333"/>
      <text x={PAD_H} y={scaleY+9} fontSize="7.5" fill="#333" fontFamily="Arial">0</text>
      <text x={PAD_H+scaleBarPx/2} y={scaleY+9} textAnchor="middle" fontSize="7.5" fill="#333" fontFamily="Arial">{scaleBarM/2}m</text>
      <text x={PAD_H+scaleBarPx}   y={scaleY+9} textAnchor="middle" fontSize="7.5" fill="#333" fontFamily="Arial">{scaleBarM}m</text>
    </svg>
  );
};

/* ── App ─────────────────────────────────────────────────────────────────── */
const App = () => {
  const printRef = useRef();

  const [form, setForm] = useState({
    claveCatastral:'15-001-002-003-04', propietario:'JUAN PÉREZ LÓPEZ',
    calle:'CALLE DE LOS ARCOS', numero:'123', colonia:'COL. CENTRO',
    codigoPostal:'54000', municipio:'TLALNEPANTLA DE BAZ',
    estado:'ESTADO DE MÉXICO', usoSuelo:'HABITACIONAL',
    unidadMedida:'metros',
    norteMedida:'15.00', norteColindancia:'CALLE SIN NOMBRE',
    surMedida:'12.00',   surColindancia:'TERRENO COLINDANTE',
    esteMedida:'30.00',  esteColindancia:'CASA HABITACIÓN',
    oesteMedida:'30.00', oesteColindancia:'AV. PRINCIPAL',
    fecha: new Date().toLocaleDateString('es-MX'),
  });

  const [munQuery,setMunQuery]=useState('Tlalnepantla de Baz');
  const [munSug,setMunSug]=useState([]);
  const [showMun,setShowMun]=useState(false);
  const [imagenSrc,setImagenSrc]=useState(null);

  const handleChange = e => setForm(f=>({...f,[e.target.name]:e.target.value}));
  const handleMunInput = e => {
    const val=e.target.value; setMunQuery(val);
    if(val.length>0){setMunSug(MUNICIPIOS.filter(m=>m.toLowerCase().includes(val.toLowerCase())).slice(0,8));setShowMun(true);}
    else setShowMun(false);
  };
  const selectMun = m=>{setMunQuery(m);setForm(f=>({...f,municipio:m.toUpperCase()}));setShowMun(false);};
  const handleImagen = e=>{
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader(); reader.onload=ev=>setImagenSrc(ev.target.result); reader.readAsDataURL(file);
  };

  const toM = val=>{
    const v=parseFloat(val)||0;
    if(form.unidadMedida==='varas') return v*0.838;
    if(form.unidadMedida==='pies')  return v*0.3048;
    return v;
  };
  const norteM=toM(form.norteMedida), surM=toM(form.surMedida);
  const esteM=toM(form.esteMedida),   oesteM=toM(form.oesteMedida);
  const areaM2=((norteM+surM)/2)*((esteM+oesteM)/2);

  const handlePrint = async ()=>{
    const el=printRef.current; if(!el)return;
    try{
      const canvas=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false});
      const img=canvas.toDataURL('image/png');
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
      pdf.addImage(img,'PNG',0,0,pdf.internal.pageSize.getWidth(),pdf.internal.pageSize.getHeight());
      pdf.save('Plano_Catastral_'+form.claveCatastral+'.pdf');
    }catch(err){console.error(err);}
  };

  const lbl={fontWeight:'bold',fontSize:'11px',marginBottom:'3px',display:'block',color:'#333'};
  const inp={padding:'7px 9px',border:'1px solid #bbb',borderRadius:'3px',fontSize:'13px',width:'100%',boxSizing:'border-box',fontFamily:'Arial'};
  const sec={color:'#004a8f',borderBottom:'2px solid #004a8f',paddingBottom:'4px',marginBottom:'12px',marginTop:'18px',fontSize:'13px',fontWeight:'bold'};
  const tdH={border:'1px solid #000',padding:'2px 3px',fontWeight:'bold',background:'#e8eef5',fontSize:'7.5px',whiteSpace:'nowrap'};
  const tdV={border:'1px solid #000',padding:'2px 3px',fontSize:'7.5px'};
  const thH={background:'#003a6e',color:'white',padding:'3px 4px',textAlign:'center',fontSize:'7px',fontWeight:'bold'};

  /* Croquis ocupa ancho restante. En la vista previa lo fijamos */
  const CROQUIS_W = 540;
  const CROQUIS_H = 700;

  return (
    <div style={{fontFamily:'Arial,sans-serif',background:'#e8edf3',minHeight:'100vh',padding:'16px'}}>

      {/* ══ FORMULARIO ══ */}
      <div style={{maxWidth:'950px',margin:'0 auto 20px',background:'white',borderRadius:'6px',overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.13)'}}>
        <div style={{background:'#004a8f',color:'white',padding:'14px 20px'}}>
          <h1 style={{margin:0,fontSize:'17px'}}>📋 Generador de Plano Catastral — Estado de México</h1>
          <p style={{margin:'3px 0 0',fontSize:'11px',opacity:0.8}}>Complete los datos — el plano se actualiza en tiempo real</p>
        </div>
        <div style={{padding:'20px'}}>

          <h3 style={sec}>Identificación del Predio</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={lbl}>Clave Catastral</label><input style={inp} name="claveCatastral" value={form.claveCatastral} onChange={handleChange}/></div>
            <div><label style={lbl}>Nombre del Propietario</label><input style={inp} name="propietario" value={form.propietario} onChange={handleChange}/></div>
          </div>

          <h3 style={sec}>Ubicación del Predio</h3>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px',marginBottom:'12px'}}>
            <div><label style={lbl}>Calle / Avenida</label><input style={inp} name="calle" value={form.calle} onChange={handleChange}/></div>
            <div><label style={lbl}>Número Exterior</label><input style={inp} name="numero" value={form.numero} onChange={handleChange}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px',marginBottom:'12px'}}>
            <div><label style={lbl}>Colonia / Fraccionamiento</label><input style={inp} name="colonia" value={form.colonia} onChange={handleChange}/></div>
            <div><label style={lbl}>Código Postal</label><input style={inp} name="codigoPostal" value={form.codigoPostal} onChange={handleChange}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div style={{position:'relative'}}>
              <label style={lbl}>Municipio (búsqueda)</label>
              <input style={inp} value={munQuery} onChange={handleMunInput}
                onFocus={()=>munQuery&&setShowMun(true)} onBlur={()=>setTimeout(()=>setShowMun(false),160)}
                placeholder="Escriba para buscar..." autoComplete="off"/>
              {showMun&&munSug.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:'1px solid #bbb',zIndex:300,maxHeight:'200px',overflowY:'auto',boxShadow:'0 4px 16px rgba(0,0,0,0.18)',borderRadius:'0 0 4px 4px'}}>
                  {munSug.map((m,i)=>(
                    <div key={i} onMouseDown={()=>selectMun(m)}
                      style={{padding:'8px 12px',cursor:'pointer',fontSize:'13px',borderBottom:'1px solid #f0f0f0'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#e8f0fe'}
                      onMouseLeave={e=>e.currentTarget.style.background='white'}>{m}</div>
                  ))}
                </div>
              )}
            </div>
            <div><label style={lbl}>Estado de la República</label>
              <select style={inp} name="estado" value={form.estado} onChange={handleChange}>
                {ESTADOS.map(e=><option key={e} value={e}>{e.charAt(0)+e.slice(1).toLowerCase()}</option>)}
              </select></div>
          </div>

          <h3 style={sec}>Medidas y Colindancias</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div><label style={lbl}>Unidad de Medida</label>
              <select style={inp} name="unidadMedida" value={form.unidadMedida} onChange={handleChange}>
                <option value="metros">Metros (m)</option>
                <option value="varas">Varas (1 vara = 0.838 m)</option>
                <option value="pies">Pies (1 pie = 0.3048 m)</option>
              </select></div>
            <div><label style={lbl}>Uso de Suelo</label>
              <select style={inp} name="usoSuelo" value={form.usoSuelo} onChange={handleChange}>
                {['HABITACIONAL','COMERCIAL','INDUSTRIAL','EQUIPAMIENTO','MIXTO','RÚSTICO','AGRÍCOLA'].map(u=>
                  <option key={u} value={u}>{u.charAt(0)+u.slice(1).toLowerCase()}</option>)}
              </select></div>
            <div><label style={lbl}>Fecha de Elaboración</label><input style={inp} name="fecha" value={form.fecha} onChange={handleChange}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            {[
              {label:'⬆ NORTE (Frente)',med:'norteMedida',col:'norteColindancia',color:'#c00'},
              {label:'⬇ SUR (Fondo)',med:'surMedida',col:'surColindancia',color:'#555'},
              {label:'➡ ESTE (Oriente)',med:'esteMedida',col:'esteColindancia',color:'#555'},
              {label:'⬅ OESTE (Poniente)',med:'oesteMedida',col:'oesteColindancia',color:'#555'},
            ].map(({label,med,col,color})=>(
              <div key={med} style={{border:'1px solid #d0dcea',borderRadius:'5px',padding:'10px',background:'#f6f9ff'}}>
                <div style={{fontWeight:'bold',color,fontSize:'12px',marginBottom:'8px'}}>{label}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'8px'}}>
                  <div><label style={{...lbl,fontSize:'10px'}}>Medida ({form.unidadMedida})</label><input style={inp} name={med} value={form[med]} onChange={handleChange}/></div>
                  <div><label style={{...lbl,fontSize:'10px'}}>Colindancia</label><input style={inp} name={col} value={form[col]} onChange={handleChange}/></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{marginTop:'14px',border:'1px dashed #90a4ae',borderRadius:'5px',padding:'10px 14px',background:'#f9fafb'}}>
            <label style={{...lbl,fontSize:'12px'}}>📷 Imagen opcional del terreno</label>
            <input type="file" accept="image/*" onChange={handleImagen} style={{fontSize:'12px'}}/>
            {imagenSrc&&<img src={imagenSrc} alt="terreno" style={{marginTop:'8px',maxHeight:'80px',borderRadius:'4px',border:'1px solid #ccc'}}/>}
          </div>

          <div style={{marginTop:'16px',background:'#e8f5e9',border:'2px solid #4caf50',borderRadius:'6px',padding:'12px 18px',display:'flex',alignItems:'center',gap:'14px'}}>
            <span style={{fontSize:'28px'}}>📐</span>
            <div>
              <div style={{fontSize:'12px',color:'#555'}}>Superficie calculada automáticamente</div>
              <div style={{fontSize:'26px',fontWeight:'bold',color:'#1b5e20'}}>{areaM2.toFixed(2)} m²</div>
              {form.unidadMedida!=='metros'&&<div style={{fontSize:'10px',color:'#777'}}>Convertido desde {form.unidadMedida}</div>}
            </div>
          </div>

          <button onClick={handlePrint} style={{marginTop:'18px',width:'100%',padding:'14px',background:'#004a8f',color:'white',border:'none',cursor:'pointer',fontWeight:'bold',fontSize:'15px',borderRadius:'5px',letterSpacing:'1px'}}>
            ⬇ GENERAR PLANO CATASTRAL EN PDF (Carta)
          </button>
        </div>
      </div>

      {/* ══ VISTA PREVIA ══ */}
      <div style={{maxWidth:'950px',margin:'0 auto'}}>
        <div style={{background:'#004a8f',color:'white',padding:'8px 16px',borderRadius:'4px 4px 0 0',fontSize:'12px',fontWeight:'bold'}}>
          📄 VISTA PREVIA EN TIEMPO REAL — Así quedará el PDF
        </div>

        <div ref={printRef} style={{
          width:'816px', height:'1056px',
          background:'white', padding:'14px 14px 10px',
          boxSizing:'border-box', fontFamily:'Arial,sans-serif',
          fontSize:'9px', color:'#000', overflow:'hidden',
        }}>

          {/* Encabezado */}
          <div style={{border:'3px solid #000',padding:'5px 8px',marginBottom:'5px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <svg width="50" height="50" viewBox="0 0 56 56" style={{flexShrink:0}} xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="28" cy="28" rx="26" ry="26" fill="#006847" stroke="#000" strokeWidth="1.5"/>
                <text x="28" y="22" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">GEM</text>
                <text x="28" y="31" textAnchor="middle" fill="white" fontSize="5">CATASTRO</text>
                <text x="28" y="40" textAnchor="middle" fill="#ffd700" fontSize="5">★ ★ ★</text>
              </svg>
              <div style={{flex:1,textAlign:'center'}}>
                <div style={{fontSize:'11px',fontWeight:'bold'}}>GOBIERNO DEL ESTADO DE MÉXICO</div>
                <div style={{fontSize:'9px',fontWeight:'bold'}}>SECRETARÍA DE FINANZAS</div>
                <div style={{fontSize:'8px'}}>DIRECCIÓN GENERAL DE CATASTRO E INFORMACIÓN TERRITORIAL</div>
                <div style={{fontSize:'13px',fontWeight:'bold',marginTop:'3px',borderTop:'1px solid #000',paddingTop:'3px'}}>CÉDULA DE DETERMINACIÓN CATASTRAL</div>
                <div style={{fontSize:'8px',color:'#444'}}>PLANO DE LOCALIZACIÓN, MEDIDAS Y COLINDANCIAS</div>
              </div>
              <div style={{fontSize:'7px',textAlign:'right',flexShrink:0}}>
                <div style={{border:'1px solid #000',padding:'3px 6px',marginBottom:'3px'}}>
                  <div style={{fontWeight:'bold'}}>FOLIO:</div>
                  <div style={{fontSize:'8px',fontWeight:'bold'}}>{form.claveCatastral}</div>
                </div>
                <div style={{border:'1px solid #000',padding:'3px 6px'}}>
                  <div style={{fontWeight:'bold'}}>FECHA:</div>
                  <div>{form.fecha}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Clave */}
          <div style={{border:'2px solid #000',padding:'3px',textAlign:'center',marginBottom:'5px',background:'#f0f4f8'}}>
            <span style={{fontWeight:'bold',fontSize:'9px'}}>CLAVE CATASTRAL: </span>
            <span style={{fontSize:'14px',fontWeight:'bold',letterSpacing:'3px',color:'#003a6e'}}>{form.claveCatastral}</span>
          </div>

          {/* ── CUERPO: 2 columnas ─────────────────────────────────────────── */}
          {/*   Izquierda: tablas + firmas + foto                               */}
          {/*   Derecha: croquis GRANDE                                         */}
          <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:'6px',height:'890px'}}>

            {/* ── COLUMNA IZQUIERDA ── */}
            <div style={{display:'flex',flexDirection:'column',gap:'4px',overflow:'hidden'}}>

              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th colSpan="2" style={thH}>DATOS DEL PROPIETARIO</th></tr></thead>
                <tbody><tr><td style={tdH}>PROPIETARIO:</td><td style={tdV}>{form.propietario}</td></tr></tbody>
              </table>

              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th colSpan="2" style={thH}>UBICACIÓN DEL PREDIO</th></tr></thead>
                <tbody>
                  <tr><td style={tdH}>CALLE:</td><td style={tdV}>{form.calle} #{form.numero}</td></tr>
                  <tr><td style={tdH}>COLONIA:</td><td style={tdV}>{form.colonia}</td></tr>
                  <tr><td style={tdH}>MUNICIPIO:</td><td style={tdV}>{form.municipio}</td></tr>
                  <tr><td style={tdH}>ESTADO:</td><td style={tdV}>{form.estado}</td></tr>
                  <tr><td style={tdH}>C.P.:</td><td style={tdV}>{form.codigoPostal}</td></tr>
                </tbody>
              </table>

              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th colSpan="2" style={thH}>DATOS DEL PREDIO</th></tr></thead>
                <tbody>
                  <tr><td style={tdH}>SUPERFICIE:</td><td style={{...tdV,fontWeight:'bold',color:'#003a6e',fontSize:'10px'}}>{areaM2.toFixed(2)} M²</td></tr>
                  <tr><td style={tdH}>FRENTE (N):</td><td style={tdV}>{norteM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>FONDO (S):</td><td style={tdV}>{surM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>LADO ESTE:</td><td style={tdV}>{esteM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>LADO OESTE:</td><td style={tdV}>{oesteM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>USO SUELO:</td><td style={tdV}>{form.usoSuelo}</td></tr>
                </tbody>
              </table>

              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr><th colSpan="3" style={thH}>LINDEROS Y COLINDANCIAS</th></tr>
                  <tr>
                    <th style={{border:'1px solid #000',padding:'2px',background:'#d8e4f0',fontSize:'6.5px'}}>RUMBO</th>
                    <th style={{border:'1px solid #000',padding:'2px',background:'#d8e4f0',fontSize:'6.5px'}}>MED.(m)</th>
                    <th style={{border:'1px solid #000',padding:'2px',background:'#d8e4f0',fontSize:'6.5px'}}>COLINDANCIA</th>
                  </tr>
                </thead>
                <tbody>
                  {[{r:'NORTE',m:norteM,c:form.norteColindancia},{r:'SUR',m:surM,c:form.surColindancia},
                    {r:'ORIENTE',m:esteM,c:form.esteColindancia},{r:'PONIENTE',m:oesteM,c:form.oesteColindancia}
                  ].map(({r,m,c})=>(
                    <tr key={r}>
                      <td style={{...tdH,fontSize:'7px'}}>{r}</td>
                      <td style={{...tdV,textAlign:'center'}}>{m.toFixed(2)}</td>
                      <td style={tdV}>{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{fontSize:'6px',textAlign:'justify',border:'1px solid #ccc',padding:'3px 4px',background:'#fffde7',lineHeight:1.4}}>
                <strong>NOTA LEGAL:</strong> Cédula Catastral conforme al Código Financiero del Estado de México y Municipios. Superficie fiscal. No sustituye escritura pública ni plano topográfico.
              </div>

              {/* ── PERITO RESPONSABLE ── */}
              <div style={{border:'1px solid #000',padding:'5px',textAlign:'center'}}>
                <div style={{fontWeight:'bold',fontSize:'6.5px',background:'#003a6e',color:'white',margin:'-5px -5px 6px',padding:'3px'}}>PERITO RESPONSABLE</div>
                <div style={{height:'42px'}}/>
                <div style={{borderTop:'1px solid #000',paddingTop:'3px',fontSize:'6px'}}>
                  <div>NOMBRE Y FIRMA</div><div>CÉD. PROFESIONAL</div>
                </div>
              </div>

              {/* ── AUTORIZACIÓN OFICIAL ── */}
              <div style={{border:'1px solid #000',padding:'5px',textAlign:'center'}}>
                <div style={{fontWeight:'bold',fontSize:'6.5px',background:'#003a6e',color:'white',margin:'-5px -5px 6px',padding:'3px'}}>AUTORIZACIÓN OFICIAL</div>
                <div style={{height:'42px'}}/>
                <div style={{borderTop:'1px solid #000',paddingTop:'3px',fontSize:'6px'}}>
                  <div>DIR. DE CATASTRO MUNICIPAL</div>
                  <div style={{marginTop:'3px',border:'1px dashed #999',padding:'2px',fontSize:'6px'}}>SELLO OFICIAL</div>
                </div>
              </div>

              {/* ── VIGENCIA ── */}
              <div style={{border:'1px solid #000',padding:'5px',textAlign:'center',fontSize:'7px'}}>
                <div style={{fontWeight:'bold',color:'#003a6e',marginBottom:'2px'}}>VIGENCIA</div>
                <div>Ejercicio Fiscal en Curso</div>
                <div style={{fontWeight:'bold',marginTop:'4px',fontSize:'6px'}}>FOLIO ÚNICO:</div>
                <div style={{fontWeight:'bold',fontSize:'9px',letterSpacing:'1px',color:'#003a6e'}}>{form.claveCatastral}</div>
              </div>

              {/* ── FOTO — rectángulo horizontal ── */}
              <div style={{
                height:'105px', flexShrink:0,
                border:'2px dashed #90a4ae', borderRadius:'4px',
                overflow:'hidden', display:'flex',
                alignItems:'center', justifyContent:'center',
                background:'#f8f9fa',
              }}>
                {imagenSrc
                  ? <img src={imagenSrc} alt="terreno" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'26px',color:'#ccc'}}>📷</div>
                        <div style={{fontSize:'7px',color:'#aaa',marginTop:'3px'}}>Foto / croquis del terreno</div>
                      </div>
                    </>
                }
              </div>

            </div>{/* fin columna izquierda */}

            {/* ── COLUMNA DERECHA: CROQUIS COMPLETO ── */}
            <div style={{border:'2px solid #000',background:'#fafcff',display:'flex',flexDirection:'column'}}>
              <div style={{textAlign:'center',fontWeight:'bold',fontSize:'7.5px',background:'#003a6e',color:'white',padding:'3px 4px',flexShrink:0}}>
                CROQUIS DEL PREDIO — REPRESENTACIÓN GRÁFICA PROPORCIONAL
              </div>
              {/* Rosa de vientos con espacio propio */}
              <div style={{display:'flex',justifyContent:'flex-end',padding:'8px 12px 0 0',flexShrink:0}}>
                <RosaVientos size={85}/>
              </div>
              {/* Croquis llena el espacio restante */}
              <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 8px 8px'}}>
                <TerrenoCroquis
                  norteM={norteM} surM={surM} esteM={esteM} oesteM={oesteM}
                  norteCol={form.norteColindancia} surCol={form.surColindancia}
                  esteCol={form.esteColindancia}   oesteCol={form.oesteColindancia}
                  usoSuelo={form.usoSuelo} areaM2={areaM2}
                  svgW={CROQUIS_W} svgH={CROQUIS_H}
                />
              </div>
            </div>

          </div>{/* fin grid 2 cols */}

          {/* Pie de página */}
          <div style={{marginTop:'4px',borderTop:'2px solid #000',paddingTop:'3px',display:'flex',justifyContent:'space-between',fontSize:'6.5px',color:'#333'}}>
            <div>Generado el {form.fecha} | Sistema de Información Catastral | {form.municipio}, {form.estado}</div>
            <div style={{fontWeight:'bold'}}>CLAVE: {form.claveCatastral}</div>
          </div>

        </div>{/* fin printRef */}
      </div>
    </div>
  );
};

export default App;
