import { DataSource } from 'typeorm';
import { seedUsers } from './users.seeder';
import { seedBrands } from './brands.seeder';
import { seedCategories } from './categories.seeder';
import { seedColors } from './colors.seeder';
import { seedSizes } from './sizes.seeder';
import { AppDataSource } from '../data-source';
import { ProductVariant } from '../modules/products/entities/product-variant.entity';
import { Product } from '../modules/products/entities/product.entity';
import { Brand } from '../modules/brands/entities/brand.entity';
import { Category } from '../modules/categories/entities/category.entity';
import { Color } from '../modules/colors/entities/color.entity';
import { Size } from '../modules/sizes/entities/size.entity';
import { User } from '../modules/users/entities/user.entity';

/**
 * Clear all data in reverse order of FK dependencies
 * Child tables first, then parent tables
 */
async function clearAllData(dataSource: DataSource): Promise<void> {
  try {
    // Clear in reverse order of FK dependencies
    const userRepo = dataSource.getRepository(User);
    const brandRepo = dataSource.getRepository(Brand);
    const categoryRepo = dataSource.getRepository(Category);
    const colorRepo = dataSource.getRepository(Color);
    const sizeRepo = dataSource.getRepository(Size);

    console.log('🗑️  Clearing existing data...');
    
    await userRepo.createQueryBuilder().delete().execute();
    await brandRepo.createQueryBuilder().delete().execute();
    await categoryRepo.createQueryBuilder().delete().execute();
    await colorRepo.createQueryBuilder().delete().execute();
    await sizeRepo.createQueryBuilder().delete().execute();

    console.log('✅ Cleared all existing data');
  } catch (error) {
    console.error('⚠️ Error clearing data (may be empty tables):' , error);
  }
}

/**
 * Main seed runner
 * Usage: npx ts-node src/seeds/seed.ts
 */
async function runSeed() {
  try {
    console.log('🌱 Starting database seed...');

    // Initialize data source if not already initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Clear all existing data first (in reverse FK order)
    await clearAllData(AppDataSource);

    // Run seeders in order (respecting foreign key dependencies)
    // Users first since they have no dependencies
    await seedUsers(AppDataSource);
    await seedBrands(AppDataSource);
    await seedCategories(AppDataSource);
    await seedColors(AppDataSource);
    await seedSizes(AppDataSource);

    console.log('✅ Database seeding completed successfully!');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

runSeed();
