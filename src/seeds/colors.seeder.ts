import { DataSource } from 'typeorm';
import { Color } from '../modules/colors/entities/color.entity';

export async function seedColors(dataSource: DataSource): Promise<void> {
  const colorRepository = dataSource.getRepository(Color);

  const colors: any[] = [
    { name: 'Đen', hexCode: '#000000', isActive: true },
    { name: 'Trắng', hexCode: '#FFFFFF', isActive: true },
    { name: 'Xanh dương', hexCode: '#0066CC', isActive: true },
    { name: 'Đỏ', hexCode: '#FF0000', isActive: true },
    { name: 'Vàng', hexCode: '#FFFF00', isActive: true },
    { name: 'Xám', hexCode: '#808080', isActive: true },
    { name: 'Xanh lá', hexCode: '#00CC00', isActive: true },
    { name: 'Cam', hexCode: '#FF9900', isActive: true },
    { name: 'Tím', hexCode: '#9933FF', isActive: true },
    { name: 'Hồng', hexCode: '#FF69B4', isActive: true },
    { name: 'Nâu', hexCode: '#8B4513', isActive: true },
    { name: 'Xanh mint', hexCode: '#98FF98', isActive: true },
  ];

  await colorRepository.save(colors);
  console.log(`✅ Seeded ${colors.length} colors`);
}
