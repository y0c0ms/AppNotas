// DOM Elements
const notesTab = document.getElementById('notesTab');
const calendarTab = document.getElementById('calendarTab');
const notesView = document.getElementById('notesView');
const calendarView = document.getElementById('calendarView');
const darkModeToggle = document.getElementById('darkModeToggle');
const noteInput = document.getElementById('noteInput');
const datePicker = document.getElementById('datePicker');
const todayBtn = document.getElementById('todayBtn');
const tomorrowBtn = document.getElementById('tomorrowBtn');
const timeInput = document.getElementById('timeInput');
const addNoteBtn = document.getElementById('addNoteBtn');
const notesList = document.getElementById('notesList');
const weekDaysContainer = document.getElementById('weekDays');
const toggleAddNoteBtn = document.getElementById('toggleAddNote');
const addNoteForm = document.getElementById('addNoteForm');
const weekViewBtn = document.getElementById('weekViewBtn');
const monthViewBtn = document.getElementById('monthViewBtn');
const recurringCheck = document.getElementById('recurringCheck');
const hourButtons = document.querySelectorAll('#hourSelector .time-btn');
const minuteButtons = document.querySelectorAll('#minuteSelector .time-btn');
const periodButtons = document.querySelectorAll('#periodSelector .time-period-btn');
const toggleDateBtn = document.getElementById('toggleDateBtn');
const dateSection = document.getElementById('dateSection');
const undatedNotesList = document.getElementById('undatedNotesList');
const datedNotesList = document.getElementById('datedNotesList');
const colorOptions = document.querySelectorAll('.color-option');

// Custom Date Picker Elements
const openCustomCalendarBtn = document.getElementById('openCustomCalendarBtn');
const customDatePicker = document.getElementById('customDatePicker');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const currentMonthYear = document.getElementById('currentMonthYear');
const monthDays = document.getElementById('monthDays');
const cancelDateBtn = document.getElementById('cancelDateBtn');
const confirmDateBtn = document.getElementById('confirmDateBtn');

// Add these DOM elements
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// Auth UI elements
const authBar = document.getElementById('authBar');
const authStatus = document.getElementById('authStatus');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const syncNowBtn = document.getElementById('syncNowBtn');
const authModal = document.getElementById('authModal');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authMode = document.getElementById('authMode');
const apiBaseInput = document.getElementById('apiBaseInput');
const authError = document.getElementById('authError');

// State
let notes = [];
let draggedNote = null;
let currentCalendarView = 'week'; // 'week' or 'month'
let selectedHour = null;
let selectedMinute = null;
let selectedPeriod = 'AM';
let currentPickerMonth = new Date().getMonth();
let currentPickerYear = new Date().getFullYear();
let tempSelectedDate = null; // Temporary holder for date selection
let selectedColor = 'default'; // Default color for notes

// Add state variables for current week and month
let currentWeekOffset = 0;
let currentMonthOffset = 0;

// Initialize
function init() {
  loadNotes();
  cleanupCorruptedNotes(); // Remove problematic notes that can't be deleted normally
  setupEventListeners();
  renderNotes();
  renderCalendar();
  initDarkMode();
  
  // Set today as default date
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  datePicker.value = formattedDate;
  tempSelectedDate = formattedDate;
  
  // Default time period based on current time
  if (today.getHours() >= 12) {
    selectPeriod('PM');
  } else {
    selectPeriod('AM');
  }
  
  // Set up auto-save interval (a cada 2 minutos)
  setInterval(() => {
    saveNotes();
    console.log('Auto-save das notas executado');
  }, 2 * 60 * 1000);

  // Prepare sync (auth + migration)
  try {
    const { migrate } = require('./data/migrateLocal');
    migrate();
  } catch (e) { console.warn('Migration skipped:', e.message); }

  // Background sync every 60s
  try {
    const { buildOps, ackApplied, applyServerChange, getCursorStore } = require('./data/repository');
    const { syncOnceWithRefresh } = require('./data/syncClient');
    const { refresh } = require('./data/authClient');
    let accessToken = null;
    async function syncNow() {
      const ops = buildOps();
      if (!accessToken) {
        try { accessToken = await refresh(); } catch { /* not signed in */ return; }
      }
      try {
        const result = await syncOnceWithRefresh(accessToken, { ops });
        ackApplied(result.applied || []);
        (result.changes || []).forEach(applyServerChange);
        const syncStore = getCursorStore();
        if (typeof result.newCursor === 'number') syncStore.set('cursor', result.newCursor);
      } catch (e) {
        console.warn('Sync error:', e.message);
        accessToken = null; // force refresh next time
      }
    }
    setInterval(syncNow, 60 * 1000);
    window.addEventListener('focus', syncNow);
  } catch (e) { console.warn('Sync init skipped:', e.message); }
}

// Event Listeners
function setupEventListeners() {
  // Tab switching
  notesTab.addEventListener('click', () => switchTab('notes'));
  calendarTab.addEventListener('click', () => switchTab('calendar'));

  // Dark mode toggle
  darkModeToggle.addEventListener('click', toggleDarkMode);

  // Note form toggle
  toggleAddNoteBtn.addEventListener('click', toggleAddNoteForm);

  // Quick date buttons
  todayBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const today = new Date();
    datePicker.value = today.toISOString().split('T')[0];
    tempSelectedDate = datePicker.value;
  });
  
  tomorrowBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    datePicker.value = tomorrow.toISOString().split('T')[0];
    tempSelectedDate = datePicker.value;
  });
  
  // Custom Date Picker
  openCustomCalendarBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleCustomDatePicker();
  });
  
  prevMonthBtn.addEventListener('click', () => {
    navigateMonth(-1);
  });
  
  nextMonthBtn.addEventListener('click', () => {
    navigateMonth(1);
  });
  
  cancelDateBtn.addEventListener('click', () => {
    customDatePicker.classList.remove('open');
  });
  
  confirmDateBtn.addEventListener('click', () => {
    if (tempSelectedDate) {
      datePicker.value = tempSelectedDate;
    }
    customDatePicker.classList.remove('open');
  });
  
  // Close picker when clicking outside
  document.addEventListener('click', (e) => {
    if (customDatePicker.classList.contains('open') && 
        !customDatePicker.contains(e.target) && 
        e.target !== openCustomCalendarBtn) {
      customDatePicker.classList.remove('open');
    }
  });
  
  // Time selector buttons
  hourButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      selectHour(btn.dataset.hour);
    });
  });
  
  minuteButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      selectMinute(btn.dataset.minute);
    });
  });
  
  periodButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      selectPeriod(btn.dataset.period);
    });
  });
  
  // Color selector
  colorOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      selectColor(option.dataset.color);
    });
  });

  // Note actions
  addNoteBtn.addEventListener('click', addNote);
  noteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addNote();
  });
  
  // Calendar view toggle
  weekViewBtn.addEventListener('click', () => switchCalendarView('week'));
  monthViewBtn.addEventListener('click', () => switchCalendarView('month'));
  
  // Calendar navigation
  prevBtn.addEventListener('click', navigatePrevious);
  nextBtn.addEventListener('click', navigateNext);

  // Date section toggle
  setupDateToggle();

  // Auth UI listeners
  if (signInBtn) signInBtn.addEventListener('click', () => {
    authError.hidden = true;
    authModal.showModal();
  });
  if (document.getElementById('authCancel')) document.getElementById('authCancel').addEventListener('click', () => authModal.close());
  if (document.getElementById('authSubmit')) document.getElementById('authSubmit').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const { register, login, setApiBase, currentIdentity, refresh } = require('./data/authClient');
      if (apiBaseInput.value) setApiBase(apiBaseInput.value);
      const email = authEmail.value.trim();
      const password = authPassword.value;
      const mode = authMode.value;
      if (!email || !password) throw new Error('Email and password required');
      const device = { name: 'Desktop', platform: 'windows' };
      if (mode === 'register') await register(email, password, device); else await login(email, password, device);
      await refresh(); // prime access token for first sync
      const ident = currentIdentity();
      authStatus.textContent = `Signed in as ${ident.email}`;
      signInBtn.style.display = 'none';
      signOutBtn.style.display = '';
      authModal.close();
    } catch (err) {
      authError.textContent = err.message || 'Authentication failed';
      authError.hidden = false;
    }
  });
  if (signOutBtn) signOutBtn.addEventListener('click', async () => {
    try {
      const { logout } = require('./data/authClient');
      await logout();
    } finally {
      authStatus.textContent = 'Not signed in';
      signInBtn.style.display = '';
      signOutBtn.style.display = 'none';
    }
  });
  if (syncNowBtn) syncNowBtn.addEventListener('click', async () => {
    try {
      const { buildOps, ackApplied, applyServerChange, getCursorStore } = require('./data/repository');
      const { syncOnceWithRefresh } = require('./data/syncClient');
      const { refresh } = require('./data/authClient');
      let accessToken = await refresh();
      const result = await syncOnceWithRefresh(accessToken, { ops: buildOps() });
      ackApplied(result.applied || []);
      (result.changes || []).forEach(applyServerChange);
      const syncStore = getCursorStore();
      if (typeof result.newCursor === 'number') syncStore.set('cursor', result.newCursor);
    } catch (e) {
      console.warn('Manual sync error:', e.message);
    }
  });
}

// Function to select color
function selectColor(color) {
  selectedColor = color;
  
  // Update UI for selected color
  colorOptions.forEach(option => {
    if (option.dataset.color === color) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// Custom Date Picker Functions
function toggleCustomDatePicker() {
  // If opening the picker, initialize it with current date
  if (!customDatePicker.classList.contains('open')) {
    // Parse the current date from the input
    const inputDate = datePicker.value ? new Date(datePicker.value) : new Date();
    currentPickerMonth = inputDate.getMonth();
    currentPickerYear = inputDate.getFullYear();
    tempSelectedDate = datePicker.value;

    renderDatePicker();
  }
  
  customDatePicker.classList.toggle('open');
}

function navigateMonth(direction) {
  // direction: -1 for previous, 1 for next
  currentPickerMonth += direction;
  
  // Handle year change
  if (currentPickerMonth < 0) {
    currentPickerMonth = 11;
    currentPickerYear--;
  } else if (currentPickerMonth > 11) {
    currentPickerMonth = 0;
    currentPickerYear++;
  }
  
  renderDatePicker();
}

function renderDatePicker() {
  // Update the header
  currentMonthYear.textContent = `${getMonthName(currentPickerMonth)} ${currentPickerYear}`;
  
  // Clear previous days
  monthDays.innerHTML = '';
  
  // Get first day of month and total days in month
  const firstDayOfMonth = new Date(currentPickerYear, currentPickerMonth, 1);
  const lastDayOfMonth = new Date(currentPickerYear, currentPickerMonth + 1, 0);
  const totalDays = lastDayOfMonth.getDate();
  const firstDayOffset = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Add blank buttons for days before the start of the month
  for (let i = 0; i < firstDayOffset; i++) {
    const blankDay = document.createElement('button');
    blankDay.className = 'day-button outside-month';
    blankDay.disabled = true;
    monthDays.appendChild(blankDay);
  }
  
  // Today's date for comparison
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentPickerMonth && today.getFullYear() === currentPickerYear;
  const todayDate = today.getDate();
  
  // Get currently selected date if any
  const selectedDate = tempSelectedDate ? new Date(tempSelectedDate) : null;
  const isSelectedMonth = selectedDate && 
                         selectedDate.getMonth() === currentPickerMonth && 
                         selectedDate.getFullYear() === currentPickerYear;
  
  // Add buttons for each day of the month
  for (let day = 1; day <= totalDays; day++) {
    const dayButton = document.createElement('button');
    dayButton.className = 'day-button';
    dayButton.textContent = day;
    dayButton.dataset.date = `${currentPickerYear}-${String(currentPickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Mark today
    if (isCurrentMonth && day === todayDate) {
      dayButton.classList.add('today');
    }
    
    // Mark selected day
    if (isSelectedMonth && selectedDate.getDate() === day) {
      dayButton.classList.add('selected-day');
    }
    
    // Add click handler
    dayButton.addEventListener('click', () => {
      // Remove 'selected-day' class from previously selected day
      const prevSelected = monthDays.querySelector('.selected-day');
      if (prevSelected) {
        prevSelected.classList.remove('selected-day');
      }
      
      // Add 'selected-day' class to clicked day
      dayButton.classList.add('selected-day');
      
      // Update temp selected date
      tempSelectedDate = dayButton.dataset.date;
    });
    
    monthDays.appendChild(dayButton);
  }
  
  // Add additional styles for grid layout
  monthDays.style.gridTemplateRows = `repeat(${Math.ceil((totalDays + firstDayOffset) / 7)}, auto)`;
}

// Time selection functions
function selectHour(hour) {
  selectedHour = hour;
  hourButtons.forEach(btn => {
    if (btn.dataset.hour === hour) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
  updateTimeInput();
}

function selectMinute(minute) {
  selectedMinute = minute;
  minuteButtons.forEach(btn => {
    if (btn.dataset.minute === minute) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
  updateTimeInput();
}

function selectPeriod(period) {
  selectedPeriod = period;
  periodButtons.forEach(btn => {
    if (btn.dataset.period === period) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
  updateTimeInput();
}

function updateTimeInput() {
  if (selectedHour && selectedMinute) {
    let hour = parseInt(selectedHour);
    
    // Convert to 24-hour format if PM
    if (selectedPeriod === 'PM' && hour < 12) {
      hour += 12;
    }
    // Handle 12 AM special case
    if (selectedPeriod === 'AM' && hour === 12) {
      hour = 0;
    }
    
    // Format hour and minute with leading zeros
    const formattedHour = hour.toString().padStart(2, '0');
    timeInput.value = `${formattedHour}:${selectedMinute}`;
  } else {
    timeInput.value = '';
  }
}

// Tab Functions
function switchTab(tabName) {
  if (tabName === 'notes') {
    notesTab.classList.add('active');
    calendarTab.classList.remove('active');
    notesView.classList.add('active');
    calendarView.classList.remove('active');
  } else {
    notesTab.classList.remove('active');
    calendarTab.classList.add('active');
    notesView.classList.remove('active');
    calendarView.classList.add('active');
    
    // Close add note form when switching to calendar
    if (addNoteForm.classList.contains('open')) {
      toggleAddNoteForm();
    }
    
    renderCalendar(); // Re-render calendar when switching to calendar tab
  }
}

// Dark Mode
function initDarkMode() {
  // If no preference is set, default to dark mode
  const savedPreference = localStorage.getItem('darkMode');
  const isDarkMode = savedPreference === null ? true : savedPreference === 'true';
  
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  }
  
  // If no preference was saved, save the default (dark)
  if (savedPreference === null) {
    localStorage.setItem('darkMode', 'true');
  }
}

function toggleDarkMode() {
  const isDarkMode = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
}

// Notes Functions
function loadNotes() {
  try {
    const savedNotes = localStorage.getItem('notes');
    
    if (savedNotes) {
      try {
        notes = JSON.parse(savedNotes);
        
        // Verificar se o resultado é um array
        if (!Array.isArray(notes)) {
          throw new Error('Dados carregados não são um array');
        }
        
        // Limpar possíveis notas corrompidas
        cleanupCorruptedNotes();
        console.log(`Notas carregadas com sucesso: ${notes.length}`);
        return true;
      } catch (parseError) {
        console.error('Erro ao analisar notas salvas:', parseError);
        
        // Tentar restaurar do backup
        const backupNotes = localStorage.getItem('notes_backup');
        if (backupNotes) {
          try {
            notes = JSON.parse(backupNotes);
            if (Array.isArray(notes)) {
              cleanupCorruptedNotes();
              console.log(`Notas restauradas do backup: ${notes.length}`);
              return true;
            }
          } catch (backupError) {
            console.error('Falha ao carregar backup:', backupError);
          }
        }
        
        // Caso todas as tentativas falhem, iniciar com uma lista vazia
        notes = [];
        return false;
      }
    } else {
      notes = [];
      return true;
    }
  } catch (error) {
    console.error('Erro ao acessar localStorage:', error);
    notes = [];
    return false;
  }
}

function saveNotes() {
  try {
    if (notes && Array.isArray(notes)) {
      // Remover possíveis notas inválidas antes de salvar
      const validNotes = notes.filter(note => note && note.id && typeof note.text === 'string');
      
      // Realizar backup da versão anterior em caso de falha
      const previousNotes = localStorage.getItem('notes');
      if (previousNotes) {
        localStorage.setItem('notes_backup', previousNotes);
      }
      
      // Salvar notas atuais
      localStorage.setItem('notes', JSON.stringify(validNotes));
      
      // Salvar timestamp da última gravação
      localStorage.setItem('notes_last_saved', Date.now());
      
      return true;
    }
  } catch (error) {
    console.error('Erro ao salvar notas:', error);
    
    // Tentar restaurar do backup em caso de erro
    const backup = localStorage.getItem('notes_backup');
    if (backup) {
      try {
        localStorage.setItem('notes', backup);
      } catch (backupError) {
        console.error('Falha ao restaurar backup:', backupError);
      }
    }
    
    return false;
  }
}

function addNote() {
  const text = noteInput.value.trim();
  if (text === '') return;
  
  // Gather date and time info
  const useDate = dateSection.style.display !== 'none';
  const date = useDate ? datePicker.value : '';
  const time = useDate ? timeInput.value : '';
  const isRecurring = useDate ? recurringCheck.checked : false;
  
  // Create note object
  const newNote = {
    id: Date.now().toString(),
    text,
    date,
    time,
    isRecurring,
    showInCalendar: true,
    color: selectedColor
  };
  
  // Add to array and save
  notes.push(newNote);
  saveNotes();
  
  // Reset form
  noteInput.value = '';
  timeInput.value = '';
  recurringCheck.checked = false;
  selectColor('default'); // Reset to default color
  
  // Re-render notes and calendar
  renderNotes();
  renderCalendar();
  
  // Focus back on input for quick note taking
  noteInput.focus();
}

function deleteNote(noteId) {
  // Convert to string for consistent comparison
  const idToDelete = noteId.toString();
  
  // Filter out the note with the matching ID
  notes = notes.filter(note => note.id.toString() !== idToDelete);
  
  // Save to localStorage and re-render
  saveNotes();
  renderNotes();
  renderCalendar();
}

function toggleCalendar(noteId) {
  // Convert to string for consistent comparison
  const idToToggle = noteId.toString();
  
  // Find the note using string comparison
  const index = notes.findIndex(note => note.id.toString() === idToToggle);
  
  if (index !== -1) {
    // Toggle the showInCalendar property
    notes[index].showInCalendar = !notes[index].showInCalendar;
    
    // Log for debugging
    console.log(`Note ${idToToggle} calendar visibility changed to: ${notes[index].showInCalendar}`);
    
    // Save to localStorage
    saveNotes();
    
    // Re-render the calendar view if we're on that tab
    if (calendarView.classList.contains('active')) {
      renderCalendar();
    }
    
    return notes[index].showInCalendar; // Return the new state
  }
  
  return null; // Return null if note not found
}

// Rendering notes with improved UI and split into dated/undated columns
function renderNotes() {
  // Clear both note lists
  undatedNotesList.innerHTML = '';
  datedNotesList.innerHTML = '';
  
  // Split notes into dated and undated
  const datedNotes = notes.filter(note => note.date);
  const undatedNotes = notes.filter(note => !note.date);
  
  // Render undated notes on the left
  undatedNotes.forEach((note) => {
    const noteCard = createNoteCard(note);
    undatedNotesList.appendChild(noteCard);
  });
  
  // Render dated notes on the right
  datedNotes.forEach((note) => {
    const noteCard = createNoteCard(note);
    datedNotesList.appendChild(noteCard);
  });
}

// Helper function to create a note card
function createNoteCard(note) {
  const noteCard = document.createElement('div');
  noteCard.className = `note-card color-${note.color || 'default'}`;
  noteCard.draggable = true;
  noteCard.dataset.id = note.id;
  
  // Create note content container
  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  
  // Create editable note text
  const noteText = document.createElement('div');
  noteText.className = 'note-text';
  noteText.contentEditable = true;
  noteText.textContent = note.text;
  noteText.dataset.originalText = note.text;
  
  // Handle editing note text
  noteText.addEventListener('blur', () => {
    const newText = noteText.textContent.trim();
    if (newText !== note.text) {
      // Update note text in the array
      note.text = newText;
      saveNotes();
      renderCalendar(); // Update calendar if text changed
    }
  });
  
  // Handle keyboard events (Enter to save, Escape to cancel)
  noteText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      noteText.blur();
    } else if (e.key === 'Escape') {
      noteText.textContent = noteText.dataset.originalText;
      noteText.blur();
    }
  });
  
  noteContent.appendChild(noteText);
  
  // Note actions
  const noteActions = document.createElement('div');
  noteActions.className = 'note-actions';
  
  // Edit color button - new feature
  const colorEditBtn = document.createElement('button');
  colorEditBtn.className = 'edit-color';
  colorEditBtn.innerHTML = '🎨';
  colorEditBtn.title = 'Change note color';
  colorEditBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleColorEdit(note.id);
  });
  
  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-note';
  deleteBtn.innerHTML = '🗑️';
  deleteBtn.title = 'Delete note';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteNote(note.id);
    renderNotes();
    renderCalendar();
  });
  
  // Calendar toggle button
  const calendarBtn = document.createElement('button');
  calendarBtn.className = 'calendar-checkbox';
  calendarBtn.innerHTML = note.showInCalendar ? '📆' : '🗓️';
  calendarBtn.title = 'Set date and time';
  calendarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Create or show date-time editor section if not already visible
    let dateTimeEditor = noteCard.querySelector('.note-date-time-editor');
    
    if (!dateTimeEditor) {
      // Create date-time editor section
      dateTimeEditor = document.createElement('div');
      dateTimeEditor.className = 'note-edit-controls note-date-time-editor';
      
      // Create date input
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.className = 'edit-date-input';
      
      // Set current date if available
      if (note.date) {
        dateInput.value = note.date;
      } else {
        // Set to today's date as default
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
      }
      
      // Create time input
      const timeInput = document.createElement('input');
      timeInput.type = 'time';
      timeInput.className = 'edit-time-input';
      
      // Set current time if available
      if (note.time) {
        timeInput.value = note.time;
      }
      
      // Create recurring checkbox
      const recurringContainer = document.createElement('div');
      recurringContainer.className = 'recurring-option';
      
      const recurringCheckbox = document.createElement('input');
      recurringCheckbox.type = 'checkbox';
      recurringCheckbox.id = `recurring-${note.id}`;
      recurringCheckbox.checked = note.isRecurring || false;
      
      const recurringLabel = document.createElement('label');
      recurringLabel.htmlFor = `recurring-${note.id}`;
      recurringLabel.textContent = 'Repeat weekly';
      
      recurringContainer.appendChild(recurringCheckbox);
      recurringContainer.appendChild(recurringLabel);
      
      // Create save button
      const saveButton = document.createElement('button');
      saveButton.textContent = 'Save';
      saveButton.className = 'primary-btn';
      
      // Create remove date button
      const removeDateButton = document.createElement('button');
      removeDateButton.textContent = 'Remove date';
      removeDateButton.className = 'secondary-btn';
      
      // Handle saving date/time changes
      saveButton.addEventListener('click', () => {
        // Update note with new date/time information
        note.date = dateInput.value;
        note.time = timeInput.value;
        note.isRecurring = recurringCheckbox.checked;
        note.showInCalendar = true;
        
        // Save changes
        saveNotes();
        
        // Update UI and hide editor
        dateTimeEditor.style.display = 'none';
        
        // If note has date, show it in the dated list, otherwise in undated
        renderNotes();
        
        // Re-render calendar if we're on that tab
        if (calendarView.classList.contains('active')) {
          renderCalendar();
        }
      });
      
      // Handle removing date
      removeDateButton.addEventListener('click', () => {
        // Remove date properties
        delete note.date;
        delete note.time;
        delete note.isRecurring;
        note.showInCalendar = false;
        
        // Save changes
        saveNotes();
        
        // Update UI and hide editor
        dateTimeEditor.style.display = 'none';
        
        // Move to undated list
        renderNotes();
        
        // Re-render calendar if we're on that tab
        if (calendarView.classList.contains('active')) {
          renderCalendar();
        }
      });
      
      // Add elements to the editor
      dateTimeEditor.appendChild(document.createElement('label')).textContent = 'Date:';
      dateTimeEditor.appendChild(dateInput);
      dateTimeEditor.appendChild(document.createElement('label')).textContent = 'Time (optional):';
      dateTimeEditor.appendChild(timeInput);
      dateTimeEditor.appendChild(recurringContainer);
      
      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'editor-buttons';
      buttonContainer.appendChild(saveButton);
      buttonContainer.appendChild(removeDateButton);
      dateTimeEditor.appendChild(buttonContainer);
      
      // Add the editor to the note card
      noteCard.appendChild(dateTimeEditor);
    } else {
      // Toggle visibility
      dateTimeEditor.style.display = dateTimeEditor.style.display === 'none' ? 'flex' : 'none';
    }
  });
  
  // Update the calendar button appearance based on whether the note has a date
  if (note.date) {
    calendarBtn.classList.add('has-date');
    calendarBtn.innerHTML = '📆';
  } else {
    calendarBtn.classList.remove('has-date');
    calendarBtn.innerHTML = '🗓️';
  }
  
  // Add buttons to actions
  noteActions.appendChild(colorEditBtn);
  noteActions.appendChild(calendarBtn);
  noteActions.appendChild(deleteBtn);
  
  // Add actions to note content
  noteContent.appendChild(noteActions);
  
  // Add content to card
  noteCard.appendChild(noteContent);
  
  // If note has date/time, add meta section
  if (note.date) {
    const noteMeta = document.createElement('div');
    noteMeta.className = 'note-meta';
    
    if (note.isRecurring) {
      const recurringIcon = document.createElement('span');
      recurringIcon.className = 'note-meta-item note-meta-recurring';
      recurringIcon.innerHTML = '🔄 Weekly';
      noteMeta.appendChild(recurringIcon);
    }
    
    if (note.date) {
      const dateItem = document.createElement('span');
      dateItem.className = 'note-meta-item note-meta-date';
      
      // Format the date
      const formattedDate = formatDate(note.date);
      let metaText = `📅 ${formattedDate}`;
      
      // Add time if specified
      if (note.time) {
        metaText += ` ⏰ ${formatTime(note.time)}`;
      }
      
      dateItem.innerHTML = metaText;
      noteMeta.appendChild(dateItem);
    }
    
    noteCard.appendChild(noteMeta);
  }
  
  // Color editor container (hidden by default)
  const colorEditor = document.createElement('div');
  colorEditor.className = 'note-color-editor';
  colorEditor.style.display = 'none';
  
  // Create the color options
  ['default', 'blue', 'green', 'red', 'purple'].forEach(color => {
    const colorBtn = document.createElement('button');
    colorBtn.className = `color-option ${color}${note.color === color ? ' selected' : ''}`;
    colorBtn.dataset.color = color;
    
    colorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Update note color
      note.color = color;
      saveNotes();
      
      // Update the card color
      noteCard.className = `note-card color-${color}`;
      
      // Update selected state
      colorEditor.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.color === color);
      });
      
      // Hide the color editor
      colorEditor.style.display = 'none';
    });
    
    colorEditor.appendChild(colorBtn);
  });
  
  noteCard.appendChild(colorEditor);
  
  // Make note draggable
  noteCard.addEventListener('dragstart', (e) => {
    draggedNote = note.id;
    e.dataTransfer.setData('text/plain', note.id);
    noteCard.classList.add('dragging');
  });

  noteCard.addEventListener('dragend', () => {
    noteCard.classList.remove('dragging');
    draggedNote = null;
  });

  noteCard.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  noteCard.addEventListener('dragenter', (e) => {
    e.preventDefault();
    noteCard.classList.add('drag-over');
  });

  noteCard.addEventListener('dragleave', () => {
    noteCard.classList.remove('drag-over');
  });

  noteCard.addEventListener('drop', (e) => {
    e.preventDefault();
    noteCard.classList.remove('drag-over');
    
    if (draggedNote && draggedNote.id !== note.id) {
      const draggedIndex = notes.findIndex(n => n.id === draggedNote.id);
      const targetIndex = notes.findIndex(n => n.id === note.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Reorder notes
        const [movedNote] = notes.splice(draggedIndex, 1);
        notes.splice(targetIndex, 0, movedNote);
        saveNotes();
        renderNotes();
      }
    }
  });
  
  // Click to toggle edit controls
  noteCard.addEventListener('click', () => {
    // Toggle visibility of edit controls
    const isVisible = noteActions.style.display === 'flex';
    noteActions.style.display = isVisible ? 'none' : 'flex';
  });

  return noteCard;
}

// Function to toggle the color editor
function toggleColorEdit(noteId) {
  const noteCard = document.querySelector(`.note-card[data-id="${noteId}"]`);
  const colorEditor = noteCard.querySelector('.note-color-editor');
  
  // Toggle display
  colorEditor.style.display = colorEditor.style.display === 'none' ? 'flex' : 'none';
  
  // Close other open color editors
  document.querySelectorAll('.note-color-editor').forEach(editor => {
    if (editor !== colorEditor && editor.style.display !== 'none') {
      editor.style.display = 'none';
    }
  });
  
  // Close on click outside
  if (colorEditor.style.display !== 'none') {
    const closeOnClickOutside = (e) => {
      if (!colorEditor.contains(e.target) && e.target.className !== 'edit-color') {
        colorEditor.style.display = 'none';
        document.removeEventListener('click', closeOnClickOutside);
      }
    };
    
    // Add with slight delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', closeOnClickOutside);
    }, 10);
  }
}

// Format time to be more readable
function formatTime(timeString) {
  if (!timeString) return '';
  
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  } catch (e) {
    return timeString;
  }
}

// Switch calendar view
function switchCalendarView(viewType) {
  currentCalendarView = viewType;
  
  // Update button states
  if (viewType === 'week') {
    weekViewBtn.classList.add('active');
    monthViewBtn.classList.remove('active');
  } else {
    weekViewBtn.classList.remove('active');
    monthViewBtn.classList.add('active');
  }
  
  // Reset offsets when switching views to avoid confusion
  currentWeekOffset = 0;
  currentMonthOffset = 0;
  
  renderCalendar();
}

// Calendar Functions
function renderCalendar() {
  weekDaysContainer.innerHTML = '';
  
  if (currentCalendarView === 'week') {
    renderWeekView();
  } else {
    renderMonthView();
  }
}

// Modified week view to show 7 days with yesterday as first day
function renderWeekView() {
  weekDaysContainer.className = 'grid week-grid';
  weekDaysContainer.innerHTML = '';
  
  // Get current date
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Start with yesterday
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 1 + (currentWeekOffset * 7));
  
  // Track total number of events to determine if auto-zoom is needed
  let totalEvents = 0;
  let maxEventsInOneDay = 0;
  
  // Create 7 days (yesterday, today, and 5 more days)
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const dayName = currentDate.toLocaleDateString(undefined, { weekday: 'long' });
    const dayNumber = currentDate.getDate();
    const monthName = currentDate.toLocaleDateString(undefined, { month: 'short' });
    
    // Create day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.textContent = `${dayName} ${dayNumber} ${monthName}`;
    
    // Mark today's header
    if (isToday(currentDate)) {
      dayHeader.classList.add('today-header');
    }
    
    // Create day container for events
    const dayContainer = document.createElement('div');
    dayContainer.className = 'calendar-day';
    dayContainer.dataset.date = formatDateForDataset(currentDate);
    
    // Mark today's cell
    if (isToday(currentDate)) {
      dayContainer.classList.add('today-cell');
    }
    
    // Filter events for this day
    const dayEvents = getEventsForDay(currentDate);
    
    // Track events for auto-zoom calculation
    totalEvents += dayEvents.length;
    maxEventsInOneDay = Math.max(maxEventsInOneDay, dayEvents.length);
    
    if (dayEvents.length > 0) {
      // Add has-events class to make this day container grow
      dayContainer.classList.add('has-events');
      
      // Set height proportionally based on number of events
      // 80px base height for 1 note, then add 40px for each additional note
      const baseHeight = 80;
      const eventHeight = 40;
      dayContainer.style.minHeight = `${baseHeight + ((dayEvents.length - 1) * eventHeight)}px`;
      
      dayEvents.forEach(event => {
        const eventElement = document.createElement('div');
        // Apply color class based on the note's color
        eventElement.className = `calendar-event color-${event.color || 'default'} ${event.isRecurring ? 'recurring-event' : 'one-time-event'}`;
        eventElement.textContent = event.text;
        
        // Add time if available
        if (event.time) {
          eventElement.textContent += ` (${formatTime(event.time)})`;
        }
        
        // Add tooltip for longer text
        eventElement.title = event.text + (event.time ? ` (${formatTime(event.time)})` : '');
        
        dayContainer.appendChild(eventElement);
      });
    } else {
      const noEvents = document.createElement('div');
      noEvents.className = 'no-events';
      noEvents.textContent = 'No events';
      dayContainer.appendChild(noEvents);
    }
    
    // Add day header and container to the grid
    const dayColumn = document.createElement('div');
    dayColumn.className = 'day-column';
    dayColumn.appendChild(dayHeader);
    dayColumn.appendChild(dayContainer);
    
    weekDaysContainer.appendChild(dayColumn);
  }
  
  // Auto-zoom logic - only zoom out for extreme cases
  if (maxEventsInOneDay > 8) {
    let zoomLevel = 1.0;
    
    // Calculate zoom factor - only zoom out for many events
    if (maxEventsInOneDay > 15) {
      zoomLevel = 0.8; // Very many events
    } else if (maxEventsInOneDay > 10) {
      zoomLevel = 0.9; // Many events
    }
    
    // Apply the zoom level
    document.documentElement.style.zoom = zoomLevel;
  } else {
    // Reset zoom
    document.documentElement.style.zoom = 1.0;
  }
}

// Modified month view to use the offset
function renderMonthView() {
  weekDaysContainer.className = 'grid month-grid';
  
  // Get current date and adjust by month offset
  const today = new Date();
  today.setMonth(today.getMonth() + currentMonthOffset);
  
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Add month title
  const monthTitle = document.createElement('div');
  monthTitle.className = 'month-title';
  monthTitle.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
  weekDaysContainer.appendChild(monthTitle);
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Create day headers for weekdays
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdays.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'month-day-header';
    dayHeader.textContent = day;
    weekDaysContainer.appendChild(dayHeader);
  });
  
  // Add empty cells for days before first day of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'month-day empty';
    weekDaysContainer.appendChild(emptyDay);
  }
  
  // Add cells for each day in month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const dayCell = document.createElement('div');
    dayCell.className = 'month-day';
    dayCell.dataset.date = formatDateForDataset(dayDate);
    
    // Check if this is today
    if (isToday(dayDate)) {
      dayCell.classList.add('today-cell');
    }
    
    // Add day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);
    
    // Add events for this day
    const dayEvents = getEventsForDay(dayDate);
    
    if (dayEvents.length > 0) {
      // Add has-events class for styling
      dayCell.classList.add('has-events');
      
      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'day-events';
      
      // Show at most 3 events, with a "+X more" indicator if there are more
      const displayedEvents = dayEvents.slice(0, 3);
      displayedEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = `month-event color-${event.color || 'default'}`;
        
        // Add recurring indicator if applicable
        if (event.isRecurring) {
          eventElement.classList.add('recurring-event');
          eventElement.innerHTML = `<span class="recurring-icon">🔄</span> ${event.text}`;
        } else {
          eventElement.textContent = event.text;
        }
        
        // Add time if available
        if (event.time) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'event-time';
          timeSpan.textContent = formatTime(event.time);
          eventElement.appendChild(timeSpan);
        }
        
        eventElement.title = event.text + (event.time ? ` (${formatTime(event.time)})` : '');
        
        // Add click event to highlight the day
        eventElement.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // Remove highlight from any previously highlighted day
          document.querySelectorAll('.month-day.highlighted').forEach(el => {
            el.classList.remove('highlighted');
          });
          
          // Highlight this day
          dayCell.classList.add('highlighted');
        });
        
        eventsContainer.appendChild(eventElement);
      });
      
      // Add "more" indicator if needed
      if (dayEvents.length > 3) {
        const moreIndicator = document.createElement('div');
        moreIndicator.className = 'more-events';
        moreIndicator.textContent = `+${dayEvents.length - 3} more`;
        
        // Make the "more" indicator clickable to show all events
        moreIndicator.addEventListener('click', (e) => {
          e.stopPropagation();
          alert(`All events for ${day} ${getMonthName(currentMonth)}:\n\n${dayEvents.map(event => 
            `• ${event.text}${event.time ? ` (${formatTime(event.time)})` : ''}`).join('\n')}`);
        });
        
        eventsContainer.appendChild(moreIndicator);
      }
      
      dayCell.appendChild(eventsContainer);
    }
    
    weekDaysContainer.appendChild(dayCell);
  }
}

// Calendar navigation functions
function navigatePrevious() {
  if (currentCalendarView === 'week') {
    currentWeekOffset--;
  } else {
    currentMonthOffset--;
  }
  renderCalendar();
}

function navigateNext() {
  if (currentCalendarView === 'week') {
    currentWeekOffset++;
  } else {
    currentMonthOffset++;
  }
  renderCalendar();
}

// Helper function to get events for a specific day
function getEventsForDay(date) {
  const formattedDate = date.toISOString().split('T')[0];
  return notes.filter(note => {
    // Make sure note has a date and is set to show in calendar
    if (!note.date) return false;
    
    // Only include notes that should show in calendar
    // Default to true if property is undefined (for backward compatibility)
    if (note.showInCalendar === false) return false;
    
    // Check if date matches
    if (note.date === formattedDate) return true;
    
    // Check for recurring weekly events (match day of week)
    if (note.isRecurring && note.date) {
      const noteDate = new Date(note.date);
      return noteDate.getDay() === date.getDay();
    }
    
    return false;
  });
}

// Check if a date is today
function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear();
}

// Format date for dataset attributes
function formatDateForDataset(date) {
  return date.toISOString().split('T')[0];
}

// Format date for display in user interface
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric'
  });
}

// Get month name
function getMonthName(month) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[month];
}

// Toggle add note form
function toggleAddNoteForm() {
  addNoteForm.classList.toggle('open');
  
  // Reset form if closing
  if (!addNoteForm.classList.contains('open')) {
    noteInput.value = '';
    timeInput.value = '';
    recurringCheck.checked = false;
    
    // Set today as default date when opening
  } else {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    datePicker.value = formattedDate;
    noteInput.focus();
  }
}

// Toggle date section
function setupDateToggle() {
  toggleDateBtn.addEventListener('click', function() {
    const isVisible = dateSection.style.display !== 'none';
    dateSection.style.display = isVisible ? 'none' : 'block';
    toggleDateBtn.textContent = isVisible ? '+ Add Date' : '- Remove Date';
    
    // Clear date fields if hiding
    if (isVisible) {
      datePicker.value = '';
      timeInput.value = '';
      recurringCheck.checked = false;
    } else {
      // Set today as default date when showing
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      datePicker.value = formattedDate;
    }
  });
}

// Function to clean up notes that may be corrupted
function cleanupCorruptedNotes() {
  notes = notes.filter(note => {
    // Basic validation of note object structure
    if (!note || typeof note !== 'object') return false;
    if (!note.id || !note.text) return false;
    
    // Convert old format notes if needed
    if (note.date && typeof note.showInCalendar === 'undefined') {
      note.showInCalendar = true;
    }
    
    // Make sure all notes have showInCalendar property
    if (typeof note.showInCalendar === 'undefined') {
      note.showInCalendar = note.date ? true : false;
    }
    
    // Ensure color property exists
    if (!note.color) {
      note.color = 'default';
    }
    
    return true;
  });
  
  saveNotes();
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Save notes when window is closed or page is refreshed
window.addEventListener('beforeunload', function() {
  // Force save notes to localStorage before the application closes
  if (notes && notes.length > 0) {
    localStorage.setItem('notes', JSON.stringify(notes));
    console.log('Notas salvas antes de fechar: ' + notes.length);
  }
});

// Listen for the custom savebeforeclose event from the main process
window.addEventListener('savebeforeclose', function() {
  // Force save to ensure notes are not lost during system shutdown or sleep
  if (notes && notes.length > 0) {
    localStorage.setItem('notes', JSON.stringify(notes));
    console.log('Notas salvas antes de suspensão/desligamento: ' + notes.length);
  }
});

// Mouse wheel zoom handling with Ctrl key
document.addEventListener('wheel', function(event) {
  if (event.ctrlKey) {
    event.preventDefault();
    
    // Determine zoom direction
    const zoomDirection = event.deltaY < 0 ? 1 : -1;
    const currentZoom = parseFloat(document.documentElement.style.zoom || 1);
    
    // Calculate new zoom level
    let newZoom = currentZoom + (zoomDirection * 0.1);
    
    // Limit zoom range
    newZoom = Math.max(0.5, Math.min(2, newZoom));
    
    // Apply zoom
    document.documentElement.style.zoom = newZoom;
  }
}, { passive: false });