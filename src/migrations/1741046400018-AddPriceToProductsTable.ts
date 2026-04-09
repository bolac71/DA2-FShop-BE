import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPriceToProductsTable1741046400018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists before adding
    const table = await queryRunner.getTable('products');
    const priceColumnExists = table?.columns.some((col) => col.name === 'price');

    if (!priceColumnExists) {
      await queryRunner.addColumn(
        'products',
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('products');
    const priceColumn = table?.columns.find((col) => col.name === 'price');

    if (priceColumn) {
      await queryRunner.dropColumn('products', 'price');
    }
  }
}
