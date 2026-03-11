import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateOrdersTable1741046400016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create order_status enum type
    await queryRunner.query(`
      CREATE TYPE orders_status_enum AS ENUM(
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'canceled',
        'return_requested',
        'returned',
        'refunded'
      )
    `);

    // Create shipping_method enum type
    await queryRunner.query(`
      CREATE TYPE orders_shipping_method_enum AS ENUM(
        'standard',
        'express'
      )
    `);

    // Create orders table
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'recipient_name',
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
            name: 'status',
            type: 'orders_status_enum',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'total_amount',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'shipping_method',
            type: 'orders_shipping_method_enum',
            default: "'standard'",
            isNullable: false,
          },
          {
            name: 'shipping_fee',
            type: 'numeric',
            precision: 10,
            scale: 2,
            default: 0,
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

    // Create foreign key for user_id
    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.query(`CREATE INDEX IDX_orders_user_id ON orders (user_id)`);
    await queryRunner.query(`CREATE INDEX IDX_orders_status ON orders (status)`);
    await queryRunner.query(`CREATE INDEX IDX_orders_created_at ON orders (created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IDX_orders_created_at`);
    await queryRunner.query(`DROP INDEX IDX_orders_status`);
    await queryRunner.query(`DROP INDEX IDX_orders_user_id`);

    // Drop foreign key
    await queryRunner.dropForeignKey('orders', 'FK_orders_user_id');

    // Drop table
    await queryRunner.dropTable('orders');

    // Drop enum types
    await queryRunner.query(`DROP TYPE orders_shipping_method_enum`);
    await queryRunner.query(`DROP TYPE orders_status_enum`);
  }
}
