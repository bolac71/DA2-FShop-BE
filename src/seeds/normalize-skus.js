/**
 * Normalize SKU format for all product variants
 * New format: P{productId:03d}-{COLOR_CODE}-{SIZE}
 * Example: P001-BLK-M, P014-NVY-XL, P003-WHT-42
 *
 * Run: node src/seeds/normalize-skus.js
 */

const { Client } = require('pg');

const DB_CONFIG = {
  host: 'ep-purple-lab-aoxdmkmd.c-2.ap-southeast-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_wAvgRnle94Oc',
  ssl: { rejectUnauthorized: false },
};

// Color ID → short code mapping
const COLOR_CODE = {
  1:  'BLK',   // Đen
  2:  'WHT',   // Trắng
  3:  'GRY',   // Xám ghi
  4:  'NVY',   // Xanh navy
  5:  'BLU',   // Xanh dương
  6:  'OLV',   // Xanh rêu
  7:  'MNT',   // Xanh mint
  8:  'DRD',   // Đỏ đô
  9:  'RED',   // Đỏ tươi
  10: 'PNK',   // Hồng phấn
  11: 'LAV',   // Tím pastel
  12: 'PRP',   // Tím than
  13: 'CRM',   // Vàng kem
  14: 'TER',   // Cam đất
  15: 'BRN',   // Nâu cà phê
  16: 'BGE',   // Nâu be
  17: 'IVR',   // Kem
  18: 'SLV',   // Bạc
  19: 'TEL',   // Xanh cổ vịt
  20: 'CHR',   // Than chì
  21: 'RWH',   // Đỏ trắng
};

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('✅ Connected to Neon DB\n');

  // Load all variants with their product, color, size info
  const variants = await client.query(`
    SELECT pv.id, pv.product_id, pv.color_id, pv.size_id, pv.sku, s.name as size_name
    FROM product_variants pv
    JOIN sizes s ON s.id = pv.size_id
    ORDER BY pv.product_id, pv.id
  `);

  console.log(`📋 Processing ${variants.rows.length} variants...\n`);

  await client.query('BEGIN');

  try {
    // Track SKUs per product to detect duplicates (shouldn't happen but safe)
    const usedSkus = new Set();
    let updated = 0;

    for (const v of variants.rows) {
      const pid = String(v.product_id).padStart(3, '0');
      const colorCode = COLOR_CODE[v.color_id] ?? `C${v.color_id}`;
      // Size: use name directly (already short: M, L, XL, 40, 41, Free Size → FRSZ)
      let sizeCode = v.size_name.toUpperCase()
        .replace(/\s+/g, '')    // remove spaces
        .replace('FREESIZE', 'FS')
        .replace('FREESZ', 'FS')
        .replace('NHỎ', 'SM')
        .replace('VỪA', 'MD')
        .replace('LỚN', 'LG');

      let newSku = `P${pid}-${colorCode}-${sizeCode}`;

      // Handle collision (shouldn't happen with unique product/color/size combos)
      if (usedSkus.has(newSku)) {
        newSku = `${newSku}-${v.id}`;
      }
      usedSkus.add(newSku);

      await client.query(
        'UPDATE product_variants SET sku = $1, updated_at = NOW() WHERE id = $2',
        [newSku, v.id]
      );
      updated++;
    }

    await client.query('COMMIT');
    console.log(`✅ Updated ${updated} SKUs successfully!\n`);

    // Preview new SKUs
    const preview = await client.query(`
      SELECT pv.id, pv.sku, p.name as product, c.name as color, s.name as size
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      JOIN colors c ON c.id = pv.color_id
      JOIN sizes s ON s.id = pv.size_id
      ORDER BY pv.id LIMIT 20
    `);
    console.log('=== NEW SKU PREVIEW (first 20) ===');
    preview.rows.forEach(v =>
      console.log(`  #${v.id} ${v.sku.padEnd(18)} | ${v.product} | ${v.color} | ${v.size}`)
    );

    // Stats
    const stats = await client.query(`
      SELECT AVG(LENGTH(sku))::numeric(5,1) as avg_len,
             MAX(LENGTH(sku)) as max_len, MIN(LENGTH(sku)) as min_len
      FROM product_variants WHERE sku IS NOT NULL
    `);
    console.log('\n=== NEW SKU STATS ===');
    console.log(JSON.stringify(stats.rows[0], null, 2));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Rolled back:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
