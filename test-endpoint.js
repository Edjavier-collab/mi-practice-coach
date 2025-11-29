/**
 * Simple test script to verify the get-subscription endpoint is accessible
 * Run with: node test-endpoint.js
 */

const testEndpoint = async () => {
    const testUserId = 'test-user-id-123';
    const url = `http://localhost:3001/api/get-subscription?userId=${testUserId}`;
    
    console.log('Testing endpoint:', url);
    console.log('');
    
    try {
        const response = await fetch(url);
        console.log('Response status:', response.status, response.statusText);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json().catch(() => ({ error: 'Could not parse JSON' }));
        console.log('Response body:', JSON.stringify(data, null, 2));
        
        if (response.status === 404) {
            console.log('');
            console.log('❌ ERROR: Endpoint returned 404 - Server may not be running or route not registered');
            console.log('   Make sure to run: npm run dev:server');
        } else if (response.status === 400) {
            console.log('');
            console.log('✅ Endpoint is accessible (400 is expected for test user)');
        } else {
            console.log('');
            console.log('✅ Endpoint is accessible');
        }
    } catch (error) {
        console.error('❌ ERROR: Could not connect to server');
        console.error('   Error:', error.message);
        console.error('');
        console.error('   Make sure:');
        console.error('   1. Backend server is running: npm run dev:server');
        console.error('   2. Server is listening on port 3001');
        console.error('   3. No firewall is blocking the connection');
        process.exit(1);
    }
};

// Test health endpoint first
const testHealth = async () => {
    try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Health check passed:', data);
            console.log('');
            return true;
        }
    } catch (error) {
        console.error('❌ Health check failed - server is not running');
        console.error('   Run: npm run dev:server');
        console.error('');
        return false;
    }
};

// Run tests
(async () => {
    console.log('=== Testing Backend Server ===');
    console.log('');
    
    const healthOk = await testHealth();
    if (!healthOk) {
        process.exit(1);
    }
    
    await testEndpoint();
})();

