import os
import time
import threading
import webbrowser
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from chatbot import OpenModelRAGChatbot, download_open_model

# สร้าง Flask app
app = Flask(__name__)
CORS(app)

# สร้าง chatbot instance
chatbot = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/process_query', methods=['POST'])
def process_query_endpoint():
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({"status": "error", "message": "คำถามไม่ถูกต้อง"})
    
    result = chatbot.process_query(query)
    return jsonify({"status": "success", "result": result})

@app.route('/load_url', methods=['POST'])
def load_url_endpoint():
    data = request.json
    url = data.get('url', '')
    
    if not url:
        return jsonify({"status": "error", "message": "URL ไม่ถูกต้อง"})
    
    result = chatbot.load_url(url)
    return jsonify(result)

@app.route('/upload_file', methods=['POST'])
def upload_file_endpoint():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "ไม่พบไฟล์"})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "ไม่ได้เลือกไฟล์"})
    
    file_path = f"temp_{file.filename}"
    file.save(file_path)
    
    try:
        if file.filename.lower().endswith('.pdf'):
            result = chatbot.upload_and_load_pdf(file_path)
        elif file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            result = chatbot.upload_and_load_image(file_path)
        else:
            return jsonify({"status": "error", "message": "ไม่รองรับประเภทไฟล์นี้"})
    finally:
        os.remove(file_path)
    
    return jsonify(result)

@app.route('/document_stats', methods=['GET'])
def document_stats_endpoint():
    stats = chatbot.get_document_stats()
    return jsonify(stats)

@app.route('/save_vectorstore', methods=['POST'])
def save_vectorstore_endpoint():
    data = request.json
    path = data.get('path', 'vectorstore')
    result = chatbot.save_vectorstore(path)
    return jsonify(result)

@app.route('/load_vectorstore', methods=['POST'])
def load_vectorstore_endpoint():
    data = request.json
    path = data.get('path', 'vectorstore')
    result = chatbot.load_vectorstore(path)
    return jsonify(result)

if __name__ == "__main__":
    if not os.path.exists('templates'):
        os.makedirs('templates')
    if not os.path.exists('static'):
        os.makedirs('static')
    
    print("กำลังเริ่มต้นระบบ...")
    model_name = download_open_model()
    print("กำลังสร้าง Chatbot... (อาจใช้เวลาสักครู่)")
    
    chatbot = OpenModelRAGChatbot(model_name)
    print("โหลดโมเดลและสร้าง Chatbot เรียบร้อยแล้ว")
    
    port = 5000
    url = f"http://localhost:{port}"
    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    
    print(f"เริ่มต้น Server ที่ {url}")
    app.run(debug=False, port=port, threaded=True)
