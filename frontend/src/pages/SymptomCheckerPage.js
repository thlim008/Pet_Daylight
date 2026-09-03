import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import BackButton from '../components/BackButton';

function SymptomCheckerPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: '안녕하세요! 🐾 저는 반려동물 건강 상담 도우미 펫닥터예요.\n\n반려동물의 증상이나 걱정되는 점을 말씀해 주시면, 가능한 원인과 조언을 드릴게요.\n\n📷 사진을 첨부하면 증상을 분석해드릴 수도 있어요!\n\n⚠️ 단, 이 서비스는 참고용이며 정확한 진단은 수의사와 상담하세요!'
      }
    ]);
    loadPets();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadPets = async () => {
    try {
      const response = await API.get('/lifecycles/pets/');
      const data = response.data.results || response.data;
      setPets(data);
      if (data.length > 0) {
        setSelectedPet(data[0]);
      }
    } catch (err) {
      console.error('펫 목록 로드 실패:', err);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하로 선택해주세요.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    const newUserMessage = {
      role: 'user',
      content: userMessage || '사진 분석 요청',
      image: imagePreview
    };
    
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setLoading(true);
    
    const imageToSend = selectedImage;
    removeImage();

    try {
      const history = messages
        .filter(m => m.role !== 'system')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await API.post('/lifecycles/symptom-checker/', {
        message: userMessage,
        history: history,
        image: imageToSend,
        pet_info: selectedPet ? {
          name: selectedPet.name,
          species: selectedPet.species === 'dog' ? '강아지' : selectedPet.species === 'cat' ? '고양이' : '기타',
          breed: selectedPet.breed,
	  age: selectedPet.age_in_years ? `${selectedPet.age_in_years}살` : '알 수 없음',
	  weight: selectedPet.weight ? `${selectedPet.weight}kg` : null,
	  gender: selectedPet.gender === 'male' ? '수컷' : selectedPet.gender === 'female' ? '암컷' : null,
	  is_neutered: selectedPet.is_neutered ? '중성화 완료' : '중성화 안함'
        } : null
      });

      setMessages([...newMessages, {
        role: 'assistant',
        content: response.data.reply
      }]);

    } catch (err) {
      console.error('메시지 전송 실패:', err);
      setMessages([...newMessages, {
        role: 'assistant',
        content: '죄송해요, 일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요. 🙏'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    '우리 아이가 밥을 안 먹어요',
    '구토를 해요',
    '기침을 자주 해요',
    '피부를 긁어요',
    '눈곱이 많이 껴요'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BackButton />
              <div>
                <h1 className="text-xl font-bold text-gray-900">🩺 AI 증상 체커</h1>
                <p className="text-xs text-gray-500">펫닥터와 상담하기</p>
              </div>
            </div>
            
            {pets.length > 0 && (
              <select
                value={selectedPet?.id || ''}
                onChange={(e) => {
                  const pet = pets.find(p => p.id === parseInt(e.target.value));
                  setSelectedPet(pet);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {pets.map(pet => (
                  <option key={pet.id} value={pet.id}>
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'} {pet.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-40">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>주의:</strong> 이 서비스는 의료 조언을 대체하지 않습니다. 
            심각한 증상이 있다면 반드시 동물병원을 방문해 주세요.
          </p>
        </div>

        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-green-500 text-white rounded-br-md'
                    : 'bg-white shadow-md rounded-bl-md'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-xs font-medium text-green-600">펫닥터</span>
                  </div>
                )}
                {message.image && (
                  <img 
                    src={message.image} 
                    alt="첨부 이미지" 
                    className="max-w-full h-auto rounded-lg mb-2 max-h-48 object-cover"
                  />
                )}
                <p className={`text-sm whitespace-pre-wrap ${
                  message.role === 'user' ? 'text-white' : 'text-gray-700'
                }`}>
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-md rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🤖</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-3">💡 자주 묻는 증상</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, index) => (
                <button
                  key={index}
                  onClick={() => setInput(q)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-green-50 hover:border-green-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img 
                src={imagePreview} 
                alt="미리보기" 
                className="h-20 w-20 object-cover rounded-lg border border-gray-300"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="flex items-end space-x-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              type="file"
              id="cameraInput"
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />
	    <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              title="갤러리에서 선택"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => document.getElementById('cameraInput')?.click()}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              title="카메라로 촬영"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="증상을 설명해 주세요..."
                rows={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                style={{ maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={(!input.trim() && !selectedImage) || loading}
              className={`p-3 rounded-full transition-colors ${
                (input.trim() || selectedImage) && !loading
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            Enter로 전송 • Shift+Enter로 줄바꿈 • 📷 이미지 첨부 가능
          </p>
        </div>
      </footer>
    </div>
  );
}

export default SymptomCheckerPage;
