import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCartItemsTable1741046400013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'quantity',
            type: 'integer',
            isNullable: false,
            default: 1,
          },
          {
            name: 'cartId',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'variantId',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          {
            name: 'UQ_cart_items_cart_variant',
            columnNames: ['cartId', 'variantId'],
          },
        ],
      }),
      true,
    );

    // Add foreign key to carts table
    await queryRunner.createForeignKey(
      'cart_items',
      new TableForeignKey({
        columnNames: ['cartId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'carts',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Add foreign key to product_variants table
    await queryRunner.createForeignKey(
      'cart_items',
      new TableForeignKey({
        columnNames: ['variantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'product_variants',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Add indexes for common queries
    await queryRunner.createIndex(
      'cart_items',
      new TableIndex({
        name: 'IDX_cart_items_cart_id',
        columnNames: ['cartId'],
      }),
    );

    await queryRunner.createIndex(
      'cart_items',
      new TableIndex({
        name: 'IDX_cart_items_variant_id',
        columnNames: ['variantId'],
      }),
    );

    // Composite index for finding items in a cart
    await queryRunner.createIndex(
      'cart_items',
      new TableIndex({
        name: 'IDX_cart_items_cart_variant',
        columnNames: ['cartId', 'variantId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('cart_items', 'IDX_cart_items_cart_variant');
    await queryRunner.dropIndex('cart_items', 'IDX_cart_items_variant_id');
    await queryRunner.dropIndex('cart_items', 'IDX_cart_items_cart_id');

    // Drop foreign keys
    await queryRunner.dropForeignKey('cart_items', 'FK_cart_items_variantId_product_variants_id');
    await queryRunner.dropForeignKey('cart_items', 'FK_cart_items_cartId_carts_id');

    // Drop table
    await queryRunner.dropTable('cart_items');
  }
}
