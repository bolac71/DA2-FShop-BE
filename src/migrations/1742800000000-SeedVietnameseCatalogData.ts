import { MigrationInterface, QueryRunner } from 'typeorm';

type SeedCategory = {
  name: string;
  department: 'men' | 'women' | 'kids';
  description: string;
  imageUrl: string;
};

type SeedSize = {
  name: string;
  sizeType: 'CLOTHING' | 'FOOTWEAR' | 'ACCESSORY' | 'FREESIZE';
  sortOrder: number;
};

export class SeedVietnameseCatalogData1742800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const brands = [
      { name: 'Nike', description: 'Thương hiệu thể thao toàn cầu', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274046/0915ce40-fa50-44a5-a327-a763aaa04b17.png' },
      { name: 'Adidas', description: 'Thời trang thể thao phong cách châu Âu', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274094/2221d2f3-32e1-490d-a236-6f601a04ede9.png' },
      { name: 'Puma', description: 'Giày và trang phục năng động', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274225/d9a88e64-5e52-4940-86ae-c7d2b421b28b.png' },
      { name: 'Converse', description: 'Biểu tượng sneaker cổ điển', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274341/ce44ac1c-1983-46e7-b8dc-29b68c137e96.png' },
      { name: 'Vans', description: 'Phong cách đường phố trẻ trung', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274387/21a27ce8-341b-49fe-a1fc-6a21fafd1366.png' },
      { name: 'Ananas', description: 'Thương hiệu giày Việt Nam hiện đại', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274426/062fcb21-144a-47c5-a9f6-cb416e819274.png' },
      { name: 'Biti\'s Hunter', description: 'Giày Việt cho giới trẻ năng động', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274469/2838ddbf-9834-4e69-aa23-53ac9d5f936d.png' },
      { name: 'Coolmate', description: 'Thời trang cơ bản cho nam giới Việt', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274539/0a8cb42b-6a66-4eb7-8258-945461c712d4.png' },
      { name: 'Routine', description: 'Ứng dụng thời trang nam tối giản', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274584/47248c99-7530-46c6-ba7c-95b872131147.png' },
      { name: 'Yody', description: 'Thời trang gia đình chuẩn Việt', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274674/57067250-3b53-400b-b8bf-108829d6e651.png' },
      { name: 'Canifa', description: 'Thời trang ứng dụng cho cả nhà', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274714/983a328d-7364-49ee-9844-d070bb398589.png' },
      { name: 'Lining', description: 'Thương hiệu thể thao hiệu năng cao', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274752/4f2867bb-5bc2-49a7-8c9a-2e8a96c30f23.png' },
      { name: 'MLB', description: 'Thời trang đường phố chuẩn Hàn', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274778/b9910360-6e8f-4d53-b7bd-0fa104ca213c.png' },
      { name: 'Uniqlo', description: 'Basic chất lượng từ Nhật Bản', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274801/07bedae1-9990-4aef-ba94-2e067af7a356.png' },
      { name: 'H&M', description: 'Fast fashion đa phong cách', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274850/39b265eb-5336-4cbc-aba9-59722ab7cbfe.png' },
      { name: 'Zara', description: 'Thời trang hiện đại theo xu hướng', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274896/47a8e8f2-d1d0-4c0c-9ad4-8458b325eff1.png' },
      { name: 'DirtyCoins', description: 'Streetwear Việt Nam nổi bật', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774274995/cf44d534-9b62-49af-ab57-c013e6e33589.png' },
      { name: '5THEWAY', description: 'Local brand đường phố cá tính', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275029/6fddcee6-0987-4525-9f7c-72a79df9ce8a.png' },
      { name: 'Davies', description: 'Streetwear tối giản hiện đại', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275076/fe5be800-6cba-4407-8ee4-cdb3f9c334b6.png' },
      { name: 'Degrey', description: 'Local brand mang tinh thần văn hóa Việt', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275124/32c96acf-3d54-4b17-aa66-009e633d26b2.png' },
    ];

    const categories: SeedCategory[] = [
      { name: 'Áo thun nam', department: 'men', description: 'Áo thun nam mặc hằng ngày, thoáng mát', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124305/ao-thun-nam_eese2e.png' },
      { name: 'Áo sơ mi nam', department: 'men', description: 'Áo sơ mi nam đi làm và đi chơi', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275322/047141b6-cb5d-4894-8cde-0a163f3e336d.png' },
      { name: 'Quần jeans nam', department: 'men', description: 'Quần jeans nam form chuẩn', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124335/quan-jeans-nam_k34h6q.png' },
      { name: 'Quần jogger nam', department: 'men', description: 'Quần jogger nam thể thao', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275367/efb4c31d-7186-441d-9c24-71ff73199083.png' },
      { name: 'Giày thể thao nam', department: 'men', description: 'Sneaker nam cho vận động và dạo phố', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124390/giay-the-thao-nam_o5zaha.png' },
      { name: 'Áo khoác nam', department: 'men', description: 'Áo khoác nam chống nắng, chống gió', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124453/ao-khoac-nam_nefayr.png' },
      { name: 'Áo thun nữ', department: 'women', description: 'Áo thun nữ basic dễ phối', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124601/ao-thun-nu_sfadzr.png' },
      { name: 'Áo sơ mi nữ', department: 'women', description: 'Áo sơ mi nữ thanh lịch', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275540/c7a1ca27-bfdf-4464-aec1-0e34d315b4e4.png' },
      { name: 'Quần jeans nữ', department: 'women', description: 'Quần jeans nữ tôn dáng', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124791/quan-jeans-nu_yqcvgr.png' },
      { name: 'Váy nữ', department: 'women', description: 'Váy nữ đi làm và đi chơi', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275591/2b1d3b45-699e-4be3-a7e6-49d8f7df2262.png' },
      { name: 'Giày nữ', department: 'women', description: 'Giày nữ đa dạng phong cách', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124830/giay-cao-got-nu_julhep.png' },
      { name: 'Áo khoác nữ', department: 'women', description: 'Áo khoác nữ nhẹ, dễ phối', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275661/ed33e2dd-159f-4d7c-b62f-d99e0363b1fc.png' },
      { name: 'Áo trẻ em', department: 'kids', description: 'Áo trẻ em mềm mại, an toàn da', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773125263/ao-tre-em_mkvwxn.png' },
      { name: 'Quần trẻ em', department: 'kids', description: 'Quần trẻ em co giãn tốt', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773125304/quan-tre-em_sxoqyc.png' },
      { name: 'Giày trẻ em', department: 'kids', description: 'Giày trẻ em nhẹ và êm', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773125347/giay-tre-em_qcjbmu.png' },
      { name: 'Balo học sinh', department: 'kids', description: 'Balo học sinh bền và nhẹ', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275736/4440845c-8986-4170-93cd-3fa767bd45ae.png' },
      { name: 'Mũ nón', department: 'men', description: 'Mũ nón thời trang unisex', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275758/9bdba1f2-cc39-48f3-b441-0839ad6a129f.png' },
      { name: 'Phụ kiện thời trang', department: 'women', description: 'Phụ kiện túi, ví, thắt lưng', imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275796/be7c13a4-67c5-4bd6-8f1a-96dcb579b546.png' },
    ];

    const colors = [
      { name: 'Đen', hexCode: '#000000' },
      { name: 'Trắng', hexCode: '#FFFFFF' },
      { name: 'Xám ghi', hexCode: '#6B7280' },
      { name: 'Xanh navy', hexCode: '#1E3A8A' },
      { name: 'Xanh dương', hexCode: '#2563EB' },
      { name: 'Xanh rêu', hexCode: '#3F6212' },
      { name: 'Xanh mint', hexCode: '#5EEAD4' },
      { name: 'Đỏ đô', hexCode: '#7F1D1D' },
      { name: 'Đỏ tươi', hexCode: '#DC2626' },
      { name: 'Hồng phấn', hexCode: '#F9A8D4' },
      { name: 'Tím pastel', hexCode: '#C4B5FD' },
      { name: 'Tím than', hexCode: '#4C1D95' },
      { name: 'Vàng kem', hexCode: '#FEF3C7' },
      { name: 'Cam đất', hexCode: '#C2410C' },
      { name: 'Nâu cà phê', hexCode: '#4B2E2B' },
      { name: 'Nâu be', hexCode: '#C4A484' },
      { name: 'Kem', hexCode: '#FAF3DD' },
      { name: 'Bạc', hexCode: '#D1D5DB' },
      { name: 'Xanh cổ vịt', hexCode: '#0F766E' },
      { name: 'Than chì', hexCode: '#374151' },
    ];

    const sizeTypes = [
      { name: 'CLOTHING', description: 'Kích cỡ quần áo' },
      { name: 'FOOTWEAR', description: 'Kích cỡ giày dép' },
      { name: 'ACCESSORY', description: 'Kích cỡ phụ kiện' },
      { name: 'FREESIZE', description: 'Một kích cỡ dùng chung' },
    ];

    const sizes: SeedSize[] = [
      { name: 'XS', sizeType: 'CLOTHING', sortOrder: 1 },
      { name: 'S', sizeType: 'CLOTHING', sortOrder: 2 },
      { name: 'M', sizeType: 'CLOTHING', sortOrder: 3 },
      { name: 'L', sizeType: 'CLOTHING', sortOrder: 4 },
      { name: 'XL', sizeType: 'CLOTHING', sortOrder: 5 },
      { name: '2XL', sizeType: 'CLOTHING', sortOrder: 6 },
      { name: '3XL', sizeType: 'CLOTHING', sortOrder: 7 },
      { name: '26', sizeType: 'FOOTWEAR', sortOrder: 1 },
      { name: '27', sizeType: 'FOOTWEAR', sortOrder: 2 },
      { name: '28', sizeType: 'FOOTWEAR', sortOrder: 3 },
      { name: '29', sizeType: 'FOOTWEAR', sortOrder: 4 },
      { name: '30', sizeType: 'FOOTWEAR', sortOrder: 5 },
      { name: '31', sizeType: 'FOOTWEAR', sortOrder: 6 },
      { name: '32', sizeType: 'FOOTWEAR', sortOrder: 7 },
      { name: '33', sizeType: 'FOOTWEAR', sortOrder: 8 },
      { name: '34', sizeType: 'FOOTWEAR', sortOrder: 9 },
      { name: '35', sizeType: 'FOOTWEAR', sortOrder: 10 },
      { name: '36', sizeType: 'FOOTWEAR', sortOrder: 11 },
      { name: '37', sizeType: 'FOOTWEAR', sortOrder: 12 },
      { name: '38', sizeType: 'FOOTWEAR', sortOrder: 13 },
      { name: '39', sizeType: 'FOOTWEAR', sortOrder: 14 },
      { name: '40', sizeType: 'FOOTWEAR', sortOrder: 15 },
      { name: '41', sizeType: 'FOOTWEAR', sortOrder: 16 },
      { name: '42', sizeType: 'FOOTWEAR', sortOrder: 17 },
      { name: '43', sizeType: 'FOOTWEAR', sortOrder: 18 },
      { name: '44', sizeType: 'FOOTWEAR', sortOrder: 19 },
      { name: '45', sizeType: 'FOOTWEAR', sortOrder: 20 },
      { name: 'Nhỏ', sizeType: 'ACCESSORY', sortOrder: 1 },
      { name: 'Vừa', sizeType: 'ACCESSORY', sortOrder: 2 },
      { name: 'Lớn', sizeType: 'ACCESSORY', sortOrder: 3 },
      { name: 'Free Size', sizeType: 'FREESIZE', sortOrder: 1 },
    ];

    for (const brand of brands) {
      await queryRunner.query(
        `
        INSERT INTO brands (name, image_url, description, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (name) DO NOTHING
      `,
        [brand.name, brand.imageUrl, brand.description],
      );
    }

    for (const category of categories) {
      await queryRunner.query(
        `
        INSERT INTO categories (name, image_url, description, department, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (name) DO NOTHING
      `,
        [category.name, category.imageUrl, category.description, category.department],
      );
    }

    for (const color of colors) {
      await queryRunner.query(
        `
        INSERT INTO colors (name, hex_code, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (name) DO NOTHING
      `,
        [color.name, color.hexCode],
      );
    }

    for (const st of sizeTypes) {
      await queryRunner.query(
        `
        INSERT INTO size_types (name, description, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (name) DO NOTHING
      `,
        [st.name, st.description],
      );
    }

    const sizeTypeRows: Array<{ id: string; name: SeedSize['sizeType'] }> = await queryRunner.query(
      `SELECT id, name FROM size_types WHERE name IN ('CLOTHING', 'FOOTWEAR', 'ACCESSORY', 'FREESIZE')`,
    );
    const sizeTypeMap = new Map<SeedSize['sizeType'], number>();
    for (const row of sizeTypeRows) {
      sizeTypeMap.set(row.name, parseInt(row.id, 10));
    }

    for (const size of sizes) {
      const sizeTypeId = sizeTypeMap.get(size.sizeType);
      if (!sizeTypeId) continue;

      await queryRunner.query(
        `
        INSERT INTO sizes (name, size_type_id, sort_order, is_active)
        SELECT $1::varchar, $2::int, $3::int, true
        WHERE NOT EXISTS (
          SELECT 1 FROM sizes WHERE name = $1::varchar AND size_type_id = $2::int
        )
      `,
        [size.name, sizeTypeId, size.sortOrder],
      );
    }

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const brandNames = [
      'Ananas',
      'Biti\'s Hunter',
      'Coolmate',
      'Routine',
      'Yody',
      'Canifa',
      'Lining',
      'MLB',
      'DirtyCoins',
      '5THEWAY',
      'Davies',
      'Degrey',
    ];

    const categoryNames = [
      'Áo sơ mi nam',
      'Quần jogger nam',
      'Áo sơ mi nữ',
      'Giày nữ',
      'Balo học sinh',
      'Mũ nón',
      'Phụ kiện thời trang',
    ];

    const colorNames = [
      'Xám ghi',
      'Xanh navy',
      'Xanh rêu',
      'Xanh mint',
      'Đỏ đô',
      'Hồng phấn',
      'Tím pastel',
      'Tím than',
      'Vàng kem',
      'Cam đất',
      'Nâu cà phê',
      'Nâu be',
      'Kem',
      'Bạc',
      'Xanh cổ vịt',
      'Than chì',
    ];

    await queryRunner.query(`
      DELETE FROM sizes s
      USING size_types st
      WHERE s.size_type_id = st.id
      AND (
        (st.name = 'ACCESSORY' AND s.name IN ('Nhỏ', 'Vừa', 'Lớn')) OR
        (st.name = 'FREESIZE' AND s.name = 'Free Size') OR
        (st.name = 'FOOTWEAR' AND s.name IN ('26', '27', '28', '29', '30', '31', '32', '33', '34', '35'))
      )
    `);

    await queryRunner.query(`DELETE FROM colors WHERE name = ANY($1)`, [colorNames]);
    await queryRunner.query(`DELETE FROM categories WHERE name = ANY($1)`, [categoryNames]);
    await queryRunner.query(`DELETE FROM brands WHERE name = ANY($1)`, [brandNames]);
  }
}
