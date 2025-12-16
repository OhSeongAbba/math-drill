// 이 코드는 Node.js 환경(Render, Glitch 등)에서 실행되어야 합니다.
// package.json에는 "express", "cors", "node-fetch", "dotenv"가 필요합니다.

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Node 18 이상에서는 내장 fetch 사용 가능
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정: 선생님이 배포한 프론트엔드 주소만 허용하는 것이 좋습니다.
// 지금은 테스트를 위해 모든 요청 허용 (*)
app.use(cors());
app.use(express.json());

// API 키는 환경 변수(Environment Variable)에서 가져옵니다.
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.post('/api/generate-problems', async (req, res) => {
  try {
    const { topic, mathType } = req.body;

    if (!topic) {
      return res.status(400).json({ error: '주제가 필요합니다.' });
    }

    const prompt = `
      당신은 초등학교 6학년 아이들을 가르치는 친절하고 유머러스한 수학 선생님입니다.
      
      요청:
      사용자가 입력한 관심사 주제인 "${topic}"(을)를 활용하여, 
      "${mathType === 'fraction' ? '분수의 나눗셈' : '소수의 나눗셈'}" 관련 수학 문장제 문제(Word Problem)를 **5문제** 만들어주세요.
      
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
        {
          "question": "문제 지문...",
          "options": ["보기1", "보기2", "보기3", "보기4"],
          "answer": "정답",
          "hint": "힌트",
          "explanation": "풀이"
        },
        ...
      ]
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Gemini API Error');
    }

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;
    
    // JSON 파싱 후 클라이언트에 전달
    const parsedData = JSON.parse(aiText);
    res.json(parsedData);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '문제를 생성하는 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});