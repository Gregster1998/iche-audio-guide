// Dashboard.js - Integrates with CMS routes
console.log("Dashboard loading...");

// Wait for routes to load, then populate the interface
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Dashboard DOM loaded, waiting for routes...");
    
    // Wait for routes to be loaded from the API
    const loadedRoutes = await waitForRoutes();
    console.log("Dashboard received routes:", loadedRoutes);
    
    // Populate the dropdown and route cards
    populateRouteDropdown(loadedRoutes);
    populateAvailableRoutes(loadedRoutes);
    
    // Set up event listeners
    setupEventListeners();
});

// Populate the route selection dropdown
function populateRouteDropdown(routes) {
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
        option.textContent = 'No routes available - publish some routes in CMS';
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
    });
    
    console.log(`Added ${routes.length} routes to dropdown`);
}

// Populate the available routes section
function populateAvailableRoutes(routes) {
    const container = document.getElementById('routesContainer');
    if (!container) {
        console.error('Routes container not found');
        return;
    }
    
    if (!routes || routes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                <h3>No published routes available</h3>
                <p>Go to <a href="http://localhost:3001/cms" target="_blank">CMS</a> to publish some routes</p>
            </div>
        `;
        return;
    }
    
    // Create route cards
    container.innerHTML = routes.map(route => `
        <div class="route-card" onclick="selectRoute('${route.id}')">
            <div class="route-image" style="background: ${route.color || '#FFD700'};">
                <span style="font-size: 32px; color: white;">🎧</span>
            </div>
            <div class="route-content">
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
    `).join('');
    
    console.log(`Added ${routes.length} route cards`);
}

// Handle route selection
function selectRoute(routeId) {
    console.log('Route selected:', routeId);
    const route = getRoute(routeId);
    
    if (!route) {
        console.error('Selected route not found:', routeId);
        return;
    }
    
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
    const detailedView = document.getElementById('detailedRouteView');
    if (!detailedView) return;
    
    // Populate detailed route information
    document.getElementById('detailedRouteName').textContent = route.name;
    document.getElementById('detailedRouteDescription').textContent = route.description || 'No description available';
    document.getElementById('detailedRouteDistance').textContent = route.distance || 'N/A';
    document.getElementById('detailedRouteDuration').textContent = route.estimatedDuration || 'N/A';
    document.getElementById('detailedRouteDifficulty').textContent = route.difficulty || 'Easy';
    document.getElementById('detailedRouteStops').textContent = `${route.points?.length || 0} points`;
    
    // Show the detailed view
    detailedView.style.display = 'block';
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
                // Navigate to audio guide with selected route
                window.location.href = `audioguide.html?route=${selectedRouteId}`;
            } else {
                alert('Please select a route first');
            }
        });
    }
}

// Test function for debugging
function testRouteConnection() {
    console.log('=== DASHBOARD ROUTE TEST ===');
    console.log('Current routes:', routes);
    console.log('Routes loaded:', isLoaded);
    
    // Refresh routes from API
    loadRoutes().then(newRoutes => {
        console.log('Refreshed routes:', newRoutes);
        populateRouteDropdown(newRoutes);
        populateAvailableRoutes(newRoutes);
    });
}

// Make test function available globally
if (typeof window !== 'undefined') {
    window.testRouteConnection = testRouteConnection;
    window.selectRoute = selectRoute;
}