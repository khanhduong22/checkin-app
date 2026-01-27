const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;



// File lưu trữ dữ liệu check-in
const CHECKINS_FILE = path.join(__dirname, 'checkins.json');
// File lưu trữ danh sách nhân viên
const EMPLOYEES_FILE = path.join(__dirname, 'employees.json');

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

// Đọc danh sách nhân viên
function readEmployees() {
    try {
        if (fs.existsSync(EMPLOYEES_FILE)) {
            const data = fs.readFileSync(EMPLOYEES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Lỗi đọc file employees:', error);
    }
    return [];
}

// Lưu danh sách nhân viên
function saveEmployees(employees) {
    try {
        fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(employees, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Lỗi lưu file employees:', error);
        return false;
    }
}

// File cấu hình
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Đọc cấu hình
function readConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Lỗi đọc file config:', error);
    }
    return { allowedIPs: ['127.0.0.1', '::1', '192.168.1.'] };
}

// Lưu cấu hình
function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Lỗi lưu file config:', error);
        return false;
    }
}

// Hàm format datetime
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
    const config = readConfig();
    const configEmployees = readEmployees(); // Lấy danh sách nhân viên để hiện dropdown
    const officeIPDisplay = `Cho phép ${config.allowedIPs.length} dải IP`;
    
    res.render('index', {
        message: null,
        success: false,
        clientIP: clientIP,
        officeIP: officeIPDisplay,
        employees: configEmployees
    });
});

// Xử lý check-in/check-out
app.post('/checkin', (req, res) => {
    const { employeeName, action } = req.body;
    const clientIP = getClientIP(req);
    const type = action === 'checkout' ? 'checkout' : 'checkin';
    const config = readConfig();
    const officeIPDisplay = `Cho phép ${config.allowedIPs.length} dải IP`;
    
    // Validate tên nhân viên
    if (!employeeName || employeeName.trim() === '') {
        return res.render('index', {
            message: '⚠️ Vui lòng nhập tên nhân viên!',
            success: false,
            clientIP: clientIP,
            officeIP: officeIPDisplay
        });
    }
    
    // Kiểm tra IP có thuộc dải mạng văn phòng không
    const isValidIP = isIPMatch(clientIP, config.allowedIPs);
    
    if (!isValidIP) {
        return res.render('index', {
            message: `❌ Bạn phải kết nối Wi-Fi văn phòng để chấm công!\n\nIP của bạn: ${clientIP}\nIP Hợp lệ: ${config.allowedIPs.join(', ')}`,
            success: false,
            clientIP: clientIP,
            officeIP: officeIPDisplay
        });
    }

    const now = new Date();
    
    // Tạo bản ghi mới
    const record = {
        id: Date.now(),
        name: employeeName.trim(),
        time: now.toISOString(),
        timeFormatted: formatDateTime(now),
        ip: clientIP,
        type: type
    };
    
    // Đọc dữ liệu cũ
    const checkins = readCheckins();
    checkins.push(record);
    
    if (saveCheckins(checkins)) {
        let mess = '';
        if (type === 'checkin') {
            mess = `✅ Check-in thành công!\n\nTên: ${record.name}\nThời gian: ${record.timeFormatted}`;
        } else {
            // Tính tổng giờ làm trong ngày
            const todayStr = now.toLocaleDateString('vi-VN');
            const userRecords = checkins.filter(c => 
                c.name.toLowerCase() === record.name.toLowerCase() && 
                new Date(c.time).toLocaleDateString('vi-VN') === todayStr
            );
            
            // Sắp xếp theo thời gian tăng dần
            userRecords.sort((a, b) => new Date(a.time) - new Date(b.time));
            
            let totalMs = 0;
            let lastCheckIn = null;
            
            for (const r of userRecords) {
                const t = new Date(r.time).getTime();
                // Với dữ liệu cũ không có field type, mặc định là checkin
                const rType = r.type || 'checkin';
                
                if (rType === 'checkin') {
                    if (lastCheckIn === null) {
                        lastCheckIn = t;
                    }
                } else if (rType === 'checkout') {
                    if (lastCheckIn !== null) {
                        totalMs += (t - lastCheckIn);
                        lastCheckIn = null;
                    }
                }
            }
            
            // Chuyển sang giờ/phút
            const hours = Math.floor(totalMs / (1000 * 60 * 60));
            const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
            
            mess = `👋 Check-out thành công!\n\nTên: ${record.name}\nTổng giờ làm hôm nay: ${hours} giờ ${minutes} phút`;
        }

        return res.render('index', {
            message: mess,
            success: true,
            clientIP: clientIP,
            officeIP: officeIPDisplay
        });
    } else {
        return res.render('index', {
            message: '❌ Lỗi hệ thống! Không thể lưu dữ liệu.',
            success: false,
            clientIP: clientIP,
            officeIP: officeIPDisplay
        });
    }
});

// Trang quản trị - Xem danh sách check-in
app.get('/admin', (req, res) => {
    const checkins = readCheckins();
    const config = readConfig();
    const clientIP = getClientIP(req);
    
    // Thống kê theo nhân viên
    const stats = {};
    
    // Sắp xếp theo thời gian tăng dần để tính toán
    const sortedCheckins = [...checkins].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    sortedCheckins.forEach(record => {
        // Chuẩn hóa tên (lowercase) để group, nhưng giữ tên gốc để hiển thị
        const key = record.name.trim().toLowerCase();
        
        if (!stats[key]) {
            stats[key] = { 
                name: record.name, // Lấy tên gốc của lần check-in đầu tiên
                totalMs: 0, 
                lastCheckIn: null,
                lastSeen: record.time
            };
        }
        
        stats[key].lastSeen = record.time;
        
        const type = record.type || 'checkin';
        const t = new Date(record.time).getTime();
        
        if (type === 'checkin') {
            // Nếu có check-in mới mà chưa check-out lượt trước -> Reset lượt trước
            // Hoặc logic đơn giản: Cứ gặp check-in là bắt đầu phiên mới
            stats[key].lastCheckIn = t;
        } else if (type === 'checkout') {
            if (stats[key].lastCheckIn !== null) {
                const diff = t - stats[key].lastCheckIn;
                if (diff > 0) {
                    stats[key].totalMs += diff;
                }
                stats[key].lastCheckIn = null; // Kết thúc phiên
            }
        }
    });
    
    // Helper format thời gian
    const msToTime = (ms) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours} giờ ${minutes} phút`;
    };
    
    const employeeStats = Object.values(stats).map(s => ({
        name: s.name,
        totalTime: msToTime(s.totalMs),
        lastSeen: formatDateTime(s.lastSeen)
    }));
    
    // Sắp xếp lại danh sách checkin để hiển thị (mới nhất lên đầu)
    checkins.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    res.render('admin', {
        checkins: checkins,
        employeeStats: employeeStats,
        officeIP: `Cho phép ${config.allowedIPs.length} dải IP`,
        allowedIPs: config.allowedIPs,
        currentIP: clientIP
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

// API endpoint để thêm IP hiện tại vào danh sách cho phép
app.post('/api/update-ip', (req, res) => {
    const clientIP = getClientIP(req);
    let config = readConfig();
    
    // Kiểm tra xem đã tồn tại chưa
    if (!config.allowedIPs.includes(clientIP)) {
        config.allowedIPs.push(clientIP);
        saveConfig(config);
    }
    
    res.json({ success: true, ip: clientIP, allowedIPs: config.allowedIPs });
});

// API endpoint để xem IP hiện tại
app.get('/api/myip', (req, res) => {
    const clientIP = getClientIP(req);
    const config = readConfig();
    res.json({
        yourIP: clientIP,
        allowedPrefixes: config.allowedIPs,
        match: isIPMatch(clientIP, config.allowedIPs)
    });
});

// ============================================
// EMPLOYEE MANAGEMENT ROUTES
// ============================================

// Trang quản lý nhân viên & tính lương
app.get('/admin/employees', (req, res) => {
    const employees = readEmployees();
    let checkins = readCheckins(); // Use let to filter
    const clientIP = getClientIP(req);
    
    // Lấy tháng/năm hiện tại (hoặc từ query param)
    const now = new Date();
    const currentMonth = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1; // 1-12
    const currentYear = req.query.year ? parseInt(req.query.year) : now.getFullYear();
    
    // Filter checkins theo tháng/năm được chọn
    const monthlyCheckins = checkins.filter(c => {
        const d = new Date(c.time);
        return (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
    });

    // Tính toán giờ làm việc cho từng nhân viên CÓ TRONG DANH SÁCH checkin
    // Tuy nhiên, ta ưu tiên loop qua danh sách Employees đã khai báo
    
    // Bước 1: Tính tổng giờ làm cho tất cả mọi người trong tháng này trước
    const workHoursMap = {}; // name -> totalHours
    
    // Sort checkins để tính giờ
    const sortedCheckins = [...monthlyCheckins].sort((a, b) => new Date(a.time) - new Date(b.time));
    const tempStats = {};

    sortedCheckins.forEach(record => {
        const key = record.name.trim().toLowerCase();
        if (!tempStats[key]) {
            tempStats[key] = { lastCheckIn: null, totalMs: 0 };
        }
        
        const type = record.type || 'checkin';
        const t = new Date(record.time).getTime();
        
        if (type === 'checkin') {
            tempStats[key].lastCheckIn = t;
        } else if (type === 'checkout') {
            if (tempStats[key].lastCheckIn !== null) {
                const diff = t - tempStats[key].lastCheckIn;
                if (diff > 0) tempStats[key].totalMs += diff;
                tempStats[key].lastCheckIn = null;
            }
        }
    });
    
    // Convert ms to hours (float) for salary calculation
    Object.keys(tempStats).forEach(key => {
        workHoursMap[key] = tempStats[key].totalMs / (1000 * 60 * 60);
    });

    // Bước 2: Build danh sách hiển thị
    // Merge employees (có lương) vói checkin stats
    // Note: Có thể có nhân viên đi làm nhưng chưa được tạo trong list Employees -> Vẫn hiện nhưng lương 0 hoặc N/A
    // Hoặc chỉ hiện nhân viên trong list? -> User yêu cầu "quản lý danh sách nhân viên", "thống kê nhân viên đó làm bao nhiêu giờ".
    // Better: Show All Unique Names from (Employees List + Checkin List)
    
    const allNames = new Set([
        ...employees.map(e => e.name.trim().toLowerCase()),
        ...Object.keys(workHoursMap)
    ]);
    
    const reportData = [];
    
    allNames.forEach(normalizedName => {
        // Find employee config
        const empConfig = employees.find(e => e.name.trim().toLowerCase() === normalizedName);
        
        // Find work stats
        const hours = workHoursMap[normalizedName] || 0;
        
        // Display Name: ưu tiên từ config, nếu ko thì lấy từ checkin (phải tìm lại checkin gốc để lấy proper case?? thui lấy title case)
        let displayName = empConfig ? empConfig.name : normalizedName; // Fallback
        
        // Nếu ko có config nhưng có checkin, cần lấy tên gốc từ checkins list để đẹp hơn
        if (!empConfig && workHoursMap[normalizedName]) {
             const found = monthlyCheckins.find(c => c.name.trim().toLowerCase() === normalizedName);
             if (found) displayName = found.name;
        }

        const rate = empConfig ? parseFloat(empConfig.rate) : 0;
        const salary = hours * rate;
        
        reportData.push({
            id: empConfig ? empConfig.id : null,
            name: displayName,
            rate: rate,
            hours: hours.toFixed(2), // Giữ 2 số thập phân
            salary: Math.floor(salary), // Làm tròn tiền
            isConfigured: !!empConfig
        });
    });
    
    // Sort: Configured employees first, then by name
    reportData.sort((a, b) => {
        if (a.isConfigured && !b.isConfigured) return -1;
        if (!a.isConfigured && b.isConfigured) return 1;
        return a.name.localeCompare(b.name);
    });

    res.render('employees', {
        reportData,
        currentMonth,
        currentYear,
        currentIP: clientIP
    });
});

// Thêm/Sửa nhân viên
app.post('/admin/employees', (req, res) => {
    const { id, name, rate } = req.body;
    let employees = readEmployees();
    
    if (id) {
        // Update
        const index = employees.findIndex(e => e.id === parseInt(id));
        if (index !== -1) {
            employees[index].name = name.trim();
            employees[index].rate = parseFloat(rate);
        }
    } else {
        // Add new
        const newId = Date.now();
        employees.push({
            id: newId,
            name: name.trim(),
            rate: parseFloat(rate)
        });
    }
    
    saveEmployees(employees);
    res.redirect('/admin/employees');
});

// Xóa nhân viên
app.post('/admin/employees/delete', (req, res) => {
    const { id } = req.body;
    let employees = readEmployees();
    employees = employees.filter(e => e.id !== parseInt(id));
    saveEmployees(employees);
    res.redirect('/admin/employees');
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
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
});
