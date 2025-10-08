class Chatbot {
    constructor() {
        this.messages = [];
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;

        this.chatContainer = document.getElementById('chat-container');
        this.messageInput = document.getElementById('message-input');
        this.voiceBtn = document.getElementById('voice-btn');
        this.sendBtn = document.getElementById('send-btn');
        this.speakingIndicator = document.getElementById('speaking-indicator');

        this.initSpeech();
        this.bindEvents();
        this.addMessage('Hello! I\'m CHITTI, your advanced humanoid companion powered by Groq. I can chat via text or voice—ask me anything!', true);
    }

    initSpeech() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.voiceBtn.innerHTML = '⏹️';
                this.voiceBtn.classList.remove('bg-primary-600', 'hover:bg-primary-700');
                this.voiceBtn.classList.add('bg-red-500', 'hover:bg-red-600');
            };
            this.recognition.onend = () => {
                this.isListening = false;
                this.voiceBtn.innerHTML = '🎤';
                this.voiceBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
                this.voiceBtn.classList.add('bg-primary-600', 'hover:bg-primary-700');
            };
            this.recognition.onerror = (e) => {
                console.error('STT Error:', e.error);
                this.isListening = false;
                this.voiceBtn.innerHTML = '🎤';
                this.voiceBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
                this.voiceBtn.classList.add('bg-primary-600', 'hover:bg-primary-700');
                if (e.error !== 'aborted') {
                    this.addMessage('Voice input error—try again or use text.', true);
                }
            };
            this.recognition.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.sendMessage();
            };
        } else {
            console.warn('Speech Recognition not supported');
            this.voiceBtn.style.display = 'none';
        }

        if ('speechSynthesis' in window) {
            // TTS ready
        } else {
            console.warn('Speech Synthesis not supported');
            // Optionally hide speaking indicator or adjust
        }
    }

    bindEvents() {
        this.voiceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.isListening && !this.isSpeaking) {
                this.startListening();
            } else if (this.isListening) {
                this.stopListening();
            }
        });

        this.sendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Focus input on load for better mobile UX
        setTimeout(() => this.messageInput.focus(), 500);
    }

    startListening() {
        if (this.recognition) {
            this.recognition.start();
        }
    }

    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    async sendMessage() {
        const input = this.messageInput.value.trim();
        if (!input || this.isSpeaking) return;

        this.messageInput.value = '';
        this.addMessage(input, false);
        this.sendBtn.disabled = true;
        this.voiceBtn.disabled = true;
        this.messageInput.disabled = true;

        try {
            const response = await this.callGroqAPI(input);
            this.addMessage(response, true);
            if ('speechSynthesis' in window) {
                this.speak(response);
            }
        } catch (error) {
            const errorMsg = error.message.includes('401') ? 'Authentication issue—check your API key!' :
                             error.message.includes('429') ? 'Too many requests—please wait a moment.' :
                             'Connection error—try again soon.';
            this.addMessage(errorMsg, true);
            console.error('Chat Error:', error);
        } finally {
            this.sendBtn.disabled = false;
            this.voiceBtn.disabled = false;
            this.messageInput.disabled = false;
            this.messageInput.focus();
        }
    }

    addMessage(text, isBot) {
        this.messages.push({ text, isBot });
        const div = document.createElement('div');
        div.className = `message max-w-[85%] px-3 py-2 rounded-xl text-sm md:text-base leading-relaxed break-words shadow-sm border border-gray-200 ${
    isBot ? 'self-start bg-white/80 rounded-br-sm' : 'self-end bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-bl-sm'
}`;
        div.textContent = text;
        this.chatContainer.appendChild(div);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    async callGroqAPI(userInput) {
        const apiKey = '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'; // TODO: Replace with your secure Groq API key (store in env vars for production)
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: userInput }],
                    max_tokens: 400,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            throw new Error(error.message);
        }
    }

    speak(text) {
        if (this.isSpeaking) this.synthesis.cancel();
        this.isSpeaking = true;
        this.speakingIndicator.classList.remove('hidden');
        this.speakingIndicator.textContent = 'CHITTI is speaking...';

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;

        utterance.onend = () => {
            this.isSpeaking = false;
            this.speakingIndicator.classList.add('hidden');
        };
        utterance.onerror = (e) => {
            console.error('TTS Error:', e);
            this.isSpeaking = false;
            this.speakingIndicator.classList.add('hidden');
        };

        this.synthesis.speak(utterance);
    }
}

// Initialize on load
window.addEventListener('load', () => {
    // Handle visibility change for better speech handling
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && window.chatbot && window.chatbot.isListening) {
            window.chatbot.stopListening();
        }
    });
    window.chatbot = new Chatbot(); // Global for debugging if needed
});



