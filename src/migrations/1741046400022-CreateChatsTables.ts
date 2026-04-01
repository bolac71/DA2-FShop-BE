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
            name: 'customerId',
            type: 'integer',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'assignedAdminId',
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
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'lastMessageAt',
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
        name: 'FK_conversation_customerId',
        columnNames: ['customerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'conversation',
      new TableForeignKey({
        name: 'FK_conversation_assignedAdminId',
        columnNames: ['assignedAdminId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.query(`CREATE INDEX IDX_conversation_status ON conversation (status)`);
    await queryRunner.query(
      `CREATE INDEX IDX_conversation_assignedAdminId ON conversation ("assignedAdminId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_conversation_lastMessageAt ON conversation ("lastMessageAt")`,
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
            name: 'conversationId',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'senderId',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'senderRole',
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
            name: 'isDelivered',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'isSeen',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'createdAt',
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
        name: 'FK_messages_conversationId',
        columnNames: ['conversationId'],
        referencedTableName: 'conversation',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        name: 'FK_messages_senderId',
        columnNames: ['senderId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.query(`CREATE INDEX IDX_messages_conversationId ON messages ("conversationId")`);
    await queryRunner.query(`CREATE INDEX IDX_messages_senderId ON messages ("senderId")`);
    await queryRunner.query(`CREATE INDEX IDX_messages_createdAt ON messages ("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IDX_messages_createdAt`);
    await queryRunner.query(`DROP INDEX IDX_messages_senderId`);
    await queryRunner.query(`DROP INDEX IDX_messages_conversationId`);

    await queryRunner.dropForeignKey('messages', 'FK_messages_senderId');
    await queryRunner.dropForeignKey('messages', 'FK_messages_conversationId');
    await queryRunner.dropTable('messages');

    await queryRunner.query(`DROP INDEX IDX_conversation_lastMessageAt`);
    await queryRunner.query(`DROP INDEX IDX_conversation_assignedAdminId`);
    await queryRunner.query(`DROP INDEX IDX_conversation_status`);

    await queryRunner.dropForeignKey('conversation', 'FK_conversation_assignedAdminId');
    await queryRunner.dropForeignKey('conversation', 'FK_conversation_customerId');
    await queryRunner.dropTable('conversation');

    await queryRunner.query(`DROP TYPE messages_sender_role_enum`);
    await queryRunner.query(`DROP TYPE conversation_status_enum`);
  }
}