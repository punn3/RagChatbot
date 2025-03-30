// ตัวแปรสำหรับเก็บค่า timeout เพื่อยกเลิกการซ่อนสถานะอัตโนมัติ
let statusTimeout = null;

// ฟังก์ชัน Toggle เมนู
function toggleMenu() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// ฟังก์ชันสร้างการสนทนาใหม่
function newChat() {
    let chatArea = document.getElementById("chat-area");
    chatArea.innerHTML = `
        <div class="chat-box">
            <b>Chatbot:</b><br>สวัสดี! ฉันคือ RAG Chatbot ที่สามารถตอบคำถามจากเอกสารได้ กรุณาโหลดไฟล์ PDF, รูปภาพ หรือ URL เพื่อเริ่มต้นการสนทนา
        </div>
    `;
    document.getElementById("chat-input").value = "";
    if (window.innerWidth <= 768) {
        toggleMenu(); // ปิดเมนูบนมือถือ
    }
}

// ฟังก์ชันส่งข้อความ - ปรับปรุงให้แสดงผลเร็วขึ้น
function sendMessage() {
    let inputField = document.getElementById("chat-input");
    let message = inputField.value.trim();
    if (message === "") return;

    // แสดงข้อความผู้ใช้
    let chatArea = document.getElementById("chat-area");
    let userMessage = document.createElement("div");
    userMessage.classList.add("chat-box", "user-message");
    userMessage.innerHTML = `<b>คุณ:</b><br>${message}`;
    chatArea.appendChild(userMessage);
    
    // ล้างช่องข้อความ
    inputField.value = "";
    
    // แสดง "กำลังคิด..."
    let thinking = document.createElement("div");
    thinking.id = "thinking-message";
    thinking.classList.add("chat-box", "thinking-message");
    thinking.innerHTML = `<b>Chatbot:</b><br><span class="thinking">กำลังคิด</span>`;
    chatArea.appendChild(thinking);
    
    // เลื่อนไปล่างสุด
    chatArea.scrollTop = chatArea.scrollHeight;

    // เพิ่ม timeout เพื่อแสดงข้อความถ้ารอนานเกินไป
    let longWaitTimeout = setTimeout(() => {
        thinking.innerHTML = `<b>Chatbot:</b><br><span class="thinking">กำลังประมวลผล (อาจใช้เวลาสักครู่)</span>`;
    }, 5000);

    // ส่งคำถามไปยัง API
    fetch('/process_query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: message })
    })
    .then(response => response.json())
    .then(data => {
        // ยกเลิก timeout
        clearTimeout(longWaitTimeout);
        
        // ลบข้อความ "กำลังคิด..."
        let thinkingMsg = document.getElementById("thinking-message");
        if (thinkingMsg) {
            chatArea.removeChild(thinkingMsg);
        }
        
        if (data.status === "success") {
            let result = data.result;
            let botMessage = document.createElement("div");
            botMessage.classList.add("chat-box");
            
            // แสดงคำตอบ
            let answerHtml = `<b>Chatbot:</b><br>${result.answer.replace(/\n/g, '<br>')}`;
            
            // แสดงแหล่งที่มาถ้ามี
            if (result.docs && result.docs.length > 0) {
                answerHtml += `<div class="sources-box">
                    <div class="sources-title">แหล่งข้อมูล (ใช้เวลา ${result.time} วินาที):</div>`;
                
                result.docs.forEach((doc, index) => {
                    answerHtml += `<div class="source-item">
                        <div><strong>แหล่งที่มา ${index+1}:</strong> ${doc.source}</div>
                        <div><strong>เนื้อหา:</strong> ${doc.content}</div>
                    </div>`;
                });
                
                answerHtml += `</div>`;
            }
            
            botMessage.innerHTML = answerHtml;
            chatArea.appendChild(botMessage);
        } else {
            let botMessage = document.createElement("div");
            botMessage.classList.add("chat-box");
            botMessage.innerHTML = `<b>Chatbot:</b><br>ขออภัย มีข้อผิดพลาดเกิดขึ้น กรุณาลองใหม่อีกครั้ง`;
            chatArea.appendChild(botMessage);
        }
        
        // เลื่อนไปล่างสุด
        chatArea.scrollTop = chatArea.scrollHeight;
    })
    .catch(error => {
        // ยกเลิก timeout
        clearTimeout(longWaitTimeout);
        
        console.error('Error:', error);
        // ลบข้อความ "กำลังคิด..."
        let thinkingMsg = document.getElementById("thinking-message");
        if (thinkingMsg) {
            chatArea.removeChild(thinkingMsg);
        }
        
        let botMessage = document.createElement("div");
        botMessage.classList.add("chat-box");
        botMessage.innerHTML = `<b>Chatbot:</b><br>ขออภัย มีข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง`;
        chatArea.appendChild(botMessage);
        
        // เลื่อนไปล่างสุด
        chatArea.scrollTop = chatArea.scrollHeight;
    });
}

// จัดการกดปุ่ม Enter
function handleKeyPress(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

// ฟังก์ชันแสดงสถานะการทำงาน
function showStatus(message, type = 'info', autoHide = true) {
    const statusArea = document.getElementById('status-area');
    statusArea.style.display = 'block';
    statusArea.innerHTML = message;
    
    // กำหนดสีตามประเภทข้อความ
    if (type === 'error') {
        statusArea.style.backgroundColor = '#ffdddd';
        statusArea.style.color = '#d32f2f';
    } else if (type === 'success') {
        statusArea.style.backgroundColor = '#ddffdd';
        statusArea.style.color = '#388e3c';
    } else if (type === 'warning') {
        statusArea.style.backgroundColor = '#ffffdd';
        statusArea.style.color = '#f57c00';
    } else {
        statusArea.style.backgroundColor = '#f0f0f0';
        statusArea.style.color = '#333';
    }
    
    // ยกเลิก timeout เดิม (ถ้ามี)
    if (statusTimeout) {
        clearTimeout(statusTimeout);
    }
    
    // ตั้ง timeout ใหม่ถ้าต้องการซ่อนอัตโนมัติ
    if (autoHide) {
        statusTimeout = setTimeout(() => {
            statusArea.style.display = 'none';
        }, 5000);
    }
}

// ฟังก์ชันอัปโหลดไฟล์ - ปรับปรุงให้แสดงผลเร็วขึ้น
function uploadFile(inputElement, fileType) {
    if (!inputElement.files || inputElement.files.length === 0) return;
    
    const file = inputElement.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    // แสดงสถานะการอัปโหลด
    showStatus(`กำลังอัปโหลดและประมวลผล ${fileType === 'pdf' ? 'PDF' : 'รูปภาพ'}...`, 'info', false);
    
    fetch('/upload_file', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            showStatus(`อัปโหลดและประมวลผลเรียบร้อยแล้ว: ${data.chunks || 0} chunks`, 'success');
            
            // แสดงตัวอย่างข้อความสำหรับรูปภาพ
            if (fileType === 'image' && data.preview) {
                showStatus(`อัปโหลดเรียบร้อยแล้ว: ${data.chunks || 0} chunks<br>ตัวอย่างข้อความ: ${data.preview}`, 'success');
            }
        } else if (data.status === "warning") {
            showStatus(data.message, 'warning');
        } else {
            showStatus(`ข้อผิดพลาด: ${data.message}`, 'error');
        }
        
        // รีเซ็ต input
        inputElement.value = '';
    })
    .catch(error => {
        console.error('Error:', error);
        showStatus(`ข้อผิดพลาดในการอัปโหลดไฟล์: ${error.message}`, 'error');
        
        // รีเซ็ต input
        inputElement.value = '';
    });
}

// ฟังก์ชันโหลด URL
function loadURL() {
    const urlInput = document.getElementById('url-input');
    const url = urlInput.value.trim();
    
    if (!url) return;
    
    // แสดงสถานะการโหลด
    showStatus(`กำลังโหลดข้อมูลจาก URL: ${url}...`, 'info', false);
    
    fetch('/load_url', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            showStatus(`โหลดข้อมูลจาก URL เรียบร้อยแล้ว: ${data.chunks || 0} chunks`, 'success');
            urlInput.value = '';
        } else {
            showStatus(`ข้อผิดพลาด: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showStatus(`ข้อผิดพลาดในการโหลด URL: ${error.message}`, 'error');
    });
}

// ฟังก์ชันดูสถิติเอกสาร
function getDocumentStats() {
    // แสดงสถานะการโหลด
    showStatus(`กำลังโหลดสถิติเอกสาร...`, 'info', false);
    
    fetch('/document_stats')
    .then(response => response.json())
    .then(data => {
        let statsHtml = `<strong>สถิติเอกสาร:</strong><br>`;
        
        if (data.stats && Object.keys(data.stats).length > 0) {
            // แสดงประเภทเอกสาร
            if (data.stats.doc_types) {
                statsHtml += `<strong>ประเภทเอกสาร:</strong><br>`;
                for (const [type, count] of Object.entries(data.stats.doc_types)) {
                    statsHtml += `- ${type}: ${count}<br>`;
                }
            }
            
            // แสดงจำนวนเอกสารทั้งหมด
            statsHtml += `<strong>จำนวนเอกสารทั้งหมด:</strong> ${data.stats.total_documents || 0}<br>`;
            statsHtml += `<strong>จำนวน Vectors:</strong> ${data.stats.total_vectors || 0}`;
            
            showStatus(statsHtml, 'info', false);
        } else {
            showStatus(data.message || "ไม่พบข้อมูลสถิติ", 'warning');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showStatus(`ข้อผิดพลาดในการโหลดสถิติเอกสาร: ${error.message}`, 'error');
    });
}

// ฟังก์ชันบันทึก Vector Store
function saveVectorstore() {
    const path = prompt("กรุณาระบุชื่อโฟลเดอร์สำหรับบันทึก Vector Store", "vectorstore");
    
    if (!path) return;
    
    // แสดงสถานะการบันทึก
    showStatus(`กำลังบันทึก Vector Store...`, 'info', false);
    
    fetch('/save_vectorstore', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: path })
    })
    .then(response => response.json())
    .then(data => {
        showStatus(data.message, data.status === 'success' ? 'success' : 'error');
    })
    .catch(error => {
        console.error('Error:', error);
        showStatus(`ข้อผิดพลาดในการบันทึก Vector Store: ${error.message}`, 'error');
    });
}

// ฟังก์ชันโหลด Vector Store
function loadVectorstore() {
    const path = prompt("กรุณาระบุชื่อโฟลเดอร์ที่บันทึก Vector Store ไว้", "vectorstore");
    
    if (!path) return;
    
    // แสดงสถานะการโหลด
    showStatus(`กำลังโหลด Vector Store...`, 'info', false);
    
    fetch('/load_vectorstore', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: path })
    })
    .then(response => response.json())
    .then(data => {
        showStatus(data.message, data.status === 'success' ? 'success' : 'error');
    })
    .catch(error => {
        console.error('Error:', error);
        showStatus(`ข้อผิดพลาดในการโหลด Vector Store: ${error.message}`, 'error');
    });
}

// เพิ่มฟังก์ชันเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', function() {
    // เพิ่มคำแนะนำการใช้งาน
    showStatus("กรุณาอัปโหลดไฟล์ PDF หรือรูปภาพก่อนเริ่มสนทนา เพื่อให้ระบบมีข้อมูลในการตอบคำถาม", 'info', true);
    
    // ตรวจจับการเปลี่ยนแปลงขนาดหน้าจอเพื่อปรับ UI
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            document.querySelector('.sidebar').classList.add('active');
        } else {
            document.querySelector('.sidebar').classList.remove('active');
        }
    });
    
    // เริ่มต้นเปิดเมนูในเดสก์ท็อป
    if (window.innerWidth > 768) {
        document.querySelector('.sidebar').classList.add('active');
    }
});