console.log('Tour details page loaded');

let currentRoute = null;
let routeMap = null;

const LANGUAGES = {
    'en': { name: 'English', flag: '🇬🇧' },
    'de': { name: 'Deutsch', flag: '🇩🇪' }
};

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const routeId = urlParams.get('route');
    
    if (!routeId) {
        showError('No route specified');
        return;
    }
    
    try {
        await loadTourDetails(routeId);
    } catch (error) {
        console.error('Error loading tour:', error);
        showError('Failed to load tour details');
    }
});

async function loadTourDetails(routeId) {
    console.log('Loading tour for:', routeId);
    
    try {
        const endpoints = [
            `${window.location.origin}/api/routes`,
            'http://localhost:3001/api/routes'
        ];
        
        let route = null;
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (response.ok) {
                    const routes = await response.json();
                    route = routes.find(r => r.id === routeId || r.route_id === routeId);
                    if (route) break;
                }
            } catch (error) {
                console.log(`Endpoint failed:`, error.message);
            }
        }
        
        if (!route) throw new Error('Route not found');
        
        currentRoute = route;
        populateTourDetails(route);
        
    } catch (error) {
        throw error;
    }
}

function populateTourDetails(route) {
    const heroSection = document.getElementById('heroSection');
    if (route.imageUrl || route.image_url) {
        const imageUrl = route.imageUrl || route.image_url;
        const imagePosition = route.imagePosition || route.image_position || 'center';
        heroSection.style.backgroundImage = `url('${imageUrl}')`;
        heroSection.style.backgroundPosition = imagePosition;
    } else if (route.color) {
        heroSection.style.background = `linear-gradient(135deg, ${route.color} 0%, #1B3A2E 100%)`;
    }
    
    document.getElementById('tourTitle').textContent = route.name;
    document.getElementById('tourCity').textContent = route.city || 'Unknown City';
    document.getElementById('tourCategory').textContent = route.category || 'Tour';
    document.title = `${route.name} - ICHE`;
    
    const rating = route.average_rating || 0;
    const completed = route.completed_count || 0;
    const stops = route.points?.length || 0;
    
    document.getElementById('statRating').textContent = rating.toFixed(1);
    document.getElementById('statCompleted').textContent = completed.toLocaleString();
    document.getElementById('statStops').textContent = stops;
    
    const languages = getAvailableLanguages(route);
    document.getElementById('statLanguages').textContent = languages.length;
    
    document.getElementById('tourDescription').textContent = route.description || 'No description available';
    document.getElementById('tourDuration').textContent = route.estimatedDuration || route.estimated_duration || 'N/A';
    document.getElementById('tourDistance').textContent = route.distance || 'N/A';
    
    const difficultyEl = document.getElementById('tourDifficulty');
    const difficulty = (route.difficulty || 'Easy').toLowerCase();
    difficultyEl.textContent = route.difficulty || 'Easy';
    difficultyEl.className = `detail-value difficulty-badge ${difficulty}`;
    
    populateLanguages(route);
    populateStops(route);
    initializeMap(route);
}

function getAvailableLanguages(route) {
    const languages = [];
    const points = route.points || [];
    
    if (points.some(p => p.audioFile_en || p.audio_file_en || p.audioFile)) {
        languages.push('en');
    }
    
    if (points.some(p => p.audioFile_de || p.audio_file_de)) {
        languages.push('de');
    }
    
    return languages;
}

function populateLanguages(route) {
    const container = document.getElementById('languagesGrid');
    const availableLanguages = getAvailableLanguages(route);
    
    const languagesHTML = Object.entries(LANGUAGES).map(([code, lang]) => {
        const isAvailable = availableLanguages.includes(code);
        return `
            <div class="language-badge ${isAvailable ? 'available' : ''}">
                <div class="flag">${lang.flag}</div>
                <div class="name">${lang.name}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = languagesHTML;
}

function populateStops(route) {
    const container = document.getElementById('stopsContainer');
    const points = route.points || [];
    
    if (points.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.6);">No stops available</p>';
        return;
    }
    
    const stopsHTML = points.map((point, index) => {
        const hasEnglish = point.audioFile_en || point.audio_file_en || point.audioFile;
        const hasGerman = point.audioFile_de || point.audio_file_de;
        
        return `
            <div class="stop-card">
                <div class="stop-header">
                    <div class="stop-number">${index + 1}</div>
                    <div class="stop-info">
                        <div class="stop-name">${point.name || 'Unnamed Stop'}</div>
                        <div class="stop-description">${point.description || 'No description'}</div>
                    </div>
                </div>
                ${point.imageUrl || point.image_url ? `
                    <img src="${point.imageUrl || point.image_url}" alt="${point.name}" class="stop-image">
                ` : ''}
                <div class="stop-footer">
                    <div class="stop-audio-badge ${hasEnglish ? '' : 'unavailable'}">
                        🇬🇧 ${hasEnglish ? 'Available' : 'Unavailable'}
                    </div>
                    <div class="stop-audio-badge ${hasGerman ? '' : 'unavailable'}">
                        🇩🇪 ${hasGerman ? 'Available' : 'Unavailable'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = stopsHTML;
}

function initializeMap(route) {
    const mapElement = document.getElementById('routeMap');
    const points = route.points || [];
    
    if (points.length === 0 || !points[0].coordinates) {
        mapElement.innerHTML = '<p style="text-align:center;padding:2rem;color:rgba(255,255,255,0.6);">No route data available</p>';
        return;
    }
    
    const coordinates = points
        .filter(p => p.coordinates)
        .map(p => [p.coordinates[1], p.coordinates[0]]);
    
    if (routeMap) {
        routeMap.remove();
    }
    
    const bounds = L.latLngBounds(coordinates);
    routeMap = L.map('routeMap').fitBounds(bounds, { padding: [20, 20] });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(routeMap);
    
    points.forEach((point, index) => {
        if (!point.coordinates) return;
        
        const marker = L.marker([point.coordinates[1], point.coordinates[0]], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: ${index === 0 ? '#FF5722' : '#4CAF50'}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">${index + 1}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(routeMap);
        
        marker.bindPopup(`<strong>${point.name}</strong><br>${point.description || ''}`);
    });
    
    if (coordinates.length > 1) {
        L.polyline(coordinates, {
            color: route.color || '#FFD700',
            weight: 4,
            opacity: 0.8
        }).addTo(routeMap);
    }
}

function showError(message) {
    document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem;">
            <div>
                <h2 style="color:#FFD700;margin-bottom:1rem;">Error</h2>
                <p style="color:rgba(255,255,255,0.8);">${message}</p>
                <button onclick="history.back()" style="background:#FFD700;color:#1B3A2E;border:none;padding:1rem 2rem;border-radius:8px;margin-top:2rem;cursor:pointer;font-weight:600;">
                    Go Back
                </button>
            </div>
        </div>
    `;
}

function goBack() {
    window.history.back();
}

function startTour() {
    if (currentRoute) {
        window.location.href = `audioguide.html?route=${currentRoute.id || currentRoute.route_id}`;
    }
}

window.goBack = goBack;
window.startTour = startTour;