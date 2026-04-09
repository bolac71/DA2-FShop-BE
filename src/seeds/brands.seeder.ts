import { DataSource } from 'typeorm';
import { Brand } from '../modules/brands/entities/brand.entity';

export async function seedBrands(dataSource: DataSource): Promise<void> {
  const brandRepository = dataSource.getRepository(Brand);

  const brands: any[] = [
    {
      name: 'Nike',
      slug: 'nike',
      description: 'Thương hiệu đồ thể thao hàng đầu thế giới',
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773110247/download_nnjfub.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Adidas',
      slug: 'adidas',
      description: 'Thương hiệu thời trang và giày thể thao nổi tiếng',
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773123045/nike_jxhabd.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Puma',
      slug: 'puma',
      description: 'Thương hiệu giày thể thao cao cấp',
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773123740/puma_eqhg22.jpg',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Vans',
      slug: 'vans',
      description: 'Thương hiệu giày và áo phông nổi tiếng',
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773123814/vans_mcjpzj.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Converse',
      slug: 'converse',
      description: 'Hãng sản xuất giày vải kiểu cổ điển',
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773123929/converse_gcop5e.jpg',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Uniqlo',
      slug: 'uniqlo',
      description: 'Thương hiệu thời trang casual Nhật Bản',
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773123972/uniqlo_ecrjry.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'H&M',
      slug: 'hm',
      description: 'Chuỗi bán lẻ thời trang Thụy Điển',
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124022/h_m_stzttg.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Zara',
      slug: 'zara',
      description: 'Thương hiệu thời trang nhanh Tây Ban Nha',
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124075/zara_jwhprt.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Levis',
      slug: 'levis',
      description: 'Thương hiệu quần jeans huyền tích',
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124161/levis_cftnvo.png',
      publicId: null,
      isActive: true,
    },
  ];

  await brandRepository.save(brands);
  console.log(`✅ Seeded ${brands.length} brands`);
}
