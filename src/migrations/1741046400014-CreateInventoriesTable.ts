import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateInventoriesTable1741046400014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'inventories',
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
            name: 'quantity',
            type: 'integer',
            isNullable: false,
            default: 0,
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
            name: 'UQ_inventories_variant_id',
            columnNames: ['variant_id'],
          },
        ],
      }),
      true,
    );

    // Add foreign key to product_variants table
    await queryRunner.createForeignKey(
      'inventories',
      new TableForeignKey({
        columnNames: ['variant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'product_variants',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create index for variant lookup
    await queryRunner.createIndex(
      'inventories',
      new TableIndex({
        name: 'IDX_inventories_variant_id',
        columnNames: ['variant_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('inventories');
  }
}
