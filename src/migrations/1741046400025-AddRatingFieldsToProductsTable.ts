import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRatingFieldsToProductsTable1741046400025 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add average_rating column
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'average_rating',
        type: 'numeric',
        precision: 2,
        scale: 1,
        default: 0,
        isNullable: false,
      }),
    );

    // Add review_count column
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'review_count',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns in reverse order
    await queryRunner.dropColumn('products', 'review_count');
    await queryRunner.dropColumn('products', 'average_rating');
  }
}
