/* =========================================================
   CORE DATA ENGINE
   Tái hiện chính xác logic công thức trong file Excel gốc
   (sheet DeAn, cột M→Q) bằng JavaScript, chạy theo ngày thực
   tế của trình duyệt (giống TODAY() trong Excel).
   ========================================================= */

const DB = window.MASTER_DATA || { khoa:[], dean:[], muctieu:[], hoatdong:[], tiendo:[], actionlog:[] };

/* ---------- date helpers ---------- */
function toDate(s){
  if(!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? null : d;
}
function todayMidnight(){
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}
function daysBetween(a,b){ return Math.round((b - a) / 86400000); }
function fmtDate(s){
  const d = toDate(s);
  if(!d) return '—';
  return d.toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric'});
}
function fmtPercent(frac){
  return Math.round((frac||0)*100) + '%';
}
const TODAY = todayMidnight();

/* ---------- lookups ---------- */
function hoatDongOf(maDeAn){
  return DB.hoatdong.filter(h => h.ma_de_an === maDeAn);
}
function mucTieuOf(maDeAn){
  return DB.muctieu.filter(m => m.ma_de_an === maDeAn);
}
function tienDoOf(maDeAn){
  return DB.tiendo.filter(t => t.ma_de_an === maDeAn);
}

/* ---------- % Hoàn thành (tự động) = AVERAGEIF(HoatDong, ma_de_an, %) ---------- */
function percentHoanThanh(row){
  const acts = hoatDongOf(row.ma_de_an);
  if(acts.length === 0) return 0;
  const sum = acts.reduce((s,a)=> s + (Number(a.phan_tram)||0), 0);
  return sum / acts.length;
}

/* ---------- Tình trạng tiến độ (tự động) ---------- */
function trangThaiTienDo(row, percent){
  if(row.ngay_hoan_thanh_tt) return 'Hoàn thành';
  const start = toDate(row.ngay_bat_dau);
  const end   = toDate(row.ngay_ket_thuc);
  if(!start || !end) return 'Chưa bắt đầu';
  if(TODAY < start) return 'Chưa bắt đầu';
  if(TODAY > end)   return 'Trễ hạn';
  const expected = (daysBetween(start, TODAY) / daysBetween(start, end)) - 0.15;
  if(percent < expected) return 'Có nguy cơ trễ';
  return 'Đúng tiến độ';
}

/* ---------- Số ngày còn lại / trễ (tự động) ---------- */
function soNgayInfo(row){
  const start = toDate(row.ngay_bat_dau);
  const end   = toDate(row.ngay_ket_thuc);
  if(row.ngay_hoan_thanh_tt){
    const done = toDate(row.ngay_hoan_thanh_tt);
    const onTime = end && done <= end;
    return `Hoàn thành (${onTime ? 'đúng/trước hạn' : 'trễ hạn'})`;
  }
  if(!start || !end) return '—';
  if(TODAY < start) return 'Chưa tới ngày bắt đầu';
  if(TODAY > end) return `Trễ ${daysBetween(end, TODAY)} ngày`;
  return `Còn ${daysBetween(TODAY, end)} ngày`;
}

/* ---------- Hoạt động hoàn thành (tự động) = x/y ---------- */
function hoatDongRatio(row){
  const acts = hoatDongOf(row.ma_de_an);
  if(acts.length === 0) return { text:'Chưa có hoạt động', done:0, total:0 };
  const done = acts.filter(a => a.trang_thai === 'Hoàn thành').length;
  return { text:`${done}/${acts.length}`, done, total:acts.length };
}

/* ---------- Cập nhật gần nhất (tự động) = TienDo mới nhất theo ngày ---------- */
function capNhatGanNhat(row){
  const logs = tienDoOf(row.ma_de_an);
  if(logs.length === 0) return 'Chưa có cập nhật';
  let latest = logs[0];
  for(const l of logs){
    if(toDate(l.ngay_cap_nhat) > toDate(latest.ngay_cap_nhat)) latest = l;
  }
  return latest.danh_gia || 'Chưa có cập nhật';
}

/* ---------- gộp toàn bộ dẫn xuất cho 1 đề án ---------- */
function deriveDeAn(row){
  const percent = percentHoanThanh(row);
  const status  = trangThaiTienDo(row, percent);
  return {
    ...row,
    percent,
    status,
    daysInfo: soNgayInfo(row),
    activity: hoatDongRatio(row),
    lastUpdate: capNhatGanNhat(row)
  };
}

/* danh sách đề án đã gộp dẫn xuất, tính 1 lần */
const DEAN_DERIVED = DB.dean.map(deriveDeAn);

function deAnByYear(year){
  if(!year || year === 'all') return DEAN_DERIVED;
  return DEAN_DERIVED.filter(d => String(d.nam) === String(year));
}
function deAnById(id){
  return DEAN_DERIVED.find(d => d.ma_de_an === id);
}
function availableYears(){
  const ys = Array.from(new Set(DB.dean.map(d=>d.nam))).sort((a,b)=>b-a);
  return ys;
}

/* ---------- khoa lookups ---------- */
function khoaByName(ten){
  return DB.khoa.find(k => k.ten_khoa === ten);
}
function khoiOf(ten){
  const k = khoaByName(ten);
  return k ? k.khoi : 'Chưa phân khối';
}

/* =========================================================
   RENDER HELPERS (dùng chung nhiều trang)
   ========================================================= */
const STATUS_CLASS = {
  'Hoàn thành':'st-hoanthanh',
  'Đúng tiến độ':'st-dungtiendo',
  'Có nguy cơ trễ':'st-nguyco',
  'Trễ hạn':'st-treha',
  'Chưa bắt đầu':'st-chuabatdau'
};
function statusBadge(status){
  const cls = STATUS_CLASS[status] || 'st-chuabatdau';
  return `<span class="badge ${cls}">${status}</span>`;
}
const PRIORITY_CLASS = {
  'Cao':'pill-priority-cao',
  'Trung bình':'pill-priority-trungbinh',
  'Thấp':'pill-priority-thap'
};
function priorityPill(p){
  const cls = PRIORITY_CLASS[p] || 'pill-tag';
  return `<span class="pill-tag ${cls}">${p||'—'}</span>`;
}
function escapeHtml(str){
  return String(str??'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* small util to build query param */
function qs(name){
  return new URLSearchParams(window.location.search).get(name);
}
