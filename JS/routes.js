// Simple routes.js that fetches from CMS API
console.log("Loading routes from CMS...");

let routes = [];
let isLoaded = false;

// At the top of routes.js, update the API URL detection
async function loadRoutes() {
    try {
        console.log("Fetching routes from CMS API...");
        
        // Try the current domain first (works on Render)
        let apiUrl = `${window.location.origin}/api/app/routes`;
        
        // Fallback to localhost for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            apiUrl = 'http://localhost:3001/api/app/routes';
        }
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        // ... rest of your existing code
    } catch (error) {
        // ... rest of your existing code
    }
}

// Get route by ID
function getRoute(routeId) {
    return routes.find(route => route.id === routeId) || null;
}

// Wait for routes to be loaded
function waitForRoutes() {
    return new Promise((resolve) => {
        if (isLoaded) {
            resolve(routes);
        } else {
            window.addEventListener('routesLoaded', (event) => {
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
    fetch('http://localhost:3001/api/app/routes')
        .then(response => response.json())
        .then(data => console.log('Direct API test:', data))
        .catch(error => console.error('API test failed:', error));
}

// Make functions available globally IMMEDIATELY (not just after loading)
window.routes = routes;
window.getRoute = getRoute;
window.loadRoutes = loadRoutes;
window.waitForRoutes = waitForRoutes;
window.debugRoutes = debugRoutes;

// Auto-load routes when script loads
loadRoutes();