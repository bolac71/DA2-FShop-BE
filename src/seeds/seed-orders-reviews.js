/**
 * Seed script: Orders → Inventory Transactions → Reviews
 * Run: node src/seeds/seed-orders-reviews.js
 * 
 * Creates realistic e-commerce seed data following proper business flow:
 * 1. Seed ~70 orders across 5 users with various statuses
 * 2. Create inventory EXPORT transactions for all orders
 * 3. Deduct stock accordingly
 * 4. Create reviews for delivered orders
 * 5. Update products.average_rating & products.review_count
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

// ─── SEED USERS ──────────────────────────────────────────────────────────────
const SEED_USERS = [
  { id: 1,  name: 'Nguyễn Đăng Phúc', phone: '0838609516' },
  { id: 4,  name: 'Ngô Minh Trí',     phone: '0901234567' },
  { id: 5,  name: 'Trần Thanh Tâm',   phone: '0912345678' },
  { id: 7,  name: 'Lê Thị Hoa',       phone: '0923456789' },
  { id: 8,  name: 'Phạm Văn Đức',     phone: '0934567890' },
];

// ─── VIETNAMESE ADDRESSES ────────────────────────────────────────────────────
const ADDRESSES = [
  { detail: 'Số 10 Nguyễn Huệ, Phường Bến Nghé', province: 'Thành phố Hồ Chí Minh', district: 'Quận 1',           commune: 'Phường Bến Nghé' },
  { detail: 'Số 25 Lê Lợi, Phường Bến Thành',   province: 'Thành phố Hồ Chí Minh', district: 'Quận 1',           commune: 'Phường Bến Thành' },
  { detail: 'Số 5 Phan Xích Long, P. 2',         province: 'Thành phố Hồ Chí Minh', district: 'Quận Phú Nhuận',   commune: 'Phường 2' },
  { detail: 'Số 88 Cộng Hòa, Phường 4',          province: 'Thành phố Hồ Chí Minh', district: 'Quận Tân Bình',    commune: 'Phường 4' },
  { detail: 'Khu phố 6, Phường Linh Trung',      province: 'Thành phố Hồ Chí Minh', district: 'Thành phố Thủ Đức', commune: 'Phường Linh Trung' },
  { detail: 'Số 15 Hoàng Diệu, Quận Hải Châu',   province: 'Thành phố Đà Nẵng',     district: 'Quận Hải Châu',    commune: 'Phường Nam Dương' },
  { detail: 'Số 30 Trần Phú, Phường Vĩnh Ninh',  province: 'Thành phố Huế',          district: 'Thành phố Huế',    commune: 'Phường Vĩnh Ninh' },
  { detail: 'Số 7 Hoàn Kiếm, Phường Hàng Trống', province: 'Thành phố Hà Nội',       district: 'Quận Hoàn Kiếm',   commune: 'Phường Hàng Trống' },
  { detail: 'Số 120 Cầu Giấy, Phường Dịch Vọng', province: 'Thành phố Hà Nội',       district: 'Quận Cầu Giấy',    commune: 'Phường Dịch Vọng' },
  { detail: 'Số 45 Lê Hồng Phong, TP. Vũng Tàu', province: 'Bà Rịa - Vũng Tàu',    district: 'Thành phố Vũng Tàu', commune: 'Phường 2' },
];

// ─── REVIEW COMMENTS BY RATING ───────────────────────────────────────────────
const REVIEW_COMMENTS = {
  5: [
    'Chất vải rất tốt, mặc mát và thoáng. Shop giao hàng nhanh, đóng gói cẩn thận!',
    'Sản phẩm đẹp lắm, đúng như mô tả, màu sắc chuẩn so với ảnh. Rất hài lòng!',
    'Mình đã mua lần 2 rồi, chất lượng ổn định, không bị phai màu sau khi giặt.',
    'Giao hàng siêu nhanh, hàng nguyên vẹn không bị móp méo. Sẽ ủng hộ tiếp!',
    'Vừa nhận hàng, đẹp hơn cả mình tưởng tượng. Size đúng chuẩn, mặc vào rất vừa.',
    'Chất lượng tốt so với giá tiền. Shop tư vấn nhiệt tình, giao hàng đúng hẹn.',
    'Hàng đẹp, vải mềm, đường may chỉn chu. Mình rất thích! 5 sao xứng đáng.',
    'Mua về tặng bạn bè, ai cũng khen đẹp. Chắc chắn sẽ quay lại mua thêm.',
    'Đúng hàng, đúng size, đúng màu. Nhận hàng trong ngày, shop uy tín!',
    'Thiết kế tinh tế, phù hợp đi làm hoặc đi chơi đều được. Rất ưng ý!',
  ],
  4: [
    'Sản phẩm đẹp, chất ổn. Chỉ hơi rộng một tí so với size chart, nên lấy size nhỏ hơn.',
    'Nhìn chung khá tốt, màu sắc đúng với ảnh. Giao hàng hơi chậm một ngày nhưng chấp nhận được.',
    'Chất vải tốt, may chắc chắn. Trừ 1 sao vì đóng gói hơi ẩu, may là hàng không bị hỏng.',
    'Hài lòng 80%, chỉ tiếc là màu thực tế hơi đậm hơn trong ảnh một chút.',
    'Vải mềm, thoải mái khi mặc. Cần chú ý size vì hàng hơi nhỏ so với bảng size.',
    'Shop phản hồi nhanh, hàng chất lượng. Sẽ mua thêm nếu shop ra mẫu mới.',
    'Đường may chắc, vải dày dặn. Tuy nhiên mình phải đợi hơi lâu để nhận hàng.',
    'Sản phẩm đúng mô tả, giá hợp lý. Mình rất thích thiết kế, chỉ cần cải thiện thêm về giao hàng.',
  ],
  3: [
    'Bình thường thôi, không quá tệ nhưng cũng không xuất sắc. Chất vải ổn, phù hợp với giá.',
    'Hàng đến tay trong tình trạng okay, nhưng chất liệu chưa được như kỳ vọng.',
    'Size hơi lệch, phải đổi sang size khác. Shop hỗ trợ đổi hàng nhanh nên cũng ổn.',
    'Trông ổn nhưng sau 2 lần giặt bắt đầu phai màu nhẹ. Vẫn chấp nhận được với giá này.',
    'Chất vải trung bình, phù hợp mặc ở nhà. Không nên mặc đi sự kiện quan trọng.',
    'Mình không hài lòng lắm về hoàn thiện sản phẩm nhưng đủ dùng. Giá này thì tạm ổn.',
  ],
  2: [
    'Màu hơi khác ảnh, chất vải trung bình. Giao hàng chậm hơn dự kiến 2 ngày.',
    'Sản phẩm không đúng như mô tả, kích thước bé hơn trên ảnh. Hơi thất vọng.',
    'Chất lượng không tương xứng giá tiền. Đường may có chỗ chưa chắc. Sẽ không mua lại.',
    'Hàng đến bị nhăn nhiều, phải là rất lâu. Màu nhạt hơn trong ảnh khá nhiều.',
  ],
  1: [
    'Rất thất vọng, sản phẩm không đúng mô tả. Size bị lệch, màu khác hoàn toàn.',
    'Hàng giả, chất liệu kém hơn ảnh nhiều. Đã liên hệ shop nhưng phản hồi chậm.',
    'Không hài lòng chút nào. Sản phẩm đến tay bị lỗi, đường chỉ bị sổ ngay từ đầu.',
  ],
};

// Rating distribution weights [1⭐, 2⭐, 3⭐, 4⭐, 5⭐]
const RATING_WEIGHTS = [3, 7, 15, 30, 45]; // sum = 100

function weightedRating() {
  let r = Math.random() * 100;
  for (let i = 0; i < RATING_WEIGHTS.length; i++) {
    r -= RATING_WEIGHTS[i];
    if (r <= 0) return i + 1;
  }
  return 5;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── ORDER STATUS DISTRIBUTION ────────────────────────────────────────────────
// For each user: 8 delivered + 2 confirmed + 2 pending + 1 in_transit + 1 awaiting_pickup
const STATUS_PLAN = [
  ...Array(8).fill('delivered'),
  ...Array(2).fill('confirmed'),
  ...Array(2).fill('pending'),
  'in_transit',
  'awaiting_pickup',
];

// ─── MAIN SEED FUNCTION ───────────────────────────────────────────────────────
async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('✅ Connected to Neon DB\n');

  try {
    // Load all variants with sufficient stock
    const variantsRes = await client.query(`
      SELECT pv.id as variant_id, pv.product_id, p.name as product_name, p.price, i.quantity as stock, i.id as inventory_id
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      JOIN inventories i ON i.variant_id = pv.id
      WHERE i.quantity > 3 AND pv.is_active = true AND p.is_active = true
      ORDER BY p.id, pv.id
    `);
    const variants = variantsRes.rows;
    console.log(`📦 Loaded ${variants.length} variants with stock > 3\n`);

    // Track used variants per round to ensure variety
    let variantPointer = 0;
    function nextVariant() {
      const v = variants[variantPointer % variants.length];
      variantPointer++;
      return v;
    }

    // Shuffle STATUS_PLAN for each user
    function shuffleStatuses() {
      return [...STATUS_PLAN].sort(() => Math.random() - 0.5);
    }

    // Collect delivered order items for review seeding
    const deliveredOrderItems = [];

    // Start transaction
    await client.query('BEGIN');

    let totalOrders = 0;
    let totalItems = 0;

    for (const user of SEED_USERS) {
      console.log(`👤 Seeding orders for user#${user.id} (${user.name})...`);
      const statuses = shuffleStatuses();

      for (const status of statuses) {
        const addr = randomFrom(ADDRESSES);
        const paymentMethod = randomFrom(['cod', 'momo', null]);
        const shippingMethod = randomFrom(['standard', 'express']);
        const shippingFee = shippingMethod === 'express' ? 50000 : 30000;

        // 1-2 items per order
        const itemCount = randomInt(1, 2);
        const orderItems = [];
        let totalAmount = shippingFee;

        for (let i = 0; i < itemCount; i++) {
          const v = nextVariant();
          const qty = randomInt(1, 2);
          orderItems.push({ variant: v, qty, price: Number(v.price) });
          totalAmount += Number(v.price) * qty;
        }

        // Insert order
        const orderRes = await client.query(`
          INSERT INTO orders (
            user_id, recipient_name, recipient_phone, detail_address,
            province, district, commune, status, total_amount,
            shipping_method, shipping_fee, payment_method,
            created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
            NOW() - INTERVAL '${randomInt(1, 60)} days',
            NOW() - INTERVAL '${randomInt(0, 2)} days'
          ) RETURNING id
        `, [
          user.id, user.name, user.phone, addr.detail,
          addr.province, addr.district, addr.commune,
          status, totalAmount, shippingMethod, shippingFee, paymentMethod
        ]);
        const orderId = orderRes.rows[0].id;
        totalOrders++;

        // Insert order items + inventory transactions
        for (const item of orderItems) {
          await client.query(`
            INSERT INTO order_items (order_id, variant_id, quantity, price, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
          `, [orderId, item.variant.variant_id, item.qty, item.price]);
          totalItems++;

          // Inventory EXPORT transaction (admin user#2 performs it)
          await client.query(`
            INSERT INTO inventory_transactions (variant_id, user_id, type, quantity, note, created_at)
            VALUES ($1, $2, 'EXPORT', $3, $4, NOW())
          `, [
            item.variant.variant_id, 2, item.qty,
            `Xuất kho - Đơn hàng #${orderId} (seed data)`,
          ]);

          // Deduct stock
          await client.query(`
            UPDATE inventories SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
            WHERE variant_id = $2
          `, [item.qty, item.variant.variant_id]);

          // Collect for review seeding
          if (status === 'delivered') {
            deliveredOrderItems.push({
              orderId,
              userId: user.id,
              variantId: item.variant.variant_id,
              productId: item.variant.product_id,
            });
          }
        }

        process.stdout.write('.');
      }
      console.log(` ✓ ${STATUS_PLAN.length} orders`);
    }

    console.log(`\n📝 Total orders created: ${totalOrders}, items: ${totalItems}`);
    console.log(`📝 Delivered order items eligible for review: ${deliveredOrderItems.length}\n`);

    // ─── SEED REVIEWS ─────────────────────────────────────────────────────────
    console.log('⭐ Seeding reviews...');
    let reviewCount = 0;
    const affectedProductIds = new Set();

    for (const item of deliveredOrderItems) {
      const rating = weightedRating();
      const comments = REVIEW_COMMENTS[rating];
      const comment = randomFrom(comments);
      const moderationStatus = rating >= 3 ? 'approved' : (Math.random() > 0.5 ? 'pending' : 'approved');

      await client.query(`
        INSERT INTO reviews (user_id, order_id, variant_id, rating, comment, moderation_status, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW() - INTERVAL '${randomInt(0, 10)} days', NOW())
        ON CONFLICT DO NOTHING
      `, [item.userId, item.orderId, item.variantId, rating, comment, moderationStatus]);

      affectedProductIds.add(item.productId);
      reviewCount++;
    }

    console.log(`✅ Inserted ${reviewCount} reviews for ${affectedProductIds.size} products\n`);

    // ─── UPDATE PRODUCT STATS ──────────────────────────────────────────────────
    console.log('📊 Updating product average_rating and review_count...');
    for (const productId of affectedProductIds) {
      await client.query(`
        UPDATE products SET
          average_rating = COALESCE((
            SELECT ROUND(AVG(r.rating)::numeric, 1)
            FROM reviews r
            JOIN product_variants pv ON pv.id = r.variant_id
            WHERE pv.product_id = $1 AND r.is_active = true AND r.moderation_status = 'approved'
          ), 0),
          review_count = (
            SELECT COUNT(*)
            FROM reviews r
            JOIN product_variants pv ON pv.id = r.variant_id
            WHERE pv.product_id = $1 AND r.is_active = true
          ),
          updated_at = NOW()
        WHERE id = $1
      `, [productId]);
    }
    console.log(`✅ Updated stats for ${affectedProductIds.size} products\n`);

    // Commit
    await client.query('COMMIT');
    console.log('🎉 All done! Transaction committed successfully.\n');

    // ─── SUMMARY REPORT ────────────────────────────────────────────────────────
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE id > 67) as new_orders,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT COUNT(DISTINCT pv.product_id) FROM reviews r JOIN product_variants pv ON pv.id = r.variant_id) as products_with_reviews,
        (SELECT COUNT(*) FROM products WHERE review_count > 0) as products_updated
    `);
    console.log('=== FINAL SUMMARY ===');
    console.log(JSON.stringify(summary.rows[0], null, 2));

    const topProducts = await client.query(`
      SELECT name, average_rating, review_count 
      FROM products WHERE review_count > 0 
      ORDER BY review_count DESC LIMIT 10
    `);
    console.log('\nTop 10 products by review count:');
    topProducts.rows.forEach(p => console.log(`  ${p.name}: ${p.review_count} reviews, avg ${p.average_rating}⭐`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error! Transaction rolled back.');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
