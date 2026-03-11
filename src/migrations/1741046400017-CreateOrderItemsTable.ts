import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateOrderItemsTable1741046400017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create order_items table
    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'order_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'variant_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'price',
            type: 'numeric',
            precision: 10,
            scale: 2,
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
            isNullable: false,
          },
        ],
      }),
    );

    // Create foreign key for order_id
    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create foreign key for variant_id
    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['variant_id'],
        referencedTableName: 'product_variants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.query(`CREATE INDEX IDX_order_items_order_id ON order_items (order_id)`);
    await queryRunner.query(`CREATE INDEX IDX_order_items_variant_id ON order_items (variant_id)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX UQ_order_items_order_variant ON order_items (order_id, variant_id)`,
    );
    await queryRunner.query(`CREATE INDEX IDX_order_items_created_at ON order_items (created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX UQ_order_items_order_variant`);
    await queryRunner.query(`DROP INDEX IDX_order_items_created_at`);
    await queryRunner.query(`DROP INDEX IDX_order_items_variant_id`);
    await queryRunner.query(`DROP INDEX IDX_order_items_order_id`);

    // Drop foreign keys
    await queryRunner.dropForeignKey('order_items', 'FK_order_items_variant_id');
    await queryRunner.dropForeignKey('order_items', 'FK_order_items_order_id');

    // Drop table
    await queryRunner.dropTable('order_items');
  }
}
