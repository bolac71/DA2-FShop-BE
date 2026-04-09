import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSizeTypesTable1741046400001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'size_types',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
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
      true,
    );

    // Insert predefined size types
    await queryRunner.query(`
      INSERT INTO size_types (name, description, is_active)
      VALUES 
        ('CLOTHING', 'Size type for clothing items', true),
        ('FOOTWEAR', 'Size type for footwear items', true),
        ('ACCESSORY', 'Size type for accessory items', true),
        ('FREESIZE', 'One size fits all', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('size_types', true);
  }
}
