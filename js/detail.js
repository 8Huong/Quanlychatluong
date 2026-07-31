function renderDetail(){
  const id = qs('id');
  const root = document.getElementById('detailRoot');
  const row = id ? deAnById(id) : null;

  if(!row){
    root.innerHTML = `
      <div class="panel" style="text-align:center;padding:60px 20px">
        <h2 style="margin-bottom:10px">Không tìm thấy đề án${id ? ` "${escapeHtml(id)}"` : ''}</h2>
        <p style="color:var(--text-2);margin-bottom:18px">Đề án có thể đã bị xoá khỏi Excel hoặc mã không đúng.</p>
        <a class="btn btn-primary" href="index.html">Quay về Dashboard</a>
      </div>`;
    document.title = 'Không tìm thấy đề án · Hồ sơ đề án';
    return;
  }

  document.title = `${row.ma_de_an} · Hồ sơ đề án`;
  document.getElementById('headerId').textContent = row.ma_de_an;

  const goals = mucTieuOf(row.ma_de_an);
  const acts  = hoatDongOf(row.ma_de_an);
  const logs  = tienDoOf(row.ma_de_an).slice().sort((a,b)=> new Date(b.ngay_cap_nhat) - new Date(a.ngay_cap_nhat));

  root.innerHTML = `
    <div class="detail-shell">

      <!-- CORE INFO -->
      <div class="panel">
        <div class="detail-top">
          <div>
            <div class="detail-title">${escapeHtml(row.ten_de_an)}</div>
            <div class="detail-tags">
              <span class="pill-tag">${escapeHtml(row.linh_vuc||'—')}</span>
              ${priorityPill(row.muc_uu_tien)}
            </div>
            <div class="detail-meta">Khoa phụ trách: <b>${escapeHtml(row.khoa_phong||'—')}</b>
              &nbsp;(Chủ nhiệm: <b>${escapeHtml(row.chu_nhiem||'—')}</b>)</div>
          </div>
          <div class="detail-status-box">
            <div class="lbl">Trạng thái</div>
            ${statusBadge(row.status)}
            <div class="deadline">Thời hạn: <b>${fmtDate(row.ngay_ket_thuc)}</b></div>
            <div class="deadline">${escapeHtml(row.daysInfo)}</div>
          </div>
        </div>
      </div>

      <!-- KPI GOALS -->
      <div class="panel">
        <div class="panel-title"><span class="dot"></span>Mục tiêu KPI (Trước / Sau cải tiến)</div>
        <div style="overflow-x:auto">
          <table class="kv-table">
            <thead><tr><th>Mục tiêu</th><th>Chỉ số đo lường</th><th>Trước cải tiến</th><th>Sau cải tiến</th><th>Ngưỡng mong đợi</th><th>Kết quả</th></tr></thead>
            <tbody>
              ${ goals.length === 0 ? emptyRow(6,'Chưa khai báo mục tiêu KPI') : goals.map(g => `
                <tr>
                  <td><b>${escapeHtml(g.muc_tieu)}</b></td>
                  <td>${escapeHtml(g.chi_so||'—')}</td>
                  <td class="value-before">${fmtNum(g.gia_tri_truoc)} ${escapeHtml(g.don_vi||'')}</td>
                  <td class="value-after">${fmtNum(g.gia_tri_sau)} ${escapeHtml(g.don_vi||'')}</td>
                  <td>${fmtNum(g.nguong_muc_tieu)} ${escapeHtml(g.don_vi||'')}</td>
                  <td>${goalResultBadge(g.ket_qua)}</td>
                </tr>`).join('') }
            </tbody>
          </table>
        </div>
      </div>

      <!-- ACTIVITIES -->
      <div class="panel">
        <div class="panel-title"><span class="dot"></span>Chi tiết các Hoạt động (Checklist)</div>
        <div style="overflow-x:auto">
          <table class="kv-table">
            <thead><tr><th>Mã HĐ</th><th>Tên hoạt động</th><th>Người phụ trách</th><th>Trạng thái</th><th>% Hoàn thành</th><th>Minh chứng</th></tr></thead>
            <tbody>
              ${ acts.length === 0 ? emptyRow(6,'Chưa có hoạt động nào được khai báo') : acts.map(a => `
                <tr>
                  <td class="cell-code">${a.ma_hd}</td>
                  <td><b>${escapeHtml(a.ten_hd)}</b></td>
                  <td>${escapeHtml(a.nguoi_phu_trach||'—')}</td>
                  <td>${activityStatusBadge(a.trang_thai)}</td>
                  <td>
                    <div class="checklist-progress">
                      <div class="checklist-track"><div class="checklist-fill" style="width:${Math.round((a.phan_tram||0)*100)}%"></div></div>
                      <span>${fmtPercent(a.phan_tram)}</span>
                    </div>
                  </td>
                  <td style="color:var(--text-2)">${escapeHtml(a.minh_chung||'—')}</td>
                </tr>`).join('') }
            </tbody>
          </table>
        </div>
      </div>

      <!-- PROGRESS LOG -->
      <div class="panel">
        <div class="panel-title"><span class="dot"></span>Nhật ký báo cáo định kỳ (Log)</div>
        ${ logs.length === 0 ? `<div class="report-empty">Chưa có nhật ký báo cáo định kỳ</div>` : logs.map(l => `
          <div class="tienDo-block">
            <div class="tienDo-head">
              <b>${escapeHtml(l.thang || fmtDate(l.ngay_cap_nhat))}</b>
              <span>(${fmtDate(l.ngay_cap_nhat)} · Bởi: ${escapeHtml(l.nguoi_cap_nhat||'—')})</span>
            </div>
            <div class="tienDo-line tag-tiendo"><b>Tiến độ:</b> ${escapeHtml(l.danh_gia||'—')}</div>
            <div class="tienDo-line tag-khokhan"><b>Khó khăn:</b> ${escapeHtml(l.kho_khan||'Không có')}</div>
            <div class="tienDo-line tag-kiennghi"><b>Kiến nghị:</b> ${escapeHtml(l.kien_nghi||'Không có')}</div>
          </div>`).join('') }
      </div>

    </div>
  `;
}

function fmtNum(v){
  if(v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return isNaN(n) ? v : (Number.isInteger(n) ? n : n.toFixed(1));
}
function emptyRow(colspan,text){
  return `<tr class="empty-row"><td colspan="${colspan}">${text}</td></tr>`;
}
const GOAL_RESULT_CLASS = { 'Đạt':'st-hoanthanh', 'Chưa đạt':'st-nguyco', 'Chưa đo':'st-chuabatdau' };
function goalResultBadge(v){
  const cls = GOAL_RESULT_CLASS[v] || 'st-chuabatdau';
  return `<span class="badge ${cls}">${v||'Chưa đo'}</span>`;
}
const ACT_STATUS_CLASS = { 'Hoàn thành':'st-hoanthanh', 'Đang thực hiện':'st-dungtiendo', 'Trễ hạn':'st-treha', 'Chưa bắt đầu':'st-chuabatdau' };
function activityStatusBadge(v){
  const cls = ACT_STATUS_CLASS[v] || 'st-chuabatdau';
  return `<span class="badge ${cls}">${v||'—'}</span>`;
}

function closeTab(){
  window.close();
  // fallback nếu tab không phải do script mở (trình duyệt chặn window.close)
  setTimeout(() => { window.location.href = 'index.html'; }, 250);
}

document.addEventListener('DOMContentLoaded', renderDetail);
