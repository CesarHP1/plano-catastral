import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ESTADOS =[
  'AGUASCALIENTES','BAJA CALIFORNIA','BAJA CALIFORNIA SUR','CAMPECHE','CHIAPAS','CHIHUAHUA',
  'CIUDAD DE MÉXICO','COAHUILA DE ZARAGOZA','COLIMA','DURANGO','ESTADO DE MÉXICO','GUANAJUATO',
  'GUERRERO','HIDALGO','JALISCO','MICHOACÁN DE OCAMPO','MORELOS','NAYARIT','NUEVO LEÓN',
  'OAXACA','PUEBLA','QUERÉTARO','QUINTANA ROO','SAN LUIS POTOSÍ','SINALOA','SONORA','TABASCO',
  'TAMAULIPAS','TLAXCALA','VERACRUZ DE IGNACIO DE LA LLAVE','YUCATÁN','ZACATECAS'
];
const MUNICIPIOS =[
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

/* ── Bearing helpers ────────────────────────────────────────────────────── */
const toDMS = d => {
  const deg=Math.floor(d), m=Math.floor((d-deg)*60), s=Math.round(((d-deg)*60-m)*60);
  return `${deg}°${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`;
};
const parseBearing = (cuad, ang) => {
  const a=parseFloat(ang);
  if(!ang||isNaN(a)||a<0||a>90) return null;
  return {NE:a, SE:180-a, SW:180+a, NW:360-a}[cuad] ?? a;
};
const calcBearing = (from, to) => {
  let b = Math.atan2(to.x-from.x, -(to.y-from.y))*180/Math.PI;
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

/* ── Geometry ───────────────────────────────────────────────────────────── */
const stepPt = (p,dist,b) => ({x:p.x+dist*Math.sin(b*Math.PI/180), y:p.y-dist*Math.cos(b*Math.PI/180)});
const computeFromBearings = (N,S,E,O,bN,bS,bE,bO) => {
  const TL={x:0,y:0}, TR=stepPt(TL,N,bN), BR=stepPt(TR,E,bE), BL=stepPt(BR,S,bS);
  const check=stepPt(BL,O,bO);
  return {TL,TR,BR,BL,valid:true,exact:true,closureErr:Math.hypot(check.x-TL.x,check.y-TL.y)};
};
const cross2D = (O,A,B) => (A.x-O.x)*(B.y-O.y)-(A.y-O.y)*(B.x-O.x);
const solveQuad = (N,S,E,O) => {
  N=Math.max(N,0.1);S=Math.max(S,0.1);E=Math.max(E,0.1);O=Math.max(O,0.1);
  const TL={x:0,y:0},TR={x:N,y:0};
  let bestC=null,sC=-Infinity,bestA=null,sA=-Infinity;
  for(let deg=91;deg<=269;deg+=0.4){
    const rad=deg*Math.PI/180, BR={x:TR.x+E*Math.cos(rad),y:TR.y+E*Math.sin(rad)};
    const d=Math.hypot(BR.x-TL.x,BR.y-TL.y);
    if(d<Math.abs(O-S)+1e-6||d>O+S-1e-6) continue;
    const lx=(d*d+O*O-S*S)/(2*d), ly2=O*O-lx*lx;
    if(ly2<0) continue;
    const ly=Math.sqrt(ly2), ux=(BR.x-TL.x)/d, uy=(BR.y-TL.y)/d;
    for(const sg of[1,-1]){
      const BL={x:TL.x+lx*ux-sg*ly*uy, y:TL.y+lx*uy+sg*ly*ux};
      if(BL.y<=0) continue;
      const c1=cross2D(TL,TR,BR),c2=cross2D(TR,BR,BL),c3=cross2D(BR,BL,TL),c4=cross2D(BL,TL,TR);
      const cvx=c1>0&&c2>0&&c3>0&&c4>0;
      const score=(BR.y+BL.y)/2-Math.abs((TL.x+TR.x+BR.x+BL.x)/4-N/2)*0.05;
      if(cvx&&score>sC){sC=score;bestC={TL,TR,BR:{...BR},BL:{...BL},valid:true,exact:false};}
      if(score>sA){sA=score;bestA={TL,TR,BR:{...BR},BL:{...BL},valid:false,exact:false};}
    }
  }
  if(bestC) return bestC;
  if(bestA) return{...bestA,valid:false};
  const h=(O+E)*0.4,dx=(N-S)/2;
  return{TL:{x:0,y:0},TR:{x:N,y:0},BR:{x:N-dx*0.3,y:h},BL:{x:dx*0.3,y:h},valid:false,exact:false};
};

/* ── Rosa de vientos ─────────────────────────────────────────────────────── */
const RosaVientos = ({size=72}) => {
  const c=size/2, r=size/2-2;
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <circle cx={c} cy={c} r={r} fill="white" stroke="#222" strokeWidth="1.5"/>
      <circle cx={c} cy={c} r={r*0.45} fill="none" stroke="#bbb" strokeWidth="0.7"/>
      <polygon points={`${c},${c-r+3} ${c+r*0.2},${c} ${c},${c-r*0.42}`} fill="#c00"/>
      <polygon points={`${c},${c-r+3} ${c-r*0.2},${c} ${c},${c-r*0.42}`} fill="#900"/>
      <polygon points={`${c},${c+r-3} ${c+r*0.2},${c} ${c},${c+r*0.42}`} fill="white" stroke="#555" strokeWidth="0.6"/>
      <polygon points={`${c},${c+r-3} ${c-r*0.2},${c} ${c},${c+r*0.42}`} fill="#ddd" stroke="#555" strokeWidth="0.6"/>
      <polygon points={`${c+r-3},${c} ${c},${c+r*0.2} ${c+r*0.42},${c}`} fill="white" stroke="#555" strokeWidth="0.6"/>
      <polygon points={`${c+r-3},${c} ${c},${c-r*0.2} ${c+r*0.42},${c}`} fill="#ddd" stroke="#555" strokeWidth="0.6"/>
      <polygon points={`${c-r+3},${c} ${c},${c+r*0.2} ${c-r*0.42},${c}`} fill="white" stroke="#555" strokeWidth="0.6"/>
      <polygon points={`${c-r+3},${c} ${c},${c-r*0.2} ${c-r*0.42},${c}`} fill="#ddd" stroke="#555" strokeWidth="0.6"/>
      {[45,135,225,315].map(d=>{
        const rad=d*Math.PI/180,tx=c+Math.cos(rad)*(r-4),ty=c+Math.sin(rad)*(r-4);
        const bx=c+Math.cos(rad-0.45)*r*0.35,by=c+Math.sin(rad-0.45)*r*0.35;
        const ex=c+Math.cos(rad+0.45)*r*0.35,ey=c+Math.sin(rad+0.45)*r*0.35;
        return<polygon key={d} points={`${tx},${ty} ${bx},${by} ${c},${c} ${ex},${ey}`} fill="#bbb" stroke="#999" strokeWidth="0.3"/>;
      })}
      <circle cx={c} cy={c} r={r*0.09} fill="#c00" stroke="#800" strokeWidth="0.8"/>
      <text x={c} y={c-r+12} textAnchor="middle" fontSize={r*0.28} fontWeight="bold" fill="#c00" fontFamily="Arial">N</text>
      <text x={c} y={c+r-3}  textAnchor="middle" fontSize={r*0.23} fill="#333" fontFamily="Arial">S</text>
      <text x={c+r-5} y={c+r*0.09} textAnchor="middle" fontSize={r*0.23} fill="#333" fontFamily="Arial">E</text>
      <text x={c-r+5} y={c+r*0.09} textAnchor="middle" fontSize={r*0.23} fill="#333" fontFamily="Arial">O</text>
    </svg>
  );
};

/* ── Croquis ─────────────────────────────────────────────────────────────── */
const TerrenoCroquis = ({norteM,surM,esteM,oesteM,norteCol,surCol,esteCol,oesteCol,
    usoSuelo,areaM2,svgW,svgH,rotation,onRotate,selected,onSelect,
    bN,bS,bE,bO,frontes}) => {

  const svgRef = useRef();
  const isDragging = useRef(false);
  const startAng = useRef(0), startRot = useRef(0);
  const cxR = useRef(0), cyR = useRef(0);

  /* ── Geometry ── */
  const PAD = 70;
  const drawW = svgW - PAD*2, drawH = svgH - PAD*2;
  const useExact = bN!==null&&bS!==null&&bE!==null&&bO!==null;
  const geo = useExact ? computeFromBearings(norteM,surM,esteM,oesteM,bN,bS,bE,bO) : solveQuad(norteM,surM,esteM,oesteM);
  const {TL:tl,TR:tr,BL:bl,BR:br,valid} = geo;
  const allX=[tl.x,tr.x,bl.x,br.x], allY=[tl.y,tr.y,bl.y,br.y];
  const minX=Math.min(...allX), maxX=Math.max(...allX), minY=Math.min(...allY), maxY=Math.max(...allY);
  const rW=maxX-minX||1, rH=maxY-minY||1;
  const sc = Math.min(drawW/rW, drawH/rH);
  const oX=PAD+(drawW-rW*sc)/2-minX*sc, oY=PAD+(drawH-rH*sc)/2-minY*sc;
  const px = p => ({x:oX+p.x*sc, y:oY+p.y*sc});
  const TL=px(tl), TR=px(tr), BL=px(bl), BR=px(br);
  const cx=(TL.x+TR.x+BR.x+BL.x)/4, cy=(TL.y+TR.y+BR.y+BL.y)/4;
  cxR.current=cx; cyR.current=cy;

  /* ── Rotation ── */
  const rotPt=(p,R)=>{const r=R*Math.PI/180,dx=p.x-cx,dy=p.y-cy;return{x:cx+dx*Math.cos(r)-dy*Math.sin(r),y:cy+dx*Math.sin(r)+dy*Math.cos(r)};};
  const rTL=rotPt(TL,rotation), rTR=rotPt(TR,rotation), rBL=rotPt(BL,rotation), rBR=rotPt(BR,rotation);
  const rPts=`${rTL.x},${rTL.y} ${rTR.x},${rTR.y} ${rBR.x},${rBR.y} ${rBL.x},${rBL.y}`;

  /* ── Mid points ── */
  const mid=(A,B)=>({x:(A.x+B.x)/2,y:(A.y+B.y)/2});
  const rMN=rotPt(mid(TL,TR),rotation), rMS=rotPt(mid(BL,BR),rotation);
  const rME=rotPt(mid(TR,BR),rotation), rMO=rotPt(mid(TL,BL),rotation);

  /* ── Bearings ── */
  const bNd=calcBearing(rTL,rTR), bSd=calcBearing(rBR,rBL);
  const bEd=calcBearing(rTR,rBR), bOd=calcBearing(rBL,rTL);

  /* ── Interior angles ── */
  const intA=(A,B,C)=>{const v1={x:A.x-B.x,y:A.y-B.y},v2={x:C.x-B.x,y:C.y-B.y};return Math.acos(Math.min(1,Math.max(-1,(v1.x*v2.x+v1.y*v2.y)/(Math.hypot(v1.x,v1.y)*Math.hypot(v2.x,v2.y)))))*180/Math.PI;};
  const aTL=intA(rBL,rTL,rTR), aTR=intA(rTL,rTR,rBR), aBR=intA(rTR,rBR,rBL), aBL=intA(rBR,rBL,rTL);

  /* ── Arc for angle ── */
  const arcPath=(V,A,B,r=11)=>{
    const a1=Math.atan2(A.y-V.y,A.x-V.x), a2=Math.atan2(B.y-V.y,B.x-V.x);
    const x1=V.x+r*Math.cos(a1),y1=V.y+r*Math.sin(a1),x2=V.x+r*Math.cos(a2),y2=V.y+r*Math.sin(a2);
    const c2=Math.cos(a1)*Math.sin(a2)-Math.sin(a1)*Math.cos(a2);
    return`M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0,${c2>0?1:0} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  };

  /* ── Perpendicular offset ── */
  const perpV=(A,B)=>{const dx=B.x-A.x,dy=B.y-A.y,mg=Math.hypot(dx,dy)||1;return{ux:dx/mg,uy:dy/mg,px:-dy/mg,py:dx/mg};};

  /* ── Outward direction from centroid ── */
  const outDir=(p,d)=>{const dx=p.x-cx,dy=p.y-cy,mg=Math.hypot(dx,dy)||1;return{x:p.x+dx/mg*d,y:p.y+dy/mg*d};};
  const inDir=(p,d)=>{const dx=cx-p.x,dy=cy-p.y,mg=Math.hypot(dx,dy)||1;return{x:p.x+dx/mg*d,y:p.y+dy/mg*d};};

  /* ── Dim line (AutoCAD style): arrows + measurement ── */
  const DimLine=({A,B,dist,offset,color='#003a6e'})=>{
    const {px:pvx,py:pvy,ux,uy}=perpV(A,B);
    // Determine which side is outward (away from centroid)
    const testX=A.x+pvx*10, testY=A.y+pvy*10;
    const sign=(testX-cx)*(A.x-cx)+(testY-cy)*(A.y-cy)>0?1:-1;
    const off=offset*sign;
    const Da={x:A.x+pvx*off,y:A.y+pvy*off}, Db={x:B.x+pvx*off,y:B.y+pvy*off};
    const mx=(Da.x+Db.x)/2, my=(Da.y+Db.y)/2;
    const ang=Math.atan2(Db.y-Da.y,Db.x-Da.x)*180/Math.PI;
    const tAng=Math.abs(ang)>90?ang+180:ang;
    // Tick marks at endpoints
    return(<g>
      <line x1={A.x+pvx*off*0.4} y1={A.y+pvy*off*0.4} x2={Da.x} y2={Da.y} stroke={color} strokeWidth="0.6"/>
      <line x1={B.x+pvx*off*0.4} y1={B.y+pvy*off*0.4} x2={Db.x} y2={Db.y} stroke={color} strokeWidth="0.6"/>
      <line x1={Da.x} y1={Da.y} x2={Db.x} y2={Db.y} stroke={color} strokeWidth="1.1"
        markerStart="url(#da)" markerEnd="url(#da)"/>
      <text x={mx} y={my} textAnchor="middle" fontSize="9" fontWeight="bold" fill={color} fontFamily="Arial"
        transform={`rotate(${tAng},${mx},${my})`} dy="-3.5">
        {dist.toFixed(2)} m
      </text>
    </g>);
  };

  /* ── Colindancia label ── */
  const ColLabel=({mid:m,col,bearing,offset,isFrente})=>{
    const lp=outDir(m,offset);
    const trunc=(s,n)=>s&&s.length>n?s.slice(0,n)+'…':(s||'');
    const color=isFrente?'#1a7a1a':'#444';
    return(<g>
      <text x={lp.x} y={lp.y}   textAnchor="middle" fontSize="7" fill={color} fontFamily="Arial" fontWeight={isFrente?"bold":"normal"}>
        {isFrente?'🛣 ':''}{trunc(col,24)}
      </text>
      <text x={lp.x} y={lp.y+10} textAnchor="middle" fontSize="6" fill="#0056b3" fontFamily="Arial" fontStyle="italic">
        {shortB(bearing)}
      </text>
    </g>);
  };

  /* ── Rotation handle — capped to stay inside SVG ── */
  const maxR=Math.max(Math.hypot(TL.x-cx,TL.y-cy),Math.hypot(TR.x-cx,TR.y-cy),Math.hypot(BL.x-cx,BL.y-cy),Math.hypot(BR.x-cx,BR.y-cy));
  const maxFit=Math.min(cx,cy,svgW-cx,svgH-cy)-10;
  const hRad=Math.min(maxR+38, maxFit);
  const hX=cx+hRad*Math.cos((rotation-90)*Math.PI/180);
  const hY=cy+hRad*Math.sin((rotation-90)*Math.PI/180);

  /* ── SVG coord helper ── */
  const toSVG=useCallback((cX,cY)=>{
    const svg=svgRef.current; if(!svg)return{x:0,y:0};
    const rect=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;
    return{x:(cX-rect.left)*(vb.width/rect.width),y:(cY-rect.top)*(vb.height/rect.height)};
  },[]);

  useEffect(()=>{
    const onMove=e=>{if(!isDragging.current)return;
      const pt=toSVG(e.clientX,e.clientY);
      const ang=Math.atan2(pt.y-cyR.current,pt.x-cxR.current)*180/Math.PI;
      onRotate(((startRot.current+(ang-startAng.current))%360+360)%360);
    };
    const onUp=()=>{isDragging.current=false;};
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};
  },[toSVG,onRotate]);

  const onHandleDown=e=>{
    e.preventDefault();e.stopPropagation();isDragging.current=true;
    const pt=toSVG(e.clientX,e.clientY);
    startAng.current=Math.atan2(pt.y-cyR.current,pt.x-cxR.current)*180/Math.PI;
    startRot.current=rotation;
  };

  /* Scale bar */
  const maxDim=Math.max(norteM,surM,esteM,oesteM);
  const rawBar=maxDim/4;
  const scaleBarM=Math.max(Math.pow(10,Math.floor(Math.log10(rawBar)))*Math.round(rawBar/Math.pow(10,Math.floor(Math.log10(rawBar)))),1);
  const scaleBarPx=scaleBarM*sc;

  const sC=k=>frontes.has(k)?'#1a7a1a':'#003a6e';
  const sW=k=>frontes.has(k)?3.2:2.2;
  const perim=(norteM+surM+esteM+oesteM).toFixed(2);

  return(
    <svg ref={svgRef} width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
      style={{display:'block',width:'100%',height:'100%'}} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="gr2" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M14 0L0 0 0 14" fill="none" stroke="#dde3ea" strokeWidth="0.4"/>
        </pattern>
        <pattern id="ht2" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,58,110,0.09)" strokeWidth="4.5"/>
        </pattern>
        <clipPath id="tc8"><polygon points={rPts}/></clipPath>
        <marker id="da" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <polygon points="0,0.5 6,3 0,5.5" fill="#003a6e"/>
        </marker>
        <marker id="daf" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <polygon points="0,0.5 6,3 0,5.5" fill="#1a7a1a"/>
        </marker>
      </defs>

      <rect width={svgW} height={svgH} fill="url(#gr2)"/>
      <polygon points={rPts} fill="rgba(205,228,248,0.52)"/>
      <rect width={svgW} height={svgH} fill="url(#ht2)" clipPath="url(#tc8)"/>

      {/* Side lines */}
      <line x1={rTL.x} y1={rTL.y} x2={rTR.x} y2={rTR.y} stroke={sC('norte')} strokeWidth={sW('norte')}/>
      <line x1={rBR.x} y1={rBR.y} x2={rBL.x} y2={rBL.y} stroke={sC('sur')}   strokeWidth={sW('sur')}/>
      <line x1={rTR.x} y1={rTR.y} x2={rBR.x} y2={rBR.y} stroke={sC('este')}  strokeWidth={sW('este')}/>
      <line x1={rBL.x} y1={rBL.y} x2={rTL.x} y2={rTL.y} stroke={sC('oeste')} strokeWidth={sW('oeste')}/>

      {/* Norte override — always special color */}
      <line x1={rTL.x} y1={rTL.y} x2={rTR.x} y2={rTR.y}
        stroke={frontes.has('norte')?'#1a7a1a':'#cc0000'} strokeWidth="3"/>

      {/* Frente band (dashed, offset outward) */}
      {[{k:'norte',A:rTL,B:rTR},{k:'sur',A:rBR,B:rBL},{k:'este',A:rTR,B:rBR},{k:'oeste',A:rBL,B:rTL}].filter(({k})=>frontes.has(k)).map(({k,A,B})=>{
        const {px:pvx,py:pvy}=perpV(A,B);
        const testX=A.x+pvx*10, testY=A.y+pvy*10;
        const sign=(testX-cx)*(A.x-cx)+(testY-cy)*(A.y-cy)>0?1:-1;
        const off=10*sign;
        return<line key={k} x1={A.x+pvx*off} y1={A.y+pvy*off} x2={B.x+pvx*off} y2={B.y+pvy*off}
          stroke="#1a7a1a" strokeWidth="2.5" strokeDasharray="7,4" opacity="0.75"/>;
      })}

      {/* Dimension lines */}
      <DimLine A={rTL} B={rTR} dist={norteM} offset={36} color={frontes.has('norte')?'#1a7a1a':'#cc0000'}/>
      <DimLine A={rBR} B={rBL} dist={surM}   offset={36} color={frontes.has('sur')?'#1a7a1a':'#003a6e'}/>
      <DimLine A={rTR} B={rBR} dist={esteM}  offset={36} color={frontes.has('este')?'#1a7a1a':'#003a6e'}/>
      <DimLine A={rBL} B={rTL} dist={oesteM} offset={36} color={frontes.has('oeste')?'#1a7a1a':'#003a6e'}/>

      {/* Colindancia labels — pushed further out, separated from dim lines */}
      <ColLabel mid={rMN} col={norteCol}  bearing={bNd} offset={62} isFrente={frontes.has('norte')}/>
      <ColLabel mid={rMS} col={surCol}    bearing={bSd} offset={62} isFrente={frontes.has('sur')}/>
      <ColLabel mid={rME} col={esteCol}   bearing={bEd} offset={62} isFrente={frontes.has('este')}/>
      <ColLabel mid={rMO} col={oesteCol}  bearing={bOd} offset={62} isFrente={frontes.has('oeste')}/>

      {/* Vertex circles + numbers */}
      {[{p:rTL,n:'1'},{p:rTR,n:'2'},{p:rBR,n:'3'},{p:rBL,n:'4'}].map(({p,n},i)=>{
        const lp=inDir(p,20);
        return(<g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill={valid?'#003a6e':'#e67e00'} stroke="white" strokeWidth="1.2"/>
          <circle cx={lp.x} cy={lp.y} r="9" fill="white" stroke="#003a6e" strokeWidth="0.9" opacity="0.92"/>
          <text x={lp.x} y={lp.y+3.5} textAnchor="middle" fontSize="8" fill="#003a6e" fontFamily="Arial" fontWeight="bold">{n}</text>
        </g>);
      })}

      {/* Angle arcs at vertices */}
      <path d={arcPath(rTL,rTR,rBL)} fill="none" stroke="#003a6e" strokeWidth="0.8"/>
      <path d={arcPath(rTR,rTL,rBR)} fill="none" stroke="#003a6e" strokeWidth="0.8"/>
      <path d={arcPath(rBR,rTR,rBL)} fill="none" stroke="#003a6e" strokeWidth="0.8"/>
      <path d={arcPath(rBL,rBR,rTL)} fill="none" stroke="#003a6e" strokeWidth="0.8"/>
      {[{a:aTL,p:inDir(rTL,28)},{a:aTR,p:inDir(rTR,28)},{a:aBR,p:inDir(rBR,28)},{a:aBL,p:inDir(rBL,28)}].map(({a,p},i)=>(
        <text key={i} x={p.x} y={p.y+3} textAnchor="middle" fontSize="7" fill="#003a6e" fontFamily="Arial" fontWeight="bold">{a.toFixed(1)}°</text>
      ))}

      {/* Center info */}
      <text x={cx} y={cy-17} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#003a6e" fontFamily="Arial">TERRENO</text>
      <text x={cx} y={cy+3}  textAnchor="middle" fontSize="16" fontWeight="bold" fill="#000"    fontFamily="Arial">{areaM2.toFixed(2)} m²</text>
      <text x={cx} y={cy+17} textAnchor="middle" fontSize="8"  fill="#555"                      fontFamily="Arial">{usoSuelo}</text>
      <line x1={cx-32} y1={cy+22} x2={cx+32} y2={cy+22} stroke="#003a6e" strokeWidth="0.6"/>
      <text x={cx} y={cy+31} textAnchor="middle" fontSize="7" fill="#888" fontFamily="Arial">P = {perim} m</text>

      {/* Scale bar — bottom right, shifted so the photo overlay on the left doesn't cover it */}
      <rect x={svgW - scaleBarPx - 15} y={svgH-18} width={scaleBarPx} height={7} fill="none" stroke="#444" strokeWidth="1"/>
      <rect x={svgW - scaleBarPx - 15} y={svgH-18} width={scaleBarPx/2} height={7} fill="#444"/>
      <text x={svgW - scaleBarPx - 15}              y={svgH-5} fontSize="7" fill="#333" fontFamily="Arial">0</text>
      <text x={svgW - scaleBarPx/2 - 15} y={svgH-5} textAnchor="middle" fontSize="7" fill="#333" fontFamily="Arial">{scaleBarM/2}m</text>
      <text x={svgW - 15}   y={svgH-5} textAnchor="end" fontSize="7" fill="#333" fontFamily="Arial">{scaleBarM}m</text>

      {/* Rotation UI */}
      {selected&&(
        <g>
          <circle cx={cx} cy={cy} r={hRad} fill="none" stroke="#0066cc" strokeWidth="1.3" strokeDasharray="5,3" opacity="0.65"/>
          <line x1={cx} y1={cy} x2={cx} y2={cy-hRad+4} stroke="#0066cc" strokeWidth="0.7" strokeDasharray="3,3" opacity="0.4"/>
          <circle cx={hX} cy={hY} r="13" fill="#0066cc" stroke="white" strokeWidth="2" style={{cursor:'grab'}} onMouseDown={onHandleDown}/>
          <text x={hX} y={hY+6} textAnchor="middle" fontSize="16" fill="white" style={{userSelect:'none',pointerEvents:'none'}}>↻</text>
          <rect x={cx-46} y={cy-35} width={92} height={18} rx="4" fill="#0066cc" opacity="0.9"/>
          <text x={cx} y={cy-22} textAnchor="middle" fontSize="8" fill="white" fontFamily="Arial" fontWeight="bold">
            {shortB(bNd)} · {rotation.toFixed(1)}°
          </text>
          <text x={svgW/2} y={svgH-22} textAnchor="middle" fontSize="7" fill="#0066cc" fontFamily="Arial">
            Arrastre ↻ para girar · Doble clic para salir
          </text>
        </g>
      )}
      <polygon points={rPts} fill="transparent" stroke="none"
        onDoubleClick={()=>onSelect(!selected)} style={{cursor:'pointer'}}/>
    </svg>
  );
};

/* ── App ─────────────────────────────────────────────────────────────────── */
const App = () => {
  const printRef = useRef();
  const[rotation, setRotation] = useState(0);
  const [selected, setSelected] = useState(false);
  const [frontes, setFrontes] = useState(new Set(['norte']));
  const[munQuery, setMunQuery] = useState('Tlalnepantla de Baz');
  const[munSug, setMunSug] = useState([]);
  const [showMun, setShowMun] = useState(false);
  const[imagenSrc, setImagenSrc] = useState(null);
  const [form, setForm] = useState({
    claveCatastral:'15-001-002-003-04', propietario:'JUAN PÉREZ LÓPEZ',
    calle:'CALLE DE LOS ARCOS', numero:'123', colonia:'COL. CENTRO',
    codigoPostal:'54000', municipio:'TLALNEPANTLA DE BAZ',
    estado:'ESTADO DE MÉXICO', usoSuelo:'HABITACIONAL', unidadMedida:'metros',
    norteMedida:'21.00', norteColindancia:'CALLE PRIMERO DE MAYO',
    surMedida:'23.40',   surColindancia:'YESENIA ESPINOSA ARTEAGA',
    esteMedida:'37.00',  esteColindancia:'CALLE PRIVADA DE 4 METROS',
    oesteMedida:'24.00', oesteColindancia:'YESENIA ESPINOSA ARTEAGA',
    norteCuad:'NE', norteAng:'57.51',
    surCuad:'NW',   surAng:'65.04',
    esteCuad:'SE',  esteAng:'24.04',
    oesteCuad:'NW', oesteAng:'23.13',
    fecha: new Date().toLocaleDateString('es-MX'),
  });

  // --- SISTEMA DE DATOS EN VIVO (Clima, Economía, Enfermedades y Noticias) ---
  const[liveData, setLiveData] = useState({
    weather: null,
    economy: null,
    disease: null,
    news:[],
    currentNewsIndex: 0
  });

  useEffect(() => {
    const fallbackNews =[
      {title: "Mercados globales muestran volatilidad en el día de hoy"},
      {title: "Avances tecnológicos benefician al sector salud e inmobiliario"},
      {title: "Siguen las fluctuaciones en el tipo de cambio internacional"}
    ];

    const fetchLiveData = async () => {
      try {
        // Clima (Open-Meteo CDMX)
        const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=19.4326&longitude=-99.1332&current_weather=true');
        const weatherData = await weatherRes.json();
        
        // Economía (ExchangeRate-API: USD a MXN)
        const econRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const econData = await econRes.json();

        // Enfermedades (Disease.sh: Casos COVID México)
        const disRes = await fetch('https://disease.sh/v3/covid-19/countries/Mexico');
        const disData = await disRes.json();

        // Noticias (RSS Mundo a JSON)
        const newsRes = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/mundo/rss.xml');
        const newsData = await newsRes.json();

        setLiveData(prev => ({
          ...prev,
          weather: weatherData.current_weather,
          economy: econData.rates.MXN,
          disease: disData,
          news: newsData.items && newsData.items.length > 0 ? newsData.items : fallbackNews
        }));
      } catch (err) {
        console.error("No se pudieron cargar todos los datos vivos, usando respaldos.", err);
        setLiveData(prev => ({
          ...prev,
          weather: prev.weather || { temperature: 24.5 },
          economy: prev.economy || 16.50,
          disease: prev.disease || { cases: 7500000, todayCases: 0 },
          news: prev.news.length ? prev.news : fallbackNews
        }));
      }
    };

    fetchLiveData();
    // Re-fetch datos completos cada 10 minutos (600,000 ms)
    const dataInterval = setInterval(fetchLiveData, 600000);
    return () => clearInterval(dataInterval);
  },[]);

  // Intervalo automático para rotar titulares de noticias cada 6 segundos
  useEffect(() => {
    if (liveData.news.length > 0) {
      const newsTicker = setInterval(() => {
        setLiveData(prev => ({
          ...prev,
          currentNewsIndex: (prev.currentNewsIndex + 1) % prev.news.length
        }));
      }, 6000);
      return () => clearInterval(newsTicker);
    }
  },[liveData.news.length]);
  // --------------------------------------------------------------------------

  const hC = e => setForm(f=>({...f,[e.target.name]:e.target.value}));
  const hMI = e => {
    const v=e.target.value; setMunQuery(v);
    if(v.length>0){setMunSug(MUNICIPIOS.filter(m=>m.toLowerCase().includes(v.toLowerCase())).slice(0,8));setShowMun(true);}
    else setShowMun(false);
  };
  const selMun = m => {setMunQuery(m);setForm(f=>({...f,municipio:m.toUpperCase()}));setShowMun(false);};
  const hImg = e => {const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setImagenSrc(ev.target.result);r.readAsDataURL(f);};
  const toM = v => {const n=parseFloat(v)||0;if(form.unidadMedida==='varas')return n*0.838;if(form.unidadMedida==='pies')return n*0.3048;return n;};

  const nM=toM(form.norteMedida), sM=toM(form.surMedida), eM=toM(form.esteMedida), oM=toM(form.oesteMedida);
  const area=((nM+sM)/2)*((eM+oM)/2);
  const bN=parseBearing(form.norteCuad,form.norteAng), bS=parseBearing(form.surCuad,form.surAng);
  const bE=parseBearing(form.esteCuad,form.esteAng),   bO=parseBearing(form.oesteCuad,form.oesteAng);
  const useExact=bN!==null&&bS!==null&&bE!==null&&bO!==null;

  /* Compute rotated bearings for table */
  const CW=788, CH=660; // Ancho ampliado para la gráfica de 1 columna
  const geo=useExact?computeFromBearings(nM,sM,eM,oM,bN,bS,bE,bO):solveQuad(nM,sM,eM,oM);
  const PAD2=70, DW=CW-PAD2*2, DH=CH-PAD2*2;
  const{TL:t2,TR:r2,BL:bl2,BR:br2}=geo;
  const axT=[t2.x,r2.x,bl2.x,br2.x],ayT=[t2.y,r2.y,bl2.y,br2.y];
  const mxT=Math.min(...axT),MxT=Math.max(...axT),myT=Math.min(...ayT),MyT=Math.max(...ayT);
  const sct=Math.min(DW/(MxT-mxT||1),DH/(MyT-myT||1));
  const oXT=PAD2+(DW-(MxT-mxT)*sct)/2-mxT*sct, oYT=PAD2+(DH-(MyT-myT)*sct)/2-myT*sct;
  const px3=p=>({x:oXT+p.x*sct,y:oYT+p.y*sct});
  const TL3=px3(t2),TR3=px3(r2),BL3=px3(bl2),BR3=px3(br2);
  const cx3=(TL3.x+TR3.x+BR3.x+BL3.x)/4,cy3=(TL3.y+TR3.y+BR3.y+BL3.y)/4;
  const rP2=(p,R)=>{const rad=R*Math.PI/180,dx=p.x-cx3,dy=p.y-cy3;return{x:cx3+dx*Math.cos(rad)-dy*Math.sin(rad),y:cy3+dx*Math.sin(rad)+dy*Math.cos(rad)};};
  const rTL3=rP2(TL3,rotation),rTR3=rP2(TR3,rotation),rBL3=rP2(BL3,rotation),rBR3=rP2(BR3,rotation);
  const bNd=calcBearing(rTL3,rTR3),bSd=calcBearing(rBR3,rBL3),bEd=calcBearing(rTR3,rBR3),bOd=calcBearing(rBL3,rTL3);

  const hPrint = async () => {
    setSelected(false); await new Promise(r=>setTimeout(r,100));
    const el=printRef.current; if(!el)return;
    try{
      const c=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false});
      const img=c.toDataURL('image/png');
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
      pdf.addImage(img,'PNG',0,0,pdf.internal.pageSize.getWidth(),pdf.internal.pageSize.getHeight());
      pdf.save('Plano_Catastral_'+form.claveCatastral+'.pdf');
    }catch(e){console.error(e);}
  };

  const toggleFrente = k => setFrontes(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n;});

  const lbl={fontWeight:'bold',fontSize:'11px',marginBottom:'3px',display:'block',color:'#333'};
  const inp={padding:'7px 9px',border:'1px solid #bbb',borderRadius:'3px',fontSize:'13px',width:'100%',boxSizing:'border-box',fontFamily:'Arial'};
  const sec={color:'#004a8f',borderBottom:'2px solid #004a8f',paddingBottom:'4px',marginBottom:'12px',marginTop:'18px',fontSize:'13px',fontWeight:'bold'};
  const tdH={border:'1px solid #000',padding:'2px 3px',fontWeight:'bold',background:'#e8eef5',fontSize:'7px',whiteSpace:'nowrap'};
  const tdV={border:'1px solid #000',padding:'2px 3px',fontSize:'7px'};
  const thH={background:'#003a6e',color:'white',padding:'3px 4px',textAlign:'center',fontSize:'6.5px',fontWeight:'bold'};
  const SIDES=[
    {key:'norte',label:'⬆ NORTE',color:'#c00',med:'norteMedida',col:'norteColindancia',cuad:'norteCuad',ang:'norteAng'},
    {key:'sur',  label:'⬇ SUR',  color:'#444',med:'surMedida',  col:'surColindancia',  cuad:'surCuad',  ang:'surAng'},
    {key:'este', label:'➡ ESTE', color:'#444',med:'esteMedida', col:'esteColindancia', cuad:'esteCuad', ang:'esteAng'},
    {key:'oeste',label:'⬅ OESTE',color:'#444',med:'oesteMedida',col:'oesteColindancia',cuad:'oesteCuad',ang:'oesteAng'},
  ];

  return(
    <div style={{fontFamily:'Arial,sans-serif',background:'#e8edf3',minHeight:'100vh',padding:'16px'}}>

      {/* ══ WIDGETS EXTERNOS EN VIVO ══ */}
      <div style={{maxWidth:'950px', margin:'0 auto 20px', display:'flex', gap:'10px', overflowX:'auto', background:'white', padding:'10px', borderRadius:'6px', boxShadow:'0 2px 10px rgba(0,0,0,0.13)'}}>
        {/* Clima */}
        <div style={{minWidth:'140px', padding:'5px 15px', borderRight:'1px solid #eee'}}>
          <div style={{fontSize:'11px', color:'#888', fontWeight:'bold'}}>🌦️ CLIMA</div>
          <div style={{fontSize:'16px', fontWeight:'bold', color:'#004a8f'}}>
            {liveData.weather ? `${liveData.weather.temperature}°C` : 'Cargando...'}
          </div>
        </div>
        {/* Economía */}
        <div style={{minWidth:'140px', padding:'5px 15px', borderRight:'1px solid #eee'}}>
          <div style={{fontSize:'11px', color:'#888', fontWeight:'bold'}}>💵 TIPO DE CAMBIO</div>
          <div style={{fontSize:'16px', fontWeight:'bold', color:'#2e7d32'}}>
            {liveData.economy ? `$${liveData.economy.toFixed(2)} MXN` : 'Cargando...'}
          </div>
        </div>
        {/* Enfermedades (Covid MX) */}
        <div style={{minWidth:'140px', padding:'5px 15px', borderRight:'1px solid #eee'}}>
          <div style={{fontSize:'11px', color:'#888', fontWeight:'bold'}}>🦠 COVID MX</div>
          <div style={{fontSize:'16px', fontWeight:'bold', color:'#c62828'}}>
            {liveData.disease ? `${(liveData.disease.cases / 1000000).toFixed(1)}M Casos` : 'Cargando...'}
          </div>
        </div>
        {/* Noticias Ticker */}
        <div style={{flex:1, padding:'5px 15px', display:'flex', flexDirection:'column', justifyContent:'center', minWidth:'250px'}}>
          <div style={{fontSize:'11px', color:'#888', fontWeight:'bold'}}>📰 ÚLTIMA HORA (Actualización automática)</div>
          <div style={{fontSize:'14px', fontWeight:'bold', color:'#333', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
            {liveData.news.length > 0 ? liveData.news[liveData.currentNewsIndex].title : 'Cargando noticias...'}
          </div>
        </div>
      </div>

      {/* ══ FORMULARIO ══ */}
      <div style={{maxWidth:'950px',margin:'0 auto 20px',background:'white',borderRadius:'6px',overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.13)'}}>
        <div style={{background:'#004a8f',color:'white',padding:'14px 20px'}}>
          <h1 style={{margin:0,fontSize:'17px'}}>📋 Generador de Plano Catastral — Estado de México</h1>
          <p style={{margin:'3px 0 0',fontSize:'11px',opacity:0.8}}>Vista previa en tiempo real abajo</p>
        </div>
        <div style={{padding:'20px'}}>
          <h3 style={sec}>Identificación</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={lbl}>Clave Catastral</label><input style={inp} name="claveCatastral" value={form.claveCatastral} onChange={hC}/></div>
            <div><label style={lbl}>Propietario</label><input style={inp} name="propietario" value={form.propietario} onChange={hC}/></div>
          </div>
          <h3 style={sec}>Ubicación</h3>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px',marginBottom:'12px'}}>
            <div><label style={lbl}>Calle / Avenida</label><input style={inp} name="calle" value={form.calle} onChange={hC}/></div>
            <div><label style={lbl}>Número</label><input style={inp} name="numero" value={form.numero} onChange={hC}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px',marginBottom:'12px'}}>
            <div><label style={lbl}>Colonia</label><input style={inp} name="colonia" value={form.colonia} onChange={hC}/></div>
            <div><label style={lbl}>C.P.</label><input style={inp} name="codigoPostal" value={form.codigoPostal} onChange={hC}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div style={{position:'relative'}}>
              <label style={lbl}>Municipio</label>
              <input style={inp} value={munQuery} onChange={hMI}
                onFocus={()=>munQuery&&setShowMun(true)} onBlur={()=>setTimeout(()=>setShowMun(false),160)}
                placeholder="Escriba para buscar..." autoComplete="off"/>
              {showMun&&munSug.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:'1px solid #bbb',zIndex:300,maxHeight:'200px',overflowY:'auto',boxShadow:'0 4px 16px rgba(0,0,0,0.18)',borderRadius:'0 0 4px 4px'}}>
                  {munSug.map((m,i)=>(
                    <div key={i} onMouseDown={()=>selMun(m)}
                      style={{padding:'8px 12px',cursor:'pointer',fontSize:'13px',borderBottom:'1px solid #f0f0f0'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#e8f0fe'}
                      onMouseLeave={e=>e.currentTarget.style.background='white'}>{m}</div>
                  ))}
                </div>
              )}
            </div>
            <div><label style={lbl}>Estado</label>
              <select style={inp} name="estado" value={form.estado} onChange={hC}>
                {ESTADOS.map(e=><option key={e} value={e}>{e.charAt(0)+e.slice(1).toLowerCase()}</option>)}
              </select></div>
          </div>
          <h3 style={sec}>Medidas y Colindancias</h3>
          {useExact?<div style={{background:'#e8f5e9',border:'1px solid #388e3c',borderRadius:'5px',padding:'7px 12px',marginBottom:'12px',fontSize:'11px',color:'#1b5e20'}}>✅ Rumbos activos — geometría exacta.</div>
          :<div style={{background:'#e3f2fd',border:'1px solid #1976d2',borderRadius:'5px',padding:'7px 12px',marginBottom:'12px',fontSize:'11px',color:'#0d47a1'}}>💡 Ingrese rumbos para geometría exacta de su plano real.</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div><label style={lbl}>Unidad</label>
              <select style={inp} name="unidadMedida" value={form.unidadMedida} onChange={hC}>
                <option value="metros">Metros (m)</option>
                <option value="varas">Varas</option>
                <option value="pies">Pies</option>
              </select></div>
            <div><label style={lbl}>Uso de Suelo</label>
              <select style={inp} name="usoSuelo" value={form.usoSuelo} onChange={hC}>
                {['HABITACIONAL','COMERCIAL','INDUSTRIAL','EQUIPAMIENTO','MIXTO','RÚSTICO','AGRÍCOLA'].map(u=>
                  <option key={u} value={u}>{u.charAt(0)+u.slice(1).toLowerCase()}</option>)}
              </select></div>
            <div><label style={lbl}>Fecha</label><input style={inp} name="fecha" value={form.fecha} onChange={hC}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            {SIDES.map(({key,label,color,med,col,cuad,ang})=>(
              <div key={key} style={{border:`2px solid ${frontes.has(key)?'#2e7d32':'#d0dcea'}`,borderRadius:'6px',padding:'10px',background:frontes.has(key)?'#f1fff1':'#f6f9ff'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <span style={{fontWeight:'bold',color,fontSize:'12px'}}>{label}</span>
                  <button onClick={()=>toggleFrente(key)} style={{padding:'3px 10px',fontSize:'10px',fontWeight:'bold',border:'none',borderRadius:'4px',cursor:'pointer',background:frontes.has(key)?'#c62828':'#2e7d32',color:'white'}}>
                    {frontes.has(key)?'✕ Quitar Frente':'🛣️ Marcar Frente'}
                  </button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'8px',marginBottom:'8px'}}>
                  <div><label style={{...lbl,fontSize:'10px'}}>Medida ({form.unidadMedida})</label><input style={inp} name={med} value={form[med]} onChange={hC}/></div>
                  <div><label style={{...lbl,fontSize:'10px'}}>Colindancia</label><input style={inp} name={col} value={form[col]} onChange={hC}/></div>
                </div>
                <details>
                  <summary style={{fontSize:'10px',cursor:'pointer',color:'#1565c0',fontWeight:'bold',listStyle:'none'}}>
                    📐 Rumbo {form[ang]?`· ${fmtB(parseBearing(form[cuad],form[ang])??0)}`:'(opcional)'}
                  </summary>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'8px',marginTop:'6px',padding:'8px',background:'#f0f6ff',borderRadius:'4px'}}>
                    <div><label style={{...lbl,fontSize:'9px'}}>Cuadrante</label>
                      <select style={{...inp,fontSize:'12px'}} name={cuad} value={form[cuad]} onChange={hC}>
                        <option value="NE">N...° E</option><option value="SE">S...° E</option>
                        <option value="SW">S...° O</option><option value="NW">N...° O</option>
                      </select></div>
                    <div><label style={{...lbl,fontSize:'9px'}}>Ángulo (0°–90°)</label>
                      <input style={{...inp,fontSize:'12px'}} name={ang} value={form[ang]} onChange={hC} placeholder="ej: 57.51"/></div>
                  </div>
                </details>
              </div>
            ))}
          </div>
          {/* Orientación */}
          <div style={{marginTop:'14px',border:'2px solid #0066cc',borderRadius:'6px',padding:'12px 16px',background:'#f0f6ff'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px'}}>
              <div><div style={{fontWeight:'bold',fontSize:'12px',color:'#004a8f'}}>🧭 Orientación visual</div>
                <div style={{fontSize:'11px',color:'#555'}}>Doble clic en el terreno para girar con el mouse</div></div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontWeight:'bold',color:'#003a6e',fontSize:'15px'}}>{shortB(bNd)}</span>
                <button onClick={()=>{setRotation(0);setSelected(false);}} style={{padding:'5px 12px',background:'#6c757d',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>0°</button>
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
            <input type="file" accept="image/*" onChange={hImg} style={{fontSize:'12px'}}/>
            {imagenSrc&&<img src={imagenSrc} alt="terreno" style={{marginTop:'8px',maxHeight:'80px',borderRadius:'4px',border:'1px solid #ccc'}}/>}
          </div>
          <div style={{marginTop:'16px',background:'#e8f5e9',border:'2px solid #4caf50',borderRadius:'6px',padding:'12px 18px',display:'flex',alignItems:'center',gap:'14px'}}>
            <span style={{fontSize:'28px'}}>📐</span>
            <div>
              <div style={{fontSize:'12px',color:'#555'}}>Superficie calculada</div>
              <div style={{fontSize:'26px',fontWeight:'bold',color:'#1b5e20'}}>{area.toFixed(2)} m²</div>
            </div>
          </div>
          <button onClick={hPrint} style={{marginTop:'18px',width:'100%',padding:'14px',background:'#004a8f',color:'white',border:'none',cursor:'pointer',fontWeight:'bold',fontSize:'15px',borderRadius:'5px',letterSpacing:'1px'}}>
            ⬇ GENERAR PLANO CATASTRAL EN PDF (Carta)
          </button>
        </div>
      </div>

      {/* ══ VISTA PREVIA ══ */}
      <div style={{maxWidth:'950px',margin:'0 auto'}}>
        <div style={{background:'#004a8f',color:'white',padding:'8px 16px',borderRadius:'4px 4px 0 0',fontSize:'12px',fontWeight:'bold'}}>
          📄 VISTA PREVIA EN TIEMPO REAL — Doble clic en el terreno para girar
        </div>

        {/* ─── PLANO IMPRIMIBLE 816×1056 ─── */}
        <div ref={printRef} style={{width:'816px',height:'1056px',background:'white',padding:'12px',boxSizing:'border-box',fontFamily:'Arial,sans-serif',fontSize:'9px',color:'#000',overflow:'hidden',display:'flex',flexDirection:'column',gap:'4px'}}>

          {/* 1. ENCABEZADO */}
          <div style={{border:'3px solid #000',padding:'5px 10px',flexShrink:0,position:'relative'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'11px',fontWeight:'bold'}}>GOBIERNO DEL ESTADO DE MÉXICO</div>
              <div style={{fontSize:'8.5px',fontWeight:'bold'}}>SECRETARÍA DE FINANZAS — DIRECCIÓN GENERAL DE CATASTRO E INFORMACIÓN TERRITORIAL</div>
              <div style={{fontSize:'12px',fontWeight:'bold',borderTop:'1px solid #000',marginTop:'3px',paddingTop:'3px'}}>CÉDULA DE DETERMINACIÓN CATASTRAL</div>
              <div style={{fontSize:'7.5px',color:'#444'}}>PLANO DE LOCALIZACIÓN, MEDIDAS Y COLINDANCIAS</div>
            </div>
            <div style={{position:'absolute',top:'8px',right:'10px',display:'flex',gap:'5px'}}>
              <div style={{border:'1px solid #000',padding:'2px 6px',fontSize:'7px',textAlign:'right'}}>
                <div style={{fontWeight:'bold'}}>FOLIO:</div><div style={{fontSize:'8px',fontWeight:'bold'}}>{form.claveCatastral}</div>
              </div>
              <div style={{border:'1px solid #000',padding:'2px 6px',fontSize:'7px',textAlign:'right'}}>
                <div style={{fontWeight:'bold'}}>FECHA:</div><div>{form.fecha}</div>
              </div>
            </div>
          </div>

          {/* 2. CLAVE */}
          <div style={{border:'2px solid #000',padding:'2px 8px',textAlign:'center',background:'#f0f4f8',flexShrink:0}}>
            <span style={{fontWeight:'bold',fontSize:'8.5px'}}>CLAVE CATASTRAL: </span>
            <span style={{fontSize:'13px',fontWeight:'bold',letterSpacing:'3px',color:'#003a6e'}}>{form.claveCatastral}</span>
          </div>

          {/* 3. TABLAS DE DATOS — full width, compact horizontal */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'4px',flexShrink:0}}>
            {/* Col A */}
            <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
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
            </div>
            {/* Col B */}
            <div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th colSpan="2" style={thH}>DATOS DEL PREDIO</th></tr></thead>
                <tbody>
                  <tr><td style={tdH}>SUPERFICIE:</td><td style={{...tdV,fontWeight:'bold',color:'#003a6e',fontSize:'9px'}}>{area.toFixed(2)} M²</td></tr>
                  <tr><td style={tdH}>PERÍMETRO:</td><td style={tdV}>{(nM+sM+eM+oM).toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>FRENTE (N):</td><td style={tdV}>{nM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>FONDO (S):</td><td style={tdV}>{sM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>LADO ESTE:</td><td style={tdV}>{eM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>LADO OESTE:</td><td style={tdV}>{oM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>USO SUELO:</td><td style={tdV}>{form.usoSuelo}</td></tr>
                  <tr><td style={tdH}>FRENTE(S):</td><td style={{...tdV,color:'#1a7a1a',fontWeight:'bold'}}>{frontes.size>0?Array.from(frontes).map(s=>s.toUpperCase()).join(', '):'—'}</td></tr>
                </tbody>
              </table>
            </div>
            {/* Col C */}
            <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr><th colSpan="3" style={thH}>CUADRO DE CONSTRUCCIÓN</th></tr>
                  <tr>
                    <th style={{border:'1px solid #000',padding:'2px',background:'#d8e4f0',fontSize:'6px'}}>LADO</th>
                    <th style={{border:'1px solid #000',padding:'2px',background:'#d8e4f0',fontSize:'6px'}}>DIST.</th>
                    <th style={{border:'1px solid #000',padding:'2px',background:'#d8e4f0',fontSize:'6px'}}>RUMBO</th>
                  </tr>
                </thead>
                <tbody>
                  {[{r:'N',m:nM,b:bNd},{r:'S',m:sM,b:bSd},{r:'E',m:eM,b:bEd},{r:'O',m:oM,b:bOd}].map(({r,m,b})=>(
                    <tr key={r}><td style={{...tdH,fontSize:'6.5px'}}>{r}</td>
                      <td style={{...tdV,textAlign:'center'}}>{m.toFixed(2)}</td>
                      <td style={{...tdV,fontSize:'6px',color:'#003a6e',fontWeight:'bold'}}>{fmtB(b)}</td></tr>
                  ))}
                </tbody>
              </table>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th colSpan="2" style={thH}>COLINDANCIAS</th></tr></thead>
                <tbody>
                  {[{r:'N',c:form.norteColindancia},{r:'S',c:form.surColindancia},{r:'E',c:form.esteColindancia},{r:'O',c:form.oesteColindancia}].map(({r,c})=>(
                    <tr key={r}><td style={{...tdH,fontSize:'6.5px',width:'18px'}}>{r}:</td><td style={{...tdV,fontSize:'6.5px'}}>{c}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. ZONA INFERIOR: croquis full width con elementos superpuestos */}
          <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0,border:'2px solid #000',background:'#fafcff',position:'relative'}}>
            <div style={{textAlign:'center',fontWeight:'bold',fontSize:'7px',background:'#003a6e',color:'white',padding:'2px 4px',flexShrink:0,zIndex:2}}>
              CROQUIS DEL PREDIO — REPRESENTACIÓN GRÁFICA PROPORCIONAL
            </div>
            
            <div style={{flex:1,minHeight:0,position:'relative',display:'flex',alignItems:'stretch',justifyContent:'stretch'}}>
              
              {/* === WIDGET INTERNO EN VIVO === */}
              <div style={{position:'absolute', top:'15px', left:'15px', width:'200px', background:'rgba(255,255,255,0.85)', padding:'8px 10px', borderRadius:'4px', zIndex:10, fontSize:'8px', backdropFilter:'blur(2px)', boxShadow:'0 2px 6px rgba(0,0,0,0.2)', pointerEvents:'none', border:'1px solid rgba(0,0,0,0.1)'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px', borderBottom:'1px solid rgba(0,0,0,0.1)', paddingBottom:'4px'}}>
                  <span style={{color:'#004a8f', fontWeight:'bold'}}>🌦️ {liveData.weather ? `${liveData.weather.temperature}°C` : '...'}</span>
                  <span style={{color:'#2e7d32', fontWeight:'bold'}}>💵 {liveData.economy ? `$${liveData.economy.toFixed(2)}` : '...'}</span>
                  <span style={{color:'#c62828', fontWeight:'bold'}}>🦠 {liveData.disease ? `${(liveData.disease.cases / 1000000).toFixed(1)}M` : '...'}</span>
                </div>
                <div style={{fontWeight:'bold', color:'#000', marginBottom:'2px'}}>📰 REPORTE DIARIO EN VIVO:</div>
                <div style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%', color:'#444', fontStyle:'italic'}}>
                  {liveData.news.length > 0 ? liveData.news[liveData.currentNewsIndex].title : 'Cargando...'}
                </div>
              </div>

              <TerrenoCroquis
                norteM={nM} surM={sM} esteM={eM} oesteM={oM}
                norteCol={form.norteColindancia} surCol={form.surColindancia}
                esteCol={form.esteColindancia}   oesteCol={form.oesteColindancia}
                usoSuelo={form.usoSuelo} areaM2={area}
                svgW={CW} svgH={CH}
                rotation={rotation} onRotate={setRotation}
                selected={selected} onSelect={setSelected}
                bN={bN} bS={bS} bE={bE} bO={bO}
                frontes={frontes}
              />
              
              {/* Overlay Rosa de Vientos (esquina superior derecha de la gráfica) */}
              <div style={{position:'absolute', top:'15px', right:'15px', pointerEvents:'none', zIndex:10}}>
                <RosaVientos size={72}/>
              </div>

              {/* Overlay Foto del Terreno (esquina inferior izquierda de la gráfica) */}
              <div style={{position:'absolute', bottom:'15px', left:'15px', width:'130px', height:'130px', border:'2px dashed #90a4ae', borderRadius:'4px', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(248, 249, 250, 0.85)', backdropFilter:'blur(2px)', zIndex:10, boxShadow:'0 2px 6px rgba(0,0,0,0.15)'}}>
                {imagenSrc
                  ?<img src={imagenSrc} alt="terreno" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  :<div style={{textAlign:'center'}}><div style={{fontSize:'26px',color:'#ccc'}}>📷</div><div style={{fontSize:'7px',color:'#aaa',marginTop:'3px'}}>Foto del terreno</div></div>
                }
              </div>
            </div>
          </div>

        </div>{/* fin printRef */}
      </div>
    </div>
  );
};

export default App;
