// ── MODULE-LEVEL THEME HELPERS ───────────────────────────────────────────────
// Centralised theme detection — avoids repeating getAttribute calls everywhere.

function isLight() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}

function getChartColors() {
  const light = isLight();
  return {
    gridC: light ? 'rgba(203,213,225,.5)' : 'rgba(31,41,54,.8)',
    tickC: light ? '#64748b' : '#5a7085'
  };
}

// Returns the base tooltip style object (theme-aware).
// Each chart spreads this and adds its own callbacks / font overrides.
function getTooltipConfig() {
  const light = isLight();
  return {
    backgroundColor: light ? '#ffffff' : '#131922',
    borderColor:     light ? '#cbd5e1' : '#2a3648',
    titleColor: '#9fb3c8',
    bodyColor:  light ? '#0f172a' : '#e8eef5'
  };
}


// ── MAIN APP ─────────────────────────────────────────────────────────────────

function initApp(RAW, DATED_BRENT) {
const CONTRACTS=['CO1','CO2','CO3','CO4','CO5','CO6','CO7','CO8','CO9','CO10'];
const C_LABELS={'CO1':'1er','CO2':'2do','CO3':'3er','CO4':'4to','CO5':'5to','CO6':'6to','CO7':'7mo','CO8':'8vo','CO9':'9no','CO10':'10mo'};
const ALL_DATES=RAW.map(r=>r.Date);
const FIRST_DATE=ALL_DATES[0],LAST_DATE=ALL_DATES[ALL_DATES.length-1];
const TODAY_ROW=RAW[RAW.length-1],PREV_ROW=RAW[RAW.length-2];
let spreadMode='pct',matrixMode='pct',selBase='CO1',selLong='CO2';
let dateFrom=FIRST_DATE,dateTo=LAST_DATE;
let mx2Row=null,spreadChart=null,curveChart=null;

function calcSpread(l,b,m){return m==='pct'?(l/b-1)*100:l-b}
function fmtSpread(v,m){return m==='pct'?(v>=0?'+':'')+v.toFixed(2)+'%':(v>=0?'+$':'-$')+Math.abs(v).toFixed(2)}
function colorCls(v){return v<-0.001?'neg':v>0.001?'pos':'neutral'}

// Shared period-subtraction utility (UTC-based).
// Consolidates the former subtractPeriod + dbSubtractPeriod — both did the same thing.
function subtractPeriod(base,p){const d=new Date(base+'T12:00:00Z');if(p==='1m')d.setUTCMonth(d.getUTCMonth()-1);else if(p==='2m')d.setUTCMonth(d.getUTCMonth()-2);else if(p==='3m')d.setUTCMonth(d.getUTCMonth()-3);else if(p==='6m')d.setUTCMonth(d.getUTCMonth()-6);else if(p==='1y')d.setUTCFullYear(d.getUTCFullYear()-1);return d.toISOString().slice(0,10)}

function findRowOnOrBefore(t){const h=ALL_DATES.filter(d=>d<=t);if(!h.length)return RAW[0];return RAW.find(r=>r.Date===h[h.length-1])}

document.getElementById('last-date').textContent=LAST_DATE;
document.getElementById('matrix-title').textContent='Spreads al '+LAST_DATE.split('-').reverse().join('/');
const fromEl=document.getElementById('date-from'),toEl=document.getElementById('date-to');
fromEl.min=FIRST_DATE;fromEl.max=LAST_DATE;fromEl.value=FIRST_DATE;
toEl.min=FIRST_DATE;toEl.max=LAST_DATE;toEl.value=LAST_DATE;
const mx2DateEl=document.getElementById('mx2-custom-date');
mx2DateEl.min=FIRST_DATE;mx2DateEl.max=LAST_DATE;

// ── KPI ROW — VAR% 1D ────────────────────────────────────────────────────────
(function(){
  const row=document.getElementById('kpi-row');
  CONTRACTS.forEach(c=>{
    const px=TODAY_ROW[c],pp=PREV_ROW[c];
    const v=pp?(px/pp-1)*100:0;
    const cls=colorCls(v),arr=v>0?'▲':v<0?'▼':'—';
    const d=document.createElement('div');d.className='kpi-card';
    d.innerHTML=`<div class="kpi-label">${c}</div><div class="kpi-price">$${px.toFixed(2)}</div><div class="kpi-var ${cls}">${arr} ${v>=0?'+':''}${v.toFixed(2)}% <span style="opacity:.5;font-size:11px">1D</span></div>`;
    row.appendChild(d);
  });
})();

// ── SPREAD CHART ─────────────────────────────────────────────────────────────

function buildSelectors(){
  const b=document.getElementById('sel-base'),l=document.getElementById('sel-long');
  b.innerHTML='';CONTRACTS.slice(0,CONTRACTS.length-1).forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;if(c===selBase)o.selected=true;b.appendChild(o);});
  l.innerHTML='';const bi=CONTRACTS.indexOf(selBase);CONTRACTS.slice(bi+1).forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;if(c===selLong)o.selected=true;l.appendChild(o);});
  if(CONTRACTS.indexOf(selLong)<=bi){selLong=CONTRACTS[bi+1];l.value=selLong;}
}
buildSelectors();
document.getElementById('sel-base').addEventListener('change',function(){selBase=this.value;if(CONTRACTS.indexOf(selLong)<=CONTRACTS.indexOf(selBase))selLong=CONTRACTS[CONTRACTS.indexOf(selBase)+1];buildSelectors();renderSpreadChart();highlightCell(selBase,selLong);});
document.getElementById('sel-long').addEventListener('change',function(){selLong=this.value;renderSpreadChart();highlightCell(selBase,selLong);});

function setPeriodPill(el,p){document.querySelectorAll('.pill').forEach(x=>x.classList.remove('active'));el.classList.add('active');dateFrom=p==='all'?FIRST_DATE:subtractPeriod(LAST_DATE,p);if(dateFrom<FIRST_DATE)dateFrom=FIRST_DATE;dateTo=LAST_DATE;fromEl.value=dateFrom;toEl.value=dateTo;renderSpreadChart();}
function onDateRangeChange(){dateFrom=fromEl.value||FIRST_DATE;dateTo=toEl.value||LAST_DATE;document.querySelectorAll('.pill').forEach(x=>x.classList.remove('active'));renderSpreadChart();}
function setSpreadMode(m){spreadMode=m;document.getElementById('btn-pct').classList.toggle('active',m==='pct');document.getElementById('btn-usd').classList.toggle('active',m==='usd');renderSpreadChart();}

function renderSpreadChart(){
  const filtered=RAW.filter(r=>r.Date>=dateFrom&&r.Date<=dateTo);
  if(!filtered.length)return;
  const labels=filtered.map(r=>r.Date);
  const series=filtered.map(r=>{const b=r[selBase],l=r[selLong];return(b&&l)?parseFloat(calcSpread(l,b,spreadMode).toFixed(4)):null;});
  const valid=series.filter(v=>v!==null);
  const lastVal=valid[valid.length-1],minV=Math.min(...valid),maxV=Math.max(...valid),avg=valid.reduce((a,b)=>a+b,0)/valid.length;
  document.getElementById('spread-stats').innerHTML=`
    <div class="stat-cell"><div class="stat-lbl">Último (${LAST_DATE})</div><div class="stat-val ${colorCls(lastVal)}">${fmtSpread(lastVal,spreadMode)}</div></div>
    <div class="stat-cell"><div class="stat-lbl">Mínimo período</div><div class="stat-val neg">${spreadMode==='pct'?minV.toFixed(2)+'%':'$'+minV.toFixed(2)}</div></div>
    <div class="stat-cell"><div class="stat-lbl">Máximo período</div><div class="stat-val pos">${spreadMode==='pct'?maxV.toFixed(2)+'%':'$'+maxV.toFixed(2)}</div></div>
    <div class="stat-cell"><div class="stat-lbl">Promedio período</div><div class="stat-val warn">${spreadMode==='pct'?avg.toFixed(2)+'%':'$'+avg.toFixed(2)}</div></div>`;
  document.getElementById('spread-title').textContent=`Spread ${selLong} vs ${selBase}`;
  document.getElementById('spread-formula').textContent=spreadMode==='pct'?`${selLong} / ${selBase} − 1`:`${selLong} − ${selBase}`;
  const ctx=document.getElementById('spreadChart').getContext('2d');
  if(spreadChart)spreadChart.destroy();
  const _c1=getComputedStyle(document.documentElement).getPropertyValue('--curve1').trim()||'#4dabf7';
  const {gridC,tickC}=getChartColors();
  spreadChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{data:series,borderColor:_c1,backgroundColor:_c1+'1f',borderWidth:2,pointRadius:0,pointHoverRadius:6,pointHoverBackgroundColor:_c1,pointHoverBorderColor:'#fff',pointHoverBorderWidth:2.5,fill:true,tension:.35,spanGaps:false}]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:200},interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{...getTooltipConfig(),borderWidth:1,titleFont:{family:'Open Sans',size:12,weight:'600'},bodyFont:{family:'JetBrains Mono',size:13},padding:12,caretSize:6,cornerRadius:6,displayColors:false,callbacks:{title:i=>i[0].label,label:i=>{if(i.raw===null)return'';return spreadMode==='pct'?` ${selLong}/${selBase}:  ${i.raw>=0?'+':''}${i.raw.toFixed(3)}%`:` ${selLong}−${selBase}:  ${i.raw>=0?'+$':'-$'}${Math.abs(i.raw).toFixed(2)}`;} } } },scales:{x:{ticks:{color:tickC,font:{family:'JetBrains Mono',size:11},maxTicksLimit:14,maxRotation:0},grid:{color:gridC}},y:{ticks:{color:tickC,font:{family:'JetBrains Mono',size:11},callback:v=>spreadMode==='pct'?v.toFixed(1)+'%':'$'+v.toFixed(1)},grid:{color:gridC}}}}});
}
renderSpreadChart();

// ── MATRIX ────────────────────────────────────────────────────────────────────

function setMatrixMode(m){
  matrixMode=m;
  ['mx-btn-pct','mx2-btn-pct'].forEach(id=>document.getElementById(id).classList.toggle('active',m==='pct'));
  ['mx-btn-usd','mx2-btn-usd'].forEach(id=>document.getElementById(id).classList.toggle('active',m==='usd'));
  buildTodayMatrix();if(mx2Row)buildCompareMatrix(mx2Row);
}

function highlightCell(base,long){
  document.querySelectorAll('td.clickable').forEach(td=>td.classList.remove('selected'));
  document.querySelectorAll(`td[data-base="${base}"][data-long="${long}"]`).forEach(td=>td.classList.add('selected'));
}
function onMatrixCellClick(base,long){selBase=base;selLong=long;buildSelectors();renderSpreadChart();highlightCell(base,long);document.getElementById('spreadChart').scrollIntoView({behavior:'smooth',block:'center'});}

function renderMatrix(tableId,dataRow,clickable){
  const table=document.getElementById(tableId);
  let html='<thead><tr><th>↓Base/Largo→</th>';CONTRACTS.forEach(c=>{html+=`<th>${c}</th>`;});html+='</tr></thead><tbody>';
  CONTRACTS.forEach(rC=>{
    html+=`<tr><td>${rC}</td>`;
    CONTRACTS.forEach(cC=>{
      const ri=CONTRACTS.indexOf(rC),ci=CONTRACTS.indexOf(cC);
      if(ri===ci){html+=`<td class="diag">—</td>`;return;}
      if(ci<ri){html+=`<td class="blank">·</td>`;return;}
      const v=calcSpread(dataRow[cC],dataRow[rC],matrixMode);
      const cls=colorCls(v);
      const disp=matrixMode==='pct'?`${v>=0?'+':''}${v.toFixed(2)}%`:`${v>=0?'+$':'-$'}${Math.abs(v).toFixed(2)}`;
      const sel=rC===selBase&&cC===selLong;
      if(clickable)html+=`<td class="clickable ${cls}${sel?' selected':''}" data-base="${rC}" data-long="${cC}" tabindex="0" role="button" onclick="onMatrixCellClick('${rC}','${cC}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();onMatrixCellClick('${rC}','${cC}')}">${disp}</td>`;
      else html+=`<td class="${cls}">${disp}</td>`;
    });
    html+='</tr>';
  });
  html+='</tbody>';table.innerHTML=html;
}
function buildTodayMatrix(){renderMatrix('matrix-today',TODAY_ROW,true);}
function buildCompareMatrix(r){renderMatrix('matrix-compare',r,false);}
buildTodayMatrix();

// ── MX2 PERIOD PICKER ────────────────────────────────────────────────────────

function setMx2Period(period,el){
  document.querySelectorAll('.mx2-period-item').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  const customInput=document.getElementById('mx2-custom-date');
  customInput.style.display=(period==='custom')?'inline-block':'none';
  if(period==='custom'){if(!customInput.value)return;mx2Row=findRowOnOrBefore(customInput.value);}
  else{mx2Row=findRowOnOrBefore(subtractPeriod(LAST_DATE,period));}
  const dateStr=mx2Row?mx2Row.Date:'—';
  const labels={'1m':'1 mes atrás','2m':'2 meses atrás','3m':'3 meses atrás','6m':'6 meses atrás','1y':'1 año atrás','custom':'Personalizado'};
  document.getElementById('mx2-subtitle').textContent=`${labels[period]||period} — ${dateStr}`;
  document.getElementById('curve2-label').textContent=`${labels[period]||period} (${dateStr})`;
  if(mx2Row)buildCompareMatrix(mx2Row);
  buildForwardChart();
}
function onMx2CustomDate(){
  const v=document.getElementById('mx2-custom-date').value;if(!v)return;
  mx2Row=findRowOnOrBefore(v);
  const dateStr=mx2Row?mx2Row.Date:'—';
  document.getElementById('mx2-subtitle').textContent=`Personalizado — ${dateStr}`;
  document.getElementById('curve2-label').textContent=`Personalizado (${dateStr})`;
  if(mx2Row)buildCompareMatrix(mx2Row);buildForwardChart();
}

// ── FORWARD CURVE — 2 CURVES ─────────────────────────────────────────────────

function buildForwardChart(){
  const data1=CONTRACTS.map(c=>TODAY_ROW[c]);
  const data2=mx2Row?CONTRACTS.map(c=>mx2Row[c]):null;
  const _cs=getComputedStyle(document.documentElement);
  const _cv1=_cs.getPropertyValue('--curve1').trim()||'#4dabf7';
  const _cv2=_cs.getPropertyValue('--curve2').trim()||'#ffc947';
  const {gridC,tickC}=getChartColors();
  const mk=(data,color,label,dash=[])=>({label,data,borderColor:color,backgroundColor:color+'1a',borderWidth:2.5,borderDash:dash,pointBackgroundColor:color,pointBorderColor:'#fff',pointBorderWidth:1.5,pointRadius:5,pointHoverRadius:7,fill:false,tension:.35});
  const datasets=[mk(data1,_cv1,`Hoy (${TODAY_ROW.Date})`)];
  if(data2)datasets.push(mk(data2,_cv2,mx2Row.Date,[6,3]));
  const ctx=document.getElementById('curveChart').getContext('2d');
  if(curveChart)curveChart.destroy();
  curveChart=new Chart(ctx,{type:'line',data:{labels:CONTRACTS,datasets},options:{responsive:true,maintainAspectRatio:false,animation:{duration:300},plugins:{legend:{display:false},tooltip:{...getTooltipConfig(),borderWidth:1,titleFont:{family:'Open Sans',size:12,weight:'600'},bodyFont:{family:'JetBrains Mono',size:13},callbacks:{label:i=>` ${i.dataset.label}: $${i.raw.toFixed(2)}`}}},scales:{x:{ticks:{color:tickC,font:{family:'JetBrains Mono',size:12}},grid:{color:gridC}},y:{ticks:{color:tickC,font:{family:'JetBrains Mono',size:11},callback:v=>'$'+v.toFixed(0)},grid:{color:gridC}}}}});
  document.getElementById('curve-legend').innerHTML=[{color:'#00c8ff',label:`Curva 1 — Hoy (${TODAY_ROW.Date})`},...(mx2Row?[{color:'#ffd700',label:`Curva 2 — ${mx2Row.Date}`}]:[])].map(i=>`<div class="leg-item"><div class="leg-dot" style="background:${i.color}"></div><span>${i.label}</span></div>`).join('');
}
buildForwardChart();

// ── THEME TOGGLE ─────────────────────────────────────────────────────────────
let darkMode = true;
function toggleTheme() {
  darkMode = !darkMode;
  const label = document.getElementById('theme-label');
  const icon  = document.getElementById('theme-icon');
  if (darkMode) {
    document.documentElement.removeAttribute('data-theme');
    label.textContent = 'Claro';
    // Sun icon
    icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    label.textContent = 'Oscuro';
    // Moon icon
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
  // Rebuild charts so colors pick up new CSS vars
  renderSpreadChart();
  buildForwardChart();
  if (typeof renderPctChart === 'function') renderPctChart();
  if (dbChart) renderDbChart();
}

// ── AUTO-SELECT 1 MES ATRÁS ON LOAD ─────────────────────────────────────────
(function() {
  const firstItem = document.querySelector('.mx2-period-item');
  if (firstItem) setMx2Period('1m', firstItem);
})();

// ── DYNAMIC ROLL DATA COMPUTATION ────────────────────────────────────────────
// Computa estadísticas de roll dinámicamente desde RAW + DATED_BRENT al cargar.
// Cubre todos los pares adyacentes CO1→CO2 ... CO9→CO10.
// Spread % = (Largo/Base - 1) * 100. Signo: negativo = backwardation (normal).
const ROLL_PAIRS = [];
for(var _i=0;_i<CONTRACTS.length-1;_i++) ROLL_PAIRS.push([CONTRACTS[_i],CONTRACTS[_i+1]]);

function computeRollData(){
  const out = {seasonality:{}, ym:{}, today_rolls:{}, percentiles:{}, cur_month:0, today_date:'', today_prices:{}};
  if(!RAW.length) return out;
  const lastRow = RAW[RAW.length-1];
  out.today_date = lastRow.Date;
  const [ty,tm] = lastRow.Date.split('-');
  out.cur_month = parseInt(tm,10);
  CONTRACTS.forEach(c=>{ if(lastRow[c]!==undefined && lastRow[c]!==null) out.today_prices[c]=lastRow[c]; });

  ROLL_PAIRS.forEach(([base,lng])=>{
    const key = base+'_'+lng;
    // Compute per-day spread %
    const byMonth = {};  // month (1..12) -> [vals]
    const byYM = {};     // 'YYYY-MM' -> [vals]
    RAW.forEach(r=>{
      if(r[base]==null || r[lng]==null) return;
      const pct = (r[lng]/r[base] - 1) * 100;
      const [y,m] = r.Date.split('-');
      const mi = parseInt(m,10);
      const ym = y+'-'+m;
      if(!byMonth[mi]) byMonth[mi]=[];
      byMonth[mi].push(pct);
      if(!byYM[ym]) byYM[ym]=[];
      byYM[ym].push(pct);
    });

    // Seasonality: stats per month (1..12)
    out.seasonality[key] = {};
    for(let m=1;m<=12;m++){
      const arr = byMonth[m]||[];
      if(!arr.length){ out.seasonality[key][m] = null; continue; }
      const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
      const sorted = [...arr].sort((a,b)=>a-b);
      const med = sorted.length%2 ? sorted[(sorted.length-1)>>1] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;
      const variance = arr.reduce((a,b)=>a+(b-avg)*(b-avg),0)/arr.length;
      out.seasonality[key][m] = {avg, med, std:Math.sqrt(variance), min:sorted[0], max:sorted[sorted.length-1], n:arr.length};
    }

    // Year-month avgs
    out.ym[key] = {};
    Object.keys(byYM).forEach(ym=>{
      const arr = byYM[ym];
      out.ym[key][ym] = arr.reduce((a,b)=>a+b,0)/arr.length;
    });

    // Today's roll spread
    if(lastRow[base]!=null && lastRow[lng]!=null){
      out.today_rolls[key] = (lastRow[lng]/lastRow[base] - 1) * 100;
    } else {
      out.today_rolls[key] = null;
    }

    // Percentile of today's roll within same calendar month historically
    const curMonthArr = byMonth[out.cur_month] || [];
    const today = out.today_rolls[key];
    let pct = null, histAvg = null;
    if(curMonthArr.length){
      histAvg = curMonthArr.reduce((a,b)=>a+b,0)/curMonthArr.length;
      if(today!=null){
        const below = curMonthArr.filter(v=>v<=today).length;
        pct = (below/curMonthArr.length)*100;
      }
    }
    out.percentiles[key] = {pct: pct!=null?pct:0, hist_avg: histAvg!=null?histAvg:0, today: today!=null?today:0, n: curMonthArr.length};
  });
  return out;
}

const ROLL_DATA = computeRollData();

// ── TAB NAVIGATION ───────────────────────────────────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  btn.classList.add('active');
  if(name==='heatmap')   initHeatmap();
  if(name==='dated')     initDated();
}

// ── HEATMAP ──────────────────────────────────────────────────────────────────
var hmInitDone=false, pctChart=null;

function hmClass(val) {
  if(val===null||val===undefined) return 'hm-na';
  if(val>=0.5)  return 'hm0';
  if(val>=-0.3) return 'hm1';
  if(val>=-0.8) return 'hm2';
  if(val>=-1.5) return 'hm3';
  if(val>=-3.0) return 'hm4';
  if(val>=-6.0) return 'hm5';
  return 'hm6';
}

function renderHeatmap(pairKey) {
  var parts=pairKey.split('_'), base=parts[0], lng=parts[1];
  document.getElementById('hm-title').textContent='Roll '+base+' → '+lng+' · Spread % promedio diario por mes';
  var ym=ROLL_DATA.ym[pairKey]||{}, seas=ROLL_DATA.seasonality[pairKey]||{};
  var curM=ROLL_DATA.cur_month;
  var months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var tbody=document.getElementById('hm-tbody'), rows='';
  // Compute year range dynamically from RAW.
  // Skip years with fewer than 2 months of data (e.g. 2020 which only has Dec).
  var firstYear = parseInt(RAW[0].Date.split('-')[0],10);
  var lastYear  = parseInt(RAW[RAW.length-1].Date.split('-')[0],10);
  // Count distinct months per year across full RAW
  var monthsByYear = {};
  RAW.forEach(function(r){
    var parts = r.Date.split('-');
    var y = parts[0], m = parts[1];
    if(!monthsByYear[y]) monthsByYear[y] = new Set();
    monthsByYear[y].add(m);
  });
  for(var yr=firstYear;yr<=lastYear;yr++) {
    if(monthsByYear[yr] && monthsByYear[yr].size < 2) continue;  // skip stub years
    var row='<tr><td>'+yr+'</td>';
    for(var m=1;m<=12;m++) {
      var k=yr+'-'+(m<10?'0':'')+m;
      var val=ym[k], isCur=(yr===lastYear&&m===curM);
      var cls=hmClass(val)+(isCur?' hm-cur':'');
      if(val!==undefined) row+='<td class="'+cls+'">'+(val>=0?'+':'')+val.toFixed(2)+'</td>';
      else row+='<td class="hm-na">—</td>';
    }
    rows+=row+'</tr>';
  }
  var avgRow='<tr style="border-top:1px solid var(--border)"><td style="color:var(--accent);font-size:8px">PROM HIST</td>';
  for(var m=1;m<=12;m++) {
    var s=seas[m], val=s?s.avg:null;
    avgRow+=val!==null?'<td class="'+hmClass(val)+'" style="opacity:.85">'+(val>=0?'+':'')+val.toFixed(2)+'</td>':'<td class="hm-na">—</td>';
  }
  tbody.innerHTML=rows+avgRow+'</tr>';
  var pairData=ROLL_DATA.today_rolls[pairKey]||0;
  var apr=seas[curM];
  var strip=document.getElementById('hm-stats');
  var meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var minM=null,minV=999,maxM=null,maxV=-999;
  for(var m=1;m<=12;m++){var s=seas[m];if(s){if(s.avg<minV){minV=s.avg;minM=m;}if(s.avg>maxV){maxV=s.avg;maxM=m;}}}
  strip.innerHTML='<div class="stat-cell"><div class="stat-lbl">Mes más caro hist.</div><div class="stat-val neg">'+meses[minM-1]+' ('+minV.toFixed(2)+'%)</div></div>'+
    '<div class="stat-cell"><div class="stat-lbl">Mes más barato hist.</div><div class="stat-val pos">'+meses[maxM-1]+' ('+maxV.toFixed(2)+'%)</div></div>'+
    '<div class="stat-cell"><div class="stat-lbl">Hoy ('+ROLL_DATA.today_date+')</div><div class="stat-val neg">'+pairData.toFixed(3)+'%</div></div>'+
    '<div class="stat-cell"><div class="stat-lbl">vs prom. '+meses[curM-1]+'</div><div class="stat-val neg">'+(apr?((pairData/Math.abs(apr.avg)).toFixed(1)+'x más caro'):'—')+'</div></div>';
}

function initHeatmap() {
  if(hmInitDone) return;
  hmInitDone=true;
  renderHeatmap('CO1_CO2');
  renderPctChart();
}

function renderPctChart() {
  var pairs=ROLL_PAIRS;
  var labels=pairs.map(p=>p[0]+'→'+p[1]);
  var todayVals=pairs.map(p=>ROLL_DATA.today_rolls[p[0]+'_'+p[1]]||0);
  var histAvgs=pairs.map(p=>{var d=ROLL_DATA.percentiles[p[0]+'_'+p[1]];return d?d.hist_avg:0;});
  var grid=document.getElementById('pct-grid');
  grid.innerHTML='';
  pairs.forEach(function(p) {
    var key=p[0]+'_'+p[1], d=ROLL_DATA.percentiles[key]||{};
    var pct=d.pct||0;
    var pctCls = pct <= 33 ? 'pos' : pct >= 67 ? 'neg' : 'warn';
    var card=document.createElement('div');
    card.className='pct-card';
    card.innerHTML='<div class="pct-pair-lbl">'+p[0]+'→'+p[1]+'</div>'+
      '<div class="pct-num '+pctCls+'">'+Math.round(pct)+'° pct</div>'+
      '<div class="pct-detail">Hoy: '+(d.today||0).toFixed(2)+'%</div>'+
      '<div class="pct-detail">Avg hist: '+(d.hist_avg||0).toFixed(2)+'%</div>'+
      '<div class="pct-bar-wrap"><div class="pct-bar-fill" style="width:100%"></div>'+
      '<div class="pct-marker" style="left:'+pct+'%"></div></div>';
    grid.appendChild(card);
  });
  var _c1=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#4dabf7';
  var {gridC,tickC}=getChartColors();
  var ctx=document.getElementById('pctChart').getContext('2d');
  if(pctChart) pctChart.destroy();
  pctChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[
    {label:'Hoy',data:todayVals,backgroundColor:'rgba(248,81,73,.7)',borderRadius:3},
    {label:'Prom hist. mismo mes',data:histAvgs,backgroundColor:'rgba(139,148,158,.25)',borderRadius:3}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tickC,font:{family:'JetBrains Mono',size:11}}},tooltip:{...getTooltipConfig(),titleFont:{family:'JetBrains Mono',size:11},bodyFont:{family:'JetBrains Mono',size:11}}},scales:{x:{ticks:{color:tickC,font:{family:'JetBrains Mono',size:11}},grid:{color:gridC}},y:{ticks:{color:tickC,font:{family:'JetBrains Mono',size:11},callback:function(v){return v.toFixed(1)+'%'}},grid:{color:gridC}}}}});
}

// ── DATED BRENT TAB ──────────────────────────────────────────────────────────
// Merge DATED_BRENT with CO1 from RAW, keyed by date.
const DB_RAW = (function(){
  const co1ByDate = {};
  RAW.forEach(r => { co1ByDate[r.Date] = r.CO1; });
  const out = [];
  DATED_BRENT.forEach(d => {
    const co1 = co1ByDate[d.Date];
    if(co1 != null) out.push({Date: d.Date, DB: d.DB, CO1: co1});
  });
  return out;
})();

const DB_DATES = DB_RAW.map(r=>r.Date);
const DB_FIRST = DB_DATES[0], DB_LAST = DB_DATES[DB_DATES.length-1];
const DB_TODAY_ROW = DB_RAW[DB_RAW.length-1];

let dbInitDone = false, dbChart = null;
let dbMode = 'pct';           // 'pct' or 'usd' for chart
let dbMxMode = 'pct';          // 'pct' or 'usd' for both matrices
let dbDateFrom = DB_FIRST, dbDateTo = DB_LAST;
let dbMx2Row = null;

function dbSpreadValue(row, mode){
  if(row.DB == null || row.CO1 == null) return null;
  if(mode === 'pct') return (row.DB / row.CO1 - 1) * 100;
  return row.DB - row.CO1;
}

function dbFmt(v, mode){
  if(v == null || isNaN(v)) return '—';
  if(mode === 'pct') return (v>=0?'+':'') + v.toFixed(2) + '%';
  return (v>=0?'+$':'-$') + Math.abs(v).toFixed(2);
}

function dbColorCls(v){ return v > 0 ? 'pos' : (v < 0 ? 'neg' : 'neutral'); }

function dbFindRowOnOrBefore(dateStr){
  for(let i = DB_RAW.length-1; i >= 0; i--){
    if(DB_RAW[i].Date <= dateStr) return DB_RAW[i];
  }
  return DB_RAW[0];
}

function initDated(){
  if(dbInitDone) return;
  dbInitDone = true;
  // Init date inputs
  const dbF = document.getElementById('db-date-from');
  const dbT = document.getElementById('db-date-to');
  const dbC = document.getElementById('db-mx2-custom-date');
  dbF.min = DB_FIRST; dbF.max = DB_LAST; dbF.value = DB_FIRST;
  dbT.min = DB_FIRST; dbT.max = DB_LAST; dbT.value = DB_LAST;
  dbC.min = DB_FIRST; dbC.max = DB_LAST;
  // Default mx2 period to 1m ago
  const firstItem = document.querySelector('#tab-dated .mx2-period-item');
  if(firstItem) setDbMx2Period('1m', firstItem);
  renderDbChart();
  renderDbTodayMatrix();
}

function setDbMode(m){
  dbMode = m;
  document.getElementById('db-btn-pct').classList.toggle('active', m==='pct');
  document.getElementById('db-btn-usd').classList.toggle('active', m==='usd');
  document.getElementById('db-formula').textContent = m==='pct' ? 'Dated Brent / CO1 − 1' : 'Dated Brent − CO1 (USD)';
  renderDbChart();
}

function setDbPeriodPill(el, p){
  document.querySelectorAll('#db-period-pills .pill').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  dbDateFrom = p==='all' ? DB_FIRST : subtractPeriod(DB_LAST, p);
  if(dbDateFrom < DB_FIRST) dbDateFrom = DB_FIRST;
  dbDateTo = DB_LAST;
  document.getElementById('db-date-from').value = dbDateFrom;
  document.getElementById('db-date-to').value = dbDateTo;
  renderDbChart();
}

function onDbDateRangeChange(){
  dbDateFrom = document.getElementById('db-date-from').value || DB_FIRST;
  dbDateTo   = document.getElementById('db-date-to').value   || DB_LAST;
  document.querySelectorAll('#db-period-pills .pill').forEach(x=>x.classList.remove('active'));
  renderDbChart();
}

function renderDbChart(){
  const labels = [], series = [];
  DB_RAW.forEach(r=>{
    if(r.Date < dbDateFrom || r.Date > dbDateTo) return;
    labels.push(r.Date);
    series.push(dbSpreadValue(r, dbMode));
  });
  const _c1 = getComputedStyle(document.documentElement).getPropertyValue('--curve1').trim() || '#4dabf7';
  const {gridC,tickC} = getChartColors();
  const ctx = document.getElementById('dbChart').getContext('2d');
  if(dbChart) dbChart.destroy();
  dbChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{
      data: series, borderColor: _c1, backgroundColor: _c1+'1f',
      borderWidth: 2, pointRadius: 0, pointHoverRadius: 6,
      pointHoverBackgroundColor: _c1, pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2.5,
      fill: true, tension: .35, spanGaps: false
    }]},
    options: {
      responsive: true, maintainAspectRatio: false, animation: {duration: 200},
      interaction: {mode: 'index', intersect: false},
      plugins: {
        legend: {display: false},
        tooltip: {
          ...getTooltipConfig(),
          borderWidth: 1,
          titleFont: {family:'Open Sans', size:12, weight:'600'},
          bodyFont: {family:'JetBrains Mono', size:13},
          padding: 12, caretSize: 6, cornerRadius: 6, displayColors: false,
          callbacks: {
            title: i => i[0].label,
            label: i => {
              if(i.raw === null) return '';
              return dbMode==='pct'
                ? ` Dated/CO1:  ${i.raw>=0?'+':''}${i.raw.toFixed(3)}%`
                : ` Dated−CO1:  ${i.raw>=0?'+$':'-$'}${Math.abs(i.raw).toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {ticks:{color:tickC, font:{family:'JetBrains Mono',size:11}, maxTicksLimit:14, maxRotation:0}, grid:{color:gridC}},
        y: {ticks:{color:tickC, font:{family:'JetBrains Mono',size:11}, callback:v=>dbMode==='pct'?v.toFixed(1)+'%':'$'+v.toFixed(1)}, grid:{color:gridC}}
      }
    }
  });
  // Stats strip
  const valid = series.filter(v=>v!=null);
  if(!valid.length){ document.getElementById('db-stats').innerHTML=''; return; }
  const lastVal = valid[valid.length-1];
  const minV = Math.min(...valid), maxV = Math.max(...valid);
  const avg = valid.reduce((a,b)=>a+b,0)/valid.length;
  document.getElementById('db-stats').innerHTML = `
    <div class="stat-cell"><div class="stat-lbl">Último (${DB_LAST})</div><div class="stat-val ${dbColorCls(lastVal)}">${dbFmt(lastVal, dbMode)}</div></div>
    <div class="stat-cell"><div class="stat-lbl">Mínimo período</div><div class="stat-val neg">${dbFmt(minV, dbMode)}</div></div>
    <div class="stat-cell"><div class="stat-lbl">Máximo período</div><div class="stat-val pos">${dbFmt(maxV, dbMode)}</div></div>
    <div class="stat-cell"><div class="stat-lbl">Promedio período</div><div class="stat-val ${dbColorCls(avg)}">${dbFmt(avg, dbMode)}</div></div>`;
}

function setDbMatrixMode(m){
  dbMxMode = m;
  ['db-mx-btn-pct','db-mx2-btn-pct'].forEach(id=>document.getElementById(id).classList.toggle('active', m==='pct'));
  ['db-mx-btn-usd','db-mx2-btn-usd'].forEach(id=>document.getElementById(id).classList.toggle('active', m==='usd'));
  renderDbTodayMatrix();
  renderDbCompareMatrix();
}

function renderDbMatrix(tblId, row, titleId, titleText){
  const tbl = document.getElementById(tblId);
  if(!row){
    tbl.innerHTML = '<thead><tr><th>Dated Brent</th><th>CO1</th><th>Spread</th></tr></thead><tbody><tr><td colspan="3">—</td></tr></tbody>';
    if(titleId) document.getElementById(titleId).textContent = titleText || 'Spread al —';
    return;
  }
  if(titleId){
    const d = row.Date.split('-'); // YYYY-MM-DD → DD/MM/YYYY
    document.getElementById(titleId).textContent = `Spread al ${d[2]}/${d[1]}/${d[0]}`;
  }
  const sp = dbSpreadValue(row, dbMxMode);
  const spCls = dbColorCls(sp);
  const db = row.DB != null ? '$' + row.DB.toFixed(2) : '—';
  const co1 = row.CO1 != null ? '$' + row.CO1.toFixed(2) : '—';
  tbl.innerHTML = `<thead><tr><th>Dated Brent</th><th>CO1</th><th>Spread</th></tr></thead>
    <tbody><tr><td>${db}</td><td>${co1}</td><td class="${spCls}">${dbFmt(sp, dbMxMode)}</td></tr></tbody>`;
}

function renderDbTodayMatrix(){
  renderDbMatrix('db-matrix-today', DB_TODAY_ROW, 'db-mx-today-title', null);
}

function renderDbCompareMatrix(){
  renderDbMatrix('db-matrix-compare', dbMx2Row, null, null);
}

function setDbMx2Period(period, el){
  document.querySelectorAll('#tab-dated .mx2-period-item').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  const customDate = document.getElementById('db-mx2-custom-date');
  if(period === 'custom'){
    customDate.style.display = 'inline-block';
    if(customDate.value){ dbMx2Row = dbFindRowOnOrBefore(customDate.value); }
    else { customDate.focus(); return; }
  } else {
    customDate.style.display = 'none';
    dbMx2Row = dbFindRowOnOrBefore(subtractPeriod(DB_LAST, period));
  }
  if(dbMx2Row){
    const d = dbMx2Row.Date.split('-');
    document.getElementById('db-mx2-subtitle').textContent = `Comparación con ${d[2]}/${d[1]}/${d[0]}`;
  }
  renderDbCompareMatrix();
}

function onDbMx2CustomDate(){
  const cd = document.getElementById('db-mx2-custom-date');
  if(!cd.value) return;
  dbMx2Row = dbFindRowOnOrBefore(cd.value);
  if(dbMx2Row){
    const d = dbMx2Row.Date.split('-');
    document.getElementById('db-mx2-subtitle').textContent = `Comparación con ${d[2]}/${d[1]}/${d[0]}`;
  }
  renderDbCompareMatrix();
}


// ── EXPOSE GLOBAL HANDLERS ────────────────────────────────────────────────────
window.toggleTheme       = toggleTheme;
window.switchTab         = switchTab;
window.setSpreadMode     = setSpreadMode;
window.setPeriodPill     = setPeriodPill;
window.setMx2Period      = setMx2Period;
window.setMatrixMode     = setMatrixMode;
window.onMatrixCellClick = onMatrixCellClick;
window.setDbMode         = setDbMode;
window.setDbPeriodPill   = setDbPeriodPill;
window.setDbMx2Period    = setDbMx2Period;
window.setDbMatrixMode   = setDbMatrixMode;
window.onDateRangeChange    = onDateRangeChange;
window.onDbDateRangeChange  = onDbDateRangeChange;
window.onDbMx2CustomDate    = onDbMx2CustomDate;
window.onMx2CustomDate      = onMx2CustomDate;
window.renderHeatmap        = renderHeatmap;

// Remove loading overlay once app is ready
(function(){ var ov = document.getElementById('app-loading'); if(ov) ov.remove(); })();

} // ── end initApp ────────────────────────────────────────────────────────────


// ── BOOTSTRAP ────────────────────────────────────────────────────────────────
(function () {
  var overlay = document.getElementById('app-loading');
  if (overlay) overlay.style.display = 'flex';

  var controller = new AbortController();
  var timeoutId  = setTimeout(function () { controller.abort(); }, 15000);

  function showError(msg, detail) {
    clearTimeout(timeoutId);
    var ov = document.getElementById('app-loading');
    if (ov) {
      ov.style.display = 'flex';
      ov.innerHTML =
        '<div style="text-align:center;padding:2rem">' +
          '<p style="color:var(--neg);font-size:1.1rem;margin-bottom:.5rem">⚠ ' + msg + '</p>' +
          (detail ? '<p style="color:var(--text2);font-family:\'JetBrains Mono\',monospace;font-size:.8rem">' + detail + '</p>' : '') +
        '</div>';
    }
  }

  Promise.all([
    fetch('Data/raw.json', { signal: controller.signal }).then(function (r) {
      if (!r.ok) throw new Error('raw.json: HTTP ' + r.status);
      return r.json();
    }),
    fetch('Data/dated-brent.json', { signal: controller.signal }).then(function (r) {
      if (!r.ok) throw new Error('dated-brent.json: HTTP ' + r.status);
      return r.json();
    })
  ])
  .then(function (data) {
    clearTimeout(timeoutId);
    initApp(data[0], data[1]);
  })
  .catch(function (err) {
    var msg = err.name === 'AbortError'
      ? 'Tiempo de espera agotado. Por favor recargue la página.'
      : 'Error al cargar datos. Por favor recargue la página.';
    showError(msg, err.name !== 'AbortError' ? err.message : null);
    console.error('[BreantMonitor] Data load failed:', err);
  });
})();
