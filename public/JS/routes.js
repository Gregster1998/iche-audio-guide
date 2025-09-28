const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3001;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE'
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Configure multer for file uploads to memory (we'll upload to Supabase)
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

// Helper function to generate unique filename
function generateUniqueFilename(originalname, fieldname) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = path.extname(originalname);
    return `${fieldname}-${timestamp}-${random}${ext}`;
}

// FILE UPLOAD ENDPOINTS
app.post('/api/upload/audio', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const filename = generateUniqueFilename(req.file.originalname, 'audio');
        const { data, error } = await supabase.storage
            .from('audio-files')
            .upload(filename, req.file.buffer, {
                contentType: req.file.mimetype,
                duplex: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return res.status(500).json({ error: 'Failed to upload audio file' });
        }

        const { data: urlData } = supabase.storage
            .from('audio-files')
            .getPublicUrl(filename);

        const response = {
            success: true,
            filename: filename,
            url: urlData.publicUrl,
            originalName: req.file.originalname,
            size: req.file.size
        };

        console.log('Audio uploaded successfully:', response);
        res.json(response);

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
        const { data, error } = await supabase.storage
            .from('images')
            .upload(filename, req.file.buffer, {
                contentType: req.file.mimetype,
                duplex: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return res.status(500).json({ error: 'Failed to upload image file' });
        }

        const { data: urlData } = supabase.storage
            .from('images')
            .getPublicUrl(filename);

        const response = {
            success: true,
            filename: filename,
            url: urlData.publicUrl,
            originalName: req.file.originalname,
            size: req.file.size
        };

        console.log('Image uploaded successfully:', response);
        res.json(response);

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload image file: ' + error.message });
    }
});

// API ENDPOINTS
app.get('/api/health', async (req, res) => {
    try {
        const { count } = await supabase
            .from('routes')
            .select('*', { count: 'exact', head: true });

        const { count: publishedCount } = await supabase
            .from('routes')
            .select('*', { count: 'exact', head: true })
            .eq('published', true);

        res.json({
            status: 'ok',
            routes: count || 0,
            publishedRoutes: publishedCount || 0,
            timestamp: new Date().toISOString(),
            server: 'Supabase-powered with file storage',
            database: 'Supabase PostgreSQL'
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Health check failed' });
    }
});

// Get all routes (for CMS)
app.get('/api/routes', async (req, res) => {
    try {
        const { data: routes, error } = await supabase
            .from('routes')
            .select(`
                *,
                route_points (*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform data to match expected format
        const transformedRoutes = routes.map(route => ({
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
            points: route.route_points
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
        console.error('Error loading routes:', error);
        res.status(500).json({ error: 'Failed to load routes' });
    }
});

// Get only published routes (for app/dashboard)
app.get('/api/app/routes', async (req, res) => {
    try {
        const { data: routes, error } = await supabase
            .from('routes')
            .select(`
                *,
                route_points (*)
            `)
            .eq('published', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const transformedRoutes = routes.map(route => ({
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
            points: route.route_points
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
        res.status(500).json({ error: 'Failed to load routes' });
    }
});

// Create new route
app.post('/api/routes', async (req, res) => {
    try {
        console.log('POST /api/routes - creating route:', req.body.name);

        // Generate unique route ID
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

        // Insert route
        const { data: route, error: routeError } = await supabase
            .from('routes')
            .insert([routeData])
            .select()
            .single();

        if (routeError) throw routeError;

        // Insert points if provided
        if (req.body.points && req.body.points.length > 0) {
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

        // Transform response
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

        console.log('Route created successfully:', routeId);
        res.json(response);

    } catch (error) {
        console.error('Error creating route:', error);
        res.status(500).json({ error: 'Failed to create route: ' + error.message });
    }
});

// Update existing route
app.put('/api/routes/:id', async (req, res) => {
    try {
        console.log('PUT /api/routes/' + req.params.id + ' - updating route');

        const routeId = req.params.id;
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

        // Update route
        const { data: route, error: routeError } = await supabase
            .from('routes')
            .update(updateData)
            .eq('route_id', routeId)
            .select()
            .single();

        if (routeError) throw routeError;

        // Update points if provided
        if (req.body.points) {
            // Delete existing points
            await supabase
                .from('route_points')
                .delete()
                .eq('route_id', routeId);

            // Insert new points
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

        console.log('Route updated successfully:', routeId);
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

        // Delete route (points will be cascade deleted)
        const { error } = await supabase
            .from('routes')
            .delete()
            .eq('route_id', routeId);

        if (error) throw error;

        console.log('Route deleted:', routeId);
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

        console.log(`Route "${route.name}" ${shouldPublish ? 'published' : 'unpublished'}`);
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

// Get analytics
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

        res.json({
            totalRoutes: totalRoutes || 0,
            publishedRoutes: publishedRoutes || 0,
            unpublishedRoutes: unpublishedRoutes,
            lastUpdate: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generating analytics:', error);
        res.status(500).json({ error: 'Failed to generate analytics' });
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
        return res.status(400).json({ error: 'File upload error: ' + error.message });
    }
    
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
});

app.get('*', (req, res) => {
    res.status(404).send('Page not found');
});

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: Supabase PostgreSQL`);
    console.log(`Storage: Supabase Storage`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});