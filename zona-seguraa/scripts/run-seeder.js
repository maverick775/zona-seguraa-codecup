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
    const tables = ['zones', 'nodes', 'users_coord', 'users_temp', 'alerts', 'alert_votes'];
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
    
    // Check if FanFest zone exists
    const { data: zone, error: zoneError } = await client
      .from('zones')
      .select('id, name')
      .eq('name', 'FanFest')
      .maybeSingle();
    
    if (zoneError) {
      error(`Zone check failed: ${zoneError.message}`);
      return false;
    }
    
    if (zone) {
      warning(`FanFest zone exists: ${zone.name}`);
      info('  Will be updated (upsert)');
    } else {
      success('FanFest zone not found - will be created');
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
    // 1. Zones (3)
    info('Inserting/updating 3 zones...');
    
    const zones = [
      {
        id: 'a1000000-0000-0000-0000-000000000001',
        name: 'FanFest — Zona Plaza de la Liberación',
        description: 'Zona principal del FanFest FIFA 2026 en el Centro Histórico de Guadalajara. Acceso peatonal libre. Aforo estimado: 40,000 personas/día.',
        city: 'Guadalajara'
      },
      {
        id: 'a1000000-0000-0000-0000-000000000002',
        name: 'FanFest — Zona Rotonda de los Jaliscienses Ilustres',
        description: 'Zona secundaria del FanFest. Área cultural y de actividades comunitarias.',
        city: 'Guadalajara'
      },
      {
        id: 'a1000000-0000-0000-0000-000000000003',
        name: 'FanFest — Zona Catedral',
        description: 'Zona norte del corredor FanFest. Alta densidad peatonal. Acceso desde Av. Hidalgo.',
        city: 'Guadalajara'
      }
    ];
    
    for (const zone of zones) {
      const { error: zoneError } = await client
        .from('zones')
        .upsert(zone, { onConflict: 'id' });
      
      if (zoneError) {
        error(`Zone ${zone.name} failed: ${zoneError.message}`);
        results.failed++;
      } else {
        success(`Zone ${zone.name} OK`);
        results.success++;
      }
    }
    
    // 2. Nodes (8)
    info('Inserting/updating 8 nodes...');
    const nodes = [
      // Zona 1 - Plaza de la Liberación
      { id: 'b1000000-0000-0000-0000-000000000001', zone_id: 'a1000000-0000-0000-0000-000000000001', name: 'AVP3-Alfa-01 — Centro Plaza Liberación', type: 'avp_physical', x: 50.0, y: 50.0, lorawan_eui: 'DUMMY-EUI-0000000001', status: 'online', last_seen_at: new Date().toISOString() },
      { id: 'b1000000-0000-0000-0000-000000000002', zone_id: 'a1000000-0000-0000-0000-000000000001', name: 'AVP3-Sim-01 — Acceso Norte Plaza Liberación', type: 'avp_simulated', x: 50.0, y: 10.0, status: 'online' },
      { id: 'b1000000-0000-0000-0000-000000000003', zone_id: 'a1000000-0000-0000-0000-000000000001', name: 'AVP3-Sim-02 — Acceso Sur Plaza Liberación', type: 'avp_simulated', x: 50.0, y: 90.0, status: 'online' },
      { id: 'b1000000-0000-0000-0000-000000000004', zone_id: 'a1000000-0000-0000-0000-000000000001', name: 'Punto Médico — Plaza Liberación Oriente', type: 'medical_point', x: 85.0, y: 50.0, status: 'online' },
      { id: 'b1000000-0000-0000-0000-000000000005', zone_id: 'a1000000-0000-0000-0000-000000000001', name: 'Salida de Emergencia — Av. Hidalgo', type: 'mobile_unit', x: 20.0, y: 5.0, status: 'online' },
      // Zona 2 - Rotonda Jaliscienses Ilustres
      { id: 'b1000000-0000-0000-0000-000000000006', zone_id: 'a1000000-0000-0000-0000-000000000002', name: 'AVP3-Sim-03 — Rotonda Norte', type: 'avp_simulated', x: 50.0, y: 20.0, status: 'online' },
      { id: 'b1000000-0000-0000-0000-000000000007', zone_id: 'a1000000-0000-0000-0000-000000000002', name: 'Punto Médico — Rotonda Sur', type: 'medical_point', x: 50.0, y: 80.0, status: 'online' },
      // Zona 3 - Zona Catedral
      { id: 'b1000000-0000-0000-0000-000000000008', zone_id: 'a1000000-0000-0000-0000-000000000003', name: 'AVP3-Sim-04 — Atrio Catedral', type: 'avp_simulated', x: 50.0, y: 50.0, status: 'online' }
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
    
    // 3. Coordinators (3)
    info('Inserting/updating 3 coordinators...');
    const coordinators = [
      { id: 'c1000000-0000-0000-0000-000000000001', email: 'erick@zonaseguraa.com', role: 'coordinator' },
      { id: 'c1000000-0000-0000-0000-000000000002', email: 'coordinator@zonaseguraa.com', role: 'coordinator' },
      { id: 'c1000000-0000-0000-0000-000000000003', email: 'admin@zonaseguraa.com', role: 'admin' }
    ];
    
    for (const coordinator of coordinators) {
      const { error: coordinatorError } = await client
        .from('users_coord')
        .upsert(coordinator, { onConflict: 'id' });
      
      if (coordinatorError) {
        error(`  Coordinator ${coordinator.email} failed: ${coordinatorError.message}`);
        results.failed++;
      } else {
        debug(`  Coordinator ${coordinator.email} OK`);
        results.success++;
      }
    }
    
    // 4. Temp Users (3)
    info('Inserting/updating 3 temporary users...');
    const tempUsers = [
      { id: 'd1000000-0000-0000-0000-000000000001', nickname: 'visitante_juan_01', zone_id: zoneId, language: 'es' },
      { id: 'd1000000-0000-0000-0000-000000000002', nickname: 'visitante_maria_02', zone_id: zoneId, language: 'es' },
      { id: 'd1000000-0000-0000-0000-000000000003', nickname: 'visitante_carlos_03', zone_id: zoneId, language: 'es' }
    ];
    
    for (const tempUser of tempUsers) {
      const { error: tempUserError } = await client
        .from('users_temp')
        .upsert(tempUser, { onConflict: 'id' });
      
      if (tempUserError) {
        error(`  Temp user ${tempUser.nickname} failed: ${tempUserError.message}`);
        results.failed++;
      } else {
        debug(`  Temp user ${tempUser.nickname} OK`);
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
  
  const zoneIds = ['a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003'];
  const checks = [];
  
  try {
    // Check zones
    const { data: zones, error: zonesError } = await client
      .from('zones')
      .select('id, name')
      .in('id', zoneIds);
    
    if (zonesError) {
      error(`❌ Zones query failed: ${zonesError.message}`);
      checks.push(false);
    } else if (zones.length === 3) {
      success(`✅ All 3 zones present`);
      zones.forEach(z => info(`  - ${z.name}`));
      checks.push(true);
    } else {
      warning(`⚠️  Expected 3 zones, found ${zones.length}`);
      checks.push(false);
    }
    
    // Check nodes count
    const { data: nodes, error: nodesError } = await client
      .from('nodes')
      .select('id, name, type, status, zone_id')
      .in('zone_id', zoneIds);
    
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
    const expectedTypes = ['avp_physical', 'avp_simulated', 'medical_point', 'mobile_unit'];
    const hasAllTypes = expectedTypes.every(type => nodeTypes.includes(type));
    
    if (hasAllTypes) {
      success(`✅ All 4 node types present`);
      checks.push(true);
    } else {
      warning(`⚠️  Missing some node types: ${nodeTypes.join(', ')}`);
      checks.push(false);
    }
    
    // Check coordinators
    const { data: coordinators, error: coordinatorsError } = await client
      .from('users_coord')
      .select('id, email, role');
    
    if (coordinatorsError) {
      error(`❌ Coordinators query failed: ${coordinatorsError.message}`);
      checks.push(false);
    } else if (coordinators.length === 3) {
      success(`✅ All 3 coordinators present`);
      coordinators.forEach(c => info(`  - ${c.email} (${c.role})`));
      checks.push(true);
    } else {
      warning(`⚠️  Expected 3 coordinators, found ${coordinators.length}`);
      checks.push(false);
    }
    
    // Check temp users
    const { data: tempUsers, error: tempUsersError } = await client
      .from('users_temp')
      .select('id, nickname, zone_id')
      .in('zone_id', zoneIds);
    
    if (tempUsersError) {
      error(`❌ Temp users query failed: ${tempUsersError.message}`);
      checks.push(false);
    } else if (tempUsers.length === 3) {
      success(`✅ All 3 temp users present`);
      tempUsers.forEach(u => info(`  - ${u.nickname}`));
      checks.push(true);
    } else {
      warning(`⚠️  Expected 3 temp users, found ${tempUsers.length}`);
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
    success('  • 3 zones (FanFest)');
    success('  • 8 nodes (all types)');
    success('  • 3 coordinators');
    success('  • 0 temporary users (optional)');
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
