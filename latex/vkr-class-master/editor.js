let uploadedFile = null;
let totalPagesCount = 0;

function countWords(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    let text = tempDiv.textContent || tempDiv.innerText || '';

    text = text.replace(/[—–]/g, ' ');
    text = text.replace(/[.,!?;:()«»""''\[\]{}…«»]+/g, ' ');
    text = text.replace(/^\s*-\s*$/gm, ' ');
    text = text.replace(/[\s\n\r\t]+/g, ' ').trim();

    const words = text.split(' ')
        .filter(word => {
            const cleaned = word.trim();
            if (cleaned.length === 0) return false;
            if (cleaned === '-') return false;
            if (cleaned.match(/^-+$/)) return false;
            return true;
        });

    return words.length;
}

function countCharacters(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.replace(/\s/g, '').length;
}

function updateWordCount() {
    const content = quill.root.innerHTML;
    const wordCount = countWords(content);
    const charCount = countCharacters(content);

    const wordCountElement = document.getElementById('wordCountNumber');
    const charCountElement = document.getElementById('charCountNumber');

    if (wordCountElement) wordCountElement.textContent = wordCount;
    if (charCountElement) charCountElement.textContent = charCount;
}

function goToStep(step) {
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const pageRange = document.getElementById('pageRange');

    if (step1) step1.style.display = step === 1 ? 'block' : 'none';
    if (step2) step2.style.display = step === 2 ? 'block' : 'none';
    if (step3) step3.style.display = step === 3 ? 'block' : 'none';

    if (step === 2 && pageRange) pageRange.focus();
}

function resetImport() {
    uploadedFile = null;
    totalPagesCount = 0;

    const pageRange = document.getElementById('pageRange');
    const pageRangeError = document.getElementById('pageRangeError');
    const selectedPagesInfo = document.getElementById('selectedPagesInfo');

    if (pageRange) pageRange.value = '';
    if (pageRangeError) pageRangeError.style.display = 'none';
    if (selectedPagesInfo) selectedPagesInfo.style.display = 'none';

    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';

    const fileUploadArea = document.getElementById('fileUploadArea');
    if (fileUploadArea) {
        fileUploadArea.innerHTML = `
            <p>Перетащите файл сюда или нажмите для выбора</p>
            <p class="upload-hint">Поддерживаются форматы: PDF, DOCX</p>
            <input type="file" id="fileInput" accept=".pdf,.docx" style="display: none;">
            <button class="upload-btn" onclick="document.getElementById('fileInput').click()">
                Выбрать файл
            </button>
        `;
        const newFileInput = document.getElementById('fileInput');
        if (newFileInput) {
            newFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) handleFile(e.target.files[0]);
            });
        }
    }

    goToStep(1);
}

function handleFile(file) {
    const validExtensions = ['.pdf', '.docx'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
        alert('Пожалуйста, выберите файл формата PDF или DOCX');
        return;
    }

    uploadedFile = file;
    uploadFile(file);
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chapter_id', window.chapterId);

    const fileUploadArea = document.getElementById('fileUploadArea');
    if (!fileUploadArea) return;

    fileUploadArea.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div><p style="margin-top: 15px;">Загрузка файла...</p></div>';

    try {
        const response = await fetch('/api/upload_file/', {
            method: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            totalPagesCount = data.total_pages;

            const totalPagesEl = document.getElementById('totalPages');
            if (totalPagesEl) totalPagesEl.textContent = totalPagesCount;

            fileUploadArea.innerHTML = `
                <p>Файл загружен: ${file.name}</p>
                <p class="upload-hint">Всего страниц: ${totalPagesCount}</p>
                <button class="upload-btn" onclick="goToStep(2)">Продолжить →</button>
            `;

            setTimeout(() => goToStep(2), 500);
        } else {
            throw new Error('Ошибка загрузки');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Ошибка при загрузке файла');
        resetImport();
    }
}

function setPageRange(range) {
    const input = document.getElementById('pageRange');
    if (input) {
        input.value = range;
        input.dispatchEvent(new Event('input'));
    }
}

function parsePageRange(range, totalPages) {
    if (!totalPages || totalPages === 0) return [];

    if (range.toLowerCase() === 'все' || range.toLowerCase() === 'all') {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set();
    const parts = range.split(',');

    for (let part of parts) {
        part = part.trim();
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(s => s.trim());
            const startNum = parseInt(start);
            const endNum = parseInt(end);

            if (isNaN(startNum) || isNaN(endNum)) throw new Error(`Неверный формат: "${part}"`);
            if (startNum < 1 || endNum > totalPages) throw new Error(`Страницы должны быть от 1 до ${totalPages}`);
            if (startNum > endNum) throw new Error(`Начальная страница больше конечной`);

            for (let i = startNum; i <= endNum; i++) pages.add(i);
        } else {
            const num = parseInt(part);
            if (isNaN(num) || num < 1 || num > totalPages) throw new Error(`Неверный номер страницы: ${part}`);
            pages.add(num);
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}

async function startImport() {
    const pageRange = document.getElementById('pageRange');
    const errorDiv = document.getElementById('pageRangeError');

    if (!pageRange || !errorDiv) return;

    const range = pageRange.value.trim();
    if (!range) {
        errorDiv.textContent = 'Введите диапазон страниц';
        errorDiv.style.display = 'block';
        return;
    }

    let pages = [];
    try {
        pages = parsePageRange(range, totalPagesCount);
        if (pages.length === 0) {
            errorDiv.textContent = 'Не выбрано ни одной страницы';
            errorDiv.style.display = 'block';
            return;
        }
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
        return;
    }

    goToStep(3);

    const importStatus = document.getElementById('importStatus');
    const importDetails = document.getElementById('importDetails');
    if (importStatus) importStatus.textContent = 'Импортируем текст...';
    if (importDetails) importDetails.textContent = `Страницы: ${pages.join(', ')}`;

    try {
        const response = await fetch('/api/import_pages/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                chapter_id: window.chapterId,
                pages: pages
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка сервера');
        }

        const data = await response.json();
        if (!data.content) throw new Error('Получен пустой контент');

        const currentContent = quill.root.innerHTML;
        const hasContent = currentContent &&
                          currentContent !== '<p><br></p>' &&
                          currentContent.trim() !== '';

        if (hasContent) {
            const separator = '<p><br></p><hr><p><br></p>';
            quill.clipboard.dangerouslyPasteHTML(quill.getLength() - 1, separator);
        }

        quill.clipboard.dangerouslyPasteHTML(quill.getLength() - 1, data.content);
        quill.update();
        updateWordCount();

        await window.saveChapter(true);

        if (importStatus) importStatus.textContent = '✓ Текст импортирован!';
        if (importDetails) importDetails.textContent = `Импортировано ${pages.length} страниц`;

        setTimeout(() => {
            const importModal = document.getElementById('importModal');
            if (importModal) importModal.style.display = 'none';
            resetImport();
        }, 1500);

    } catch (error) {
        console.error('Import error:', error);
        if (importStatus) importStatus.textContent = ' Ошибка';
        if (importDetails) importDetails.textContent = error.message;
    }
}

async function getAllChaptersContent() {
    try {
        const response = await fetch('/api/get_book_content/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ book_id: window.bookId })
        });

        if (response.ok) {
            const data = await response.json();
            return data.content;
        }
    } catch (error) {
        console.error('Error fetching chapters:', error);
    }
    return null;
}

async function sendToAI(message) {
    try {
        const body = { message: message };

        if (isBookMode) {
            const currentContent = quill.root.innerHTML;
            const allBookContent = await getAllChaptersContent();

            body.context = {
                chapterTitle: window.chapterTitle,
                bookTitle: window.bookTitle,
                currentChapterContent: currentContent,
                allChaptersContent: allBookContent,
                isBookMode: true
            };
        } else {
            body.context = { isBookMode: false };
        }

        const response = await fetch('/api/ai/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.reply || 'API error');
        }

        const data = await response.json();
        return data.reply;
    } catch (error) {
        console.error('AI error:', error);
        return " Не удалось подключиться к AI.";
    }
}

function addMessage(text, isUser = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'assistant'}`;

    const safeText = (text && text.trim()) ? text : ' **Ассистент не вернул ответ.** Попробуйте ещё раз.';

    if (!isUser && typeof marked !== 'undefined') {
        div.innerHTML = marked.parse(safeText);
    } else {
        div.textContent = safeText;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

let typingIndicator = null;

function showTyping() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    if (typingIndicator) typingIndicator.remove();
    typingIndicator = document.createElement('div');
    typingIndicator.className = 'message assistant typing';
    typingIndicator.textContent = '✍️ Печатает...';
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    if (typingIndicator) {
        typingIndicator.remove();
        typingIndicator = null;
    }
}

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;

    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    addMessage(message, true);
    showTyping();
    const reply = await sendToAI(message);
    hideTyping();
    addMessage(reply, false);
}

(function initImport() {
    const importModal = document.getElementById('importModal');
    const importBtn = document.getElementById('importBtn');
    const closeImportBtn = document.getElementById('closeImportModal');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('fileInput');
    const pageRange = document.getElementById('pageRange');

    if (importBtn) {
        importBtn.onclick = () => {
            if (importModal) importModal.style.display = 'block';
            goToStep(1);
        };
    }

    if (closeImportBtn) {
        closeImportBtn.onclick = () => {
            if (importModal) importModal.style.display = 'none';
            resetImport();
        };
    }

    if (importModal) {
        window.addEventListener('click', (event) => {
            if (event.target === importModal) {
                importModal.style.display = 'none';
                resetImport();
            }
        });
    }

    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('drag-over');
        });
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('drag-over');
        });
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) handleFile(files[0]);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFile(e.target.files[0]);
        });
    }

    if (pageRange) {
        pageRange.addEventListener('input', function() {
            const range = this.value.trim();
            const errorDiv = document.getElementById('pageRangeError');
            const infoDiv = document.getElementById('selectedPagesInfo');
            if (!errorDiv || !infoDiv) return;

            errorDiv.style.display = 'none';
            infoDiv.style.display = 'none';
            if (!range) return;

            try {
                const pages = parsePageRange(range, totalPagesCount);
                if (pages.length === 0) throw new Error('Неверный формат');

                const countEl = document.getElementById('selectedPagesCount');
                if (countEl) countEl.textContent = pages.length;
                infoDiv.style.display = 'block';
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            }
        });
    }
})();