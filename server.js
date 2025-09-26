// Simple routes.js that fetches from CMS API
console.log("Loading routes from CMS...");

let routes = [];
let isLoaded = false;

// Load routes from CMS API
async function loadRoutes() {
    try {
        console.log("Fetching routes from CMS API...");
        const response = await fetch('http://localhost:3001/api/app/routes');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("API Response:", data);
        
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
        routes = []; // Empty array on error
        isLoaded = true;
        return routes;
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

// Make functions available globally
if (typeof window !== 'undefined') {
    window.routes = routes;
    window.getRoute = getRoute;
    window.loadRoutes = loadRoutes;
    window.waitForRoutes = waitForRoutes;
    window.debugRoutes = debugRoutes;
}

// Auto-load routes when script loads
loadRoutes();