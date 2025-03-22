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
  const savedNotes = localStorage.getItem('notes');
  if (savedNotes) {
    notes = JSON.parse(savedNotes);
  }
}

function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
}

function addNote() {
  const noteText = noteInput.value.trim();
  if (noteText === '') return;
  
  // Create a new note
  const newNote = {
    id: Date.now(),
    text: noteText,
    time: timeInput.value || '',
    inCalendar: true, // Default to showing in calendar
    created: new Date().toISOString(),
  };
  
  // Only add date if the date section is visible
  if (dateSection.style.display !== 'none') {
    newNote.date = datePicker.value;
    
    // Set note type based on recurring checkbox
    if (recurringCheck.checked) {
      newNote.type = 'recurring';
      // Get the day of week from the selected date
      const selectedDate = new Date(datePicker.value);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      newNote.recurringDay = dayNames[selectedDate.getDay()];
    } else {
      newNote.type = 'one-time';
    }
  } else {
    // No date for this note
    newNote.type = 'one-time';
  }
  
  notes.push(newNote);
  saveNotes();
  renderNotes();
  renderCalendar();
  
  // Clear inputs and selections
  noteInput.value = '';
  hourButtons.forEach(btn => btn.classList.remove('selected'));
  minuteButtons.forEach(btn => btn.classList.remove('selected'));
  selectedHour = null;
  selectedMinute = null;
  recurringCheck.checked = false;
  
  // Hide date section
  dateSection.style.display = 'none';
  
  // Focus back on the note input for faster entry of multiple notes
  noteInput.focus();
}

function deleteNote(noteId) {
  notes = notes.filter(note => note.id !== Number(noteId));
  saveNotes();
  renderNotes();
  renderCalendar();
}

function toggleCalendar(noteId) {
  const index = notes.findIndex(note => note.id === Number(noteId));
  if (index !== -1) {
    notes[index].inCalendar = !notes[index].inCalendar;
    saveNotes();
    renderCalendar();
  }
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
  noteCard.className = 'note-card';
  noteCard.draggable = true;
  noteCard.dataset.id = note.id;
  
  // Add class based on note type
  if (note.type === 'recurring') {
    noteCard.classList.add('recurring-note');
  } else {
    noteCard.classList.add('one-time-note');
  }
  
  // Create note content container
  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  
  // Create text content (initially not editable)
  const textElement = document.createElement('div');
  textElement.className = 'note-text';
  textElement.contentEditable = false;
  textElement.textContent = note.text;
  
  // Make text editable on click
  textElement.addEventListener('click', (e) => {
    e.stopPropagation();
    textElement.contentEditable = true;
    textElement.focus();
    
    // Place cursor at the end of text
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(textElement);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  });
  
  textElement.addEventListener('blur', () => {
    // Save changes when user clicks away
    if (textElement.textContent.trim() !== note.text) {
      note.text = textElement.textContent.trim();
      saveNotes();
      renderCalendar();
    }
    // Make not editable again
    textElement.contentEditable = false;
  });
  
  textElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      textElement.blur();
    }
  });
  
  noteContent.appendChild(textElement);
  noteCard.appendChild(noteContent);
  
  // Create note metadata display
  const noteMeta = document.createElement('div');
  noteMeta.className = 'note-meta';
  
  // Date/time metadata
  if (note.date) {
    if (note.type === 'recurring') {
      // Display recurring day
      const recurringItem = document.createElement('div');
      recurringItem.className = 'note-meta-item note-meta-recurring';
      recurringItem.innerHTML = `<span class="icon">🔄</span> Every ${note.recurringDay}`;
      noteMeta.appendChild(recurringItem);
    } else {
      // Display specific date
      const dateObj = new Date(note.date);
      const formattedDate = dateObj.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric'
      });
      
      const dateItem = document.createElement('div');
      dateItem.className = 'note-meta-item note-meta-date';
      dateItem.innerHTML = `<span class="icon">📅</span> ${formattedDate}`;
      noteMeta.appendChild(dateItem);
    }
    
    // Time metadata (if present)
    if (note.time) {
      const timeItem = document.createElement('div');
      timeItem.className = 'note-meta-item';
      timeItem.innerHTML = `<span class="icon">⏰</span> ${formatTime(note.time)}`;
      noteMeta.appendChild(timeItem);
    }
  }
  
  noteCard.appendChild(noteMeta);
  
  // Create simple edit controls (initially hidden)
  const editControls = document.createElement('div');
  editControls.className = 'note-edit-controls';
  editControls.style.display = 'none';
  
  // Add date picker
  const dateEdit = document.createElement('input');
  dateEdit.type = 'date';
  dateEdit.className = 'edit-date-input';
  dateEdit.value = note.date || '';
  
  dateEdit.addEventListener('change', () => {
    note.date = dateEdit.value;
    
    // If recurring, update the day of week
    if (note.type === 'recurring') {
      const selectedDate = new Date(dateEdit.value);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      note.recurringDay = dayNames[selectedDate.getDay()];
    }
    
    saveNotes();
    renderNotes();
    renderCalendar();
  });
  
  // Add remove date button
  const removeDateBtn = document.createElement('button');
  removeDateBtn.className = 'remove-date-btn';
  removeDateBtn.textContent = 'Remove Date';
  removeDateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    note.date = '';
    note.type = 'one-time';
    saveNotes();
    renderNotes();
    renderCalendar();
  });
  
  editControls.appendChild(dateEdit);
  editControls.appendChild(removeDateBtn);
  
  // Add recurring checkbox
  const recurringLabel = document.createElement('label');
  recurringLabel.style.display = 'block';
  recurringLabel.style.margin = '8px 0';
  
  const recurringEdit = document.createElement('input');
  recurringEdit.type = 'checkbox';
  recurringEdit.checked = note.type === 'recurring';
  
  recurringEdit.addEventListener('change', () => {
    if (recurringEdit.checked) {
      note.type = 'recurring';
      // Set recurring day based on the date
      const selectedDate = new Date(note.date);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      note.recurringDay = dayNames[selectedDate.getDay()];
    } else {
      note.type = 'one-time';
    }
    
    saveNotes();
    renderNotes();
    renderCalendar();
  });
  
  recurringLabel.appendChild(recurringEdit);
  recurringLabel.appendChild(document.createTextNode(' Repeat weekly'));
  editControls.appendChild(recurringLabel);
  
  // Simple time options with predefined values
  const timeLabel = document.createElement('div');
  timeLabel.textContent = 'Time:';
  timeLabel.style.marginTop = '8px';
  editControls.appendChild(timeLabel);
  
  const timeButtonsContainer = document.createElement('div');
  timeButtonsContainer.className = 'quick-time-selector';
  
  const commonTimes = ['08:00', '09:00', '12:00', '13:00', '15:00', '17:00', '19:00'];
  
  commonTimes.forEach(timeValue => {
    const timeBtn = document.createElement('button');
    timeBtn.className = 'time-btn';
    timeBtn.textContent = formatTime(timeValue);
    
    if (note.time === timeValue) {
      timeBtn.classList.add('selected');
    }
    
    timeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Toggle selection
      if (note.time === timeValue) {
        note.time = '';
        timeBtn.classList.remove('selected');
      } else {
        note.time = timeValue;
        
        // Deselect other buttons
        timeButtonsContainer.querySelectorAll('.time-btn').forEach(btn => {
          btn.classList.remove('selected');
        });
        
        timeBtn.classList.add('selected');
      }
      
      saveNotes();
      renderNotes();
      renderCalendar();
    });
    
    timeButtonsContainer.appendChild(timeBtn);
  });
  
  // Add clear time button
  const clearTimeBtn = document.createElement('button');
  clearTimeBtn.className = 'time-btn';
  clearTimeBtn.textContent = 'Clear';
  clearTimeBtn.style.marginLeft = '8px';
  
  clearTimeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    note.time = '';
    timeButtonsContainer.querySelectorAll('.time-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    saveNotes();
    renderNotes();
    renderCalendar();
  });
  
  timeButtonsContainer.appendChild(clearTimeBtn);
  editControls.appendChild(timeButtonsContainer);
  
  noteCard.appendChild(editControls);
  
  // Action buttons
  const noteActions = document.createElement('div');
  noteActions.className = 'note-actions';
  
  // Add calendar toggle
  const calendarCheck = document.createElement('input');
  calendarCheck.type = 'checkbox';
  calendarCheck.className = 'calendar-checkbox';
  calendarCheck.checked = note.inCalendar;
  calendarCheck.addEventListener('change', (e) => {
    e.stopPropagation();
    note.inCalendar = calendarCheck.checked;
    saveNotes();
    renderCalendar();
  });
  
  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-note';
  editBtn.innerHTML = '✏️';
  editBtn.title = 'Edit date/time';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    // Toggle edit controls
    const isVisible = editControls.style.display === 'flex';
    editControls.style.display = isVisible ? 'none' : 'flex';
  });
  
  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-note';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    deleteNote(note.id);
  });
  
  noteActions.appendChild(calendarCheck);
  noteActions.appendChild(editBtn);
  noteActions.appendChild(deleteBtn);
  noteCard.appendChild(noteActions);
  
  // Add drag and drop functionality
  noteCard.addEventListener('dragstart', (e) => {
    // Don't start drag if we're editing text
    if (document.activeElement === textElement) {
      e.preventDefault();
      return;
    }
    draggedNote = note;
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
    const isVisible = editControls.style.display === 'flex';
    editControls.style.display = isVisible ? 'none' : 'flex';
  });

  return noteCard;
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
        eventElement.className = `calendar-event ${event.type === 'recurring' ? 'recurring-event' : 'one-time-event'}`;
        eventElement.textContent = event.text;
        
        // Add time if available
        if (event.time) {
          eventElement.textContent += ` (${formatTime(event.time)})`;
        }
        
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
  monthTitle.style.gridColumn = "1 / -1"; // Span all columns
  weekDaysContainer.appendChild(monthTitle);
  
  // Add day headers (Sun, Mon, etc.)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayNames.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.textContent = day;
    weekDaysContainer.appendChild(dayHeader);
  });
  
  // First day of month & last day of month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  
  // Get the day of week of the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // Fill in the blank days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    const blankDay = document.createElement('div');
    blankDay.className = 'calendar-day month-day';
    weekDaysContainer.appendChild(blankDay);
  }
  
  // Fill in the actual days of the month
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const currentDate = new Date(currentYear, currentMonth, day);
    
    const dayContainer = document.createElement('div');
    dayContainer.className = 'calendar-day month-day';
    dayContainer.dataset.date = formatDateForDataset(currentDate);
    
    // Add day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayContainer.appendChild(dayNumber);
    
    // Mark today's cell
    if (isToday(currentDate)) {
      dayContainer.classList.add('today-cell');
    }
    
    // Get events for this day
    const dayEvents = getEventsForDay(currentDate);
    
    // Add events to the day
    const maxDisplayEvents = 2; // Limit the number of displayed events per day
    let displayedCount = 0;
    
    dayEvents.forEach(event => {
      if (displayedCount < maxDisplayEvents) {
        const eventElement = document.createElement('div');
        eventElement.className = `calendar-event month-event ${event.type === 'recurring' ? 'recurring-event' : 'one-time-event'}`;
        
        // Truncate text for month view
        const maxLength = 15;
        const displayText = event.text.length > maxLength 
          ? event.text.substring(0, maxLength) + '...' 
          : event.text;
        
        eventElement.textContent = displayText;
        dayContainer.appendChild(eventElement);
        displayedCount++;
      }
    });
    
    // Show "+X more" if there are more events
    if (dayEvents.length > maxDisplayEvents) {
      const moreEvents = document.createElement('div');
      moreEvents.className = 'more-events';
      moreEvents.textContent = `+${dayEvents.length - maxDisplayEvents} more`;
      dayContainer.appendChild(moreEvents);
    }
    
    weekDaysContainer.appendChild(dayContainer);
  }
}

// Helper function to get month name
function getMonthName(monthIndex) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[monthIndex];
}

// Navigation functions
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

// Get notes for a specific day
function getNotesForDay(day) {
  const dayDate = new Date(day.date);
  const dayName = day.name;
  
  return notes.filter(note => {
    // Skip notes that shouldn't be in calendar
    if (!note.inCalendar) return false;
    
    if (note.type === 'recurring') {
      // For recurring notes, check if day of week matches
      return note.recurringDay === dayName;
    } else {
      // For one-time notes, check if date matches
      const noteDate = new Date(note.date);
      return noteDate.toDateString() === dayDate.toDateString();
    }
  });
}

function getWeekDays() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, etc.
  
  // Always place today as the second item (index 1)
  // First day shown will be yesterday
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 1);
  
  const days = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Show 6 days (yesterday, today, and 4 more days)
  for (let i = 0; i < 6; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    days.push({
      date: date.toISOString().split('T')[0],
      name: dayNames[date.getDay()]
    });
  }
  
  return days;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear();
}

// Toggle add note form
function toggleAddNoteForm() {
  toggleAddNoteBtn.classList.toggle('open');
  addNoteForm.classList.toggle('open');
}

// Clean up problematic notes like "teste" and "teste 2"
function cleanupCorruptedNotes() {
  // Filter out notes with known problematic text or malformed structure
  notes = notes.filter(note => {
    // Check if note has a valid structure
    if (!note || typeof note !== 'object') return false;
    
    // Check if note has an ID (required for proper deletion)
    if (!note.id) return false;
    
    // Filter out specific problematic notes by their text
    if (note.text === 'teste' || note.text === 'teste 2') return false;
    
    return true;
  });
  
  // Save the cleaned notes array
  saveNotes();
}

// Helper function to get events for a specific day
function getEventsForDay(date) {
  const dateString = formatDateForDataset(date);
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  
  // Filter notes for this day
  const dayEvents = notes.filter(note => {
    // Only include notes marked for calendar display
    if (!note.inCalendar) return false;
    
    if (note.type === 'one-time') {
      // Match one-time events by exact date
      return note.date === dateString;
    } else if (note.type === 'recurring') {
      // Match recurring events by day of week
      return note.recurringDay === dayOfWeek;
    }
    
    return false;
  });
  
  // Sort events: first without time, then by ascending time
  dayEvents.sort((a, b) => {
    // If both have time or both don't have time
    if ((!a.time && !b.time) || (a.time && b.time)) {
      if (!a.time) {
        return 0; // Keep original order for items without time
      }
      // Compare time strings directly for ascending order
      return a.time.localeCompare(b.time);
    }
    
    // If only one has time, the one without time comes first
    return a.time ? 1 : -1;
  });
  
  return dayEvents;
}

// Helper function to format date for dataset
function formatDateForDataset(date) {
  // Format date as YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

// Toggle date section visibility
function toggleDateSection() {
  dateSection.style.display = dateSection.style.display === 'none' ? 'block' : 'none';
}

// Add this to setupEventListeners
function setupDateToggle() {
  // Hide date section initially
  dateSection.style.display = 'none';
  
  // Add toggle button event
  toggleDateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleDateSection();
  });
}

// Initialize app
document.addEventListener('DOMContentLoaded', init); 