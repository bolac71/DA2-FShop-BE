import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPaymentMethodToOrdersTable1744100000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_method enum type if it doesn't exist
    await queryRunner.query(`
      CREATE TYPE orders_payment_method_enum AS ENUM(
        'momo',
        'vnpay',
        'cod'
      )
    `);

    // Add payment_method column to orders table
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'payment_method',
        type: 'orders_payment_method_enum',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop payment_method column
    await queryRunner.dropColumn('orders', 'payment_method');

    // Drop enum type
    await queryRunner.query('DROP TYPE orders_payment_method_enum');
  }
}
