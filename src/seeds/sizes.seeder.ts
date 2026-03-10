import { DataSource } from 'typeorm';
import { Size } from '../modules/sizes/entities/size.entity';
import { SizeType } from '../modules/size-types/entities/size-type.entity';

export async function seedSizes(dataSource: DataSource): Promise<void> {
  const sizeRepository = dataSource.getRepository(Size);
  const sizeTypeRepository = dataSource.getRepository(SizeType);

  // Get size types from database
  const clothingSizeType = await sizeTypeRepository.findOne({ where: { name: 'CLOTHING' } });
  const footwearSizeType = await sizeTypeRepository.findOne({ where: { name: 'FOOTWEAR' } });
  const accessorySizeType = await sizeTypeRepository.findOne({ where: { name: 'ACCESSORY' } });

  const sizes: any[] = [
    // Clothing sizes
    { name: 'XS', sizeTypeId: clothingSizeType?.id, sortOrder: 1, isActive: true },
    { name: 'S', sizeTypeId: clothingSizeType?.id, sortOrder: 2, isActive: true },
    { name: 'M', sizeTypeId: clothingSizeType?.id, sortOrder: 3, isActive: true },
    { name: 'L', sizeTypeId: clothingSizeType?.id, sortOrder: 4, isActive: true },
    { name: 'XL', sizeTypeId: clothingSizeType?.id, sortOrder: 5, isActive: true },
    { name: '2XL', sizeTypeId: clothingSizeType?.id, sortOrder: 6, isActive: true },
    { name: '3XL', sizeTypeId: clothingSizeType?.id, sortOrder: 7, isActive: true },

    // Footwear sizes
    { name: '36', sizeTypeId: footwearSizeType?.id, sortOrder: 1, isActive: true },
    { name: '37', sizeTypeId: footwearSizeType?.id, sortOrder: 2, isActive: true },
    { name: '38', sizeTypeId: footwearSizeType?.id, sortOrder: 3, isActive: true },
    { name: '39', sizeTypeId: footwearSizeType?.id, sortOrder: 4, isActive: true },
    { name: '40', sizeTypeId: footwearSizeType?.id, sortOrder: 5, isActive: true },
    { name: '41', sizeTypeId: footwearSizeType?.id, sortOrder: 6, isActive: true },
    { name: '42', sizeTypeId: footwearSizeType?.id, sortOrder: 7, isActive: true },
    { name: '43', sizeTypeId: footwearSizeType?.id, sortOrder: 8, isActive: true },
    { name: '44', sizeTypeId: footwearSizeType?.id, sortOrder: 9, isActive: true },
    { name: '45', sizeTypeId: footwearSizeType?.id, sortOrder: 10, isActive: true },

    // Accessory sizes (one size)
    { name: 'Free size', sizeTypeId: accessorySizeType?.id, sortOrder: 1, isActive: true },
  ];

  await sizeRepository.save(sizes);
  console.log(`✅ Seeded ${sizes.length} sizes`);
}
