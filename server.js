const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001;

// Create upload directories
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

// Initialize directories
createDirectories();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'audio') {
            cb(null, path.join(__dirname, 'public', 'uploads', 'audio'));
        } else if (file.fieldname === 'image') {
            cb(null, path.join(__dirname, 'public', 'uploads', 'images'));
        } else {
            cb(null, path.join(__dirname, 'public', 'uploads'));
        }
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

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

// In-memory storage for routes
let routes = [];
let nextId = 1;

// Initialize with sample data
routes = [
    {
        id: '1',
        name: 'Historic Milan Tour',
        city: 'Milan',
        category: 'Historical',
        difficulty: 'Easy',
        estimatedDuration: '2 hours',
        distance: '3.5 km',
        description: 'Walk through Milan\'s historic center visiting the Duomo, Galleria, and more iconic landmarks.',
        color: '#8B4513',
        imageUrl: null,
        audioFolder: '/uploads/audio/',
        published: true,
        createdAt: new Date().toISOString(),
        points: [
            {
                name: 'Duomo di Milano',
                description: 'The magnificent Gothic cathedral at the heart of Milan.',
                coordinates: [9.1917, 45.4642],
                type: 'start',
                audioFile: null,
                audioDuration: '2:30',
                imageUrl: null
            }
        ]
    }
];
nextId = 2;

// FILE UPLOAD ENDPOINTS
app.post('/api/upload/audio', upload.single('audio'), (req, res) => {
    console.log('Audio upload endpoint hit');
    
    try {
        if (!req.file) {
            console.log('No audio file in request');
            return res.status(400).json({ error: 'No audio file uploaded' });
        }
        
        console.log('Audio file uploaded:', req.file);
        
        const audioUrl = `/uploads/audio/${req.file.filename}`;
        const response = {
            success: true,
            filename: req.file.filename,
            url: audioUrl,
            originalName: req.file.originalname,
            size: req.file.size
        };
        
        console.log('Sending audio upload response:', response);
        res.json(response);
        
    } catch (error) {
        console.error('Audio upload error:', error);
        res.status(500).json({ error: 'Failed to upload audio file: ' + error.message });
    }
});

app.post('/api/upload/image', upload.single('image'), (req, res) => {
    console.log('Image upload endpoint hit');
    
    try {
        if (!req.file) {
            console.log('No image file in request');
            return res.status(400).json({ error: 'No image file uploaded' });
        }
        
        console.log('Image file uploaded:', req.file);
        
        const imageUrl = `/uploads/images/${req.file.filename}`;
        const response = {
            success: true,
            filename: req.file.filename,
            url: imageUrl,
            originalName: req.file.originalname,
            size: req.file.size
        };
        
        console.log('Sending image upload response:', response);
        res.json(response);
        
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload image file: ' + error.message });
    }
});

// API ENDPOINTS
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        routes: routes.length, 
        timestamp: new Date().toISOString(),
        server: 'Enhanced with file uploads',
        uploadDirs: {
            audio: '/uploads/audio',
            images: '/uploads/images'
        }
    });
});

app.get('/api/routes', (req, res) => {
    console.log('GET /api/routes - returning', routes.length, 'routes');
    res.json(routes);
});

app.get('/api/app/routes', (req, res) => {
    const publishedRoutes = routes.filter(route => route.published);
    console.log('GET /api/app/routes - returning', publishedRoutes.length, 'published routes');
    res.json(publishedRoutes);
});

app.post('/api/routes', (req, res) => {
    try {
        console.log('POST /api/routes - creating route:', req.body.name);
        
        const newRoute = {
            id: String(nextId++),
            ...req.body,
            createdAt: new Date().toISOString(),
            published: req.body.published || false,
            audioFolder: req.body.audioFolder || '/uploads/audio/'
        };
        
        routes.push(newRoute);
        console.log('Route created successfully:', newRoute.id);
        res.json(newRoute);
        
    } catch (error) {
        console.error('Error creating route:', error);
        res.status(500).json({ error: 'Failed to create route' });
    }
});

app.put('/api/routes/:id', (req, res) => {
    try {
        console.log('PUT /api/routes/' + req.params.id + ' - updating route');
        
        const routeIndex = routes.findIndex(r => r.id === req.params.id);
        if (routeIndex === -1) {
            return res.status(404).json({ error: 'Route not found' });
        }
        
        routes[routeIndex] = { 
            ...routes[routeIndex], 
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        console.log('Route updated successfully:', routes[routeIndex].name);
        res.json(routes[routeIndex]);
        
    } catch (error) {
        console.error('Error updating route:', error);
        res.status(500).json({ error: 'Failed to update route' });
    }
});

app.delete('/api/routes/:id', (req, res) => {
    try {
        const routeIndex = routes.findIndex(r => r.id === req.params.id);
        if (routeIndex === -1) {
            return res.status(404).json({ error: 'Route not found' });
        }
        
        const deletedRoute = routes.splice(routeIndex, 1)[0];
        console.log('Route deleted:', deletedRoute.name);
        res.json({ message: 'Route deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting route:', error);
        res.status(500).json({ error: 'Failed to delete route' });
    }
});

app.post('/api/routes/:id/publish', (req, res) => {
    try {
        const routeIndex = routes.findIndex(r => r.id === req.params.id);
        if (routeIndex === -1) {
            return res.status(404).json({ error: 'Route not found' });
        }
        
        routes[routeIndex].published = req.body.published;
        routes[routeIndex].updatedAt = new Date().toISOString();
        
        const publishedCount = routes.filter(r => r.published).length;
        console.log(`Route ${routes[routeIndex].name} ${req.body.published ? 'published' : 'unpublished'}`);
        
        res.json({ 
            route: routes[routeIndex], 
            publishedRoutes: publishedCount 
        });
        
    } catch (error) {
        console.error('Error toggling publish status:', error);
        res.status(500).json({ error: 'Failed to update publish status' });
    }
});

app.get('/api/analytics', (req, res) => {
    try {
        const totalRoutes = routes.length;
        const publishedRoutes = routes.filter(r => r.published).length;
        const unpublishedRoutes = totalRoutes - publishedRoutes;
        
        res.json({
            totalRoutes,
            publishedRoutes,
            unpublishedRoutes,
            lastUpdate: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error generating analytics:', error);
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
});

app.post('/api/regenerate-routes', (req, res) => {
    try {
        const publishedRoutes = routes.filter(r => r.published);
        console.log(`Regenerated routes: ${publishedRoutes.length} published routes`);
        
        res.json({ 
            message: 'Routes regenerated successfully', 
            publishedRoutes: publishedRoutes.length 
        });
        
    } catch (error) {
        console.error('Error regenerating routes:', error);
        res.status(500).json({ error: 'Failed to regenerate routes' });
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
    console.log(`📊 Routes loaded: ${routes.length}`);
    console.log(`📈 Published routes: ${routes.filter(r => r.published).length}`);
    console.log(`🎵 Audio uploads: /uploads/audio/`);
    console.log(`🖼️ Image uploads: /uploads/images/`);
    console.log(`✅ File upload endpoints ready`);
});