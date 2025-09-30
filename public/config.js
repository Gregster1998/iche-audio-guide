// config.js - Dynamic configuration loader
(async function() {
    // Try to load config from server endpoint first
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            window.APP_CONFIG = config;
            console.log('Config loaded from server');
        } else {
            throw new Error('Config endpoint not available');
        }
    } catch (error) {
        console.log('Using fallback config');
        // Fallback for development/testing
        window.APP_CONFIG = {
            // Replace these with your actual values for local development
            SUPABASE_URL: 'https://your-project.supabase.co',
            SUPABASE_ANON_KEY: 'your-anon-key',
            KLAVIYO_PUBLIC_KEY: 'your-klaviyo-key'
        };
    }
    
    // Dispatch event when config is ready
    window.dispatchEvent(new Event('configLoaded'));
})();
// Add this to your server.js to serve config from Render environment variables

// Serve configuration to client (only public keys)
app.get('/api/config', (req, res) => {
    res.json({
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
        KLAVIYO_PUBLIC_KEY: process.env.KLAVIYO_PUBLIC_KEY || ''
    });
});

// Also serve the config.js file dynamically with actual values
app.get('/js/config.js', (req, res) => {
    const configScript = `
// Dynamically generated config from server environment variables
window.APP_CONFIG = {
    SUPABASE_URL: '${process.env.SUPABASE_URL || ''}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || ''}',
    KLAVIYO_PUBLIC_KEY: '${process.env.KLAVIYO_PUBLIC_KEY || ''}'
};

// Mark config as loaded
window.CONFIG_LOADED = true;
console.log('Config loaded from server');
`;
    res.type('application/javascript');
    res.send(configScript);
});