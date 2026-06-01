import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateOutfitsTables1780272000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE outfit_items_slot_enum AS ENUM ('top', 'bottom', 'shoes', 'accessory');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.createTable(
      new Table({
        name: 'outfits',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'user_id', type: 'int' },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'outfits',
      new TableForeignKey({
        name: 'fk_outfits_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'outfits',
      new TableIndex({
        name: 'idx_outfits_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'outfit_items',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'outfit_id', type: 'int' },
          { name: 'slot', type: 'outfit_items_slot_enum' },
          { name: 'product_id', type: 'int' },
          { name: 'variant_id', type: 'int' },
          { name: 'quantity', type: 'int', default: 1 },
          { name: 'layout', type: 'json', isNullable: true },
        ],
        uniques: [
          {
            name: 'uq_outfit_items_outfit_slot',
            columnNames: ['outfit_id', 'slot'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('outfit_items', [
      new TableForeignKey({
        name: 'fk_outfit_items_outfit_id',
        columnNames: ['outfit_id'],
        referencedTableName: 'outfits',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_outfit_items_product_id',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_outfit_items_variant_id',
        columnNames: ['variant_id'],
        referencedTableName: 'product_variants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      'outfit_items',
      new TableIndex({
        name: 'idx_outfit_items_outfit_id',
        columnNames: ['outfit_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('outfit_items', 'idx_outfit_items_outfit_id');
    await queryRunner.dropTable('outfit_items', true);
    await queryRunner.dropIndex('outfits', 'idx_outfits_user_id');
    await queryRunner.dropTable('outfits', true);
    await queryRunner.query('DROP TYPE IF EXISTS outfit_items_slot_enum');
  }
}
