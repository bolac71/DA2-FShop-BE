import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddShippingQuoteColumnsToOrders1741046400102 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: TableColumn[] = [
      new TableColumn({
        name: 'shipping_rate_id',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'shipping_carrier_name',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'shipping_service_name',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'shipping_expected',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'shipping_rate_fee',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
      new TableColumn({
        name: 'shipping_tracking_url',
        type: 'varchar',
        isNullable: true,
      }),
    ];

    for (const column of columns) {
      const hasColumn = await queryRunner.hasColumn('orders', column.name);
      if (!hasColumn) {
        await queryRunner.addColumn('orders', column);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnNames = [
      'shipping_tracking_url',
      'shipping_rate_fee',
      'shipping_expected',
      'shipping_service_name',
      'shipping_carrier_name',
      'shipping_rate_id',
    ];

    for (const columnName of columnNames) {
      const hasColumn = await queryRunner.hasColumn('orders', columnName);
      if (hasColumn) {
        await queryRunner.dropColumn('orders', columnName);
      }
    }
  }
}
