import mockKV from './mockKV';

/**
 * Setup mock data for testing and local development
 * This function initializes the mock KV store with test data
 */
export async function setupMockData() {
  console.log('Setting up mock data for local development...');

  // Create test user - simple password for development only
  const testUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
    createdAt: new Date().toISOString(),

    // Use plain text password for easier development testing
    password: 'password123',
  };

  // Add test user to KV
  await mockKV.put(`user:${testUser.email}`, JSON.stringify(testUser));

  // Set allowed domains for authentication
  const allowedDomains = ['example.com'];
  await mockKV.put('allowedDomains', JSON.stringify(allowedDomains));

  // Set auth config
  const authConfig = {
    requireAuth: false, // Set to false for easier testing
  };
  await mockKV.put('config', JSON.stringify(authConfig));

  console.log('✅ Mock data initialized successfully');
  console.log('📝 Test user credentials: test@example.com / password123');
}

// Auto-setup if this file is imported directly in browser
if (typeof window !== 'undefined') {
  // Add a small delay to ensure console messages are visible after other initialization
  setTimeout(() => {
    setupMockData()
      .then(() => console.log('✨ Mock KV environment ready for local development'))
      .catch((err) => console.error('❌ Failed to setup mock data:', err));
  }, 100);
}
