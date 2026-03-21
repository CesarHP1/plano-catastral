import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const App = () => {
  const printRef = useRef();

  const [formData, setFormData] = useState({
    claveCatastral: '15-001-002-003-04',
    propietario: 'JUAN PÉREZ LÓPEZ',
    ubicacion: 'CALLE DE LOS ARCOS #123, COL. CENTRO, TLALNEPANTLA, EDO. MÉX.',
    municipio: 'TLALNEPANTLA DE BAZ',
    usoSuelo: 'HABITACIONAL',
    superficie: '450.00',
    frente: '15.00',
    fondo: '30.00',
    norteMedida: '30.00',
    norteColindancia: 'CALLE SIN NOMBRE',
    surMedida: '30.00',
    surColindancia: 'TERRENO DE MARIA GOMEZ',
    esteMedida: '15.00',
    esteColindancia: 'CASA HABITACIÓN VACÍA',
    oesteMedida: '15.00',
    oesteColindancia: 'AV. PRINCIPAL',
    fecha: new Date().toLocaleDateString('es-MX'),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePrint = async () => {
    const element = printRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const data = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', [216, 279]);
      const imgProperties = pdf.getImageProperties(data);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;
      pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Plano_Catastral_' + formData.claveCatastral + '.pdf');
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  };

  const s = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '820px', margin: '0 auto' },
    form: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', background: '#f9f9f9', padding: '20px', border: '1px solid #ddd' },
    group: { display: 'flex', flexDirection: 'column' },
    groupFull: { display: 'flex', flexDirection: 'column', gridColumn: 'span 2' },
    label: { fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' },
    input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
    button: { gridColumn: 'span 2', padding: '12px', background: '#004a8f', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', borderRadius: '4px' },
    plano: { width: '210mm', minHeight: '280mm', background: 'white', border: '2px solid black', margin: '0 auto', padding: '10mm', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', fontSize: '10px' },
    header: { textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '5px', marginBottom: '10px' },
    title: { fontSize: '14px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' },
    grid: { display: 'grid', gridTemplateColumns: '220px 1fr 180px', gap: '10px', height: '200mm' },
    table: { width: '100%', border: '1px solid black', borderCollapse: 'collapse', fontSize: '9px' },
    td: { border: '1px solid black', padding: '4px' },
    drawArea: { border: '1px solid black', height: '100%', position: 'relative', background: '#fff' },
    terreno: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: '2px dashed #555', background: 'rgba(200,200,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center' },
  };

  const escala = 5;
  const w = Math.min(parseFloat(formData.frente) * escala, 300);
  const h = Math.min(parseFloat(formData.fondo) * escala, 400);

  return (
    <div style={s.container}>
      <h1 style={{ color: '#004a8f' }}>Generador de Plano Catastral — Estado de México</h1>

      <div style={s.form}>

        <div style={s.group}>
          <label style={s.label}>Clave Catastral</label>
          <input style={s.input} name="claveCatastral" value={formData.claveCatastral} onChange={handleChange} />
        </div>

        <div style={s.group}>
          <label style={s.label}>Propietario</label>
          <input style={s.input} name="propietario" value={formData.propietario} onChange={handleChange} />
        </div>

        <div style={s.groupFull}>
          <label style={s.label}>Ubicación</label>
          <input style={s.input} name="ubicacion" value={formData.ubicacion} onChange={handleChange} />
        </div>

        <div style={s.group}>
          <label style={s.label}>Municipio</label>
          <input style={s.input} name="municipio" value={formData.municipio} onChange={handleChange} />
        </div>

        <div style={s.group}>
          <label style={s.label}>Superficie (m²)</label>
          <input style={s.input} name="superficie" value={formData.superficie} onChange={handleChange} />
        </div>

        <div style={s.group}>
          <label style={s.label}>Uso de Suelo</label>
          <select style={s.input} name="usoSuelo" value={formData.usoSuelo} onChange={handleChange}>
            <option value="HABITACIONAL">Habitacional</option>
            <option value="COMERCIAL">Comercial</option>
            <option value="INDUSTRIAL">Industrial</option>
            <option value="EQUIPAMIENTO">Equipamiento</option>
            <option value="RÚSTICO">Rústico</option>
          </select>
        </div>

        <div style={s.group}>
          <label style={s.label}>Fecha</label>
          <input style={s.input} name="fecha" value={formData.fecha} onChange={handleChange} />
        </div>

        <fieldset style={{ gridColumn: 'span 2', border: '1px dashed #aaa', padding: '10px' }}>
          <legend style={{ fontWeight: 'bold' }}>Medidas y Colindancias</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
            <div style={s.group}>
              <label style={s.label}>Norte — Medida (m)</label>
              <input style={s.input} name="norteMedida" value={formData.norteMedida} onChange={handleChange} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Norte — Colindancia</label>
              <input style={s.input} name="norteColindancia" value={formData.norteColindancia} onChange={handleChange} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Sur — Medida (m)</label>
              <input style={s.input} name="surMedida" value={formData.surMedida} onChange={handleChange} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Sur — Colindancia</label>
              <input style={s.input} name="surColindancia" value={formData.surColindancia} onChange={handleChange} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Este — Medida (m)</label>
              <input style={s.input} name="esteMedida" value={formData.esteMedida} onChange={handleChange} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Este — Colindancia</label>
              <input style={s.input} name="esteColindancia" value={formData.esteColindancia} onChange={handleChange} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Oeste — Medida (m)</label>
              <input style={s.input} name="oesteMedida" value={formData.oesteMedida} onChange={handleChange} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Oeste — Colindancia</label>
              <input style={s.input} name="oesteColindancia" value={formData.oesteColindancia} onChange={handleChange} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Frente (m)</label>
              <input style={s.input} name="frente" value={formData.frente} onChange={handleChange} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Fondo (m)</label>
              <input style={s.input} name="fondo" value={formData.fondo} onChange={handleChange} />
            </div>
          </div>
        </fieldset>

        <button style={s.button} onClick={handlePrint}>⬇ GENERAR PDF OFICIAL</button>
      </div>

      <div ref={printRef} style={s.plano}>

        <div style={s.header}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>GOBIERNO DEL ESTADO DE MÉXICO</p>
          <p style={{ margin: 0 }}>DIRECCIÓN GENERAL DE CATASTRO Y REGISTRO INMOBILIARIO</p>
          <p style={{ margin: 0 }}>MUNICIPIO: {formData.municipio}</p>
          <h2 style={s.title}>PLANO DE LOCALIZACIÓN Y MEDIDAS</h2>
        </div>

        <div style={s.grid}>

          <div>
            <h3 style={{ margin: '5px 0', borderBottom: '1px solid black' }}>DATOS DEL PREDIO</h3>
            <table style={s.table}>
              <tbody>
                <tr><td style={s.td}>CLAVE CATASTRAL</td><td style={s.td}>{formData.claveCatastral}</td></tr>
                <tr><td style={s.td}>PROPIETARIO</td><td style={s.td}>{formData.propietario}</td></tr>
                <tr><td style={s.td}>UBICACIÓN</td><td style={s.td}>{formData.ubicacion}</td></tr>
                <tr><td style={s.td}>SUPERFICIE</td><td style={s.td}>{formData.superficie} M²</td></tr>
                <tr><td style={s.td}>USO DE SUELO</td><td style={s.td}>{formData.usoSuelo}</td></tr>
              </tbody>
            </table>

            <h3 style={{ margin: '15px 0 5px 0', borderBottom: '1px solid black' }}>LINDEROS</h3>
            <table style={s.table}>
              <tbody>
                <tr><td style={s.td}>NORTE</td><td style={s.td}>{formData.norteMedida} M</td><td style={s.td}>{formData.norteColindancia}</td></tr>
                <tr><td style={s.td}>SUR</td><td style={s.td}>{formData.surMedida} M</td><td style={s.td}>{formData.surColindancia}</td></tr>
                <tr><td style={s.td}>ORIENTE</td><td style={s.td}>{formData.esteMedida} M</td><td style={s.td}>{formData.esteColindancia}</td></tr>
                <tr><td style={s.td}>PONIENTE</td><td style={s.td}>{formData.oesteMedida} M</td><td style={s.td}>{formData.oesteColindancia}</td></tr>
              </tbody>
            </table>

            <div style={{ marginTop: '20px', fontSize: '8px', textAlign: 'justify' }}>
              <p><strong>NOTA:</strong> El presente plano tiene carácter de Certificado de Alineamiento y Número Oficial bajo la clave catastral indicada, de conformidad con el Código Administrativo del Estado de México.</p>
              <p><strong>ESCALA:</strong> 1:500 (Representación esquemática)</p>
            </div>
          </div>

          <div style={s.drawArea}>
            <svg width="70" height="70" style={{ position: 'absolute', top: '8px', right: '8px' }}>
              <circle cx="35" cy="35" r="30" fill="none" stroke="black" strokeWidth="1" />
              <path d="M35 5 L39 35 L35 30 L31 35 Z" fill="black" />
              <path d="M35 65 L39 35 L35 40 L31 35 Z" fill="white" stroke="black" strokeWidth="0.5" />
              <path d="M65 35 L35 39 L40 35 L35 31 Z" fill="white" stroke="black" strokeWidth="0.5" />
              <path d="M5 35 L35 39 L30 35 L35 31 Z" fill="white" stroke="black" strokeWidth="0.5" />
              <text x="32" y="14" fontSize="9" fontWeight="bold">N</text>
              <text x="32" y="63" fontSize="8">S</text>
              <text x="55" y="38" fontSize="8">E</text>
              <text x="8" y="38" fontSize="8">O</text>
            </svg>

            <div style={{ ...s.terreno, width: w + 'px', height: h + 'px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '11px' }}>TERRENO</span>
              <span>{formData.superficie} m²</span>
            </div>

            <div style={{ position: 'absolute', top: 'calc(50% - ' + (h / 2) + 'px - 14px)', left: '50%', transform: 'translateX(-50%)', fontSize: '9px' }}>
              {formData.norteMedida} m
            </div>
            <div style={{ position: 'absolute', top: 'calc(50% + ' + (h / 2) + 'px + 4px)', left: '50%', transform: 'translateX(-50%)', fontSize: '9px' }}>
              {formData.surMedida} m
            </div>
            <div style={{ position: 'absolute', left: 'calc(50% + ' + (w / 2) + 'px + 4px)', top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: '9px' }}>
              {formData.esteMedida} m
            </div>
            <div style={{ position: 'absolute', left: 'calc(50% - ' + (w / 2) + 'px - 22px)', top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: '9px' }}>
              {formData.oesteMedida} m
            </div>

            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'white', padding: '2px 5px', border: '1px solid black', fontSize: '8px' }}>
              USO: {formData.usoSuelo}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ border: '1px solid black', padding: '10px', textAlign: 'center', marginBottom: '15px' }}>
              <p style={{ margin: 0 }}><strong>ELABORÓ:</strong></p>
              <br /><br />
              <p style={{ margin: 0 }}>NOMBRE DEL PERITO</p>
              <p style={{ margin: 0 }}>CÉDULA PROFESIONAL</p>
            </div>
            <div style={{ border: '1px solid black', padding: '10px', textAlign: 'center' }}>
              <p style={{ margin: 0 }}><strong>VO. BO.</strong></p>
              <p style={{ margin: 0 }}>DIRECTOR DE CATASTRO MUNICIPAL</p>
              <br /><br />
              <hr style={{ width: '60%' }} />
              <p style={{ margin: 0 }}>FIRMA Y SELLO</p>
            </div>
            <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '8px', paddingTop: '10px' }}>
              <p style={{ margin: 0 }}>FECHA: {formData.fecha}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;
