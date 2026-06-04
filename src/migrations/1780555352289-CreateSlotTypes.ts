import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSlotTypes1780555352289 implements MigrationInterface {
    name = 'CreateSlotTypes1780555352289'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "slot_types" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "code" character varying NOT NULL, "hint" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d3b87ec854f7048200c77f5adfc" UNIQUE ("name"), CONSTRAINT "UQ_21ec4325da8dd80efaf8d6d6d54" UNIQUE ("code"), CONSTRAINT "PK_6042c0cb9baf34d51f849228f5a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "slot_type_id" integer`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_slot_type" FOREIGN KEY ("slot_type_id") REFERENCES "slot_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        
        // Add default data
        await queryRunner.query(`INSERT INTO "slot_types" ("name", "code", "hint") VALUES ('Áo', 'top', 'Áo thun, sơ mi, áo khoác') ON CONFLICT DO NOTHING`);
        await queryRunner.query(`INSERT INTO "slot_types" ("name", "code", "hint") VALUES ('Quần/Váy', 'bottom', 'Quần jeans, chân váy') ON CONFLICT DO NOTHING`);
        await queryRunner.query(`INSERT INTO "slot_types" ("name", "code", "hint") VALUES ('Giày', 'shoes', 'Sneaker, sandal, giày cao gót') ON CONFLICT DO NOTHING`);
        await queryRunner.query(`INSERT INTO "slot_types" ("name", "code", "hint") VALUES ('Phụ kiện', 'accessory', 'Túi, mũ, balo') ON CONFLICT DO NOTHING`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_slot_type"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "slot_type_id"`);
        await queryRunner.query(`DROP TABLE "slot_types"`);
    }
}
