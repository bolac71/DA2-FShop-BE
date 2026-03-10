import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateAddressesTable1741046400010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for address type
    await queryRunner.query(`CREATE TYPE "addresses_type_enum" AS ENUM('home', 'work', 'other')`);

    await queryRunner.createTable(
      new Table({
        name: 'addresses',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'recipient_name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'recipient_phone',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'detail_address',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'province',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'district',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'commune',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'addresses_type_enum',
            default: `'home'`,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'userId',
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
      }),
      true,
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'addresses',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Add index for userId for faster queries
    await queryRunner.query(`CREATE INDEX "IDX_addresses_user_id" ON "addresses" ("userId")`);

    // Add index for isActive and isDefault for common queries
    await queryRunner.query(
      `CREATE INDEX "IDX_addresses_user_active_default" ON "addresses" ("userId", "is_active", "is_default")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_addresses_user_active_default"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_addresses_user_id"`);

    // Drop foreign key
    await queryRunner.dropForeignKey('addresses', 'FK_addresses_userId_users_id');

    // Drop table
    await queryRunner.dropTable('addresses');

    // Drop enum type
    await queryRunner.query(`DROP TYPE "addresses_type_enum"`);
  }
}
