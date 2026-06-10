import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDressSlotType1780900000000 implements MigrationInterface {
    name = 'AddDressSlotType1780900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO "slot_types" ("name", "code", "hint") VALUES ('Đầm/Váy liền thân', 'dress', 'Váy liền thân, đầm dạ hội') ON CONFLICT DO NOTHING`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "slot_types" WHERE "code" = 'dress'`);
    }
}
