import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminBroadcastNotificationTypeEnumValue1743852000000
  implements MigrationInterface
{
  name = 'AddAdminBroadcastNotificationTypeEnumValue1743852000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'ADMIN_BROADCAST'`,
    );
  }

  public async down(): Promise<void> {
    // Enum value rollback is intentionally omitted for PostgreSQL safety.
  }
}
