import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSeatsAndSessionEntities1769476553498 implements MigrationInterface {
    name = 'UpdateSeatsAndSessionEntities1769476553498'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."seats_status_enum" AS ENUM('available', 'reserved', 'sold')`);
        await queryRunner.query(`CREATE TABLE "seats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "seat_number" character varying NOT NULL, "row" character(1) NOT NULL, "status" "public"."seats_status_enum" NOT NULL DEFAULT 'available', "version" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3fbc74bb4638600c506dcb777a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a818b702ebcda16173249d60d4" ON "seats" ("session_id", "seat_number", "row") `);
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "movie_name" character varying NOT NULL, "session_time" TIMESTAMP NOT NULL, "room" character varying NOT NULL, "ticket_price" numeric(10,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_73452145ad61a7fc15a8a71c75" ON "sessions" ("movie_name", "session_time", "room") `);
        await queryRunner.query(`CREATE TYPE "public"."reservations_status_enum" AS ENUM('pending', 'confirmed', 'expired', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seat_id" uuid NOT NULL, "user_id" character varying NOT NULL, "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'pending', "idempotency_key" character varying, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6b0a68b6082ee14612e6b5cbc44" UNIQUE ("idempotency_key"), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9de00b2fb6ea7532d17367d081" ON "reservations" ("seat_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4af5055a871c46d011345a255a" ON "reservations" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6b0a68b6082ee14612e6b5cbc4" ON "reservations" ("idempotency_key") `);
        await queryRunner.query(`CREATE INDEX "IDX_bd389e1e9c16586ff37e739b21" ON "reservations" ("seat_id", "user_id") `);
        await queryRunner.query(`CREATE TABLE "sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reservation_id" uuid NOT NULL, "seat_id" uuid NOT NULL, "user_id" character varying NOT NULL, "amount_paid" numeric(10,2) NOT NULL, "payment_method" character varying, "confirmed_at" TIMESTAMP NOT NULL DEFAULT now(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_50780cf24053118938ecf2502d3" UNIQUE ("reservation_id"), CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_50780cf24053118938ecf2502d" ON "sales" ("reservation_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2f578cfccdab5506b1a1f848ca" ON "sales" ("seat_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5f282f3656814ec9ca2675aef6" ON "sales" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2a866d8df5ebc6425cfb62c82d" ON "sales" ("amount_paid") `);
        await queryRunner.query(`CREATE INDEX "IDX_4822fe54e6f19e9d4c92dc71a1" ON "sales" ("reservation_id", "seat_id", "user_id") `);
        await queryRunner.query(`ALTER TABLE "seats" ADD CONSTRAINT "FK_678c034ca5e301023893d721398" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_9de00b2fb6ea7532d17367d0810" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_50780cf24053118938ecf2502d3" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_2f578cfccdab5506b1a1f848ca3" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_2f578cfccdab5506b1a1f848ca3"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_50780cf24053118938ecf2502d3"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_9de00b2fb6ea7532d17367d0810"`);
        await queryRunner.query(`ALTER TABLE "seats" DROP CONSTRAINT "FK_678c034ca5e301023893d721398"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4822fe54e6f19e9d4c92dc71a1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2a866d8df5ebc6425cfb62c82d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5f282f3656814ec9ca2675aef6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2f578cfccdab5506b1a1f848ca"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_50780cf24053118938ecf2502d"`);
        await queryRunner.query(`DROP TABLE "sales"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bd389e1e9c16586ff37e739b21"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b0a68b6082ee14612e6b5cbc4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4af5055a871c46d011345a255a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9de00b2fb6ea7532d17367d081"`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_73452145ad61a7fc15a8a71c75"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a818b702ebcda16173249d60d4"`);
        await queryRunner.query(`DROP TABLE "seats"`);
        await queryRunner.query(`DROP TYPE "public"."seats_status_enum"`);
    }

}
