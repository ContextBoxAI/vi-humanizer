// Interface strings. The prompts sent to the model stay Vietnamese whatever the interface language is.

export const TONES = [
  { id: "natural", vi: "Tự nhiên", en: "Natural",
    prompt: "Viết lại đoạn sau cho tự nhiên, như người Việt thật viết, giữ nguyên thông tin:\n\n{t}" },
  { id: "chat", vi: "Nhắn tin", en: "Texting",
    prompt: "Viết lại đoạn sau theo giọng nhắn tin thân mật, giữ nguyên thông tin:\n\n{t}" },
  { id: "formal", vi: "Trang trọng", en: "Formal",
    prompt: "Viết lại đoạn sau theo giọng trang trọng, lịch sự, giữ nguyên thông tin:\n\n{t}" },
  { id: "short", vi: "Gọn hơn", en: "Shorter",
    prompt: "Viết lại đoạn sau cho gọn hơn mà vẫn đủ ý:\n\n{t}" },
  { id: "translate", vi: "Dịch sang tiếng Việt", en: "Into Vietnamese",
    prompt: "Dịch đoạn sau sang tiếng Việt tự nhiên, như người Việt viết:\n\n{t}" },
];

export const EXAMPLES = [
  "Cuối tuần này ở Đà Lạt nên đi đâu chơi cho đỡ đông vậy?",
  "Viết giúp mình tin nhắn xin sếp nghỉ chiều nay để đưa con đi khám, giọng lịch sự nhưng không quá cứng.",
  "Giải thích lãi suất kép cho học sinh lớp 9 hiểu, có ví dụ bằng tiền.",
  "Mình có 15 triệu, nên mua laptop cũ hay máy tính bảng để học online?",
];

export const SAMPLE_DRAFT = `Chào chị Mai,

Em xin chân thành cảm ơn chị đã dành thời gian quý báu tham gia buổi demo phần mềm của chúng em vào ngày 20/1 vừa qua. Những câu hỏi sâu sắc từ chị và đội vận hành Northstar, đặc biệt xoay quanh vấn đề phân quyền người dùng và tích hợp với Salesforce, thực sự vô cùng giá trị.

Em muốn chủ động liên hệ để xem liệu đội ngũ của chị có cần một bảng báo giá chi tiết trong quá trình đánh giá các bước tiếp theo hay không. Chúng em có thể cung cấp chi phí theo từng loại giấy phép, dịch vụ triển khai, đào tạo và các tiện ích bổ sung tùy chọn cho các mức 25, 50 hoặc 100 người dùng.

Nếu hữu ích, em có thể gửi bảng báo giá trước thứ Sáu 24/1, hoặc sắp xếp một cuộc gọi ngắn 20 phút để trao đổi trực tiếp.

Trân trọng,
Lê Minh`;

const S = {
  vi: {
    tabRewrite: "Viết lại", tabChat: "Trò chuyện",
    draft: "Bản nháp", draftSub: "văn bản AI viết", rewrite: "Bản viết lại", rewriteSub: "đọc như người viết",
    words: "từ", chars: "ký tự", changed: "đã đổi",
    draftPlaceholder: "Dán đoạn văn do AI viết vào đây. Ctrl/⌘ + Enter để viết lại.",
    rewriteEmpty: "Bản viết lại hiện ở đây. Mọi con số, ngày, giờ được đối chiếu lại với bản nháp.",
    paste: "Dán", clear: "Xóa", sample: "Thử đoạn mẫu", edit: "Sửa bản nháp", cut: "bỏ đi", added: "thêm vào",
    go: "Viết lại", stop: "Dừng", regenerate: "Viết lại lần nữa", copy: "Sao chép", copied: "Đã chép",
    showChanges: "Hiện thay đổi", tone: "Giọng",
    numbers: "Số liệu", numbersNone: "Không có số liệu", numbersLost: "mất", numbersNew: "mới",
    statusReady: "Sẵn sàng", statusOff: "Chưa kết nối", statusChecking: "Đang kết nối",
    chatEmpty: "Hỏi gì cũng được: giải thích, tư vấn, viết email, viết bài đăng.",
    chatPlaceholder: "Nhập câu hỏi… Enter để gửi, Shift + Enter để xuống dòng",
    send: "Gửi", newChat: "Cuộc trò chuyện mới", tryAsking: "Thử hỏi",
    settings: "Cài đặt", api: "Địa chỉ máy chủ (OpenAI-compatible)", apiHint: "Để trống khi chạy bằng install.sh.",
    model: "Tên mô hình", temperature: "Độ sáng tạo", system: "Lời dặn cho trợ lý (chỉ áp dụng khi trò chuyện)",
    systemPlaceholder: "Ví dụ: Bạn là trợ lý chăm sóc khách hàng của tiệm bánh Hạnh Phúc.",
    save: "Lưu", close: "Đóng", theme: "Đổi giao diện sáng/tối", lang: "Ngôn ngữ giao diện",
    errNoText: "Dán đoạn văn cần viết lại trước đã.", errEmpty: "Mô hình không trả lời, thử lại nhé.",
    errConnect: "Không kết nối được tới mô hình ở", local: "chạy trên máy",
  },
  en: {
    tabRewrite: "Rewrite", tabChat: "Chat",
    draft: "Draft", draftSub: "what the AI wrote", rewrite: "Rewrite", rewriteSub: "reads like a person",
    words: "words", chars: "chars", changed: "changed",
    draftPlaceholder: "Paste the AI-written text here. Ctrl/⌘ + Enter to rewrite.",
    rewriteEmpty: "The rewrite shows up here. Every number, date and time is checked against the draft.",
    paste: "Paste", clear: "Clear", sample: "Try a sample", edit: "Edit draft", cut: "cut", added: "added",
    go: "Rewrite", stop: "Stop", regenerate: "Regenerate", copy: "Copy", copied: "Copied",
    showChanges: "Show changes", tone: "Tone",
    numbers: "Numbers", numbersNone: "No numbers", numbersLost: "lost", numbersNew: "new",
    statusReady: "Ready", statusOff: "Not connected", statusChecking: "Connecting",
    chatEmpty: "Ask anything: explanations, advice, emails, posts. Answers come in natural Vietnamese.",
    chatPlaceholder: "Ask something… Enter to send, Shift + Enter for a new line",
    send: "Send", newChat: "New chat", tryAsking: "Try asking",
    settings: "Settings", api: "Server address (OpenAI-compatible)", apiHint: "Leave empty when started with install.sh.",
    model: "Model name", temperature: "Temperature", system: "Instructions for the assistant (chat only)",
    systemPlaceholder: "E.g. You are the customer service assistant of Hạnh Phúc bakery.",
    save: "Save", close: "Close", theme: "Toggle light/dark", lang: "Interface language",
    errNoText: "Paste the text to rewrite first.", errEmpty: "The model gave no answer, try again.",
    errConnect: "Could not reach the model at", local: "local",
  },
};

export const t = (lang, k) => S[lang][k] ?? S.vi[k] ?? k;
