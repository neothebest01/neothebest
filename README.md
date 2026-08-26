# 🚀 Neo Discord Selfbot

Selfbot Discord hiện đại, tối ưu được viết bằng **Node.js** và thư viện `discord.js-selfbot-v13`.

## 📌 Tính năng nổi bật

- 🎨 **Custom Rich Presence (RPC)**: Phát trực tuyến (Streaming), Chơi game (Playing), Nghe nhạc, Trạng thái tùy chỉnh có ảnh lớn/nhỏ.
- 💬 **Hệ thống Lệnh tự động ($prefix)**:
  - `$ping`: Kiểm tra latency tới server Discord.
  - `$status <details> | <state>`: Thay đổi nội dung Rich Presence ngay lập tức.
  - `$afk <on/off> [lý do]`: Tự động phản hồi tin nhắn khi bạn bận/AFK.
  - `$purge <số lượng>`: Xóa nhanh tin nhắn của chính bạn trong kênh.
  - `$help`: Xem danh sách tất cả các lệnh.
- ⚡ **Auto-Responder**: Tự động trả lời theo từ khóa cài sẵn trong `config.json`.

---

## 🛠️ Hướng dẫn Cài đặt & Khởi chạy

### 1. Cài đặt các thư viện cần thiết

Mở Terminal tại thư mục này và chạy lệnh:

```bash
npm install
```

### 2. Cấu hình User Token

1. Mở file `config.json`.
2. Thay thế `YOUR_DISCORD_TOKEN_HERE` bằng **User Token** của bạn.

> 💡 **Cách lấy Discord User Token:**
>
> 1. Mở Discord trên trình duyệt (Chrome/Edge/Firefox).
> 2. Nhấn `F12` (hoặc `Ctrl + Shift + I`) để mở Developer Tools.
> 3. Chuyển sang tab **Console**.
> 4. Dán đoạn mã sau vào Console và nhấn Enter:
>    ```javascript
>    window.webpackChunkdiscord_app.push([
>      [Math.random()],
>      {},
>      (e) => {
>        for (const m of Object.values(e.c)) {
>          if (m?.exports?.default?.getToken !== void 0)
>            return console.log(m.exports.default.getToken());
>        }
>      },
>    ]);
>    ```
> 5. Copy chuỗi Token hiện ra và dán vào `config.json`.

### 3. Khởi chạy Selfbot

```bash
npm start
```

---

_Lưu ý: Không bao giờ chia sẻ User Token của bạn cho bất kỳ ai._
