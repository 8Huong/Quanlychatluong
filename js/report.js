function computeReportStats(year){
  const list = deAnByYear(year);
  const totalKhoa = DB.khoa.length;
  const registeredSet = new Set(list.map(d => d.khoa_phong).filter(n => khoaByName(n)));
  const daDangKy = registeredSet.size;
  const tyLeBaoPhu = totalKhoa ? Math.round((daDangKy/totalKhoa)*100) : 0;
  const dungHan   = list.filter(d => d.status === 'Đúng tiến độ').length;
  const hoanThanh = list.filter(d => d.status === 'Hoàn thành').length;
  const treNguyCo = list.filter(d => d.status === 'Trễ hạn' || d.status === 'Có nguy cơ trễ').length;
  return { list, totalKhoa, daDangKy, tyLeBaoPhu, dungHan, hoanThanh, treNguyCo };
}

function sectionHeader(stats){
  const now = new Date();
  return `
  <div class="report-header">
    <div class="col">
      <b>SỞ Y TẾ THÀNH PHỐ HỒ CHÍ MINH</b>
      <b>BỆNH VIỆN TÂN PHÚ</b>
      <div class="rule"></div>
    </div>
    <div class="col">
      <b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b>
      <b>Độc lập - Tự do - Hạnh phúc</b>
      <div class="rule"></div>
    </div>
  </div>
  <div class="report-title">BÁO CÁO TIẾN ĐỘ ĐỀ ÁN CẢI TIẾN CHẤT LƯỢNG</div>
  <div class="report-sub">Năm ${escapeHtml(String(stats.year))} · TP. Hồ Chí Minh, ngày ${String(now.getDate()).padStart(2,'0')} tháng ${String(now.getMonth()+1).padStart(2,'0')} năm ${now.getFullYear()}</div>
  `;
}

function sectionKpi(stats){
  return `
  <div class="report-section">
    <h4>I. CHỈ SỐ TỔNG QUAN</h4>
    <div class="kpi-mini-grid">
      <div class="kpi-mini"><div class="num">${stats.totalKhoa}</div><div class="lbl">Tổng số khoa/phòng</div></div>
      <div class="kpi-mini"><div class="num">${stats.list.length}</div><div class="lbl">Đề án đã ký duyệt</div></div>
      <div class="kpi-mini"><div class="num">${stats.tyLeBaoPhu}%</div><div class="lbl">Tỷ lệ bao phủ khoa</div></div>
      <div class="kpi-mini"><div class="num">${stats.dungHan}</div><div class="lbl">Đề án đúng tiến độ</div></div>
      <div class="kpi-mini"><div class="num">${stats.hoanThanh}</div><div class="lbl">Số lượng hoàn thành</div></div>
      <div class="kpi-mini"><div class="num">${stats.treNguyCo}</div><div class="lbl">Đề án trễ hạn / nguy cơ</div></div>
    </div>
  </div>`;
}

function sectionKhoi(stats){
  const registeredNames = new Set(stats.list.map(d => d.khoa_phong));
  const khoiMap = {};
  DB.khoa.forEach(k => {
    if(!khoiMap[k.khoi]) khoiMap[k.khoi] = { total:0, registered:0 };
    khoiMap[k.khoi].total++;
    if(registeredNames.has(k.ten_khoa)) khoiMap[k.khoi].registered++;
  });
  const rows = Object.entries(khoiMap).map(([khoi,v]) => `
    <tr>
      <td>${escapeHtml(khoi)}</td>
      <td style="text-align:center">${v.registered} / ${v.total} khoa</td>
      <td style="text-align:center">${v.total ? Math.round((v.registered/v.total)*100) : 0}%</td>
    </tr>`).join('');
  return `
  <div class="report-section">
    <h4>II. TÌNH HÌNH ĐĂNG KÝ THEO KHỐI CHUYÊN MÔN</h4>
    <table class="report-table">
      <thead><tr><th style="text-align:left">Tên khối chuyên môn</th><th>Số khoa đã đăng ký đề án</th><th>Tỷ lệ bao phủ (%)</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="3" style="text-align:center">Chưa có dữ liệu</td></tr>`}</tbody>
    </table>
  </div>`;
}

function sectionTreHan(stats){
  const rows = stats.list.filter(d => d.status === 'Trễ hạn' || d.status === 'Có nguy cơ trễ');
  const body = rows.map(d => `
    <tr>
      <td class="cell-code">${d.ma_de_an}</td>
      <td style="text-align:left">${escapeHtml(d.ten_de_an)}</td>
      <td>${escapeHtml(d.khoa_phong||'—')}</td>
      <td>${escapeHtml(d.status)}</td>
    </tr>`).join('');
  return `
  <div class="report-section">
    <h4>III. DANH SÁCH CÁC ĐỀ ÁN TRỄ HẠN / CÓ NGUY CƠ CAO</h4>
    <table class="report-table">
      <thead><tr><th>Mã đề án</th><th style="text-align:left">Tên đề án</th><th>Khoa/Phòng</th><th>Tình trạng</th></tr></thead>
      <tbody>${body || `<tr><td colspan="4" style="text-align:center">Không có đề án trễ hạn hoặc nguy cơ trong năm này</td></tr>`}</tbody>
    </table>
  </div>`;
}

function sectionFullTable(stats){
  const body = stats.list.slice().sort((a,b)=>a.ma_de_an.localeCompare(b.ma_de_an)).map(d => `
    <tr>
      <td class="cell-code">${d.ma_de_an}</td>
      <td style="text-align:left">${escapeHtml(d.ten_de_an)}</td>
      <td>${escapeHtml(d.khoa_phong||'—')}</td>
      <td>${fmtPercent(d.percent)}</td>
      <td>${escapeHtml(d.status)}</td>
    </tr>`).join('');
  return `
  <div class="report-section">
    <h4>IV. BẢNG TỔNG HỢP CHI TIẾT TOÀN BỘ ĐỀ ÁN</h4>
    <table class="report-table">
      <thead><tr><th>Mã</th><th style="text-align:left">Tên đề án</th><th>Khoa phụ trách</th><th>% Tiến độ</th><th>Đánh giá</th></tr></thead>
      <tbody>${body || `<tr><td colspan="5" style="text-align:center">Chưa có đề án nào trong năm này</td></tr>`}</tbody>
    </table>
  </div>`;
}

function sectionActionLog(){
  const logs = DB.actionlog.slice().sort((a,b)=> new Date(b.ngay) - new Date(a.ngay)).slice(0,10);
  const body = logs.map(l => `
    <tr>
      <td>${fmtDate(l.ngay)}</td>
      <td>${escapeHtml(l.khoa)}</td>
      <td style="text-align:left">${escapeHtml(l.noi_dung)}</td>
      <td style="text-align:left">${escapeHtml(l.ket_qua||'—')}</td>
    </tr>`).join('');
  return `
  <div class="report-section">
    <h4>V. NHẬT KÝ SỰ KIỆN GẦN ĐÂY</h4>
    <table class="report-table">
      <thead><tr><th>Ngày</th><th>Khoa</th><th style="text-align:left">Nội dung</th><th style="text-align:left">Kết quả</th></tr></thead>
      <tbody>${body || `<tr><td colspan="4" style="text-align:center">Chưa có nhật ký</td></tr>`}</tbody>
    </table>
  </div>`;
}

function sectionSignature(){
  return `
  <div class="report-footer-sign">
    <div class="box"><b>PHÒNG KẾ HOẠCH TỔNG HỢP</b>(Ký, ghi rõ họ tên)</div>
  </div>`;
}

function renderReport(){
  const year = document.getElementById('reportYear').value;
  const stats = computeReportStats(year);
  stats.year = year;

  const parts = [];
  if(document.getElementById('chkHeader').checked) parts.push(sectionHeader(stats));
  if(document.getElementById('chkKpi').checked)    parts.push(sectionKpi(stats));
  if(document.getElementById('chkKhoi').checked)   parts.push(sectionKhoi(stats));
  if(document.getElementById('chkTre').checked)    parts.push(sectionTreHan(stats));
  if(document.getElementById('chkFull').checked)   parts.push(sectionFullTable(stats));
  if(document.getElementById('chkLog').checked)    parts.push(sectionActionLog());
  if(document.getElementById('chkHeader').checked) parts.push(sectionSignature());

  document.getElementById('reportPaper').innerHTML = parts.join('\n') ||
    `<div class="report-empty">Chọn ít nhất một mục ở khung bên trái để xem trước báo cáo.</div>`;
}

function exportWord(){
  const content = document.getElementById('reportPaper').innerHTML;
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>Báo cáo</title>
    <style>
      body{ font-family:'Times New Roman',serif; font-size:13px; }
      table{ border-collapse:collapse; width:100%; margin-bottom:14px; }
      th,td{ border:1px solid #999; padding:6px 8px; }
      th{ background:#f0f0f0; }
      .report-header{ display:flex; justify-content:space-between; }
      .report-title{ text-align:center; font-size:18px; font-weight:bold; margin:20px 0 4px; }
      .report-sub{ text-align:center; margin-bottom:20px; }
      h4{ border-left:4px solid #14508C; padding-left:8px; }
      .kpi-mini-grid{ display:table; width:100%; }
    </style></head>
    <body>${content}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type:'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BaoCao_TienDoDeAn_${document.getElementById('reportYear').value}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initReportYear(){
  const sel = document.getElementById('reportYear');
  const years = availableYears();
  sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  const urlYear = qs('year');
  sel.value = (urlYear && years.includes(Number(urlYear))) ? urlYear : years[0];
}

document.addEventListener('DOMContentLoaded', () => {
  initReportYear();
  document.querySelectorAll('.report-sidebar input, #reportYear').forEach(el => {
    el.addEventListener('change', renderReport);
  });
  document.getElementById('btnWord').addEventListener('click', exportWord);
  document.getElementById('btnPdf').addEventListener('click', () => window.print());
  renderReport();
});
