/**
 * Seed script: Fill reviews for remaining products with 0 reviews
 * Run: node src/seeds/seed-remaining-reviews.js
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

const SEED_USERS = [
  { id: 1,  name: 'Nguyễn Đăng Phúc', phone: '0838609516' },
  { id: 4,  name: 'Ngô Minh Trí',     phone: '0901234567' },
  { id: 5,  name: 'Trần Thanh Tâm',   phone: '0912345678' },
  { id: 7,  name: 'Lê Thị Hoa',       phone: '0923456789' },
  { id: 8,  name: 'Phạm Văn Đức',     phone: '0934567890' },
  { id: 9,  name: 'Bùi Thị Lan',      phone: '0945678901' },
  { id: 10, name: 'Hoàng Văn Minh',   phone: '0956789012' },
  { id: 11, name: 'Vũ Thị Ngọc',      phone: '0967890123' },
];

const ADDRESSES = [
  { detail: 'Số 10 Nguyễn Huệ, P. Bến Nghé',       province: 'Thành phố Hồ Chí Minh', district: 'Quận 1',            commune: 'Phường Bến Nghé' },
  { detail: 'Số 25 Lê Lợi, P. Bến Thành',           province: 'Thành phố Hồ Chí Minh', district: 'Quận 1',            commune: 'Phường Bến Thành' },
  { detail: 'Số 5 Phan Xích Long, P. 2',             province: 'Thành phố Hồ Chí Minh', district: 'Quận Phú Nhuận',    commune: 'Phường 2' },
  { detail: 'Số 88 Cộng Hòa, P. 4',                  province: 'Thành phố Hồ Chí Minh', district: 'Quận Tân Bình',     commune: 'Phường 4' },
  { detail: 'Khu phố 6, P. Linh Trung',              province: 'Thành phố Hồ Chí Minh', district: 'TP. Thủ Đức',       commune: 'Phường Linh Trung' },
  { detail: 'Số 15 Hoàng Diệu, Q. Hải Châu',        province: 'Thành phố Đà Nẵng',     district: 'Quận Hải Châu',     commune: 'Phường Nam Dương' },
  { detail: 'Số 30 Trần Phú, P. Vĩnh Ninh',         province: 'Thành phố Huế',          district: 'Thành phố Huế',     commune: 'Phường Vĩnh Ninh' },
  { detail: 'Số 7 Hoàn Kiếm, P. Hàng Trống',        province: 'Thành phố Hà Nội',       district: 'Quận Hoàn Kiếm',    commune: 'Phường Hàng Trống' },
  { detail: 'Số 120 Cầu Giấy, P. Dịch Vọng',        province: 'Thành phố Hà Nội',       district: 'Quận Cầu Giấy',     commune: 'Phường Dịch Vọng' },
  { detail: 'Số 45 Lê Hồng Phong, TP. Vũng Tàu',   province: 'Bà Rịa - Vũng Tàu',     district: 'TP. Vũng Tàu',      commune: 'Phường 2' },
  { detail: 'Số 33 Nguyễn Trãi, P. Nguyễn Cư Trinh', province: 'Thành phố Hồ Chí Minh', district: 'Quận 1',           commune: 'P. Nguyễn Cư Trinh' },
  { detail: 'Số 77 Điện Biên Phủ, P. Đa Kao',       province: 'Thành phố Hồ Chí Minh', district: 'Quận 1',            commune: 'Phường Đa Kao' },
];

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
    'Vải dày dặn, không bị nhăn, form đẹp. Mặc thoải mái cả ngày không chán.',
    'Nhìn ảnh đã thích, nhận hàng càng thích hơn. Shop làm ăn uy tín lắm!',
    'Đặt hàng tối, sáng hôm sau đã có hàng. Nhanh quá trời! Sản phẩm lại đẹp.',
    'Mình cao 1m68, mua size M vừa chuẩn. Chất liệu mềm mịn, không bị kích ứng da.',
    'Màu sắc đẹp y hệt trong ảnh, không bị chênh lệch. Hài lòng 100%!',
  ],
  4: [
    'Sản phẩm đẹp, chất ổn. Chỉ hơi rộng một tí so với size chart, nên lấy size nhỏ hơn.',
    'Nhìn chung khá tốt, màu sắc đúng với ảnh. Giao hàng hơi chậm một ngày nhưng chấp nhận được.',
    'Chất vải tốt, may chắc chắn. Trừ 1 sao vì đóng gói hơi ẩu, may là hàng không bị hỏng.',
    'Hài lòng 80%, chỉ tiếc là màu thực tế hơi đậm hơn trong ảnh một chút.',
    'Vải mềm, thoải mái khi mặc. Cần chú ý size vì hàng hơi nhỏ so với bảng size.',
    'Shop phản hồi nhanh, hàng chất lượng. Sẽ mua thêm nếu shop ra mẫu mới.',
    'Đường may chắc, vải dày dặn. Tuy nhiên mình phải đợi hơi lâu để nhận hàng.',
    'Sản phẩm đúng mô tả, giá hợp lý. Thiết kế đẹp, chỉ cần cải thiện thêm về giao hàng.',
    'Chất liệu tốt, mặc mát. Hơi tiếc là không có thêm nhiều màu để lựa chọn.',
    'Mình thích kiểu dáng này. Chất vải ổn, sẽ mua thêm màu khác trong thời gian tới.',
    'Đẹp và thoải mái. Giảm 1 sao vì hộp giao hơi bị móp nhưng bên trong vẫn nguyên.',
  ],
  3: [
    'Bình thường thôi, không quá tệ nhưng cũng không xuất sắc. Chất vải ổn, phù hợp với giá.',
    'Hàng đến tay trong tình trạng okay, nhưng chất liệu chưa được như kỳ vọng.',
    'Size hơi lệch, phải đổi sang size khác. Shop hỗ trợ đổi hàng nhanh nên cũng ổn.',
    'Trông ổn nhưng sau 2 lần giặt bắt đầu phai màu nhẹ. Vẫn chấp nhận được với giá này.',
    'Chất vải trung bình, phù hợp mặc ở nhà. Không nên mặc đi sự kiện quan trọng.',
    'Mình không hài lòng lắm về hoàn thiện nhưng đủ dùng. Giá này thì tạm ổn.',
    'Nhận hàng đúng hạn, chất lượng tàm tạm. Có thể thử nhưng đừng kỳ vọng quá cao.',
  ],
  2: [
    'Màu hơi khác ảnh, chất vải trung bình. Giao hàng chậm hơn dự kiến 2 ngày.',
    'Sản phẩm không đúng như mô tả, kích thước bé hơn trên ảnh. Hơi thất vọng.',
    'Chất lượng không tương xứng giá tiền. Đường may có chỗ chưa chắc.',
    'Hàng đến bị nhăn nhiều, phải là rất lâu. Màu nhạt hơn trong ảnh khá nhiều.',
  ],
  1: [
    'Rất thất vọng, sản phẩm không đúng mô tả. Size bị lệch, màu khác hoàn toàn.',
    'Hàng chất liệu kém hơn ảnh nhiều. Đã liên hệ shop nhưng phản hồi chậm.',
    'Không hài lòng chút nào. Sản phẩm đến tay bị lỗi, đường chỉ bị sổ ngay từ đầu.',
  ],
};

const RATING_WEIGHTS = [3, 7, 15, 30, 45];

function weightedRating() {
  let r = Math.random() * 100;
  for (let i = 0; i < RATING_WEIGHTS.length; i++) {
    r -= RATING_WEIGHTS[i];
    if (r <= 0) return i + 1;
  }
  return 5;
}

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('✅ Connected to Neon DB\n');

  // Find products with 0 reviews and get one active variant with stock for each
  const productsWithoutReviews = await client.query(`
    SELECT DISTINCT ON (p.id)
      p.id as product_id, p.name, p.price,
      pv.id as variant_id,
      i.quantity as stock, i.id as inventory_id
    FROM products p
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = true
    JOIN inventories i ON i.variant_id = pv.id
    WHERE p.is_active = true
      AND p.review_count = 0
      AND i.quantity > 0
    ORDER BY p.id, i.quantity DESC
  `);
  
  console.log(`📋 Found ${productsWithoutReviews.rows.length} products with 0 reviews\n`);
  if (productsWithoutReviews.rows.length === 0) {
    console.log('Nothing to seed!');
    await client.end();
    return;
  }

  await client.query('BEGIN');

  try {
    let ordersCreated = 0;
    let reviewsCreated = 0;
    const affectedProductIds = new Set();
    let userIndex = 0;

    for (const product of productsWithoutReviews.rows) {
      // Assign to users round-robin, give each product 2-4 reviews
      const reviewCount = randomInt(2, 4);
      
      for (let i = 0; i < reviewCount; i++) {
        const user = SEED_USERS[userIndex % SEED_USERS.length];
        userIndex++;
        const addr = randomFrom(ADDRESSES);
        const shippingFee = randomFrom([30000, 50000]);
        const shippingMethod = shippingFee === 50000 ? 'express' : 'standard';
        const paymentMethod = randomFrom(['cod', 'momo', null]);
        const qty = 1;
        const totalAmount = Number(product.price) * qty + shippingFee;

        // Create delivered order
        const orderRes = await client.query(`
          INSERT INTO orders (
            user_id, recipient_name, recipient_phone, detail_address,
            province, district, commune, status, total_amount,
            shipping_method, shipping_fee, payment_method,
            created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,'delivered',$8,$9,$10,$11,
            NOW() - INTERVAL '${randomInt(5, 90)} days',
            NOW() - INTERVAL '${randomInt(1, 5)} days'
          ) RETURNING id
        `, [
          user.id, user.name, user.phone, addr.detail,
          addr.province, addr.district, addr.commune,
          totalAmount, shippingMethod, shippingFee, paymentMethod,
        ]);
        const orderId = orderRes.rows[0].id;
        ordersCreated++;

        // Create order item
        await client.query(`
          INSERT INTO order_items (order_id, variant_id, quantity, price, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [orderId, product.variant_id, qty, product.price]);

        // Inventory EXPORT transaction
        await client.query(`
          INSERT INTO inventory_transactions (variant_id, user_id, type, quantity, note, created_at)
          VALUES ($1, 2, 'EXPORT', $2, $3, NOW())
        `, [product.variant_id, qty, `Xuất kho - Đơn hàng #${orderId} (seed data)`]);

        // Deduct stock (don't go below 0)
        await client.query(`
          UPDATE inventories 
          SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
          WHERE variant_id = $2
        `, [qty, product.variant_id]);

        // Create review
        const rating = weightedRating();
        const comment = randomFrom(REVIEW_COMMENTS[rating]);
        const moderationStatus = rating >= 3 ? 'approved' : (Math.random() > 0.4 ? 'approved' : 'pending');
        const daysAgo = randomInt(0, 30);

        await client.query(`
          INSERT INTO reviews (user_id, order_id, variant_id, rating, comment, moderation_status, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, true,
            NOW() - INTERVAL '${daysAgo} days',
            NOW() - INTERVAL '${Math.max(0, daysAgo - 1)} days'
          )
        `, [user.id, orderId, product.variant_id, rating, comment, moderationStatus]);

        reviewsCreated++;
        affectedProductIds.add(product.product_id);
      }

      process.stdout.write(`  ✓ #${product.product_id} ${product.name} → ${reviewCount} reviews\n`);
    }

    // Update ALL affected products' stats
    console.log(`\n📊 Updating product stats for ${affectedProductIds.size} products...`);
    for (const productId of affectedProductIds) {
      await client.query(`
        UPDATE products SET
          review_count = (
            SELECT COUNT(*) FROM reviews r
            JOIN product_variants pv ON pv.id = r.variant_id
            WHERE pv.product_id = $1 AND r.is_active = true
          ),
          average_rating = COALESCE((
            SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r
            JOIN product_variants pv ON pv.id = r.variant_id
            WHERE pv.product_id = $1 AND r.is_active = true AND r.moderation_status = 'approved'
          ), 0),
          updated_at = NOW()
        WHERE id = $1
      `, [productId]);
    }

    await client.query('COMMIT');
    console.log('🎉 Transaction committed!\n');

    // Final summary
    const summary = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE review_count > 0) as products_with_reviews,
        (SELECT COUNT(*) FROM products WHERE review_count = 0) as products_no_reviews,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT COUNT(*) FROM orders) as total_orders
    `);
    console.log('=== FINAL SUMMARY ===');
    console.log(JSON.stringify(summary.rows[0], null, 2));
    console.log(`\nNew orders created: ${ordersCreated}`);
    console.log(`New reviews created: ${reviewsCreated}`);

    const noReview = await client.query(`SELECT id, name FROM products WHERE review_count = 0 ORDER BY id`);
    if (noReview.rows.length > 0) {
      console.log('\n⚠️  Products still with 0 reviews (likely 0 stock):');
      noReview.rows.forEach(p => console.log(`  #${p.id} ${p.name}`));
    } else {
      console.log('\n✅ All products now have at least 1 review!');
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error! Rolled back.');
    console.error(err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
