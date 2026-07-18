# HƯỚNG DẪN TRIỂN KHAI ỨNG DỤNG LÊN HOSTING CỦA RIÊNG BẠN 🚀

Ứng dụng **Sổ tay đệm hát thông minh** đã được phát triển dưới dạng **Full-stack (React Vite + Node.js Express)** kèm theo cơ sở dữ liệu dạng file JSON độc lập, gọn nhẹ (`data/db.json`). Điều này giúp bạn dễ dàng chạy và kiểm soát dữ liệu trên hosting của riêng mình mà không bị phụ thuộc vào môi trường Google Apps Script phức tạp.

---

## 📂 BƯỚC 1: TẢI MÃ NGUỒN (XUẤT FILE ZIP) Từ AI Studio
Để tải toàn bộ dự án về máy tính hoặc chuẩn bị upload lên hosting:
1. Nhìn lên góc trên bên phải giao diện **Google AI Studio**.
2. Nhấn vào biểu tượng **Settings (Răng cưa)** hoặc menu cài đặt của phòng chat.
3. Chọn tùy chọn **Export to ZIP** (Xuất thành file nén .ZIP) để tải toàn bộ mã nguồn sạch của dự án về máy tính của bạn.

---

## 🛠️ BƯỚC 2: CÁCH TRIỂN KHAI LÊN HOSTING NODE.JS

Ứng dụng sử dụng máy chủ Node.js Express để chạy API và lưu trữ dữ liệu. Bạn có thể sử dụng bất kỳ nhà cung cấp hosting nào hỗ trợ Node.js (như **VPS Linux, Hostinger Node.js, Render.com, Railway.app, hoặc cPanel Node.js Selector**).

### Cách chạy thủ công bằng dòng lệnh (Dành cho VPS hoặc máy cá nhân):
1. **Giải nén** file ZIP mã nguồn đã tải ở Bước 1 vào thư mục trên hosting/máy của bạn.
2. Đảm bảo bạn đã cài đặt **Node.js** (Khuyên dùng phiên bản LTS v18 trở lên).
3. Mở Terminal / Command Prompt tại thư mục dự án và chạy lệnh sau để cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```
4. Đóng gói toàn bộ ứng dụng (Vite biên dịch giao diện, esbuild biên dịch server) thành một thư mục sản xuất gọn nhẹ `dist/`:
   ```bash
   npm run build
   ```
5. Khởi động ứng dụng của bạn ở chế độ Production:
   ```bash
   npm run start
   ```
   *Lúc này ứng dụng sẽ tự động chạy và lắng nghe ở cổng port được cấu hình bởi hosting của bạn (mặc định là cổng `3000`).*

---

### Cách triển khai trên cPanel Node.js Selector (Hosting mua sẵn như Hostinger, Mắt Bão, AZDIGI...):
Nếu bạn dùng hosting có giao diện quản lý cPanel:
1. **Upload và Giải nén** file ZIP mã nguồn lên thư mục trên hosting.
2. Vào mục **Setup Node.js App** trên cPanel.
3. Nhấp vào **Create Application** và điền các thông tin:
   - **Node.js version**: Chọn phiên bản `18.x` hoặc mới hơn.
   - **Application mode**: Chọn `Production`.
   - **Application root**: Điền thư mục chứa mã nguồn của bạn.
   - **Application URL**: Địa chỉ web của bạn (ví dụ: `https://lopnhachuynhlong.vn`).
   - **Application startup file**: Nhập đường dẫn: `dist/server.cjs`
4. Nhấn **Save**, sau đó nhấn nút **Run NPM Install** ở phần quản trị để cài đặt thư viện tự động.
5. Tạo một Terminal trong cPanel hoặc dùng SSH gõ lệnh `npm run build` để biên dịch ứng dụng.
6. Nhấp vào **Restart application** để kích hoạt trang web chạy chính thức!

---

## 💾 BƯỚC 3: CÁCH QUẢN LÝ & SAO LƯU DỮ LIỆU

- **Nơi lưu trữ**: Tất cả danh sách học viên, lớp học, bài hát, điểm danh và học phí được lưu trữ hoàn toàn an toàn và riêng tư trong file:
  `data/db.json` (nằm ngay trong thư mục ứng dụng của bạn).
- **Sao lưu (Backup)**: Bạn chỉ cần tải file `data/db.json` này về máy tính để sao lưu toàn bộ dữ liệu hệ thống bất cứ lúc nào. Khi muốn khôi phục, chỉ cần ghi đè file `db.json` này lên hosting.
- **Tính năng Đồng bộ Google Sheets**:
  Trong giao diện quản trị (Admin), bạn có thể đăng nhập bằng tài khoản Google, chọn Google Sheet của bạn để tải/nhập trực tiếp dữ liệu học viên, lớp học và bài hát vào file `db.json` cục bộ một cách nhanh chóng và tự động.

---

Chúc bạn triển khai thành công! Nếu gặp bất kỳ khó khăn nào trong quá trình cài đặt trên hosting, hãy liên hệ tôi để tôi hướng dẫn chi tiết thêm nhé! 🎶
