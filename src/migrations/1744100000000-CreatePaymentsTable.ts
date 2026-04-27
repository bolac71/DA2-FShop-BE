import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePaymentsTable1744100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_status enum type
    await queryRunner.query(`
      CREATE TYPE payments_status_enum AS ENUM(
        'pending',
        'completed',
        'failed',
        'expired',
        'refunded'
      )
    `);

    // Create payment_method enum type
    await queryRunner.query(`
      CREATE TYPE payments_method_enum AS ENUM(
        'momo',
        'cod'
      )
    `);

    // Create payments table
    await queryRunner.createTable(
      new Table({
        name: 'payments',
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
            name: 'user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'method',
            type: 'payments_method_enum',
            isNullable: false,
            default: "'momo'",
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'payments_status_enum',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'external_transaction_id',
            type: 'varchar',
            isNullable: true,
            comment: 'Transaction ID from payment gateway (MoMo)',
          },
          {
            name: 'request_id',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
            comment: 'Unique request ID to prevent duplicate webhook processing',
          },
          {
            name: 'retry_count',
            type: 'integer',
            default: 0,
          },
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
    );

    // Add foreign key: order_id -> orders.id
    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'orders',
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key: user_id -> users.id
    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes for query performance
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        columnNames: ['order_id'],
        name: 'idx_payments_order_id',
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        columnNames: ['user_id'],
        name: 'idx_payments_user_id',
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        columnNames: ['status'],
        name: 'idx_payments_status',
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        columnNames: ['created_at'],
        name: 'idx_payments_created_at',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table (will cascade delete related records)
    await queryRunner.dropTable('payments');

    // Drop enum types (IF EXISTS in case TypeORM already dropped them)
    await queryRunner.query('DROP TYPE IF EXISTS payments_status_enum');
    await queryRunner.query('DROP TYPE IF EXISTS payments_method_enum');
  }
}
