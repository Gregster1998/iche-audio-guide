// Dashboard.js - Fixed with proper route storage
console.log("Dashboard loading...");

// Global route storage
let globalRoutesData = [];

// Wait for routes to load, then populate the interface
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Dashboard DOM loaded, starting debug...");
    
    try {
        // Test multiple API endpoints to find the working one
        const testEndpoints = [
            `${window.location.origin}/api/app/routes`,
            `${window.location.origin}/api/routes`,
            'http://localhost:3001/api/app/routes',
            'http://localhost:3001/api/routes'
        ];
        
        let workingRoutes = null;
        let workingEndpoint = null;
        
        for (const endpoint of testEndpoints) {
            try {
                console.log(`Testing endpoint: ${endpoint}`);
                const response = await fetch(endpoint);
                console.log(`Response status: ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`Data received:`, data);
                    
                    if (data && Array.isArray(data) && data.length > 0) {
                        workingRoutes = data;
                        workingEndpoint = endpoint;
                        console.log(`✅ Working endpoint found: ${endpoint}`);
                        break;
                    } else if (data && Array.isArray(data)) {
                        console.log(`⚠️ Endpoint ${endpoint} returned empty array`);
                    }
                }
            } catch (error) {
                console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
            }
        }
        
        if (!workingRoutes) {
            console.error('❌ No working endpoints found');
            showError('Cannot connect to server. Make sure your server is running.');
            return;
        }
        
        console.log(`Using endpoint: ${workingEndpoint}`);
        console.log(`Routes found: ${workingRoutes.length}`);
        
        // Wait for routes.js if it's available, otherwise use direct data
        let finalRoutes = workingRoutes;
        
        if (typeof window.waitForRoutes === 'function') {
            try {
                console.log('Trying routes.js system...');
                const routesJsData = await Promise.race([
                    window.waitForRoutes(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                ]);
                
                if (routesJsData && routesJsData.length > 0) {
                    finalRoutes = routesJsData;
                    console.log('Using routes.js data');
                } else {
                    console.log('Routes.js returned empty, using direct API data');
                }
            } catch (error) {
                console.log('Routes.js failed, using direct API data:', error.message);
            }
        } else {
            console.log('Routes.js not available, using direct API data');
        }
        
        // IMPORTANT: Store routes globally for selectRoute function
        globalRoutesData = finalRoutes;
        window.currentRoutesData = finalRoutes; // For backwards compatibility
        
        console.log("Dashboard final routes:", finalRoutes);
        console.log("Routes count:", finalRoutes.length);
        console.log("Global routes stored:", globalRoutesData.length);
        
        // Populate the interface
        populateRouteDropdown(finalRoutes);
        populateAvailableRoutes(finalRoutes);
        setupEventListeners();
        
        console.log('✅ Dashboard loaded successfully');
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError(`Failed to load: ${error.message}`);
    }
});

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
        option.textContent = 'No routes available - check CMS';
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

// Populate the available routes section with images and custom positioning
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
                <h3>No published routes available</h3>
                <p>Go to <a href="/cms" target="_blank" style="color: #FFD700;">CMS</a> to create and publish routes</p>
                <button onclick="testRouteConnection()" style="background: #FFD700; color: #1B3A2E; border: none; padding: 10px 20px; border-radius: 8px; margin-top: 15px; cursor: pointer;">
                    🔍 Check Connection
                </button>
            </div>
        `;
        return;
    }
    
    // Create route cards with images and custom positioning
    container.innerHTML = routes.map(route => {
        console.log(`Creating card for route: ${route.name} (ID: ${route.id})`);
        
        // Determine the background image or fallback
        const backgroundImage = route.imageUrl 
            ? `url('${route.imageUrl}')` 
            : `linear-gradient(135deg, ${route.color || '#4a7c59'} 0%, #3d6b4a 100%)`;
        
        // Use image position from route data or default to center
        const backgroundPosition = route.imagePosition || 'center';
        
        console.log(`Route ${route.name}: using position "${backgroundPosition}"`);
        
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
    
    console.log(`✅ Added ${routes.length} route cards with custom image positioning`);
}

// FIXED: Handle route selection with proper route lookup
function selectRoute(routeId) {
    console.log('Route selected:', routeId);
    console.log('Available routes in globalRoutesData:', globalRoutesData.length);
    console.log('Route IDs available:', globalRoutesData.map(r => r.id));
    
    // Look for route in multiple places
    let route = null;
    
    // First try: globalRoutesData
    if (globalRoutesData && globalRoutesData.length > 0) {
        route = globalRoutesData.find(r => r.id === routeId);
        if (route) {
            console.log('✅ Found route in globalRoutesData:', route.name);
        }
    }
    
    // Second try: window.getRoute if available
    if (!route && typeof window.getRoute === 'function') {
        route = window.getRoute(routeId);
        if (route) {
            console.log('✅ Found route via window.getRoute:', route.name);
        }
    }
    
    // Third try: window.currentRoutesData
    if (!route && window.currentRoutesData) {
        route = window.currentRoutesData.find(r => r.id === routeId);
        if (route) {
            console.log('✅ Found route in window.currentRoutesData:', route.name);
        }
    }
    
    // Fourth try: window.routes
    if (!route && window.routes) {
        route = window.routes.find(r => r.id === routeId);
        if (route) {
            console.log('✅ Found route in window.routes:', route.name);
        }
    }
    
    if (!route) {
        console.error('❌ Selected route not found:', routeId);
        console.error('Debug info:');
        console.error('- globalRoutesData length:', globalRoutesData?.length || 0);
        console.error('- window.currentRoutesData length:', window.currentRoutesData?.length || 0);
        console.error('- window.routes length:', window.routes?.length || 0);
        
        alert(`Route not found (ID: ${routeId}). Please try reloading the page.`);
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

// Show detailed route information with image and custom positioning
function showDetailedRoute(route) {
    console.log('Showing detailed route:', route.name);
    const detailedView = document.getElementById('detailedRouteView');
    if (!detailedView) {
        console.error('Detailed route view element not found');
        return;
    }
    
    // Update detailed route image with custom positioning
    const detailedRouteImage = document.getElementById('detailedRouteImage');
    if (detailedRouteImage && route.imageUrl) {
        detailedRouteImage.style.backgroundImage = `url('${route.imageUrl}')`;
        detailedRouteImage.style.backgroundSize = 'cover';
        detailedRouteImage.style.backgroundPosition = route.imagePosition || 'center';
        detailedRouteImage.style.backgroundRepeat = 'no-repeat';
        
        console.log(`Detailed view for ${route.name}: using position "${route.imagePosition || 'center'}"`);
    } else if (detailedRouteImage) {
        // Fallback to color gradient
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

// Enhanced test function
function testRouteConnection() {
    console.log('=== DASHBOARD ROUTE CONNECTION TEST ===');
    
    // Test all possible endpoints
    const endpoints = [
        `${window.location.origin}/api/app/routes`,
        `${window.location.origin}/api/routes`,
        `${window.location.origin}/api/debug/routes`,
        'http://localhost:3001/api/app/routes',
        'http://localhost:3001/api/routes'
    ];
    
    endpoints.forEach(async (endpoint) => {
        try {
            console.log(`Testing: ${endpoint}`);
            const response = await fetch(endpoint);
            console.log(`${endpoint} - Status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`${endpoint} - Data:`, data);
                console.log(`${endpoint} - Count: ${data.length || 'N/A'}`);
                
                if (data && (Array.isArray(data) ? data.length > 0 : true)) {
                    console.log(`✅ ${endpoint} is working!`);
                    
                    if (Array.isArray(data) && data.length > 0) {
                        // Store working data for later use
                        globalRoutesData = data;
                        window.currentRoutesData = data;
                        // Try to repopulate
                        populateRouteDropdown(data);
                        populateAvailableRoutes(data);
                    }
                }
            }
        } catch (error) {
            console.log(`❌ ${endpoint} failed:`, error.message);
        }
    });
    
    // Test routes.js functions
    console.log('Routes.js functions available:');
    console.log('- window.routes:', window.routes?.length || 'undefined');
    console.log('- window.loadRoutes:', typeof window.loadRoutes);
    console.log('- window.getRoute:', typeof window.getRoute);
    console.log('- window.waitForRoutes:', typeof window.waitForRoutes);
    console.log('- globalRoutesData:', globalRoutesData.length);
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.testRouteConnection = testRouteConnection;
    window.selectRoute = selectRoute;
    window.globalRoutesData = globalRoutesData;
}