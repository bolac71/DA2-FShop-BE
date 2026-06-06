import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferenceIdToNotifications1780718200000
  implements MigrationInterface
{
  name = 'AddReferenceIdToNotifications1780718200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "referenceId" integer NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "referenceId"`,
    );
  }
}
