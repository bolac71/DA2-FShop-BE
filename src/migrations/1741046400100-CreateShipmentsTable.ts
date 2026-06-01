import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateShipmentsTable1741046400100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'shipments',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'order_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'shipment_provider',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'shipment_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'tracking_code',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'tracking_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'carrier_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'shipping_service',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'shipping_fee',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'shipment_status',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'shipment_status_code',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'shipment_meta',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'last_error',
            type: 'text',
            isNullable: true,
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

    await queryRunner.createForeignKey(
      'shipments',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'orders',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_shipments_shipment_id ON shipments(shipment_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_shipments_tracking_code ON shipments(tracking_code)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('shipments', true);
  }
}
