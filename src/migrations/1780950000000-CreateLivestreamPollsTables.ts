import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLivestreamPollsTables1780950000000 implements MigrationInterface {
    name = 'CreateLivestreamPollsTables1780950000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "livestream_polls" (
                "id" SERIAL NOT NULL,
                "livestream_id" integer NOT NULL,
                "question" character varying(500) NOT NULL,
                "options" jsonb NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'active',
                "total_votes" integer NOT NULL DEFAULT 0,
                "results" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "ended_at" TIMESTAMP,
                CONSTRAINT "PK_livestream_polls" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "livestream_poll_votes" (
                "id" SERIAL NOT NULL,
                "poll_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                "option_index" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_poll_user_vote" UNIQUE ("poll_id", "user_id"),
                CONSTRAINT "PK_livestream_poll_votes" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "livestream_polls"
            ADD CONSTRAINT "FK_livestream_polls_livestream"
            FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "livestream_poll_votes"
            ADD CONSTRAINT "FK_poll_votes_poll"
            FOREIGN KEY ("poll_id") REFERENCES "livestream_polls"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "livestream_poll_votes"
            ADD CONSTRAINT "FK_poll_votes_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`CREATE INDEX "IDX_livestream_polls_livestream_id" ON "livestream_polls" ("livestream_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_livestream_polls_status" ON "livestream_polls" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_poll_votes_poll_id" ON "livestream_poll_votes" ("poll_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_poll_votes_poll_id"`);
        await queryRunner.query(`DROP INDEX "IDX_livestream_polls_status"`);
        await queryRunner.query(`DROP INDEX "IDX_livestream_polls_livestream_id"`);
        await queryRunner.query(`ALTER TABLE "livestream_poll_votes" DROP CONSTRAINT "FK_poll_votes_user"`);
        await queryRunner.query(`ALTER TABLE "livestream_poll_votes" DROP CONSTRAINT "FK_poll_votes_poll"`);
        await queryRunner.query(`ALTER TABLE "livestream_polls" DROP CONSTRAINT "FK_livestream_polls_livestream"`);
        await queryRunner.query(`DROP TABLE "livestream_poll_votes"`);
        await queryRunner.query(`DROP TABLE "livestream_polls"`);
    }
}
