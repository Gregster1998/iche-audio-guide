console.log("=== WELCOME.JS STARTED - DATABASE VERSION ===");

const userNameInput = document.getElementById("userName");
const userCitySelect = document.getElementById("userCity");
const startAppBtn = document.getElementById("startApp");

console.log("Elements found:", {
  userNameInput: !!userNameInput,
  userCitySelect: !!userCitySelect, 
  startAppBtn: !!startAppBtn
});

// Load cities from database instead of cities.js
async function loadCitiesFromDatabase() {
  console.log("=== LOADING CITIES FROM DATABASE ===");
  
  try {
    // Try multiple endpoints to find working one
    const endpoints = [
      `${window.location.origin}/api/cities`,
      'http://localhost:3001/api/cities'
    ];
    
    let cities = null;
    let workingEndpoint = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing cities endpoint: ${endpoint}`);
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Cities data received from ${endpoint}:`, data);
          
          if (data && Array.isArray(data) && data.length > 0) {
            cities = data;
            workingEndpoint = endpoint;
            console.log(`✅ Working cities endpoint found: ${endpoint}`);
            break;
          } else if (data && Array.isArray(data)) {
            console.log(`⚠️ Endpoint ${endpoint} returned empty array`);
          }
        }
      } catch (error) {
        console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
      }
    }
    
    if (!cities || cities.length === 0) {
      console.error('❌ No cities found in database');
      
      // Fallback to hardcoded cities if database fails
      cities = [
        { name: 'Milan', country: 'Italy' },
        { name: 'Vienna', country: 'Austria' },
        { name: 'Rome', country: 'Italy' },
        { name: 'Paris', country: 'France' }
      ];
      console.log('Using fallback cities:', cities);
    }

    console.log(`📋 Available cities: ${cities.length}`);
    
    // Clear existing options first
    userCitySelect.innerHTML = '<option value="">Which city are you exploring?</option>';
    
    // Populate the select dropdown with cities from database
    cities.forEach(city => {
      const option = document.createElement("option");
      option.value = city.name;
      option.textContent = city.country ? `${city.name}, ${city.country}` : city.name;
      userCitySelect.appendChild(option);
      console.log(`➕ Added city: ${city.name} (${city.country || 'No country'})`);
    });
    
    console.log(`✅ Successfully loaded ${cities.length} cities from database`);
    
    // Verify the options were added
    const addedOptions = [...userCitySelect.options].map(opt => opt.value).filter(val => val !== "");
    console.log("🎯 Final cities in dropdown:", addedOptions);
    
    return cities;
    
  } catch (error) {
    console.error('❌ Error loading cities from database:', error);
    
    // Show error message to user
    userCitySelect.innerHTML = `
      <option value="">Error loading cities - please refresh</option>
      <option value="Milan">Milan (fallback)</option>
      <option value="Vienna">Vienna (fallback)</option>
    `;
    
    throw error;
  }
}

// Initialize cities when page loads - DATABASE VERSION
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🔄 DOM loaded, starting database city initialization...");
  
  try {
    await loadCitiesFromDatabase();
    console.log('✅ Cities loaded successfully from database');
  } catch (error) {
    console.error('❌ Failed to load cities from database:', error);
    // Error handling already done in loadCitiesFromDatabase
  }
});

// Handle start button click - ENHANCED VERSION
startAppBtn.addEventListener("click", async () => {
  const name = userNameInput.value.trim();
  const city = userCitySelect.value;

  console.log("🎯 Start button clicked:");
  console.log("  - Raw name input:", `"${userNameInput.value}"`);
  console.log("  - Trimmed name:", `"${name}"`);
  console.log("  - Selected city:", `"${city}"`);
  console.log("  - Name length:", name.length);
  console.log("  - City length:", city.length);

  // Detailed validation
  if (!name || name.length === 0) {
    alert("Please enter your name.");
    console.log("❌ Validation failed: Empty name");
    userNameInput.focus();
    return;
  }

  if (!city || city === "") {
    alert("Please select a city.");
    console.log("❌ Validation failed: No city selected");
    userCitySelect.focus();
    return;
  }

  console.log("✅ Validation passed - proceeding to save data");

  // Check if there are routes available for the selected city
  try {
    console.log(`🔍 Checking routes for ${city}...`);
    const routeCheckEndpoints = [
      `${window.location.origin}/api/routes/city/${encodeURIComponent(city)}`,
      `http://localhost:3001/api/routes/city/${encodeURIComponent(city)}`
    ];
    
    let routesFound = false;
    let routeCount = 0;
    
    for (const endpoint of routeCheckEndpoints) {
      try {
        console.log(`Testing route endpoint: ${endpoint}`);
        const response = await fetch(endpoint);
        console.log(`Route check response status: ${response.status}`);
        
        if (response.ok) {
          const routes = await response.json();
          console.log(`Routes response:`, routes);
          
          if (routes && Array.isArray(routes) && routes.length > 0) {
            routesFound = true;
            routeCount = routes.length;
            console.log(`✅ Found ${routes.length} routes for ${city}`);
            break;
          } else if (routes && Array.isArray(routes)) {
            console.log(`⚠️ Endpoint returned empty array for ${city}`);
          }
        } else {
          const errorText = await response.text();
          console.log(`Route check failed with status ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.log(`Route check failed for ${endpoint}:`, error.message);
      }
    }
    
    if (!routesFound) {
      console.log(`⚠️ No routes found for ${city}`);
      const proceed = confirm(`No audio tours are currently available for ${city}. Would you like to continue anyway? You can always switch cities later in the dashboard.`);
      if (!proceed) {
        return;
      }
    } else {
      console.log(`✅ Route availability confirmed: ${routeCount} routes for ${city}`);
    }
    
  } catch (error) {
    console.log('Route availability check failed:', error);
    // Continue anyway
  }

  // Save to localStorage with extensive logging
  try {
    console.log("💾 Saving to localStorage...");
    
    // Clear any existing data first
    localStorage.removeItem("userName");
    localStorage.removeItem("userCity");
    
    // Save new data
    localStorage.setItem("userName", name);
    localStorage.setItem("userCity", city);
    
    // Immediate verification
    const savedName = localStorage.getItem("userName");
    const savedCity = localStorage.getItem("userCity");
    
    console.log("📊 Save verification:");
    console.log(`  - Original name: "${name}"`);
    console.log(`  - Saved name: "${savedName}"`);
    console.log(`  - Names match: ${savedName === name}`);
    console.log(`  - Original city: "${city}"`);
    console.log(`  - Saved city: "${savedCity}"`);
    console.log(`  - Cities match: ${savedCity === city}`);
    
    if (savedName !== name || savedCity !== city) {
      console.error("❌ Save verification failed!");
      alert("Error saving your data. Please try again.");
      return;
    }
    
    console.log("✅ Save verification passed!");
    
    // Also save additional debug info
    localStorage.setItem("debugTimestamp", new Date().toISOString());
    localStorage.setItem("debugSource", "welcome.js - database version");
    
    console.log("🚀 Redirecting to dashboard.html...");
    
    // Small delay to ensure save completed
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 100);
    
  } catch (error) {
    console.error("❌ Error saving data:", error);
    console.error("Error details:", error.message);
    alert("Error saving your data: " + error.message);
  }
});

// Enhanced debug function
window.debugWelcome = function() {
  console.log("=== WELCOME DEBUG - DATABASE VERSION ===");
  console.log("Database cities loading enabled: TRUE");
  console.log("Select element found:", !!userCitySelect);
  console.log("Current select options:", userCitySelect ? [...userCitySelect.options].map(o => `"${o.value}"`) : "Select not found");
  console.log("Current form values:");
  console.log(`  - Name: "${userNameInput ? userNameInput.value : 'input not found'}"`);
  console.log(`  - City: "${userCitySelect ? userCitySelect.value : 'select not found'}"`);
  console.log("localStorage test:");
  localStorage.setItem("test", "works");
  console.log("  - Can write:", localStorage.getItem("test") === "works");
  localStorage.removeItem("test");
  
  // Show current localStorage content
  console.log("Current localStorage:");
  console.log("  - userName:", localStorage.getItem("userName"));
  console.log("  - userCity:", localStorage.getItem("userCity"));
  console.log("  - debugTimestamp:", localStorage.getItem("debugTimestamp"));
};

// Manual test functions
window.testSaveUserData = function(testName, testCity) {
  console.log(`🧪 Testing save with: "${testName}", "${testCity}"`);
  userNameInput.value = testName || "TestUser";
  userCitySelect.value = testCity || "Milan";
  console.log("Form updated, now click the Start Tour button");
};

// Function to manually reload cities (for testing)
window.reloadCities = async function() {
  console.log("🔄 Manually reloading cities...");
  try {
    await loadCitiesFromDatabase();
    console.log("✅ Cities reloaded successfully");
  } catch (error) {
    console.error("❌ Failed to reload cities:", error);
  }
};

console.log("✅ WELCOME.JS SETUP COMPLETE - DATABASE VERSION");
console.log("💡 Available debug functions: debugWelcome(), testSaveUserData('name', 'city'), reloadCities()");