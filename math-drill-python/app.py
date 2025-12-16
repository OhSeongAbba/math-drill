import os
import requests
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# 로컬 개발 환경에서 .env 파일 로드 (Render에서는 환경변수로 설정)
load_dotenv()

app = Flask(__name__)

# 구글 API 키 가져오기 (Render 환경변수에서)
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

# 1. 메인 화면 보여주기 (누군가 사이트에 접속했을 때)
@app.route('/')
def home():
    return render_template('index.html')

# 2. AI 문제 생성 API (화면에서 요청이 왔을 때)
@app.route('/api/generate-problems', methods=['POST'])
def generate_problems():
    data = request.get_json()
    topic = data.get('topic')
    math_type = data.get('mathType', 'fraction')

    if not topic:
        return jsonify({"error": "주제가 필요합니다."}), 400

    if not GOOGLE_API_KEY:
        return jsonify({"error": "API 키가 설정되지 않았습니다."}), 500

    # Gemini에게 보낼 프롬프트
    prompt = f"""
    당신은 초등학교 6학년 아이들을 가르치는 친절하고 유머러스한 수학 선생님입니다.
    
    요청:
    사용자가 입력한 관심사 주제인 "{topic}"(을)를 활용하여, 
    "{'분수의 나눗셈' if math_type == 'fraction' else '소수의 나눗셈'}" 관련 수학 문장제 문제(Word Problem)를 **5문제** 만들어주세요.
    
    조건:
    1. 대상: 초등학교 6학년
    2. 언어: 한국어
    3. 난이도: '수와 양' 영역 기초가 부족한 학생도 도전할 수 있는 수준
    4. 형식: 4지 선다형 객관식
    5. [매우 중요] 텍스트 작성 규칙: 
        - LaTeX($...$, \\frac 등) 문법을 절대 사용하지 마세요. 아이들이 읽을 수 없습니다.
        - 분수는 '3/4' 또는 '4분의 3'과 같이 일반 텍스트로 자연스럽게 풀어 써주세요.
        - 단위는 한글로(예: 개, 명, cm) 정확히 써주세요.
    6. 5개의 문제는 서로 다른 상황이나 스토리를 가져야 합니다.
    
    출력 형식 (반드시 유효한 JSON **배열**만 출력, 마크다운 코드블록 없이):
    [
      {{
        "question": "문제 지문...",
        "options": ["보기1", "보기2", "보기3", "보기4"],
        "answer": "정답",
        "hint": "힌트",
        "explanation": "풀이"
      }},
      ...
    ]
    """

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={GOOGLE_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"}
        }
        headers = {"Content-Type": "application/json"}

        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status() # 에러 체크

        result = response.json()
        ai_text = result['candidates'][0]['content']['parts'][0]['text']
        
        # JSON 파싱해서 프론트엔드로 전달
        return jsonify(json.loads(ai_text))

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "문제 생성 중 오류 발생"}), 500

if __name__ == '__main__':
    app.run(debug=True)