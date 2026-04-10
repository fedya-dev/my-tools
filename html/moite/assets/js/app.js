import { api } from './api.js';

// --- State ---
let currentData = { tools: [], order: [] };
let draggedItem = null;
const state = {
    view: localStorage.getItem('navhub-view') || 'grid',
    theme: localStorage.getItem('navhub-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    isAuthenticated: false
};

// --- DOM Elements ---
const elements = {
    appContainer: document.getElementById('appContainer'),
    loginOverlay: document.getElementById('loginOverlay'),
    loginForm: document.getElementById('loginForm'),
    loginPassword: document.getElementById('loginPassword'),
    cardGrid: document.getElementById('cardGrid'),
    searchBox: document.getElementById('searchBox'),
    emptyState: document.getElementById('emptyState'),
    totalTools: document.getElementById('totalTools'),
    recentlyUsed: document.getElementById('recentlyUsed'),
    adminBtn: document.getElementById('adminBtn'),
    adminModal: document.getElementById('adminModal'),
    logoutBtn: document.getElementById('logoutBtn'),
    closeAdminModal: document.getElementById('closeAdminModal'),
    toolForm: document.getElementById('toolForm'),
    cancelBtn: document.getElementById('cancelBtn'),
    modalTitle: document.getElementById('modalTitle'),
    themeToggle: document.getElementById('themeToggle'),
    viewBtns: document.querySelectorAll('.view-btn'),
    inputs: {
        id: document.getElementById('editId'),
        icon: document.getElementById('toolIcon'),
        title: document.getElementById('toolTitle'),
        desc: document.getElementById('toolDesc'),
        file: document.getElementById('toolFile'),
        keywords: document.getElementById('toolKeywords'),
    }
};

// --- Initialization ---
async function init() {
    applyTheme(state.theme);
    applyView(state.view);

    // Check Auth
    try {
        const auth = await api.checkAuth();
        if (auth.authenticated) {
            handleLoginSuccess();
        } else {
            showLogin();
        }
    } catch (e) {
        console.error('Auth check failed:', e);
        // If checking auth fails (e.g. server down), we might show login anyway
        showLogin();
    }

    setupEventListeners();
    setupContextMenu();
}

function showLogin() {
    elements.appContainer.classList.add('blur-sm');
    elements.loginOverlay.style.display = 'flex';
}

function handleLoginSuccess() {
    state.isAuthenticated = true;
    elements.appContainer.classList.remove('blur-sm');
    elements.loginOverlay.style.display = 'none';
    renderCards();
}

// --- Auth Events ---
elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = elements.loginPassword.value;
    try {
        const res = await api.login(password);
        if (res.success) {
            handleLoginSuccess();
            elements.loginPassword.value = '';
        } else {
            alert('Грешна парола!');
            // Or better: show error message in UI
        }
    } catch (e) {
        alert('Грешка при вход: ' + e.message);
    }
});

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', async () => {
        await api.logout();
        window.location.reload();
    });
}


// --- Rendering ---
async function renderCards() {
    try {
        currentData = await api.get();
        const { tools, order } = currentData;

        if (!tools || tools.length === 0) {
            elements.emptyState.style.display = 'block';
            elements.cardGrid.innerHTML = '';
            updateStats();
            return;
        }

        elements.emptyState.style.display = 'none';

        // Sort based on order array
        let orderedTools = [...tools];
        if (order && order.length > 0) {
            orderedTools = [];
            // Add items in order
            order.forEach(id => {
                const tool = tools.find(t => t.id === id);
                if (tool) orderedTools.push(tool);
            });
            // Add remaining items
            tools.forEach(tool => {
                if (!orderedTools.find(t => t.id === tool.id)) {
                    orderedTools.push(tool);
                }
            });
        }

        elements.cardGrid.innerHTML = '';
        orderedTools.forEach(tool => {
            const card = createCardElement(tool);
            elements.cardGrid.appendChild(card);
        });

        updateStats();
    } catch (error) {
        if (error.message === 'UNAUTHORIZED') {
            showLogin();
        } else {
            showToast('Failed to load tools: ' + error.message, 'error');
        }
    }
}

function createCardElement(tool) {
    const li = document.createElement('li');
    li.className = 'card';
    li.dataset.id = tool.id;
    li.dataset.file = tool.file;
    li.dataset.keywords = tool.keywords || '';
    li.draggable = true;

    li.innerHTML = `
        <div class="card-actions">
            <div class="card-action-btn edit" data-id="${tool.id}" title="Edit">✏️</div>
            <div class="card-action-btn delete" data-id="${tool.id}" title="Delete">🗑️</div>
        </div>
        <div class="card-icon">${tool.icon}</div>
        <div class="card-content">
            <h3 class="card-title">${tool.title}</h3>
            <p class="card-desc">${tool.desc}</p>
        </div>
    `;

    // Events
    li.addEventListener('click', (e) => {
        if (e.target.closest('.card-actions')) return;
        handleCardClick(tool.file);
    });

    li.querySelector('.edit').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(tool.id);
    });

    li.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete(tool.id);
    });

    // Drag events
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragend', handleDragEnd);
    li.addEventListener('contextmenu', (e) => showContextMenu(e, tool));

    return li;
}

function handleCardClick(file) {
    updateUsageStats(file);
    window.location.href = file;
}

// --- Stats ---
function updateStats() {
    elements.totalTools.textContent = currentData.tools.length;
    const stats = JSON.parse(localStorage.getItem('navhub-stats') || '{}');
    const today = new Date().toDateString();

    // Reset if new day
    if (stats.lastDate !== today) {
        elements.recentlyUsed.textContent = '0';
    } else {
        elements.recentlyUsed.textContent = stats.todayCount || 0;
    }
}

function updateUsageStats(toolFile) {
    const today = new Date().toDateString();
    let stats = JSON.parse(localStorage.getItem('navhub-stats') || '{}');

    if (stats.lastDate !== today) {
        stats = { lastDate: today, todayCount: 0, history: stats.history || {} };
    }

    stats.todayCount = (stats.todayCount || 0) + 1;
    stats.history[toolFile] = (stats.history[toolFile] || 0) + 1;
    stats.lastDate = today;

    localStorage.setItem('navhub-stats', JSON.stringify(stats));
}

// --- Drag & Drop ---
function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItem = null;
    saveOrder();
}

elements.cardGrid.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedItem) return;

    const afterElement = getDragAfterElement(elements.cardGrid, e.clientX, e.clientY);
    if (afterElement == null) {
        elements.cardGrid.appendChild(draggedItem);
    } else {
        elements.cardGrid.insertBefore(draggedItem, afterElement);
    }
});

function getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        // Calculate distance from center of box to mouse cursor
        const offsetX = x - (box.left + box.width / 2);
        const offsetY = y - (box.top + box.height / 2);
        const dist = Math.hypot(offsetX, offsetY);

        if (dist < closest.dist) {
            return { dist: dist, element: child };
        } else {
            return closest;
        }
    }, { dist: Number.POSITIVE_INFINITY }).element;
}

async function saveOrder() {
    const cards = Array.from(elements.cardGrid.children);
    const order = cards.map(card => card.dataset.id);
    try {
        await api.saveOrder(order);
    } catch (e) {
        console.error('Failed to save order', e);
    }
}


// --- Search ---
elements.searchBox.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const cards = elements.cardGrid.querySelectorAll('.card');
    let visibleCount = 0;

    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const desc = card.querySelector('.card-desc').textContent.toLowerCase();
        const keywords = card.dataset.keywords || '';

        if (title.includes(query) || desc.includes(query) || keywords.includes(query)) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    elements.emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
});

// --- Theme & View ---
elements.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    localStorage.setItem('navhub-theme', state.theme);
});

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    elements.themeToggle.classList.toggle('active', theme === 'dark');
    elements.themeToggle.querySelector('.theme-toggle-slider').textContent = theme === 'dark' ? '☀️' : '🌙';
}

elements.viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.view = btn.dataset.view;
        applyView(state.view);
        localStorage.setItem('navhub-view', state.view);
    });
});

function applyView(view) {
    elements.viewBtns.forEach(b => b.classList.toggle('active', b.dataset.view === view));
    elements.cardGrid.className = `cards-grid ${view === 'list' ? 'list-view' : ''}`;
}

// --- Admin Modal ---
function openEditModal(id) {
    const tool = currentData.tools.find(t => t.id === id);
    if (!tool) return;

    elements.inputs.id.value = tool.id;
    elements.inputs.icon.value = tool.icon;
    elements.inputs.title.value = tool.title;
    elements.inputs.desc.value = tool.desc;
    elements.inputs.file.value = tool.file;
    elements.inputs.keywords.value = tool.keywords || '';

    elements.modalTitle.textContent = '✏️ Редактирай инструмент';
    elements.adminModal.classList.add('active');
}

function resetForm() {
    elements.toolForm.reset();
    elements.inputs.id.value = '';
    elements.modalTitle.textContent = '➕ Добави нов инструмент';
}

elements.adminBtn.addEventListener('click', () => {
    resetForm();
    elements.adminModal.classList.add('active');
});

elements.closeAdminModal.addEventListener('click', () => elements.adminModal.classList.remove('active'));
elements.cancelBtn.addEventListener('click', () => elements.adminModal.classList.remove('active'));

elements.adminModal.addEventListener('click', (e) => {
    if (e.target === elements.adminModal) elements.adminModal.classList.remove('active');
});

elements.toolForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = elements.inputs.id.value;
    const toolData = {
        icon: elements.inputs.icon.value.trim(),
        title: elements.inputs.title.value.trim(),
        desc: elements.inputs.desc.value.trim(),
        file: elements.inputs.file.value.trim(),
        keywords: elements.inputs.keywords.value.trim()
    };

    try {
        if (editId) {
            toolData.id = editId;
            await api.update(toolData);
            showToast('Инструментът е обновен успешно!', 'success');
        } else {
            await api.add(toolData);
            showToast('Добавен е нов инструмент!', 'success');
        }
        elements.adminModal.classList.remove('active');
        renderCards();
    } catch (error) {
        showToast('Грешка: ' + error.message, 'error');
    }
});

async function confirmDelete(id) {
    if (confirm('Сигурен ли си, че искаш да изтриеш този инструмент?')) {
        try {
            await api.delete(id);
            renderCards();
            showToast('Инструментът е изтрит', 'info');
        } catch (error) {
            showToast('Грешка при изтриване: ' + error.message, 'error');
        }
    }
}

// --- Toast ---
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Context Menu ---
const contextMenu = document.createElement('div');
contextMenu.className = 'context-menu';
document.body.appendChild(contextMenu);

function setupContextMenu() {
    document.addEventListener('click', () => contextMenu.style.display = 'none');
}

function showContextMenu(e, tool) {
    e.preventDefault();
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;

    contextMenu.innerHTML = `
        <div class="context-menu-item" id="ctx-open">
            <span>🔗</span> Отвори
        </div>
        <div class="context-menu-item" id="ctx-edit">
            <span>✏️</span> Редактирай
        </div>
        <div class="context-menu-item delete" id="ctx-delete">
            <span>🗑️</span> Изтрий
        </div>
    `;

    document.getElementById('ctx-open').onclick = () => {
        handleCardClick(tool.file);
    };

    document.getElementById('ctx-edit').onclick = () => {
        openEditModal(tool.id);
    };

    document.getElementById('ctx-delete').onclick = () => {
        confirmDelete(tool.id);
    };
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            elements.adminModal.classList.remove('active');
            contextMenu.style.display = 'none';
        }
        if (e.key === '/' && document.activeElement !== elements.searchBox) {
            e.preventDefault();
            elements.searchBox.focus();
        }
    });
}

// Start
init();
