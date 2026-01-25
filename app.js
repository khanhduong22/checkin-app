const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// ============================================
// 🔧 CẤU HÌNH DẢI MẠNG VĂN PHÒNG (SUBNETS)
// ============================================
// Chỉ cần IP người dùng BẮT ĐẦU bằng các chuỗi này là được chấp nhận
const OFFICE_IP_PREFIXES = [
    '192.168.1.',          // Dải IPv4 nội bộ (chấp nhận 192.168.1.1 -> 192.168.1.255)
    '2402:800:6e27:f7d:',  // Dải IPv6 mạng văn phòng bạn (lấy 4 block đầu)
    '127.0.0.1',           // Localhost
    '::1'                  // Localhost IPv6
];

// Để hiển thị trên giao diện
const OFFICE_IP_DISPLAY = "Wi-Fi Văn Phòng (Local Network)";

// File lưu trữ dữ liệu check-in
const CHECKINS_FILE = path.join(__dirname, 'checkins.json');

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy để lấy IP thật qua x-forwarded-for
app.set('trust proxy', true);

// ============================================
// HÀM TIỆN ÍCH
// ============================================

// Chuẩn hóa IP - chuyển IPv6-mapped IPv4 về dạng IPv4 thuần
// Ví dụ: "::ffff:192.168.1.1" -> "192.168.1.1"
//        "::1" -> "127.0.0.1" (localhost IPv6)
function normalizeIP(ip) {
    if (!ip) return '';
    
    // Xử lý IPv6-mapped IPv4 (::ffff:x.x.x.x)
    if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }
    
    // Xử lý localhost IPv6
    if (ip === '::1') {
        return '127.0.0.1';
    }
    
    return ip;
}

// Lấy IP thật của người dùng (hỗ trợ proxy/load balancer)
function getClientIP(req) {
    let ip;
    
    // Ưu tiên lấy từ x-forwarded-for (khi qua proxy/Nginx)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // x-forwarded-for có thể chứa nhiều IP, lấy IP đầu tiên
        ip = forwarded.split(',')[0].trim();
    } else {
        // Fallback về IP trực tiếp
        ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    }
    
    // Chuẩn hóa IP trước khi trả về
    return normalizeIP(ip);
}

// Kiểm tra IP client có thuộc dải mạng văn phòng không
function isIPMatch(clientIP, allowedPrefixes) {
    const normalizedClient = normalizeIP(clientIP);
    
    console.log(`[IP Check] Client IP: ${clientIP} -> ${normalizedClient}`);
    console.log(`[IP Check] Allowed Prefixes: ${allowedPrefixes.join(', ')}`);
    
    // Kiểm tra xem IP client có BẮT ĐẦU bằng bất kỳ prefix nào không
    for (const prefix of allowedPrefixes) {
        // Chuẩn hóa prefix nếu cần (đối với config IPv6 bên trên thì không cần normalizeIP hàm này)
        // Nhưng nếu là ::ffff:192.168.1. -> 192.168.1.
        let checkPrefix = prefix;
        if (checkPrefix.startsWith('::ffff:') && !checkPrefix.includes(':')) {
             checkPrefix = checkPrefix.substring(7);
        }

        if (normalizedClient.startsWith(checkPrefix)) {
            console.log(`[IP Check] ✅ MATCHED prefix: ${prefix}`);
            return true;
        }
    }
    
    console.log(`[IP Check] ❌ NO MATCH`);
    return false;
}

// Đọc dữ liệu check-in từ file
function readCheckins() {
    try {
        if (fs.existsSync(CHECKINS_FILE)) {
            const data = fs.readFileSync(CHECKINS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Lỗi đọc file checkins:', error);
    }
    return [];
}

// Ghi dữ liệu check-in vào file
function saveCheckins(checkins) {
    try {
        fs.writeFileSync(CHECKINS_FILE, JSON.stringify(checkins, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Lỗi ghi file checkins:', error);
        return false;
    }
}

// Format thời gian theo múi giờ Việt Nam
function formatDateTime(date) {
    return new Date(date).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// ============================================
// ROUTES
// ============================================

// Trang chủ - Form check-in
app.get('/', (req, res) => {
    const clientIP = getClientIP(req);
    res.render('index', {
        message: null,
        success: false,
        clientIP: clientIP,
        officeIP: OFFICE_IP_DISPLAY
    });
});

// Xử lý check-in
app.post('/checkin', (req, res) => {
    const { employeeName } = req.body;
    const clientIP = getClientIP(req);
    
    // Validate tên nhân viên
    if (!employeeName || employeeName.trim() === '') {
        return res.render('index', {
            message: '⚠️ Vui lòng nhập tên nhân viên!',
            success: false,
            clientIP: clientIP,
            officeIP: OFFICE_IP_DISPLAY
        });
    }
    
    // Kiểm tra IP có thuộc dải mạng văn phòng không
    // Hàm isIPMatch kiểm tra prefix (IPv4 subnet hoặc IPv6 prefix)
    const isValidIP = isIPMatch(clientIP, OFFICE_IP_PREFIXES);
    
    if (!isValidIP) {
        return res.render('index', {
            message: `❌ Bạn phải kết nối Wi-Fi văn phòng để chấm công!\n\nIP của bạn: ${clientIP}\nIP văn phòng: ${OFFICE_IP_DISPLAY}`,
            success: false,
            clientIP: clientIP,
            officeIP: OFFICE_IP_DISPLAY
        });
    }
    
    // Tạo bản ghi check-in mới
    const checkinRecord = {
        id: Date.now(),
        name: employeeName.trim(),
        time: new Date().toISOString(),
        timeFormatted: formatDateTime(new Date()),
        ip: clientIP
    };
    
    // Lưu vào file
    const checkins = readCheckins();
    checkins.push(checkinRecord);
    
    if (saveCheckins(checkins)) {
        return res.render('index', {
            message: `✅ Chấm công thành công!\n\nTên: ${checkinRecord.name}\nThời gian: ${checkinRecord.timeFormatted}`,
            success: true,
            clientIP: clientIP,
            officeIP: OFFICE_IP_DISPLAY
        });
    } else {
        return res.render('index', {
            message: '❌ Lỗi hệ thống! Không thể lưu dữ liệu.',
            success: false,
            clientIP: clientIP,
            officeIP: OFFICE_IP_DISPLAY
        });
    }
});

// Trang quản trị - Xem danh sách check-in
app.get('/admin', (req, res) => {
    const checkins = readCheckins();
    // Sắp xếp theo thời gian mới nhất
    checkins.sort((a, b) => new Date(b.time) - new Date(a.time));
    res.render('admin', {
        checkins: checkins,
        officeIP: OFFICE_IP_DISPLAY
    });
});

// API endpoint để xóa lịch sử (tùy chọn)
app.delete('/api/checkins/:id', (req, res) => {
    const { id } = req.params;
    let checkins = readCheckins();
    checkins = checkins.filter(c => c.id !== parseInt(id));
    if (saveCheckins(checkins)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, message: 'Lỗi xóa dữ liệu' });
    }
});

// API endpoint để xem IP hiện tại
app.get('/api/myip', (req, res) => {
    const clientIP = getClientIP(req);
    res.json({
        yourIP: clientIP,
        allowedPrefixes: OFFICE_IP_PREFIXES,
        match: isIPMatch(clientIP, OFFICE_IP_PREFIXES)
    });
});

// ============================================
// KHỞI ĐỘNG SERVER
// ============================================
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║     🏢 HỆ THỐNG CHẤM CÔNG NỘI BỘ                   ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  🌐 Server:     http://localhost:${PORT}              ║`);
    console.log(`║  📋 Trang chủ:  http://localhost:${PORT}/             ║`);
    console.log(`║  🔧 Admin:      http://localhost:${PORT}/admin        ║`);
    console.log(`║  📍 IP Rules:   Allow ${OFFICE_IP_PREFIXES.length} subnet prefixes`.padEnd(53) + '║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
});
