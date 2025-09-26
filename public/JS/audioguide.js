// audioguide.js - Simplified and fixed version
console.log("Loading audioguide...");

// Global variables
let map;
let currentRoute = null;
let currentPointIndex = 0;
let audioElement;
let userLocation = null;

// Utility function to format time
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Get route ID from URL
function getRouteIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('route');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Audioguide DOM loaded");
    initializeAudioguide();
});

async function initializeAudioguide() {
    try {
        // Get route ID
        const routeId = getRouteIdFromURL();
        console.log("Route ID:", routeId);
        
        if (!routeId) {
            showError("No route selected");
            setTimeout(() => goBack(), 2000);
            return;
        }

        // Wait a bit for routes.js to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to get route from global routes variable
        if (typeof routes !== 'undefined' && routes.length > 0) {
            currentRoute = routes.find(r => r.id === routeId);
        }
        
        // If not found, try to load directly from API
        if (!currentRoute) {
            await loadRouteFromAPI(routeId);
        }
        
        if (!currentRoute) {
            showError("Route not found");
            setTimeout(() => goBack(), 2000);
            return;
        }
        
        console.log("Route loaded:", currentRoute.name);
        
        // Initialize components
        setupUI();
        initializeMap();
        initializeAudio();
        requestLocation();
        
    } catch (error) {
        console.error("Error initializing audioguide:", error);
        showError("Failed to load tour");
    }
}

// Load route directly from API
async function loadRouteFromAPI(routeId) {
    try {
        const response = await fetch('/api/app/routes');
        const allRoutes = await response.json();
        currentRoute = allRoutes.find(r => r.id === routeId);
    } catch (error) {
        console.error("Failed to load route from API:", error);
    }
}

// Setup UI with route info
function setupUI() {
    // Update title
    const titleElement = document.getElementById('routeTitle');
    if (titleElement) {
        titleElement.textContent = currentRoute.name;
    }
    
    // Update audio info
    const audioTitle = document.getElementById('audioTitle');
    const audioLocation = document.getElementById('audioLocation');
    
    if (audioTitle) audioTitle.textContent = currentRoute.name;
    if (audioLocation) audioLocation.textContent = `${currentRoute.points?.length || 0} stops to explore`;
    
    // Generate info cards
    if (typeof window.updateInfoCards === 'function') {
        window.updateInfoCards(currentRoute);
    }
}

// Initialize map
function initializeMap() {
    try {
        console.log("Initializing map...");
        
        if (!currentRoute.points || currentRoute.points.length === 0) {
            throw new Error("No route points available");
        }
        
        // Get first point coordinates
        const firstPoint = currentRoute.points[0];
        const lat = firstPoint.coordinates[1]; // Latitude
        const lng = firstPoint.coordinates[0]; // Longitude
        
        console.log("Map center:", lat, lng);
        
        // Initialize map
        map = L.map('map').setView([lat, lng], 15);
        
        // Add tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Add markers for each point
        currentRoute.points.forEach((point, index) => {
            const marker = L.marker([point.coordinates[1], point.coordinates[0]])
                .addTo(map)
                .bindPopup(`<b>${point.name}</b><br/>${point.description}`);
                
            // Open first marker popup
            if (index === 0) {
                marker.openPopup();
            }
        });
        
        // Fit bounds to show all markers
        if (currentRoute.points.length > 1) {
            const bounds = L.latLngBounds(
                currentRoute.points.map(p => [p.coordinates[1], p.coordinates[0]])
            );
            map.fitBounds(bounds, {padding: [20, 20]});
        }
        
        updateLocationStatus("Map loaded successfully", "success");
        
    } catch (error) {
        console.error("Map initialization error:", error);
        updateLocationStatus("Map failed to load", "error");
        
        // Hide map if it failed
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.height = '200px';
            mapContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Map unavailable</div>';
        }
    }
}

// Initialize audio player
function initializeAudio() {
    audioElement = document.getElementById('audioElement');
    
    if (!audioElement) {
        console.error("Audio element not found");
        return;
    }
    
    // Audio event listeners
    audioElement.addEventListener('loadedmetadata', updateTimeDisplay);
    audioElement.addEventListener('timeupdate', () => {
        updateTimeDisplay();
        updateProgressBar();
    });
    audioElement.addEventListener('ended', handleAudioEnd);
    
    // Setup controls
    setupControls();
    
    // Load first audio
    if (currentRoute.points && currentRoute.points.length > 0) {
        loadPointAudio(0);
    }
}

// Setup control buttons
function setupControls() {
    const playBtn = document.getElementById('playBtn');
    const rewindBtn = document.getElementById('rewindBtn');
    const backwardBtn = document.getElementById('backwardBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (playBtn) {
        playBtn.onclick = togglePlayPause;
    }
    if (rewindBtn) {
        rewindBtn.onclick = () => {
            if (audioElement) {
                audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
            }
        };
    }
    if (backwardBtn) {
        backwardBtn.onclick = previousPoint;
    }
    if (forwardBtn) {
        forwardBtn.onclick = nextPoint;
    }
    if (refreshBtn) {
        refreshBtn.onclick = requestLocation;
    }
}

// Load audio for specific point
function loadPointAudio(pointIndex) {
    const point = currentRoute.points[pointIndex];
    if (!point) return;
    
    currentPointIndex = pointIndex;
    
    // Update audio info
    const audioTitle = document.getElementById('audioTitle');
    const audioLocation = document.getElementById('audioLocation');
    
    if (audioTitle) audioTitle.textContent = point.name;
    if (audioLocation) audioLocation.textContent = point.description;
    
    // Load audio file
    if (audioElement && point.audioFile) {
        const audioUrl = currentRoute.audioFolder + point.audioFile;
        audioElement.src = audioUrl;
        console.log("Loading audio:", audioUrl);
    }
    
    // Update active card
    if (typeof window.setActiveCard === 'function') {
        window.setActiveCard(pointIndex);
    }
}

// Function to play specific point audio (called from HTML)
function playPointAudio(pointIndex) {
    loadPointAudio(pointIndex);
    updateMapFocus();
    
    if (audioElement) {
        setTimeout(() => {
            audioElement.play();
            const playBtn = document.getElementById('playBtn');
            if (playBtn) playBtn.textContent = '⏸';
        }, 500);
    }
}

// Player controls
function togglePlayPause() {
    if (!audioElement) return;
    
    const playBtn = document.getElementById('playBtn');
    
    if (audioElement.paused) {
        audioElement.play();
        if (playBtn) playBtn.textContent = '⏸';
    } else {
        audioElement.pause();
        if (playBtn) playBtn.textContent = '▶';
    }
}

function previousPoint() {
    if (currentPointIndex > 0) {
        loadPointAudio(currentPointIndex - 1);
        updateMapFocus();
    }
}

function nextPoint() {
    if (currentPointIndex < currentRoute.points.length - 1) {
        loadPointAudio(currentPointIndex + 1);
        updateMapFocus();
    }
}

function handleAudioEnd() {
    // Auto advance to next point
    if (currentPointIndex < currentRoute.points.length - 1) {
        setTimeout(nextPoint, 2000);
    }
}

// Update time displays
function updateTimeDisplay() {
    if (!audioElement) return;
    
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');
    
    if (currentTime) {
        currentTime.textContent = formatTime(audioElement.currentTime);
    }
    if (totalTime) {
        totalTime.textContent = formatTime(audioElement.duration || 0);
    }
}

// Update progress bar
function updateProgressBar() {
    if (!audioElement) return;
    
    const progressFill = document.getElementById('progressFill');
    if (progressFill && audioElement.duration > 0) {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressFill.style.width = progress + '%';
    }
}

// Update map focus to current point
function updateMapFocus() {
    if (map && currentRoute.points[currentPointIndex]) {
        const point = currentRoute.points[currentPointIndex];
        const lat = point.coordinates[1];
        const lng = point.coordinates[0];
        
        map.setView([lat, lng], 16);
        
        // Find and open popup for current point
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                const markerPos = layer.getLatLng();
                if (Math.abs(markerPos.lat - lat) < 0.0001 && Math.abs(markerPos.lng - lng) < 0.0001) {
                    layer.openPopup();
                }
            }
        });
    }
}

// Location handling
function requestLocation() {
    updateLocationStatus("Getting your location...", "info");
    
    if (!navigator.geolocation) {
        updateLocationStatus("Location not supported", "error");
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            console.log("User location:", userLocation);
            updateLocationStatus("Location found", "success");
            
            // Add user marker to map
            if (map) {
                if (window.userMarker) {
                    map.removeLayer(window.userMarker);
                }
                
                window.userMarker = L.marker([userLocation.lat, userLocation.lng])
                    .addTo(map)
                    .bindPopup("You are here")
                    .setIcon(L.divIcon({
                        className: 'user-marker',
                        html: '📍',
                        iconSize: [30, 30]
                    }));
            }
            
            // Update distance information in cards
            if (typeof window.updateDistances === 'function') {
                window.updateDistances(userLocation, currentRoute.points);
            }
        },
        (error) => {
            console.error("Location error:", error);
            updateLocationStatus("Location denied", "error");
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

// Update location status
function updateLocationStatus(message, type) {
    const statusElement = document.querySelector('.status-text');
    if (statusElement) {
        statusElement.textContent = message;
    }
    
    const statusIcon = document.querySelector('.status-icon');
    if (statusIcon) {
        statusIcon.textContent = type === 'success' ? '✅' : 
                                type === 'error' ? '❌' : 
                                type === 'info' ? '📍' : '📍';
    }
    
    console.log("Location status:", message);
}

// Utility functions
function showError(message) {
    console.error("Error:", message);
    updateLocationStatus(message, "error");
}

function goBack() {
    window.location.href = 'dashboard.html';
}

console.log("Audioguide script ready");