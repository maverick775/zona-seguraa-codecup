#!/usr/bin/env node

/**
 * Supabase Connection Test Script
 * 
 * Tests connection to Supabase cloud service using local .env.local credentials
 * Validates database schema and seeded data from seederZS.txt
 * 
 * Usage: node scripts/test-supabase-connection.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function success(message) { log(`✅ ${message}`, 'green') }
function error(message) { log(`❌ ${message}`, 'red') }
function warning(message) { log(`⚠️  ${message}`, 'yellow') }
function info(message) { log(`ℹ️  ${message}`, 'blue') }
function header(message) { log(`\n🔧 ${message}`, 'cyan') }

// Validate required environment variables
function validateEnvironment() {
  header('Validating Environment Variables')
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    error('Missing required environment variables:')
    missing.forEach(key => error(`  - ${key}`))
    error('\nCreate a .env.local file with your Supabase credentials:')
    error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
    error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key')
    error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
    return false
  }
  
  success('All required environment variables found')
  return true
}

// Test basic connectivity
async function testConnection() {
  header('Testing Supabase Connection')
  
  try {
    // Test with anon key (public client)
    const publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data, error: publicError } = await publicClient
      .from('zones')
      .select('count', { count: 'exact', head: true })
    
    if (publicError) {
      warning('Public client connection failed:')
      warning(publicError.message)
    } else {
      success('Public client connection successful')
    }
    
    // Test with service role key (admin client)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { error: adminError } = await adminClient
      .from('zones')
      .select('count', { count: 'exact', head: true })
    
    if (adminError) {
      error('Admin client connection failed:')
      error(adminError.message)
      return false
    }
    
    success('Admin client connection successful')
    return adminClient
    
  } catch (err) {
    error(`Connection failed: ${err.message}`)
    return false
  }
}

// Test database schema
async function testSchema(client) {
  header('Testing Database Schema')
  
  const expectedTables = [
    'zones',
    'nodes', 
    'users',
    'alerts',
    'votes',
    'communities',
    'community_members'
  ]
  
  try {
    // Check if tables exist by querying each one
    for (const table of expectedTables) {
      const { data, error } = await client
        .from(table)
        .select('count', { count: 'exact', head: true })
      
      if (error) {
        error(`Table '${table}' not accessible: ${error.message}`)
        return false
      } else {
        success(`Table '${table}' accessible (${data || 0} rows)`)
      }
    }
    
    return true
    
  } catch (err) {
    error(`Schema validation failed: ${err.message}`)
    return false
  }
}

// Test seeded data
async function testSeededData(client) {
  header('Testing Seeded Data')
  
  try {
    // Check if chapultepec zone exists
    const { data: zones, error: zoneError } = await client
      .from('zones')
      .select('*')
      .eq('slug', 'chapultepec')
      .single()
    
    if (zoneError || !zones) {
      error('Chapultepec zone not found. Run seederZS.txt first.')
      return false
    }
    
    success(`Zone found: ${zones.name}`)
    
    // Check nodes count and types
    const { data: nodes, error: nodesError } = await client
      .from('nodes')
      .select('*')
      .eq('zone_id', zones.id)
    
    if (nodesError) {
      error(`Failed to query nodes: ${nodesError.message}`)
      return false
    }
    
    if (nodes.length !== 8) {
      warning(`Expected 8 nodes, found ${nodes.length}`)
    } else {
      success(`Found all 8 nodes`)
    }
    
    // Verify node types
    const nodeTypes = [...new Set(nodes.map(n => n.type))]
    info(`Node types: ${nodeTypes.join(', ')}`)
    
    // Check users
    const { data: users, error: usersError } = await client
      .from('users')
      .select('*')
      .eq('zone_id', zones.id)
    
    if (usersError) {
      error(`Failed to query users: ${usersError.message}`)
      return false
    }
    
    success(`Found ${users.length} users`)
    
    // Check communities
    const { data: communities, error: communitiesError } = await client
      .from('communities')
      .select('*')
      .eq('zone_id', zones.id)
    
    if (communitiesError) {
      error(`Failed to query communities: ${communitiesError.message}`)
      return false
    }
    
    success(`Found ${communities.length} communities`)
    
    return true
    
  } catch (err) {
    error(`Seeded data validation failed: ${err.message}`)
    return false
  }
}

// Run verification query from seederZS.txt
async function runVerificationQuery(client) {
  header('Running Verification Query')
  
  const verificationQuery = `
    SELECT
      n.name                        AS nodo,
      n.type                        AS tipo,
      n.status                      AS estado,
      COALESCE(n.lorawan_eui, '— simulado —') AS eui,
      ROUND(n.pos_x::numeric, 1)    AS "pos_x%",
      ROUND(n.pos_y::numeric, 1)    AS "pos_y%",
      n.lat,
      n.lng
    FROM nodes n
    JOIN zones z ON z.id = n.zone_id
    WHERE z.slug = 'chapultepec'
    ORDER BY n.type DESC, n.name
  `
  
  try {
    const { data, error } = await client
      .from('nodes')
      .select(`
        name,
        type,
        status,
        lorawan_eui,
        pos_x,
        pos_y,
        lat,
        lng,
        zones!inner(slug)
      `)
      .eq('zones.slug', 'chapultepec')
      .order('type', { ascending: false })
      .order('name')
    
    if (error) {
      error(`Verification query failed: ${error.message}`)
      return false
    }
    
    console.log('\n📊 Node Verification Results:')
    console.table(data.map(node => ({
      'Node': node.name,
      'Type': node.type,
      'Status': node.status,
      'EUI': node.lorawan_eui || '— simulado —',
      'Pos X%': node.pos_x,
      'Pos Y%': node.pos_y,
      'Lat': node.lat,
      'Lng': node.lng
    })))
    
    success(`Verification complete: ${data.length} nodes found`)
    return true
    
  } catch (err) {
    error(`Verification query failed: ${err.message}`)
    return false
  }
}

// Main execution function
async function main() {
  console.log('🚀 Supabase Connection Test - Zona SeguRAA')
  console.log('==========================================')
  
  // Step 1: Validate environment
  if (!validateEnvironment()) {
    process.exit(1)
  }
  
  // Step 2: Test connection
  const client = await testConnection()
  if (!client) {
    process.exit(1)
  }
  
  // Step 3: Test schema
  if (!await testSchema(client)) {
    process.exit(1)
  }
  
  // Step 4: Test seeded data
  if (!await testSeededData(client)) {
    process.exit(1)
  }
  
  // Step 5: Run verification query
  if (!await runVerificationQuery(client)) {
    process.exit(1)
  }
  
  header('Test Summary')
  success('All tests passed! 🎉')
  info('Your Supabase connection is working correctly.')
  info('Database schema and seeded data are valid.')
  
  console.log('\n📝 Next Steps:')
  console.log('1. Start development server: npm run dev')
  console.log('2. Visit: http://localhost:3000')
  console.log('3. Verify the application loads the Chapultepec zone data')
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  error(`Unhandled Rejection at: ${promise}`)
  error(`Reason: ${reason}`)
  process.exit(1)
})

// Run the script
main().catch(err => {
  error(`Script failed: ${err.message}`)
  process.exit(1)
})
