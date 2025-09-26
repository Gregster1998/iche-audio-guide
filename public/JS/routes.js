// routes.js - Updated for production deployment
console.log("Loading routes from CMS...");

let routes = [];
let isLoaded = false;

// Load routes from CMS API
async function loadRoutes() {
    try {
        console.log("Fetching routes from CMS API...");
        
        // Determine API URL based on environment
        let apiUrl;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Development
            apiUrl = 'http://localhost:3001/api/app/routes';
        } else {
            // Production - use same domain
            apiUrl = `${window.location.origin}/api/app/routes`;
        }
        
        console.log("API URL:", apiUrl);
        
        const response = await fetch(apiUrl);
        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("API Response received:", data);
        console.log("Routes count:", data.length);
        
        routes = data;
        isLoaded = true;
        
        console.log(`Successfully loaded ${routes.length} routes from CMS`);
        
        // Trigger custom event to notify other parts of the app
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('routesLoaded', { 
                detail: { routes: routes }
            }));
        }
        
        return routes;
        
    } catch (error) {
        console.error("Failed to load routes from CMS:", error);
        console.error("Error details:", error.message);
        routes = []; // Empty array on error
        isLoaded = true;
        return routes;
    }
}

// Get route by ID
function getRoute(routeId) {
    console.log("Getting route:", routeId);
    const route = routes.find(route => route.id === routeId);
    console.log("Found route:", route);
    return route || null;
}

// Wait for routes to be loaded
function waitForRoutes() {
    return new Promise((resolve) => {
        if (isLoaded) {
            console.log("Routes already loaded, resolving immediately");
            resolve(routes);
        } else {
            console.log("Waiting for routes to load...");
            window.addEventListener('routesLoaded', (event) => {
                console.log("Routes loaded event received");
                resolve(event.detail.routes);
            }, { once: true });
        }
    });
}

// Debug function
function debugRoutes() {
    console.log('=== ROUTES DEBUG ===');
    console.log('Routes loaded:', isLoaded);
    console.log('Routes count:', routes.length);
    console.log('Routes data:', routes);
    
    // Test API call
    const testUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001/api/app/routes'
        : `${window.location.origin}/api/app/routes`;
        
    console.log('Testing API URL:', testUrl);
    
    fetch(testUrl)
        .then(response => {
            console.log('Direct API test response status:', response.status);
            return response.json();
        })
        .then(data => console.log('Direct API test data:', data))
        .catch(error => console.error('API test failed:', error));
}

// Make functions available globally IMMEDIATELY (not just after loading)
window.routes = routes;
window.getRoute = getRoute;
window.loadRoutes = loadRoutes;
window.waitForRoutes = waitForRoutes;
window.debugRoutes = debugRoutes;

// Auto-load routes when script loads
console.log("Auto-loading routes...");
loadRoutes().then(() => {
    console.log("Auto-load completed, routes available:", routes.length);
}).catch(error => {
    console.error("Auto-load failed:", error);
});