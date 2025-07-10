// Set environment to production mode for tests by default
// This ensures authentication is properly tested
process.env.NODE_ENV = 'test';
process.env.SKIP_AUTH = 'false';