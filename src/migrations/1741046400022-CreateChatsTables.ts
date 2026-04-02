import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateChatsTables1741046400022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE conversation_status_enum AS ENUM('OPEN', 'HANDLING')
    `);

    await queryRunner.query(`
      CREATE TYPE messages_sender_role_enum AS ENUM('user', 'admin')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'conversation',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'customer_id',
            type: 'integer',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'assigned_admin_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'conversation_status_enum',
            default: "'OPEN'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'last_message_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'conversation',
      new TableForeignKey({
        name: 'FK_conversation_customer_id',
        columnNames: ['customer_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'conversation',
      new TableForeignKey({
        name: 'FK_conversation_assigned_admin_id',
        columnNames: ['assigned_admin_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.query(`CREATE INDEX IDX_conversation_status ON conversation (status)`);
    await queryRunner.query(
      `CREATE INDEX IDX_conversation_assigned_admin_id ON conversation (assigned_admin_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_conversation_last_message_at ON conversation (last_message_at)`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'conversation_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'sender_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'sender_role',
            type: 'messages_sender_role_enum',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'attachments',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_delivered',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'is_seen',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        name: 'FK_messages_conversation_id',
        columnNames: ['conversation_id'],
        referencedTableName: 'conversation',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        name: 'FK_messages_sender_id',
        columnNames: ['sender_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.query(`CREATE INDEX IDX_messages_conversation_id ON messages (conversation_id)`);
    await queryRunner.query(`CREATE INDEX IDX_messages_sender_id ON messages (sender_id)`);
    await queryRunner.query(`CREATE INDEX IDX_messages_created_at ON messages (created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_messages_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_messages_sender_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_messages_conversation_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_messages_createdAt`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_messages_senderId`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_messages_conversationId`);
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_messages_sender_id"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_messages_conversation_id"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_messages_senderId"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_messages_conversationId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);

    await queryRunner.query(`DROP INDEX IF EXISTS IDX_conversation_last_message_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_conversation_assigned_admin_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_conversation_lastMessageAt`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_conversation_assignedAdminId`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_conversation_status`);

    await queryRunner.query(`ALTER TABLE "conversation" DROP CONSTRAINT IF EXISTS "FK_conversation_assigned_admin_id"`);
    await queryRunner.query(`ALTER TABLE "conversation" DROP CONSTRAINT IF EXISTS "FK_conversation_customer_id"`);
    await queryRunner.query(`ALTER TABLE "conversation" DROP CONSTRAINT IF EXISTS "FK_conversation_assignedAdminId"`);
    await queryRunner.query(`ALTER TABLE "conversation" DROP CONSTRAINT IF EXISTS "FK_conversation_customerId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversation"`);

    await queryRunner.query(`DROP TYPE IF EXISTS messages_sender_role_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS conversation_status_enum`);
  }
}