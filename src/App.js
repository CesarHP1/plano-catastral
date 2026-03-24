import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ESTADOS = [
  'AGUASCALIENTES','BAJA CALIFORNIA','BAJA CALIFORNIA SUR','CAMPECHE','CHIAPAS','CHIHUAHUA',
  'CIUDAD DE MÉXICO','COAHUILA DE ZARAGOZA','COLIMA','DURANGO','ESTADO DE MÉXICO','GUANAJUATO',
  'GUERRERO','HIDALGO','JALISCO','MICHOACÁN DE OCAMPO','MORELOS','NAYARIT','NUEVO LEÓN',
  'OAXACA','PUEBLA','QUERÉTARO','QUINTANA ROO','SAN LUIS POTOSÍ','SINALOA','SONORA','TABASCO',
  'TAMAULIPAS','TLAXCALA','VERACRUZ DE IGNACIO DE LA LLAVE','YUCATÁN','ZACATECAS'
];
const MUNICIPIOS = [
  'Acambay de Ruíz Castañeda','Acolman','Aculco','Almoloya de Alquisiras','Almoloya de Juárez',
  'Almoloya del Río','Amanalco','Amatepec','Amecameca','Apaxco','Atenco','Atizapán',
  'Atizapán de Zaragoza','Atlacomulco','Atlautla','Axapusco','Ayapango','Calimaya','Capulhuac',
  'Chalco','Chapa de Mota','Chapultepec','Chiautla','Chicoloapan','Chiconcuac','Chimalhuacán',
  'Coacalco de Berriozábal','Coatepec Harinas','Cocotitlán','Coyotepec','Cuautitlán',
  'Cuautitlán Izcalli','Donato Guerra','Ecatepec de Morelos','Ecatzingo','El Oro','Huehuetoca',
  'Hueypoxtla','Huixquilucan','Isidro Fabela','Ixtapaluca','Ixtapan de la Sal','Ixtapan del Oro',
  'Ixtlahuaca','Jaltenco','Jilotepec','Jilotzingo','Jiquipilco','Jocotitlán','Joquicingo',
  'Juchitepec','La Paz','Lerma','Luvianos','Malinalco','Melchor Ocampo','Metepec','Mexicaltzingo',
  'Morelos','Naucalpan de Juárez','Nextlalpan','Nezahualcóyotl','Nicolás Romero','Nopaltepec',
  'Ocoyoacac','Ocuilan','Otumba','Otzoloapan','Otzolotepec','Ozumba','Papalotla','Polotitlán',
  'Rayón','San Antonio la Isla','San Felipe del Progreso','San José del Rincón',
  'San Martín de las Pirámides','San Mateo Atenco','San Simón de Guerrero','Santo Tomás',
  'Soyaniquilpan de Juárez','Sultepec','Tecámac','Tejupilco','Temamatla','Temascalapa',
  'Temascalcingo','Temascaltepec','Temoaya','Tenancingo','Tenango del Aire','Tenango del Valle',
  'Teoloyucan','Teotihuacán','Tepetlaoxtoc','Tepetlixpa','Tepotzotlán','Tequixquiac',
  'Texcaltitlán','Texcalyacac','Texcoco','Tezoyuca','Tianguistenco','Timilpan','Tlalmanalco',
  'Tlalnepantla de Baz','Tlatlaya','Toluca','Tonanitla','Tonatico','Tultepec','Tultitlán',
  'Valle de Bravo','Valle de Chalco Solidaridad','Villa de Allende','Villa del Carbón',
  'Villa Guerrero','Villa Victoria','Xalatlaco','Xonacatlán','Zacazonapan','Zacualpan',
  'Zinacantepec','Zumpahuacán','Zumpango'
];

/* ── Bearing helpers ─────────────────────────────────────────────────────── */
const toDMS = d => {
  const deg=Math.floor(d), m=Math.floor((d-deg)*60), s=Math.round(((d-deg)*60-m)*60);
  return `${deg}°${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`;
};
const parseBearing = (cuad, ang) => {
  const a = parseFloat(ang);
  if (!ang || isNaN(a) || a < 0 || a > 90) return null;
  return { NE: a, SE: 180-a, SW: 180+a, NW: 360-a }[cuad] ?? a;
};
const calcBearing = (from, to) => {
  let b = Math.atan2(to.x-from.x, -(to.y-from.y)) * 180/Math.PI;
  return ((b%360)+360)%360;
};
const fmtB = b => {
  b=((b%360)+360)%360;
  if(b<=90)  return `N ${toDMS(b)} E`;
  if(b<=180) return `S ${toDMS(180-b)} E`;
  if(b<=270) return `S ${toDMS(b-180)} O`;
  return `N ${toDMS(360-b)} O`;
};
const shortB = b => {
  b=((b%360)+360)%360;
  if(b<=90)  return `N ${b.toFixed(1)}° E`;
  if(b<=180) return `S ${(180-b).toFixed(1)}° E`;
  if(b<=270) return `S ${(b-180).toFixed(1)}° O`;
  return `N ${(360-b).toFixed(1)}° O`;
};

/* ── Geometry: exact from bearings ──────────────────────────────────────── */
// In SVG: North=up=negative y → dx=dist·sin(b), dy=−dist·cos(b)
const stepPt = (p, dist, b_deg) => {
  const r = b_deg * Math.PI / 180;
  return { x: p.x + dist*Math.sin(r), y: p.y - dist*Math.cos(r) };
};

const computeFromBearings = (N, S, E, O, bN, bS, bE, bO) => {
  const TL = {x:0, y:0};
  const TR = stepPt(TL, N, bN);
  const BR = stepPt(TR, E, bE);
  const BL = stepPt(BR, S, bS);
  const check = stepPt(BL, O, bO);
  const closureErr = Math.hypot(check.x - TL.x, check.y - TL.y);
  return { TL, TR, BR, BL, valid: true, exact: true, closureErr };
};

/* ── Geometry: auto solver (sweep angles) ───────────────────────────────── */
const cross2D = (O,A,B) => (A.x-O.x)*(B.y-O.y)-(A.y-O.y)*(B.x-O.x);
const solveQuad = (N,S,E,O) => {
  N=Math.max(N,0.1);S=Math.max(S,0.1);E=Math.max(E,0.1);O=Math.max(O,0.1);
  const TL={x:0,y:0}, TR={x:N,y:0};
  let bestC=null,sC=-Infinity,bestA=null,sA=-Infinity;
  for(let deg=91;deg<=269;deg+=0.4){
    const rad=deg*Math.PI/180;
    const BR={x:TR.x+E*Math.cos(rad),y:TR.y+E*Math.sin(rad)};
    const d=Math.hypot(BR.x-TL.x,BR.y-TL.y);
    if(d<Math.abs(O-S)+1e-6||d>O+S-1e-6)continue;
    const lx=(d*d+O*O-S*S)/(2*d), ly2=O*O-lx*lx;
    if(ly2<0)continue;
    const ly=Math.sqrt(ly2),ux=(BR.x-TL.x)/d,uy=(BR.y-TL.y)/d;
    for(const sg of[1,-1]){
      const BL={x:TL.x+lx*ux-sg*ly*uy,y:TL.y+lx*uy+sg*ly*ux};
      if(BL.y<=0)continue;
      const c1=cross2D(TL,TR,BR),c2=cross2D(TR,BR,BL),c3=cross2D(BR,BL,TL),c4=cross2D(BL,TL,TR);
      const cvx=c1>0&&c2>0&&c3>0&&c4>0;
      const score=(BR.y+BL.y)/2-Math.abs((TL.x+TR.x+BR.x+BL.x)/4-N/2)*0.05;
      if(cvx&&score>sC){sC=score;bestC={TL,TR,BR:{...BR},BL:{...BL},valid:true,exact:false};}
      if(score>sA){sA=score;bestA={TL,TR,BR:{...BR},BL:{...BL},valid:false,exact:false};}
    }
  }
  if(bestC)return bestC;
  if(bestA)return{...bestA,valid:false};
  const h=(O+E)*0.4,dx=(N-S)/2;
  return{TL:{x:0,y:0},TR:{x:N,y:0},BR:{x:N-dx*0.3,y:h},BL:{x:dx*0.3,y:h},valid:false,exact:false};
};

/* ── Rosa de vientos ─────────────────────────────────────────────────────── */
const RosaVientos = ({size=80}) => {
  const c=size/2, r=size/2-2;
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
      {[45,135,225,315].map(deg=>{
        const rad=deg*Math.PI/180;
        const tx=c+Math.cos(rad)*(r-4),ty=c+Math.sin(rad)*(r-4);
        const b1x=c+Math.cos(rad-0.45)*r*0.35,b1y=c+Math.sin(rad-0.45)*r*0.35;
        const b2x=c+Math.cos(rad+0.45)*r*0.35,b2y=c+Math.sin(rad+0.45)*r*0.35;
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
const TerrenoCroquis = ({ norteM,surM,esteM,oesteM,norteCol,surCol,esteCol,oesteCol,
    usoSuelo,areaM2,svgW,svgH,rotation,onRotate,selected,onSelect,
    bN,bS,bE,bO, frontes }) => {

  const svgRef = useRef();
  const isDragging = useRef(false);
  const startAng = useRef(0), startRot = useRef(0);
  const cx_r = useRef(0), cy_r = useRef(0);

  /* Geometry */
  const PAD=80;
  const drawW=svgW-PAD*2, drawH=svgH-PAD*2-32;
  const useExact = bN!==null&&bS!==null&&bE!==null&&bO!==null;
  const geo = useExact
    ? computeFromBearings(norteM,surM,esteM,oesteM,bN,bS,bE,bO)
    : solveQuad(norteM,surM,esteM,oesteM);

  const {TL:tl,TR:tr,BL:bl,BR:br,valid,closureErr} = geo;
  const allX=[tl.x,tr.x,bl.x,br.x], allY=[tl.y,tr.y,bl.y,br.y];
  const minX=Math.min(...allX), maxX=Math.max(...allX);
  const minY=Math.min(...allY), maxY=Math.max(...allY);
  const rW=maxX-minX||1, rH=maxY-minY||1;
  const sc=Math.min(drawW/rW, drawH/rH);
  const oX=PAD+(drawW-rW*sc)/2-minX*sc, oY=PAD+(drawH-rH*sc)/2-minY*sc;
  const px=p=>({x:oX+p.x*sc,y:oY+p.y*sc});
  const TL=px(tl),TR=px(tr),BL=px(bl),BR=px(br);

  const cx=(TL.x+TR.x+BR.x+BL.x)/4, cy=(TL.y+TR.y+BR.y+BL.y)/4;
  cx_r.current=cx; cy_r.current=cy;

  /* Rotation helpers */
  const rotPt=(p,R)=>{
    const rad=R*Math.PI/180,dx=p.x-cx,dy=p.y-cy;
    return{x:cx+dx*Math.cos(rad)-dy*Math.sin(rad),y:cy+dx*Math.sin(rad)+dy*Math.cos(rad)};
  };
  const rTL=rotPt(TL,rotation),rTR=rotPt(TR,rotation);
  const rBL=rotPt(BL,rotation),rBR=rotPt(BR,rotation);
  const rPts=`${rTL.x},${rTL.y} ${rTR.x},${rTR.y} ${rBR.x},${rBR.y} ${rBL.x},${rBL.y}`;

  const midOf=(A,B)=>({x:(A.x+B.x)/2,y:(A.y+B.y)/2});
  const rMidN=rotPt(midOf(TL,TR),rotation);
  const rMidS=rotPt(midOf(BL,BR),rotation);
  const rMidE=rotPt(midOf(TR,BR),rotation);
  const rMidO=rotPt(midOf(TL,BL),rotation);

  const outDir=(p,dist)=>{const dx=p.x-cx,dy=p.y-cy,mg=Math.hypot(dx,dy)||1;return{x:p.x+dx/mg*dist,y:p.y+dy/mg*dist};};
  const lblN=outDir(rMidN,30),lblS=outDir(rMidS,30);
  const lblE=outDir(rMidE,28),lblO=outDir(rMidO,28);
  const inOf=(p,dist)=>{const dx=cx-p.x,dy=cy-p.y,mg=Math.hypot(dx,dy)||1;return{x:p.x+dx/mg*dist,y:p.y+dy/mg*dist};};
  const aLT=inOf(rTL,20),aRT=inOf(rTR,20),aRB=inOf(rBR,20),aLB=inOf(rBL,20);

  /* Interior angles */
  const intAng=(A,B,C)=>{
    const v1={x:A.x-B.x,y:A.y-B.y},v2={x:C.x-B.x,y:C.y-B.y};
    return Math.acos(Math.min(1,Math.max(-1,(v1.x*v2.x+v1.y*v2.y)/(Math.hypot(v1.x,v1.y)*Math.hypot(v2.x,v2.y)))))*180/Math.PI;
  };
  const aTL=intAng(BL,TL,TR),aTR=intAng(TL,TR,BR),aBR=intAng(TR,BR,BL),aBL=intAng(BR,BL,TL);

  /* Bearings from rotated coords */
  const bNd=calcBearing(rTL,rTR),bSd=calcBearing(rBR,rBL);
  const bEd=calcBearing(rTR,rBR),bOd=calcBearing(rBL,rTL);

  /* Arc path for angle indicator */
  const arcPath=(V,A,B,r=12)=>{
    const a1=Math.atan2(A.y-V.y,A.x-V.x),a2=Math.atan2(B.y-V.y,B.x-V.x);
    const x1=V.x+r*Math.cos(a1),y1=V.y+r*Math.sin(a1);
    const x2=V.x+r*Math.cos(a2),y2=V.y+r*Math.sin(a2);
    const c2=Math.cos(a1)*Math.sin(a2)-Math.sin(a1)*Math.cos(a2);
    return`M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0,${c2>0?1:0} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  };

  /* Rotation handle */
  const maxR=Math.max(Math.hypot(TL.x-cx,TL.y-cy),Math.hypot(TR.x-cx,TR.y-cy),
    Math.hypot(BL.x-cx,BL.y-cy),Math.hypot(BR.x-cx,BR.y-cy));
  const hRad=maxR+36;
  const hAng=(rotation-90)*Math.PI/180;
  const hX=cx+hRad*Math.cos(hAng), hY=cy+hRad*Math.sin(hAng);

  /* SVG coordinate converter */
  const toSVG=useCallback((cX,cY)=>{
    const svg=svgRef.current; if(!svg)return{x:0,y:0};
    const rect=svg.getBoundingClientRect(), vb=svg.viewBox.baseVal;
    return{x:(cX-rect.left)*(vb.width/rect.width), y:(cY-rect.top)*(vb.height/rect.height)};
  },[]);

  /* Window-level drag handlers — fixes the stuck-drag bug */
  useEffect(()=>{
    const onMove=e=>{
      if(!isDragging.current)return;
      const pt=toSVG(e.clientX,e.clientY);
      const ang=Math.atan2(pt.y-cy_r.current,pt.x-cx_r.current)*180/Math.PI;
      const delta=ang-startAng.current;
      onRotate(((startRot.current+delta)%360+360)%360);
    };
    const onUp=()=>{isDragging.current=false;};
    window.addEventListener('mousemove',onMove);
    window.addEventListener('mouseup',onUp);
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};
  },[toSVG,onRotate]);

  const onHandleDown=e=>{
    e.preventDefault();e.stopPropagation();
    isDragging.current=true;
    const pt=toSVG(e.clientX,e.clientY);
    startAng.current=Math.atan2(pt.y-cy_r.current,pt.x-cx_r.current)*180/Math.PI;
    startRot.current=rotation;
  };

  const trunc=(s,n)=>s&&s.length>n?s.slice(0,n)+'…':(s||'');
  const scaleBarM=Math.max(Math.round(Math.max(norteM,surM)/4/5)*5,5);
  const scaleBarPx=scaleBarM*sc;
  const scaleY=svgH-16;

  /* Frente colors */
  const sideColor=(key,def='#003a6e')=>frontes.has(key)?'#1a7a1a':def;
  const sideWidth=(key)=>frontes.has(key)?3.5:2.4;
  const sideDash=(key,isValid)=>frontes.has(key)?'none':(isValid?'none':'6,3');

  return (
    <svg ref={svgRef} width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
      style={{display:'block',width:'100%',height:'100%'}}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="gr" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M14 0L0 0 0 14" fill="none" stroke="#dde3ea" strokeWidth="0.4"/>
        </pattern>
        <pattern id="ht" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,74,143,0.07)" strokeWidth="5"/>
        </pattern>
        <clipPath id="tc6"><polygon points={rPts}/></clipPath>
        {/* Frente street pattern */}
        <pattern id="street" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#e8f5e9"/>
          <line x1="0" y1="5" x2="10" y2="5" stroke="#a5d6a7" strokeWidth="1"/>
        </pattern>
      </defs>

      <rect width={svgW} height={svgH} fill="url(#gr)"/>
      <polygon points={rPts} fill="rgba(200,225,245,0.55)"/>
      <rect width={svgW} height={svgH} fill="url(#ht)" clipPath="url(#tc6)"/>

      {/* Individual sides colored by frente status */}
      {[
        {k:'norte',A:rTL,B:rTR},
        {k:'sur',  A:rBR,B:rBL},
        {k:'este', A:rTR,B:rBR},
        {k:'oeste',A:rBL,B:rTL},
      ].map(({k,A,B})=>(
        <line key={k} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
          stroke={sideColor(k)} strokeWidth={sideWidth(k)}
          strokeDasharray={sideDash(k,valid)}/>
      ))}

      {/* Norte always in red too (on top) */}
      <line x1={rTL.x} y1={rTL.y} x2={rTR.x} y2={rTR.y}
        stroke={frontes.has('norte')?'#1a7a1a':'#c00'} strokeWidth="2.8"/>

      {/* Street indicator arrows for frontes */}
      {[
        {k:'norte',mid:rMidN,dir:outDir(rMidN,18)},
        {k:'sur',  mid:rMidS,dir:outDir(rMidS,18)},
        {k:'este', mid:rMidE,dir:outDir(rMidE,18)},
        {k:'oeste',mid:rMidO,dir:outDir(rMidO,18)},
      ].filter(({k})=>frontes.has(k)).map(({k,mid,dir})=>(
        <g key={k}>
          <line x1={mid.x} y1={mid.y} x2={dir.x} y2={dir.y} stroke="#1a7a1a" strokeWidth="1.5" markerEnd="url(#arrow)"/>
          <rect x={dir.x-16} y={dir.y-8} width={32} height={14} rx="3" fill="#1a7a1a" opacity="0.85"/>
          <text x={dir.x} y={dir.y+4} textAnchor="middle" fontSize="6.5" fill="white" fontFamily="Arial" fontWeight="bold">CALLE</text>
        </g>
      ))}
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#1a7a1a"/>
        </marker>
      </defs>

      {/* Vertices */}
      {[rTL,rTR,rBR,rBL].map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r="4.5" fill={valid?'#003a6e':'#e67e00'} stroke="white" strokeWidth="1.2"/>
      ))}

      {/* Angle arcs */}
      <path d={arcPath(rTL,rTR,rBL)} fill="none" stroke="#003a6e" strokeWidth="0.9"/>
      <path d={arcPath(rTR,rTL,rBR)} fill="none" stroke="#003a6e" strokeWidth="0.9"/>
      <path d={arcPath(rBR,rTR,rBL)} fill="none" stroke="#003a6e" strokeWidth="0.9"/>
      <path d={arcPath(rBL,rBR,rTL)} fill="none" stroke="#003a6e" strokeWidth="0.9"/>
      <text x={aLT.x} y={aLT.y+4} textAnchor="middle" fontSize="7.5" fill="#003a6e" fontFamily="Arial" fontWeight="bold">{aTL.toFixed(1)}°</text>
      <text x={aRT.x} y={aRT.y+4} textAnchor="middle" fontSize="7.5" fill="#003a6e" fontFamily="Arial" fontWeight="bold">{aTR.toFixed(1)}°</text>
      <text x={aRB.x} y={aRB.y+4} textAnchor="middle" fontSize="7.5" fill="#003a6e" fontFamily="Arial" fontWeight="bold">{aBR.toFixed(1)}°</text>
      <text x={aLB.x} y={aLB.y+4} textAnchor="middle" fontSize="7.5" fill="#003a6e" fontFamily="Arial" fontWeight="bold">{aBL.toFixed(1)}°</text>

      {/* Labels Norte */}
      <text x={lblN.x} y={lblN.y-14} textAnchor="middle" fontSize="11" fontWeight="bold" fill={frontes.has('norte')?'#1a7a1a':'#c00'} fontFamily="Arial">{norteM.toFixed(2)} m</text>
      <text x={lblN.x} y={lblN.y-2}  textAnchor="middle" fontSize="7.5" fill="#444" fontFamily="Arial">{trunc(norteCol,24)}</text>
      <text x={lblN.x} y={lblN.y+9}  textAnchor="middle" fontSize="7" fill="#777" fontFamily="Arial">{shortB(bNd)}</text>
      {/* Sur */}
      <text x={lblS.x} y={lblS.y+5}  textAnchor="middle" fontSize="11" fontWeight="bold" fill={frontes.has('sur')?'#1a7a1a':'#333'} fontFamily="Arial">{surM.toFixed(2)} m</text>
      <text x={lblS.x} y={lblS.y+16} textAnchor="middle" fontSize="7.5" fill="#444" fontFamily="Arial">{trunc(surCol,24)}</text>
      <text x={lblS.x} y={lblS.y+27} textAnchor="middle" fontSize="7" fill="#777" fontFamily="Arial">{shortB(bSd)}</text>
      {/* Este */}
      <text x={lblE.x} y={lblE.y-5}  fontSize="10" fontWeight="bold" fill={frontes.has('este')?'#1a7a1a':'#333'} fontFamily="Arial">{esteM.toFixed(2)} m</text>
      <text x={lblE.x} y={lblE.y+7}  fontSize="7" fill="#777" fontFamily="Arial">{shortB(bEd)}</text>
      {/* Oeste */}
      <text x={lblO.x} y={lblO.y-5}  textAnchor="end" fontSize="10" fontWeight="bold" fill={frontes.has('oeste')?'#1a7a1a':'#333'} fontFamily="Arial">{oesteM.toFixed(2)} m</text>
      <text x={lblO.x} y={lblO.y+7}  textAnchor="end" fontSize="7" fill="#777" fontFamily="Arial">{shortB(bOd)}</text>

      {/* Center */}
      <text x={cx} y={cy-16} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#003a6e" fontFamily="Arial">TERRENO</text>
      <text x={cx} y={cy+5}  textAnchor="middle" fontSize="18" fontWeight="bold" fill="#000" fontFamily="Arial">{areaM2.toFixed(2)} m²</text>
      <text x={cx} y={cy+21} textAnchor="middle" fontSize="9" fill="#555" fontFamily="Arial">{usoSuelo}</text>

      {/* Closure error notice */}
      {useExact && closureErr > 0.5 && (
        <g>
          <rect x={4} y={svgH-38} width={200} height={16} rx="3" fill="#fff8e1" stroke="#ffa000" strokeWidth="1"/>
          <text x={10} y={svgH-27} fontSize="7.5" fill="#7f5000" fontFamily="Arial">⚠ Error de cierre: {closureErr.toFixed(2)} m (normal en levantamientos)</text>
        </g>
      )}
      {!valid && !useExact && (
        <g>
          <rect x={svgW/2-135} y={6} width={270} height={20} rx="4" fill="#fff3cd" stroke="#e67e00" strokeWidth="1.2"/>
          <text x={svgW/2} y={20} textAnchor="middle" fontSize="9" fill="#a05000" fontFamily="Arial" fontWeight="bold">⚠ Medidas sin solución exacta — ingrese rumbos</text>
        </g>
      )}

      {/* Scale bar */}
      <rect x={PAD} y={scaleY-7} width={scaleBarPx} height={8} fill="none" stroke="#333" strokeWidth="1"/>
      <rect x={PAD} y={scaleY-7} width={scaleBarPx/2} height={8} fill="#333"/>
      <text x={PAD}              y={scaleY+10} fontSize="7.5" fill="#333" fontFamily="Arial">0</text>
      <text x={PAD+scaleBarPx/2} y={scaleY+10} textAnchor="middle" fontSize="7.5" fill="#333" fontFamily="Arial">{scaleBarM/2}m</text>
      <text x={PAD+scaleBarPx}   y={scaleY+10} textAnchor="middle" fontSize="7.5" fill="#333" fontFamily="Arial">{scaleBarM}m</text>

      {/* Rotation UI */}
      {selected && (
        <g>
          <circle cx={cx} cy={cy} r={hRad} fill="none" stroke="#0066cc" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.7"/>
          <line x1={cx} y1={cy} x2={cx} y2={cy-hRad+4} stroke="#0066cc" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.4"/>
          <circle cx={hX} cy={hY} r="14" fill="#0066cc" stroke="white" strokeWidth="2"
            style={{cursor:'grab'}} onMouseDown={onHandleDown}/>
          <text x={hX} y={hY+5} textAnchor="middle" fontSize="16" fill="white" style={{userSelect:'none',pointerEvents:'none'}}>↻</text>
          <rect x={cx-46} y={cy-36} width={92} height={18} rx="4" fill="#0066cc" opacity="0.9"/>
          <text x={cx} y={cy-23} textAnchor="middle" fontSize="8.5" fill="white" fontFamily="Arial" fontWeight="bold">
            {shortB(bNd)} · {rotation.toFixed(1)}°
          </text>
          <rect x={svgW/2-120} y={svgH-50} width={240} height={15} rx="3" fill="#0066cc" opacity="0.8"/>
          <text x={svgW/2} y={svgH-39} textAnchor="middle" fontSize="7.5" fill="white" fontFamily="Arial">
            Arrastre ↻ para girar · Doble clic para salir
          </text>
        </g>
      )}
      {!selected && (
        <text x={svgW/2} y={svgH-4} textAnchor="middle" fontSize="7" fill="#bbb" fontFamily="Arial"
          style={{cursor:'pointer'}} onDoubleClick={()=>onSelect(true)}>
          Doble clic en el terreno para activar rotación
        </text>
      )}
      {/* Invisible overlay for double-click on terrain */}
      <polygon points={rPts} fill="transparent" stroke="none"
        onDoubleClick={()=>onSelect(!selected)} style={{cursor:'pointer'}}/>
    </svg>
  );
};

/* ── App ─────────────────────────────────────────────────────────────────── */
const App = () => {
  const printRef = useRef();
  const [rotation, setRotation] = useState(0);
  const [selected, setSelected] = useState(false);
  const [frontes, setFrontes] = useState(new Set(['norte']));
  const [munQuery, setMunQuery] = useState('Tlalnepantla de Baz');
  const [munSug, setMunSug] = useState([]);
  const [showMun, setShowMun] = useState(false);
  const [imagenSrc, setImagenSrc] = useState(null);

  const [form, setForm] = useState({
    claveCatastral:'15-001-002-003-04', propietario:'JUAN PÉREZ LÓPEZ',
    calle:'CALLE DE LOS ARCOS', numero:'123', colonia:'COL. CENTRO',
    codigoPostal:'54000', municipio:'TLALNEPANTLA DE BAZ',
    estado:'ESTADO DE MÉXICO', usoSuelo:'HABITACIONAL', unidadMedida:'metros',
    /* Medidas */
    norteMedida:'21.00', norteColindancia:'CALLE PRIMERO DE MAYO',
    surMedida:'23.40',   surColindancia:'YESENIA ESPINOSA ARTEAGA',
    esteMedida:'37.00',  esteColindancia:'CALLE PRIVADA DE 4 METROS',
    oesteMedida:'24.00', oesteColindancia:'YESENIA ESPINOSA ARTEAGA',
    /* Rumbos opcionales: cuadrante + ángulo */
    norteCuad:'NE', norteAng:'57.51',
    surCuad:'NW',   surAng:'65.04',
    esteCuad:'SE',  esteAng:'24.04',
    oesteCuad:'NW', oesteAng:'23.13',
    fecha: new Date().toLocaleDateString('es-MX'),
  });

  const handleChange = e => setForm(f => ({...f, [e.target.name]: e.target.value}));

  const handleMunInput = e => {
    const val = e.target.value; setMunQuery(val);
    if(val.length>0){setMunSug(MUNICIPIOS.filter(m=>m.toLowerCase().includes(val.toLowerCase())).slice(0,8));setShowMun(true);}
    else setShowMun(false);
  };
  const selectMun = m => {setMunQuery(m);setForm(f=>({...f,municipio:m.toUpperCase()}));setShowMun(false);};

  const handleImagen = e => {
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader(); reader.onload=ev=>setImagenSrc(ev.target.result); reader.readAsDataURL(file);
  };

  const toM = val => {
    const v=parseFloat(val)||0;
    if(form.unidadMedida==='varas') return v*0.838;
    if(form.unidadMedida==='pies')  return v*0.3048;
    return v;
  };

  const norteM=toM(form.norteMedida), surM=toM(form.surMedida);
  const esteM=toM(form.esteMedida),   oesteM=toM(form.oesteMedida);
  const areaM2=((norteM+surM)/2)*((esteM+oesteM)/2);

  /* Parsed bearings */
  const bN=parseBearing(form.norteCuad, form.norteAng);
  const bS=parseBearing(form.surCuad,   form.surAng);
  const bE=parseBearing(form.esteCuad,  form.esteAng);
  const bO=parseBearing(form.oesteCuad, form.oesteAng);
  const useExact=bN!==null&&bS!==null&&bE!==null&&bO!==null;

  /* Bearings for table (after rotation) */
  const geo = useExact
    ? computeFromBearings(norteM,surM,esteM,oesteM,bN,bS,bE,bO)
    : solveQuad(norteM,surM,esteM,oesteM);
  const PAD=80, CW=540, CH=700;
  const drawW=CW-PAD*2, drawH=CH-PAD*2-32;
  const{TL:tl,TR:tr,BL:bl,BR:br}=geo;
  const allXt=[tl.x,tr.x,bl.x,br.x],allYt=[tl.y,tr.y,bl.y,br.y];
  const minXt=Math.min(...allXt),maxXt=Math.max(...allXt),minYt=Math.min(...allYt),maxYt=Math.max(...allYt);
  const sct=Math.min(drawW/(maxXt-minXt||1),drawH/(maxYt-minYt||1));
  const oXt=PAD+(drawW-(maxXt-minXt)*sct)/2-minXt*sct, oYt=PAD+(drawH-(maxYt-minYt)*sct)/2-minYt*sct;
  const px2=p=>({x:oXt+p.x*sct,y:oYt+p.y*sct});
  const TL2=px2(tl),TR2=px2(tr),BL2=px2(bl),BR2=px2(br);
  const cx2=(TL2.x+TR2.x+BR2.x+BL2.x)/4,cy2=(TL2.y+TR2.y+BR2.y+BL2.y)/4;
  const rotPt2=(p,R)=>{const rad=R*Math.PI/180,dx=p.x-cx2,dy=p.y-cy2;return{x:cx2+dx*Math.cos(rad)-dy*Math.sin(rad),y:cy2+dx*Math.sin(rad)+dy*Math.cos(rad)};};
  const rTL2=rotPt2(TL2,rotation),rTR2=rotPt2(TR2,rotation),rBL2=rotPt2(BL2,rotation),rBR2=rotPt2(BR2,rotation);
  const bNd=calcBearing(rTL2,rTR2),bSd=calcBearing(rBR2,rBL2),bEd=calcBearing(rTR2,rBR2),bOd=calcBearing(rBL2,rTL2);

  const handlePrint = async () => {
    setSelected(false);
    await new Promise(r=>setTimeout(r,100));
    const el=printRef.current; if(!el)return;
    try{
      const canvas=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false});
      const img=canvas.toDataURL('image/png');
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
      pdf.addImage(img,'PNG',0,0,pdf.internal.pageSize.getWidth(),pdf.internal.pageSize.getHeight());
      pdf.save('Plano_Catastral_'+form.claveCatastral+'.pdf');
    }catch(err){console.error(err);}
  };

  const toggleFrente = key => setFrontes(prev=>{const n=new Set(prev);n.has(key)?n.delete(key):n.add(key);return n;});

  const lbl={fontWeight:'bold',fontSize:'11px',marginBottom:'3px',display:'block',color:'#333'};
  const inp={padding:'7px 9px',border:'1px solid #bbb',borderRadius:'3px',fontSize:'13px',width:'100%',boxSizing:'border-box',fontFamily:'Arial'};
  const sec={color:'#004a8f',borderBottom:'2px solid #004a8f',paddingBottom:'4px',marginBottom:'12px',marginTop:'18px',fontSize:'13px',fontWeight:'bold'};
  const tdH={border:'1px solid #000',padding:'2px 3px',fontWeight:'bold',background:'#e8eef5',fontSize:'7px',whiteSpace:'nowrap'};
  const tdV={border:'1px solid #000',padding:'2px 3px',fontSize:'7px'};
  const thH={background:'#003a6e',color:'white',padding:'3px 4px',textAlign:'center',fontSize:'6.5px',fontWeight:'bold'};

  const SIDES = [
    {key:'norte',label:'⬆ NORTE',color:'#c00',med:'norteMedida',col:'norteColindancia',cuad:'norteCuad',ang:'norteAng'},
    {key:'sur',  label:'⬇ SUR',  color:'#444',med:'surMedida',  col:'surColindancia',  cuad:'surCuad',  ang:'surAng'},
    {key:'este', label:'➡ ESTE', color:'#444',med:'esteMedida', col:'esteColindancia', cuad:'esteCuad', ang:'esteAng'},
    {key:'oeste',label:'⬅ OESTE',color:'#444',med:'oesteMedida',col:'oesteColindancia',cuad:'oesteCuad',ang:'oesteAng'},
  ];

  return (
    <div style={{fontFamily:'Arial,sans-serif',background:'#e8edf3',minHeight:'100vh',padding:'16px'}}>

      {/* FORMULARIO */}
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
              <label style={lbl}>Municipio</label>
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
            <div><label style={lbl}>Estado</label>
              <select style={inp} name="estado" value={form.estado} onChange={handleChange}>
                {ESTADOS.map(e=><option key={e} value={e}>{e.charAt(0)+e.slice(1).toLowerCase()}</option>)}
              </select></div>
          </div>

          <h3 style={sec}>Medidas, Rumbos y Colindancias</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div><label style={lbl}>Unidad de Medida</label>
              <select style={inp} name="unidadMedida" value={form.unidadMedida} onChange={handleChange}>
                <option value="metros">Metros (m)</option>
                <option value="varas">Varas (0.838 m)</option>
                <option value="pies">Pies (0.3048 m)</option>
              </select></div>
            <div><label style={lbl}>Uso de Suelo</label>
              <select style={inp} name="usoSuelo" value={form.usoSuelo} onChange={handleChange}>
                {['HABITACIONAL','COMERCIAL','INDUSTRIAL','EQUIPAMIENTO','MIXTO','RÚSTICO','AGRÍCOLA'].map(u=>
                  <option key={u} value={u}>{u.charAt(0)+u.slice(1).toLowerCase()}</option>)}
              </select></div>
            <div><label style={lbl}>Fecha</label><input style={inp} name="fecha" value={form.fecha} onChange={handleChange}/></div>
          </div>

          {!useExact && (
            <div style={{background:'#e3f2fd',border:'1px solid #1976d2',borderRadius:'5px',padding:'8px 12px',marginBottom:'14px',fontSize:'11px',color:'#0d47a1'}}>
              💡 <strong>Tip:</strong> Si tienes el cuadro de construcción de un plano real, ingresa los <strong>rumbos</strong> en cada lado para obtener la figura exacta. Mientras no los ingreses, se calcula automáticamente.
            </div>
          )}
          {useExact && (
            <div style={{background:'#e8f5e9',border:'1px solid #388e3c',borderRadius:'5px',padding:'8px 12px',marginBottom:'14px',fontSize:'11px',color:'#1b5e20'}}>
              ✅ <strong>Rumbos activos</strong> — la figura usa geometría exacta basada en los rumbos ingresados.
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            {SIDES.map(({key,label,color,med,col,cuad,ang})=>(
              <div key={key} style={{border:`2px solid ${frontes.has(key)?'#2e7d32':'#d0dcea'}`,borderRadius:'6px',padding:'10px',background:frontes.has(key)?'#f1fff1':'#f6f9ff'}}>
                {/* Header */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <span style={{fontWeight:'bold',color,fontSize:'12px'}}>{label}</span>
                  <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
                    {frontes.has(key) && (
                      <span style={{background:'#2e7d32',color:'white',borderRadius:'10px',padding:'2px 7px',fontSize:'9px',fontWeight:'bold'}}>🛣️ FRENTE</span>
                    )}
                    <button onClick={()=>toggleFrente(key)} style={{
                      padding:'3px 9px',fontSize:'10px',fontWeight:'bold',border:'none',borderRadius:'4px',cursor:'pointer',
                      background:frontes.has(key)?'#c62828':'#2e7d32',color:'white',
                    }}>
                      {frontes.has(key)?'✕ Quitar Frente':'🛣️ Marcar Frente'}
                    </button>
                  </div>
                </div>
                {/* Medida y colindancia */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'8px',marginBottom:'8px'}}>
                  <div><label style={{...lbl,fontSize:'10px'}}>Medida ({form.unidadMedida})</label>
                    <input style={inp} name={med} value={form[med]} onChange={handleChange}/></div>
                  <div><label style={{...lbl,fontSize:'10px'}}>Colindancia</label>
                    <input style={inp} name={col} value={form[col]} onChange={handleChange}/></div>
                </div>
                {/* Rumbo opcional */}
                <details style={{marginTop:'4px'}}>
                  <summary style={{fontSize:'10px',cursor:'pointer',color:'#1565c0',fontWeight:'bold',listStyle:'none',display:'flex',alignItems:'center',gap:'4px'}}>
                    <span>📐</span>
                    <span>Rumbo del cuadro de construcción {form[ang]?`· ${parseBearing(form[cuad],form[ang])?.toFixed(2)}°`:''}</span>
                  </summary>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'8px',marginTop:'6px',padding:'8px',background:'#f0f6ff',borderRadius:'4px'}}>
                    <div>
                      <label style={{...lbl,fontSize:'9px'}}>Cuadrante</label>
                      <select style={{...inp,fontSize:'12px'}} name={cuad} value={form[cuad]} onChange={handleChange}>
                        <option value="NE">N...° E</option>
                        <option value="SE">S...° E</option>
                        <option value="SW">S...° O</option>
                        <option value="NW">N...° O</option>
                      </select>
                    </div>
                    <div>
                      <label style={{...lbl,fontSize:'9px'}}>Ángulo (0° – 90°)</label>
                      <input style={{...inp,fontSize:'12px'}} name={ang} value={form[ang]} onChange={handleChange} placeholder="ej: 57.51"/>
                    </div>
                  </div>
                  {form[ang] && parseBearing(form[cuad],form[ang]) !== null && (
                    <div style={{fontSize:'10px',color:'#1565c0',marginTop:'4px',paddingLeft:'4px'}}>
                      → Rumbo: {fmtB(parseBearing(form[cuad],form[ang]))} ({parseBearing(form[cuad],form[ang]).toFixed(4)}°)
                    </div>
                  )}
                </details>
              </div>
            ))}
          </div>

          {/* Orientación slider */}
          <div style={{marginTop:'14px',border:'2px solid #0066cc',borderRadius:'6px',padding:'12px 16px',background:'#f0f6ff'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px'}}>
              <div>
                <div style={{fontWeight:'bold',fontSize:'12px',color:'#004a8f'}}>🧭 Orientación en el plano (rotación visual)</div>
                <div style={{fontSize:'11px',color:'#555',marginTop:'2px'}}>También puedes hacer doble clic en el terreno del plano y arrastrarlo</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontWeight:'bold',color:'#003a6e',fontSize:'15px'}}>{shortB(bNd)}</span>
                <button onClick={()=>{setRotation(0);setSelected(false);}}
                  style={{padding:'5px 12px',background:'#6c757d',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>
                  Resetear 0°
                </button>
              </div>
            </div>
            <input type="range" min="0" max="359" step="0.5" value={rotation}
              onChange={e=>setRotation(parseFloat(e.target.value))}
              style={{width:'100%',marginTop:'10px',accentColor:'#004a8f'}}/>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:'#888',marginTop:'2px'}}>
              <span>N 0°</span><span>E 90°</span><span>S 180°</span><span>O 270°</span><span>N 360°</span>
            </div>
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

      {/* VISTA PREVIA */}
      <div style={{maxWidth:'950px',margin:'0 auto'}}>
        <div style={{background:'#004a8f',color:'white',padding:'8px 16px',borderRadius:'4px 4px 0 0',fontSize:'12px',fontWeight:'bold'}}>
          📄 VISTA PREVIA EN TIEMPO REAL — Doble clic en el terreno para girar
        </div>

        <div ref={printRef} style={{width:'816px',height:'1056px',background:'white',padding:'14px 14px 10px',boxSizing:'border-box',fontFamily:'Arial,sans-serif',fontSize:'9px',color:'#000',overflow:'hidden'}}>

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

          <div style={{border:'2px solid #000',padding:'3px',textAlign:'center',marginBottom:'5px',background:'#f0f4f8'}}>
            <span style={{fontWeight:'bold',fontSize:'9px'}}>CLAVE CATASTRAL: </span>
            <span style={{fontSize:'14px',fontWeight:'bold',letterSpacing:'3px',color:'#003a6e'}}>{form.claveCatastral}</span>
          </div>

          {/* Cuerpo 2 columnas */}
          <div style={{display:'grid',gridTemplateColumns:'215px 1fr',gap:'6px',height:'892px'}}>

            {/* Columna izquierda — solo tablas + foto */}
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
                  <tr><td style={tdH}>SUPERFICIE:</td><td style={{...tdV,fontWeight:'bold',color:'#003a6e',fontSize:'9px'}}>{areaM2.toFixed(2)} M²</td></tr>
                  <tr><td style={tdH}>FRENTE (N):</td><td style={tdV}>{norteM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>FONDO (S):</td><td style={tdV}>{surM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>LADO ESTE:</td><td style={tdV}>{esteM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>LADO OESTE:</td><td style={tdV}>{oesteM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>USO SUELO:</td><td style={tdV}>{form.usoSuelo}</td></tr>
                  <tr><td style={tdH}>FRENTE(S):</td>
                    <td style={{...tdV,color:'#1a7a1a',fontWeight:'bold'}}>
                      {frontes.size>0 ? Array.from(frontes).map(s=>s.toUpperCase()).join(', ') : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
              {/* Cuadro de construcción */}
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr><th colSpan="3" style={thH}>CUADRO DE CONSTRUCCIÓN</th></tr>
                  <tr>
                    <th style={{border:'1px solid #000',padding:'2px',background:'#d8e4f0',fontSize:'6px'}}>LADO</th>
                    <th style={{border:'1px solid #000',padding:'2px',background:'#d8e4f0',fontSize:'6px'}}>DIST.(m)</th>
                    <th style={{border:'1px solid #000',padding:'2px',background:'#d8e4f0',fontSize:'6px'}}>RUMBO</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {r:'NORTE',m:norteM,b:bNd,col:form.norteColindancia},
                    {r:'SUR',  m:surM,  b:bSd,col:form.surColindancia},
                    {r:'ESTE', m:esteM, b:bEd,col:form.esteColindancia},
                    {r:'OESTE',m:oesteM,b:bOd,col:form.oesteColindancia},
                  ].map(({r,m,b,col})=>(
                    <tr key={r}>
                      <td style={{...tdH,fontSize:'6.5px'}}>{r}</td>
                      <td style={{...tdV,textAlign:'center'}}>{m.toFixed(2)}</td>
                      <td style={{...tdV,fontSize:'6px',color:'#003a6e',fontWeight:'bold'}}>{fmtB(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Colindancias */}
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr><th colSpan="2" style={thH}>COLINDANCIAS</th></tr>
                </thead>
                <tbody>
                  {[
                    {r:'NORTE',c:form.norteColindancia},
                    {r:'SUR',  c:form.surColindancia},
                    {r:'ESTE', c:form.esteColindancia},
                    {r:'OESTE',c:form.oesteColindancia},
                  ].map(({r,c})=>(
                    <tr key={r}><td style={{...tdH,fontSize:'6.5px'}}>{r}:</td><td style={{...tdV,fontSize:'6.5px'}}>{c}</td></tr>
                  ))}
                </tbody>
              </table>

              {/* Foto — resto del espacio */}
              <div style={{flex:1,minHeight:'100px',border:'2px dashed #90a4ae',borderRadius:'4px',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f9fa'}}>
                {imagenSrc
                  ?<img src={imagenSrc} alt="terreno" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  :<div style={{textAlign:'center'}}><div style={{fontSize:'22px',color:'#ccc'}}>📷</div><div style={{fontSize:'7px',color:'#aaa',marginTop:'3px'}}>Foto / croquis del terreno</div></div>
                }
              </div>
            </div>

            {/* Columna derecha: croquis */}
            <div style={{border:'2px solid #000',background:'#fafcff',display:'flex',flexDirection:'column'}}>
              <div style={{textAlign:'center',fontWeight:'bold',fontSize:'7.5px',background:'#003a6e',color:'white',padding:'3px 4px',flexShrink:0}}>
                CROQUIS DEL PREDIO — REPRESENTACIÓN GRÁFICA PROPORCIONAL
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',padding:'6px 10px 0 0',flexShrink:0}}>
                <RosaVientos size={82}/>
              </div>
              <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 6px 6px'}}>
                <TerrenoCroquis
                  norteM={norteM} surM={surM} esteM={esteM} oesteM={oesteM}
                  norteCol={form.norteColindancia} surCol={form.surColindancia}
                  esteCol={form.esteColindancia}   oesteCol={form.oesteColindancia}
                  usoSuelo={form.usoSuelo} areaM2={areaM2}
                  svgW={CW} svgH={CH}
                  rotation={rotation} onRotate={setRotation}
                  selected={selected} onSelect={setSelected}
                  bN={bN} bS={bS} bE={bE} bO={bO}
                  frontes={frontes}
                />
              </div>
            </div>
          </div>

          {/* Pie */}
          <div style={{marginTop:'4px',borderTop:'2px solid #000',paddingTop:'3px',display:'flex',justifyContent:'space-between',fontSize:'6.5px',color:'#333'}}>
            <div>Generado el {form.fecha} | Sistema de Información Catastral | {form.municipio}, {form.estado}</div>
            <div style={{fontWeight:'bold'}}>CLAVE: {form.claveCatastral}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
