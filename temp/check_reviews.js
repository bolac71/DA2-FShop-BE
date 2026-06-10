const { Client } = require('pg');
const client = new Client({
  host: 'ep-purple-lab-aoxdmkmd.c-2.ap-southeast-1.aws.neon.tech',
  port: 5432, database: 'neondb', user: 'neondb_owner',
  password: 'npg_wAvgRnle94Oc', ssl: { rejectUnauthorized: false }
});
async function main() {
  await client.connect();

  const colors = await client.query('SELECT id, name FROM colors ORDER BY id');
  console.log('=== ALL COLORS ===');
  colors.rows.forEach(c => console.log(`  #${c.id}: ${c.name}`));

  const sizes = await client.query('SELECT id, name FROM sizes ORDER BY id');
  console.log('\n=== ALL SIZES ===');
  sizes.rows.forEach(s => console.log(`  #${s.id}: ${s.name}`));

  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
