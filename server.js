const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY;

console.log('=== SERVER STARTUP ===');
console.log('Node ENV:', process.env.NODE_ENV || 'development');
console.log('Port:', PORT);
console.log('Supabase URL configured:', !!supabaseUrl);
console.log('Supabase Service Key configured:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ MISSING SUPABASE CONFIGURATION');
    console.error('Please set these environment variables in Render:');
    console.error('- SUPABASE_URL: Your Supabase project URL');
    console.error('- SERVICE_ROLE_KEY: Your Supabase service role key');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('✅ Supabase client initialized');

// Create local upload directories for fallback
const createDirectories = () => {
    const dirs = [
        path.join(__dirname, 'public', 'uploads'),
        path.join(__dirname, 'public', 'uploads', 'audio'),
        path.join(__dirname, 'public', 'uploads', 'images')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log('Created directory:', dir);
        }
    });
};

createDirectories();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        console.log('File upload attempt:', {
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype
        });
        
        if (file.fieldname === 'audio') {
            if (file.mimetype.startsWith('audio/')) {
                cb(null, true);
            } else {
                cb(new Error('Only audio files are allowed for audio uploads'), false);
            }
        } else if (file.fieldname === 'image') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed for image uploads'), false);
            }
        } else {
            cb(null, true);
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration endpoint
app.get('/api/config', (req, res) => {
    res.json({
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
        KLAVIYO_PUBLIC_KEY: process.env.KLAVIYO_PUBLIC_KEY || ''
    });
});

// Serve config.js with actual values
app.get('/config.js', (req, res) => {
    const configScript = `
window.APP_CONFIG = {
    SUPABASE_URL: '${process.env.SUPABASE_URL || ''}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || ''}',
    KLAVIYO_PUBLIC_KEY: '${process.env.KLAVIYO_PUBLIC_KEY || ''}'
};
window.CONFIG_LOADED = true;
console.log('✅ Config loaded from server');
    `;
    res.type('application/javascript');
    res.send(configScript);
});

// Helper function to generate unique filename
function generateUniqueFilename(originalname, fieldname) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = path.extname(originalname);
    return `${fieldname}-${timestamp}-${random}${ext}`;
}

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('routes')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Supabase connection test failed:', error.message);
            return false;
        }
        
        console.log('✅ Supabase connection test successful');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection error:', error.message);
        return false;
    }
}

// FILE UPLOAD ENDPOINTS - FIXED VERSION
app.post('/api/upload/audio', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const filename = generateUniqueFilename(req.file.originalname, 'audio');
        
        console.log('=== AUDIO UPLOAD ATTEMPT ===');
        console.log('Filename:', filename);
        console.log('Size:', req.file.size);
        console.log('MIME:', req.file.mimetype);
        
        try {
            const { data, error } = await supabase.storage
                .from('audio-files')
                .upload(filename, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (error) {
                console.error('❌ Supabase audio upload error:', error.message);
                console.error('Error details:', JSON.stringify(error, null, 2));
                throw error;
            }

            const { data: urlData } = supabase.storage
                .from('audio-files')
                .getPublicUrl(filename);

            const response = {
                success: true,
                filename: filename,
                url: urlData.publicUrl,
                originalName: req.file.originalname,
                size: req.file.size,
                storage: 'supabase'
            };

            console.log('✅ Audio uploaded to Supabase successfully:', urlData.publicUrl);
            res.json(response);

        } catch (supabaseError) {
            console.error('❌ Supabase audio upload failed, using local storage');
            console.error('Error:', supabaseError.message);
            
            const localPath = path.join(__dirname, 'public', 'uploads', 'audio', filename);
            fs.writeFileSync(localPath, req.file.buffer);
            
            const response = {
                success: true,
                filename: filename,
                url: `/uploads/audio/${filename}`,
                originalName: req.file.originalname,
                size: req.file.size,
                storage: 'local',
                warning: 'Supabase upload failed: ' + supabaseError.message
            };

            console.log('⚠️ Audio uploaded locally (fallback):', filename);
            res.json(response);
        }

    } catch (error) {
        console.error('Audio upload error:', error);
        res.status(500).json({ error: 'Failed to upload audio file: ' + error.message });
    }
});

app.post('/api/upload/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        const filename = generateUniqueFilename(req.file.originalname, 'image');
        
        console.log('=== IMAGE UPLOAD ATTEMPT ===');
        console.log('Filename:', filename);
        console.log('Size:', req.file.size);
        console.log('MIME:', req.file.mimetype);
        
        try {
            const { data, error } = await supabase.storage
                .from('images')
                .upload(filename, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (error) {
                console.error('❌ Supabase image upload error:', error.message);
                console.error('Error details:', JSON.stringify(error, null, 2));
                throw error;
            }

            const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(filename);

            const response = {
                success: true,
                filename: filename,
                url: urlData.publicUrl,
                originalName: req.file.originalname,
                size: req.file.size,
                storage: 'supabase'
            };

            console.log('✅ Image uploaded to Supabase successfully:', urlData.publicUrl);
            res.json(response);

        } catch (supabaseError) {
            console.error('❌ Supabase image upload failed, using local storage');
            console.error('Error:', supabaseError.message);
            
            const localPath = path.join(__dirname, 'public', 'uploads', 'images', filename);
            fs.writeFileSync(localPath, req.file.buffer);
            
            const response = {
                success: true,
                filename: filename,
                url: `/uploads/images/${filename}`,
                originalName: req.file.originalname,
                size: req.file.size,
                storage: 'local',
                warning: 'Supabase upload failed: ' + supabaseError.message
            };

            console.log('⚠️ Image uploaded locally (fallback):', filename);
            res.json(response);
        }

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload image file: ' + error.message });
    }
});

// API HEALTH ENDPOINT
app.get('/api/health', async (req, res) => {
    console.log('Health check requested');
    
    try {
        const { count: totalRoutes, error: routesError } = await supabase
            .from('routes')
            .select('*', { count: 'exact', head: true });

        const { count: publishedRoutes, error: publishedError } = await supabase
            .from('routes')
            .select('*', { count: 'exact', head: true })
            .eq('published', true);

        if (routesError || publishedError) {
            throw new Error(routesError?.message || publishedError?.message);
        }

        const healthResponse = {
            status: 'ok',
            routes: totalRoutes || 0,
            publishedRoutes: publishedRoutes || 0,
            timestamp: new Date().toISOString(),
            server: 'Supabase Database Connected',
            database: 'Supabase PostgreSQL',
            storage: 'Hybrid (Supabase + Local fallback)',
            supabase: {
                url: supabaseUrl,
                connected: true,
                tablesAccessible: true
            },
            environment: process.env.NODE_ENV || 'development'
        };

        console.log('✅ Health check successful:', healthResponse);
        res.json(healthResponse);

    } catch (error) {
        console.error('❌ Health check failed:', error);
        
        const errorResponse = {
            status: 'error',
            error: error.message,
            routes: 0,
            publishedRoutes: 0,
            timestamp: new Date().toISOString(),
            server: 'Database Connection Failed',
            database: 'Connection Error',
            supabase: {
                url: supabaseUrl || 'not configured',
                connected: false,
                error: error.message
            },
            troubleshooting: {
                checkEnvironmentVariables: 'Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in Render',
                checkSupabaseTables: 'Ensure routes and route_points tables exist in your Supabase database',
                checkSupabasePermissions: 'Ensure service key has proper permissions'
            }
        };
        
        res.status(500).json(errorResponse);
    }
});

// Get all routes (for CMS)
app.get('/api/routes', async (req, res) => {
    try {
        console.log('Getting all routes from database...');
        
        const { data: routes, error } = await supabase
            .from('routes')
            .select(`
                *,
                route_points (*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            throw error;
        }

        console.log(`Found ${routes?.length || 0} routes in database`);

        const transformedRoutes = (routes || []).map(route => ({
            id: route.route_id,
            name: route.name,
            city: route.city,
            category: route.category,
            difficulty: route.difficulty,
            estimatedDuration: route.estimated_duration,
            distance: route.distance,
            description: route.description,
            color: route.color,
            imageUrl: route.image_url,
            imagePosition: route.image_position,
            audioFolder: route.audio_folder,
            published: route.published,
            createdAt: route.created_at,
            updatedAt: route.updated_at,
            points: (route.route_points || [])
                .sort((a, b) => a.point_index - b.point_index)
                .map(point => ({
                    name: point.name,
                    description: point.description,
                    coordinates: point.coordinates,
                    radius: point.radius,
                    type: point.point_type,
                    audioFile: point.audio_file,
                    audioDuration: point.audio_duration,
                    imageUrl: point.image_url
                }))
        }));

        console.log('GET /api/routes - returning', transformedRoutes.length, 'routes');
        res.json(transformedRoutes);

    } catch (error) {
        console.error('Error loading routes from database:', error);
        res.status(500).json({ 
            error: 'Failed to load routes from database: ' + error.message,
            hint: 'Check that your Supabase tables exist and environment variables are correct'
        });
    }
});

// Get only published routes (for app/dashboard)
app.get('/api/app/routes', async (req, res) => {
    try {
        console.log('Getting published routes from database...');
        
        const { data: routes, error } = await supabase
            .from('routes')
            .select(`
                *,
                route_points (*)
            `)
            .eq('published', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            throw error;
        }

        console.log(`Found ${routes?.length || 0} published routes in database`);

        const transformedRoutes = (routes || []).map(route => ({
            id: route.route_id,
            name: route.name,
            city: route.city,
            category: route.category,
            difficulty: route.difficulty,
            estimatedDuration: route.estimated_duration,
            distance: route.distance,
            description: route.description,
            color: route.color,
            imageUrl: route.image_url,
            imagePosition: route.image_position,
            audioFolder: route.audio_folder,
            published: route.published,
            createdAt: route.created_at,
            updatedAt: route.updated_at,
            points: (route.route_points || [])
                .sort((a, b) => a.point_index - b.point_index)
                .map(point => ({
                    name: point.name,
                    description: point.description,
                    coordinates: point.coordinates,
                    radius: point.radius,
                    type: point.point_type,
                    audioFile: point.audio_file,
                    audioDuration: point.audio_duration,
                    imageUrl: point.image_url
                }))
        }));

        console.log('GET /api/app/routes - returning', transformedRoutes.length, 'published routes');
        res.json(transformedRoutes);

    } catch (error) {
        console.error('Error loading published routes:', error);
        res.status(500).json({ 
            error: 'Failed to load published routes: ' + error.message,
            hint: 'Check database connection and table structure'
        });
    }
});

// Create new route
app.post('/api/routes', async (req, res) => {
    try {
        console.log('POST /api/routes - creating route:', req.body.name);

        const routeId = 'route_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        const routeData = {
            route_id: routeId,
            name: req.body.name,
            city: req.body.city,
            category: req.body.category || 'Modern',
            difficulty: req.body.difficulty || 'Easy',
            estimated_duration: req.body.estimatedDuration,
            distance: req.body.distance,
            description: req.body.description,
            color: req.body.color || '#FFD700',
            image_url: req.body.imageUrl,
            image_position: req.body.imagePosition || 'center',
            audio_folder: req.body.audioFolder || '/uploads/audio/',
            published: Boolean(req.body.published)
        };

        const { data: route, error: routeError } = await supabase
            .from('routes')
            .insert([routeData])
            .select()
            .single();

        if (routeError) {
            console.error('Route creation error:', routeError);
            throw routeError;
        }

        console.log('Route created in database:', routeId);

        if (req.body.points && req.body.points.length > 0) {
            console.log(`Adding ${req.body.points.length} points to route`);
            
            const pointsData = req.body.points.map((point, index) => ({
                route_id: routeId,
                point_index: index,
                name: point.name,
                description: point.description,
                coordinates: point.coordinates,
                radius: point.radius || 50,
                point_type: point.type || 'waypoint',
                audio_file: point.audioFile,
                audio_duration: point.audioDuration,
                image_url: point.imageUrl
            }));

            const { error: pointsError } = await supabase
                .from('route_points')
                .insert(pointsData);

            if (pointsError) {
                console.error('Points creation error:', pointsError);
                throw pointsError;
            }

            console.log(`✅ Added ${req.body.points.length} points to route`);
        }

        const response = {
            id: route.route_id,
            name: route.name,
            city: route.city,
            category: route.category,
            difficulty: route.difficulty,
            estimatedDuration: route.estimated_duration,
            distance: route.distance,
            description: route.description,
            color: route.color,
            imageUrl: route.image_url,
            imagePosition: route.image_position,
            audioFolder: route.audio_folder,
            published: route.published,
            createdAt: route.created_at,
            points: req.body.points || []
        };

        console.log('✅ Route created successfully:', routeId);
        res.json(response);

    } catch (error) {
        console.error('Error creating route in database:', error);
        res.status(500).json({ error: 'Failed to create route: ' + error.message });
    }
});

// Update existing route
app.put('/api/routes/:id', async (req, res) => {
    try {
        const routeId = req.params.id;
        console.log('=== UPDATE ROUTE ===');
        console.log('Route ID:', routeId);

        const updateData = {
            name: req.body.name,
            city: req.body.city,
            category: req.body.category,
            difficulty: req.body.difficulty,
            estimated_duration: req.body.estimatedDuration,
            distance: req.body.distance,
            description: req.body.description,
            color: req.body.color,
            image_url: req.body.imageUrl,
            image_position: req.body.imagePosition || 'center',
            audio_folder: req.body.audioFolder,
            published: Boolean(req.body.published !== undefined ? req.body.published : false),
            updated_at: new Date().toISOString()
        };

        const { data: routes, error: routeError } = await supabase
            .from('routes')
            .update(updateData)
            .eq('route_id', routeId)
            .select();

        if (routeError) throw routeError;
        
        if (!routes || routes.length === 0) {
            throw new Error(`Route not found: ${routeId}`);
        }

        const route = routes[0];

        // Update points
        if (req.body.points) {
            await supabase
                .from('route_points')
                .delete()
                .eq('route_id', routeId);

            if (req.body.points.length > 0) {
                const pointsData = req.body.points.map((point, index) => ({
                    route_id: routeId,
                    point_index: index,
                    name: point.name,
                    description: point.description,
                    coordinates: point.coordinates,
                    radius: point.radius || 50,
                    point_type: point.type || 'waypoint',
                    audio_file: point.audioFile,
                    audio_duration: point.audioDuration,
                    image_url: point.imageUrl
                }));

                const { error: pointsError } = await supabase
                    .from('route_points')
                    .insert(pointsData);

                if (pointsError) throw pointsError;
            }
        }

        const response = {
            id: route.route_id,
            name: route.name,
            city: route.city,
            category: route.category,
            difficulty: route.difficulty,
            estimatedDuration: route.estimated_duration,
            distance: route.distance,
            description: route.description,
            color: route.color,
            imageUrl: route.image_url,
            imagePosition: route.image_position,
            audioFolder: route.audio_folder,
            published: route.published,
            updatedAt: route.updated_at,
            points: req.body.points || []
        };

        console.log('✅ Route updated successfully:', routeId);
        res.json(response);

    } catch (error) {
        console.error('Error updating route:', error);
        res.status(500).json({ error: 'Failed to update route: ' + error.message });
    }
});

// Delete route
app.delete('/api/routes/:id', async (req, res) => {
    try {
        const routeId = req.params.id;
        console.log('Deleting route from database:', routeId);

        const { error } = await supabase
            .from('routes')
            .delete()
            .eq('route_id', routeId);

        if (error) throw error;

        console.log('✅ Route deleted from database:', routeId);
        res.json({ message: 'Route deleted successfully' });

    } catch (error) {
        console.error('Error deleting route:', error);
        res.status(500).json({ error: 'Failed to delete route: ' + error.message });
    }
});

// Toggle publish status
app.post('/api/routes/:id/publish', async (req, res) => {
    try {
        const routeId = req.params.id;
        const shouldPublish = Boolean(req.body.published);
        console.log(`${shouldPublish ? 'Publishing' : 'Unpublishing'} route:`, routeId);

        const { data: route, error } = await supabase
            .from('routes')
            .update({ 
                published: shouldPublish,
                updated_at: new Date().toISOString()
            })
            .eq('route_id', routeId)
            .select()
            .single();

        if (error) throw error;

        const { count: publishedCount } = await supabase
            .from('routes')
            .select('*', { count: 'exact', head: true })
            .eq('published', true);

        console.log(`✅ Route "${route.name}" ${shouldPublish ? 'published' : 'unpublished'}`);
        res.json({
            route: {
                id: route.route_id,
                name: route.name,
                published: route.published
            },
            publishedRoutes: publishedCount || 0
        });

    } catch (error) {
        console.error('Error toggling publish status:', error);
        res.status(500).json({ error: 'Failed to update publish status: ' + error.message });
    }
});

// Get analytics with city breakdown
app.get('/api/analytics', async (req, res) => {
    try {
        const { count: totalRoutes } = await supabase
            .from('routes')
            .select('*', { count: 'exact', head: true });

        const { count: publishedRoutes } = await supabase
            .from('routes')
            .select('*', { count: 'exact', head: true })
            .eq('published', true);

        const unpublishedRoutes = (totalRoutes || 0) - (publishedRoutes || 0);

        const { data: routesByCity } = await supabase
            .from('routes')
            .select('city')
            .not('city', 'is', null);

        const { data: publishedRoutesByCity } = await supabase
            .from('routes')
            .select('city')
            .eq('published', true)
            .not('city', 'is', null);

        const cityStats = {};
        routesByCity?.forEach(route => {
            if (route.city) {
                cityStats[route.city] = cityStats[route.city] || { total: 0, published: 0 };
                cityStats[route.city].total++;
            }
        });

        publishedRoutesByCity?.forEach(route => {
            if (route.city && cityStats[route.city]) {
                cityStats[route.city].published++;
            }
        });

        res.json({
            totalRoutes: totalRoutes || 0,
            publishedRoutes: publishedRoutes || 0,
            unpublishedRoutes: unpublishedRoutes,
            cityBreakdown: cityStats,
            lastUpdate: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generating analytics:', error);
        res.status(500).json({ error: 'Failed to generate analytics: ' + error.message });
    }
});

// Route regeneration
app.post('/api/regenerate-routes', async (req, res) => {
    try {
        const { count: publishedCount } = await supabase
            .from('routes')
            .select('*', { count: 'exact', head: true })
            .eq('published', true);

        console.log(`Regenerated routes: ${publishedCount || 0} published routes`);
        res.json({ 
            message: 'Routes regenerated successfully', 
            publishedRoutes: publishedCount || 0 
        });

    } catch (error) {
        console.error('Error regenerating routes:', error);
        res.status(500).json({ error: 'Failed to regenerate routes' });
    }
});

// CITIES ENDPOINTS
app.get('/api/cities', async (req, res) => {
    try {
        console.log('Getting all cities from database...');
        
        const { data: cities, error } = await supabase
            .from('cities')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Database error:', error);
            throw error;
        }

        console.log(`Found ${cities?.length || 0} cities in database`);
        res.json(cities || []);

    } catch (error) {
        console.error('Error loading cities from database:', error);
        res.status(500).json({ 
            error: 'Failed to load cities from database: ' + error.message,
            hint: 'Check that your cities table exists'
        });
    }
});

app.get('/api/routes/city/:cityName', async (req, res) => {
    try {
        const cityName = req.params.cityName;
        console.log(`Getting routes for city: ${cityName}`);
        
        const { data: routes, error } = await supabase
            .from('routes')
            .select(`
                *,
                route_points (*)
            `)
            .eq('published', true)
            .ilike('city', cityName)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            throw error;
        }

        console.log(`Found ${routes?.length || 0} published routes for ${cityName}`);

        const transformedRoutes = (routes || []).map(route => ({
            id: route.route_id,
            name: route.name,
            city: route.city,
            category: route.category,
            difficulty: route.difficulty,
            estimatedDuration: route.estimated_duration,
            distance: route.distance,
            description: route.description,
            color: route.color,
            imageUrl: route.image_url,
            imagePosition: route.image_position,
            audioFolder: route.audio_folder,
            published: route.published,
            createdAt: route.created_at,
            updatedAt: route.updated_at,
            points: (route.route_points || [])
                .sort((a, b) => a.point_index - b.point_index)
                .map(point => ({
                    name: point.name,
                    description: point.description,
                    coordinates: point.coordinates,
                    radius: point.radius,
                    type: point.point_type,
                    audioFile: point.audio_file,
                    audioDuration: point.audio_duration,
                    imageUrl: point.image_url
                }))
        }));

        console.log(`GET /api/routes/city/${cityName} - returning ${transformedRoutes.length} routes`);
        res.json(transformedRoutes);

    } catch (error) {
        console.error(`Error loading routes for city ${req.params.cityName}:`, error);
        res.status(500).json({ 
            error: `Failed to load routes for ${req.params.cityName}: ` + error.message
        });
    }
});

app.post('/api/cities', async (req, res) => {
    try {
        console.log('POST /api/cities - creating city:', req.body.name);

        const cityData = {
            name: req.body.name,
            country: req.body.country,
            description: req.body.description
        };

        const { data: city, error } = await supabase
            .from('cities')
            .insert([cityData])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'City already exists' });
            }
            throw error;
        }

        console.log('City created successfully:', city.name);
        res.json(city);

    } catch (error) {
        console.error('Error creating city:', error);
        res.status(500).json({ error: 'Failed to create city: ' + error.message });
    }
});

// SERVE HTML PAGES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/audioguide', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'audioguide.html'));
});

app.get('/cms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cms.html'));
});

// ERROR HANDLING
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.error('Multer error:', error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large (max 50MB)' });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Unexpected file field' });
        }
        
        return res.status(400).json({ error: 'File upload error: ' + error.message });
    }
    
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
});

// 404 handler
app.get('*', (req, res) => {
    console.log('404 - Page not found:', req.url);
    res.status(404).send('Page not found: ' + req.url);
});

// START SERVER
app.listen(PORT, '0.0.0.0', async () => {
    console.log('=== SERVER STARTED ===');
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: Supabase PostgreSQL`);
    console.log(`Storage: Hybrid (Supabase + Local fallback)`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Service Key configured: ${supabaseServiceKey ? 'Yes' : 'No'}`);
    
    console.log('Testing Supabase connection...');
    const connectionWorking = await testSupabaseConnection();
    
    if (connectionWorking) {
        console.log('✅ Database connection successful');
        console.log('Ready to receive requests');
        console.log('CMS available at: /cms');
        console.log('Dashboard available at: /dashboard');
        console.log('Health check: /api/health');
    } else {
        console.log('❌ Database connection failed');
        console.log('Server running but database operations will fail');
        console.log('Check your Render environment variables');
    }
    
    console.log('========================');
});