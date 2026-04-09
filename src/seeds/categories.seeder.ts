import { DataSource } from 'typeorm';
import { Category } from '../modules/categories/entities/category.entity';
import { DepartmentType } from '../constants/department-type.enum';

export async function seedCategories(dataSource: DataSource): Promise<void> {
  const categoryRepository = dataSource.getRepository(Category);

  const categories: any[] = [
    // Men
    {
      name: 'Áo thun nam',
      slug: 'ao-thun-nam',
      description: 'Áo thun cơ bản cho nam',
      department: DepartmentType.MEN,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124161/levis_cftnvo.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Quần jeans nam',
      slug: 'quan-jeans-nam',
      description: 'Quần jeans thời trang cho nam',
      department: DepartmentType.MEN,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124335/quan-jeans-nam_k34h6q.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Giày thể thao nam',
      slug: 'giay-the-thao-nam',
      description: 'Giày thể thao chất lượng cao cho nam',
      department: DepartmentType.MEN,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124390/giay-the-thao-nam_o5zaha.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Áo khoác nam',
      slug: 'ao-khoac-nam',
      description: 'Áo khoác ngoài cho nam',
      department: DepartmentType.MEN,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124453/ao-khoac-nam_nefayr.png',
      publicId: null,
      isActive: true,
    },

    // Women
    {
      name: 'Áo thun nữ',
      slug: 'ao-thun-nu',
      description: 'Áo thun cơ bản cho nữ',
      department: DepartmentType.WOMEN,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124601/ao-thun-nu_sfadzr.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Quần jeans nữ',
      slug: 'quan-jeans-nu',
      description: 'Quần jeans thời trang cho nữ',
      department: DepartmentType.WOMEN,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124791/quan-jeans-nu_yqcvgr.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Giày cao gót nữ',
      slug: 'giay-cao-got-nu',
      description: 'Giày cao gót sang trọng cho nữ',
      department: DepartmentType.WOMEN,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124830/giay-cao-got-nu_julhep.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Váy nữ',
      slug: 'vay-nu',
      description: 'Váy thời trang cho nữ',
      department: DepartmentType.WOMEN,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773124965/vay-nu_t1t8he.png',
      publicId: null,
      isActive: true,
    },

    // Kids
    {
      name: 'Áo trẻ em',
      slug: 'ao-tre-em',
      description: 'Áo thun cho trẻ em',
      department: DepartmentType.KIDS,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773125263/ao-tre-em_mkvwxn.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Quần trẻ em',
      slug: 'quan-tre-em',
      description: 'Quần đi học cho trẻ em',
      department: DepartmentType.KIDS,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773125304/quan-tre-em_sxoqyc.png',
      publicId: null,
      isActive: true,
    },
    {
      name: 'Giày trẻ em',
      slug: 'giay-tre-em',
      description: 'Giày thoải mái cho trẻ em',
      department: DepartmentType.KIDS,
      imageUrl: 'https://res.cloudinary.com/dtkbbwmg4/image/upload/v1773125347/giay-tre-em_qcjbmu.png',
      publicId: null,
      isActive: true,
    },
  ];

  await categoryRepository.save(categories);
  console.log(`✅ Seeded ${categories.length} categories`);
}
