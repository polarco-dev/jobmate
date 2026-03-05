(() => {
  const KEY = "jobmate-entries-v8"; 
  let entries = load();
  migrateDates(); 
  let editingId = null; 

  const el = (s, r=document) => r.querySelector(s);

  const sidebar = el("#sidebar");
  const sidebarOverlay = el("#sidebarOverlay");
  const menuToggle = el("#menuToggle");
  const sidebarToggle = el("#sidebarToggle");
  const sidebarPageItems = document.querySelectorAll(".sidebar-item[data-page]");
  const mobileNavItems = document.querySelectorAll(".mobile-nav-item[data-page]");
  const MOBILE_BREAKPOINT = 900;

  const pages = {
    dashboard: el("#dashboardPage"),
    stats: el("#statsPage"),
    settings: el("#settingsPage"),
    help: el("#helpPage")
  };
  let currentPage = 'dashboard';

  function isMobileViewport(){
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function setActiveNavigation(pageName){
    const sidebarPage = pageName === 'applications' ? 'dashboard' : pageName;
    sidebarPageItems.forEach(item => {
      item.classList.toggle("active", item.getAttribute("data-page") === sidebarPage);
    });
    mobileNavItems.forEach(item => {
      item.classList.toggle("active", item.getAttribute("data-page") === pageName);
    });
  }

  function openSidebar(){
    if(sidebar) sidebar.classList.add("open");
    if(sidebarOverlay) sidebarOverlay.classList.add("open");
    document.body.classList.add("sidebar-open");
  }

  function closeSidebar(){
    if(sidebar) sidebar.classList.remove("open");
    if(sidebarOverlay) sidebarOverlay.classList.remove("open");
    document.body.classList.remove("sidebar-open");
  }

  function toggleSidebar(){
    if(sidebar && sidebar.classList.contains("open")){
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function switchPage(pageName, options = {}){
    const isMobile = isMobileViewport();
    const requestedPage = (!isMobile && pageName === 'applications') ? 'dashboard' : pageName;
    currentPage = requestedPage;
    const targetPage = requestedPage === 'applications' ? 'dashboard' : requestedPage;

    Object.values(pages).forEach(page => {
      if(page) page.classList.remove("active");
    });

    if(pages[targetPage]){
      pages[targetPage].classList.add("active");
    }

    setActiveNavigation(requestedPage);

    const isMobileDashboard = isMobile && targetPage === 'dashboard';
    document.body.classList.toggle('mobile-home-mode', isMobileDashboard && requestedPage === 'dashboard');
    document.body.classList.toggle('mobile-applications-mode', isMobileDashboard && requestedPage === 'applications');
    if(!isMobileDashboard){
      document.body.classList.remove('mobile-home-mode', 'mobile-applications-mode');
    }
    if(isMobile && currentView !== 'table'){
      switchView('table');
    }

    const titles = {
      dashboard: "Bewerbungsübersicht",
      applications: "Bewerbungen",
      stats: "Erweiterte Statistiken",
      settings: "Einstellungen",
      help: "Hilfe & Anleitungen"
    };
    const titleEl = el(".title");
    if(titleEl && titles[requestedPage]){
      titleEl.textContent = titles[requestedPage];
    }

    if(targetPage === 'dashboard'){
      renderStats();
      renderMobileDashboardOverview();
      if(!isMobile || requestedPage === 'applications'){
        if(currentView === 'table') renderEntries();
        else renderKanbanBoard();
      }
      if(isMobile && requestedPage === 'applications' && options.scrollToList !== false){
        requestAnimationFrame(() => {
          const listNode = currentView === 'kanban' ? el('#kanbanBoard') : el('#entriesCards');
          if(listNode) listNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    } else if(targetPage === 'stats'){
      calculateStats();
    } else if(targetPage === 'settings'){
      loadSettingsToPage();
    }

    closeSidebar();

    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  if(menuToggle) menuToggle.addEventListener("click", toggleSidebar);
  if(sidebarToggle) sidebarToggle.addEventListener("click", () => {
    closeSidebar();
  });
  if(sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && document.body.classList.contains("sidebar-open")){
      closeSidebar();
    }
  });

  const headerLogo = el("#headerLogo");
  if(headerLogo) headerLogo.addEventListener("click", () => {
    switchPage('dashboard');
    resetFilters();
  });

  sidebarPageItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.getAttribute("data-page");

      if(page === 'dashboard'){
        resetFilters();
      }

      switchPage(page);
    });
  });

  mobileNavItems.forEach(item => {
    item.addEventListener("click", () => {
      const page = item.getAttribute("data-page");
      if(page === 'dashboard'){
        resetFilters();
      }
      switchPage(page);
    });
  });

  const THEME_KEY = "jobmate-theme";
  function getThemeBtn(){ return el("#btnTheme"); }
  function applyTheme(t){
    try{
      if(t === "dark") document.documentElement.setAttribute("data-theme","dark");
      else document.documentElement.removeAttribute("data-theme");
      const _b = getThemeBtn();
      if(_b){
        _b.innerHTML = '';
        const newIcon = document.createElement('i');
        newIcon.setAttribute('data-lucide', t === 'dark' ? 'sun' : 'moon');
        _b.appendChild(newIcon);
        if(typeof lucide !== 'undefined') lucide.createIcons();
      }
      localStorage.setItem(THEME_KEY, t);
    }catch(e){}
  }
  (function(){
    let saved = null;
    try{ saved = localStorage.getItem(THEME_KEY); }catch(e){}
    if(!saved){
      try{ saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; }catch(e){ saved='light' }
    }
    applyTheme(saved||'light');
  })();
  const _btn = getThemeBtn();
  if(_btn) _btn.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });


  const counts = {
    total: el("#stTotal"),
    open: el("#stOpen"),
    interview: el("#stInterview"),
    reject: el("#stReject")
  };

  const modal = el("#modal");
  const form  = el("#form");
  const fields = {
    date: el("#date"),
    company: el("#company"),
    position: el("#position"),
    channel: el("#channel"),
    status: el("#status"),
    contact: el("#contact"),
    address: el("#address"),
    notes: el("#notes"),
  };

  const SETTINGS_KEY = "jobmate-settings";
  const settingsModal = el("#settingsModal");
  const settingsForm = el("#settingsForm");
  const firstNameField = el("#firstName");
  const lastNameField = el("#lastName");
  const customerNumberField = el("#customerNumber");

  function loadSettings(){
    try{
      const raw = localStorage.getItem(SETTINGS_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return { 
      firstName: "", 
      lastName: "", 
      customerNumber: "",
      notificationsEnabled: true,
      appointmentReminderDays: 2,
      followUpDays: 14
    };
  }

  function saveSettings(settings){
    try{
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }catch(e){}
  }

  function openSettings(){
    const settings = loadSettings();
    firstNameField.value = settings.firstName || "";
    lastNameField.value = settings.lastName || "";
    customerNumberField.value = settings.customerNumber || "";
    
    const notificationsEnabledField = el("#notificationsEnabled");
    const appointmentReminderDaysField = el("#appointmentReminderDays");
    const followUpDaysField = el("#followUpDays");
    
    if(notificationsEnabledField) notificationsEnabledField.checked = settings.notificationsEnabled !== false;
    if(appointmentReminderDaysField) {
      appointmentReminderDaysField.value = settings.appointmentReminderDays || 2;
      updateSliderValue('appointmentReminderDays');
    }
    if(followUpDaysField) {
      followUpDaysField.value = settings.followUpDays || 14;
      updateSliderValue('followUpDays');
    }
    
    settingsModal.classList.add("open");
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  function loadSettingsToPage(){
    const settings = loadSettings();
    firstNameField.value = settings.firstName || "";
    lastNameField.value = settings.lastName || "";
    customerNumberField.value = settings.customerNumber || "";
    
    const notificationsEnabledField = el("#notificationsEnabled");
    const appointmentReminderDaysField = el("#appointmentReminderDays");
    const followUpDaysField = el("#followUpDays");
    
    if(notificationsEnabledField) notificationsEnabledField.checked = settings.notificationsEnabled !== false;
    if(appointmentReminderDaysField) {
      appointmentReminderDaysField.value = settings.appointmentReminderDays || 2;
      updateSliderValue('appointmentReminderDays');
    }
    if(followUpDaysField) {
      followUpDaysField.value = settings.followUpDays || 14;
      updateSliderValue('followUpDays');
    }
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeSettings(){
    settingsModal.classList.remove("open");
  }

  function updateSliderValue(sliderId){
    const slider = el(`#${sliderId}`);
    if(!slider) return;
    
    const value = parseInt(slider.value);
    const min = parseInt(slider.min);
    const max = parseInt(slider.max);
    const percentage = ((value - min) / (max - min)) * 100;
    
    slider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--border) ${percentage}%, var(--border) 100%)`;
    
    if(sliderId === 'appointmentReminderDays'){
      const valueDisplay = el('#appointmentReminderValue');
      if(valueDisplay) valueDisplay.textContent = `${value} ${value === 1 ? 'Tag' : 'Tage'} vorher`;
    } else if(sliderId === 'followUpDays'){
      const valueDisplay = el('#followUpValue');
      if(valueDisplay) valueDisplay.textContent = `${value} Tage nach Bewerbung`;
    }
  }

  function saveSettingsFromForm(){
    const notificationsEnabledField = el("#notificationsEnabled");
    const appointmentReminderDaysField = el("#appointmentReminderDays");
    const followUpDaysField = el("#followUpDays");
    
    const settings = {
      firstName: firstNameField.value.trim(),
      lastName: lastNameField.value.trim(),
      customerNumber: customerNumberField.value.trim(),
      notificationsEnabled: notificationsEnabledField ? notificationsEnabledField.checked : true,
      appointmentReminderDays: appointmentReminderDaysField ? parseInt(appointmentReminderDaysField.value) : 2,
      followUpDays: followUpDaysField ? parseInt(followUpDaysField.value) : 14
    };
    saveSettings(settings);
    
    const followUpDesc = el('#followUpFilterDesc');
    if(followUpDesc && settings.followUpDays){
      followUpDesc.textContent = `Offene Bewerbungen älter als ${settings.followUpDays} Tage`;
    }
    
    switchPage('dashboard');
    
    checkReminders();
    applyFilters();
    
    showToast('Einstellungen gespeichert', 'success');
  }

  const appointmentSlider = el('#appointmentReminderDays');
  const followUpSlider = el('#followUpDays');
  
  if(appointmentSlider){
    appointmentSlider.addEventListener('input', () => updateSliderValue('appointmentReminderDays'));
  }
  if(followUpSlider){
    followUpSlider.addEventListener('input', () => updateSliderValue('followUpDays'));
  }

  el("#btnSettingsClose").addEventListener("click", closeSettings);
  el("#btnSaveSettings").addEventListener("click", saveSettingsFromForm);
  settingsModal.addEventListener("click", e=>{ if(e.target===settingsModal) closeSettings(); });

  function showToast(title, body, type = 'info'){
    const container = el('#toastContainer');
    if(!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'appointment' ? 'calendar' : type === 'followup' ? 'bell' : 'info';
    
    toast.innerHTML = `
      <div class="toast-icon">
        <i data-lucide="${icon}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${escapeHTML(title)}</div>
        <div class="toast-body">${escapeHTML(body)}</div>
      </div>
      <button class="toast-close">
        <i data-lucide="x"></i>
      </button>
    `;

    container.appendChild(toast);
    if(typeof lucide !== 'undefined') lucide.createIcons();

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => toast.classList.add('toast-show'), 10);
  }

  function sendNotification(title, body, data = {}){
    const settings = loadSettings();
    if(!settings.notificationsEnabled) return;
    
    showToast(title, body, data.type || 'info');
  }

  const LAST_CHECK_KEY = 'jobmate-last-notification-check';

  function checkReminders(){
    const settings = loadSettings();
    if(!settings.notificationsEnabled) return;

    const now = new Date();

    const upcomingAppointments = [];
    entries.forEach(entry => {
      if(entry.appointments && entry.appointments.length > 0){
        entry.appointments.forEach(apt => {
          const aptDate = new Date(apt.date);
          const daysUntil = Math.ceil((aptDate - now) / (1000 * 60 * 60 * 24));
          if(daysUntil >= 1 && daysUntil <= settings.appointmentReminderDays){
            upcomingAppointments.push({
              ...apt,
              company: entry.company,
              daysUntil: daysUntil
            });
          }
        });
      }
    });

    upcomingAppointments.forEach(apt => {
      const dayText = apt.daysUntil === 1 ? 'morgen' : `in ${apt.daysUntil} Tagen`;
      sendNotification(
        `Termin ${dayText}: ${apt.type}`,
        `${apt.company}${apt.location ? ' - ' + apt.location : ''}`,
        { type: 'appointment', id: apt.company }
      );
    });

    const needsFollowUp = entries.filter(entry => {
      if(entry.status !== 'Offen') return false;
      const daysSince = Math.floor((now - new Date(entry.date)) / (1000 * 60 * 60 * 24));
      return daysSince >= settings.followUpDays;
    });

    if(needsFollowUp.length > 0){
      const companies = needsFollowUp.slice(0, 3).map(e => e.company).join(', ');
      const moreText = needsFollowUp.length > 3 ? ` und ${needsFollowUp.length - 3} weitere` : '';
      sendNotification(
        `${needsFollowUp.length} Bewerbung${needsFollowUp.length > 1 ? 'en' : ''} benötigt Follow-up`,
        `${companies}${moreText}`,
        { type: 'followup' }
      );
    }

    localStorage.setItem(LAST_CHECK_KEY, now.toISOString());
  }

  setTimeout(() => {
    checkReminders();
  }, 1000);

  const helpModal = el("#helpModal");

  function openHelp(){
    helpModal.classList.add("open");
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeHelp(){
    helpModal.classList.remove("open");
  }

  el("#btnHelpClose").addEventListener("click", closeHelp);
  helpModal.addEventListener("click", e=>{ if(e.target===helpModal) closeHelp(); });

  document.querySelectorAll('.help-container').forEach(container => {
    const navButtons = container.querySelectorAll('.help-nav-btn');
    const sections = container.querySelectorAll('.help-section');
    const pageRoot = container.closest('#helpPage');
    const sectionSelect = pageRoot ? pageRoot.querySelector('.help-nav-select') : container.querySelector('.help-nav-select');

    function setActiveHelpSection(section){
      if(!section) return;
      navButtons.forEach(b => b.classList.toggle('active', b.dataset.section === section));
      sections.forEach(s => s.classList.toggle('active', s.id === `help-${section}`));
      if(sectionSelect && sectionSelect.value !== section){
        sectionSelect.value = section;
      }
    }

    const currentActiveBtn = Array.from(navButtons).find(b => b.classList.contains('active'));
    const currentSection = currentActiveBtn?.dataset.section || 'quickstart';
    setActiveHelpSection(currentSection);

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => setActiveHelpSection(btn.dataset.section));
    });

    if(sectionSelect){
      sectionSelect.addEventListener('change', () => setActiveHelpSection(sectionSelect.value));
    }
  });

  const statsModal = el("#statsModal");

  function openStats(){
    calculateStats();
    statsModal.classList.add("open");
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeStats(){
    statsModal.classList.remove("open");
  }

  function getFilteredEntriesByPeriod(period = 'month'){
    if(period === 'all') return entries;
    
    const now = new Date();
    let startDate = new Date();
    
    switch(period){
      case 'month':
        startDate.setMonth(now.getMonth());
        startDate.setDate(1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear());
        startDate.setMonth(0);
        startDate.setDate(1);
        break;
    }
    
    return entries.filter(e => {
      const d = new Date(e.date);
      return d >= startDate;
    });
  }

  function calculateStats(){
    if(!entries || entries.length === 0){
      el("#statSuccessRate").textContent = "0%";
      el("#statActivityCount").textContent = "0";
      el("#statChannels").innerHTML = '<div class="stat-label">Keine Daten</div>';
      el("#statUpcomingAppointments").innerHTML = '<div class="stat-label">Keine Termine</div>';
      return;
    }

    const activityPeriod = el("#activityPeriod")?.value || 'month';
    const filteredEntries = getFilteredEntriesByPeriod(activityPeriod);
    
    let labelText = '';
    switch(activityPeriod){
      case 'all': labelText = 'Bewerbungen insgesamt'; break;
      case 'month': labelText = 'Bewerbungen diesen Monat'; break;
      case '3months': labelText = 'Bewerbungen letzte 3 Monate'; break;
      case '6months': labelText = 'Bewerbungen letzte 6 Monate'; break;
      case 'year': labelText = 'Bewerbungen dieses Jahr'; break;
    }
    
    el("#statActivityCount").textContent = filteredEntries.length;
    el("#statActivityLabel").textContent = labelText;

    const interviewCount = filteredEntries.filter(e => e.status === "Vorstellungsgespräch").length;
    const successRate = filteredEntries.length > 0 ? Math.round((interviewCount / filteredEntries.length) * 100) : 0;
    el("#statSuccessRate").textContent = successRate + "%";

    const rejectionCount = filteredEntries.filter(e => e.status === "Absage").length;
    const rejectionRate = filteredEntries.length > 0 ? Math.round((rejectionCount / filteredEntries.length) * 100) : 0;
    el("#statRejectionRate").textContent = rejectionRate + "%";
    el("#statRejectionCount").textContent = `${rejectionCount} Absagen`;

    const channels = {};
    filteredEntries.forEach(e => {
      const ch = e.channel || "Unbekannt";
      channels[ch] = (channels[ch] || 0) + 1;
    });
    const sortedChannels = Object.entries(channels).sort((a, b) => b[1] - a[1]);
    if(sortedChannels.length > 0){
      el("#statChannels").innerHTML = '<div class="stat-list">' + 
        sortedChannels.map(([ch, count]) => 
          `<div class="stat-list-item">
            <span class="stat-list-item-label">${escapeHTML(ch)}</span>
            <span class="stat-list-item-value">${count}</span>
          </div>`
        ).join('') + '</div>';
    } else {
      el("#statChannels").innerHTML = '<div class="stat-label">Keine Daten</div>';
    }

    const allAppointments = entries.reduce((acc, e) => {
      if(e.appointments && e.appointments.length > 0){
        e.appointments.forEach(apt => {
          acc.push({...apt, company: e.company, entryId: e.id});
        });
      }
      return acc;
    }, []);
    
    const now = new Date();
    const upcoming = allAppointments.filter(apt => new Date(apt.date) > now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
    
    if(upcoming.length > 0){
      el("#statUpcomingAppointments").innerHTML = '<div class="stat-list">' + 
        upcoming.map(apt => {
          const date = new Date(apt.date);
          const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
          return `<div class="stat-list-item stat-list-item-clickable" data-entry-id="${attrSafe(apt.entryId)}" style="cursor: pointer;">
            <span class="stat-list-item-label">${escapeHTML(apt.type)} - ${escapeHTML(apt.company)}</span>
            <span class="stat-list-item-value">${dateStr}</span>
          </div>`;
        }).join('') + '</div>';
      
      setTimeout(() => {
        document.querySelectorAll('#statUpcomingAppointments .stat-list-item-clickable').forEach(item => {
          item.addEventListener('click', () => {
            const entryId = item.dataset.entryId;
            if(entryId){
              switchPage('dashboard');
              openEdit(entryId);
            }
          });
        });
      }, 0);
    } else {
      el("#statUpcomingAppointments").innerHTML = '<div class="stat-label">Keine anstehenden Termine</div>';
    }

    const settings = loadSettings();
    const oldApps = entries.filter(e => {
      if(e.status !== "Offen") return false;
      const days = Math.floor((new Date() - new Date(e.date)) / (1000 * 60 * 60 * 24));
      return days >= settings.followUpDays;
    }).length;
    el("#statOldApplications").textContent = oldApps;

  }

  
  document.addEventListener('DOMContentLoaded', () => {
    const activitySelect = el("#activityPeriod");
    if(activitySelect){
      activitySelect.addEventListener('change', (e) => {
        calculateStats();
      });
    }
  });
  
  document.addEventListener('click', (e) => {
    if(e.target.closest('#followUpCard')){
      switchPage('dashboard');
      
      const filterSelect = el("#statusFilter");
      if(filterSelect) {
        filterSelect.value = "Offen";
      }
      
      const followUpFilterEl = el('#followUpFilterOption');
      if(followUpFilterEl) {
        followUpFilterEl.setAttribute('data-active', 'true');
        followUpFilterEl.classList.add('active');
      }
      
      applyFilters();
    }
  });
  el("#btnStatsClose").addEventListener("click", closeStats);
  statsModal.addEventListener("click", e=>{ if(e.target===statsModal) closeStats(); });

  function pad2(n){ return String(n).padStart(2,"0"); }
  function toISO(any){
    if(!any) return "";
    if(any instanceof Date){
      if(isNaN(any)) return "";
      return `${any.getFullYear()}-${pad2(any.getMonth()+1)}-${pad2(any.getDate())}`;
    }
    const str = String(any);
    if(/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if(m){ return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`; }
    const d = new Date(str);
    if(!isNaN(d)){
      return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    }
    return str;
  }
  function toDisp(any){
    const iso = toISO(any);
    if(!iso) return "";
    const [y,m,d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }
  function migrateDates(){
    let changed=false;
    entries = entries.map(e=>{
      const iso = toISO(e.date);
      if(iso !== e.date){ changed=true; return { ...e, date: iso }; }
      return e;
    });
    if(changed) save();
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return [
      mk("2025-03-04","Alpha Tech GmbH","Frontend Developer","Webseite","Offen","hr@alpha.example","Alpha-Str. 1, 12345 Berlin","Vue/React, 40k–48k"),
      mk("2025-03-10","BetaSoft AG","Fullstack Dev","Jobportal","Vorstellungsgespräch","jobs@betasoft.example","Hauptstr. 12, 50667 Köln","Call am 24.03., 10:30"),
      mk("2025-02-20","Gamma Labs","Werkstudent Entwicklung","E-Mail","Absage","kontakt@gammalabs.example","Laborweg 7, 20095 Hamburg","Standardabsage"),
      mk("2025-03-01","Delta Digital","Webentwickler","Webseite","Vorstellungsgespräch","talent@delta.example","Ring 3, 80331 München","Angebot 52k")
    ];
  }
  function save(){ 
    try{ 
      localStorage.setItem(KEY, JSON.stringify(entries)); 
    }catch(e){} 
  }
  function mk(date,company,position,channel,status,contact,address,notes){
    return { 
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random()), 
      date, company, position, channel, status, contact, address, notes,
      documents: [],
      timeline: [{date: date, type: 'Bewerbung verschickt', description: 'Bewerbung wurde versendet'}]
    };
  }

  function migrateEntries(){
    let changed = false;
    entries = entries.map(e => {
      if(!e.documents){ e.documents = []; changed = true; }
      if(!e.links){ e.links = []; changed = true; }
      if(!e.timeline){ 
        e.timeline = [{date: e.date, type: 'Bewerbung verschickt', description: 'Bewerbung wurde versendet'}]; 
        changed = true; 
      }
      return e;
    });
    if(changed) save();
  }
  migrateEntries();

  function renderStats(){
    counts.total.textContent = entries.length;
    counts.open.textContent = entries.filter(e=>e.status==="Offen").length;
    counts.interview.textContent = entries.filter(e=>e.status==="Vorstellungsgespräch").length;
    counts.reject.textContent = entries.filter(e=>e.status==="Absage").length;
  }

  function renderMobileDashboardOverview(){
    const openCountEl = el('#mobileOpenCount');
    const followUpCountEl = el('#mobileFollowUpCount');
    const recentListEl = el('#mobileRecentList');
    if(!openCountEl || !followUpCountEl || !recentListEl) return;

    const settings = loadSettings();
    const now = new Date();
    const openEntries = entries.filter(e => e.status === "Offen");
    const followUpEntries = openEntries.filter(e => {
      const daysSince = Math.floor((now - new Date(e.date)) / (1000 * 60 * 60 * 24));
      return daysSince >= settings.followUpDays;
    });

    openCountEl.textContent = String(openEntries.length);
    followUpCountEl.textContent = String(followUpEntries.length);

    if(entries.length === 0){
      recentListEl.innerHTML = '<div class="mobile-overview-empty">Noch keine Bewerbungen.</div>';
      return;
    }

    const recentEntries = [...entries]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);

    recentListEl.innerHTML = recentEntries.map(entry => `
      <button type="button" class="mobile-overview-item" data-id="${attrSafe(entry.id)}">
        <div>
          <strong>${escapeHTML(entry.company)}</strong>
          <span>${escapeHTML(entry.position || 'Ohne Position')}</span>
        </div>
        <em>${escapeHTML(toDisp(entry.date))}</em>
      </button>
    `).join('');

    recentListEl.querySelectorAll('.mobile-overview-item').forEach(btn => {
      btn.addEventListener('click', () => {
        switchPage('applications');
        openEdit(btn.dataset.id);
      });
    });
  }

  let searchTerm = '';
  let statusFilter = '';
  
  let currentSortColumn = 'date';
  let currentSortDirection = 'desc';
  
  let currentView = 'table';
  
  function sortEntries(entriesToSort){
    const sorted = [...entriesToSort];
    
    sorted.sort((a, b) => {
      let aVal, bVal;
      
      switch(currentSortColumn){
        case 'date':
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case 'company':
          aVal = (a.company || '').toLowerCase();
          bVal = (b.company || '').toLowerCase();
          break;
        case 'position':
          aVal = (a.position || '').toLowerCase();
          bVal = (b.position || '').toLowerCase();
          break;
        case 'type':
          aVal = (a.channel || '').toLowerCase();
          bVal = (b.channel || '').toLowerCase();
          break;
        case 'contact':
          aVal = (a.contact || '').toLowerCase();
          bVal = (b.contact || '').toLowerCase();
          break;
        case 'address':
          aVal = (a.address || '').toLowerCase();
          bVal = (b.address || '').toLowerCase();
          break;
        case 'status':
          aVal = (a.status || '').toLowerCase();
          bVal = (b.status || '').toLowerCase();
          break;
        default:
          return 0;
      }
      
      let comparison = 0;
      if(aVal > bVal) comparison = 1;
      else if(aVal < bVal) comparison = -1;
      
      return currentSortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }
  
  function updateSortIcons(){
    document.querySelectorAll('th.sortable').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
    });
    
    const activeHeader = document.querySelector(`th.sortable[data-sort="${currentSortColumn}"]`);
    if(activeHeader){
      activeHeader.classList.add(`sort-${currentSortDirection}`);
    }
  }
  
  function handleSort(column){
    if(currentSortColumn === column){
      currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      currentSortColumn = column;
      currentSortDirection = 'asc';
    }
    renderEntries();
  }

  let followUpFilter = false;
  let favoritesFilter = false;

  function getFilteredEntries(){
    let filteredEntries = entries.slice();

    if(followUpFilter){
      const settings = loadSettings();
      filteredEntries = filteredEntries.filter(e => {
        if(e.status !== 'Offen') return false;
        const daysSince = Math.floor((new Date() - new Date(e.date)) / (1000 * 60 * 60 * 24));
        return daysSince >= settings.followUpDays;
      });
    }

    if(favoritesFilter){
      filteredEntries = filteredEntries.filter(e => e.isFavorite);
    }

    if(statusFilter){
      filteredEntries = filteredEntries.filter(e => e.status === statusFilter);
    }

    if(searchTerm){
      filteredEntries = filteredEntries.filter(e => {
        const searchableText = [
          e.company,
          e.position,
          e.contact,
          e.address,
          e.channel,
          e.status,
          e.notes
        ].join(' ').toLowerCase();
        return searchableText.includes(searchTerm);
      });
    }

    return filteredEntries;
  }

  function applyFilters(){
    const searchInput = el('#searchInput');
    const statusFilterEl = el('#statusFilter');
    const followUpFilterEl = el('#followUpFilterOption');
    const favoritesFilterEl = el('#favoritesFilterOption');
    
    if(searchInput) searchTerm = searchInput.value.toLowerCase();
    if(statusFilterEl) statusFilter = statusFilterEl.value;
    if(followUpFilterEl) followUpFilter = followUpFilterEl.getAttribute('data-active') === 'true';
    if(favoritesFilterEl) favoritesFilter = favoritesFilterEl.getAttribute('data-active') === 'true';
    
    if(currentView === 'table'){
      renderEntries();
    } else {
      renderKanbanBoard();
    }
  }
  
  function switchView(view){
    const isMobile = isMobileViewport();
    const safeView = (isMobile && view === 'kanban') ? 'table' : view;
    currentView = safeView;
    const tableView = el('#entriesList');
    const cardsView = el('#entriesCards');
    const kanbanView = el('#kanbanBoard');
    const btnTable = el('#viewTable');
    const btnBoard = el('#viewBoard');
    
    if(btnBoard){
      btnBoard.style.display = isMobile ? 'none' : '';
      btnBoard.classList.toggle('active', !isMobile && safeView === 'kanban');
    }
    
    if(safeView === 'table'){
      if(tableView) tableView.style.display = isMobile ? 'none' : 'block';
      if(cardsView) cardsView.style.display = isMobile ? 'grid' : 'none';
      if(kanbanView) kanbanView.style.display = 'none';
      if(btnTable) btnTable.classList.add('active');
      if(btnBoard && isMobile) btnBoard.classList.remove('active');
      renderEntries();
    } else {
      if(tableView) tableView.style.display = 'none';
      if(cardsView) cardsView.style.display = 'none';
      if(kanbanView) kanbanView.style.display = 'grid';
      if(btnTable) btnTable.classList.remove('active');
      if(btnBoard) btnBoard.classList.add('active');
      renderKanbanBoard();
    }
  }

  function renderEntriesCards(entriesToRender, emptyMessage){
    const cardsContainer = el('#entriesCards');
    if(!cardsContainer) return;

    if(entriesToRender.length === 0){
      cardsContainer.innerHTML = `<div class="entry-card-empty">${escapeHTML(emptyMessage)}</div>`;
      return;
    }

    cardsContainer.innerHTML = entriesToRender.map(e => {
      return `
        <article class="entry-card table-row-clickable" data-id="${attrSafe(e.id)}">
          <div class="entry-card-top">
            <div class="entry-card-main">
              <div class="entry-card-company">${escapeHTML(e.company)}</div>
              <div class="entry-card-position">${escapeHTML(e.position || "Keine Position")}</div>
            </div>
            <button class="iconbtn btn-favorite ${e.isFavorite ? 'favorite-active' : ''}" data-id="${attrSafe(e.id)}" title="${e.isFavorite ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
              <i data-lucide="star"></i>
            </button>
          </div>
          <div class="entry-card-grid">
            <div class="entry-card-field">
              <span>Datum</span>
              <strong>${escapeHTML(toDisp(e.date))}</strong>
            </div>
            <div class="entry-card-field">
              <span>Art</span>
              <strong>${escapeHTML(e.channel || "-")}</strong>
            </div>
            <div class="entry-card-field">
              <span>Kontakt</span>
              <strong>${escapeHTML(e.contact || "-")}</strong>
            </div>
            <div class="entry-card-field">
              <span>Anschrift</span>
              <strong>${escapeHTML(e.address || "-")}</strong>
            </div>
          </div>
          <div class="entry-card-footer">
            <span class="status-badge s-${cssSafe(e.status)}">${escapeHTML(e.status)}</span>
            <div class="entry-card-actions">
              <button class="iconbtn btn-edit" data-id="${attrSafe(e.id)}" title="Bearbeiten"><i data-lucide="pencil"></i></button>
              <button class="iconbtn btn-delete" data-id="${attrSafe(e.id)}" title="Löschen"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    if(typeof lucide !== 'undefined') lucide.createIcons();

    cardsContainer.querySelectorAll('.entry-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if(e.target.closest('button')) return;
        const id = card.dataset.id;
        if(id) openEdit(id);
      });
    });
    cardsContainer.querySelectorAll('.btn-edit').forEach(b=> b.addEventListener('click', (e)=> {
      e.stopPropagation();
      openEdit(b.dataset.id);
    }));
    cardsContainer.querySelectorAll('.btn-favorite').forEach(b=> b.addEventListener('click', (e)=> {
      e.stopPropagation();
      toggleFavorite(b.dataset.id);
    }));
    cardsContainer.querySelectorAll('.btn-delete').forEach(b=> b.addEventListener('click', (e)=>{
      e.stopPropagation();
      remove(b.dataset.id);
    }));
  }

  function renderEntries(){
    const tbody = el("#entriesBody");
    const cardsContainer = el('#entriesCards');
    const filteredEntries = getFilteredEntries();

    const emptyMessage = entries.length === 0 ? "Keine Einträge" : "Keine Einträge gefunden";

    let sortedEntries = [];
    if(filteredEntries.length > 0){
      sortedEntries = sortEntries(filteredEntries).sort((a, b) => {
        if(a.isFavorite && !b.isFavorite) return -1;
        if(!a.isFavorite && b.isFavorite) return 1;
        return 0;
      });
    }

    updateSortIcons();

    if(isMobileViewport()){
      if(tbody) tbody.innerHTML = "";
      renderEntriesCards(sortedEntries, emptyMessage);
      return;
    }

    if(cardsContainer) cardsContainer.innerHTML = "";
    if(!tbody) return;

    if(sortedEntries.length === 0){
      tbody.innerHTML = `
        <tr class="table-message-row">
          <td colspan="9" class="table-message-cell">${escapeHTML(emptyMessage)}</td>
        </tr>
      `;
      return;
    }

    const tableRows = sortedEntries.map(e=>{
      return (`<tr data-id="${attrSafe(e.id)}" class="table-row-clickable">
        <td data-label="Favorit">
          <div class="row-favorite">
            <button class="iconbtn btn-favorite ${e.isFavorite ? 'favorite-active' : ''}" data-id="${attrSafe(e.id)}" title="${e.isFavorite ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
              <i data-lucide="star"></i>
            </button>
          </div>
        </td>
        <td data-label="Datum">${escapeHTML(toDisp(e.date))}</td>
        <td data-label="Firma">${escapeHTML(e.company)}</td>
        <td data-label="Position">${escapeHTML(e.position||"")}</td>
        <td data-label="Art">${escapeHTML(e.channel||"")}</td>
        <td data-label="Kontakt">${escapeHTML(e.contact||"")}</td>
        <td data-label="Anschrift">${escapeHTML(e.address||"")}</td>
        <td data-label="Status"><span class="status-badge s-${cssSafe(e.status)}">${escapeHTML(e.status)}</span></td>
        <td data-label="Aktionen">
          <div class="row-actions">
            <button class="iconbtn btn-edit" data-id="${attrSafe(e.id)}" title="Bearbeiten"><i data-lucide="pencil"></i></button>
            <button class="iconbtn btn-delete" data-id="${attrSafe(e.id)}" title="Löschen"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`);
    }).join("");
    tbody.innerHTML = tableRows;

    if(typeof lucide !== 'undefined') lucide.createIcons();
    tbody.querySelectorAll('tr.table-row-clickable').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if(e.target.closest('button')) return;
        const id = tr.dataset.id;
        if(id) openEdit(id);
      });
    });
    tbody.querySelectorAll('.btn-edit').forEach(b=> b.addEventListener('click', (e)=> {
      e.stopPropagation();
      openEdit(b.dataset.id);
    }));
    tbody.querySelectorAll('.btn-favorite').forEach(b=> b.addEventListener('click', (e)=> {
      e.stopPropagation();
      toggleFavorite(b.dataset.id);
    }));
    tbody.querySelectorAll('.btn-delete').forEach(b=> b.addEventListener('click', (e)=>{
      e.stopPropagation();
      remove(b.dataset.id);
    }));
  }
  
  function renderKanbanBoard(){
    if(!entries || entries.length === 0){
      ['Offen', 'Vorstellung', 'Absage'].forEach(status => {
        const containerId = status === 'Vorstellungsgespräch' ? 'Vorstellung' : status;
        const container = el(`#cards${containerId}`);
        if(container) container.innerHTML = '<div class="kanban-card-placeholder">Keine Einträge</div>';
      });
      return;
    }
    
    let filteredEntries = entries.slice();
    
    if(followUpFilter){
      const settings = loadSettings();
      filteredEntries = filteredEntries.filter(e => {
        if(e.status !== 'Offen') return false;
        const daysSince = Math.floor((new Date() - new Date(e.date)) / (1000 * 60 * 60 * 24));
        return daysSince >= settings.followUpDays;
      });
    }
    
    if(favoritesFilter){
      filteredEntries = filteredEntries.filter(e => e.isFavorite);
    }
    
    if(searchTerm){
      filteredEntries = filteredEntries.filter(e => {
        const searchableText = [
          e.company,
          e.position,
          e.contact,
          e.address,
          e.channel,
          e.notes
        ].join(' ').toLowerCase();
        return searchableText.includes(searchTerm);
      });
    }
    
    const statusGroups = {
      'Offen': filteredEntries.filter(e => e.status === 'Offen'),
      'Vorstellungsgespräch': filteredEntries.filter(e => e.status === 'Vorstellungsgespräch'),
      'Absage': filteredEntries.filter(e => e.status === 'Absage')
    };
    
    Object.keys(statusGroups).forEach(status => {
      const containerId = status === 'Vorstellungsgespräch' ? 'Vorstellung' : status;
      const container = el(`#cards${containerId}`);
      const countEl = el(`#count${containerId}`);
      let cards = statusGroups[status];
      
      cards = cards.sort((a, b) => {
        if(a.isFavorite && !b.isFavorite) return -1;
        if(!a.isFavorite && b.isFavorite) return 1;
        return 0;
      });
      
      if(countEl) countEl.textContent = cards.length;
      
      if(!container) return;
      
      if(cards.length === 0){
        container.innerHTML = '<div class="kanban-card-placeholder">Keine Einträge</div>';
        return;
      }
      
      const cardsHTML = cards.map(e => {
        return `<div class="kanban-card ${e.isFavorite ? 'kanban-card-favorite' : ''}" draggable="true" data-id="${attrSafe(e.id)}">
          <div class="kanban-card-header">
            <div class="kanban-card-company">
              ${e.isFavorite ? '<i data-lucide="star" style="width: 14px; height: 14px; color: var(--warning); fill: var(--warning); margin-right: 4px;"></i>' : ''}${escapeHTML(e.company)}
            </div>
            <div class="kanban-card-date">${escapeHTML(toDisp(e.date))}</div>
          </div>
          ${e.position ? `<div class="kanban-card-position">${escapeHTML(e.position)}</div>` : ''}
          <div class="kanban-card-meta">
            ${e.channel ? `<span class="kanban-card-tag"><i data-lucide="tag"></i>${escapeHTML(e.channel)}</span>` : ''}
            ${e.contact ? `<span class="kanban-card-tag"><i data-lucide="user"></i>${escapeHTML(e.contact)}</span>` : ''}
          </div>
          <div class="kanban-card-actions">
            <button class="iconbtn btn-favorite ${e.isFavorite ? 'favorite-active' : ''}" data-id="${attrSafe(e.id)}" title="${e.isFavorite ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
              <i data-lucide="star"></i>
            </button>
            <button class="iconbtn btn-edit" data-id="${attrSafe(e.id)}" title="Bearbeiten"><i data-lucide="edit-2"></i></button>
            <button class="iconbtn btn-delete" data-id="${attrSafe(e.id)}" title="Löschen"><i data-lucide="trash-2"></i></button>
          </div>
        </div>`;
      }).join('');
      
      container.innerHTML = cardsHTML;
    });
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
    
    document.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if(e.target.closest('button') || card.classList.contains('dragging')) return;
        const id = card.dataset.id;
        if(id) openEdit(id);
      });
    });
    
    document.querySelectorAll('.kanban-card .btn-edit').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        openEdit(b.dataset.id);
      });
    });
    
    document.querySelectorAll('.kanban-card .btn-favorite').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.id;
        toggleFavorite(id);
        renderKanbanBoard();
      });
    });
    
    document.querySelectorAll('.kanban-card .btn-delete').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.id;
        if(id) remove(id);
      });
    });
    
    setupDragAndDrop();
  }
  
  function setupDragAndDrop(){
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column');
    
    let draggedEntryId = null;
    
    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedEntryId = card.dataset.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });
      
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedEntryId = null;
      });
    });
    
    columns.forEach(column => {
      const cardsContainer = column.querySelector('.kanban-cards');
      
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cardsContainer.classList.add('drag-over');
      });
      
      column.addEventListener('dragleave', (e) => {
        if(!column.contains(e.relatedTarget)){
          cardsContainer.classList.remove('drag-over');
        }
      });
      
      column.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cardsContainer.classList.remove('drag-over');
        
        const targetStatus = column.dataset.status;
        
        console.log('Drop event:', {draggedEntryId, targetStatus});
        
        if(draggedEntryId && targetStatus){
          updateEntryStatus(draggedEntryId, targetStatus);
        } else {
          console.error('Missing data for drop:', {draggedEntryId, targetStatus});
        }
      });
    });
  }
  
  function updateEntryStatus(entryId, newStatus){
    const entry = entries.find(e => e.id === entryId);
    if(!entry) {
      console.error('Entry not found:', entryId);
      return;
    }
    
    if(entry.status === newStatus){
      return;
    }
    
    console.log('Updating entry status:', entry.company, 'from', entry.status, 'to', newStatus);
    
    entry.status = newStatus;
    save();
    renderStats();
    renderKanbanBoard();
  }

  async function exportPrintable(){
    if(!entries || entries.length===0){ alert('Keine Einträge zum Exportieren.'); return; }
    
    try{
      if(!window.PDFLib){
        alert('PDF-Bibliothek nicht geladen. Bitte Seite neu laden.');
        return;
      }
      
      const settings = loadSettings();
      
      const response = await fetch('template.pdf');
      const pdfBytes = await response.arrayBuffer();
      
      const { PDFDocument } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const font = await pdfDoc.embedFont('Helvetica');
      const fontBold = await pdfDoc.embedFont('Helvetica-Bold');
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      const { width, height } = firstPage.getSize();
      
      const fontSize = 11;
      const leftMargin = 40;
      const rightMargin = 40;
      const availableWidth = width - leftMargin - rightMargin;
      let yPosition = height - 100;
      
      if(settings.firstName || settings.lastName){
        const fullName = `${settings.firstName} ${settings.lastName}`.trim();
        firstPage.drawText(fullName, {
          x: leftMargin,
          y: yPosition,
          size: fontSize,
          font: font
        });
        yPosition -= 16;
      }
      
      if(settings.customerNumber){
        firstPage.drawText(settings.customerNumber, {
          x: leftMargin,
          y: yPosition,
          size: fontSize,
          font: font
        });
      }
      
      const sortedEntries = entries.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
      yPosition -= 40;
      
      const tableFontSize = 9;
      const charWidth = tableFontSize * 0.5;
      const padding = 8;
      
      const maxLengths = {
        nr: Math.max(3, ...sortedEntries.map((e, i) => `${i+1}.`.length)),
        datum: Math.max(5, ...sortedEntries.map(e => toDisp(e.date).length)),
        firma: Math.max(5, ...sortedEntries.map(e => e.company.length)),
        position: Math.max(8, ...sortedEntries.map(e => (e.position || '').length)),
        art: Math.max(3, ...sortedEntries.map(e => (e.channel || '').length)),
        kontakt: Math.max(7, ...sortedEntries.map(e => (e.contact || '').length)),
        anschrift: Math.max(9, ...sortedEntries.map(e => (e.address || '').length)),
        status: Math.max(6, ...sortedEntries.map(e => (e.status || '').length))
      };
      
      const totalLength = Object.values(maxLengths).reduce((a,b) => a+b, 0);
      
      const colWidths = {
        nr: (maxLengths.nr / totalLength) * availableWidth,
        datum: (maxLengths.datum / totalLength) * availableWidth,
        firma: (maxLengths.firma / totalLength) * availableWidth,
        position: (maxLengths.position / totalLength) * availableWidth,
        art: (maxLengths.art / totalLength) * availableWidth,
        kontakt: (maxLengths.kontakt / totalLength) * availableWidth,
        anschrift: (maxLengths.anschrift / totalLength) * availableWidth,
        status: (maxLengths.status / totalLength) * availableWidth
      };
      
      let xPos = leftMargin;
      
      firstPage.drawText('Nr.', { x: xPos, y: yPosition, size: tableFontSize, font: fontBold });
      xPos += colWidths.nr;
      firstPage.drawText('Datum', { x: xPos, y: yPosition, size: tableFontSize, font: fontBold });
      xPos += colWidths.datum;
      firstPage.drawText('Firma', { x: xPos, y: yPosition, size: tableFontSize, font: fontBold });
      xPos += colWidths.firma;
      firstPage.drawText('Position', { x: xPos, y: yPosition, size: tableFontSize, font: fontBold });
      xPos += colWidths.position;
      firstPage.drawText('Art', { x: xPos, y: yPosition, size: tableFontSize, font: fontBold });
      xPos += colWidths.art;
      firstPage.drawText('Kontakt', { x: xPos, y: yPosition, size: tableFontSize, font: fontBold });
      xPos += colWidths.kontakt;
      firstPage.drawText('Anschrift', { x: xPos, y: yPosition, size: tableFontSize, font: fontBold });
      xPos += colWidths.anschrift;
      firstPage.drawText('Status', { x: xPos, y: yPosition, size: tableFontSize, font: fontBold });
      
      yPosition -= 12;
      
      firstPage.drawLine({
        start: { x: leftMargin, y: yPosition },
        end: { x: width - rightMargin, y: yPosition },
        thickness: 0.5
      });
      
      yPosition -= 12;
      
      function wrapText(text, maxWidth) {
        if(!text) return [''];
        const maxChars = Math.floor(maxWidth / charWidth);
        if(text.length <= maxChars) return [text];
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
          if((currentLine + ' ' + word).trim().length <= maxChars) {
            currentLine = (currentLine + ' ' + word).trim();
          } else {
            if(currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });
        if(currentLine) lines.push(currentLine);
        return lines;
      }
      
      sortedEntries.forEach((entry, index) => {
        if(yPosition < 60) return;
        
        xPos = leftMargin;
        const rowY = yPosition;
        
        const companyLines = wrapText(entry.company, colWidths.firma - padding);
        const positionLines = wrapText(entry.position || '', colWidths.position - padding);
        const artLines = wrapText(entry.channel || '', colWidths.art - padding);
        const kontaktLines = wrapText(entry.contact || '', colWidths.kontakt - padding);
        const anschriftLines = wrapText(entry.address || '', colWidths.anschrift - padding);
        const statusLines = wrapText(entry.status || '', colWidths.status - padding);
        
        const maxLines = Math.max(
          companyLines.length,
          positionLines.length,
          artLines.length,
          kontaktLines.length,
          anschriftLines.length,
          statusLines.length,
          1
        );
        
        const lineHeight = 11;
        const cellHeight = maxLines * lineHeight;
        
        firstPage.drawText(`${index + 1}.`, { x: xPos, y: rowY, size: tableFontSize, font: font });
        xPos += colWidths.nr;
        
        firstPage.drawText(toDisp(entry.date), { x: xPos, y: rowY, size: tableFontSize, font: font });
        xPos += colWidths.datum;
        
        companyLines.forEach((line, i) => {
          firstPage.drawText(line, { x: xPos, y: rowY - (i * lineHeight), size: tableFontSize, font: font });
        });
        xPos += colWidths.firma;
        
        positionLines.forEach((line, i) => {
          firstPage.drawText(line, { x: xPos, y: rowY - (i * lineHeight), size: tableFontSize, font: font });
        });
        xPos += colWidths.position;
        
        artLines.forEach((line, i) => {
          firstPage.drawText(line, { x: xPos, y: rowY - (i * lineHeight), size: tableFontSize, font: font });
        });
        xPos += colWidths.art;
        
        kontaktLines.forEach((line, i) => {
          firstPage.drawText(line, { x: xPos, y: rowY - (i * lineHeight), size: tableFontSize, font: font });
        });
        xPos += colWidths.kontakt;
        
        anschriftLines.forEach((line, i) => {
          firstPage.drawText(line, { x: xPos, y: rowY - (i * lineHeight), size: tableFontSize, font: font });
        });
        xPos += colWidths.anschrift;
        
        statusLines.forEach((line, i) => {
          firstPage.drawText(line, { x: xPos, y: rowY - (i * lineHeight), size: tableFontSize, font: font });
        });
        
        yPosition -= cellHeight + 3;
      });
      
      const filledPdfBytes = await pdfDoc.save();
      const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const w = window.open(url, '_blank');
      if(!w){
        alert('Bitte Popup-Blocker deaktivieren für den Export.');
        URL.revokeObjectURL(url);
        return;
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      
    }catch(e){
      alert('Export fehlgeschlagen: ' + (e && e.message));
      console.error('Export error:', e);
    }
  }

  function renderAll(){
    renderStats();
    renderMobileDashboardOverview();
    if(currentView === 'table'){
      renderEntries();
    } else {
      renderKanbanBoard();
    }
  }

  function openNew(){
    editingId=null; el("#formTitle").textContent="Neuer Eintrag";
    form.reset(); fields.date.valueAsDate=new Date();
    
    currentDocuments = [];
    currentAppointments = [];
    currentLinks = [];
    currentTimeline = [{date: toISO(new Date()), type: 'Bewerbung verschickt', description: ''}];
    renderDocuments();
    renderAppointments();
    renderLinks();
    renderTimeline();
    
    Object.values(fields).forEach(field => field.disabled = false);
    
    el("#btnDelete").style.display="none"; 
    el("#btnSave").style.display="inline-flex";
    switchTab('notes');
    modal.classList.add("open");
  }
  function openEdit(id){
    const e = entries.find(x=>x.id===id); if(!e) return;
    editingId=id; el("#formTitle").textContent="Eintrag bearbeiten";
    fields.date.value=toISO(e.date) || "";
    fields.company.value=e.company||"";
    fields.position.value=e.position||"";
    fields.channel.value=e.channel||"E-Mail";
    fields.status.value=e.status||"Offen";
    fields.contact.value=e.contact||"";
    fields.address.value=e.address||"";
    fields.notes.value=e.notes||"";
    
    currentDocuments = e.documents || [];
    currentAppointments = e.appointments || [];
    currentLinks = e.links || [];
    currentTimeline = e.timeline || [];
    renderDocuments();
    renderAppointments();
    renderLinks();
    renderTimeline();
    
    Object.values(fields).forEach(field => field.disabled = false);
    
    el("#btnDelete").style.display="inline-block"; 
    el("#btnSave").style.display="inline-block";
    switchTab('notes');
    modal.classList.add("open");
  }
  
  function closeModal(){ 
    modal.classList.remove("open");
    Object.values(fields).forEach(field => field.disabled = false);
    switchTab('notes');
  }
  function upsertFromForm(){
    const existingEntry = editingId ? entries.find(x => x.id === editingId) : null;
    
    const e = {
      id: editingId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random()),
      date: toISO(fields.date.value || new Date().toISOString().slice(0,10)),
      company: fields.company.value.trim(),
      position: fields.position.value.trim(),
      channel: fields.channel.value,
      status: fields.status.value,
      contact: fields.contact.value.trim(),
      address: fields.address.value.trim(),
      notes: fields.notes.value.trim(),
      isFavorite: existingEntry ? existingEntry.isFavorite : false,
      documents: currentDocuments,
      appointments: currentAppointments,
      links: currentLinks,
      timeline: currentTimeline
    };
    if(!e.company){ alert("Bitte Firma angeben."); return; }
    const i = entries.findIndex(x=>x.id===e.id);
    if(i>=0) entries[i]=e; else entries.push(e);
    save(); closeModal(); renderAll();
  }
  function remove(id){
    if(!confirm("Eintrag wirklich löschen?")) return;
    entries = entries.filter(x=>x.id!==id);
    save(); renderAll();
  }

  function toggleFavorite(id){
    if(!id) return;
    const entry = entries.find(x=> x.id === id);
    if(!entry) return;
    entry.isFavorite = !entry.isFavorite;
    save(); renderAll();
  }

  let currentDocuments = [];
  let currentAppointments = [];
  let currentTimeline = [];
  let currentLinks = [];

  function switchTab(tabName){
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  const docUpload = el('#docUpload');
  const btnAddDoc = el('#btnAddDoc');
  
  if(btnAddDoc) btnAddDoc.addEventListener('click', () => docUpload.click());
  
  if(docUpload){
    docUpload.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for(const file of files){
        if(file.size > 5 * 1024 * 1024){
          alert(`${file.name} ist zu groß (max. 5MB)`);
          continue;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          currentDocuments.push({
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random(),
            name: file.name,
            type: file.type,
            size: file.size,
            date: new Date().toISOString(),
            data: event.target.result
          });
          renderDocuments();
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    });
  }

  function renderDocuments(){
    const list = el('#documentsList');
    if(!list) return;
    
    if(currentDocuments.length === 0){
      list.innerHTML = '<p style="color:var(--muted);padding:1rem 0;">Keine Dokumente hochgeladen</p>';
      return;
    }
    
    list.innerHTML = currentDocuments.map(doc => {
      const sizeKB = Math.round(doc.size / 1024);
      return `
      <div class="doc-item">
        <div class="doc-info">
          <div class="doc-icon">
            <i data-lucide="file-text"></i>
          </div>
          <div class="doc-details">
            <div class="doc-name">${escapeHTML(doc.name)}</div>
            <div class="doc-meta">${sizeKB} KB</div>
          </div>
        </div>
        <div class="doc-actions">
          <button type="button" class="iconbtn" onclick="viewDocument('${doc.id}')" title="Ansehen">
            <i data-lucide="eye"></i>
          </button>
          <button type="button" class="iconbtn" onclick="downloadDocument('${doc.id}')" title="Herunterladen">
            <i data-lucide="download"></i>
          </button>
          <button type="button" class="iconbtn" onclick="removeDocument('${doc.id}')" title="Löschen">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>`;
    }).join('');
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  window.viewDocument = function(docId){
    const doc = currentDocuments.find(d => d.id === docId);
    if(!doc) return;
    
    const newWindow = window.open();
    if(newWindow){
      newWindow.document.write(`
        <html>
          <head>
            <title>${escapeHTML(doc.name)}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f0f0; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              iframe { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            ${doc.type.startsWith('image/') 
              ? `<img src="${doc.data}" alt="${escapeHTML(doc.name)}" />` 
              : `<iframe src="${doc.data}"></iframe>`
            }
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  window.downloadDocument = function(docId){
    const doc = currentDocuments.find(d => d.id === docId);
    if(!doc) return;
    
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    link.click();
  };

  window.removeDocument = function(docId){
    if(!confirm('Dokument wirklich löschen?')) return;
    currentDocuments = currentDocuments.filter(d => d.id !== docId);
    renderDocuments();
  };

  
  function renderAppointments(){
    const list = el('#appointmentsList');
    if(!list) return;
    
    if(currentAppointments.length === 0){
      list.innerHTML = '<div class="empty-state"><i data-lucide="calendar-x"></i><p>Keine Termine eingetragen</p></div>';
      if(typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }
    
    const sorted = [...currentAppointments].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    list.innerHTML = sorted.map(apt => {
      const date = new Date(apt.date);
      const isPast = date < new Date();
      const dateStr = date.toLocaleDateString('de-DE', { 
        weekday: 'short',
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      const timeStr = date.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      return `
        <div class="appointment-card ${isPast ? 'past' : ''}">
          <div class="appointment-icon">
            <i data-lucide="calendar-check"></i>
          </div>
          <div class="appointment-content">
            <div class="appointment-header">
              <span class="appointment-type">${escapeHTML(apt.type)}</span>
              <button type="button" class="iconbtn" onclick="removeAppointment('${apt.id}')" title="Löschen">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
            <div class="appointment-datetime">
              <i data-lucide="clock"></i>
              <span>${dateStr}, ${timeStr} Uhr</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  const btnAddAppointment = el('#btnAddAppointment');
  if(btnAddAppointment){
    btnAddAppointment.addEventListener('click', () => {
      const type = el('#appointmentType').value;
      const date = el('#appointmentDate').value;
      
      if(!date){
        alert('Bitte Datum und Uhrzeit angeben');
        return;
      }
      
      currentAppointments.push({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
        type: type,
        date: date
      });
      
      el('#appointmentDate').value = '';
      
      renderAppointments();
    });
  }

  window.removeAppointment = function(aptId){
    if(!confirm('Termin wirklich löschen?')) return;
    currentAppointments = currentAppointments.filter(a => a.id !== aptId);
    renderAppointments();
  };

  
  function renderLinks(){
    const list = el('#linksList');
    if(!list) return;
    
    if(currentLinks.length === 0){
      list.innerHTML = '<p style="color:var(--muted);padding:1rem 0;">Keine Links hinzugefügt</p>';
      return;
    }
    
    list.innerHTML = currentLinks.map((link, idx) => `
      <div class="link-item">
        <div class="link-info">
          <i data-lucide="link" style="width: 20px; height: 20px; color: var(--primary);"></i>
          <div class="link-details">
            <a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer" class="link-url">
              ${escapeHTML(link.url)}
            </a>
          </div>
        </div>
        <button type="button" class="iconbtn" onclick="removeLink(${idx})" title="Löschen">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `).join('');
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  const btnAddLink = el('#btnAddLink');
  if(btnAddLink){
    btnAddLink.addEventListener('click', () => {
      const url = el('#linkUrl').value.trim();
      
      if(!url){
        alert('Bitte URL angeben');
        return;
      }
      
      try {
        new URL(url);
      } catch(e) {
        alert('Bitte gültige URL angeben (z.B. https://example.com)');
        return;
      }
      
      currentLinks.push({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
        url: url
      });
      
      el('#linkUrl').value = '';
      
      renderLinks();
    });
  }

  window.removeLink = function(idx){
    if(!confirm('Link wirklich löschen?')) return;
    currentLinks.splice(idx, 1);
    renderLinks();
  };

  const btnAddTimeline = el('#btnAddTimeline');
  
  if(btnAddTimeline){
    btnAddTimeline.addEventListener('click', () => {
      const date = el('#timelineDate').value;
      const type = el('#timelineType').value;
      
      if(!date){
        alert('Bitte Datum angeben');
        return;
      }
      
      currentTimeline.push({
        date: date,
        type: type
      });
      
      currentTimeline.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      el('#timelineDate').value = '';
      
      renderTimeline();
    });
  }

  function renderTimeline(){
    const list = el('#timelineList');
    if(!list) return;
    
    if(currentTimeline.length === 0){
      list.innerHTML = '<p style="color:var(--muted);padding:1rem 0;">Keine Timeline-Einträge</p>';
      return;
    }
    
    list.innerHTML = currentTimeline.map((item, idx) => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-date">${toDisp(item.date)}</div>
        <div class="timeline-type">${escapeHTML(item.type)}</div>
        <button type="button" class="iconbtn timeline-remove" onclick="removeTimelineEvent(${idx})" title="Löschen">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `).join('');
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  window.removeTimelineEvent = function(idx){
    if(!confirm('Timeline-Eintrag wirklich löschen?')) return;
    currentTimeline.splice(idx, 1);
    renderTimeline();
  };

  function escapeHTML(s){ return String(s??"").replace(/[&<>\"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function attrSafe(s){ return escapeHTML(String(s).replace(/"/g,'&quot;')); }
  function cssSafe(s){ return String(s).replace(/\s+/g,""); }

  el("#btnNew").addEventListener("click", openNew);
  el("#btnClose").addEventListener("click", closeModal);
  el("#btnSave").addEventListener("click", upsertFromForm);
  el("#btnDelete").addEventListener("click", ()=>{ if(editingId) remove(editingId); closeModal(); });
  if(modal) modal.addEventListener("click", e=>{ if(e.target===modal) closeModal(); });

  renderAll();
  switchPage(currentPage, { scrollToList: false });
  
  
  function exportJSON(){
    const exportData = {
      settings: loadSettings(),
      meta: {
        totalEntries: entries.length,
        appVersion: "1.0"
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobmate-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function importJSON(file){
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        if(!importedData.entries || !Array.isArray(importedData.entries)){
          throw new Error("Ungültiges Dateiformat");
        }
        
        const action = confirm(
          `Import von ${importedData.entries.length} Einträgen.\n\n` +
          `OK = Aktuelle Daten ersetzen\n` +
          `Abbrechen = Import abbrechen`
        );
        
        if(action){
          entries = importedData.entries;
          
          if(importedData.settings){
            saveSettings(importedData.settings);
          }
          
          save();
          renderAll();
          alert(`Import erfolgreich!\n${importedData.entries.length} Einträge wurden importiert.`);
        }
      } catch(error) {
        alert('Import fehlgeschlagen: ' + error.message);
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  }
  
  const sidebarExportPDF = el('#sidebarExportPDF');
  if(sidebarExportPDF){
    sidebarExportPDF.addEventListener('click', () => {
      exportPrintable();
      closeSidebar();
    });
  }
  
  const sidebarExportJSON = el('#sidebarExportJSON');
  if(sidebarExportJSON){
    sidebarExportJSON.addEventListener('click', () => {
      exportJSON();
      closeSidebar();
    });
  }
  
  const sidebarImport = el('#sidebarImport');
  const importFile = el('#importFile');
  if(sidebarImport && importFile){
    sidebarImport.addEventListener('click', () => {
      importFile.click();
      closeSidebar();
    });
    
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(file){
        importJSON(file);
      }
      e.target.value = '';
    });
  }
  
  const searchInput = el('#searchInput');
  const statusFilterEl = el('#statusFilter');
  const followUpFilterEl = el('#followUpFilterOption');
  const favoritesFilterEl = el('#favoritesFilterOption');
  
  if(searchInput){
    searchInput.addEventListener('input', applyFilters);
  }
  if(statusFilterEl){
    statusFilterEl.addEventListener('change', applyFilters);
  }
  if(followUpFilterEl){
    followUpFilterEl.addEventListener('click', () => {
      const isActive = followUpFilterEl.getAttribute('data-active') === 'true';
      followUpFilterEl.setAttribute('data-active', !isActive);
      applyFilters();
      if(typeof lucide !== 'undefined') lucide.createIcons();
    });
  }
  if(favoritesFilterEl){
    favoritesFilterEl.addEventListener('click', () => {
      const isActive = favoritesFilterEl.getAttribute('data-active') === 'true';
      favoritesFilterEl.setAttribute('data-active', !isActive);
      applyFilters();
      if(typeof lucide !== 'undefined') lucide.createIcons();
    });
  }
  
  const btnFilter = el('#btnFilter');
  const filterMenu = el('#filterMenu');
  
  if(btnFilter && filterMenu){
    btnFilter.addEventListener('click', (e) => {
      e.stopPropagation();
      filterMenu.classList.toggle('open');
      btnFilter.parentElement.classList.toggle('open');
      
      const settings = loadSettings();
      const followUpDesc = el('#followUpFilterDesc');
      if(followUpDesc && settings.followUpDays){
        followUpDesc.textContent = `Offene Bewerbungen älter als ${settings.followUpDays} Tage`;
      }
      
      if(typeof lucide !== 'undefined') lucide.createIcons();
    });
    
    document.addEventListener('click', (e) => {
      if(!e.target.closest('.filter-dropdown')){
        filterMenu.classList.remove('open');
        btnFilter.parentElement.classList.remove('open');
      }
    });
  }
  
  const btnClearFilters = el('#btnClearFilters');
  
  function resetFilters(){
    const followUpFilterEl = el('#followUpFilterOption');
    const favoritesFilterEl = el('#favoritesFilterOption');
    const statusFilterEl = el('#statusFilter');
    const searchInput = el('#searchInput');
    
    if(followUpFilterEl){
      followUpFilterEl.setAttribute('data-active', 'false');
      followUpFilterEl.classList.remove('active');
    }
    if(favoritesFilterEl){
      favoritesFilterEl.setAttribute('data-active', 'false');
      favoritesFilterEl.classList.remove('active');
    }
    if(statusFilterEl){
      statusFilterEl.value = '';
    }
    if(searchInput){
      searchInput.value = '';
    }
    
    applyFilters();
  }
  
  if(btnClearFilters){
    btnClearFilters.addEventListener('click', () => {
      resetFilters();
      if(typeof lucide !== 'undefined') lucide.createIcons();
    });
  }
  
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.sort;
      if(column) handleSort(column);
    });
  });
  
  const btnViewTable = el('#viewTable');
  const btnViewBoard = el('#viewBoard');
  
  if(btnViewTable){
    btnViewTable.addEventListener('click', () => switchView('table'));
  }
  
  if(btnViewBoard){
    btnViewBoard.addEventListener('click', () => {
      if(isMobileViewport()) return;
      switchView('kanban');
    });
  }

  let viewportResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(viewportResizeTimer);
    viewportResizeTimer = setTimeout(() => {
      switchView(currentView);
      switchPage(currentPage, { scrollToList: false });
    }, 120);
  });
  
  if(typeof lucide !== 'undefined'){
    lucide.createIcons();
  }
})();
