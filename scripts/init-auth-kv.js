/**
 * This script initializes Cloudflare KV with default authentication values
 * Run with: node scripts/init-auth-kv.js
 */

const { execSync } = require('child_process');

// Default auth configuration
const defaultAuthConfig = {
  allowedDomains: ['example.com', 'bolt.diy'], // Add your allowed domains here
  requireAuth: false, // Set to true to require authentication for all users
};

// Create KV namespaces if they don't exist
console.log('Creating KV namespaces...');

try {
  // Create AUTH_USERS namespace
  execSync('wrangler kv:namespace create AUTH_USERS');
  console.log('Created AUTH_USERS namespace');
} catch (error) {
  console.log('AUTH_USERS namespace may already exist, continuing...');
}

try {
  // Create AUTH_CONFIG namespace
  execSync('wrangler kv:namespace create AUTH_CONFIG');
  console.log('Created AUTH_CONFIG namespace');
} catch (error) {
  console.log('AUTH_CONFIG namespace may already exist, continuing...');
}

// Initialize with default values
console.log('Initializing default values...');

// Save default auth config
try {
  const configJson = JSON.stringify(defaultAuthConfig);
  execSync(`wrangler kv:key put --binding=AUTH_CONFIG "config" '${configJson}'`);
  console.log('Initialized default auth configuration');
} catch (error) {
  console.error('Error initializing auth configuration:', error.message);
}

// Create a test user (admin@example.com / password123)
try {
  const testUser = {
    id: 'user:admin@example.com',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    passwordHash: 'password123', // This should be properly hashed in production
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const userJson = JSON.stringify(testUser);
  execSync(`wrangler kv:key put --binding=AUTH_USERS "user:admin@example.com" '${userJson}'`);
  console.log('Created test user: admin@example.com / password123');
} catch (error) {
  console.error('Error creating test user:', error.message);
}

console.log('Initialization complete!');
console.log('');
console.log('Next steps:');
console.log('1. Update wrangler.toml with the KV namespace IDs');
console.log('2. Update the allowed domains in the admin panel if needed');
console.log('3. Start the application and test the authentication system');
