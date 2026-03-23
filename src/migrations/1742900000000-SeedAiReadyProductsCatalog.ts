import { MigrationInterface, QueryRunner } from 'typeorm';

type VariantSeed = {
  colorName: string;
  sizeNames: string[];
  imageUrls: string[];
};

type ProductSeed = {
  name: string;
  brandName: string;
  categoryName: string;
  price: number;
  averageRating: number;
  reviewCount: number;
  description: string;
  keywords: string[];
  imageUrls: string[];
  variants: VariantSeed[];
};

export class SeedAiReadyProductsCatalog1742900000000 implements MigrationInterface {
  private readonly skuPrefix = 'AIREADY';

  private cloudinaryUrl(path: string): string {
    return `https://res.cloudinary.com/dtkbbwmg4/image/upload/${path}`;
  }

  private buildProducts(): ProductSeed[] {
    const curated: ProductSeed[] = [
      {
        name: 'Áo thun nam Active Dry cổ tròn',
        brandName: 'Nike',
        categoryName: 'Áo thun nam',
        price: 429000,
        averageRating: 4.6,
        reviewCount: 184,
        description:
          'Áo thun nam chất liệu polyester co giãn 4 chiều, bề mặt vải thoáng khí, phù hợp tập luyện nhẹ và mặc hằng ngày. Form regular tôn dáng, dễ phối với jeans hoặc jogger. Đường may vai và nách gia cố để giữ form sau nhiều lần giặt máy.',
        keywords: ['ao thun nam', 'the thao', 'thoang khi', 'dry fit', 'mac hang ngay'],
        imageUrls: [
          this.cloudinaryUrl('v1776001001/products/ao-thun-nam-active-dry/main-1.jpg'),
          this.cloudinaryUrl('v1776001001/products/ao-thun-nam-active-dry/main-2.jpg'),
          this.cloudinaryUrl('v1776001001/products/ao-thun-nam-active-dry/main-3.jpg'),
        ],
        variants: [
          {
            colorName: 'Đen',
            sizeNames: ['M', 'L', 'XL'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/ao-thun-nam-active-dry/black-1.jpg'),
              this.cloudinaryUrl('v1776001001/products/ao-thun-nam-active-dry/black-2.jpg'),
            ],
          },
          {
            colorName: 'Trắng',
            sizeNames: ['M', 'L', 'XL'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/ao-thun-nam-active-dry/white-1.jpg'),
              this.cloudinaryUrl('v1776001001/products/ao-thun-nam-active-dry/white-2.jpg'),
            ],
          },
        ],
      },
      {
        name: 'Quần jeans nam straight fit xanh đậm',
        brandName: 'Uniqlo',
        categoryName: 'Quần jeans nam',
        price: 899000,
        averageRating: 4.5,
        reviewCount: 132,
        description:
          'Quần jeans nam form straight fit, chất denim pha spandex tạo cảm giác thoải mái khi ngồi lâu hoặc di chuyển nhiều. Cạp chắc, đường may đũng gia cố, phù hợp đi làm và đi chơi cuối tuần. Màu xanh đậm dễ phối áo sơ mi, áo thun và áo khoác.',
        keywords: ['quan jeans nam', 'straight fit', 'denim', 'di lam', 'pho do'],
        imageUrls: [
          this.cloudinaryUrl('v1776001001/products/quan-jeans-nam-straight/main-1.jpg'),
          this.cloudinaryUrl('v1776001001/products/quan-jeans-nam-straight/main-2.jpg'),
          this.cloudinaryUrl('v1776001001/products/quan-jeans-nam-straight/main-3.jpg'),
        ],
        variants: [
          {
            colorName: 'Xanh navy',
            sizeNames: ['M', 'L', 'XL'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/quan-jeans-nam-straight/navy-1.jpg'),
            ],
          },
          {
            colorName: 'Xám ghi',
            sizeNames: ['M', 'L'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/quan-jeans-nam-straight/gray-1.jpg'),
            ],
          },
        ],
      },
      {
        name: 'Giày thể thao nam RunFlex đế êm',
        brandName: 'Adidas',
        categoryName: 'Giày thể thao nam',
        price: 1299000,
        averageRating: 4.7,
        reviewCount: 221,
        description:
          'Giày thể thao nam thiết kế ôm chân vừa phải, đế cao su bám sàn tốt trên bề mặt đô thị. Lót trong êm và thoáng khí, phù hợp đi bộ đường dài, tập nhẹ và sử dụng hằng ngày. Form hiện đại, phối tốt với quần jogger hoặc jeans.',
        keywords: ['giay the thao nam', 'de em', 'di bo', 'runflex', 'sneaker'],
        imageUrls: [
          this.cloudinaryUrl('v1776001001/products/giay-the-thao-nam-runflex/main-1.jpg'),
          this.cloudinaryUrl('v1776001001/products/giay-the-thao-nam-runflex/main-2.jpg'),
          this.cloudinaryUrl('v1776001001/products/giay-the-thao-nam-runflex/main-3.jpg'),
        ],
        variants: [
          {
            colorName: 'Đen',
            sizeNames: ['40', '41', '42'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/giay-the-thao-nam-runflex/black-1.jpg'),
            ],
          },
          {
            colorName: 'Trắng',
            sizeNames: ['39', '40', '41'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/giay-the-thao-nam-runflex/white-1.jpg'),
            ],
          },
        ],
      },
      {
        name: 'Áo khoác nữ gió nhẹ Urban Shell',
        brandName: 'Zara',
        categoryName: 'Áo khoác nữ',
        price: 1199000,
        averageRating: 4.4,
        reviewCount: 96,
        description:
          'Áo khoác nữ chất liệu nhẹ, cản gió cơ bản, phù hợp di chuyển buổi sáng và chiều tối. Form vừa vặn, dễ phối với váy hoặc quần jeans. Bề mặt ít nhăn và nhanh khô, tiện cho lịch trình bận rộn.',
        keywords: ['ao khoac nu', 'can gio', 'di lam', 'urban', 'thoi trang nu'],
        imageUrls: [
          this.cloudinaryUrl('v1776001001/products/ao-khoac-nu-urban-shell/main-1.jpg'),
          this.cloudinaryUrl('v1776001001/products/ao-khoac-nu-urban-shell/main-2.jpg'),
        ],
        variants: [
          {
            colorName: 'Kem',
            sizeNames: ['S', 'M', 'L'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/ao-khoac-nu-urban-shell/cream-1.jpg'),
            ],
          },
          {
            colorName: 'Than chì',
            sizeNames: ['S', 'M'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/ao-khoac-nu-urban-shell/charcoal-1.jpg'),
            ],
          },
        ],
      },
      {
        name: 'Váy nữ midi Linen Grace',
        brandName: 'H&M',
        categoryName: 'Váy nữ',
        price: 759000,
        averageRating: 4.5,
        reviewCount: 113,
        description:
          'Váy midi nữ chất liệu linen pha, bề mặt mềm và thoáng, phù hợp mặc cả ngày trong môi trường văn phòng hoặc dạo phố. Thiết kế tối giản, tôn dáng, dễ phối cùng blazer hoặc cardigan mỏng.',
        keywords: ['vay midi', 'linen', 'nu tinh', 'di lam', 'smart casual'],
        imageUrls: [
          this.cloudinaryUrl('v1776001001/products/vay-midi-linen-grace/main-1.jpg'),
          this.cloudinaryUrl('v1776001001/products/vay-midi-linen-grace/main-2.jpg'),
        ],
        variants: [
          {
            colorName: 'Hồng phấn',
            sizeNames: ['S', 'M', 'L'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/vay-midi-linen-grace/pink-1.jpg'),
            ],
          },
          {
            colorName: 'Xanh mint',
            sizeNames: ['S', 'M'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/vay-midi-linen-grace/mint-1.jpg'),
            ],
          },
        ],
      },
      {
        name: 'Giày nữ Classic Heel 5cm',
        brandName: 'MLB',
        categoryName: 'Giày nữ',
        price: 1099000,
        averageRating: 4.3,
        reviewCount: 78,
        description:
          'Giày nữ gót thấp 5cm, thiết kế thanh lịch cho môi trường công sở và sự kiện nhẹ. Phần lót mềm, giảm áp lực mũi chân khi di chuyển. Dáng giày dễ phối với chân váy, quần tây hoặc jeans ôm.',
        keywords: ['giay nu', 'got thap', 'cong so', 'thanh lich', 'classic'],
        imageUrls: [
          this.cloudinaryUrl('v1776001001/products/giay-nu-classic-heel/main-1.jpg'),
          this.cloudinaryUrl('v1776001001/products/giay-nu-classic-heel/main-2.jpg'),
        ],
        variants: [
          {
            colorName: 'Đen',
            sizeNames: ['36', '37', '38'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/giay-nu-classic-heel/black-1.jpg'),
            ],
          },
          {
            colorName: 'Kem',
            sizeNames: ['36', '37'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/giay-nu-classic-heel/cream-1.jpg'),
            ],
          },
        ],
      },
      {
        name: 'Áo trẻ em cotton mềm SoftPlay',
        brandName: 'Canifa',
        categoryName: 'Áo trẻ em',
        price: 239000,
        averageRating: 4.7,
        reviewCount: 165,
        description:
          'Áo trẻ em cotton mềm, thân thiện da nhạy cảm, thoáng và thấm hút tốt. Form vừa vặn, dễ cử động khi vui chơi và đi học. Họa tiết đơn giản, màu sắc tươi sáng phù hợp lứa tuổi từ 6 đến 12.',
        keywords: ['ao tre em', 'cotton mem', 'an toan da', 'di hoc', 'be trai be gai'],
        imageUrls: [
          this.cloudinaryUrl('v1776001001/products/ao-tre-em-softplay/main-1.jpg'),
          this.cloudinaryUrl('v1776001001/products/ao-tre-em-softplay/main-2.jpg'),
        ],
        variants: [
          {
            colorName: 'Xanh dương',
            sizeNames: ['XS', 'S', 'M'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/ao-tre-em-softplay/blue-1.jpg'),
            ],
          },
          {
            colorName: 'Vàng kem',
            sizeNames: ['XS', 'S'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/ao-tre-em-softplay/yellow-1.jpg'),
            ],
          },
        ],
      },
      {
        name: 'Balo học sinh SmartPack 20L',
        brandName: 'Yody',
        categoryName: 'Balo học sinh',
        price: 529000,
        averageRating: 4.6,
        reviewCount: 142,
        description:
          'Balo học sinh dung tích 20L, ngăn chính rộng và ngăn phụ khoa học. Quai đeo có đệm êm, phân bổ lực tốt cho vai, phù hợp học sinh cấp 2 và cấp 3. Chất liệu bền nhẹ, chống bám bụi cơ bản và dễ vệ sinh.',
        keywords: ['balo hoc sinh', '20l', 'ngan chong soc', 'quai dem em', 'di hoc'],
        imageUrls: [
          this.cloudinaryUrl('v1776001001/products/balo-hoc-sinh-smartpack/main-1.jpg'),
          this.cloudinaryUrl('v1776001001/products/balo-hoc-sinh-smartpack/main-2.jpg'),
          this.cloudinaryUrl('v1776001001/products/balo-hoc-sinh-smartpack/main-3.jpg'),
        ],
        variants: [
          {
            colorName: 'Xanh navy',
            sizeNames: ['Vừa', 'Lớn'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/balo-hoc-sinh-smartpack/navy-1.jpg'),
            ],
          },
          {
            colorName: 'Đen',
            sizeNames: ['Vừa', 'Lớn'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/balo-hoc-sinh-smartpack/black-1.jpg'),
            ],
          },
        ],
      },
      {
        name: 'Mũ lưỡi trai unisex AirCap',
        brandName: 'DirtyCoins',
        categoryName: 'Mũ nón',
        price: 329000,
        averageRating: 4.4,
        reviewCount: 87,
        description:
          'Mũ lưỡi trai unisex form đứng, chất liệu nhẹ và thoáng, phù hợp hoạt động ngoài trời và đi lại hằng ngày. Phần khóa điều chỉnh linh hoạt, ôm đầu ổn định cho nhiều vòng đầu khác nhau.',
        keywords: ['mu luoi trai', 'unisex', 'ngoai troi', 'streetwear', 'phu kien'],
        imageUrls: [
          this.cloudinaryUrl('v1776001001/products/mu-luoi-trai-aircap/main-1.jpg'),
          this.cloudinaryUrl('v1776001001/products/mu-luoi-trai-aircap/main-2.jpg'),
        ],
        variants: [
          {
            colorName: 'Đen',
            sizeNames: ['Free Size'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/mu-luoi-trai-aircap/black-1.jpg'),
            ],
          },
          {
            colorName: 'Nâu be',
            sizeNames: ['Free Size'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/mu-luoi-trai-aircap/beige-1.jpg'),
            ],
          },
        ],
      },
      {
        name: 'Túi đeo chéo urban mini',
        brandName: '5THEWAY',
        categoryName: 'Phụ kiện thời trang',
        price: 459000,
        averageRating: 4.5,
        reviewCount: 64,
        description:
          'Túi đeo chéo mini phong cách đường phố, tối ưu cho vật dụng thiết yếu như điện thoại, ví và tai nghe. Thiết kế gọn, dây đeo điều chỉnh nhanh, chất liệu bền chống bám bụi nhẹ. Phù hợp đi chơi, dạo phố và du lịch ngắn ngày.',
        keywords: ['tui deo cheo', 'urban', 'mini bag', 'streetwear', 'phu kien'],
        imageUrls: [
          this.cloudinaryUrl('v1776001001/products/tui-deo-cheo-urban-mini/main-1.jpg'),
          this.cloudinaryUrl('v1776001001/products/tui-deo-cheo-urban-mini/main-2.jpg'),
        ],
        variants: [
          {
            colorName: 'Đen',
            sizeNames: ['Nhỏ', 'Vừa'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/tui-deo-cheo-urban-mini/black-1.jpg'),
            ],
          },
          {
            colorName: 'Cam đất',
            sizeNames: ['Nhỏ', 'Vừa'],
            imageUrls: [
              this.cloudinaryUrl('v1776001001/products/tui-deo-cheo-urban-mini/orange-1.jpg'),
            ],
          },
        ],
      },
    ];

    return [...curated, ...this.buildBalancedProducts(curated)];
  }

  private buildBalancedProducts(curated: ProductSeed[]): ProductSeed[] {
    const brands = [
      'Nike',
      'Adidas',
      'Puma',
      'Converse',
      'Vans',
      'Ananas',
      "Biti's Hunter",
      'Coolmate',
      'Routine',
      'Yody',
      'Canifa',
      'Lining',
      'MLB',
      'Uniqlo',
      'H&M',
      'Zara',
      'DirtyCoins',
      '5THEWAY',
      'Davies',
      'Degrey',
    ];

    const categories = [
      'Áo thun nam',
      'Áo sơ mi nam',
      'Quần jeans nam',
      'Quần jogger nam',
      'Giày thể thao nam',
      'Áo khoác nam',
      'Áo thun nữ',
      'Áo sơ mi nữ',
      'Quần jeans nữ',
      'Váy nữ',
      'Giày nữ',
      'Áo khoác nữ',
      'Áo trẻ em',
      'Quần trẻ em',
      'Giày trẻ em',
      'Balo học sinh',
      'Mũ nón',
      'Phụ kiện thời trang',
    ];

    const categoryImageMap: Record<string, string> = {
      'Áo thun nam': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124305/ao-thun-nam_eese2e.png',
      'Áo sơ mi nam': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275322/047141b6-cb5d-4894-8cde-0a163f3e336d.png',
      'Quần jeans nam': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124335/quan-jeans-nam_k34h6q.png',
      'Quần jogger nam': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275367/efb4c31d-7186-441d-9c24-71ff73199083.png',
      'Giày thể thao nam': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124390/giay-the-thao-nam_o5zaha.png',
      'Áo khoác nam': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124453/ao-khoac-nam_nefayr.png',
      'Áo thun nữ': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124601/ao-thun-nu_sfadzr.png',
      'Áo sơ mi nữ': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275540/c7a1ca27-bfdf-4464-aec1-0e34d315b4e4.png',
      'Quần jeans nữ': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124791/quan-jeans-nu_yqcvgr.png',
      'Váy nữ': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275591/2b1d3b45-699e-4be3-a7e6-49d8f7df2262.png',
      'Giày nữ': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124830/giay-cao-got-nu_julhep.png',
      'Áo khoác nữ': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275661/ed33e2dd-159f-4d7c-b62f-d99e0363b1fc.png',
      'Áo trẻ em': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773125263/ao-tre-em_mkvwxn.png',
      'Quần trẻ em': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773125304/quan-tre-em_sxoqyc.png',
      'Giày trẻ em': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773125347/giay-tre-em_qcjbmu.png',
      'Balo học sinh': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275736/4440845c-8986-4170-93cd-3fa767bd45ae.png',
      'Mũ nón': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275758/9bdba1f2-cc39-48f3-b441-0839ad6a129f.png',
      'Phụ kiện thời trang': 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1774275796/be7c13a4-67c5-4bd6-8f1a-96dcb579b546.png',
    };

    const colorPairs: Array<[string, string]> = [
      ['Đen', 'Trắng'],
      ['Xanh navy', 'Xám ghi'],
      ['Kem', 'Nâu be'],
      ['Xanh dương', 'Vàng kem'],
      ['Cam đất', 'Than chì'],
      ['Hồng phấn', 'Xanh mint'],
    ];

    const curatedBrandCount = new Map<string, number>();
    const curatedCategoryCount = new Map<string, number>();
    for (const item of curated) {
      curatedBrandCount.set(item.brandName, (curatedBrandCount.get(item.brandName) ?? 0) + 1);
      curatedCategoryCount.set(item.categoryName, (curatedCategoryCount.get(item.categoryName) ?? 0) + 1);
    }

    const promotedCategories = new Set<string>([
      'Áo thun nam',
      'Quần jeans nam',
      'Giày thể thao nam',
      'Váy nữ',
    ]);

    const remainingByCategory = new Map<string, number>();
    for (const categoryName of categories) {
      const target = promotedCategories.has(categoryName) ? 3 : 2;
      const remaining = target - (curatedCategoryCount.get(categoryName) ?? 0);
      remainingByCategory.set(categoryName, Math.max(0, remaining));
    }

    const generated: ProductSeed[] = [];
    let seedIndex = 0;

    for (let brandIndex = 0; brandIndex < brands.length; brandIndex++) {
      const brandName = brands[brandIndex];
      const alreadySeeded = curatedBrandCount.get(brandName) ?? 0;
      const neededCount = Math.max(0, 2 - alreadySeeded);
      const usedCategoryForBrand = new Set<string>();

      for (let slot = 0; slot < neededCount; slot++) {
        const categoryName = this.pickCategoryWithRemaining(
          categories,
          remainingByCategory,
          (brandIndex * 5 + slot * 7) % categories.length,
          usedCategoryForBrand,
        );

        remainingByCategory.set(categoryName, (remainingByCategory.get(categoryName) ?? 0) - 1);
        usedCategoryForBrand.add(categoryName);

        const imageUrl = categoryImageMap[categoryName] ?? categoryImageMap['Áo thun nam'];
        const [colorA, colorB] = colorPairs[seedIndex % colorPairs.length];
        const sizeNames = this.pickSizeNamesByCategory(categoryName, seedIndex);

        generated.push({
          name: `${categoryName} ${brandName} Core ${seedIndex + 1}`,
          brandName,
          categoryName,
          price: this.basePriceByCategory(categoryName) + ((seedIndex * 47000) % 280000),
          averageRating: Number((4 + ((seedIndex % 8) * 0.1)).toFixed(1)),
          reviewCount: 40 + seedIndex * 9,
          description:
            `${categoryName} dòng Core của ${brandName}, tối ưu cho nhu cầu mặc hằng ngày và di chuyển linh hoạt. Chất liệu chọn lọc, hoàn thiện chắc chắn, dễ phối theo nhiều phong cách từ basic đến streetwear. Tu khoa tim kiem: ${categoryName.toLowerCase()}, ${brandName.toLowerCase()}, core, mac hang ngay, de pho do.`,
          keywords: [
            categoryName.toLowerCase(),
            brandName.toLowerCase(),
            'core',
            'de pho do',
            'mac hang ngay',
          ],
          imageUrls: [imageUrl, imageUrl],
          variants: [
            {
              colorName: colorA,
              sizeNames,
              imageUrls: [imageUrl],
            },
            {
              colorName: colorB,
              sizeNames,
              imageUrls: [imageUrl],
            },
          ],
        });

        seedIndex += 1;
      }
    }

    const missingTargets = Array.from(remainingByCategory.entries()).filter(([, count]) => count > 0);
    if (missingTargets.length > 0) {
      throw new Error(`Chua phan bo du so luong product cho category: ${JSON.stringify(missingTargets)}`);
    }

    return generated;
  }

  private pickCategoryWithRemaining(
    categories: string[],
    remainingByCategory: Map<string, number>,
    startIndex: number,
    excluded: Set<string>,
  ): string {
    for (let offset = 0; offset < categories.length; offset++) {
      const categoryName = categories[(startIndex + offset) % categories.length];
      if ((remainingByCategory.get(categoryName) ?? 0) > 0 && !excluded.has(categoryName)) {
        return categoryName;
      }
    }

    for (let offset = 0; offset < categories.length; offset++) {
      const categoryName = categories[(startIndex + offset) % categories.length];
      if ((remainingByCategory.get(categoryName) ?? 0) > 0) {
        return categoryName;
      }
    }

    throw new Error('Khong con category nao de phan bo cho product generated');
  }

  private pickSizeNamesByCategory(categoryName: string, index: number): string[] {
    const normalized = categoryName.toLowerCase();

    if (normalized.includes('giày trẻ em')) return ['30', '31', '32'];
    if (normalized.includes('giày')) return ['39', '40', '41'];
    if (normalized.includes('mũ')) return ['Free Size'];
    if (normalized.includes('balo') || normalized.includes('phụ kiện')) return ['Nhỏ', 'Vừa'];
    if (normalized.includes('trẻ em')) return index % 2 === 0 ? ['XS', 'S', 'M'] : ['S', 'M', 'L'];

    return ['S', 'M', 'L'];
  }

  private basePriceByCategory(categoryName: string): number {
    const normalized = categoryName.toLowerCase();
    if (normalized.includes('giày')) return 990000;
    if (normalized.includes('balo') || normalized.includes('phụ kiện') || normalized.includes('mũ')) return 359000;
    if (normalized.includes('trẻ em')) return 239000;
    if (normalized.includes('váy')) return 629000;
    return 429000;
  }

  private normalizeSkuToken(input: string): string {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .toUpperCase();
  }

  private extractPublicIdFromCloudinaryUrl(imageUrl: string): string | null {
    const marker = '/upload/';
    const markerIndex = imageUrl.indexOf(marker);
    if (markerIndex === -1) return null;

    let pathPart = imageUrl.substring(markerIndex + marker.length);
    if (!pathPart) return null;

    const firstSlash = pathPart.indexOf('/');
    if (firstSlash !== -1) {
      const maybeVersion = pathPart.substring(0, firstSlash);
      if (/^v\d+$/.test(maybeVersion)) {
        pathPart = pathPart.substring(firstSlash + 1);
      }
    }

    if (!pathPart) return null;

    const lastDot = pathPart.lastIndexOf('.');
    if (lastDot > 0) {
      return pathPart.substring(0, lastDot);
    }

    return pathPart;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const products = this.buildProducts();

    const requiredBrandNames = Array.from(new Set(products.map((p) => p.brandName)));
    const requiredCategoryNames = Array.from(new Set(products.map((p) => p.categoryName)));
    const requiredColorNames = Array.from(new Set(products.flatMap((p) => p.variants.map((v) => v.colorName))));
    const requiredSizeNames = Array.from(new Set(products.flatMap((p) => p.variants.flatMap((v) => v.sizeNames))));

    const brandRows: Array<{ id: string; name: string }> = await queryRunner.query(
      `SELECT id, name FROM brands WHERE name = ANY($1)`,
      [requiredBrandNames],
    );
    const categoryRows: Array<{ id: string; name: string }> = await queryRunner.query(
      `SELECT id, name FROM categories WHERE name = ANY($1)`,
      [requiredCategoryNames],
    );
    const colorRows: Array<{ id: string; name: string }> = await queryRunner.query(
      `SELECT id, name FROM colors WHERE name = ANY($1)`,
      [requiredColorNames],
    );
    const sizeRows: Array<{ id: string; name: string }> = await queryRunner.query(
      `SELECT id, name FROM sizes WHERE name = ANY($1)`,
      [requiredSizeNames],
    );

    const brandMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const colorMap = new Map<string, number>();
    const sizeMap = new Map<string, number>();

    for (const row of brandRows) brandMap.set(row.name, parseInt(row.id, 10));
    for (const row of categoryRows) categoryMap.set(row.name, parseInt(row.id, 10));
    for (const row of colorRows) colorMap.set(row.name, parseInt(row.id, 10));
    for (const row of sizeRows) sizeMap.set(row.name, parseInt(row.id, 10));

    for (const name of requiredBrandNames) {
      if (!brandMap.has(name)) throw new Error(`Khong tim thay brand: ${name}`);
    }
    for (const name of requiredCategoryNames) {
      if (!categoryMap.has(name)) throw new Error(`Khong tim thay category: ${name}`);
    }
    for (const name of requiredColorNames) {
      if (!colorMap.has(name)) throw new Error(`Khong tim thay color: ${name}`);
    }
    for (const name of requiredSizeNames) {
      if (!sizeMap.has(name)) throw new Error(`Khong tim thay size: ${name}`);
    }

    for (const product of products) {
      const brandId = brandMap.get(product.brandName) as number;
      const categoryId = categoryMap.get(product.categoryName) as number;

      const existed: Array<{ id: string }> = await queryRunner.query(
        `
        SELECT id
        FROM products
        WHERE name = $1 AND brand_id = $2 AND category_id = $3
        LIMIT 1
      `,
        [product.name, brandId, categoryId],
      );

      let productId: number;
      if (existed.length > 0) {
        productId = parseInt(existed[0].id, 10);
        await queryRunner.query(
          `
          UPDATE products
          SET description = $1,
              price = $2,
              average_rating = $3,
              review_count = $4,
              is_active = true,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `,
          [
            `${product.description} Tu khoa tim kiem: ${product.keywords.join(', ')}.`,
            product.price,
            product.averageRating,
            product.reviewCount,
            productId,
          ],
        );
      } else {
        const inserted: Array<{ id: string }> = await queryRunner.query(
          `
          INSERT INTO products (name, description, brand_id, category_id, price, average_rating, review_count, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true)
          RETURNING id
        `,
          [
            product.name,
            `${product.description} Tu khoa tim kiem: ${product.keywords.join(', ')}.`,
            brandId,
            categoryId,
            product.price,
            product.averageRating,
            product.reviewCount,
          ],
        );
        productId = parseInt(inserted[0].id, 10);
      }

      await queryRunner.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);
      for (const imageUrl of product.imageUrls) {
        const publicId = this.extractPublicIdFromCloudinaryUrl(imageUrl);
        await queryRunner.query(
          `
          INSERT INTO product_images (image_url, public_id, product_id, is_active)
          VALUES ($1, $2, $3, true)
        `,
          [imageUrl, publicId, productId],
        );
      }

      for (const variant of product.variants) {
        if (variant.imageUrls.length === 0) {
          throw new Error(`Variant khong co anh: ${product.name} - ${variant.colorName}`);
        }
        const colorId = colorMap.get(variant.colorName) as number;
        for (let i = 0; i < variant.sizeNames.length; i++) {
          const sizeName = variant.sizeNames[i];
          const sizeId = sizeMap.get(sizeName) as number;
          const imageUrl = variant.imageUrls[i % variant.imageUrls.length];
          const publicId = this.extractPublicIdFromCloudinaryUrl(imageUrl);
          const sku = [
            this.skuPrefix,
            this.normalizeSkuToken(product.name),
            this.normalizeSkuToken(variant.colorName),
            this.normalizeSkuToken(sizeName),
          ].join('-');

          await queryRunner.query(
            `
            INSERT INTO product_variants (image_url, public_id, sku, product_id, color_id, size_id, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            ON CONFLICT (product_id, color_id, size_id)
            DO UPDATE SET image_url = EXCLUDED.image_url,
                          public_id = EXCLUDED.public_id,
                          sku = EXCLUDED.sku,
                          is_active = true,
                          updated_at = CURRENT_TIMESTAMP
          `,
            [imageUrl, publicId, sku, productId, colorId, sizeId],
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const products = this.buildProducts();
    const productNames = products.map((p) => p.name);

    await queryRunner.query(`DELETE FROM product_variants WHERE sku LIKE $1`, [`${this.skuPrefix}-%`]);
    await queryRunner.query(
      `DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE name = ANY($1))`,
      [productNames],
    );
    await queryRunner.query(`DELETE FROM products WHERE name = ANY($1)`, [productNames]);
  }
}