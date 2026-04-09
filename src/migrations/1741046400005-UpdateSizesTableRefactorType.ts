import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class UpdateSizesTableRefactorType1741046400005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add sizeTypeId column
    await queryRunner.addColumn(
      'sizes',
      new TableColumn({
        name: 'size_type_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'sizes',
      new TableForeignKey({
        columnNames: ['size_type_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'size_types',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Drop type enum column if it exists
    try {
      await queryRunner.dropColumn('sizes', 'type');
    } catch (error) {
      // Column might not exist in fresh database
      console.log('Type column does not exist, skipping drop');
    }

    // Set default sizeTypeId to 1 (CLOTHING) for null values after relationship is established
    // This query assumes CLOTHING has id=1
    await queryRunner.query(`
      UPDATE sizes SET size_type_id = 1 WHERE size_type_id IS NULL
    `);

    // Make size_type_id NOT NULL after populating with data
    await queryRunner.changeColumn(
      'sizes',
      'size_type_id',
      new TableColumn({
        name: 'size_type_id',
        type: 'int',
        isNullable: false,
      }),
    );

    // Drop size_types_type_enum if it exists
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS sizes_type_enum`);
    } catch (error) {
      console.log('Enum type does not exist, skipping drop');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('sizes');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('size_type_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('sizes', foreignKey);
      }
    }

    // Drop sizeTypeId column
    await queryRunner.dropColumn('sizes', 'size_type_id');

    // Recreate type enum column (optional)
    await queryRunner.query(`
      CREATE TYPE sizes_type_enum AS ENUM ('CLOTHING', 'FOOTWEAR', 'ACCESSORY', 'FREESIZE')
    `);

    await queryRunner.addColumn(
      'sizes',
      new TableColumn({
        name: 'type',
        type: 'enum',
        enum: ['CLOTHING', 'FOOTWEAR', 'ACCESSORY', 'FREESIZE'],
        default: "'CLOTHING'",
      }),
    );
  }
}
