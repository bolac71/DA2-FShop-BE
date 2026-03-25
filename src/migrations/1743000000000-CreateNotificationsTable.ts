import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateNotificationsTable1743000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "notifications_type_enum" AS ENUM('DISCOUNT', 'ORDER', 'REVIEW', 'POST')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'notifications_type_enum',
            isNullable: false,
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        name: 'FK_notifications_userId_users_id',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_read_created_at" ON "notifications" ("userId", "isRead", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_read_created_at"`);
    await queryRunner.dropForeignKey('notifications', 'FK_notifications_userId_users_id');
    await queryRunner.dropTable('notifications');
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum"`);
  }
}
