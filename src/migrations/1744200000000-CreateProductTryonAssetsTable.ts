import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateProductTryonAssetsTable1744200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'product_tryon_assets',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'product_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'variant_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'asset_type',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'deepar_effect_url',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'thumbnail_url',
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
        checks: [
          {
            name: 'chk_product_tryon_assets_asset_type',
            expression: "asset_type IN ('glasses', 'hat', 'accessory')",
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'product_tryon_assets',
      new TableForeignKey({
        name: 'fk_product_tryon_assets_product_id',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'product_tryon_assets',
      new TableForeignKey({
        name: 'fk_product_tryon_assets_variant_id',
        columnNames: ['variant_id'],
        referencedTableName: 'product_variants',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'product_tryon_assets',
      new TableIndex({
        name: 'idx_product_tryon_assets_product_id',
        columnNames: ['product_id'],
      }),
    );

    await queryRunner.createIndex(
      'product_tryon_assets',
      new TableIndex({
        name: 'idx_product_tryon_assets_is_active',
        columnNames: ['is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('product_tryon_assets', 'idx_product_tryon_assets_is_active');
    await queryRunner.dropIndex('product_tryon_assets', 'idx_product_tryon_assets_product_id');
    await queryRunner.dropForeignKey('product_tryon_assets', 'fk_product_tryon_assets_variant_id');
    await queryRunner.dropForeignKey('product_tryon_assets', 'fk_product_tryon_assets_product_id');
    await queryRunner.dropTable('product_tryon_assets');
  }
}
