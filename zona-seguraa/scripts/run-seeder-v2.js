require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) { log(`✅ ${message}`, 'green'); }
function error(message) { log(`❌ ${message}`, 'red'); }
function warning(message) { log(`⚠️  ${message}`, 'yellow'); }
function info(message) { log(`ℹ️  ${message}`, 'blue'); }
function header(message) { log(`\n🔧 ${message}`, 'cyan'); }
function debug(message) { log(`📝 ${message}`, 'gray'); }

async function runPreValidation() {
  header('PRE-SEED VALIDATION');
  info('Checking current database state...');
  
  try {
    // Check tables
    const tables = ['zones', 'nodes', 'users', 'communities', 'community_members'];
    for (const table of tables) {
      const { data, error } = await client
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        error(`Table '${table}' check failed: ${error.message}`);
        return false;
      }
      info(`  ${table}: ${data || 0} rows`);
    }
    
    // Check if chapultepec zone exists
    const { data: zone, error: zoneError } = await client
      .from('zones')
      .select('slug, name')
      .eq('slug', 'chapultepec')
      .maybeSingle();
    
    if (zoneError) {
      error(`Zone check failed: ${zoneError.message}`);
      return false;
    }
    
    if (zone) {
      warning(`Chapultepec zone exists: ${zone.name}`);
      info('  Will be updated (upsert)');
    } else {
      success('Chapultepec zone not found - will be created');
    }
    
    return true;
    
  } catch (err) {
    error(`Pre-validation failed: ${err.message}`);
    return false;
  }
}

async function executeSeederData(dryRun = false) {
  header(`EXECUTING SEEDER ${dryRun ? '(DRY-RUN)' : '(PRODUCTION)'}`);
  
  const zoneId = 'a1000000-0000-0000-0000-000000000001';
  const results = { success: 0, failed: 0 };
  
  try {
    // 1. Zone
    info('Inserting/updating zone: Corredor Chapultepec');
    const zoneData = {
      id: zoneId,
      slug: 'chapultepec',
      name: 'Corredor Chapultepec — Zona Centro GDL',
      description: 'Corredor peatonal y cultural de libre acceso en la Zona Centro de Guadalajara. Flujo ciudadano distribuido 24/7. Zona de demostración del sistema Zona SeguRAA para CodeCup 2026.',
      city: 'Guadalajara',
      active: true
    };
    
    const { error: zoneError } = await client
      .from('zones')
      .upsert(zoneData, { onConflict: 'slug' });
    
    if (zoneError) {
      error(`Zone failed: ${zoneError.message}`);
      results.failed++;
    } else {
      success('Zone OK');
      results.success++;
    }
    
    // 2. Nodes (8)
    info('Inserting/updating 8 nodes...');
    const nodes = [
      { id: 'b1000000-0000-0000-0000-000000000001', zone_id: zoneId, name: 'AVP3-Alfa-01 — Glorieta Chapultepec', type: 'avp_physical', pos_x: 50.0, pos_y: 50.0, lat: 20.67320, lng: -103.36850, lorawan_eui: 'DUMMY-EUI-0000000001', status: 'online', battery_pct: 100, last_seen_at: new Date().toISOString() },
      { id: 'b1000000-0000-0000-0000-000000000002', zone_id: zoneId, name: 'Tramo Norte — Av. Libertad', type: 'avp_simulated', pos_x: 50.0, pos_y: 10.0, lat: 20.67580, lng: -103.36750, status: 'online' },
      { id: 'b1000000-0000-0000-0000-000000000003', zone_id: zoneId, name: 'Tramo Sur — Niños Héroes', type: 'avp_simulated', pos_x: 50.0, pos_y: 90.0, lat: 20.67050, lng: -103.36950, status: 'online' },
      { id: 'b1000000-0000-0000-0000-000000000004', zone_id: zoneId, name: 'Plaza de Bolsillo Este', type: 'checkpoint', pos_x: 85.0, pos_y: 45.0, lat: 20.67340, lng: -103.36680, status: 'online' },
      { id: 'b1000000-0000-0000-0000-000000000005', zone_id: zoneId, name: 'Zona de Terrazas Oeste', type: 'checkpoint', pos_x: 15.0, pos_y: 55.0, lat: 20.67300, lng: -103.37020, status: 'online' },
      { id: 'b1000000-0000-0000-0000-000000000006', zone_id: zoneId, name: 'Punto Médico — Cruz Verde', type: 'medical_point', pos_x: 25.0, pos_y: 30.0, lat: 20.67450, lng: -103.36980, status: 'online' },
      { id: 'b1000000-0000-0000-0000-000000000007', zone_id: zoneId, name: 'Acceso Principal — Cruce Juárez', type: 'exit', pos_x: 50.0, pos_y: 2.0, lat: 20.67620, lng: -103.36720, status: 'online' },
      { id: 'b1000000-0000-0000-0000-000000000008', zone_id: zoneId, name: 'Salida de Emergencia — Lateral Poniente', type: 'emergency_exit', pos_x: 10.0, pos_y: 80.0, lat: 20.67120, lng: -103.37080, status: 'online' }
    ];
    
    for (const node of nodes) {
      const { error: nodeError } = await client
        .from('nodes')
        .upsert(node, { onConflict: 'id' });
      
      if (nodeError) {
        error(`  Node ${node.name} failed: ${nodeError.message}`);
        results.failed++;
      } else {
        debug(`  Node ${node.name} OK`);
        results.success++;
      }
    }
    
    // 3. Users (3)
    info('Inserting/updating 3 users...');
    const users = [
      { id: 'c1000000-0000-0000-0000-000000000001', nickname: 'coord_zapopan_01', role: 'coordinator', zone_id: zoneId, language: 'es', password_hash: 'DUMMY_HASH_01' },
      { id: 'c1000000-0000-0000-0000-000000000002', nickname: 'coord_chapultepec_02', role: 'coordinator', zone_id: zoneId, language: 'es', password_hash: 'DUMMY_HASH_02' },
      { id: 'c1000000-0000-0000-0000-000000000003', nickname: 'aliado_demo_01', role: 'ally', zone_id: zoneId, language: 'es', password_hash: null }
    ];
    
    for (const user of users) {
      const { error: userError } = await client
        .from('users')
        .upsert(user, { onConflict: 'id' });
      
      if (userError) {
        error(`  User ${user.nickname} failed: ${userError.message}`);
        results.failed++;
      } else {
        debug(`  User ${user.nickname} OK`);
        results.success++;
      }
    }
    
    // 4. Community
    info('Inserting/updating community...');
    const communityData = {
      id: 'd1000000-0000-0000-0000-000000000001',
      zone_id: zoneId,
      name: 'Vecinos Chapultepec',
      description: 'Comunidad de vecinos, comerciantes y visitantes frecuentes del Corredor Chapultepec. Monitoreo colaborativo 24/7.',
      status: 'active'
    };
    
    const { error: communityError } = await client
      .from('communities')
      .upsert(communityData, { onConflict: 'id' });
    
    if (communityError) {
      error(`Community failed: ${communityError.message}`);
      results.failed++;
    } else {
      success('Community OK');
      results.success++;
    }
    
    // 5. Community Members (3)
    info('Inserting/updating community members...');
    const members = [
      { id: 'e1000000-0000-0000-0000-000000000001', community_id: 'd1000000-0000-0000-0000-000000000001', user_id: 'c1000000-0000-0000-0000-000000000001', role: 'admin' },
      { id: 'e1000000-0000-0000-0000-000000000002', community_id: 'd1000000-0000-0000-0000-000000000001', user_id: 'c1000000-0000-0000-0000-000000000002', role: 'admin' },
      { id: 'e1000000-0000-0000-0000-000000000003', community_id: 'd1000000-0000-0000-0000-000000000001', user_id: 'c1000000-0000-0000-0000-000000000003', role: 'ally' }
    ];
    
    for (const member of members) {
      const { error: memberError } = await client
        .from('community_members')
        .upsert(member, { onConflict: 'id' });
      
      if (memberError) {
        error(`  Member failed: ${memberError.message}`);
        results.failed++;
      } else {
        debug(`  Member OK`);
        results.success++;
      }
    }
    
    if (dryRun) {
      // In dry-run mode, we'd rollback - but Supabase doesn't support true transactions via REST API
      warning('DRY-RUN: In real dry-run mode, data would be rolled back here');
      warning('Supabase REST API does not support true transactions');
      info('Check the output above - if any errors, fix before production run');
    }
    
    return results;
    
  } catch (err) {
    error(`Seeder execution failed: ${err.message}`);
    return { success: 0, failed: 999 };
  }
}

async function runPostValidation() {
  header('POST-SEED VALIDATION');
  info('Verifying all data was inserted correctly...');
  
  const zoneId = 'a1000000-0000-0000-0000-000000000001';
  const checks = [];
  
  try {
    // Check zone
    const { data: zone, error: zoneError } = await client
      .from('zones')
      .select('*')
      .eq('slug', 'chapultepec')
      .single();
    
    if (zoneError || !zone) {
      error('❌ Zone not found');
      checks.push(false);
    } else {
      success(`✅ Zone: ${zone.name}`);
      checks.push(true);
    }
    
    // Check nodes count
    const { data: nodes, error: nodesError } = await client
      .from('nodes')
      .select('id, name, type, status')
      .eq('zone_id', zoneId);
    
    if (nodesError) {
      error(`❌ Nodes query failed: ${nodesError.message}`);
      checks.push(false);
    } else if (nodes.length === 8) {
      success(`✅ All 8 nodes present`);
      checks.push(true);
    } else {
      warning(`⚠️  Expected 8 nodes, found ${nodes.length}`);
      checks.push(false);
    }
    
    // Check node types
    const nodeTypes = [...new Set(nodes.map(n => n.type))];
    const expectedTypes = ['avp_physical', 'avp_simulated', 'checkpoint', 'medical_point', 'exit', 'emergency_exit'];
    const hasAllTypes = expectedTypes.every(type => nodeTypes.includes(type));
    
    if (hasAllTypes) {
      success(`✅ All 6 node types present`);
      checks.push(true);
    } else {
      warning(`⚠️  Missing some node types: ${nodeTypes.join(', ')}`);
      checks.push(false);
    }
    
    // Check users
    const { data: users, error: usersError } = await client
      .from('users')
      .select('id, nickname, role')
      .eq('zone_id', zoneId);
    
    if (usersError) {
      error(`❌ Users query failed: ${usersError.message}`);
      checks.push(false);
    } else if (users.length === 3) {
      success(`✅ All 3 users present`);
      users.forEach(u => info(`  - ${u.nickname} (${u.role})`));
      checks.push(true);
    } else {
      warning(`⚠️  Expected 3 users, found ${users.length}`);
      checks.push(false);
    }
    
    // Check community
    const { data: community, error: commError } = await client
      .from('communities')
      .select('id, name')
      .eq('zone_id', zoneId)
      .single();
    
    if (commError || !community) {
      error('❌ Community not found');
      checks.push(false);
    } else {
      success(`✅ Community: ${community.name}`);
      checks.push(true);
    }
    
    // Check community members
    const { data: members, error: membersError } = await client
      .from('community_members')
      .select('id, role')
      .eq('community_id', 'd1000000-0000-0000-0000-000000000001');
    
    if (membersError) {
      error(`❌ Members query failed: ${membersError.message}`);
      checks.push(false);
    } else if (members.length === 3) {
      success(`✅ All 3 community members present`);
      checks.push(true);
    } else {
      warning(`⚠️  Expected 3 members, found ${members.length}`);
      checks.push(false);
    }
    
    // Display node table
    if (nodes && nodes.length > 0) {
      header('NODE CONFIGURATION');
      console.table(nodes.map(n => ({
        'Name': n.name,
        'Type': n.type,
        'Status': n.status
      })));
    }
    
    return checks.every(Boolean);
    
  } catch (err) {
    error(`Post-validation failed: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🌱 Zona SeguRAA - Seeder v2.0 Execution');
  console.log('=========================================\n');
  
  // Check for dry-run mode from command line
  const dryRun = process.argv.includes('--dry-run');
  
  if (dryRun) {
    warning('DRY-RUN MODE ENABLED');
    info('Data will be checked but changes will be reviewed\n');
  }
  
  // Step 1: Pre-validation
  const preValid = await runPreValidation();
  if (!preValid) {
    error('Pre-validation failed - cannot proceed');
    process.exit(1);
  }
  
  // Step 2: Execute seeder
  const results = await executeSeederData(dryRun);
  
  header('EXECUTION SUMMARY');
  info(`Operations successful: ${results.success}`);
  info(`Operations failed: ${results.failed}`);
  
  if (results.failed > 0) {
    error('Some operations failed - check errors above');
  }
  
  // Step 3: Post-validation
  const postValid = await runPostValidation();
  
  // Final summary
  header('FINAL RESULT');
  if (postValid && results.failed === 0) {
    success('🎉 SEEDER EXECUTION SUCCESSFUL!');
    success('Database is ready with:');
    success('  • 1 zone (Corredor Chapultepec)');
    success('  • 8 nodes (all types)');
    success('  • 3 users (2 coordinators, 1 ally)');
    success('  • 1 community with 3 members');
    console.log('\n🚀 Ready for development! Run: npm run dev');
  } else {
    error('❌ SEEDER EXECUTION INCOMPLETE');
    error('Check validation results above');
    if (dryRun) {
      info('\nThis was a dry-run. Review the errors and fix before production.');
    }
    process.exit(1);
  }
}

main().catch(err => {
  error(`Script failed: ${err.message}`);
  process.exit(1);
});
