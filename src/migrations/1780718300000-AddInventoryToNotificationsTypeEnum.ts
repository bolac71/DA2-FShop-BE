import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryToNotificationsTypeEnum1780718300000
  implements MigrationInterface
{
  name = 'AddInventoryToNotificationsTypeEnum1780718300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'INVENTORY'`,
    );
  }

  public async down(): Promise<void> {
    return;
  }
}
