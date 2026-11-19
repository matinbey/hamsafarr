
const STORAGE_CURRENT_USER = 'hamsafar_current_user_v7';
const STORAGE_USERS = 'hamsafar_users_v7';
const STORAGE_TRIPS = 'hamsafar_trips_v7';
const STORAGE_JOINED = 'hamsafar_joined_v7';

const DEFAULT_LOCATIONS = ['دانشگاه', 'خوابگاه پسران', 'خوابگاه دختران', 'نوبنیاد'];

// State Management
let users = safeParse(localStorage.getItem(STORAGE_USERS), {});
let user = safeParse(localStorage.getItem(STORAGE_CURRENT_USER), null);
let trips = safeParse(localStorage.getItem(STORAGE_TRIPS), []);
let joinedTrips = safeParse(localStorage.getItem(STORAGE_JOINED), []);
let pendingJoinTripId = null;
let pendingDeleteTripId = null;
let currentTab = 'all';
let toastTimer = null;

function safeParse(str, fallback) {
    try {
        return str ? JSON.parse(str) : fallback;
    } catch (err) {
        return fallback;
    }
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    init24HourPicker();
    if (user && users[user.sid]) {
        user = users[user.sid];
        showApp();
    } else if (user) {
        users[user.sid] = user;
        saveData();
        showApp();
    }
});

// Close active modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal('join-modal');
        closeModal('delete-modal');
        closeModal('contact-modal');
    }
});

function handleBackdropClick(e, modalId) {
    if (e.target.id === modalId) {
        closeModal(modalId);
    }
}

// Convert Persian/Arabic numerals to English digits and strip non-digits
function sanitizeNumericInput(inputEl) {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    let val = inputEl.value;
    for (let i = 0; i < 10; i++) {
        val = val.replace(new RegExp(persianDigits[i], 'g'), String(i));
        val = val.replace(new RegExp(arabicDigits[i], 'g'), String(i));
    }
    inputEl.value = val.replace(/[^0-9]/g, '');
}

// Collapsible Filter Menu
function toggleFilterMenu(forceState) {
    const accordion = document.getElementById('filter-accordion');
    const panel = document.getElementById('filter-panel');
    const btn = document.getElementById('filter-toggle-btn');
    if (!accordion || !panel || !btn) return;

    const shouldOpen = typeof forceState === 'boolean' ? forceState : panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !shouldOpen);
    accordion.classList.toggle('open', shouldOpen);
    btn.setAttribute('aria-expanded', String(shouldOpen));
}

function applyAndCloseFilter() {
    renderTrips();
    toggleFilterMenu(false);
}

function updateActiveFilterBadge() {
    const fFrom = document.getElementById('filter-from')?.value || '';
    const fTo = document.getElementById('filter-to')?.value || '';
    const chip = document.getElementById('active-filter-chip');
    const clearBtn = document.getElementById('filter-quick-clear');
    const accordion = document.getElementById('filter-accordion');
    if (!chip || !clearBtn || !accordion) return;

    if (fFrom || fTo) {
        let label = '';
        if (fFrom && fTo) label = `${fFrom} ← ${fTo}`;
        else if (fFrom) label = `از ${fFrom}`;
        else label = `به ${fTo}`;
        chip.innerText = label;
        chip.classList.remove('hidden');
        clearBtn.classList.remove('hidden');
        accordion.classList.add('has-filter');
    } else {
        chip.innerText = '';
        chip.classList.add('hidden');
        clearBtn.classList.add('hidden');
        accordion.classList.remove('has-filter');
    }
}

// Populate 24-Hour Time Dropdowns (00:00 to 23:59)
function init24HourPicker() {
    const hourSelect = document.getElementById('trip-hour');
    const minSelect = document.getElementById('trip-minute');
    if (!hourSelect || !minSelect) return;

    hourSelect.innerHTML = '';
    for (let h = 0; h < 24; h++) {
        const val = String(h).padStart(2, '0');
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        hourSelect.appendChild(opt);
    }

    minSelect.innerHTML = '';
    for (let m = 0; m < 60; m++) {
        const val = String(m).padStart(2, '0');
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        minSelect.appendChild(opt);
    }

    setDefaultCurrentTime();
}

function setDefaultCurrentTime() {
    const now = new Date();
    const hourSelect = document.getElementById('trip-hour');
    const minSelect = document.getElementById('trip-minute');
    if (hourSelect && minSelect) {
        hourSelect.value = String(now.getHours()).padStart(2, '0');
        minSelect.value = String(now.getMinutes()).padStart(2, '0');
    }
}

// Toggle Custom Location Input
function toggleCustomLocation(type) {
    const select = document.getElementById(`trip-${type}`);
    const input = document.getElementById(`trip-${type}-custom`);
    if (select.value === 'سایر') {
        input.classList.remove('hidden');
        input.required = true;
        input.focus();
    } else {
        input.classList.add('hidden');
        input.required = false;
        input.value = '';
    }
}

// Sync filter dropdowns so custom user-typed locations are also filterable
function syncFilterOptions() {
    const fromSelect = document.getElementById('filter-from');
    const toSelect = document.getElementById('filter-to');
    if (!fromSelect || !toSelect) return;

    const prevFrom = fromSelect.value;
    const prevTo = toSelect.value;

    const fromSet = new Set(DEFAULT_LOCATIONS);
    const toSet = new Set(DEFAULT_LOCATIONS);
    trips.forEach(t => {
        if (t.from) fromSet.add(t.from);
        if (t.to) toSet.add(t.to);
    });

    fromSelect.innerHTML = '<option value="">همه مبدأها</option>';
    fromSet.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc;
        opt.textContent = loc;
        fromSelect.appendChild(opt);
    });

    toSelect.innerHTML = '<option value="">همه مقصدها</option>';
    toSet.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc;
        opt.textContent = loc;
        toSelect.appendChild(opt);
    });

    if (fromSet.has(prevFrom)) fromSelect.value = prevFrom;
    if (toSet.has(prevTo)) toSelect.value = prevTo;
}

// Gender Toggle on Auth Form
function selectGender(btn) {
    document.querySelectorAll('.gender-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('reg-gender').value = btn.getAttribute('data-value');
}

// Navigation
function nav(viewId) {
    if (viewId === 'auth') {
        document.getElementById('app-main').classList.add('hidden');
        document.getElementById('view-auth').classList.add('active');
        return;
    }

    document.getElementById('view-auth').classList.remove('active');
    document.getElementById('app-main').classList.remove('hidden');

    document.querySelectorAll('#app-main .view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + viewId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (viewId === 'dashboard') {
        syncFilterOptions();
        renderTrips();
    }
    if (viewId === 'rating') renderHistory();
    if (viewId === 'add') setDefaultCurrentTime();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showApp() {
    document.getElementById('view-auth').classList.remove('active');
    document.getElementById('app-main').classList.remove('hidden');
    document.getElementById('navbar').classList.remove('hidden');
    document.getElementById('user-header').classList.remove('hidden');

    refreshHeaderUser();
    syncFilterOptions();
    updateStats();
    nav('dashboard');
}

function refreshHeaderUser() {
    if (!user) return;
    document.getElementById('header-name').innerText = user.name;
    document.getElementById('welcome-name').innerText = user.name.split(' ')[0] || user.name;
    document.getElementById('header-avatar').innerText = user.name.trim().charAt(0) || 'ک';
    document.getElementById('header-sid').innerText = user.sid;
    document.getElementById('header-rating').innerText = Number(user.rating).toFixed(1);
    document.getElementById('header-tokens').innerText = user.tokens;
}

// Authentication (Preserves existing accounts by Student ID)
function handleLogin(e) {
    e.preventDefault();
    const sidInput = document.getElementById('reg-sid');
    sanitizeNumericInput(sidInput);

    const name = document.getElementById('reg-name').value.trim();
    const sid = sidInput.value.trim();
    const gender = document.getElementById('reg-gender').value;
    const contact = document.getElementById('reg-contact').value.trim();

    if (!name || !sid || !contact) {
        showToast('لطفاً تمام فیلدها را کامل پر کنید.');
        return;
    }

    if (sid.length < 5) {
        showToast('شماره دانشجویی معتبر وارد کنید.');
        return;
    }

    if (users[sid]) {
        users[sid].name = name;
        users[sid].gender = gender;
        users[sid].contact = contact;
        user = users[sid];
        saveData();
        showToast(`خوش برگشتی ${name.split(' ')[0]}!`);
    } else {
        user = {
            name,
            sid,
            gender,
            contact,
            tokens: 10,
            rating: 5.0,
            ratingCount: 1,
            ratingSum: 5
        };
        users[sid] = user;
        saveData();
        showToast('ثبت‌نام موفق! ۱۰ توکن هدیه به حساب شما اضافه شد.');
    }

    showApp();
}

function logout() {
    localStorage.removeItem(STORAGE_CURRENT_USER);
    user = null;
    document.getElementById('navbar').classList.add('hidden');
    document.getElementById('user-header').classList.add('hidden');
    document.getElementById('auth-form').reset();
    document.getElementById('reg-gender').value = 'آقا';
    document.querySelectorAll('.gender-option').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-value') === 'آقا');
    });
    nav('auth');
}

// Tabs & Filters
function setTab(tab) {
    currentTab = tab;
    document.getElementById('tab-all').classList.toggle('active', tab === 'all');
    document.getElementById('tab-mine').classList.toggle('active', tab === 'mine');
    renderTrips();
}

function applyQuickRoute(from, to) {
    setTab('all');
    syncFilterOptions();
    document.getElementById('filter-from').value = from;
    document.getElementById('filter-to').value = to;
    renderTrips();
    toggleFilterMenu(false);
    showToast(`فیلتر مسیر: ${from} به ${to}`);
}

function resetFilters() {
    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value = '';
    renderTrips();
    toggleFilterMenu(false);
}

// Stats Updater
function updateStats() {
    if (!user) return;
    const activeTrips = trips.filter(t => t.capacity > 0).length;
    const myTrips = trips.filter(t => t.creatorSid === user.sid).length;
    const myJoined = joinedTrips.filter(j => j.userSid === user.sid && j.status !== 'cancelled').length;

    refreshHeaderUser();
    document.getElementById('header-active-trips').innerText = activeTrips;
    document.getElementById('count-all').innerText = activeTrips;
    document.getElementById('count-mine').innerText = myTrips;
    document.getElementById('stat-total').innerText = activeTrips;
    document.getElementById('stat-mine').innerText = myTrips;
    document.getElementById('stat-tokens').innerText = user.tokens;
    document.getElementById('stat-joined').innerText = myJoined;
}

// Safe HTML escaping
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}

function isGenderAllowed(trip) {
    if (trip.gender === 'فقط آقایان') return user.gender === 'آقا';
    if (trip.gender === 'فقط خانم‌ها') return user.gender === 'خانم';
    return true;
}

function hasUserJoined(trip) {
    return Array.isArray(trip.passengers) && trip.passengers.some(p => p.sid === user.sid);
}

// Trips Dashboard
function renderTrips() {
    updateStats();
    updateActiveFilterBadge();
    const fFrom = document.getElementById('filter-from').value;
    const fTo = document.getElementById('filter-to').value;
    const container = document.getElementById('trips-container');
    container.innerHTML = '';

    let filtered = trips;

    if (currentTab === 'mine') {
        filtered = filtered.filter(t => t.creatorSid === user.sid);
    } else {
        filtered = filtered.filter(t => t.capacity > 0 || hasUserJoined(t));
        if (fFrom) filtered = filtered.filter(t => t.from === fFrom);
        if (fTo) filtered = filtered.filter(t => t.to === fTo);
    }

    if (filtered.length === 0) {
        const msgTitle = currentTab === 'mine' ? 'هنوز سفری ثبت نکرده‌اید' : 'هیچ سفری در این مسیر ثبت نشده';
        const msgDesc = currentTab === 'mine'
            ? 'سفرهای ایجادشده توسط شما در این بخش مدیریت می‌شوند.'
            : 'اولین نفری باشید که برای این مسیر سفر ثبت می‌کند!';
        container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-icon"><i class="fa fa-car-side"></i></div>
                <h3>${msgTitle}</h3>
                <p>${msgDesc}</p>
                <button type="button" onclick="nav('add')" class="btn btn-glow mt-2">
                    <i class="fa fa-plus"></i> ثبت سفر جدید
                </button>
            </div>
        `;
        return;
    }

    filtered.forEach(t => {
        const div = document.createElement('div');
        div.className = 'trip-card';

        const creatorData = users[t.creatorSid];
        const liveRating = creatorData ? Number(creatorData.rating).toFixed(1) : Number(t.rating || 5).toFixed(1);
        const alreadyJoined = hasUserJoined(t);
        const genderOk = isGenderAllowed(t);

        let actionHtml = '';
        let passengersHtml = '';

        if (t.creatorSid === user.sid) {
            actionHtml = `
                <div class="trip-actions-group">
                    <span class="badge badge-own"><i class="fa fa-check"></i> سفر شما</span>
                    <button type="button" onclick="openDeleteModal(${t.id})" class="btn-delete" title="لغو سفر"><i class="fa fa-trash-alt"></i></button>
                </div>
            `;
            if (Array.isArray(t.passengers) && t.passengers.length > 0) {
                const rows = t.passengers.map(p => `
                    <div class="passenger-row">
                        <span>${escapeHtml(p.name)}</span>
                        <span style="direction:ltr; color:#93c5fd;">${escapeHtml(p.contact)}</span>
                    </div>
                `).join('');
                passengersHtml = `
                    <div class="passengers-box">
                        <div class="passengers-box-title"><i class="fa fa-users"></i> هم‌سفرهای تاییدشده (${t.passengers.length} نفر)</div>
                        ${rows}
                    </div>
                `;
            }
        } else if (alreadyJoined) {
            actionHtml = `
                <div class="trip-actions-group">
                    <button type="button" onclick="showContactForTrip(${t.id})" class="btn-outline-info"><i class="fa fa-phone-alt"></i> اطلاعات تماس</button>
                    <button type="button" onclick="leaveTrip(${t.id})" class="btn-delete" title="لغو هم‌سفری">لغو</button>
                </div>
            `;
        } else if (!genderOk) {
            actionHtml = `<span class="badge badge-locked"><i class="fa fa-lock"></i> ${escapeHtml(t.gender)}</span>`;
        } else {
            actionHtml = `<button type="button" onclick="openJoinModal(${t.id})" class="btn btn-small btn-glow">هم‌سفر می‌شوم (۱ 🪙)</button>`;
        }

        const noteHtml = t.note ? `<div class="trip-note-box"><i class="fa fa-comment-alt text-primary"></i> ${escapeHtml(t.note)}</div>` : '';
        const capacityText = t.capacity > 0 ? `${t.capacity} نفر` : 'تکمیل شده';

        div.innerHTML = `
            <div class="trip-header">
                <div class="trip-route"><i class="fa fa-taxi"></i> ${escapeHtml(t.from)} به ${escapeHtml(t.to)}</div>
                <div class="trip-time"><i class="fa fa-clock"></i> ${escapeHtml(t.time)}</div>
            </div>
            <div class="trip-info">
                <span><i class="fa fa-user-circle"></i> ${escapeHtml(t.creator)} <i class="fa fa-star text-warning"></i> ${escapeHtml(liveRating)}</span>
                <span>ظرفیت: <b style="color:#fff">${capacityText}</b></span>
            </div>
            ${noteHtml}
            ${passengersHtml}
            <div class="trip-footer">
                <span class="badge">${escapeHtml(t.gender)}</span>
                ${actionHtml}
            </div>
        `;
        container.appendChild(div);
    });
}

function handleAddTrip(e) {
    e.preventDefault();
    const fromSelect = document.getElementById('trip-from').value;
    const toSelect = document.getElementById('trip-to').value;

    const fromVal = fromSelect === 'سایر'
        ? document.getElementById('trip-from-custom').value.trim()
        : fromSelect;
    const toVal = toSelect === 'سایر'
        ? document.getElementById('trip-to-custom').value.trim()
        : toSelect;

    if (!fromVal || !toVal) {
        showToast('لطفاً نام مبدأ و مقصد را وارد کنید.');
        return;
    }

    if (fromVal === toVal) {
        showToast('مبدأ و مقصد نمی‌توانند یکسان باشند.');
        return;
    }

    const capacityVal = parseInt(document.getElementById('trip-capacity').value, 10);
    if (isNaN(capacityVal) || capacityVal < 1 || capacityVal > 3) {
        showToast('ظرفیت باید بین ۱ تا ۳ نفر باشد.');
        return;
    }

    const hourVal = document.getElementById('trip-hour').value;
    const minVal = document.getElementById('trip-minute').value;
    const time24h = `${hourVal}:${minVal}`;
    const noteVal = document.getElementById('trip-note').value.trim();

    const newTrip = {
        id: Date.now(),
        creator: user.name,
        creatorSid: user.sid,
        rating: user.rating,
        contact: user.contact,
        from: fromVal,
        to: toVal,
        time: time24h,
        capacity: capacityVal,
        initialCapacity: capacityVal,
        gender: document.getElementById('trip-gender').value,
        note: noteVal,
        passengers: []
    };

    trips.unshift(newTrip);
    saveData();
    syncFilterOptions();
    showToast('سفر شما با موفقیت در تابلو ثبت شد.');

    e.target.reset();
    document.getElementById('trip-from-custom').classList.add('hidden');
    document.getElementById('trip-to-custom').classList.add('hidden');
    document.getElementById('trip-from-custom').required = false;
    document.getElementById('trip-to-custom').required = false;
    nav('dashboard');
}

function openDeleteModal(id) {
    pendingDeleteTripId = id;
    document.getElementById('delete-modal').style.display = 'flex';
}

function confirmDeleteTrip() {
    closeModal('delete-modal');
    const trip = trips.find(t => t.id === pendingDeleteTripId);
    if (!trip) return;

    if (Array.isArray(trip.passengers)) {
        trip.passengers.forEach(p => {
            if (users[p.sid]) {
                users[p.sid].tokens += 1;
            }
        });
    }
    joinedTrips.forEach(j => {
        if (j.tripId === trip.id && j.status === 'active') {
            j.status = 'cancelled';
        }
    });

    trips = trips.filter(t => t.id !== pendingDeleteTripId);
    pendingDeleteTripId = null;

    saveData();
    syncFilterOptions();
    showToast('سفر شما لغو و از تابلو حذف شد.');
    renderTrips();
}

// Joining Logic
function openJoinModal(id) {
    const trip = trips.find(t => t.id === id);
    if (!trip) return;

    if (Number(user.rating) < 2.5) {
        showToast('امتیاز شما زیر ۲.۵ است و امکان رزرو سفر جدید ندارید.');
        return;
    }
    if (hasUserJoined(trip)) {
        showContactForTrip(id);
        return;
    }
    if (!isGenderAllowed(trip)) {
        showToast(`این سفر ${trip.gender} است.`);
        return;
    }
    if (trip.capacity < 1) {
        showToast('ظرفیت این سفر تکمیل شده است.');
        return;
    }

    pendingJoinTripId = id;
    document.getElementById('join-modal').style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function confirmJoin() {
    closeModal('join-modal');
    if (user.tokens < 1) {
        showToast('موجودی توکن شما کافی نیست!');
        return;
    }

    const trip = trips.find(t => t.id === pendingJoinTripId);
    if (!trip || trip.capacity < 1 || hasUserJoined(trip)) {
        showToast('امکان پیوستن به این سفر وجود ندارد.');
        return;
    }

    trip.capacity -= 1;
    if (!Array.isArray(trip.passengers)) trip.passengers = [];
    trip.passengers.push({
        sid: user.sid,
        name: user.name,
        contact: user.contact
    });

    user.tokens -= 1;
    users[user.sid] = user;

    joinedTrips.unshift({
        id: Date.now(),
        tripId: trip.id,
        userSid: user.sid,
        creatorSid: trip.creatorSid,
        from: trip.from,
        to: trip.to,
        time: trip.time,
        creator: trip.creator,
        contact: trip.contact,
        date: new Date().toLocaleDateString('fa-IR'),
        status: 'active',
        ratedScore: null
    });

    pendingJoinTripId = null;
    saveData();
    updateStats();

    document.getElementById('contact-modal-title').innerText = 'رزرو با موفقیت انجام شد';
    document.getElementById('contact-info').innerText = trip.contact;
    document.getElementById('contact-modal').style.display = 'flex';
    renderTrips();
}

function showContactForTrip(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip || !hasUserJoined(trip)) return;
    document.getElementById('contact-modal-title').innerText = 'اطلاعات تماس هم‌سفر';
    document.getElementById('contact-info').innerText = trip.contact;
    document.getElementById('contact-modal').style.display = 'flex';
}

function leaveTrip(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip || !hasUserJoined(trip)) return;

    trip.passengers = trip.passengers.filter(p => p.sid !== user.sid);
    trip.capacity += 1;

    user.tokens += 1;
    users[user.sid] = user;

    const record = joinedTrips.find(j => j.tripId === tripId && j.userSid === user.sid && j.status === 'active');
    if (record) record.status = 'cancelled';

    saveData();
    updateStats();
    renderTrips();
    showToast('هم‌سفری شما لغو شد و ۱ توکن به حسابتان برگشت.');
}

// History & Interactive Rating View
function renderHistory() {
    const container = document.getElementById('joined-history-container');
    const myJoined = joinedTrips.filter(j => j.userSid === user.sid);

    if (myJoined.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-icon"><i class="fa fa-star"></i></div>
                <h3>سفری برای امتیازدهی وجود ندارد</h3>
                <p>پس از پیوستن به سفرهای دیگران، سابقه هم‌سفری‌های شما در اینجا نمایش داده می‌شود.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    myJoined.forEach(item => {
        const card = document.createElement('div');
        card.className = 'trip-card';
        card.style.marginBottom = '14px';

        let ratingHtml = '';
        if (item.status === 'cancelled') {
            ratingHtml = `<span class="badge badge-cancelled">لغو شده</span>`;
        } else if (item.ratedScore) {
            ratingHtml = `<span class="badge badge-own"><i class="fa fa-star text-warning"></i> امتیاز ثبت‌شده: ${item.ratedScore} از ۵</span>`;
        } else {
            const stars = [1, 2, 3, 4, 5].map(score =>
                `<button type="button" class="star-btn" onclick="rateTrip(${item.id}, ${score})" title="${score} ستاره"><i class="fa fa-star"></i></button>`
            ).join('');
            ratingHtml = `<div class="star-rating-group">${stars}</div>`;
        }

        card.innerHTML = `
            <div class="trip-header">
                <div class="trip-route"><i class="fa fa-taxi"></i> ${escapeHtml(item.from)} به ${escapeHtml(item.to)}</div>
                <div class="trip-time"><i class="fa fa-clock"></i> ${escapeHtml(item.time)}</div>
            </div>
            <div class="trip-info">
                <span>هم‌سفر: ${escapeHtml(item.creator)}</span>
                <span style="direction:ltr">${escapeHtml(item.contact)}</span>
            </div>
            <div class="trip-footer">
                <span class="badge">${escapeHtml(item.date)}</span>
                ${ratingHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

function rateTrip(joinRecordId, score) {
    const record = joinedTrips.find(j => j.id === joinRecordId && j.userSid === user.sid);
    if (!record || record.ratedScore || record.status === 'cancelled') return;

    record.ratedScore = score;

    if (record.creatorSid && users[record.creatorSid]) {
        const targetUser = users[record.creatorSid];
        targetUser.ratingSum = (targetUser.ratingSum || 5) + score;
        targetUser.ratingCount = (targetUser.ratingCount || 1) + 1;
        targetUser.rating = Number((targetUser.ratingSum / targetUser.ratingCount).toFixed(1));
    }

    saveData();
    renderHistory();
    showToast(`امتیاز ${score} ستاره با موفقیت ثبت شد ⭐`);
}

// Persistence
function saveData() {
    if (user) {
        users[user.sid] = user;
        localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(user));
    }
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_TRIPS, JSON.stringify(trips));
    localStorage.setItem(STORAGE_JOINED, JSON.stringify(joinedTrips));
}

// Non-overlapping Toast Notification
function showToast(msg) {
    const t = document.getElementById('toast');
    if (toastTimer) clearTimeout(toastTimer);
    t.innerText = msg;
    t.classList.add('show');
    toastTimer = setTimeout(() => {
        t.classList.remove('show');
        toastTimer = null;
    }, 3000);
}
