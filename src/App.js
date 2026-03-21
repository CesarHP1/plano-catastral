import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MUNICIPIOS = [
  'Acambay de Ruíz Castañeda','Acolman','Aculco','Almoloya de Alquisiras',
  'Almoloya de Juárez','Almoloya del Río','Alpuyeca','Amanalco','Amatepec',
  'Amecameca','Apaxco','Atenco','Atizapán','Atizapán de Zaragoza',
  'Atlacomulco','Atlautla','Axapusco','Ayapango','Calimaya','Capulhuac',
  'Chalco','Chapa de Mota','Chapultepec','Chiautla','Chicoloapan',
  'Chiconcuac','Chimalhuacán','Coacalco de Berriozábal','Coatepec Harinas',
  'Cocotitlán','Coyotepec','Cuautitlán','Cuautitlán Izcalli','Donato Guerra',
  'Ecatepec de Morelos','Ecatzingo','El Oro','Huehuetoca','Hueypoxtla',
  'Huixquilucan','Isidro Fabela','Ixtapaluca','Ixtapan de la Sal',
  'Ixtapan del Oro','Ixtlahuaca','Jaltenco','Jilotepec','Jilotzingo',
  'Jiquipilco','Jocotitlán','Joquicingo','Juchitepec','La Paz',
  'Lerma','Luvianos','Malinalco','Melchor Ocampo','Metepec','Mexicaltzingo',
  'Morelos','Naucalpan de Juárez','Nextlalpan','Nezahualcóyotl','Nicolás Romero',
  'Nopaltepec','Ocoyoacac','Ocuilan','Ojocaliente','Otumba','Otzoloapan',
  'Otzolotepec','Ozumba','Papalotla','Polotitlán','Rayón','San Antonio la Isla',
  'San Felipe del Progreso','San José del Rincón','San Martín de las Pirámides',
  'San Mateo Atenco','San Simón de Guerrero','Santo Tomás','Soyaniquilpan de Juárez',
  'Sultepec','Tecámac','Tejupilco','Temamatla','Temascalapa','Temascalcingo',
  'Temascaltepec','Temoaya','Tenancingo','Tenango del Aire','Tenango del Valle',
  'Teoloyucan','Teotihuacán','Tepetlaoxtoc','Tepetlixpa','Tepotzotlán',
  'Tequixquiac','Texcaltitlán','Texcalyacac','Texcoco','Tezoyuca',
  'Tianguistenco','Timilpan','Tlalmanalco','Tlalnepantla de Baz','Tlatlaya',
  'Toluca','Tonanitla','Tonatico','Tultepec','Tultitlán','Valle de Bravo',
  'Valle de Chalco Solidaridad','Villa de Allende','Villa del Carbón',
  'Villa Guerrero','Villa Victoria','Xalatlaco','Xonacatlán','Zacazonapan',
  'Zacualpan','Zinacantepec','Zumpahuacán','Zumpango'
];

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
    frente: '15.00',
    fondo: '30.00',
    norteMedida: '15.00',
    norteColindancia: 'CALLE SIN NOMBRE',
    surMedida: '15.00',
    surColindancia: 'TERRENO DE MARIA GOMEZ',
    esteMedida: '30.00',
    esteColindancia: 'CASA HABITACIÓN',
    oesteMedida: '30.00',
    oesteColindancia: 'AV. PRINCIPAL',
    fecha: new Date().toLocaleDateString('es-MX'),
    unidadMedida: 'metros',
  });

  const [munQuery, setMunQuery] = useState('TLALNEPANTLA DE BAZ');
  const [munSuggestions, setMunSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Auto-calcular superficie
  const frente = parseFloat(form.frente) || 0;
  const fondo = parseFloat(form.fondo) || 0;
  const superficie = (frente * fondo).toFixed(2);

  // Conversión de unidades a metros para dibujo
  const toMetros = (val) => {
    const v = parseFloat(val) || 0;
    if (form.unidadMedida === 'varas') return v * 0.838;
    if (form.unidadMedida === 'pies') return v * 0.3048;
    return v;
  };
  const frenteM = toMetros(form.frente);
  const fondoM = toMetros(form.fondo);
  const superficieM2 = (frenteM * fondoM).toFixed(2);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleMunInput = (e) => {
    const val = e.target.value;
    setMunQuery(val);
    if (val.length > 0) {
      const filtered = MUNICIPIOS.filter(m =>
        m.toLowerCase().includes(val.toLowerCase())
      );
      setMunSuggestions(filtered.slice(0, 8));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectMunicipio = (m) => {
    setMunQuery(m);
    setForm({ ...form, municipio: m.toUpperCase() });
    setShowSuggestions(false);
  };

  const ubicacionCompleta = `${form.calle} #${form.numero}, ${form.colonia}, ${form.municipio}, ${form.estado}. C.P. ${form.codigoPostal}`;

  const handlePrint = async () => {
    const element = printRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      const data = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Plano_Catastral_' + form.claveCatastral + '.pdf');
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  };

  // Escala para dibujo (px por metro)
  const escala = 6;
  const maxW = 260;
  const maxH = 320;
  const wDib = Math.min(frenteM * escala, maxW);
  const hDib = Math.min(fondoM * escala, maxH);

  const labelStyle = { fontWeight: 'bold', fontSize: '11px', marginBottom: '3px', color: '#333' };
  const inputStyle = { padding: '7px', border: '1px solid #bbb', borderRadius: '3px', fontSize: '13px', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto', background: '#f4f6f9' }}>
      <div style={{ background: '#004a8f', color: 'white', padding: '15px 20px', borderRadius: '6px 6px 0 0', marginBottom: '0' }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>Generador de Plano Catastral — Estado de México</h1>
        <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.8 }}>Complete los datos del predio para generar el plano oficial</p>
      </div>

      <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderTop: 'none', marginBottom: '20px' }}>

        {/* IDENTIFICACIÓN */}
        <h3 style={{ color: '#004a8f', borderBottom: '2px solid #004a8f', paddingBottom: '5px' }}>Identificación del Predio</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
          <div>
            <label style={labelStyle}>Clave Catastral</label>
            <input style={inputStyle} name="claveCatastral" value={form.claveCatastral} onChange={handleChange} placeholder="15-001-002-003-04" />
          </div>
          <div>
            <label style={labelStyle}>Propietario</label>
            <input style={inputStyle} name="propietario" value={form.propietario} onChange={handleChange} />
          </div>
        </div>

        {/* UBICACIÓN */}
        <h3 style={{ color: '#004a8f', borderBottom: '2px solid #004a8f', paddingBottom: '5px' }}>Ubicación del Predio</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>Calle / Avenida</label>
            <input style={inputStyle} name="calle" value={form.calle} onChange={handleChange} placeholder="Calle de los Arcos" />
          </div>
          <div>
            <label style={labelStyle}>Número Exterior</label>
            <input style={inputStyle} name="numero" value={form.numero} onChange={handleChange} placeholder="123" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>Colonia / Fraccionamiento</label>
            <input style={inputStyle} name="colonia" value={form.colonia} onChange={handleChange} placeholder="Col. Centro" />
          </div>
          <div>
            <label style={labelStyle}>Código Postal</label>
            <input style={inputStyle} name="codigoPostal" value={form.codigoPostal} onChange={handleChange} placeholder="54000" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Municipio</label>
            <input
              style={inputStyle}
              value={munQuery}
              onChange={handleMunInput}
              onFocus={() => munQuery && setShowSuggestions(true)}
              placeholder="Escriba para buscar..."
              autoComplete="off"
            />
            {showSuggestions && munSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #bbb', borderRadius: '0 0 4px 4px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                {munSuggestions.map((m, i) => (
                  <div key={i} onClick={() => selectMunicipio(m)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #eee' }}
                    onMouseEnter={e => e.target.style.background = '#e8f0fe'}
                    onMouseLeave={e => e.target.style.background = 'white'}>
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Estado</label>
            <select style={inputStyle} name="estado" value={form.estado} onChange={handleChange}>
              <option value="ESTADO DE MÉXICO">Estado de México</option>
              <option value="CIUDAD DE MÉXICO">Ciudad de México</option>
              <option value="HIDALGO">Hidalgo</option>
              <option value="QUERÉTARO">Querétaro</option>
              <option value="PUEBLA">Puebla</option>
              <option value="MORELOS">Morelos</option>
              <option value="MICHOACÁN">Michoacán</option>
              <option value="GUERRERO">Guerrero</option>
            </select>
          </div>
        </div>

        {/* MEDIDAS */}
        <h3 style={{ color: '#004a8f', borderBottom: '2px solid #004a8f', paddingBottom: '5px' }}>Medidas del Predio</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>Unidad de Medida</label>
            <select style={inputStyle} name="unidadMedida" value={form.unidadMedida} onChange={handleChange}>
              <option value="metros">Metros (m)</option>
              <option value="varas">Varas</option>
              <option value="pies">Pies</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Frente ({form.unidadMedida})</label>
            <input style={inputStyle} name="frente" value={form.frente} onChange={handleChange} placeholder="15.00" />
          </div>
          <div>
            <label style={labelStyle}>Fondo ({form.unidadMedida})</label>
            <input style={inputStyle} name="fondo" value={form.fondo} onChange={handleChange} placeholder="30.00" />
          </div>
        </div>

        <div style={{ background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '4px', padding: '10px 15px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📐</span>
          <div>
            <strong>Superficie calculada automáticamente:</strong>
            <span style={{ fontSize: '18px', color: '#2e7d32', marginLeft: '10px', fontWeight: 'bold' }}>
              {superficieM2} m²
            </span>
            {form.unidadMedida !== 'metros' && (
              <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                (convertido de {form.frente} × {form.fondo} {form.unidadMedida})
              </span>
            )}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Uso de Suelo</label>
          <select style={{ ...inputStyle, maxWidth: '300px' }} name="usoSuelo" value={form.usoSuelo} onChange={handleChange}>
            <option value="HABITACIONAL">Habitacional</option>
            <option value="COMERCIAL">Comercial</option>
            <option value="INDUSTRIAL">Industrial</option>
            <option value="EQUIPAMIENTO">Equipamiento</option>
            <option value="MIXTO">Mixto</option>
            <option value="RÚSTICO">Rústico</option>
            <option value="AGRÍCOLA">Agrícola</option>
          </select>
        </div>

        {/* COLINDANCIAS */}
        <h3 style={{ color: '#004a8f', borderBottom: '2px solid #004a8f', paddingBottom: '5px', marginTop: '20px' }}>Colindancias y Linderos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { dir: 'norte', label: '⬆ Norte', medida: 'norteMedida', col: 'norteColindancia' },
            { dir: 'sur', label: '⬇ Sur', medida: 'surMedida', col: 'surColindancia' },
            { dir: 'este', label: '➡ Este (Oriente)', medida: 'esteMedida', col: 'esteColindancia' },
            { dir: 'oeste', label: '⬅ Oeste (Poniente)', medida: 'oesteMedida', col: 'oesteColindancia' },
          ].map(({ label, medida, col }) => (
            <div key={medida} style={{ border: '1px solid #eee', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#004a8f', marginBottom: '8px', fontSize: '12px' }}>{label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: '10px' }}>Medida ({form.unidadMedida})</label>
                  <input style={inputStyle} name={medida} value={form[medida]} onChange={handleChange} />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: '10px' }}>Colindancia</label>
                  <input style={inputStyle} name={col} value={form[col]} onChange={handleChange} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '15px' }}>
          <label style={labelStyle}>Fecha de Elaboración</label>
          <input style={{ ...inputStyle, maxWidth: '200px' }} name="fecha" value={form.fecha} onChange={handleChange} />
        </div>

        <button
          onClick={handlePrint}
          style={{ marginTop: '20px', width: '100%', padding: '14px', background: '#004a8f', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', borderRadius: '4px', letterSpacing: '1px' }}>
          ⬇ GENERAR PLANO CATASTRAL EN PDF
        </button>
      </div>

      {/* ===================== PLANO OFICIAL ===================== */}
      <div ref={printRef} style={{
        width: '216mm', minHeight: '279mm', background: 'white',
        margin: '0 auto', padding: '8mm', boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#000',
        border: '1px solid #ccc',
      }}>

        {/* Encabezado oficial */}
        <div style={{ border: '3px solid #000', padding: '6px', textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '60px', height: '60px', border: '1px solid #999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#666' }}>ESCUDO</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold' }}>GOBIERNO DEL ESTADO DE MÉXICO</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>SECRETARÍA DE FINANZAS</div>
              <div style={{ fontSize: '9px' }}>DIRECCIÓN GENERAL DE CATASTRO E INFORMACIÓN TERRITORIAL</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '4px', borderTop: '1px solid #000', paddingTop: '4px' }}>CÉDULA DE DETERMINACIÓN CATASTRAL</div>
              <div style={{ fontSize: '9px' }}>PLANO DE LOCALIZACIÓN, MEDIDAS Y COLINDANCIAS</div>
            </div>
            <div style={{ width: '60px', textAlign: 'right', fontSize: '8px' }}>
              <div style={{ border: '1px solid #000', padding: '3px', marginBottom: '3px' }}>
                <div style={{ fontWeight: 'bold' }}>FOLIO:</div>
                <div>{form.claveCatastral}</div>
              </div>
              <div style={{ border: '1px solid #000', padding: '3px' }}>
                <div style={{ fontWeight: 'bold' }}>FECHA:</div>
                <div>{form.fecha}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Clave catastral destacada */}
        <div style={{ border: '2px solid #000', padding: '4px', textAlign: 'center', marginBottom: '6px', background: '#f0f0f0' }}>
          <span style={{ fontWeight: 'bold', fontSize: '10px' }}>CLAVE CATASTRAL: </span>
          <span style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px' }}>{form.claveCatastral}</span>
        </div>

        {/* Cuerpo principal: 3 columnas */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 160px', gap: '6px', minHeight: '185mm' }}>

          {/* Columna izquierda */}
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', marginBottom: '6px' }}>
              <thead>
                <tr><th colSpan="2" style={{ background: '#003a6e', color: 'white', padding: '3px', textAlign: 'center', fontSize: '8px' }}>DATOS DEL PROPIETARIO</th></tr>
              </thead>
              <tbody>
                <tr><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', background: '#f5f5f5' }}>PROPIETARIO:</td><td style={{ border: '1px solid #000', padding: '3px' }}>{form.propietario}</td></tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', marginBottom: '6px' }}>
              <thead>
                <tr><th colSpan="2" style={{ background: '#003a6e', color: 'white', padding: '3px', textAlign: 'center', fontSize: '8px' }}>UBICACIÓN DEL PREDIO</th></tr>
              </thead>
              <tbody>
                <tr><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', background: '#f5f5f5' }}>CALLE:</td><td style={{ border: '1px solid #000', padding: '3px' }}>{form.calle} #{form.numero}</td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', background: '#f5f5f5' }}>COLONIA:</td><td style={{ border: '1px solid #000', padding: '3px' }}>{form.colonia}</td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', background: '#f5f5f5' }}>MUNICIPIO:</td><td style={{ border: '1px solid #000', padding: '3px' }}>{form.municipio}</td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', background: '#f5f5f5' }}>ESTADO:</td><td style={{ border: '1px solid #000', padding: '3px' }}>{form.estado}</td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', background: '#f5f5f5' }}>C.P.:</td><td style={{ border: '1px solid #000', padding: '3px' }}>{form.codigoPostal}</td></tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', marginBottom: '6px' }}>
              <thead>
                <tr><th colSpan="2" style={{ background: '#003a6e', color: 'white', padding: '3px', textAlign: 'center', fontSize: '8px' }}>DATOS DEL PREDIO</th></tr>
              </thead>
              <tbody>
                <tr><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', background: '#f5f5f5' }}>SUPERFICIE:</td><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', color: '#003a6e' }}>{superficieM2} M²</td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', background: '#f5f5f5' }}>FRENTE:</td><td style={{ border: '1px solid #000', padding: '3px' }}>{frenteM.toFixed(2)} M</td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', background: '#f5f5f5' }}>FONDO:</td><td style={{ border: '1px solid #000', padding: '3px' }}>{fondoM.toFixed(2)} M</td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', background: '#f5f5f5' }}>USO SUELO:</td><td style={{ border: '1px solid #000', padding: '3px' }}>{form.usoSuelo}</td></tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
              <thead>
                <tr><th colSpan="3" style={{ background: '#003a6e', color: 'white', padding: '3px', textAlign: 'center', fontSize: '8px' }}>LINDEROS Y COLINDANCIAS</th></tr>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '2px', background: '#e0e0e0' }}>RUMBO</th>
                  <th style={{ border: '1px solid #000', padding: '2px', background: '#e0e0e0' }}>MED.</th>
                  <th style={{ border: '1px solid #000', padding: '2px', background: '#e0e0e0' }}>COLINDANCIA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>NORTE</td>
                  <td style={{ border: '1px solid #000', padding: '2px' }}>{toMetros(form.norteMedida).toFixed(2)}m</td>
                  <td style={{ border: '1px solid #000', padding: '2px' }}>{form.norteColindancia}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>SUR</td>
                  <td style={{ border: '1px solid #000', padding: '2px' }}>{toMetros(form.surMedida).toFixed(2)}m</td>
                  <td style={{ border: '1px solid #000', padding: '2px' }}>{form.surColindancia}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>ORIENTE</td>
                  <td style={{ border: '1px solid #000', padding: '2px' }}>{toMetros(form.esteMedida).toFixed(2)}m</td>
                  <td style={{ border: '1px solid #000', padding: '2px' }}>{form.esteColindancia}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>PONIENTE</td>
                  <td style={{ border: '1px solid #000', padding: '2px' }}>{toMetros(form.oesteMedida).toFixed(2)}m</td>
                  <td style={{ border: '1px solid #000', padding: '2px' }}>{form.oesteColindancia}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '8px', fontSize: '7px', textAlign: 'justify', border: '1px solid #ccc', padding: '4px', background: '#fffde7' }}>
              <strong>NOTA LEGAL:</strong> El presente documento tiene carácter de Cédula Catastral conforme al Código Financiero del Estado de México y Municipios. La superficie indicada es de carácter fiscal y no sustituye a la escritura pública.
            </div>
          </div>

          {/* Columna central: dibujo */}
          <div style={{ border: '2px solid #000', position: 'relative', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Título área de dibujo */}
            <div style={{ position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold', fontSize: '8px', whiteSpace: 'nowrap', background: '#003a6e', color: 'white', padding: '2px 8px' }}>
              CROQUIS DEL PREDIO
            </div>

            {/* Rosa de los vientos SVG - ahora dentro del área de dibujo correctamente */}
            <svg width="65" height="65"
              style={{ position: 'absolute', top: '22px', right: '6px' }}
              xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" fill="white" stroke="black" strokeWidth="1.5" />
              {/* Norte - punta negra */}
              <polygon points="32,4 36,32 32,28 28,32" fill="black" />
              {/* Sur - punta blanca */}
              <polygon points="32,60 36,32 32,36 28,32" fill="white" stroke="black" strokeWidth="1" />
              {/* Este - punta blanca */}
              <polygon points="60,32 32,36 36,32 32,28" fill="white" stroke="black" strokeWidth="1" />
              {/* Oeste - punta blanca */}
              <polygon points="4,32 32,36 28,32 32,28" fill="white" stroke="black" strokeWidth="1" />
              {/* Letras */}
              <text x="29" y="16" fontSize="9" fontWeight="bold" fill="black">N</text>
              <text x="29" y="58" fontSize="8" fill="black">S</text>
              <text x="50" y="35" fontSize="8" fill="black">E</text>
              <text x="6" y="35" fontSize="8" fill="black">O</text>
            </svg>

            {/* Escala */}
            <div style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '7px', border: '1px solid #000', padding: '2px 5px', background: 'white' }}>
              ESCALA APROX. 1:{Math.round(frenteM / (wDib / 96 * 0.0254))}
            </div>

            {/* Colindancias alrededor del terreno */}
            {/* Norte */}
            <div style={{ position: 'absolute', top: 'calc(50% - ' + (hDib / 2) + 'px - 22px)', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', fontSize: '7px', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 'bold' }}>{toMetros(form.norteMedida).toFixed(2)} m</div>
              <div style={{ color: '#333', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.norteColindancia}</div>
            </div>
            {/* Sur */}
            <div style={{ position: 'absolute', top: 'calc(50% + ' + (hDib / 2) + 'px + 6px)', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', fontSize: '7px', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 'bold' }}>{toMetros(form.surMedida).toFixed(2)} m</div>
              <div style={{ color: '#333', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.surColindancia}</div>
            </div>
            {/* Este */}
            <div style={{ position: 'absolute', left: 'calc(50% + ' + (wDib / 2) + 'px + 4px)', top: '50%', transform: 'translateY(-50%)', textAlign: 'center', fontSize: '7px' }}>
              <div style={{ transform: 'rotate(90deg)', whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 'bold' }}>{toMetros(form.esteMedida).toFixed(2)} m</div>
              </div>
            </div>
            {/* Oeste */}
            <div style={{ position: 'absolute', left: 'calc(50% - ' + (wDib / 2) + 'px - 28px)', top: '50%', transform: 'translateY(-50%)', textAlign: 'center', fontSize: '7px' }}>
              <div style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 'bold' }}>{toMetros(form.oesteMedida).toFixed(2)} m</div>
              </div>
            </div>

            {/* Rectángulo del terreno */}
            <div style={{
              width: wDib + 'px',
              height: hDib + 'px',
              border: '2px solid #000',
              background: 'rgba(173, 216, 230, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'center' }}>TERRENO</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#003a6e' }}>{superficieM2} m²</div>
              <div style={{ fontSize: '8px', color: '#555' }}>{form.usoSuelo}</div>
              {/* Líneas de construcción */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px)',
              }} />
            </div>
          </div>

          {/* Columna derecha: firmas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '8px', background: '#003a6e', color: 'white', margin: '-8px -8px 8px', padding: '3px' }}>PERITO RESPONSABLE</div>
              <br /><br /><br />
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '7px' }}>
                <div>NOMBRE Y FIRMA</div>
                <div>CÉDULA PROFESIONAL</div>
              </div>
            </div>

            <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '8px', background: '#003a6e', color: 'white', margin: '-8px -8px 8px', padding: '3px' }}>AUTORIZACIÓN</div>
              <br /><br /><br />
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '7px' }}>
                <div>DIRECTOR DE CATASTRO</div>
                <div>MUNICIPAL</div>
                <div style={{ marginTop: '4px' }}>SELLO OFICIAL</div>
              </div>
            </div>

            <div style={{ border: '1px solid #000', padding: '6px', fontSize: '7px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>VIGENCIA</div>
              <div>Año fiscal en curso</div>
              <div style={{ marginTop: '4px', fontWeight: 'bold' }}>FOLIO ÚNICO:</div>
              <div style={{ fontWeight: 'bold', fontSize: '9px', letterSpacing: '1px' }}>{form.claveCatastral}</div>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div style={{ marginTop: '6px', borderTop: '2px solid #000', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '7px' }}>
          <div>Documento generado el {form.fecha} | Sistema de Información Catastral del Estado de México</div>
          <div style={{ fontWeight: 'bold' }}>CLAVE: {form.claveCatastral}</div>
        </div>
      </div>
    </div>
  );
};

export default App;
