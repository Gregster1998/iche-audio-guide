// audioguide.js - ICHE Audio Guide - COMPLETE REWRITE
// Professional-grade implementation with proper route loading and 90% width cards

console.log("=== AUDIO GUIDE STARTING ===");

// Global state management
const AppState = {
  map: null,
  userMarker: null,
  routeMarkers: [],
  routePath: null,
  currentRoute: null,
  currentPoints: [],
  audioElement: null,
  currentPointIndex: 0,
  userLocation: null,
  locationWatchId: null,
  
  // Card swipe state
  cardContainer: null,
  cardWrapper: null,
  isCardsVisible: true,
  isDragging: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  
  // Audio state
  audio: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    currentPointId: null
  }
};

// Wait for DOM and ensure routes are loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, checking routes availability...");
  
  // Robust route loading check
  if (typeof routes !== 'undefined' && Array.isArray(routes) && routes.length > 0) {
    console.log("Routes available immediately");
    initializeAudioGuide();
  } else {
    console.log("Routes not ready, waiting...");
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkRoutes = () => {
      attempts++;
      if (typeof routes !== 'undefined' && Array.isArray(routes) && routes.length > 0) {
        console.log(`Routes loaded after ${attempts} attempts`);
        initializeAudioGuide();
      } else if (attempts >= maxAttempts) {
        console.error("Failed to load routes after maximum attempts");
        showError("Failed to load route data. Please refresh the page.");
      } else {
        setTimeout(checkRoutes, 100);
      }
    };
    
    setTimeout(checkRoutes, 100);
  }
});

// Main initialization function
async function initializeAudioGuide() {
  try {
    console.log("🎧 Initializing Audio Guide...");
    
    // Get route from URL or localStorage
    const selectedRouteId = getSelectedRouteId();
    if (!selectedRouteId) {
      throw new Error("No route selected");
    }
    
    // Load route data
    AppState.currentRoute = getRoute(selectedRouteId);
    if (!AppState.currentRoute) {
      throw new Error(`Route not found: ${selectedRouteId}`);
    }
    
    AppState.currentPoints = AppState.currentRoute.points || [];
    console.log(`✅ Route loaded: ${AppState.currentRoute.name} with ${AppState.currentPoints.length} points`);
    
    // Initialize all components
    updateRouteInfo();
    initializeAudio();
    initializeMap();
    createInfoCards();
    initializeSwipeHandling();
    setupEventListeners();
    startLocationTracking();
    
    console.log("✅ Audio Guide initialized successfully");
    
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    showError(`Failed to initialize: ${error.message}`);
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 3000);
  }
}

// Get selected route ID from URL or localStorage
function getSelectedRouteId() {
  const urlParams = new URLSearchParams(window.location.search);
  const routeFromUrl = urlParams.get('route');
  const routeFromStorage = localStorage.getItem('selectedRoute');
  
  const routeId = routeFromUrl || routeFromStorage;
  console.log(`🔍 Looking for route: URL="${routeFromUrl}", Storage="${routeFromStorage}", Selected="${routeId}"`);
  
  return routeId;
}

// FIXED: Create info cards with proper 90% screen width
function createInfoCards() {
  console.log("🃏 Creating info cards with 90% screen width...");
  
  AppState.cardContainer = document.getElementById('infoCardsContainer');
  AppState.cardWrapper = document.getElementById('infoCardsWrapper');
  
  if (!AppState.cardContainer || !AppState.cardWrapper) {
    console.error("❌ Card elements not found");
    return;
  }
  
  // Clear existing content
  AppState.cardWrapper.innerHTML = '';
  
  const numberOfCards = AppState.currentPoints.length;
  
  // Set wrapper width to accommodate all cards
  // Each card will be 90vw, so total width is numberOfCards * 90vw
  AppState.cardWrapper.style.width = `${numberOfCards * 90}vw`;
  
  // Create cards
  AppState.currentPoints.forEach((point, index) => {
    const card = createSingleCard(point, index, numberOfCards);
    AppState.cardWrapper.appendChild(card);
  });
  
  // Position at first card
  updateCardsPosition();
  
  console.log(`✅ Created ${numberOfCards} cards at 90% screen width`);
}

// Create a single info card
function createSingleCard(point, index, totalCards) {
  const card = document.createElement('div');
  card.className = 'info-card';
  card.dataset.pointIndex = index;
  
  // Each card is exactly 90vw wide
  card.style.width = '90vw';
  card.style.flexShrink = '0';
  
  const cardContent = document.createElement('div');
  cardContent.className = 'card-content';
  
  cardContent.innerHTML = `
    <div class="swipe-handle"></div>
    <div class="stop-header">
      <h3>Stop ${index + 1}</h3>
      <div class="stop-type ${point.type}">${point.type.replace('-', ' ')}</div>
    </div>
    
    <div class="stop-content">
      <div class="stop-location">
        <span class="location-icon">📍</span>
        <span class="location-name">${point.name}</span>
      </div>
      
      <p class="stop-description">${point.description}</p>
      
      ${point.tips ? `<div class="stop-tips">${point.tips}</div>` : ''}
      
      <div class="stop-progress">
        <div class="stop-counter">Stop ${index + 1} of ${totalCards}</div>
        <div class="audio-duration">${formatTime(point.duration || 120)}</div>
      </div>
    </div>
  `;
  
  card.appendChild(cardContent);
  return card;
}

// Initialize swipe handling with proper touch support
function initializeSwipeHandling() {
  console.log("👆 Initializing swipe handling...");
  
  if (!AppState.cardContainer) {
    console.error("❌ Card container not found for swipe handling");
    return;
  }
  
  // Touch events
  AppState.cardContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
  AppState.cardContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  AppState.cardContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  // Mouse events for desktop
  AppState.cardContainer.addEventListener('mousedown', handleMouseStart);
  AppState.cardContainer.addEventListener('mousemove', handleMouseMove);
  AppState.cardContainer.addEventListener('mouseup', handleMouseEnd);
  AppState.cardContainer.addEventListener('mouseleave', handleMouseEnd);
  
  console.log("✅ Swipe handling initialized");
}

// Touch event handlers - FIXED
function handleTouchStart(e) {
  if (!AppState.cardWrapper) return;
  
  AppState.isDragging = true;
  AppState.startX = e.touches[0].clientX;
  AppState.startY = e.touches[0].clientY;
  AppState.currentX = AppState.startX;
  AppState.currentY = AppState.startY;
  
  // Disable transitions during drag
  AppState.cardWrapper.style.transition = 'none';
  
  console.log("Touch start:", AppState.startX, AppState.startY);
}

function handleTouchMove(e) {
  if (!AppState.isDragging || !AppState.cardWrapper) return;
  
  e.preventDefault();
  AppState.currentX = e.touches[0].clientX;
  AppState.currentY = e.touches[0].clientY;
  
  const diffX = AppState.currentX - AppState.startX;
  const diffY = AppState.currentY - AppState.startY;
  
  console.log("Touch move:", diffX, diffY);
  
  // FIXED: Swipe down detection - more sensitive
  if (Math.abs(diffY) > Math.abs(diffX) && diffY > 20) {
    // Vertical swipe DOWN - dismiss cards
    const progress = Math.min(Math.max(diffY / 150, 0), 1);
    AppState.cardContainer.style.transform = `translateX(-50%) translateY(${progress * 100}px)`;
    AppState.cardContainer.style.opacity = 1 - (progress * 0.7);
    
    if (progress > 0.3) {
      AppState.cardContainer.style.filter = 'blur(1px)';
    }
  } else if (Math.abs(diffX) > 20) {
    // Horizontal swipe - navigation
    const currentOffset = -AppState.currentPointIndex * window.innerWidth * 0.9; // 90vw
    const newOffset = currentOffset + diffX;
    
    // Apply bounds
    const maxOffset = 0;
    const minOffset = -(AppState.currentPoints.length - 1) * window.innerWidth * 0.9;
    const boundedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));
    
    AppState.cardWrapper.style.transform = `translateX(${boundedOffset}px)`;
  }
}

function handleTouchEnd(e) {
  if (!AppState.isDragging || !AppState.cardWrapper) return;
  
  AppState.isDragging = false;
  const diffX = AppState.currentX - AppState.startX;
  const diffY = AppState.currentY - AppState.startY;
  
  console.log("Touch end:", diffX, diffY);
  
  // Reset container styling
  AppState.cardContainer.style.transform = 'translateX(-50%)';
  AppState.cardContainer.style.opacity = '1';
  AppState.cardContainer.style.filter = 'none';
  
  // Restore transitions
  AppState.cardWrapper.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  
  // Determine action
  if (Math.abs(diffY) > Math.abs(diffX) && diffY > 60) {
    // Swipe down - dismiss cards
    console.log("📱 Swipe down detected - dismissing cards");
    dismissCards();
    return;
  } else if (Math.abs(diffX) > 80) {
    // Horizontal swipe - navigate
    if (diffX > 80 && AppState.currentPointIndex > 0) {
      // Swipe right - previous
      navigateToCard(AppState.currentPointIndex - 1);
      return;
    } else if (diffX < -80 && AppState.currentPointIndex < AppState.currentPoints.length - 1) {
      // Swipe left - next  
      navigateToCard(AppState.currentPointIndex + 1);
      return;
    }
  }
  
  // Snap back to current position
  updateCardsPosition();
}

// Mouse event handlers (same logic as touch)
function handleMouseStart(e) {
  if (!AppState.cardWrapper) return;
  
  AppState.isDragging = true;
  AppState.startX = e.clientX;
  AppState.startY = e.clientY;
  AppState.currentX = AppState.startX;
  AppState.currentY = AppState.startY;
  
  AppState.cardWrapper.style.transition = 'none';
  e.preventDefault();
}

function handleMouseMove(e) {
  if (!AppState.isDragging || !AppState.cardWrapper) return;
  
  AppState.currentX = e.clientX;
  AppState.currentY = e.clientY;
  
  const diffX = AppState.currentX - AppState.startX;
  const diffY = AppState.currentY - AppState.startY;
  
  if (Math.abs(diffY) > Math.abs(diffX) && diffY > 20) {
    const progress = Math.min(Math.max(diffY / 150, 0), 1);
    AppState.cardContainer.style.transform = `translateX(-50%) translateY(${progress * 100}px)`;
    AppState.cardContainer.style.opacity = 1 - (progress * 0.7);
    
    if (progress > 0.3) {
      AppState.cardContainer.style.filter = 'blur(1px)';
    }
  } else if (Math.abs(diffX) > 20) {
    const currentOffset = -AppState.currentPointIndex * window.innerWidth * 0.9;
    const newOffset = currentOffset + diffX;
    
    const maxOffset = 0;
    const minOffset = -(AppState.currentPoints.length - 1) * window.innerWidth * 0.9;
    const boundedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));
    
    AppState.cardWrapper.style.transform = `translateX(${boundedOffset}px)`;
  }
}

function handleMouseEnd(e) {
  if (!AppState.isDragging || !AppState.cardWrapper) return;
  
  AppState.isDragging = false;
  const diffX = AppState.currentX - AppState.startX;
  const diffY = AppState.currentY - AppState.startY;
  
  AppState.cardContainer.style.transform = 'translateX(-50%)';
  AppState.cardContainer.style.opacity = '1';
  AppState.cardContainer.style.filter = 'none';
  
  AppState.cardWrapper.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  
  if (Math.abs(diffY) > Math.abs(diffX) && diffY > 60) {
    console.log("🖱️ Mouse drag down detected - dismissing cards");
    dismissCards();
    return;
  } else if (Math.abs(diffX) > 80) {
    if (diffX > 80 && AppState.currentPointIndex > 0) {
      navigateToCard(AppState.currentPointIndex - 1);
      return;
    } else if (diffX < -80 && AppState.currentPointIndex < AppState.currentPoints.length - 1) {
      navigateToCard(AppState.currentPointIndex + 1);
      return;
    }
  }
  
  updateCardsPosition();
}

// FIXED: Update cards position using 90vw width
function updateCardsPosition() {
  if (!AppState.cardWrapper) return;
  
  // Each card is 90vw wide, so translate by currentIndex * 90vw
  const translateX = -AppState.currentPointIndex * window.innerWidth * 0.9;
  AppState.cardWrapper.style.transform = `translateX(${translateX}px)`;
  
  // Ensure smooth transitions when not dragging
  if (!AppState.isDragging) {
    AppState.cardWrapper.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }
  
  console.log(`📱 Positioned cards at index ${AppState.currentPointIndex}, translateX: ${translateX}px`);
}

// Navigate to specific card
function navigateToCard(index) {
  if (index < 0 || index >= AppState.currentPoints.length || index === AppState.currentPointIndex) {
    return;
  }
  
  console.log(`🧭 Navigating to card ${index + 1}: ${AppState.currentPoints[index].name}`);
  
  AppState.currentPointIndex = index;
  updateCardsPosition();
  
  const point = AppState.currentPoints[index];
  updateAudioInfo(point.name, `${point.type.replace('-', ' ')} • ${formatTime(point.duration || 120)}`);
  
  // Update map view
  const [lng, lat] = point.coordinates;
  if (AppState.map) {
    AppState.map.setView([lat, lng], 16, { animate: true });
  }
  
  updateMapMarkers();
}

// ENHANCED: Dismiss cards with smooth animation
function dismissCards() {
  console.log("👋 Dismissing info cards");
  
  if (!AppState.cardContainer) return;
  
  AppState.cardContainer.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  AppState.cardContainer.style.transform = 'translateX(-50%) translateY(150%)';
  AppState.cardContainer.style.opacity = '0';
  
  setTimeout(() => {
    AppState.cardContainer.classList.add('hidden');
    AppState.isCardsVisible = false;
  }, 400);
}

// Show cards with animation
function showCards() {
  console.log("👋 Showing info cards");
  
  if (!AppState.cardContainer) return;
  
  AppState.cardContainer.classList.remove('hidden');
  AppState.cardContainer.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  AppState.cardContainer.style.transform = 'translateX(-50%) translateY(0)';
  AppState.cardContainer.style.opacity = '1';
  
  AppState.isCardsVisible = true;
  setTimeout(updateCardsPosition, 100);
}

// Initialize map
function initializeMap() {
  console.log("🗺️ Initializing map...");
  
  try {
    const bounds = calculateRouteBounds();
    const center = [(bounds.north + bounds.south) / 2, (bounds.east + bounds.west) / 2];
    
    AppState.map = L.map('map', {
      center: center,
      zoom: 14,
      zoomControl: true,
      attributionControl: false
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(AppState.map);
    
    addRouteToMap();
    
    AppState.map.fitBounds([
      [bounds.south, bounds.west],
      [bounds.north, bounds.east]
    ], { padding: [50, 50] });
    
    console.log("✅ Map initialized");
    
  } catch (error) {
    console.error("❌ Map initialization failed:", error);
    showError("Map could not be loaded");
  }
}

// Calculate route bounds
function calculateRouteBounds() {
  let north = -90, south = 90, east = -180, west = 180;
  
  AppState.currentPoints.forEach(point => {
    const [lng, lat] = point.coordinates;
    if (lat > north) north = lat;
    if (lat < south) south = lat;
    if (lng > east) east = lng;
    if (lng < west) west = lng;
  });
  
  return { north, south, east, west };
}

// Add route to map
function addRouteToMap() {
  // Clear existing markers
  AppState.routeMarkers.forEach(marker => {
    if (AppState.map.hasLayer(marker)) {
      AppState.map.removeLayer(marker);
    }
  });
  AppState.routeMarkers = [];
  
  // Clear existing path
  if (AppState.routePath && AppState.map.hasLayer(AppState.routePath)) {
    AppState.map.removeLayer(AppState.routePath);
  }
  
  // Create path
  const pathCoordinates = AppState.currentPoints.map(point => {
    const [lng, lat] = point.coordinates;
    return [lat, lng];
  });
  
  if (pathCoordinates.length > 1) {
    AppState.routePath = L.polyline(pathCoordinates, {
      color: AppState.currentRoute.color || '#FFD700',
      weight: 4,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(AppState.map);
  }
  
  // Create markers
  AppState.currentPoints.forEach((point, index) => {
    const [lng, lat] = point.coordinates;
    const marker = createPointMarker(point, index, lat, lng);
    marker.addTo(AppState.map);
    AppState.routeMarkers.push(marker);
  });
  
  console.log(`✅ Added route with ${AppState.routeMarkers.length} markers`);
}

// Create point marker
function createPointMarker(point, index, lat, lng) {
  const isActive = index === AppState.currentPointIndex;
  const isCompleted = index < AppState.currentPointIndex;
  
  const marker = L.marker([lat, lng], {
    icon: createPointIcon(point, index, isActive, isCompleted)
  });
  
  const popupContent = createPopupContent(point, index);
  marker.bindPopup(popupContent);
  
  marker.on('click', () => {
    navigateToCard(index);
    if (!AppState.isCardsVisible) {
      showCards();
    }
  });
  
  return marker;
}

// Create point icon
function createPointIcon(point, index, isActive = false, isCompleted = false) {
  const size = isActive ? 30 : 26;
  let className = `route-marker ${point.type}`;
  
  if (isActive) className += ' active';
  if (isCompleted) className += ' completed';
  
  return L.divIcon({
    className: 'custom-point-marker',
    html: `<div class="${className}" style="width: ${size}px; height: ${size}px; font-size: ${size > 26 ? '14px' : '12px'};">${index + 1}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
}

// Create popup content
function createPopupContent(point, index) {
  return `
    <div style="min-width: 200px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #FFD700; font-size: 16px;">${point.name}</strong>
        <span style="background: rgba(255,215,0,0.2); color: #FFD700; padding: 3px 8px; border-radius: 8px; font-size: 10px; text-transform: uppercase;">${point.type}</span>
      </div>
      <p style="margin: 8px 0; font-size: 13px; line-height: 1.4; color: rgba(255,255,255,0.9);">${point.description}</p>
      ${point.tips ? `<div style="background: rgba(255,215,0,0.1); border-left: 2px solid #FFD700; padding: 6px 8px; margin: 8px 0; font-size: 12px; border-radius: 0 4px 4px 0;"><strong style="color: #FFD700;">Tip:</strong> ${point.tips}</div>` : ''}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
        <span style="color: rgba(255,255,255,0.7); font-size: 12px;">🎧 ${formatTime(point.duration || 120)}</span>
        <button onclick="playPointAudio(${index})" style="background: #FFD700; color: #000; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">▶ Play</button>
      </div>
    </div>
  `;
}

// Update map markers
function updateMapMarkers() {
  AppState.routeMarkers.forEach((marker, index) => {
    const point = AppState.currentPoints[index];
    const [lng, lat] = point.coordinates;
    const isActive = index === AppState.currentPointIndex;
    const isCompleted = index < AppState.currentPointIndex;
    
    marker.setIcon(createPointIcon(point, index, isActive, isCompleted));
  });
}

// Initialize audio system
function initializeAudio() {
  AppState.audioElement = document.getElementById('audioElement');
  
  if (!AppState.audioElement) {
    console.error("❌ Audio element not found");
    return;
  }
  
  AppState.audioElement.addEventListener('loadedmetadata', updateAudioDuration);
  AppState.audioElement.addEventListener('timeupdate', updateAudioProgress);
  AppState.audioElement.addEventListener('ended', handleAudioEnded);
  AppState.audioElement.addEventListener('error', handleAudioError);
  
  console.log("🎵 Audio system initialized");
}

// Location tracking
function startLocationTracking() {
  console.log("📡 Starting location tracking...");
  
  if (!navigator.geolocation) {
    console.error("❌ Geolocation not supported");
    updateLocationStatus('error', 'GPS not supported');
    return;
  }
  
  updateLocationStatus('searching', 'Locating...');
  
  const options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 2000
  };
  
  navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, options);
  AppState.locationWatchId = navigator.geolocation.watchPosition(handleLocationUpdate, handleLocationError, options);
}

function handleLocationSuccess(position) {
  AppState.userLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy
  };
  
  updateLocationStatus('active', 'Located');
  updateUserMarker();
  checkProximityToPoints();
}

function handleLocationUpdate(position) {
  AppState.userLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy
  };
  
  updateUserMarker();
  checkProximityToPoints();
}

function handleLocationError(error) {
  console.error("❌ Location error:", error);
  updateLocationStatus('error', 'Location unavailable');
}

function updateUserMarker() {
  if (!AppState.userLocation || !AppState.map) return;
  
  const icon = L.divIcon({
    className: 'user-location-marker',
    html: `<div class="user-marker"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  
  if (AppState.userMarker) {
    AppState.userMarker.setLatLng([AppState.userLocation.lat, AppState.userLocation.lng]);
  } else {
    AppState.userMarker = L.marker([AppState.userLocation.lat, AppState.userLocation.lng], { icon })
      .addTo(AppState.map)
      .bindPopup("📍 You are here");
  }
}

function checkProximityToPoints() {
  if (!AppState.userLocation || !AppState.currentPoints.length) return;
  
  AppState.currentPoints.forEach((point, index) => {
    if (typeof isWithinActivationRadius === 'function') {
      const isWithin = isWithinActivationRadius(
        AppState.userLocation, 
        point.coordinates, 
        point.activationRadius || 50
      );
      
      if (isWithin && index !== AppState.currentPointIndex) {
        console.log(`🎯 Entered activation radius for: ${point.name}`);
        navigateToCard(index);
        if (!AppState.isCardsVisible) {
          showCards();
        }
        playPointAudio(index);
        return;
      }
    }
  });
}

// Audio functions
function playPointAudio(pointIndex) {
  if (pointIndex < 0 || pointIndex >= AppState.currentPoints.length) return;
  
  const point = AppState.currentPoints[pointIndex];
  const audioPath = `${AppState.currentRoute.audioFolder || 'audio/'}${point.audioFile || 'default.mp3'}`;
  
  console.log(`🎵 Playing audio for: ${point.name}`);
  
  AppState.audio.currentPointId = point.id;
  AppState.audio.isLoading = true;
  
  AppState.audioElement.src = audioPath;
  AppState.audioElement.load();
  
  const playPromise = AppState.audioElement.play();
  
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        AppState.audio.isPlaying = true;
        AppState.audio.isLoading = false;
        updatePlayButton(true);
        console.log("Audio playback started");
      })
      .catch(error => {
        console.error("Audio playback failed:", error);
        AppState.audio.isLoading = false;
        simulateAudioPlayback(point);
      });
  }
}

// Simulate audio playback for demo
function simulateAudioPlayback(point) {
  console.log("Simulating audio playback for:", point.name);
  
  AppState.audio.isPlaying = true;
  AppState.audio.duration = point.duration || 120;
  AppState.audio.currentTime = 0;
  AppState.audio.isLoading = false;
  
  updatePlayButton(true);
  updateAudioDuration();
  
  const progressInterval = setInterval(() => {
    if (!AppState.audio.isPlaying) {
      clearInterval(progressInterval);
      return;
    }
    
    AppState.audio.currentTime += 1;
    updateAudioProgress();
    
    if (AppState.audio.currentTime >= AppState.audio.duration) {
      clearInterval(progressInterval);
      handleAudioEnded();
    }
  }, 1000);
}

// Setup event listeners
function setupEventListeners() {
  console.log("Setting up event listeners...");
  
  const playBtn = document.getElementById('playBtn');
  const rewindBtn = document.getElementById('rewindBtn');
  const backwardBtn = document.getElementById('backwardBtn');
  const forwardBtn = document.getElementById('forwardBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const progressBar = document.getElementById('progressBar');
  
  if (playBtn) playBtn.addEventListener('click', togglePlayPause);
  if (rewindBtn) rewindBtn.addEventListener('click', () => rewindAudio(10));
  if (backwardBtn) backwardBtn.addEventListener('click', () => {
    if (AppState.currentPointIndex > 0) {
      navigateToCard(AppState.currentPointIndex - 1);
    }
  });
  if (forwardBtn) forwardBtn.addEventListener('click', () => {
    if (AppState.currentPointIndex < AppState.currentPoints.length - 1) {
      navigateToCard(AppState.currentPointIndex + 1);
    }
  });
  if (refreshBtn) refreshBtn.addEventListener('click', refreshLocation);
  if (progressBar) progressBar.addEventListener('click', handleProgressBarClick);
  
  // Double tap to show/hide cards
  let lastTap = 0;
  document.addEventListener('touchend', function(e) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 500 && tapLength > 0) {
      if (AppState.isCardsVisible) {
        dismissCards();
      } else {
        showCards();
      }
      e.preventDefault();
    }
    lastTap = currentTime;
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (AppState.isCardsVisible) {
      setTimeout(updateCardsPosition, 100);
    }
  });
  
  console.log("Event listeners setup complete");
}

// Audio control functions
function togglePlayPause() {
  if (AppState.audio.isLoading) return;
  
  if (AppState.audio.isPlaying) {
    pauseAudio();
  } else {
    if (AppState.audioElement.src) {
      playAudio();
    } else {
      playPointAudio(AppState.currentPointIndex);
    }
  }
}

function playAudio() {
  const playPromise = AppState.audioElement.play();
  
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        AppState.audio.isPlaying = true;
        updatePlayButton(true);
      })
      .catch(error => {
        console.error("Play failed:", error);
      });
  } else {
    AppState.audio.isPlaying = true;
    updatePlayButton(true);
  }
}

function pauseAudio() {
  if (AppState.audioElement.src) {
    AppState.audioElement.pause();
  }
  AppState.audio.isPlaying = false;
  updatePlayButton(false);
}

function rewindAudio(seconds) {
  if (AppState.audioElement.src && AppState.audioElement.currentTime >= seconds) {
    AppState.audioElement.currentTime -= seconds;
  } else if (AppState.audio.currentTime >= seconds) {
    AppState.audio.currentTime -= seconds;
    updateAudioProgress();
  }
}

function refreshLocation() {
  console.log("Refreshing location...");
  updateLocationStatus('searching', 'Refreshing...');
  
  navigator.geolocation.getCurrentPosition(
    handleLocationSuccess,
    handleLocationError,
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// UI Update functions
function updateRouteInfo() {
  const titleElement = document.getElementById('routeTitle');
  if (titleElement) {
    titleElement.textContent = AppState.currentRoute.name;
  }
  
  updateAudioInfo(AppState.currentRoute.name, "Preparing your tour...");
}

function updateLocationStatus(status, text) {
  const statusElement = document.getElementById('locationStatus');
  if (!statusElement) return;
  
  statusElement.className = `location-status ${status}`;
  const statusText = statusElement.querySelector('.status-text');
  if (statusText) {
    statusText.textContent = text;
  }
}

function updatePlayButton(isPlaying) {
  const playBtn = document.getElementById('playBtn');
  if (!playBtn) return;
  
  if (AppState.audio.isLoading) {
    playBtn.textContent = '⏳';
    playBtn.classList.add('loading');
    return;
  }
  
  playBtn.classList.remove('loading');
  
  if (isPlaying) {
    playBtn.textContent = '⏸';
    playBtn.classList.add('playing');
  } else {
    playBtn.textContent = '▶';
    playBtn.classList.remove('playing');
  }
}

function updateAudioInfo(title, location) {
  const titleElement = document.getElementById('audioTitle');
  const locationElement = document.getElementById('audioLocation');
  
  if (titleElement) titleElement.textContent = title;
  if (locationElement) locationElement.textContent = location;
}

function updateAudioDuration() {
  const duration = AppState.audioElement.duration || AppState.audio.duration || 0;
  AppState.audio.duration = duration;
  
  const totalTimeElement = document.getElementById('totalTime');
  if (totalTimeElement) {
    totalTimeElement.textContent = formatTime(duration);
  }
}

function updateAudioProgress() {
  const currentTime = AppState.audioElement.currentTime || AppState.audio.currentTime || 0;
  AppState.audio.currentTime = currentTime;
  
  const currentTimeElement = document.getElementById('currentTime');
  const progressFill = document.getElementById('progressFill');
  
  if (currentTimeElement) {
    currentTimeElement.textContent = formatTime(currentTime);
  }
  
  if (progressFill && AppState.audio.duration > 0) {
    const progress = (currentTime / AppState.audio.duration) * 100;
    progressFill.style.width = `${progress}%`;
  }
}

function handleProgressBarClick(e) {
  if (!AppState.audio.duration) return;
  
  const progressBar = e.currentTarget;
  const rect = progressBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const clickPercent = clickX / width;
  
  const newTime = clickPercent * AppState.audio.duration;
  
  if (AppState.audioElement.src && AppState.audioElement.duration) {
    AppState.audioElement.currentTime = newTime;
  } else {
    AppState.audio.currentTime = newTime;
    updateAudioProgress();
  }
}

function handleAudioEnded() {
  console.log("Audio ended");
  AppState.audio.isPlaying = false;
  updatePlayButton(false);
  
  setTimeout(() => {
    if (AppState.currentPointIndex < AppState.currentPoints.length - 1) {
      navigateToCard(AppState.currentPointIndex + 1);
    } else {
      showCompletionMessage();
    }
  }, 3000);
}

function handleAudioError(error) {
  console.error("Audio error:", error);
  AppState.audio.isPlaying = false;
  AppState.audio.isLoading = false;
  updatePlayButton(false);
  
  if (AppState.currentPointIndex >= 0) {
    setTimeout(() => {
      simulateAudioPlayback(AppState.currentPoints[AppState.currentPointIndex]);
    }, 1000);
  }
}

function showCompletionMessage() {
  console.log("Tour completed!");
  updateAudioInfo("Tour Complete!", "Congratulations on finishing your audio tour!");
}

// Utility functions
function showError(message) {
  console.error("Error:", message);
  alert(message);
}

// Navigation function
function goBack() {
  console.log("Going back to dashboard");
  
  if (AppState.locationWatchId) {
    navigator.geolocation.clearWatch(AppState.locationWatchId);
  }
  
  if (AppState.audioElement) {
    AppState.audioElement.pause();
  }
  
  window.location.href = 'dashboard.html';
}

// Global functions for popup buttons
window.playPointAudio = playPointAudio;

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  if (AppState.locationWatchId) {
    navigator.geolocation.clearWatch(AppState.locationWatchId);
  }
  
  if (AppState.audioElement) {
    AppState.audioElement.pause();
  }
});

console.log("Audio Guide script loaded successfully");
  