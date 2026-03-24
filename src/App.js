import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ESTADOS = [
  'AGUASCALIENTES','BAJA CALIFORNIA','BAJA CALIFORNIA SUR','CAMPECHE','CHIAPAS','CHIHUAHUA',
  'CIUDAD DE MÉXICO','COAHUILA DE ZARAGOZA','COLIMA','DURANGO','ESTADO DE MÉXICO','GUANAJUATO',
  'GUERRERO','HIDALGO','JALISCO','MICHOACÁN DE OCAMPO','MORELOS','NAYARIT','NUEVO León',
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

/* ── Bearing helpers ────────────────────────────────────────────────────── */
const toDMS = d => {
  const deg=Math.floor(d),m=Math.floor((d-deg)*60),s=Math.round(((d-deg)*60-m)*60);
  return `${deg}°${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`;
};
const parseBearing = (cuad, ang) => {
  const a=parseFloat(ang);
  if(!ang||isNaN(a)||a<0||a>90)return null;
  return{NE:a,SE:180-a,SW:180+a,NW:360-a}[cuad]??a;
};
const calcBearing = (from,to) => {
  let b=Math.atan2(to.x-from.x,-(to.y-from.y))*180/Math.PI;
  return((b%360)+360)%360;
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
const stepPt=(p,dist,b)=>({x:p.x+dist*Math.sin(b*Math.PI/180),y:p.y-dist*Math.cos(b*Math.PI/180)});
const computeFromBearings=(N,S,E,O,bN,bS,bE,bO)=>{
  const TL={x:0,y:0},TR=stepPt(TL,N,bN),BR=stepPt(TR,E,bE),BL=stepPt(BR,S,bS);
  const check=stepPt(BL,O,bO);
  return{TL,TR,BR,BL,valid:true,exact:true,closureErr:Math.hypot(check.x-TL.x,check.y-TL.y)};
};
const cross2D=(O,A,B)=>(A.x-O.x)*(B.y-O.y)-(A.y-O.y)*(B.x-O.x);
const solveQuad=(N,S,E,O)=>{
  N=Math.max(N,0.1);S=Math.max(S,0.1);E=Math.max(E,0.1);O=Math.max(O,0.1);
  const TL={x:0,y:0},TR={x:N,y:0};
  let bestC=null,sC=-Infinity,bestA=null,sA=-Infinity;
  for(let deg=91;deg<=269;deg+=0.4){
    const rad=deg*Math.PI/180,BR={x:TR.x+E*Math.cos(rad),y:TR.y+E*Math.sin(rad)};
    const d=Math.hypot(BR.x-TL.x,BR.y-TL.y);
    if(d<Math.abs(O-S)+1e-6||d>O+S-1e-6)continue;
    const lx=(d*d+O*O-S*S)/(2*d),ly2=O*O-lx*lx;
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

/* ── Rosa de vientos ────────────────────────────────────────────────────── */
const RosaVientos=({size=80})=>{
  const c=size/2,r=size/2-2;
  return(
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
        const rad=deg*Math.PI/180,tx=c+Math.cos(rad)*(r-4),ty=c+Math.sin(rad)*(r-4);
        const b1x=c+Math.cos(rad-0.45)*r*0.35,b1y=c+Math.sin(rad-0.45)*r*0.35;
        const b2x=c+Math.cos(rad+0.45)*r*0.35,b2y=c+Math.sin(rad+0.45)*r*0.35;
        return<polygon key={deg} points={`${tx},${ty} ${b1x},${b1y} ${c},${c} ${b2x},${b2y}`} fill="#bbb" stroke="#999" strokeWidth="0.3"/>;
      })}
      <circle cx={c} cy={c} r={r*0.09} fill="#c00" stroke="#800" strokeWidth="0.8"/>
      <text x={c} y={c-r+13} textAnchor="middle" fontSize={r*0.28} fontWeight="bold" fill="#c00" fontFamily="Arial">N</text>
      <text x={c} y={c+r-3}  textAnchor="middle" fontSize={r*0.23} fill="#333" fontFamily="Arial">S</text>
      <text x={c+r-5} y={c+r*0.08} textAnchor="middle" fontSize={r*0.23} fill="#333" fontFamily="Arial">E</text>
      <text x={c-r+5} y={c+r*0.08} textAnchor="middle" fontSize={r*0.23} fill="#333" fontFamily="Arial">O</text>
    </svg>
  );
};

/* ── Croquis ────────────────────────────────────────────────────────────── */
const TerrenoCroquis=({norteM,surM,esteM,oesteM,norteCol,surCol,esteCol,oesteCol,
    usoSuelo,areaM2,svgW,svgH,rotation,onRotate,selected,onSelect,
    bN,bS,bE,bO,frontes})=>{

  const svgRef=useRef();
  const isDragging=useRef(false);
  const startAng=useRef(0),startRot=useRef(0);
  const cxRef=useRef(0),cyRef=useRef(0);

  const PAD=88;
  const drawW=svgW-PAD*2, drawH=svgH-PAD*2-28;
  const useExact=bN!==null&&bS!==null&&bE!==null&&bO!==null;
  const geo=useExact?computeFromBearings(norteM,surM,esteM,oesteM,bN,bS,bE,bO):solveQuad(norteM,surM,esteM,oesteM);
  const{TL:tl,TR:tr,BL:bl,BR:br,valid}=geo;
  const allX=[tl.x,tr.x,bl.x,br.x],allY=[tl.y,tr.y,bl.y,br.y];
  const minX=Math.min(...allX),maxX=Math.max(...allX),minY=Math.min(...allY),maxY=Math.max(...allY);
  const rW=maxX-minX||1,rH=maxY-minY||1;
  const sc=Math.min(drawW/rW,drawH/rH);
  const oX=PAD+(drawW-rW*sc)/2-minX*sc, oY=PAD+(drawH-rH*sc)/2-minY*sc;
  const px=p=>({x:oX+p.x*sc,y:oY+p.y*sc});
  const TL=px(tl),TR=px(tr),BL=px(bl),BR=px(br);
  const cx=(TL.x+TR.x+BR.x+BL.x)/4,cy=(TL.y+TR.y+BR.y+BL.y)/4;
  cxRef.current=cx;cyRef.current=cy;

  const rotPt=(p,R)=>{const rad=R*Math.PI/180,dx=p.x-cx,dy=p.y-cy;return{x:cx+dx*Math.cos(rad)-dy*Math.sin(rad),y:cy+dx*Math.sin(rad)+dy*Math.cos(rad)};};
  const rTL=rotPt(TL,rotation),rTR=rotPt(TR,rotation),rBL=rotPt(BL,rotation),rBR=rotPt(BR,rotation);
  const rPts=`${rTL.x},${rTL.y} ${rTR.x},${rTR.y} ${rBR.x},${rBR.y} ${rBL.x},${rBL.y}`;

  const mid=(A,B)=>({x:(A.x+B.x)/2,y:(A.y+B.y)/2});
  const rMidN=rotPt(mid(TL,TR),rotation),rMidS=rotPt(mid(BL,BR),rotation);
  const rMidE=rotPt(mid(TR,BR),rotation),rMidO=rotPt(mid(TL,BL),rotation);

  // Label positions: push further out
  const outDir=(p,dist)=>{const dx=p.x-cx,dy=p.y-cy,mg=Math.hypot(dx,dy)||1;return{x:p.x+dx/mg*dist,y:p.y+dy/mg*dist};};
  const inOf=(p,dist)=>{const dx=cx-p.x,dy=cy-p.y,mg=Math.hypot(dx,dy)||1;return{x:p.x+dx/mg*dist,y:p.y+dy/mg*dist};};

  // Tick offset from line for dimension extension lines
  const perpOff=(A,B,len)=>{const dx=B.x-A.x,dy=B.y-A.y,mg=Math.hypot(dx,dy)||1;return{x:-dy/mg*len,y:dx/mg*len};};

  const bNd=calcBearing(rTL,rTR),bSd=calcBearing(rBR,rBL);
  const bEd=calcBearing(rTR,rBR),bOd=calcBearing(rBL,rTL);

  // Interior angles
  const intAng=(A,B,C)=>{const v1={x:A.x-B.x,y:A.y-B.y},v2={x:C.x-B.x,y:C.y-B.y};
    return Math.acos(Math.min(1,Math.max(-1,(v1.x*v2.x+v1.y*v2.y)/(Math.hypot(v1.x,v1.y)*Math.hypot(v2.x,v2.y)))))*180/Math.PI;};
  const aTL=intAng(rBL,rTL,rTR),aTR=intAng(rTL,rTR,rBR);
  const aBR=intAng(rTR,rBR,rBL),aBL=intAng(rBR,rBL,rTL);
  const perim=(norteM+surM+esteM+oesteM).toFixed(2);

  // Angle arc path
  const arcPath=(V,A,B,r=13)=>{
    const a1=Math.atan2(A.y-V.y,A.x-V.x),a2=Math.atan2(B.y-V.y,B.x-V.x);
    const x1=V.x+r*Math.cos(a1),y1=V.y+r*Math.sin(a1);
    const x2=V.x+r*Math.cos(a2),y2=V.y+r*Math.sin(a2);
    const c2=Math.cos(a1)*Math.sin(a2)-Math.sin(a1)*Math.cos(a2);
    return`M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0,${c2>0?1:0} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  };

  // Dimension line with arrows: draw extension lines + arrow-capped dim line offset from side
  const dimLine=(A,B,distM,isFrente,offset=28)=>{
    const pOff=perpOff(A,B,offset);
    const Da={x:A.x+pOff.x,y:A.y+pOff.y},Db={x:B.x+pOff.x,y:B.y+pOff.y};
    const mx=(Da.x+Db.x)/2,my=(Da.y+Db.y)/2;
    const color=isFrente?'#1a7a1a':'#003a6e';
    // Direction of dim line for text angle
    const angle=Math.atan2(Db.y-Da.y,Db.x-Da.x)*180/Math.PI;
    const textAngle=Math.abs(angle)>90?angle+180:angle;
    return(
      <g key={`dim-${distM}`}>
        {/* Extension lines */}
        <line x1={A.x+pOff.x*0.3} y1={A.y+pOff.y*0.3} x2={Da.x+pOff.x*0.15} y2={Da.y+pOff.y*0.15} stroke={color} strokeWidth="0.6" strokeDasharray="none"/>
        <line x1={B.x+pOff.x*0.3} y1={B.y+pOff.y*0.3} x2={Db.x+pOff.x*0.15} y2={Db.y+pOff.y*0.15} stroke={color} strokeWidth="0.6"/>
        {/* Dim line */}
        <line x1={Da.x} y1={Da.y} x2={Db.x} y2={Db.y} stroke={color} strokeWidth="1" markerStart="url(#dimArrowR)" markerEnd="url(#dimArrowR)"/>
        {/* Measurement label */}
        <text x={mx} y={my} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill={color} fontFamily="Arial"
          transform={`rotate(${textAngle},${mx},${my})`}
          dy="-3">{distM.toFixed(2)} m</text>
      </g>
    );
  };

  // Rotation handle
  const maxR=Math.max(Math.hypot(TL.x-cx,TL.y-cy),Math.hypot(TR.x-cx,TR.y-cy),Math.hypot(BL.x-cx,BL.y-cy),Math.hypot(BR.x-cx,BR.y-cy));
  const hRad=maxR+40;
  const hX=cx+hRad*Math.cos((rotation-90)*Math.PI/180);
  const hY=cy+hRad*Math.sin((rotation-90)*Math.PI/180);

  const toSVG=useCallback((cX,cY)=>{
    const svg=svgRef.current;if(!svg)return{x:0,y:0};
    const rect=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;
    return{x:(cX-rect.left)*(vb.width/rect.width),y:(cY-rect.top)*(vb.height/rect.height)};
  },[]);

  useEffect(()=>{
    const onMove=e=>{if(!isDragging.current)return;
      const pt=toSVG(e.clientX,e.clientY);
      const ang=Math.atan2(pt.y-cyRef.current,pt.x-cxRef.current)*180/Math.PI;
      onRotate(((startRot.current+(ang-startAng.current))%360+360)%360);
    };
    const onUp=()=>{isDragging.current=false;};
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};
  },[toSVG,onRotate]);

  const onHandleDown=e=>{
    e.preventDefault();e.stopPropagation();isDragging.current=true;
    const pt=toSVG(e.clientX,e.clientY);
    startAng.current=Math.atan2(pt.y-cyRef.current,pt.x-cxRef.current)*180/Math.PI;
    startRot.current=rotation;
  };

  const sideColor=k=>frontes.has(k)?'#1a7a1a':'#003a6e';
  const sideW=k=>frontes.has(k)?3.2:2.2;
  const scaleBarM=Math.max(Math.round(Math.max(norteM,surM)/4/5)*5,5);
  const scaleBarPx=scaleBarM*sc;
  const scaleY=svgH-14;

  // Colindancia labels: placed close to mid of each side, stacked neatly
  const colLbl=(mid,col,bearing,offset,anchor='middle')=>{
    const ld=outDir(mid,offset);
    const trunc=(s,n)=>s&&s.length>n?s.slice(0,n)+'…':(s||'');
    return(<g>
      <text x={ld.x} y={ld.y-1} textAnchor={anchor} fontSize="7" fill="#555" fontFamily="Arial">{trunc(col,22)}</text>
      <text x={ld.x} y={ld.y+9} textAnchor={anchor} fontSize="6.5" fill="#888" fontFamily="Arial" fontStyle="italic">{shortB(bearing)}</text>
    </g>);
  };

  return(
    <svg ref={svgRef} width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
      style={{display:'block',width:'100%',height:'100%'}} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="gr" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M14 0L0 0 0 14" fill="none" stroke="#dde3ea" strokeWidth="0.4"/>
        </pattern>
        <pattern id="ht" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,74,143,0.09)" strokeWidth="4.5"/>
        </pattern>
        <clipPath id="tc7"><polygon points={rPts}/></clipPath>
        <marker id="dimArrowR" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
          <polygon points="0,0 5,2.5 0,5" fill="#003a6e"/>
        </marker>
      </defs>

      <rect width={svgW} height={svgH} fill="url(#gr)"/>
      <polygon points={rPts} fill="rgba(210,230,248,0.5)"/>
      <rect width={svgW} height={svgH} fill="url(#ht)" clipPath="url(#tc7)"/>

      {/* Individual side lines */}
      {[{k:'norte',A:rTL,B:rTR},{k:'sur',A:rBR,B:rBL},{k:'este',A:rTR,B:rBR},{k:'oeste',A:rBL,B:rTL}].map(({k,A,B})=>(
        <line key={k} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={sideColor(k)} strokeWidth={sideW(k)}/>
      ))}

      {/* Norte special red/green */}
      <line x1={rTL.x} y1={rTL.y} x2={rTR.x} y2={rTR.y}
        stroke={frontes.has('norte')?'#1a7a1a':'#c00'} strokeWidth="3"/>

      {/* Frente indicator: small dashed band outside line */}
      {[{k:'norte',A:rTL,B:rTR},{k:'sur',A:rBR,B:rBL},{k:'este',A:rTR,B:rBR},{k:'oeste',A:rBL,B:rTL}].filter(({k})=>frontes.has(k)).map(({k,A,B})=>{
        const pOff=perpOff(A,B,10);
        return(
          <g key={`ft-${k}`}>
            <line x1={A.x+pOff.x} y1={A.y+pOff.y} x2={B.x+pOff.x} y2={B.y+pOff.y}
              stroke="#1a7a1a" strokeWidth="3" strokeDasharray="6,4" opacity="0.7"/>
          </g>
        );
      })}

      {/* Dimension lines (AutoCAD style) */}
      {dimLine(rTL,rTR,norteM,frontes.has('norte'),frontes.has('norte')?-32:-32)}
      {dimLine(rBL,rBR,surM,frontes.has('sur'),frontes.has('sur')?32:32)}
      {dimLine(rTR,rBR,esteM,frontes.has('este'),32)}
      {dimLine(rTL,rBL,oesteM,frontes.has('oeste'),-32)}

      {/* Colindancias labels (separate from dim lines, pushed further out) */}
      {colLbl(rMidN,norteCol,bNd,54,'middle')}
      {colLbl(rMidS,surCol,bSd,58,'middle')}
      {colLbl({x:outDir(rMidE,48).x,y:outDir(rMidE,48).y},esteCol,bEd,0,'start')}
      {colLbl({x:outDir(rMidO,48).x,y:outDir(rMidO,48).y},oesteCol,bOd,0,'end')}

      {/* Frente "CALLE" badge on dashed band, not covering labels */}
      {[{k:'norte',mid:rMidN},{k:'sur',mid:rMidS},{k:'este',mid:rMidE},{k:'oeste',mid:rMidO}].filter(({k})=>frontes.has(k)).map(({k,mid})=>{
        const pOff=perpOff(k==='norte'?rTL:k==='sur'?rBR:k==='este'?rTR:rBL,
          k==='norte'?rTR:k==='sur'?rBL:k==='este'?rBR:rTL,18);
        const bp={x:mid.x+pOff.x,y:mid.y+pOff.y};
        const angle=Math.atan2(
          (k==='norte'?rTR:k==='sur'?rBL:k==='este'?rBR:rTL).y-(k==='norte'?rTL:k==='sur'?rBR:k==='este'?rTR:rBL).y,
          (k==='norte'?rTR:k==='sur'?rBL:k==='este'?rBR:rTL).x-(k==='norte'?rTL:k==='sur'?rBR:k==='este'?rTR:rBL).x
        )*180/Math.PI;
        const ta=Math.abs(angle)>90?angle+180:angle;
        return(
          <g key={`badge-${k}`}>
            <rect x={bp.x-16} y={bp.y-6} width={32} height={12} rx="3" fill="#1a7a1a"
              transform={`rotate(${ta},${bp.x},${bp.y})`}/>
            <text x={bp.x} y={bp.y+4} textAnchor="middle" fontSize="6.5" fill="white" fontFamily="Arial" fontWeight="bold"
              transform={`rotate(${ta},${bp.x},${bp.y})`}>CALLE</text>
          </g>
        );
      })}

      {/* Vertices with numbers */}
      {[{p:rTL,n:'1'},{p:rTR,n:'2'},{p:rBR,n:'3'},{p:rBL,n:'4'}].map(({p,n},i)=>{
        const lp=inOf(p,18);
        return(<g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill={valid?'#003a6e':'#e67e00'} stroke="white" strokeWidth="1.2"/>
          <circle cx={lp.x} cy={lp.y} r="8" fill="white" stroke="#003a6e" strokeWidth="0.8" opacity="0.9"/>
          <text x={lp.x} y={lp.y+4} textAnchor="middle" fontSize="8" fill="#003a6e" fontFamily="Arial" fontWeight="bold">{n}</text>
        </g>);
      })}

      {/* Angle arcs */}
      <path d={arcPath(rTL,rTR,rBL)} fill="none" stroke="#003a6e" strokeWidth="0.8"/>
      <path d={arcPath(rTR,rTL,rBR)} fill="none" stroke="#003a6e" strokeWidth="0.8"/>
      <path d={arcPath(rBR,rTR,rBL)} fill="none" stroke="#003a6e" strokeWidth="0.8"/>
      <path d={arcPath(rBL,rBR,rTL)} fill="none" stroke="#003a6e" strokeWidth="0.8"/>
      {[{a:aTL,p:inOf(rTL,28)},{a:aTR,p:inOf(rTR,28)},{a:aBR,p:inOf(rBR,28)},{a:aBL,p:inOf(rBL,28)}].map(({a,p},i)=>(
        <text key={i} x={p.x} y={p.y+3} textAnchor="middle" fontSize="7.5" fill="#003a6e" fontFamily="Arial" fontWeight="bold">{a.toFixed(1)}°</text>
      ))}

      {/* Center info */}
      <text x={cx} y={cy-18} textAnchor="middle" fontSize="15" fontWeight="bold" fill="#003a6e" fontFamily="Arial">TERRENO</text>
      <text x={cx} y={cy+2}  textAnchor="middle" fontSize="17" fontWeight="bold" fill="#000" fontFamily="Arial">{areaM2.toFixed(2)} m²</text>
      <text x={cx} y={cy+17} textAnchor="middle" fontSize="8.5" fill="#555" fontFamily="Arial">{usoSuelo}</text>
      <line x1={cx-35} y1={cy+22} x2={cx+35} y2={cy+22} stroke="#003a6e" strokeWidth="0.7"/>
      <text x={cx} y={cy+31} textAnchor="middle" fontSize="7.5" fill="#777" fontFamily="Arial">P = {perim} m</text>

      {/* Scale bar */}
      <rect x={PAD} y={scaleY-6} width={scaleBarPx} height={7} fill="none" stroke="#444" strokeWidth="1"/>
      <rect x={PAD} y={scaleY-6} width={scaleBarPx/2} height={7} fill="#444"/>
      <text x={PAD} y={scaleY+9} fontSize="7" fill="#333" fontFamily="Arial">0</text>
      <text x={PAD+scaleBarPx/2} y={scaleY+9} textAnchor="middle" fontSize="7" fill="#333" fontFamily="Arial">{scaleBarM/2}m</text>
      <text x={PAD+scaleBarPx}   y={scaleY+9} textAnchor="middle" fontSize="7" fill="#333" fontFamily="Arial">{scaleBarM}m</text>
      <text x={PAD+scaleBarPx+4} y={scaleY+9} fontSize="6.5" fill="#888" fontFamily="Arial" fontStyle="italic">
        1:{Math.round((norteM/(scaleBarPx/96*25.4))*1000)/1000 < 1? 1:Math.round(norteM/(scaleBarPx/96*25.4))}
      </text>

      {/* Not-valid warning — minimal, bottom right corner */}
      {!valid&&!useExact&&(
        <text x={svgW-4} y={svgH-4} textAnchor="end" fontSize="6.5" fill="#e67e00" fontFamily="Arial">
          ⚠ Ingrese rumbos para figura exacta
        </text>
      )}

      {/* Rotation orbit + handle */}
      {selected&&(
        <g>
          <circle cx={cx} cy={cy} r={hRad} fill="none" stroke="#0066cc" strokeWidth="1.2" strokeDasharray="5,3" opacity="0.6"/>
          <line x1={cx} y1={cy} x2={cx} y2={cy-hRad+4} stroke="#0066cc" strokeWidth="0.7" strokeDasharray="3,3" opacity="0.4"/>
          <circle cx={hX} cy={hY} r="14" fill="#0066cc" stroke="white" strokeWidth="2"
            style={{cursor:'grab'}} onMouseDown={onHandleDown}/>
          <text x={hX} y={hY+6} textAnchor="middle" fontSize="17" fill="white" style={{userSelect:'none',pointerEvents:'none'}}>↻</text>
          <rect x={cx-48} y={cy-37} width={96} height={19} rx="4" fill="#0066cc" opacity="0.9"/>
          <text x={cx} y={cy-24} textAnchor="middle" fontSize="8.5" fill="white" fontFamily="Arial" fontWeight="bold">{shortB(bNd)} · {rotation.toFixed(1)}°</text>
          <rect x={svgW/2-110} y={svgH-46} width={220} height={14} rx="3" fill="#0066cc" opacity="0.8"/>
          <text x={svgW/2} y={svgH-36} textAnchor="middle" fontSize="7.5" fill="white" fontFamily="Arial">Arrastre ↻ para girar · Doble clic para salir</text>
        </g>
      )}
      {!selected&&(
        <text x={svgW/2} y={svgH-3} textAnchor="middle" fontSize="6.5" fill="#bbb" fontFamily="Arial" style={{cursor:'pointer'}} onDoubleClick={()=>onSelect(true)}>
          Doble clic para girar
        </text>
      )}
      <polygon points={rPts} fill="transparent" stroke="none" onDoubleClick={()=>onSelect(!selected)} style={{cursor:'pointer'}}/>
    </svg>
  );
};

/* ── Indicators bar (above croquis) ────────────────────────────────────── */
const IndicatorsBar=({sides,frontes})=>(
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'3px',padding:'4px 6px',background:'#f0f4f8',borderBottom:'1px solid #c5d0de',flexShrink:0}}>
    {sides.map(({key,label,m,bearing,col,color})=>(
      <div key={key} style={{background:frontes.has(key)?'#e8f5e9':'white',border:`1px solid ${frontes.has(key)?'#2e7d32':'#c5d0de'}`,borderRadius:'3px',padding:'3px 5px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'6.5px',fontWeight:'bold',color:frontes.has(key)?'#1a7a1a':color,fontFamily:'Arial'}}>
            {label} {frontes.has(key)&&<span style={{background:'#1a7a1a',color:'white',borderRadius:'8px',padding:'0 4px',fontSize:'5.5px'}}>FRENTE</span>}
          </span>
          <span style={{fontSize:'8px',fontWeight:'bold',color:'#003a6e',fontFamily:'Arial'}}>{m.toFixed(2)} m</span>
        </div>
        <div style={{fontSize:'6px',color:'#555',fontFamily:'Arial',marginTop:'2px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{col}</div>
        <div style={{fontSize:'5.5px',color:'#0056b3',fontFamily:'Arial',fontWeight:'bold',marginTop:'1px'}}>{fmtB(bearing)}</div>
      </div>
    ))}
  </div>
);

/* ── App ─────────────────────────────────────────────────────────────────── */
const App=()=>{
  const printRef=useRef();
  const [rotation,setRotation]=useState(0);
  const [selected,setSelected]=useState(false);
  const [frontes,setFrontes]=useState(new Set(['norte']));
  const [munQuery,setMunQuery]=useState('Tlalnepantla de Baz');
  const [munSug,setMunSug]=useState([]);
  const [showMun,setShowMun]=useState(false);
  const [imagenSrc,setImagenSrc]=useState(null);
  const [form,setForm]=useState({
    claveCatastral:'15-001-002-003-04',propietario:'JUAN PÉREZ LÓPEZ',
    calle:'CALLE DE LOS ARCOS',numero:'123',colonia:'COL. CENTRO',
    codigoPostal:'54000',municipio:'TLALNEPANTLA DE BAZ',
    estado:'ESTADO DE MÉXICO',usoSuelo:'HABITACIONAL',unidadMedida:'metros',
    norteMedida:'21.00',norteColindancia:'CALLE PRIMERO DE MAYO',
    surMedida:'23.40',surColindancia:'YESENIA ESPINOSA ARTEAGA',
    esteMedida:'37.00',esteColindancia:'CALLE PRIVADA DE 4 METROS',
    oesteMedida:'24.00',oesteColindancia:'YESENIA ESPINOSA ARTEAGA',
    norteCuad:'NE',norteAng:'57.51',
    surCuad:'NW',surAng:'65.04',
    esteCuad:'SE',esteAng:'24.04',
    oesteCuad:'NW',oesteAng:'23.13',
    fecha:new Date().toLocaleDateString('es-MX'),
  });

  const hC=e=>setForm(f=>({...f,[e.target.name]:e.target.value}));
  const hMI=e=>{const v=e.target.value;setMunQuery(v);if(v.length>0){setMunSug(MUNICIPIOS.filter(m=>m.toLowerCase().includes(v.toLowerCase())).slice(0,8));setShowMun(true);}else setShowMun(false);};
  const selMun=m=>{setMunQuery(m);setForm(f=>({...f,municipio:m.toUpperCase()}));setShowMun(false);};
  const hImg=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setImagenSrc(ev.target.result);r.readAsDataURL(f);};
  const toM=v=>{const n=parseFloat(v)||0;if(form.unidadMedida==='varas')return n*0.838;if(form.unidadMedida==='pies')return n*0.3048;return n;};
  const nM=toM(form.norteMedida),sM=toM(form.surMedida),eM=toM(form.esteMedida),oM=toM(form.oesteMedida);
  const area=((nM+sM)/2)*((eM+oM)/2);
  const bN=parseBearing(form.norteCuad,form.norteAng),bS=parseBearing(form.surCuad,form.surAng);
  const bE=parseBearing(form.esteCuad,form.esteAng),bO=parseBearing(form.oesteCuad,form.oesteAng);
  const useExact=bN!==null&&bS!==null&&bE!==null&&bO!==null;

  // Compute rotated bearings for table
  const geo=useExact?computeFromBearings(nM,sM,eM,oM,bN,bS,bE,bO):solveQuad(nM,sM,eM,oM);
  const CW=490,CH=580,PAD=88;
  const dW=CW-PAD*2,dH=CH-PAD*2-28;
  const{TL:tl2,TR:tr2,BL:bl2,BR:br2}=geo;
  const aXt=[tl2.x,tr2.x,bl2.x,br2.x],aYt=[tl2.y,tr2.y,bl2.y,br2.y];
  const mxT=Math.min(...aXt),MxT=Math.max(...aXt),myT=Math.min(...aYt),MyT=Math.max(...aYt);
  const sct=Math.min(dW/(MxT-mxT||1),dH/(MyT-myT||1));
  const oXt=PAD+(dW-(MxT-mxT)*sct)/2-mxT*sct,oYt=PAD+(dH-(MyT-myT)*sct)/2-myT*sct;
  const px3=p=>({x:oXt+p.x*sct,y:oYt+p.y*sct});
  const TL3=px3(tl2),TR3=px3(tr2),BL3=px3(bl2),BR3=px3(br2);
  const cx3=(TL3.x+TR3.x+BR3.x+BL3.x)/4,cy3=(TL3.y+TR3.y+BR3.y+BL3.y)/4;
  const rP=(p,R)=>{const rad=R*Math.PI/180,dx=p.x-cx3,dy=p.y-cy3;return{x:cx3+dx*Math.cos(rad)-dy*Math.sin(rad),y:cy3+dx*Math.sin(rad)+dy*Math.cos(rad)};};
  const rTL3=rP(TL3,rotation),rTR3=rP(TR3,rotation),rBL3=rP(BL3,rotation),rBR3=rP(BR3,rotation);
  const bNd=calcBearing(rTL3,rTR3),bSd=calcBearing(rBR3,rBL3),bEd=calcBearing(rTR3,rBR3),bOd=calcBearing(rBL3,rTL3);

  const sideInfo=[
    {key:'norte',label:'⬆ NORTE',color:'#c00',m:nM,bearing:bNd,col:form.norteColindancia},
    {key:'sur',  label:'⬇ SUR',  color:'#444',m:sM,bearing:bSd,col:form.surColindancia},
    {key:'este', label:'➡ ESTE', color:'#444',m:eM,bearing:bEd,col:form.esteColindancia},
    {key:'oeste',label:'⬅ OESTE',color:'#444',m:oM,bearing:bOd,col:form.oesteColindancia},
  ];

  const hPrint=async()=>{
    setSelected(false);await new Promise(r=>setTimeout(r,100));
    const el=printRef.current;if(!el)return;
    try{
      const c=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false});
      const img=c.toDataURL('image/png');
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
      pdf.addImage(img,'PNG',0,0,pdf.internal.pageSize.getWidth(),pdf.internal.pageSize.getHeight());
      pdf.save('Plano_Catastral_'+form.claveCatastral+'.pdf');
    }catch(e){console.error(e);}
  };

  const toggleFrente=k=>setFrontes(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n;});
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

      {/* ══ FORMULARIO ══ */}
      <div style={{maxWidth:'950px',margin:'0 auto 20px',background:'white',borderRadius:'6px',overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.13)'}}>
        <div style={{background:'#004a8f',color:'white',padding:'14px 20px'}}>
          <h1 style={{margin:0,fontSize:'17px'}}>📋 Generador de Plano Catastral — Estado de México</h1>
          <p style={{margin:'3px 0 0',fontSize:'11px',opacity:0.8}}>Complete los datos — la vista previa se actualiza en tiempo real abajo</p>
        </div>
        <div style={{padding:'20px'}}>

          <h3 style={sec}>Identificación del Predio</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={lbl}>Clave Catastral</label><input style={inp} name="claveCatastral" value={form.claveCatastral} onChange={hC}/></div>
            <div><label style={lbl}>Nombre del Propietario</label><input style={inp} name="propietario" value={form.propietario} onChange={hC}/></div>
          </div>

          <h3 style={sec}>Ubicación del Predio</h3>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px',marginBottom:'12px'}}>
            <div><label style={lbl}>Calle / Avenida</label><input style={inp} name="calle" value={form.calle} onChange={hC}/></div>
            <div><label style={lbl}>Número Exterior</label><input style={inp} name="numero" value={form.numero} onChange={hC}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px',marginBottom:'12px'}}>
            <div><label style={lbl}>Colonia / Fraccionamiento</label><input style={inp} name="colonia" value={form.colonia} onChange={hC}/></div>
            <div><label style={lbl}>Código Postal</label><input style={inp} name="codigoPostal" value={form.codigoPostal} onChange={hC}/></div>
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

          <h3 style={sec}>Medidas, Rumbos y Colindancias</h3>
          {useExact&&(<div style={{background:'#e8f5e9',border:'1px solid #388e3c',borderRadius:'5px',padding:'7px 12px',marginBottom:'12px',fontSize:'11px',color:'#1b5e20'}}>✅ <strong>Rumbos activos</strong> — figura exacta basada en cuadro de construcción.</div>)}
          {!useExact&&(<div style={{background:'#e3f2fd',border:'1px solid #1976d2',borderRadius:'5px',padding:'7px 12px',marginBottom:'12px',fontSize:'11px',color:'#0d47a1'}}>💡 Ingrese rumbos en cada lado para geometría exacta (como su plano real).</div>)}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div><label style={lbl}>Unidad de Medida</label>
              <select style={inp} name="unidadMedida" value={form.unidadMedida} onChange={hC}>
                <option value="metros">Metros (m)</option>
                <option value="varas">Varas (0.838 m)</option>
                <option value="pies">Pies (0.3048 m)</option>
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
              <div><div style={{fontWeight:'bold',fontSize:'12px',color:'#004a8f'}}>🧭 Orientación visual (rotación)</div>
                <div style={{fontSize:'11px',color:'#555'}}>Doble clic en el terreno del plano para girar con el mouse</div></div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontWeight:'bold',color:'#003a6e',fontSize:'15px'}}>{shortB(bNd)}</span>
                <button onClick={()=>{setRotation(0);setSelected(false);}} style={{padding:'5px 12px',background:'#6c757d',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>Resetear 0°</button>
              </div>
            </div>
            <input type="range" min="0" max="359" step="0.5" value={rotation} onChange={e=>setRotation(parseFloat(e.target.value))} style={{width:'100%',marginTop:'10px',accentColor:'#004a8f'}}/>
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
          📄 VISTA PREVIA EN TIEMPO REAL
        </div>
        <div ref={printRef} style={{width:'816px',height:'1056px',background:'white',padding:'12px 12px 8px',boxSizing:'border-box',fontFamily:'Arial,sans-serif',fontSize:'9px',color:'#000',overflow:'hidden'}}>

          {/* Encabezado — sin logo verde, solo texto */}
          <div style={{border:'3px solid #000',padding:'5px 10px',marginBottom:'5px'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'11px',fontWeight:'bold',letterSpacing:'0.5px'}}>GOBIERNO DEL ESTADO DE MÉXICO</div>
              <div style={{fontSize:'9px',fontWeight:'bold'}}>SECRETARÍA DE FINANZAS — DIRECCIÓN GENERAL DE CATASTRO E INFORMACIÓN TERRITORIAL</div>
              <div style={{fontSize:'13px',fontWeight:'bold',marginTop:'3px',borderTop:'1px solid #000',paddingTop:'3px',letterSpacing:'0.5px'}}>CÉDULA DE DETERMINACIÓN CATASTRAL</div>
              <div style={{fontSize:'8px',color:'#444'}}>PLANO DE LOCALIZACIÓN, MEDIDAS Y COLINDANCIAS</div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'6px',marginTop:'-34px'}}>
              <div style={{border:'1px solid #000',padding:'3px 6px',fontSize:'7px',textAlign:'right'}}>
                <div style={{fontWeight:'bold'}}>FOLIO:</div><div style={{fontSize:'8px',fontWeight:'bold'}}>{form.claveCatastral}</div>
              </div>
              <div style={{border:'1px solid #000',padding:'3px 6px',fontSize:'7px',textAlign:'right'}}>
                <div style={{fontWeight:'bold'}}>FECHA:</div><div>{form.fecha}</div>
              </div>
            </div>
          </div>

          <div style={{border:'2px solid #000',padding:'3px',textAlign:'center',marginBottom:'5px',background:'#f0f4f8'}}>
            <span style={{fontWeight:'bold',fontSize:'9px'}}>CLAVE CATASTRAL: </span>
            <span style={{fontSize:'14px',fontWeight:'bold',letterSpacing:'3px',color:'#003a6e'}}>{form.claveCatastral}</span>
          </div>

          {/* Cuerpo 2 columnas */}
          <div style={{display:'grid',gridTemplateColumns:'210px 1fr',gap:'5px',height:'894px'}}>

            {/* Columna izquierda */}
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
                  <tr><td style={tdH}>SUPERFICIE:</td><td style={{...tdV,fontWeight:'bold',color:'#003a6e',fontSize:'9px'}}>{area.toFixed(2)} M²</td></tr>
                  <tr><td style={tdH}>PERÍMETRO:</td><td style={{...tdV,color:'#444'}}>{(nM+sM+eM+oM).toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>FRENTE (N):</td><td style={tdV}>{nM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>FONDO (S):</td><td style={tdV}>{sM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>LADO ESTE:</td><td style={tdV}>{eM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>LADO OESTE:</td><td style={tdV}>{oM.toFixed(2)} m</td></tr>
                  <tr><td style={tdH}>USO SUELO:</td><td style={tdV}>{form.usoSuelo}</td></tr>
                  <tr><td style={tdH}>FRENTE(S):</td><td style={{...tdV,color:'#1a7a1a',fontWeight:'bold'}}>{frontes.size>0?Array.from(frontes).map(s=>s.toUpperCase()).join(', '):'—'}</td></tr>
                </tbody>
              </table>
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
                  {[{r:'NORTE',m:nM,b:bNd},{r:'SUR',m:sM,b:bSd},{r:'ESTE',m:eM,b:bEd},{r:'OESTE',m:oM,b:bOd}].map(({r,m,b})=>(
                    <tr key={r}><td style={{...tdH,fontSize:'6.5px'}}>{r}</td><td style={{...tdV,textAlign:'center'}}>{m.toFixed(2)}</td>
                      <td style={{...tdV,fontSize:'6px',color:'#003a6e',fontWeight:'bold'}}>{fmtB(b)}</td></tr>
                  ))}
                </tbody>
              </table>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr><th colSpan="2" style={thH}>COLINDANCIAS</th></tr></thead>
                <tbody>
                  {[{r:'NORTE',c:form.norteColindancia},{r:'SUR',c:form.surColindancia},{r:'ESTE',c:form.esteColindancia},{r:'OESTE',c:form.oesteColindancia}].map(({r,c})=>(
                    <tr key={r}><td style={{...tdH,fontSize:'6.5px'}}>{r}:</td><td style={{...tdV,fontSize:'6.5px'}}>{c}</td></tr>
                  ))}
                </tbody>
              </table>

              {/* Foto — cuadrada */}
              <div style={{width:'100%',aspectRatio:'1',flexShrink:0,border:'2px dashed #90a4ae',borderRadius:'4px',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f9fa',marginTop:'auto'}}>
                {imagenSrc
                  ?<img src={imagenSrc} alt="terreno" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  :<div style={{textAlign:'center'}}><div style={{fontSize:'26px',color:'#ccc'}}>📷</div><div style={{fontSize:'7px',color:'#aaa',marginTop:'3px'}}>Foto / croquis del terreno</div></div>
                }
              </div>
            </div>

            {/* Columna derecha: indicadores arriba + croquis */}
            <div style={{border:'2px solid #000',background:'#fafcff',display:'flex',flexDirection:'column'}}>
              {/* Título */}
              <div style={{textAlign:'center',fontWeight:'bold',fontSize:'7.5px',background:'#003a6e',color:'white',padding:'3px 4px',flexShrink:0}}>
                CROQUIS DEL PREDIO — REPRESENTACIÓN GRÁFICA PROPORCIONAL
              </div>
              {/* Indicadores barra */}
              <IndicatorsBar sides={sideInfo} frontes={frontes}/>
              {/* Rosa de vientos + croquis en fila */}
              <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
                <div style={{display:'flex',justifyContent:'flex-end',padding:'4px 8px 0 0',flexShrink:0}}>
                  <RosaVientos size={76}/>
                </div>
                <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px 4px'}}>
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
                </div>
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
