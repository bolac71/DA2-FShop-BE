import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateReviewsTable1741046400022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reviews table
    await queryRunner.createTable(
      new Table({
        name: 'reviews',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'order_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'variant_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'rating',
            type: 'numeric',
            precision: 2,
            scale: 1,
            default: 5.0,
            isNullable: false,
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    // Create foreign key: user_id -> users
    await queryRunner.createForeignKey(
      'reviews',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        name: 'fk_reviews_user_id',
      }),
    );

    // Create foreign key: order_id -> orders
    await queryRunner.createForeignKey(
      'reviews',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'orders',
        onDelete: 'CASCADE',
        name: 'fk_reviews_order_id',
      }),
    );

    // Create foreign key: variant_id -> product_variants
    await queryRunner.createForeignKey(
      'reviews',
      new TableForeignKey({
        columnNames: ['variant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'product_variants',
        onDelete: 'CASCADE',
        name: 'fk_reviews_variant_id',
      }),
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'idx_reviews_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'idx_reviews_variant_id',
        columnNames: ['variant_id'],
      }),
    );

    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'idx_reviews_is_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'idx_reviews_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('reviews', 'fk_reviews_variant_id');
    await queryRunner.dropForeignKey('reviews', 'fk_reviews_order_id');
    await queryRunner.dropForeignKey('reviews', 'fk_reviews_user_id');

    // Drop table
    await queryRunner.dropTable('reviews');
  }
}
