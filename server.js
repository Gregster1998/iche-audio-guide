const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001;

// Create necessary directories
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const audioDir = path.join(uploadsDir, 'audio');
const imagesDir = path.join(uploadsDir, 'images');

// Ensure upload directories exist
[uploadsDir, audioDir, imagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'audio') {
            cb(null, audioDir);
        } else if (file.fieldname === 'image') {
            cb(null, imagesDir);
        } else {
            cb(null, uploadsDir);
        }
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'audio') {
            if (file.mimetype.startsWith('audio/')) {
                cb(null, true);
            } else {
                cb(new Error('Only audio files are allowed'), false);
            }
        } else if (file.fieldname === 'image') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed'), false);
            }
        } else {
            cb(null, true);
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (your HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (will reset when server restarts)
let routes = [];
let nextId = 1;

// Add some default routes for testing
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
        imageUrl: '/uploads/images/milan-historic.jpg',
        audioFolder: '/uploads/audio/',
        published: true,
        createdAt: new Date().toISOString(),
        points: [
            {
                name: 'Duomo di Milano',
                description: 'The magnificent Gothic cathedral at the heart of Milan. This masterpiece took nearly six centuries to complete.',
                coordinates: [9.1917, 45.4642],
                type: 'start',
                audioFile: 'duomo.mp3',
                audioDuration: '2:30',
                imageUrl: '/uploads/images/duomo.jpg'
            },
            {
                name: 'Galleria Vittorio Emanuele II',
                description: 'One of the world\'s oldest shopping malls, a masterpiece of 19th-century architecture.',
                coordinates: [9.1897, 45.4654],
                type: 'waypoint',
                audioFile: 'galleria.mp3',
                audioDuration: '3:15',
                imageUrl: '/uploads/images/galleria.jpg'
            },
            {
                name: 'Teatro alla Scala',
                description: 'The famous opera house, home to some of the greatest singers and dancers.',
                coordinates: [9.1898, 45.4676],
                type: 'end',
                audioFile: 'scala.mp3',
                audioDuration: '2:45',
                imageUrl: '/uploads/images/scala.jpg'
            }
        ]
    },
    {
        id: '2',
        name: 'Modern Milan Route',
        city: 'Milan',
        category: 'Modern',
        difficulty: 'Easy',
        estimatedDuration: '1.5 hours',
        distance: '2.8 km',
        description: 'Explore Milan\'s modern districts and contemporary architecture.',
        color: '#E31E24',
        imageUrl: '/uploads/images/milan-modern.jpg',
        audioFolder: '/uploads/audio/',
        published: false,
        createdAt: new Date().toISOString(),
        points: []
    }
];
nextId = 3;

async function handleStopAudioUpload(event) {
    console.log('Audio upload started');
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }

    console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
    });

    const uploadArea = document.getElementById('stop-audio-upload');
    uploadArea.classList.add('uploading');
    uploadArea.querySelector('.upload-text').textContent = 'Uploading audio...';

    try {
        const formData = new FormData();
        formData.append('audio', file);
        
        console.log('Sending to API:', `${API_BASE}/upload/audio`);

        const response = await fetch(`${API_BASE}/upload/audio`, {
            method: 'POST',
            body: formData
        });

        console.log('Upload response status:', response.status);
        const responseText = await response.text();
        console.log('Upload response text:', responseText);

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} - ${responseText}`);
        }

        const result = JSON.parse(responseText);
        console.log('Upload result:', result);
        
        // Update the form field - this is where the bug might be
        const audioFileInput = document.querySelector('[name="audioFile"]');
        console.log('Audio file input found:', !!audioFileInput);
        
        if (audioFileInput) {
            audioFileInput.value = result.filename;
            console.log('Set audioFile value to:', result.filename);
        } else {
            console.error('Could not find audioFile input field');
        }
        
        uploadArea.classList.remove('uploading');
        uploadArea.classList.add('has-file');
        uploadArea.querySelector('.upload-text').textContent = result.originalName;
        uploadArea.querySelector('.upload-subtext').textContent = `${(result.size / 1024 / 1024).toFixed(2)} MB`;
        
        showSuccess('Audio file uploaded successfully');
        
    } catch (error) {
        console.error('Upload error:', error);
        showError('Failed to upload audio file: ' + error.message);
        
        uploadArea.classList.remove('uploading');
        uploadArea.querySelector('.upload-text').textContent = 'Click to upload audio';
    }
}

async function handleStopImageUpload(event) {
    console.log('Image upload started');
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }

    console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
    });

    const uploadArea = document.getElementById('stop-image-upload');
    uploadArea.classList.add('uploading');
    uploadArea.querySelector('.upload-text').textContent = 'Uploading...';

    try {
        const formData = new FormData();
        formData.append('image', file);
        
        console.log('Sending to API:', `${API_BASE}/upload/image`);

        const response = await fetch(`${API_BASE}/upload/image`, {
            method: 'POST',
            body: formData
        });

        console.log('Upload response status:', response.status);
        const responseText = await response.text();
        console.log('Upload response text:', responseText);

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} - ${responseText}`);
        }

        const result = JSON.parse(responseText);
        console.log('Upload result:', result);
        
        // Update the form field
        const imageUrlInput = document.querySelector('#stop-form [name="imageUrl"]');
        console.log('Image URL input found:', !!imageUrlInput);
        
        if (imageUrlInput) {
            imageUrlInput.value = result.url;
            console.log('Set imageUrl value to:', result.url);
        } else {
            console.error('Could not find imageUrl input field');
        }
        
        uploadArea.classList.remove('uploading');
        uploadArea.classList.add('has-file');
        uploadArea.querySelector('.upload-text').textContent = result.originalName;
        uploadArea.querySelector('.upload-subtext').textContent = `${(result.size / 1024 / 1024).toFixed(2)} MB`;
        
        showSuccess('Stop image uploaded successfully');
        
    } catch (error) {
        console.error('Upload error:', error);
        showError('Failed to upload stop image: ' + error.message);
        
        uploadArea.classList.remove('uploading');
        uploadArea.querySelector('.upload-text').textContent = 'Click to upload image';
    }
}

// Also add this debugging version of saveStop
function saveStop() {
    console.log('Save stop called');
    const form = document.getElementById('stop-form');
    const formData = new FormData(form);
    
    const stopData = {};
    for (let [key, value] of formData.entries()) {
        stopData[key] = value;
        console.log(`Stop data - ${key}:`, value);
    }

    if (!stopData.name || !stopData.description || !stopData.latitude || !stopData.longitude) {
        console.error('Missing required fields:', {
            name: !!stopData.name,
            description: !!stopData.description,
            latitude: !!stopData.latitude,
            longitude: !!stopData.longitude
        });
        alert('Stop name, description, and coordinates are required');
        return;
    }

    const newStop = {
        name: stopData.name,
        description: stopData.description,
        coordinates: [parseFloat(stopData.longitude), parseFloat(stopData.latitude)],
        type: editingStopIndex === 0 ? 'start' : 'waypoint',
        audioFile: stopData.audioFile || null,
        audioDuration: stopData.audioDuration || null,
        imageUrl: stopData.imageUrl || null
    };

    console.log('New stop object:', newStop);

    if (editingStopIndex === -1) {
        editingRouteStops.push(newStop);
        console.log('Added new stop to array');
    } else {
        editingRouteStops[editingStopIndex] = newStop;
        console.log('Updated existing stop in array');
    }

    console.log('Current editingRouteStops:', editingRouteStops);

    updateStopsListInline();
    closeModal('stop-modal');
    
    showSuccess(`Stop ${editingStopIndex === -1 ? 'added' : 'updated'} successfully`);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        routes: routes.length, 
        timestamp: new Date().toISOString(),
        server: 'Render deployment with file uploads'
    });
});

// Get all routes (for CMS)
app.get('/api/routes', (req, res) => {
    res.json(routes);
});

// Get published routes (for app)
app.get('/api/app/routes', (req, res) => {
    const publishedRoutes = routes.filter(route => route.published);
    res.json(publishedRoutes);
});

// Create new route
app.post('/api/routes', (req, res) => {
    try {
        const newRoute = {
            id: String(nextId++),
            ...req.body,
            createdAt: new Date().toISOString(),
            published: req.body.published || false,
            audioFolder: req.body.audioFolder || '/uploads/audio/'
        };
        routes.push(newRoute);
        console.log('Created new route:', newRoute.name);
        res.json(newRoute);
    } catch (error) {
        console.error('Error creating route:', error);
        res.status(500).json({ error: 'Failed to create route' });
    }
});

// Update route
app.put('/api/routes/:id', (req, res) => {
    try {
        const routeIndex = routes.findIndex(r => r.id === req.params.id);
        if (routeIndex === -1) {
            return res.status(404).json({ error: 'Route not found' });
        }
        routes[routeIndex] = { 
            ...routes[routeIndex], 
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        console.log('Updated route:', routes[routeIndex].name);
        res.json(routes[routeIndex]);
    } catch (error) {
        console.error('Error updating route:', error);
        res.status(500).json({ error: 'Failed to update route' });
    }
});

// Delete route
app.delete('/api/routes/:id', (req, res) => {
    try {
        const routeIndex = routes.findIndex(r => r.id === req.params.id);
        if (routeIndex === -1) {
            return res.status(404).json({ error: 'Route not found' });
        }
        const deletedRoute = routes.splice(routeIndex, 1)[0];
        console.log('Deleted route:', deletedRoute.name);
        res.json({ message: 'Route deleted successfully' });
    } catch (error) {
        console.error('Error deleting route:', error);
        res.status(500).json({ error: 'Failed to delete route' });
    }
});

// Toggle publish status
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

// Analytics endpoint
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

// Regenerate routes (for updating app with published routes)
app.post('/api/regenerate-routes', (req, res) => {
    try {
        const publishedRoutes = routes.filter(r => r.published);
        console.log(`Regenerated routes file with ${publishedRoutes.length} published routes`);
        res.json({ 
            message: 'Routes regenerated successfully', 
            publishedRoutes: publishedRoutes.length 
        });
    } catch (error) {
        console.error('Error regenerating routes:', error);
        res.status(500).json({ error: 'Failed to regenerate routes' });
    }
});

// Serve your app pages
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

// 404 handler
app.get('*', (req, res) => {
    res.status(404).send('Page not found');
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large (max 50MB)' });
        }
    }
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Routes loaded: ${routes.length}`);
    console.log(`Published routes: ${routes.filter(r => r.published).length}`);
    console.log(`Upload directories created: ${audioDir}, ${imagesDir}`);
});
