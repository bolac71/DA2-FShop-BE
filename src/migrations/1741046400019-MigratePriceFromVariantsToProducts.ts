import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MigratePriceFromVariantsToProducts1741046400019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate price data from product_variants to products
    // For each product, take the minimum price from its variants
    await queryRunner.query(`
      UPDATE products 
      SET price = (
        SELECT MIN(pv.price) 
        FROM product_variants pv 
        WHERE pv.product_id = products.id 
        AND pv.is_active = true
      )
      WHERE id IN (
        SELECT DISTINCT product_id FROM product_variants WHERE is_active = true
      )
    `);

    // Drop the price column from product_variants
    const table = await queryRunner.getTable('product_variants');
    const priceColumn = table?.columns.find((col) => col.name === 'price');

    if (priceColumn) {
      await queryRunner.dropColumn('product_variants', 'price');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add price column back to product_variants
    const table = await queryRunner.getTable('product_variants');
    const priceColumnExists = table?.columns.some((col) => col.name === 'price');

    if (!priceColumnExists) {
      await queryRunner.addColumn(
        'product_variants',
        new TableColumn({
          name: 'price',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: false,
          default: 0,
        }),
      );
    }

    // Restore price data from products to product_variants
    // Each variant gets the product's price
    await queryRunner.query(`
      UPDATE product_variants 
      SET price = (SELECT p.price FROM products p WHERE p.id = product_variants.product_id)
    `);
  }
}
