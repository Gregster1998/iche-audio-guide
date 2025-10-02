// Dashboard.js - Fixed with working detailed route modal
console.log("Dashboard loading...");

let globalRoutesData = [];
let allCitiesData = [];
let currentUserCity = '';
let currentUserName = '';
let routePreviewMap = null;
let selectedRouteForTour = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log("Dashboard DOM loaded, starting initialization...");
    
    loadUserData();
    
    try {
        await loadCitiesFromDatabase();
        await loadRoutesForCity(currentUserCity);
        setupEventListeners();
        
        console.log('✅ Dashboard loaded successfully');
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError(`Failed to load dashboard: ${error.message}`);
    }
});

function loadUserData() {
    console.log("Loading user data from localStorage...");
    
    currentUserName = localStorage.getItem('userName') || 'User';
    currentUserCity = localStorage.getItem('userCity') || '';
    
    console.log('User data loaded:', {
        name: currentUserName,
        city: currentUserCity
    });
    
    const welcomeTitle = document.getElementById('welcomeTitle');
    if (welcomeTitle) {
        welcomeTitle.textContent = `Welcome, ${currentUserName}!`;
    }
    
    const cityDisplay = document.getElementById('userCity');
    if (cityDisplay) {
        cityDisplay.textContent = currentUserCity || 'Select City';
    }
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.textContent = currentUserName.charAt(0).toUpperCase();
    }
}

async function loadCitiesFromDatabase() {
    console.log("Loading cities from database...");
    
    try {
        const endpoints = [
            `${window.location.origin}/api/cities`,
            'http://localhost:3001/api/cities'
        ];
        
        let cities = null;
        
        for (const endpoint of endpoints) {
            try {
                console.log(`Testing cities endpoint: ${endpoint}`);
                const response = await fetch(endpoint);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data && Array.isArray(data) && data.length > 0) {
                        cities = data;
                        console.log(`✅ Loaded ${cities.length} cities from database`);
                        break;
                    }
                }
            } catch (error) {
                console.log(`Cities endpoint ${endpoint} failed:`, error.message);
            }
        }
        
        if (!cities || cities.length === 0) {
            console.warn('⚠️ No cities found, using fallback');
            cities = [
                { name: 'Milan', country: 'Italy' },
                { name: 'Vienna', country: 'Austria' },
                { name: 'Rome', country: 'Italy' }
            ];
        }
        
        allCitiesData = cities;
        console.log('Cities available:', cities.map(c => c.name));
        
    } catch (error) {
        console.error('Error loading cities:', error);
        throw error;
    }
}

async function loadRoutesForCity(cityName) {
    console.log(`Loading routes for city: ${cityName}`);
    
    if (!cityName) {
        console.log('No city specified, loading all published routes');
        return await loadAllPublishedRoutes();
    }
    
    try {
        const endpoints = [
            `${window.location.origin}/api/routes/city/${encodeURIComponent(cityName)}`,
            'http://localhost:3001/api/routes/city/' + encodeURIComponent(cityName)
        ];
        
        let routes = null;
        
        for (const endpoint of endpoints) {
            try {
                console.log(`Testing endpoint: ${endpoint}`);
                const response = await fetch(endpoint);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data && Array.isArray(data)) {
                        routes = data;
                        console.log(`✅ Found ${routes.length} routes for ${cityName}`);
                        break;
                    }
                }
            } catch (error) {
                console.log(`Endpoint ${endpoint} failed:`, error.message);
            }
        }
        
        if (!routes) {
            console.log(`No routes found for ${cityName}, trying all routes`);
            return await loadAllPublishedRoutes();
        }
        
        globalRoutesData = routes;
        window.currentRoutesData = routes;
        
        populateRouteDropdown(routes);
        populateAvailableRoutes(routes);
        updateProgressSection(routes);
        
        console.log(`✅ Loaded ${routes.length} routes for ${cityName}`);
        
    } catch (error) {
        console.error(`Error loading routes for ${cityName}:`, error);
        showError(`Failed to load routes for ${cityName}: ${error.message}`);
    }
}

async function loadAllPublishedRoutes() {
    console.log('Loading all published routes as fallback...');
    
    const endpoints = [
        `${window.location.origin}/api/app/routes`,
        `${window.location.origin}/api/routes`,
        'http://localhost:3001/api/app/routes',
        'http://localhost:3001/api/routes'
    ];
    
    let routes = null;
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint);
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data)) {
                    routes = data;
                    console.log(`✅ Loaded ${routes.length} routes from ${endpoint}`);
                    break;
                }
            }
        } catch (error) {
            console.log(`Endpoint ${endpoint} failed:`, error.message);
        }
    }
    
    if (!routes) {
        routes = [];
        showError('Cannot connect to server. Make sure your server is running.');
        return;
    }
    
    globalRoutesData = routes;
    window.currentRoutesData = routes;
    
    populateRouteDropdown(routes);
    populateAvailableRoutes(routes);
    updateProgressSection(routes);
}

function showError(message) {
    const container = document.getElementById('routesContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                <h3>⚠️ Routes Loading Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="background: #FFD700; color: #1B3A2E; border: none; padding: 10px 20px; border-radius: 8px; margin-top: 15px; cursor: pointer;">
                    🔄 Reload Page
                </button>
            </div>
        `;
    }
}

function updateProgressSection(routes) {
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    
    if (progressText && progressPercent) {
        if (routes.length === 0) {
            progressText.textContent = `No tours available for ${currentUserCity}`;
            progressPercent.textContent = '0%';
        } else {
            progressText.textContent = `${routes.length} tour${routes.length === 1 ? '' : 's'} available in ${currentUserCity}`;
            progressPercent.textContent = '100%';
        }
    }
}

function populateRouteDropdown(routes) {
    console.log('Populating dropdown with routes:', routes.length);
    const dropdown = document.getElementById('tramLineSelect');
    if (!dropdown) {
        console.error('Route dropdown not found');
        return;
    }
    
    dropdown.innerHTML = '<option value="">Choose a route</option>';
    
    if (!routes || routes.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = `No routes available for ${currentUserCity}`;
        option.disabled = true;
        dropdown.appendChild(option);
        return;
    }
    
    routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = route.name;
        dropdown.appendChild(option);
    });
    
    console.log(`✅ Added ${routes.length} routes to dropdown`);
}

function populateAvailableRoutes(routes) {
    console.log('Populating route cards with routes:', routes.length);
    const container = document.getElementById('routesContainer');
    if (!container) {
        console.error('Routes container not found');
        return;
    }
    
    if (!routes || routes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                <h3>No tours available for ${currentUserCity}</h3>
                <button onclick="showCitySelector()" style="background: #FFD700; color: #1B3A2E; border: none; padding: 10px 20px; border-radius: 8px; margin-top: 15px; cursor: pointer;">
                    🌍 Change City
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = routes.map(route => {
        const backgroundImage = route.imageUrl 
            ? `url('${route.imageUrl}')` 
            : `linear-gradient(135deg, ${route.color || '#4a7c59'} 0%, #3d6b4a 100%)`;
        
        const backgroundPosition = route.imagePosition || 'center';
        
        return `
            <div class="route-card" onclick="selectRoute('${route.id}')" data-route-id="${route.id}">
                <div class="route-image" style="
                    background-image: ${backgroundImage}; 
                    background-size: cover; 
                    background-position: ${backgroundPosition};
                    background-repeat: no-repeat;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="position: relative; z-index: 1;">
                        <span style="font-size: 32px; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">🎧</span>
                    </div>
                </div>
                <div class="route-content" style="padding: 15px;">
                    <h3>${route.name}</h3>
                    <p class="route-description">${route.description || 'No description available'}</p>
                    <div class="route-stats">
                        <div class="route-stat">
                            <span class="stat-icon">📍</span>
                            <span>${route.points?.length || 0} stops</span>
                        </div>
                        <div class="route-stat">
                            <span class="stat-icon">⏱️</span>
                            <span>${route.estimatedDuration || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    console.log(`✅ Added ${routes.length} route cards`);
}

function selectRoute(routeId) {
    console.log('Route selected:', routeId);
    
    const route = globalRoutesData.find(r => r.id === routeId);
    
    if (!route) {
        console.error('Selected route not found:', routeId);
        alert(`Route not found. Please try reloading the page.`);
        return;
    }
    
    console.log('✅ Found route:', route.name);
    
    // Update dropdown
    const dropdown = document.getElementById('tramLineSelect');
    if (dropdown) {
        dropdown.value = routeId;
    }
    
    // Store selected route
    selectedRouteForTour = route;
    sessionStorage.setItem('selectedRouteId', routeId);
    
    // Show detailed view
    showDetailedRoute(route);
}

function showDetailedRoute(route) {
    console.log('Showing detailed route:', route.name);
    
    const modal = document.getElementById('detailedRouteModal');
    if (!modal) {
        console.error('Detailed route modal not found');
        return;
    }
    
    // Update route image
    const imageEl = document.getElementById('detailedRouteImage');
    if (imageEl) {
        if (route.imageUrl) {
            imageEl.src = route.imageUrl;
            imageEl.style.objectPosition = route.imagePosition || 'center';
        } else {
            imageEl.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzRhN2M1OSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+8J+OpzwvdGV4dD48L3N2Zz4=';
        }
    }
    
    // Update route info
    const nameEl = document.getElementById('detailedRouteName');
    const descEl = document.getElementById('detailedRouteDescription');
    const stopsEl = document.getElementById('detailedRouteStops');
    const durEl = document.getElementById('detailedRouteDuration');
    
    if (nameEl) nameEl.textContent = route.name;
    if (descEl) descEl.textContent = route.description || 'Journey through historical landmarks and cultural treasures.';
    if (stopsEl) stopsEl.textContent = `${route.points?.length || 0} stops`;
    if (durEl) durEl.textContent = route.estimatedDuration || '2-3 hours';
    
    // Show modal
    modal.classList.add('show');
    
    // Initialize map after modal is visible
    setTimeout(() => {
        initializeRoutePreviewMap(route);
    }, 300);
    
    console.log('✅ Detailed route modal shown');
}

function initializeRoutePreviewMap(route) {
    // Clean up existing map
    if (routePreviewMap) {
        routePreviewMap.remove();
        routePreviewMap = null;
    }
    
    const mapElement = document.getElementById('routePreviewMap');
    if (!mapElement || !route.points || route.points.length === 0) {
        console.log('No map element or no points to display');
        return;
    }
    
    const validPoints = route.points.filter(p => p.coordinates && p.coordinates.length === 2);
    if (validPoints.length === 0) {
        console.log('No valid coordinates found');
        return;
    }
    
    try {
        // Create coordinates array for Leaflet [lat, lng]
        const coordinates = validPoints.map(p => [p.coordinates[1], p.coordinates[0]]);
        const bounds = L.latLngBounds(coordinates);
        
        // Initialize map
        routePreviewMap = L.map('routePreviewMap', {
            zoomControl: false,
            attributionControl: false,
            dragging: true,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: true
        }).fitBounds(bounds, { padding: [30, 30] });
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(routePreviewMap);
        
        // Add markers for each point
        validPoints.forEach((point, index) => {
            const [lng, lat] = point.coordinates;
            const isStart = index === 0;
            const color = isStart ? '#FF5722' : '#FFD700';
            
            L.circleMarker([lat, lng], {
                radius: isStart ? 8 : 6,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 1
            }).addTo(routePreviewMap).bindPopup(point.name || `Stop ${index + 1}`);
        });
        
        // Draw route line
        if (coordinates.length > 1) {
            L.polyline(coordinates, {
                color: '#FFD700',
                weight: 3,
                opacity: 0.7
            }).addTo(routePreviewMap);
        }
        
        console.log('✅ Route preview map initialized with', validPoints.length, 'points');
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

function closeDetailedView() {
    const modal = document.getElementById('detailedRouteModal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    // Clean up map
    if (routePreviewMap) {
        routePreviewMap.remove();
        routePreviewMap = null;
    }
    
    console.log('✅ Detailed view closed');
}

function showCitySelector() {
    const modalHTML = `
        <div id="citySelectorModal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        ">
            <div style="
                background: linear-gradient(135deg, #1B3A2E 0%, #0F1419 100%);
                border-radius: 16px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
            ">
                <h3 style="margin-bottom: 20px; text-align: center;">Choose Your City</h3>
                <select id="citySelector" style="
                    width: 100%;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.1);
                    color: white;
                    font-size: 16px;
                    margin-bottom: 20px;
                ">
                    <option value="">Select a city...</option>
                    ${allCitiesData.map(city => `
                        <option value="${city.name}" ${city.name === currentUserCity ? 'selected' : ''}>
                            ${city.country ? `${city.name}, ${city.country}` : city.name}
                        </option>
                    `).join('')}
                </select>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="closeCitySelector()" style="
                        background: rgba(255,255,255,0.1);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                    ">Cancel</button>
                    <button onclick="changeCity()" style="
                        background: #FFD700;
                        color: #1B3A2E;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                    ">Change City</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeCitySelector() {
    const modal = document.getElementById('citySelectorModal');
    if (modal) {
        modal.remove();
    }
}

async function changeCity() {
    const selector = document.getElementById('citySelector');
    const selectedCity = selector.value;
    
    if (!selectedCity) {
        alert('Please select a city');
        return;
    }
    
    localStorage.setItem('userCity', selectedCity);
    currentUserCity = selectedCity;
    
    const cityDisplay = document.getElementById('userCity');
    if (cityDisplay) {
        cityDisplay.textContent = selectedCity;
    }
    
    closeCitySelector();
    await loadRoutesForCity(selectedCity);
}

function startAudioTour() {
    if (!selectedRouteForTour) {
        alert('Please select a route first');
        return;
    }
    
    console.log('Starting audio tour for route:', selectedRouteForTour.id);
    
    // Navigate to audioguide with route ID
    window.location.href = `audioguide.html?route=${selectedRouteForTour.id}`;
}

function setupEventListeners() {
    // Dropdown change listener
    const dropdown = document.getElementById('tramLineSelect');
    if (dropdown) {
        dropdown.addEventListener('change', function() {
            const routeId = this.value;
            if (routeId) {
                selectRoute(routeId);
            }
        });
    }
    
    // Start audio tour button
    const startButton = document.getElementById('startAudioButton');
    if (startButton) {
        startButton.addEventListener('click', startAudioTour);
    }
    
    // City selector
    const cityDisplay = document.getElementById('userCity');
    if (cityDisplay) {
        cityDisplay.style.cursor = 'pointer';
        cityDisplay.addEventListener('click', showCitySelector);
        cityDisplay.title = 'Click to change city';
    }
    
    // Rating stars
    const ratingStars = document.querySelectorAll('.star');
    ratingStars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.getAttribute('data-rating');
            ratingStars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('active');
                    s.textContent = '★';
                } else {
                    s.classList.remove('active');
                    s.textContent = '☆';
                }
            });
            console.log('Route rated:', rating, 'stars');
        });
    });
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.selectRoute = selectRoute;
    window.showCitySelector = showCitySelector;
    window.closeCitySelector = closeCitySelector;
    window.changeCity = changeCity;
    window.closeDetailedView = closeDetailedView;
    window.startAudioTour = startAudioTour;
    window.globalRoutesData = globalRoutesData;
}