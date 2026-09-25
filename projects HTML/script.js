/**
 * ============================================================================
 * WeatherSphere - Unified Application Script (script.js)
 * Combines:
 *  1. LocalStorage Authentication & Session Engine (Signup / Login / Guards)
 *  2. User Weather Module (Live API, Fallbacks, Recommendations, Leaflet Map)
 *  3. Admin Management Module (Broadcasts, User Directory, Anomaly Lab)
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. LOCAL STORAGE KEYS & INITIAL SEEDING
// ----------------------------------------------------------------------------
const STORAGE_KEYS = {
  USERS: 'weathersphere_users',
  SESSION: 'weathersphere_session',
  ALERTS: 'weathersphere_alerts',
  FAVORITES: 'weathersphere_favorites',
  LOGS: 'weathersphere_search_logs'
};

(function initLocalStorage() {
  // Pre-seed default Admin & User accounts if not present
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers = [
      {
        id: 'usr_admin_01',
        name: 'System Admin',
        email: 'admin@weather.com',
        password: 'admin123',
        role: 'admin',
        createdAt: '2026-09-01'
      },
      {
        id: 'usr_user_01',
        name: 'Naga Santhosh',
        email: 'user@weather.com',
        password: 'user123',
        role: 'user',
        createdAt: '2026-09-15'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
  }

  // Pre-seed severe alerts
  if (!localStorage.getItem(STORAGE_KEYS.ALERTS)) {
    const defaultAlerts = [
      {
        id: 'alt_01',
        title: 'Severe Thunderstorm & High Wind Warning',
        severity: 'Severe',
        cities: 'Visakhapatnam, Chennai, Mumbai',
        message: 'Gale wind gusts up to 85 km/h with heavy squalls expected along coastal regions. Stay indoors.',
        active: true,
        issuedAt: new Date().toLocaleDateString()
      },
      {
        id: 'alt_02',
        title: 'Excessive Heat & UV Surge Advisory',
        severity: 'High',
        cities: 'Hyderabad, Delhi, Jaipur',
        message: 'Afternoon heat index reaching 41°C. UV Index level 9. Hydrate and avoid direct sun 12 PM - 3 PM.',
        active: true,
        issuedAt: new Date().toLocaleDateString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(defaultAlerts));
  }

  // Pre-seed favorites
  if (!localStorage.getItem(STORAGE_KEYS.FAVORITES)) {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(['Hyderabad', 'Bengaluru', 'Mumbai', 'London', 'Tokyo']));
  }

  // Pre-seed search logs
  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    const defaultLogs = [
      { user: 'Naga Santhosh', city: 'Hyderabad', timestamp: 'Today, 10:14 AM' },
      { user: 'System Admin', city: 'London', timestamp: 'Today, 11:20 AM' },
      { user: 'Naga Santhosh', city: 'Tokyo', timestamp: 'Today, 12:45 PM' }
    ];
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(defaultLogs));
  }
})();

// ----------------------------------------------------------------------------
// 2. AUTHENTICATION & SESSION MANAGEMENT
// ----------------------------------------------------------------------------
const Auth = {
  getUsers: function() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
  },

  saveUsers: function(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  register: function(name, email, password, role = 'user') {
    const users = this.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (existing) {
      return { success: false, message: 'This email is already registered! Please sign in.' };
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: role.toLowerCase(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setSession(newUser);
    return { success: true, user: newUser, message: 'Registration successful! Welcome to WeatherSphere.' };
  },

  login: function(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);

    if (!user) {
      return { success: false, message: 'Invalid email or password. Please verify credentials.' };
    }

    this.setSession(user);
    return { success: true, user: user, message: `Welcome back, ${user.name}!` };
  },

  setSession: function(user) {
    const safeUser = { ...user };
    delete safeUser.password;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(safeUser));
  },

  getCurrentUser: function() {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
  },

  logout: function() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    showToast('Logged out successfully. Redirecting...', 'info');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 800);
  },

  protectRoute: function(requiredRole = null) {
    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      window.location.href = 'index.html';
      return false;
    }

    if (requiredRole && currentUser.role !== requiredRole) {
      alert(`Access restricted! Only ${requiredRole.toUpperCase()} accounts can access this module.`);
      window.location.href = 'dashboard.html';
      return false;
    }

    return true;
  }
};

// Global Toast Notifications
function showToast(message, type = 'info') {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.className = `toast ${type} show`;
  toast.innerHTML = `<span><strong>${icons[type] || '•'}</strong> ${message}</span>`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// ----------------------------------------------------------------------------
// 3. INDEX / AUTH PAGE CONTROLS
// ----------------------------------------------------------------------------
function switchAuthTab(mode) {
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');
  const loginTabBtn = document.getElementById('loginTabBtn');
  const regTabBtn = document.getElementById('registerTabBtn');

  if (!loginForm || !regForm) return;

  if (mode === 'login') {
    loginForm.style.display = 'flex';
    regForm.style.display = 'none';
    if (loginTabBtn) loginTabBtn.classList.add('active');
    if (regTabBtn) regTabBtn.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    regForm.style.display = 'flex';
    if (loginTabBtn) loginTabBtn.classList.remove('active');
    if (regTabBtn) regTabBtn.classList.add('active');
  }
}

function quickFill(role) {
  switchAuthTab('login');
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  if (!emailInput || !passInput) return;

  if (role === 'admin') {
    emailInput.value = 'admin@weather.com';
    passInput.value = 'admin123';
    showToast('Admin demo credentials populated!', 'info');
  } else {
    emailInput.value = 'user@weather.com';
    passInput.value = 'user123';
    showToast('User demo credentials populated!', 'info');
  }
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;

  const result = Auth.login(email, pass);
  if (result.success) {
    showToast(result.message, 'success');
    setTimeout(() => {
      window.location.href = result.user.role === 'admin' ? 'admin.html' : 'dashboard.html';
    }, 600);
  } else {
    showToast(result.message, 'error');
  }
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const pass = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;

  const result = Auth.register(name, email, pass, role);
  if (result.success) {
    showToast(result.message, 'success');
    setTimeout(() => {
      window.location.href = result.user.role === 'admin' ? 'admin.html' : 'dashboard.html';
    }, 600);
  } else {
    showToast(result.message, 'error');
  }
}

// ----------------------------------------------------------------------------
// 4. USER WEATHER MODULE ENGINE
// ----------------------------------------------------------------------------
let currentUnit = 'C';
let currentWeatherData = null;
let leafletMap = null;
let currentMarker = null;

const FALLBACK_CITIES = {
  hyderabad: {
    name: 'Hyderabad', country: 'India', lat: 17.3850, lon: 78.4867,
    temp: 31, feelsLike: 34, condition: 'Partly Cloudy', code: 2,
    humidity: 62, wind: 14, uv: 8, pressure: 1012, visibility: 9
  },
  bengaluru: {
    name: 'Bengaluru', country: 'India', lat: 12.9716, lon: 77.5946,
    temp: 24, feelsLike: 25, condition: 'Light Showers', code: 61,
    humidity: 78, wind: 16, uv: 5, pressure: 1014, visibility: 8
  },
  mumbai: {
    name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777,
    temp: 30, feelsLike: 36, condition: 'Humid & Overcast', code: 3,
    humidity: 84, wind: 20, uv: 7, pressure: 1009, visibility: 6
  },
  delhi: {
    name: 'Delhi', country: 'India', lat: 28.6139, lon: 77.2090,
    temp: 33, feelsLike: 35, condition: 'Hazy Sunshine', code: 1,
    humidity: 48, wind: 10, uv: 8, pressure: 1010, visibility: 5
  },
  london: {
    name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278,
    temp: 16, feelsLike: 15, condition: 'Drizzle & Clouds', code: 51,
    humidity: 75, wind: 22, uv: 3, pressure: 1018, visibility: 10
  },
  tokyo: {
    name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503,
    temp: 21, feelsLike: 20, condition: 'Clear Sky', code: 0,
    humidity: 55, wind: 12, uv: 6, pressure: 1020, visibility: 10
  }
};

function interpretWeatherCode(code) {
  if (code === 0) return { label: 'Clear Sky', icon: 'fa-sun', color: '#f59e0b' };
  if (code === 1) return { label: 'Mainly Clear', icon: 'fa-cloud-sun', color: '#fbbf24' };
  if (code === 2) return { label: 'Partly Cloudy', icon: 'fa-cloud-sun', color: '#94a3b8' };
  if (code === 3) return { label: 'Overcast', icon: 'fa-cloud', color: '#64748b' };
  if (code >= 45 && code <= 48) return { label: 'Foggy / Mist', icon: 'fa-smog', color: '#94a3b8' };
  if (code >= 51 && code <= 55) return { label: 'Drizzle', icon: 'fa-cloud-rain', color: '#38bdf8' };
  if (code >= 61 && code <= 65) return { label: 'Rain', icon: 'fa-cloud-showers-heavy', color: '#0284c7' };
  if (code >= 71 && code <= 77) return { label: 'Snowfall', icon: 'fa-snowflake', color: '#e0f2fe' };
  if (code >= 80 && code <= 82) return { label: 'Heavy Showers', icon: 'fa-cloud-showers-water', color: '#0369a1' };
  if (code >= 95 && code <= 99) return { label: 'Thunderstorm', icon: 'fa-bolt', color: '#eab308' };
  return { label: 'Variable', icon: 'fa-cloud', color: '#94a3b8' };
}

function toDisplayTemp(celsius) {
  return currentUnit === 'F' ? Math.round((celsius * 9/5) + 32) : Math.round(celsius);
}

function setUnit(unit) {
  currentUnit = unit;
  document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === unit);
  });
  if (currentWeatherData) renderWeatherData(currentWeatherData);
}

function logSearchActivity(cityName) {
  const user = Auth.getCurrentUser();
  const userName = user ? user.name : 'Guest';
  const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];
  
  logs.unshift({
    user: userName,
    city: cityName,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString()
  });

  if (logs.length > 25) logs.pop();
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
}

async function fetchWeather(cityQuery) {
  if (!cityQuery || !cityQuery.trim()) return;
  const sanitized = cityQuery.trim();
  const key = sanitized.toLowerCase().replace(/\s+/g, '');

  showToast(`Fetching weather for "${sanitized}"...`, 'info');

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(sanitized)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error('City not found via API, using fallback...');
    }

    const loc = geoData.results[0];
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    const wData = await weatherRes.json();

    const curr = wData.current;
    const daily = wData.daily;

    const weatherInfo = {
      name: loc.name,
      country: loc.country || '',
      lat: loc.latitude,
      lon: loc.longitude,
      temp: curr.temperature_2m,
      feelsLike: curr.apparent_temperature,
      code: curr.weather_code,
      humidity: curr.relative_humidity_2m,
      wind: Math.round(curr.wind_speed_10m),
      uv: daily && daily.uv_index_max ? Math.round(daily.uv_index_max[0]) : 6,
      pressure: Math.round(curr.surface_pressure),
      precipitation: curr.precipitation || 0
    };

    currentWeatherData = weatherInfo;
    renderWeatherData(weatherInfo);
    logSearchActivity(loc.name);
    showToast(`Weather updated for ${loc.name}!`, 'success');

  } catch (err) {
    const fallback = FALLBACK_CITIES[key] || {
      name: sanitized.charAt(0).toUpperCase() + sanitized.slice(1),
      country: 'World',
      lat: 20.0, lon: 78.0, temp: 28, feelsLike: 30,
      code: 1, humidity: 60, wind: 12, uv: 6, pressure: 1012, precipitation: 0
    };

    currentWeatherData = fallback;
    renderWeatherData(fallback);
    logSearchActivity(fallback.name);
    showToast(`Showing weather for ${fallback.name} (Simulated)`, 'info');
  }
}

function generateRecommendations(data) {
  const temp = data.temp;
  const code = data.code;
  const wind = data.wind;
  const uv = data.uv || 6;
  const precip = data.precipitation || 0;

  let clothing = { title: 'Attire', text: 'Light cotton shirts and comfortable trousers. Carry sunglasses.' };
  if (temp < 15) clothing.text = 'Thermal innerwear, wool sweater, and a warm windproof jacket.';
  else if (temp < 22) clothing.text = 'Long-sleeved shirt or a light cotton jacket.';
  else if (temp > 33) clothing.text = 'Breathable loose cotton wear, UV sunglasses, and a sunhat.';
  if (precip > 0 || (code >= 51 && code <= 82)) clothing.text += ' Carry waterproof footwear or a raincoat.';

  let activity = { title: 'Outdoor', badge: 'Good (7/10)', text: 'Pleasant weather for jogging or outdoor fitness.' };
  if (code >= 95 || wind > 40) {
    activity.badge = 'Dangerous (2/10)';
    activity.text = 'High storm risk and strong winds. Avoid outdoor workouts and stay sheltered.';
  } else if (precip > 2 || (code >= 61 && code <= 82)) {
    activity.badge = 'Wet (4/10)';
    activity.text = 'Roads are wet. Recommended for indoor gym or yoga.';
  } else if (temp >= 18 && temp <= 27 && wind < 25) {
    activity.badge = 'Ideal (10/10)';
    activity.text = 'Perfect conditions for cycling, jogging, or park sports!';
  }

  let umbrella = { title: 'Umbrella', text: 'No umbrella required today. Clear and dry.' };
  if (precip > 0 || (code >= 51 && code <= 82)) umbrella.text = 'Carry an umbrella! Rain showers actively detected.';

  let health = { title: 'UV Health', text: 'Moderate UV index. Drink plenty of water throughout the day.' };
  if (uv >= 8) health.text = `Extreme UV index (${uv}). Apply SPF 50+ sunscreen, wear UV shades, avoid direct sun 12 PM - 3 PM.`;

  return { clothing, activity, umbrella, health };
}

function renderWeatherData(data) {
  const cityNameElem = document.getElementById('cityName');
  if (!cityNameElem) return; // Not on weather dashboard

  const cond = interpretWeatherCode(data.code);
  const displayTemp = toDisplayTemp(data.temp);
  const displayFeelsLike = toDisplayTemp(data.feelsLike);

  cityNameElem.textContent = `${data.name}${data.country ? ', ' + data.country : ''}`;
  document.getElementById('currentTemp').textContent = displayTemp;
  document.getElementById('tempUnit').textContent = `°${currentUnit}`;
  document.getElementById('conditionText').textContent = cond.label;
  document.getElementById('feelsLikeText').textContent = `Feels like ${displayFeelsLike}°${currentUnit}`;
  
  const heroIcon = document.getElementById('conditionIcon');
  if (heroIcon) {
    heroIcon.className = `fas ${cond.icon} condition-icon-large`;
    heroIcon.style.color = cond.color;
  }

  document.getElementById('metricHumidity').textContent = `${data.humidity}%`;
  document.getElementById('metricWind').textContent = `${data.wind} km/h`;
  document.getElementById('metricUV').textContent = `${data.uv} / 11`;
  document.getElementById('metricPressure').textContent = `${data.pressure} hPa`;

  const recom = generateRecommendations(data);
  document.getElementById('recomClothing').textContent = recom.clothing.text;
  document.getElementById('recomActivity').textContent = `${recom.activity.badge} - ${recom.activity.text}`;
  document.getElementById('recomUmbrella').textContent = recom.umbrella.text;
  document.getElementById('recomHealth').textContent = recom.health.text;

  renderHourlyStrip(data);
  renderDailyForecast(data);
  updateLeafletMap(data.lat, data.lon, data.name, displayTemp, cond.label);
  updateFavoriteButtonState(data.name);
}

function renderHourlyStrip(data) {
  const container = document.getElementById('hourlyContainer');
  if (!container) return;
  container.innerHTML = '';
  const currentHour = new Date().getHours();

  for (let i = 0; i < 12; i++) {
    const hour = (currentHour + i) % 24;
    const hourTime = `${hour.toString().padStart(2, '0')}:00`;
    const tempVar = Math.sin((hour - 6) / 12 * Math.PI) * 4;
    const hourlyTemp = toDisplayTemp(data.temp - 2 + tempVar);
    const cond = interpretWeatherCode(data.code);

    const item = document.createElement('div');
    item.className = `hourly-item ${i === 0 ? 'current' : ''}`;
    item.innerHTML = `
      <span class="hourly-time">${i === 0 ? 'Now' : hourTime}</span>
      <i class="fas ${cond.icon} hourly-icon" style="color: ${cond.color};"></i>
      <span class="hourly-temp">${hourlyTemp}°</span>
    `;
    container.appendChild(item);
  }
}

function renderDailyForecast(data) {
  const container = document.getElementById('forecastContainer');
  if (!container) return;
  container.innerHTML = '';
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayIndex = new Date().getDay();

  for (let i = 1; i <= 5; i++) {
    const dayName = daysOfWeek[(todayIndex + i) % 7];
    const offset = (i % 2 === 0 ? 1 : -1) * (i * 0.8);
    const maxTemp = toDisplayTemp(data.temp + 2 + offset);
    const minTemp = toDisplayTemp(data.temp - 4 + offset);
    const cond = interpretWeatherCode((data.code + i) % 4);

    const row = document.createElement('div');
    row.className = 'forecast-item';
    row.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <div class="forecast-condition">
        <i class="fas ${cond.icon}" style="color: ${cond.color};"></i>
        <span>${cond.label}</span>
      </div>
      <div class="forecast-temps">
        <span class="max">${maxTemp}°</span>
        <span class="min">${minTemp}°</span>
      </div>
    `;
    container.appendChild(row);
  }
}

function updateLeafletMap(lat, lon, cityName, temp, condition) {
  if (typeof L === 'undefined') return;
  const mapElem = document.getElementById('mapContainer');
  if (!mapElem) return;

  if (!leafletMap) {
    leafletMap = L.map('mapContainer', { zoomControl: true, attributionControl: false }).setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(leafletMap);
  } else {
    leafletMap.setView([lat, lon], 10);
  }

  if (currentMarker) leafletMap.removeLayer(currentMarker);
  currentMarker = L.marker([lat, lon]).addTo(leafletMap);
  currentMarker.bindPopup(`<strong>${cityName}</strong><br>Temp: <strong>${temp}°${currentUnit}</strong><br>${condition}`).openPopup();
}

function getFavorites() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES)) || [];
}

function toggleCurrentFavorite() {
  if (!currentWeatherData) return;
  const cityName = currentWeatherData.name;
  let favs = getFavorites();
  const index = favs.findIndex(c => c.toLowerCase() === cityName.toLowerCase());

  if (index >= 0) {
    favs.splice(index, 1);
    showToast(`Removed "${cityName}" from favorites.`, 'info');
  } else {
    favs.push(cityName);
    showToast(`Saved "${cityName}" to favorites!`, 'success');
  }

  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
  renderFavoritesList();
  updateFavoriteButtonState(cityName);
}

function updateFavoriteButtonState(cityName) {
  const btn = document.getElementById('favBtn');
  if (!btn) return;
  const isFav = getFavorites().some(c => c.toLowerCase() === cityName.toLowerCase());
  btn.classList.toggle('active', isFav);
  btn.innerHTML = `<i class="${isFav ? 'fas fa-star' : 'far fa-star'}"></i>`;
}

function renderFavoritesList() {
  const container = document.getElementById('favoritesList');
  if (!container) return;
  container.innerHTML = '';
  const favs = getFavorites();

  favs.forEach(city => {
    const card = document.createElement('div');
    card.className = 'fav-city-card';
    card.innerHTML = `
      <span class="fav-city-name" onclick="fetchWeather('${city}')"><i class="fas fa-map-marker-alt" style="color: var(--accent-cyan); margin-right: 6px;"></i>${city}</span>
      <button class="fav-city-remove" onclick="removeFavorite('${city}', event)"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(card);
  });
}

function removeFavorite(cityName, e) {
  if (e) e.stopPropagation();
  let favs = getFavorites().filter(c => c.toLowerCase() !== cityName.toLowerCase());
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
  renderFavoritesList();
  if (currentWeatherData) updateFavoriteButtonState(currentWeatherData.name);
}

function checkActiveAlerts() {
  const banner = document.getElementById('activeAlertBanner');
  const alertText = document.getElementById('alertBannerText');
  if (!banner || !alertText) return;

  const alerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS)) || [];
  const activeAlert = alerts.find(a => a.active === true);

  if (activeAlert) {
    banner.style.display = 'flex';
    alertText.innerHTML = `
      <strong><i class="fas fa-exclamation-triangle"></i> ${activeAlert.severity.toUpperCase()} ALERT: ${activeAlert.title}</strong>
      <span>Affecting: ${activeAlert.cities} &bull; ${activeAlert.message}</span>
    `;
  } else {
    banner.style.display = 'none';
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }
  showToast('Detecting your GPS location...', 'info');
  navigator.geolocation.getCurrentPosition(
    () => fetchWeather('Hyderabad'),
    () => fetchWeather('Hyderabad')
  );
}

// ----------------------------------------------------------------------------
// 5. ADMIN CONTROL MODULE ENGINE
// ----------------------------------------------------------------------------
function refreshAdminDashboard() {
  const statUsers = document.getElementById('statTotalUsers');
  if (!statUsers) return; // Not on admin page

  renderAnalyticsStats();
  renderAlertsTable();
  renderUsersTable();
  renderAuditLogs();
}

function renderAnalyticsStats() {
  const users = Auth.getUsers();
  const alerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS)) || [];
  const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];
  const favs = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES)) || [];

  const activeAlertsCount = alerts.filter(a => a.active === true).length;

  const uElem = document.getElementById('statTotalUsers');
  const aElem = document.getElementById('statActiveAlerts');
  const lElem = document.getElementById('statTotalLogs');
  const cElem = document.getElementById('statMonitoredCities');

  if (uElem) uElem.textContent = users.length;
  if (aElem) aElem.textContent = activeAlertsCount;
  if (lElem) lElem.textContent = logs.length;
  if (cElem) cElem.textContent = Math.max(favs.length, 12);
}

function handleCreateAlert(e) {
  e.preventDefault();
  const title = document.getElementById('alertTitle').value.trim();
  const severity = document.getElementById('alertSeverity').value;
  const cities = document.getElementById('alertCities').value.trim();
  const message = document.getElementById('alertMessage').value.trim();

  if (!title || !cities || !message) {
    showToast('Please fill out all required fields.', 'error');
    return;
  }

  const alerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS)) || [];
  const newAlert = {
    id: 'alt_' + Date.now(),
    title: title,
    severity: severity,
    cities: cities,
    message: message,
    active: true,
    issuedAt: new Date().toLocaleDateString()
  };

  alerts.unshift(newAlert);
  localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));

  document.getElementById('alertForm').reset();
  showToast(`Broadcasting "${severity.toUpperCase()}" alert to all users!`, 'success');
  refreshAdminDashboard();
}

function renderAlertsTable() {
  const tbody = document.getElementById('alertsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const alerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS)) || [];
  if (alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No active alerts.</td></tr>`;
    return;
  }

  alerts.forEach(alert => {
    const tr = document.createElement('tr');
    let severityClass = (alert.severity === 'Severe' || alert.severity === 'Emergency') ? 'role-pill admin' : 'role-pill user';

    tr.innerHTML = `
      <td>
        <strong style="color: var(--text-main);">${alert.title}</strong>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${alert.message}</p>
      </td>
      <td><span class="${severityClass}">${alert.severity}</span></td>
      <td>${alert.cities}</td>
      <td>
        <button class="btn btn-sm ${alert.active ? 'btn-primary' : 'btn-secondary'}" onclick="toggleAlertStatus('${alert.id}')">
          ${alert.active ? '● Broadcast Active' : '○ Inactive'}
        </button>
      </td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteAlert('${alert.id}')" title="Delete Alert">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleAlertStatus(alertId) {
  const alerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS)) || [];
  const target = alerts.find(a => a.id === alertId);
  if (target) {
    target.active = !target.active;
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    showToast(`Alert status updated to: ${target.active ? 'ACTIVE' : 'INACTIVE'}`, 'info');
    refreshAdminDashboard();
  }
}

function deleteAlert(alertId) {
  if (!confirm('Are you sure you want to permanently delete this broadcast alert?')) return;
  let alerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS)) || [];
  alerts = alerts.filter(a => a.id !== alertId);
  localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
  showToast('Severe weather alert deleted.', 'info');
  refreshAdminDashboard();
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = Auth.getUsers();
  const currentUser = Auth.getCurrentUser();

  users.forEach(u => {
    const tr = document.createElement('tr');
    const isCurrent = currentUser && currentUser.email === u.email;

    tr.innerHTML = `
      <td><strong>${u.name}</strong> ${isCurrent ? '<span style="font-size: 0.7rem; color: var(--accent-cyan);">(You)</span>' : ''}</td>
      <td>${u.email}</td>
      <td><span class="role-pill ${u.role}">${u.role.toUpperCase()}</span></td>
      <td>${u.createdAt || '2026-09-01'}</td>
      <td>
        ${!isCurrent ? `
          <button class="btn btn-sm btn-secondary" onclick="toggleUserRole('${u.id}')" title="Change Role">
            <i class="fas fa-user-cog"></i> Switch Role
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteUserAccount('${u.id}')" title="Remove User">
            <i class="fas fa-user-times"></i>
          </button>
        ` : '<span style="color: var(--text-dim); font-size: 0.8rem;">Current Session</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleUserRole(userId) {
  const users = Auth.getUsers();
  const target = users.find(u => u.id === userId);
  if (target) {
    target.role = target.role === 'admin' ? 'user' : 'admin';
    Auth.saveUsers(users);
    showToast(`Role for ${target.name} updated to ${target.role.toUpperCase()}`, 'success');
    refreshAdminDashboard();
  }
}

function deleteUserAccount(userId) {
  if (!confirm('Are you sure you want to delete this user from the system?')) return;
  let users = Auth.getUsers().filter(u => u.id !== userId);
  Auth.saveUsers(users);
  showToast('User account successfully removed.', 'info');
  refreshAdminDashboard();
}

function simulateAnomaly(type) {
  const alerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS)) || [];
  
  if (type === 'cyclone') {
    alerts.unshift({
      id: 'alt_' + Date.now(),
      title: '🚨 EXTREME TROPICAL CYCLONE ALERT',
      severity: 'Emergency',
      cities: 'Coastal Corridor & Neighboring Districts',
      message: 'Category 3 Cyclone landfall imminent. Wind speeds reaching 110 km/h with catastrophic coastal surge. Complete evacuation ordered.',
      active: true,
      issuedAt: new Date().toLocaleDateString()
    });
    showToast('Simulated Cyclone Emergency Alert published!', 'error');
  } else if (type === 'heatwave') {
    alerts.unshift({
      id: 'alt_' + Date.now(),
      title: '🔥 CODE RED: SEVERE HEATWAVE EPISODE',
      severity: 'Severe',
      cities: 'Central Plateau & Metropolitan Zones',
      message: 'Peak temperature projected at 45.2°C. High mortality risk for vulnerable populations. Severe dehydration alert.',
      active: true,
      issuedAt: new Date().toLocaleDateString()
    });
    showToast('Simulated Severe Heatwave Alert published!', 'error');
  } else if (type === 'deluge') {
    alerts.unshift({
      id: 'alt_' + Date.now(),
      title: '⛈️ FLASH FLOOD & CLOUDBURST WARNING',
      severity: 'High',
      cities: 'Urban Lowlands & River Valleys',
      message: 'Torrential downpour exceeding 120mm in 3 hours. Severe urban waterlogging. Avoid driving and stay above ground floors.',
      active: true,
      issuedAt: new Date().toLocaleDateString()
    });
    showToast('Simulated Cloudburst & Flood Alert published!', 'info');
  }

  localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
  refreshAdminDashboard();
}

function renderAuditLogs() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];

  logs.slice(0, 10).forEach(log => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><i class="fas fa-user-circle" style="color: var(--accent-cyan); margin-right: 6px;"></i>${log.user}</td>
      <td><strong>${log.city}</strong></td>
      <td style="color: var(--text-muted); font-size: 0.8rem;">${log.timestamp}</td>
    `;
    tbody.appendChild(tr);
  });
}

function clearAuditLogs() {
  if (!confirm('Clear all recorded search telemetry logs?')) return;
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  showToast('Search logs cleared.', 'info');
  refreshAdminDashboard();
}

// ----------------------------------------------------------------------------
// 6. AUTO-INITIALIZE ON PAGE LOAD DEPENDING ON CURRENT PAGE
// ----------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  const currentUser = Auth.getCurrentUser();

  // If on Admin Page
  if (document.getElementById('adminName')) {
    const isAllowed = Auth.protectRoute('admin');
    if (!isAllowed) return;
    if (currentUser) document.getElementById('adminName').textContent = currentUser.name;
    refreshAdminDashboard();
  }

  // If on User Dashboard Page
  if (document.getElementById('cityName')) {
    const isAllowed = Auth.protectRoute();
    if (!isAllowed) return;

    if (currentUser) {
      const userElem = document.getElementById('navUserName');
      const roleElem = document.getElementById('navUserRole');
      const adminLink = document.getElementById('adminPortalLink');
      const userInitial = document.getElementById('userInitial');

      if (userElem) userElem.textContent = currentUser.name;
      if (userInitial) userInitial.textContent = currentUser.name.charAt(0).toUpperCase();
      if (roleElem) {
        roleElem.textContent = currentUser.role.toUpperCase();
        roleElem.className = `role-pill ${currentUser.role}`;
      }
      if (adminLink && currentUser.role === 'admin') {
        adminLink.style.display = 'inline-flex';
      }
    }

    fetchWeather('Hyderabad');
    renderFavoritesList();
    checkActiveAlerts();
  }
});
