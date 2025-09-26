const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

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
        audioFolder: '/audio/milan-historic/',
        published: true,
        createdAt: new Date().toISOString(),
        points: [
            {
                name: 'Duomo di Milano',
                description: 'The magnificent Gothic cathedral at the heart of Milan. This masterpiece took nearly six centuries to complete.',
                coordinates: [9.1917, 45.4642],
                type: 'start',
                audioFile: 'duomo.mp3',
                audioDuration: '2:30'
            },
            {
                name: 'Galleria Vittorio Emanuele II',
                description: 'One of the world\'s oldest shopping malls, a masterpiece of 19th-century architecture.',
                coordinates: [9.1897, 45.4654],
                type: 'waypoint',
                audioFile: 'galleria.mp3',
                audioDuration: '3:15'
            },
            {
                name: 'Teatro alla Scala',
                description: 'The famous opera house, home to some of the greatest singers and dancers.',
                coordinates: [9.1898, 45.4676],
                type: 'end',
                audioFile: 'scala.mp3',
                audioDuration: '2:45'
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
        audioFolder: '/audio/milan-modern/',
        published: false,
        createdAt: new Date().toISOString(),
        points: []
    }
];
nextId = 3;

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        routes: routes.length, 
        timestamp: new Date().toISOString(),
        server: 'Render deployment'
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
            published: req.body.published || false
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
    res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
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
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Routes loaded: ${routes.length}`);
    console.log(`Published routes: ${routes.filter(r => r.published).length}`);
});
