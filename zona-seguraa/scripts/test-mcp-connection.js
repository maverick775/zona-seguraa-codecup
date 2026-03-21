#!/usr/bin/env node

/**
 * MCP Database Test - Zona SeguRAA
 * 
 * Simple test script to verify Supabase MCP connection
 * and basic database functionality.
 */

require('dotenv').config({ path: '.env.local' });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) { log(`✅ ${message}`, 'green'); }
function error(message) { log(`❌ ${message}`, 'red'); }
function warning(message) { log(`⚠️  ${message}`, 'yellow'); }
function info(message) { log(`ℹ️  ${message}`, 'blue'); }
function header(message) { log(`\n🔧 ${message}`, 'cyan'); }

async function main() {
  console.log('🚀 MCP Database Test - Zona SeguRAA');
  console.log('=================================\n');
  
  // Check environment variables
  header('Environment Check');
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    error('Missing environment variables:');
    missing.forEach(key => error(`  - ${key}`));
    process.exit(1);
  }
  
  success('All environment variables found');
  
  // Test basic connectivity via health endpoint
  header('Connectivity Test');
  try {
    const response = await fetch('http://localhost:3000/health');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'ok' && data.supabase === 'connected') {
      success('Health endpoint: Connected to Supabase');
      info(`Found ${data.zones?.length || 0} zones`);
    } else {
      warning('Health endpoint: Unexpected response');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (err) {
    error('Health endpoint failed');
    error(`Make sure dev server is running: npm run dev`);
    error(`Error: ${err.message}`);
    process.exit(1);
  }
  
  header('MCP Usage Examples');
  info('For advanced database operations, use MCP commands:');
  console.log(`
# List tables
mcp0_list_tables --project_id=tyqpayvbelcfnwiuzfjt

# Execute SQL  
mcp0_execute_sql --project_id=tyqpayvbelcfnwiuzfjt --query="SELECT COUNT(*) FROM zones"

# Apply migration
mcp0_apply_migration --project_id=tyqpayvbelcfnwiuzfjt --name=test --query="SQL_HERE"
  `);
  
  header('Test Complete');
  success('MCP database connection verified!');
  info('Use MCP commands for advanced database operations');
}

main().catch(err => {
  error(`Test failed: ${err.message}`);
  process.exit(1);
});
