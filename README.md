# Dashboard Quản lý Đề án Cải tiến Chất lượng — Bệnh viện Tân Phú

Website tĩnh (HTML/CSS/JS thuần, không cần cài đặt gì để chạy) đọc dữ liệu từ file
Excel "Master" của bệnh viện và hiển thị thành:

1. **`index.html`** — Dashboard tổng quan: 6 chỉ số KPI, biểu đồ phân bố tình trạng,
   xu hướng số đề án theo năm, lĩnh vực cải tiến, độ phủ theo khối chuyên môn,
   danh sách chi tiết có tìm kiếm, và nhật ký hoạt động.
2. **`report.html`** — Trình tạo báo cáo có thể tuỳ biến từng mục, xuất **Word (.doc)**
   hoặc **in/lưu PDF** (qua hộp thoại in của trình duyệt).
3. **`detail.html`** — Hồ sơ chi tiết từng đề án (mục tiêu KPI trước/sau cải tiến,
   checklist hoạt động, nhật ký báo cáo định kỳ). Mở qua `detail.html?id=DA2026-01`.

Toàn bộ số liệu tính toán (**% hoàn thành, tình trạng tiến độ, số ngày còn lại/trễ,
tỷ lệ hoạt động hoàn thành, cập nhật gần nhất**) được viết lại **y hệt công thức
trong file Excel gốc** (cột M→Q của sheet `DeAn`), chạy bằng JavaScript theo ngày
thực tế của người xem — giống hệt cách `TODAY()` hoạt động trong Excel.

## Cấu trúc thư mục

```
├── index.html              Trang Dashboard
├── report.html              Trang tạo báo cáo
├── detail.html               Trang hồ sơ đề án
├── css/style.css             Toàn bộ giao diện (tokens màu, layout, badge, in ấn)
├── js/
│   ├── data.js                Dữ liệu (tạo tự động từ Excel — KHÔNG sửa tay)
│   ├── app.js                 "Bộ não" tính toán — thay thế công thức Excel
│   ├── dashboard.js            Logic riêng trang Dashboard
│   ├── detail.js                Logic riêng trang Hồ sơ đề án
│   └── report.js                Logic riêng trang Báo cáo
├── data/data.json             Dữ liệu thô dạng JSON (để debug / import Firebase sau này)
└── scripts/excel_to_json.py   Script Python: Excel → data.json + data.js
```

## Cách xem thử ngay trên máy

Không cần cài gì — chỉ cần một máy chủ tĩnh đơn giản (bắt buộc phải dùng server,
không mở trực tiếp file vì trình duyệt sẽ chặn tải file JS cục bộ qua `file://`):

```bash
cd hospital-dashboard
python3 -m http.server 8000
# rồi mở http://localhost:8000/index.html
```

## Khi có dữ liệu Excel mới → cập nhật website

1. Cập nhật file Excel Master như bình thường.
2. Chạy lại script chuyển đổi:
   ```bash
   pip install openpyxl        # chỉ cần chạy 1 lần
   python3 scripts/excel_to_json.py "duong_dan/Quan_ly_De_an_Cai_tien_Chat_luong.xlsx"
   ```
3. Script sẽ ghi đè `data/data.json` và `js/data.js`. Commit + push (hoặc upload lại)
   là website cập nhật ngay — **không cần sửa code**.

> Mẹo: có thể nhờ Claude chạy bước 2 giúp mỗi khi bạn gửi file Excel mới.

## Đưa lên GitHub Pages (miễn phí, có link truy cập online)

1. Tạo repository mới trên GitHub, ví dụ `bv-tanphu-dean`.
2. Đẩy toàn bộ nội dung thư mục này lên repo đó:
   ```bash
   git init
   git add .
   git commit -m "Khởi tạo dashboard quản lý đề án"
   git branch -M main
   git remote add origin https://github.com/<ten-user>/bv-tanphu-dean.git
   git push -u origin main
   ```
3. Vào **Settings → Pages** của repo → chọn nguồn **Deploy from a branch** →
   branch `main`, thư mục `/root` → Save.
4. Sau 1–2 phút, website sẽ có ở `https://<ten-user>.github.io/bv-tanphu-dean/`.

Mỗi lần chạy lại `excel_to_json.py` và `git push`, trang web online sẽ tự cập nhật.

## Về việc dùng Firebase (tuỳ chọn nâng cấp sau)

Bản hiện tại là **website tĩnh**: dữ liệu là một "ảnh chụp" của Excel tại thời điểm
chạy script — phù hợp nếu Phòng KHTH vẫn muốn giữ Excel làm nguồn dữ liệu chính và
chỉ cập nhật web định kỳ (tuần/tháng).

Nếu sau này muốn **nhiều người cùng sửa dữ liệu trực tiếp trên web** (không cần mở
Excel, không cần chạy lại script) thì có thể nâng cấp sang **Firebase Firestore**
làm database thật: mỗi bảng (`DeAn`, `HoatDong`, `Muctieu`, `TienDo`, `Actionlog`)
trở thành 1 collection, các trang `index.html` / `detail.html` sẽ đọc/ghi trực tiếp
qua Firestore SDK thay vì đọc `js/data.js`. Toàn bộ giao diện và công thức tính toán
trong `js/app.js` có thể tái sử dụng gần như nguyên vẹn.

Việc này cần bạn tạo một **dự án Firebase miễn phí** (console.firebase.google.com)
và cung cấp thông tin cấu hình (`firebaseConfig`) — báo lại nếu bạn muốn triển khai
hướng này, mình sẽ viết phần tích hợp cụ thể.

## Yêu cầu hệ thống

- Trình duyệt hiện đại (Chrome, Edge, Firefox…), không cần cài đặt phần mềm.
- Chỉ cần Python 3 + `pip install openpyxl` khi cần chạy lại script cập nhật dữ liệu.
- Biểu đồ dùng thư viện [Chart.js](https://www.chartjs.org/) tải qua CDN — máy xem
  web cần có kết nối Internet để hiển thị biểu đồ và font chữ.
