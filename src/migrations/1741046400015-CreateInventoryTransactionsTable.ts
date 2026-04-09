import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateInventoryTransactionsTable1741046400015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'inventory_transactions',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'variant_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['IMPORT', 'EXPORT', 'RETURN', 'ADJUSTMENT'],
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key to product_variants table
    await queryRunner.createForeignKey(
      'inventory_transactions',
      new TableForeignKey({
        columnNames: ['variant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'product_variants',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'inventory_transactions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes for common queries
    await queryRunner.createIndex(
      'inventory_transactions',
      new TableIndex({
        name: 'IDX_inventory_transactions_variant_id',
        columnNames: ['variant_id'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_transactions',
      new TableIndex({
        name: 'IDX_inventory_transactions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_transactions',
      new TableIndex({
        name: 'IDX_inventory_transactions_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Composite index for finding transactions by variant and date
    await queryRunner.createIndex(
      'inventory_transactions',
      new TableIndex({
        name: 'IDX_inventory_transactions_variant_date',
        columnNames: ['variant_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('inventory_transactions');
  }
}
