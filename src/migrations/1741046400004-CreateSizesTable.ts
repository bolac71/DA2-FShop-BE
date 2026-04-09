import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSizesTable1741046400004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for size type
    await queryRunner.query(
      `CREATE TYPE "sizes_type_enum" AS ENUM('CLOTHING', 'FOOTWEAR', 'ACCESSORY', 'FREESIZE')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sizes',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'sizes_type_enum',
            default: `'CLOTHING'`,
          },
          {
            name: 'sort_order',
            type: 'integer',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sizes');
    await queryRunner.query(`DROP TYPE "sizes_type_enum"`);
  }
}
