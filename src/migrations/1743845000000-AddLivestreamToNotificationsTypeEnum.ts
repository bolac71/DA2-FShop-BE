import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLivestreamToNotificationsTypeEnum1743845000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'LIVESTREAM'`,
    );
  }

  // PostgreSQL does not support dropping a single enum value directly.
  public async down(): Promise<void> {
    return;
  }
}
