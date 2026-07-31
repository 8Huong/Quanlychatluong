/* =========================================================
   DASHBOARD PAGE
   ========================================================= */
let charts = {}; // giữ instance Chart.js để destroy khi vẽ lại

const STATUS_COLORS = {
  'Có nguy cơ trễ': '#E08E1D',
  'Trễ hạn':        '#DD3B3B',
  'Hoàn thành':     '#17A363',
  'Đúng tiến độ':   '#0E9C8C',
  'Chưa bắt đầu':   '#8B98AE'
};
const KHOI_COLORS = ['#6D4FD1','#0891B2','#17A363','#E08E1D','#DD3B3B','#14508C'];

function initYearSelect(){
  const sel = document.getElementById('yearSelect');
  const years = availableYears();
  sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  const urlYear = qs('year');
  sel.value = (urlYear && years.includes(Number(urlYear))) ? urlYear : years[0];
  sel.addEventListener('change', () => renderAll(sel.value));
  return sel.value;
}

function renderKpis(year){
  const list = deAnByYear(year);
  const totalKhoa = DB.khoa.length;
  const registeredSet = new Set(list.map(d => d.khoa_phong).filter(n => khoaByName(n)));
  const daDangKy = registeredSet.size;
  const chuaDangKy = Math.max(totalKhoa - daDangKy, 0);
  const dungTienDo = list.filter(d => d.status === 'Đúng tiến độ').length;
  const treNguyCo  = list.filter(d => d.status === 'Trễ hạn' || d.status === 'Có nguy cơ trễ').length;
  const hoanThanh  = list.filter(d => d.status === 'Hoàn thành').length;

  document.getElementById('kpiTotalKhoa').textContent = totalKhoa;
  document.getElementById('kpiDaDangKy').textContent = daDangKy;
  document.getElementById('kpiChuaDangKy').textContent = chuaDangKy;
  document.getElementById('kpiDungTienDo').textContent = dungTienDo;
  document.getElementById('kpiTreNguyCo').textContent = treNguyCo;
  document.getElementById('kpiHoanThanh').textContent = hoanThanh;
}

function renderDonut(year){
  const list = deAnByYear(year);
  const order = ['Có nguy cơ trễ','Trễ hạn','Hoàn thành','Đúng tiến độ','Chưa bắt đầu'];
  const counts = order.map(s => list.filter(d => d.status === s).length);
  const ctx = document.getElementById('chartDonut');
  const legendEl = document.getElementById('donutLegend');

  legendEl.innerHTML = order.map((s,i) => `
    <li><i style="background:${STATUS_COLORS[s]}"></i>${s} (${counts[i]})</li>
  `).join('');

  if(charts.donut) charts.donut.destroy();
  charts.donut = new Chart(ctx, {
    type:'doughnut',
    data:{ labels:order, datasets:[{ data:counts, backgroundColor:order.map(s=>STATUS_COLORS[s]), borderWidth:3, borderColor:'#fff' }]},
    options:{
      cutout:'68%',
      plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(c)=> `${c.label}: ${c.raw} đề án` } } },
      maintainAspectRatio:false
    }
  });
}

function renderTrendLine(){
  const years = availableYears().slice().sort((a,b)=>a-b);
  const counts = years.map(y => DB.dean.filter(d => d.nam === y).length);
  const ctx = document.getElementById('chartTrend');
  if(charts.trend) charts.trend.destroy();
  charts.trend = new Chart(ctx, {
    type:'line',
    data:{ labels:years, datasets:[{
      data:counts, borderColor:'#0E9C8C', backgroundColor:'rgba(14,156,140,.12)',
      fill:true, tension:.35, pointRadius:5, pointBackgroundColor:'#0E9C8C', pointBorderColor:'#fff', pointBorderWidth:2, borderWidth:2.5
    }]},
    options:{
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(c)=> `${c.raw} đề án` } } },
      scales:{ y:{ beginAtZero:true, ticks:{ precision:0 }, grid:{ color:'#EEF2F7' } }, x:{ grid:{ display:false } } },
      maintainAspectRatio:false
    }
  });
}

function renderLinhVuc(year){
  const list = deAnByYear(year);
  const map = {};
  list.forEach(d => { map[d.linh_vuc] = (map[d.linh_vuc]||0) + 1; });
  const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const max = Math.max(1, ...entries.map(e=>e[1]));
  const el = document.getElementById('linhVucList');
  if(entries.length === 0){ el.innerHTML = `<div class="report-empty">Chưa có dữ liệu</div>`; return; }
  el.innerHTML = entries.map(([name,count]) => `
    <div class="hbar-row">
      <div class="hbar-label">${escapeHtml(name)}</div>
      <div class="hbar-track"><div class="hbar-fill" style="width:${(count/max)*100}%"></div></div>
      <div class="hbar-value">${count}</div>
    </div>
  `).join('');
}

function renderKhoiChuyenMon(year){
  const list = deAnByYear(year);
  const registeredNames = new Set(list.map(d => d.khoa_phong));
  const khoiMap = {};
  DB.khoa.forEach(k => {
    if(!khoiMap[k.khoi]) khoiMap[k.khoi] = { total:0, registered:0 };
    khoiMap[k.khoi].total++;
    if(registeredNames.has(k.ten_khoa)) khoiMap[k.khoi].registered++;
  });
  const entries = Object.entries(khoiMap);
  const el = document.getElementById('khoiList');
  if(entries.length === 0){ el.innerHTML = `<div class="report-empty">Chưa có dữ liệu</div>`; return; }
  el.innerHTML = entries.map(([khoi,v],i) => {
    const pct = v.total ? (v.registered / v.total) * 100 : 0;
    return `
    <div class="khoi-row">
      <div class="khoi-top"><b>${escapeHtml(khoi)}</b><span>${v.registered}/${v.total}</span></div>
      <div class="khoi-track"><div class="khoi-fill" style="width:${pct}%;background:${KHOI_COLORS[i % KHOI_COLORS.length]}"></div></div>
    </div>`;
  }).join('');
}

let currentTableData = [];
function renderTable(year){
  currentTableData = deAnByYear(year).slice().sort((a,b)=> a.ma_de_an.localeCompare(b.ma_de_an));
  applyTableFilter();
}
function applyTableFilter(){
  const q = (document.getElementById('tableSearch').value || '').trim().toLowerCase();
  const rows = currentTableData.filter(d =>
    !q ||
    d.ma_de_an.toLowerCase().includes(q) ||
    (d.ten_de_an||'').toLowerCase().includes(q) ||
    (d.khoa_phong||'').toLowerCase().includes(q)
  );
  const tbody = document.getElementById('tableBody');
  if(rows.length === 0){
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Không tìm thấy đề án phù hợp</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(d => `
    <tr onclick="window.open('detail.html?id=${encodeURIComponent(d.ma_de_an)}','_blank')">
      <td><span class="cell-code">${d.ma_de_an}</span></td>
      <td>
        <div class="cell-title">${escapeHtml(d.ten_de_an)}</div>
        <div class="cell-sub">${escapeHtml(d.linh_vuc||'')}</div>
      </td>
      <td>${escapeHtml(d.khoa_phong||'—')}</td>
      <td>
        <div class="progress-wrap">
          <div class="progress-mini"><div class="progress-mini-fill" style="width:${Math.round(d.percent*100)}%"></div></div>
          <div class="progress-mini-text">${fmtPercent(d.percent)}</div>
        </div>
      </td>
      <td>${statusBadge(d.status)}</td>
    </tr>
  `).join('');
}

function renderActionLog(){
  const el = document.getElementById('actionLog');
  const logs = DB.actionlog.slice().sort((a,b)=> new Date(b.ngay) - new Date(a.ngay));
  if(logs.length === 0){ el.innerHTML = `<div class="report-empty">Chưa có nhật ký</div>`; return; }
  el.innerHTML = logs.map(l => `
    <li class="log-item">
      <div class="log-text">${escapeHtml(l.noi_dung)}</div>
      <div class="log-meta">${fmtDate(l.ngay)} · ${escapeHtml(l.khoa)}</div>
      ${l.ket_qua ? `<div class="log-result">→ ${escapeHtml(l.ket_qua)}</div>` : ''}
    </li>
  `).join('');
}

function syncPanelVisibility(){
  document.getElementById('panelDonut').style.display = document.getElementById('togStatus').checked ? '' : 'none';
  document.getElementById('panelTrend').style.display  = document.getElementById('togTrend').checked  ? '' : 'none';
  document.getElementById('panelLinhVuc').style.display = document.getElementById('togLinhVuc').checked ? '' : 'none';
  document.getElementById('panelKhoi').style.display   = document.getElementById('togKhoi').checked   ? '' : 'none';
}

function renderAll(year){
  renderKpis(year);
  renderDonut(year);
  renderTrendLine();
  renderLinhVuc(year);
  renderKhoiChuyenMon(year);
  renderTable(year);
  renderActionLog();
  const link = document.getElementById('reportLink');
  if(link) link.href = `report.html?year=${encodeURIComponent(year)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const year = initYearSelect();
  ['togStatus','togTrend','togLinhVuc','togKhoi'].forEach(id => {
    document.getElementById(id).addEventListener('change', syncPanelVisibility);
  });
  document.getElementById('tableSearch').addEventListener('input', applyTableFilter);
  syncPanelVisibility();
  renderAll(year);
});
