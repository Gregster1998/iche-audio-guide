console.log("=== WELCOME.JS STARTED ===");

const userNameInput = document.getElementById("userName");
const userCitySelect = document.getElementById("userCity");
const startAppBtn = document.getElementById("startApp");

console.log("Elements found:", {
  userNameInput: !!userNameInput,
  userCitySelect: !!userCitySelect, 
  startAppBtn: !!startAppBtn
});

// Load cities from citiesData (provided by cities.js)
function loadCities() {
  console.log("=== LOADING CITIES ===");
  
  // Check if citiesData is available
  if (typeof citiesData === 'undefined') {
    console.error("❌ citiesData not found. cities.js not loaded yet or path incorrect.");
    
    // Retry after a short delay
    console.log("🔄 Retrying in 100ms...");
    setTimeout(loadCities, 100);
    return;
  }

  console.log("✅ citiesData found:", citiesData);

  // Get city names from the data
  const cities = Object.keys(citiesData.cities);
  console.log("📋 Available cities:", cities);
  
  if (cities.length === 0) {
    console.error("❌ No cities found in citiesData");
    return;
  }

  // Clear existing options first
  userCitySelect.innerHTML = '<option value="">Which city are you exploring?</option>';
  
  // Populate the select dropdown
  cities.forEach(city => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    userCitySelect.appendChild(option);
    console.log(`➕ Added city: ${city}`);
  });
  
  console.log(`✅ Successfully loaded ${cities.length} cities into dropdown`);
  
  // Verify the options were added
  const addedOptions = [...userCitySelect.options].map(opt => opt.value).filter(val => val !== "");
  console.log("🎯 Final cities in dropdown:", addedOptions);
}

// Initialize cities when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 DOM loaded, starting city initialization...");
  
  // Try to load cities immediately
  if (typeof citiesData !== 'undefined') {
    console.log("Strategy 1: citiesData already available");
    loadCities();
  } else {
    console.log("Strategy 2: Waiting for citiesData...");
    // Wait a bit and try again
    setTimeout(() => {
      if (typeof citiesData !== 'undefined') {
        loadCities();
      } else {
        console.error("❌ citiesData still not available after waiting");
        alert("Error loading city data. Please refresh the page.");
      }
    }, 500);
  }
});

// Handle start button click - ENHANCED VERSION
startAppBtn.addEventListener("click", () => {
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
    alert("Bitte gib deinen Namen ein.");
    console.log("❌ Validation failed: Empty name");
    userNameInput.focus();
    return;
  }

  if (!city || city === "") {
    alert("Bitte wähle eine Stadt aus.");
    console.log("❌ Validation failed: No city selected");
    userCitySelect.focus();
    return;
  }

  console.log("✅ Validation passed - proceeding to save data");

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
      alert("Fehler beim Speichern der Daten. Bitte versuche es erneut.");
      return;
    }
    
    console.log("✅ Save verification passed!");
    
    // Also save additional debug info
    localStorage.setItem("debugTimestamp", new Date().toISOString());
    localStorage.setItem("debugSource", "welcome.js");
    
    console.log("🚀 Redirecting to dashboard.html...");
    
    // Small delay to ensure save completed
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 100);
    
  } catch (error) {
    console.error("❌ Error saving data:", error);
    console.error("Error details:", error.message);
    alert("Fehler beim Speichern der Daten: " + error.message);
  }
});

// Enhanced debug function
window.debugWelcome = function() {
  console.log("=== WELCOME DEBUG ===");
  console.log("citiesData available:", typeof citiesData !== 'undefined');
  console.log("citiesData content:", typeof citiesData !== 'undefined' ? citiesData : "Not available");
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

console.log("✅ WELCOME.JS SETUP COMPLETE");
console.log("💡 Available debug functions: debugWelcome(), testSaveUserData('name', 'city')");