#!/bin/bash
echo "Starting build process..."

# Check if environment variables are set
if [ -z "$SUPABASE_URL" ]; then
    echo "Warning: SUPABASE_URL not set"
else
    echo "SUPABASE_URL is set"
fi

# Replace placeholders in config.js
if [ -f "config.js" ]; then
    echo "Replacing environment variables in config.js..."
    
    # Use different delimiters to avoid sed conflicts
    sed -i "s|{{SUPABASE_URL}}|${SUPABASE_URL}|g" config.js
    sed -i "s|{{SUPABASE_ANON_KEY}}|${SUPABASE_ANON_KEY}|g" config.js
    sed -i "s|{{KLAVIYO_PUBLIC_KEY}}|${KLAVIYO_PUBLIC_KEY}|g" config.js
    
    echo "Config.js updated successfully"
    
    # Show first few lines of config.js for debugging (without revealing full keys)
    echo "Config.js preview:"
    head -5 config.js
else
    echo "Error: config.js not found!"
fi

echo "Build completed"