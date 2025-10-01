// Dashboard.js - Enhanced with user name display and city filtering
console.log("Dashboard loading...");

// Global route storage
let globalRoutesData = [];
let allCitiesData = [];
let currentUserCity = '';
let currentUserName = '';

// Wait for routes to load, then populate the interface
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Dashboard DOM loaded, starting initialization...");
    
    // Load user data from localStorage first
    loadUserData();
    
    try {
        // Load cities from database
        await loadCitiesFromDatabase();
        
        // Load routes for the user's selected city
        await loadRoutesForCity(currentUserCity);
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('✅ Dashboard loaded successfully');
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError(`Failed to load dashboard: ${error.message}`);
    }
});

// Load user data from localStorage and update UI
function loadUserData() {
    console.log("Loading user data from localStorage...");
    
    // Get user data
    currentUserName = localStorage.getItem('userName') || 'User';
    currentUserCity = localStorage.getItem('userCity') || '';
    
    console.log('User data loaded:', {
        name: currentUserName,
        city: currentUserCity
    });
    
    // Update welcome message
    const welcomeTitle = document.getElementById('welcomeTitle');
    if (welcomeTitle) {
        welcomeTitle.textContent = `Welcome, ${currentUserName}!`;
    }
    
    // Update city display
    const cityDisplay = document.getElementById('userCity');
    if (cityDisplay) {
        cityDisplay.textContent = currentUserCity || 'Select City';
    }
    
    // Update user avatar with first letter of name
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.textContent = currentUserName.charAt(0).toUpperCase();
    }
}

// Load cities from database
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

// Load routes for a specific city
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
        
        // Store routes globally
        globalRoutesData = routes;
        window.currentRoutesData = routes;
        
        // Update UI
        populateRouteDropdown(routes);
        populateAvailableRoutes(routes);
        
        // Update progress section
        updateProgressSection(routes);
        
        console.log(`✅ Loaded ${routes.length} routes for ${cityName}`);
        
    } catch (error) {
        console.error(`Error loading routes for ${cityName}:`, error);
        showError(`Failed to load routes for ${cityName}: ${error.message}`);
    }
}

// Fallback: load all published routes
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

// Show error in the routes container
function showError(message) {
    const container = document.getElementById('routesContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                <h3>⚠️ Routes Loading Error</h3>
                <p>${message}</p>
                <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">Check the browser console (F12) for technical details</p>
                <button onclick="location.reload()" style="background: #FFD700; color: #1B3A2E; border: none; padding: 10px 20px; border-radius: 8px; margin-top: 15px; cursor: pointer;">
                    🔄 Reload Page
                </button>
                <button onclick="testRouteConnection()" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 8px; margin-top: 15px; margin-left: 10px; cursor: pointer;">
                    🔍 Test Connection
                </button>
            </div>
        `;
    }
}

// Update progress section based on available routes
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

// Populate the route selection dropdown
function populateRouteDropdown(routes) {
    console.log('Populating dropdown with routes:', routes.length);
    const dropdown = document.getElementById('tramLineSelect');
    if (!dropdown) {
        console.error('Route dropdown not found');
        return;
    }
    
    // Clear existing options
    dropdown.innerHTML = '<option value="">Choose a route</option>';
    
    if (!routes || routes.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = `No routes available for ${currentUserCity}`;
        option.disabled = true;
        dropdown.appendChild(option);
        return;
    }
    
    // Add each route as an option
    routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = route.name;
        dropdown.appendChild(option);
        console.log(`Added route: ${route.name} (${route.id})`);
    });
    
    console.log(`✅ Added ${routes.length} routes to dropdown`);
}

// Populate the available routes section
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
                <p>Try switching to a different city or check the <a href="/cms" target="_blank" style="color: #FFD700;">CMS</a> to create routes for this city</p>
                <button onclick="showCitySelector()" style="background: #FFD700; color: #1B3A2E; border: none; padding: 10px 20px; border-radius: 8px; margin-top: 15px; cursor: pointer;">
                    🌍 Change City
                </button>
            </div>
        `;
        return;
    }
    
    // Create route cards
    container.innerHTML = routes.map(route => {
        console.log(`Creating card for route: ${route.name} (ID: ${route.id})`);
        
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
                ">
                    <div style="position: relative; z-index: 1;">
                        <span style="font-size: 32px; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">🎧</span>
                    </div>
                </div>
                <div class="route-content" style="padding: 15px; margin: 10%;">
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
                        <div class="route-stat">
                            <span class="stat-icon">📏</span>
                            <span>${route.distance || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    console.log(`✅ Added ${routes.length} route cards`);
}

// Handle route selection
function selectRoute(routeId) {
    console.log('Route selected:', routeId);
    
    const route = globalRoutesData.find(r => r.id === routeId);
    
    if (!route) {
        console.error('Selected route not found:', routeId);
        alert(`Route not found. Please try reloading the page.`);
        return;
    }
    
    console.log('✅ Found route:', route.name);
    
    // Update the dropdown to show selected route
    const dropdown = document.getElementById('tramLineSelect');
    if (dropdown) {
        dropdown.value = routeId;
    }
    
    // Show detailed route information
    showDetailedRoute(route);
    
    // Store selected route for later use
    sessionStorage.setItem('selectedRouteId', routeId);
}

// Show detailed route information
function showDetailedRoute(route) {
    console.log('Showing detailed route:', route.name);
    const detailedView = document.getElementById('detailedRouteView');
    if (!detailedView) {
        console.error('Detailed route view element not found');
        return;
    }
    
    // Update detailed route image
    const detailedRouteImage = document.getElementById('detailedRouteImage');
    if (detailedRouteImage && route.imageUrl) {
        detailedRouteImage.style.backgroundImage = `url('${route.imageUrl}')`;
        detailedRouteImage.style.backgroundSize = 'cover';
        detailedRouteImage.style.backgroundPosition = route.imagePosition || 'center';
        detailedRouteImage.style.backgroundRepeat = 'no-repeat';
    } else if (detailedRouteImage) {
        detailedRouteImage.style.backgroundImage = `linear-gradient(135deg, ${route.color || '#4a7c59'} 0%, #3d6b4a 100%)`;
    }
    
    // Populate detailed route information
    const nameEl = document.getElementById('detailedRouteName');
    const descEl = document.getElementById('detailedRouteDescription');
    const distEl = document.getElementById('detailedRouteDistance');
    const durEl = document.getElementById('detailedRouteDuration');
    const diffEl = document.getElementById('detailedRouteDifficulty');
    const stopsEl = document.getElementById('detailedRouteStops');
    
    if (nameEl) nameEl.textContent = route.name;
    if (descEl) descEl.textContent = route.description || 'No description available';
    if (distEl) distEl.textContent = route.distance || 'N/A';
    if (durEl) durEl.textContent = route.estimatedDuration || 'N/A';
    if (diffEl) diffEl.textContent = route.difficulty || 'Easy';
    if (stopsEl) stopsEl.textContent = `${route.points?.length || 0} points`;
    
    // Show the detailed view
    detailedView.style.display = 'block';
    console.log('✅ Detailed route view shown');
}

// Show city selector modal
function showCitySelector() {
    // Create modal HTML
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
            z-index: 1000;
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
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close city selector modal
function closeCitySelector() {
    const modal = document.getElementById('citySelectorModal');
    if (modal) {
        modal.remove();
    }
}

// Change user's city
async function changeCity() {
    const selector = document.getElementById('citySelector');
    const selectedCity = selector.value;
    
    if (!selectedCity) {
        alert('Please select a city');
        return;
    }
    
    console.log(`Changing city from ${currentUserCity} to ${selectedCity}`);
    
    // Update localStorage
    localStorage.setItem('userCity', selectedCity);
    currentUserCity = selectedCity;
    
    // Update UI
    const cityDisplay = document.getElementById('userCity');
    if (cityDisplay) {
        cityDisplay.textContent = selectedCity;
    }
    
    // Close modal
    closeCitySelector();
    
    // Load routes for new city
    await loadRoutesForCity(selectedCity);
    
    console.log(`✅ City changed to ${selectedCity}`);
}

// Set up event listeners
function setupEventListeners() {
    // Route dropdown change
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
        startButton.addEventListener('click', function() {
            const selectedRouteId = sessionStorage.getItem('selectedRouteId');
            if (selectedRouteId) {
                window.location.href = `audioguide.html?route=${selectedRouteId}`;
            } else {
                alert('Please select a route first');
            }
        });
    }
    
    // Make city display clickable
    const cityDisplay = document.getElementById('userCity');
    if (cityDisplay) {
        cityDisplay.style.cursor = 'pointer';
        cityDisplay.addEventListener('click', showCitySelector);
        cityDisplay.title = 'Click to change city';
    }
}

// Enhanced test function
function testRouteConnection() {
    console.log('=== DASHBOARD ROUTE CONNECTION TEST ===');
    console.log('Current user city:', currentUserCity);
    console.log('Available cities:', allCitiesData.map(c => c.name));
    console.log('Current routes count:', globalRoutesData.length);
    
    // Test city-specific endpoints
    if (currentUserCity) {
        const cityEndpoint = `${window.location.origin}/api/routes/city/${encodeURIComponent(currentUserCity)}`;
        console.log('Testing city endpoint:', cityEndpoint);
    }
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.testRouteConnection = testRouteConnection;
    window.selectRoute = selectRoute;
    window.showCitySelector = showCitySelector;
    window.closeCitySelector = closeCitySelector;
    window.changeCity = changeCity;
    window.globalRoutesData = globalRoutesData;
}