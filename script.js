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
        this.addMessage('Hello! I\'m your humanoid friend powered by Groq. Ask me anything!', true); // Updated welcome
    }

    initSpeech() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.voiceBtn.textContent = '⏹️';
            };
            this.recognition.onend = () => {
                this.isListening = false;
                this.voiceBtn.textContent = '🎤';
            };
            this.recognition.onerror = (e) => {
                console.error('STT Error:', e.error);
                this.isListening = false;
                this.voiceBtn.textContent = '🎤';
            };
            this.recognition.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.sendMessage();
            };
        } else {
            console.warn('STT not supported');
            this.voiceBtn.style.display = 'none'; // Hide button if unsupported
        }

        if ('speechSynthesis' in window) {
            // TTS ready
        } else {
            console.warn('TTS not supported');
        }
    }

    bindEvents() {
        this.voiceBtn.addEventListener('click', () => {
            if (!this.isListening && !this.isSpeaking) {
                this.startListening();
            } else {
                this.stopListening();
            }
        });

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
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

        try {
            const response = await this.callGroqAPI(input);
            this.addMessage(response, true);
            this.speak(response);
        } catch (error) {
            this.addMessage(error.message, true); // Shows specific error
            console.error('Chat Error:', error);
        } finally {
            this.sendBtn.disabled = false;
            if (this.voiceBtn.style.display !== 'none') {
                this.voiceBtn.disabled = false;
            }
        }
    }

    addMessage(text, isBot) {
        this.messages.push({ text, isBot });
        const div = document.createElement('div');
        div.className = `message ${isBot ? 'bot-message' : 'user-message'}`;
        div.textContent = text;
        this.chatContainer.appendChild(div);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    async callGroqAPI(userInput) {
        const apiKey ='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'; // Replace with your actual Groq API key (gsk_...)
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',  // Fast free model; change to 'llama3-groq-70b-8192-tool-use' if needed
                    messages: [{ role: 'user', content: userInput }],
                    max_tokens: 300,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                let errorMsg = `API Error ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg += `: ${errorData.error?.message || 'Unknown details'}`;
                } catch {}
                console.error('Groq API Details:', errorMsg);
                throw new Error(errorMsg);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            let displayError = error.message.includes('401') ? 'Invalid API key—double-check your Groq key!' :
                              error.message.includes('429') ? 'Rate limited—wait 1 min and retry!' :
                              'Network issue—check your connection and try again.';
            throw new Error(displayError);
        }
    }

    speak(text) {
        if (this.isSpeaking) this.synthesis.cancel();
        this.isSpeaking = true;
        this.speakingIndicator.style.display = 'block';

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.onend = () => {
            this.isSpeaking = false;
            this.speakingIndicator.style.display = 'none';
        };
        utterance.onerror = () => {
            this.isSpeaking = false;
            this.speakingIndicator.style.display = 'none';
        };

        this.synthesis.speak(utterance);
    }
}

// Initialize on load
window.addEventListener('load', () => new Chatbot());