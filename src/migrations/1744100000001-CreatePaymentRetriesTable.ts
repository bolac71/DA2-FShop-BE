import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePaymentRetriesTable1744100000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_retries table
    await queryRunner.createTable(
      new Table({
        name: 'payment_retries',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'payment_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
            comment: 'Reason for retry (e.g., "User manual retry", "Automatic retry on failed payment")',
          },
          {
            name: 'attempted_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'response_code',
            type: 'varchar',
            isNullable: true,
            comment: 'Response code from gateway',
          },
          {
            name: 'response_message',
            type: 'text',
            isNullable: true,
            comment: 'Response message from gateway',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Add foreign key: payment_id -> payments.id
    await queryRunner.createForeignKey(
      'payment_retries',
      new TableForeignKey({
        columnNames: ['payment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'payments',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table (will cascade delete related records)
    await queryRunner.dropTable('payment_retries');
  }
}
